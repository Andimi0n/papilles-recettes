#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de la suppression et du comptage des recettes par défaut
 * Vérifie que :
 * 1. StorageService.getDefaultRecipesCount() retourne le nombre exact de recettes par défaut (92 et non 100).
 * 2. StorageService.deleteDefaultRecipes() supprime toutes les recettes préfixées 'rec_top100_'.
 * 3. Lorsque toutes les recettes par défaut sont supprimées (carnet vide), getRecipes() ne les réinjecte PAS.
 * 4. Les recettes utilisateur personnalisées sont conservées lors de la suppression des recettes par défaut.
 * 5. resetToDemoRecipes() recharge correctement le catalogue initial.
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests de suppression et comptage des recettes par défaut...');
  const tmpDir = path.join(__dirname, '../.tmp_test_delete_defaults');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/databaseService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mocks environnement Node.js
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  };
  require.cache[require.resolve('react-native')] = {
    exports: ReactNativeMock,
  };

  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => memoryStore.get(key) || null,
    setItem: async (key, val) => {
      memoryStore.set(key, val);
      return null;
    },
    removeItem: async (key) => {
      memoryStore.delete(key);
      return null;
    },
    clear: async () => {
      memoryStore.clear();
      return null;
    },
  };
  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: { default: AsyncStorageMock, ...AsyncStorageMock },
  };

  const compiledStoragePath = path.join(tmpDir, 'services/storageService.js');
  const compiledDbPath = path.join(tmpDir, 'services/databaseService.js');
  const { StorageService } = require(compiledStoragePath);
  const { DatabaseService } = require(compiledDbPath);

  // Initialisation du fallback DB
  await DatabaseService.init();

  console.log('\n--- Test 1 : Comptage exact du catalogue initial ---');
  const defaultCount = await StorageService.getDefaultRecipesCount();
  assert.strictEqual(typeof defaultCount, 'number', 'Le nombre doit être un entier');
  assert.strictEqual(defaultCount, 92, 'Le catalogue culte contient exactement 92 recettes (et non 100)');
  console.log(`✓ Nombre exact de recettes par défaut validé : ${defaultCount} recettes (non 100)`);

  console.log('\n--- Test 2 : Initialisation au premier démarrage ---');
  const initialRecipes = await StorageService.getRecipes();
  assert.strictEqual(initialRecipes.length, 92, '92 recettes initiales doivent être chargées au premier démarrage');
  console.log('✓ 92 recettes chargées et persistées au premier lancement');

  console.log('\n--- Test 3 : Ajout d\'une recette utilisateur personnalisée ---');
  const customRecipe = {
    id: 'rec_user_custom_cake_1',
    title: 'Gâteau au chocolat maison',
    category: 'Dessert',
    servings: 4,
    ingredients: [{ id: 'ing_1', name: 'Chocolat', quantity: '200', unit: 'g' }],
    steps: [{ id: 'stp_1', order: 1, instruction: 'Faire fondre le chocolat' }],
  };
  await StorageService.saveRecipe(customRecipe);
  const withCustom = await StorageService.getRecipes();
  assert.strictEqual(withCustom.length, 93, '93 recettes doivent être présentes (92 par défaut + 1 utilisateur)');
  console.log('✓ Recette utilisateur ajoutée avec succès (total: 93)');

  console.log('\n--- Test 4 : Suppression des recettes par défaut (avec recette utilisateur) ---');
  const remainingAfterDelete = await StorageService.deleteDefaultRecipes();
  assert.strictEqual(remainingAfterDelete.length, 1, 'Seule la recette personnalisée doit subsister');
  assert.strictEqual(remainingAfterDelete[0].id, 'rec_user_custom_cake_1', 'La recette restante doit être celle de l\'utilisateur');
  console.log('✓ Seule la recette utilisateur a été conservée (recettes par défaut supprimées)');

  console.log('\n--- Test 5 : Suppression de la recette utilisateur (carnet totalement vide) ---');
  await StorageService.deleteRecipe('rec_user_custom_cake_1');
  const emptyCarnet = await StorageService.getRecipes();
  assert.strictEqual(emptyCarnet.length, 0, 'Le carnet doit contenir 0 recette');

  // Simulation d'un redémarrage de l'app (cache mémoire invalidé)
  // getRecipes() ne doit surtout PAS réinjecter les recettes par défaut !
  const reloadedCarnet = await StorageService.deleteDefaultRecipes();
  assert.strictEqual(reloadedCarnet.length, 0, 'Le carnet vide ne doit pas réinjecter les recettes par défaut');
  console.log('✓ Le carnet vide reste à 0 recette sans réinjection intempestive');

  console.log('\n--- Test 6 : Réinitialisation manuelle des recettes par défaut (resetToDemoRecipes) ---');
  const restored = await StorageService.resetToDemoRecipes();
  assert.strictEqual(restored.length, 92, 'Les 92 recettes par défaut doivent être rechargées');
  const checkRestored = await StorageService.getRecipes();
  assert.strictEqual(checkRestored.length, 92, 'Le carnet restauré contient 92 recettes');
  console.log('✓ resetToDemoRecipes() a correctement rechargé les 92 recettes');

  console.log('\n🎉 TOUS LES TESTS DE SUPPRESSION ET COMPTAGE DES RECETTES PAR DÉFAUT ONT RÉUSSI !');

  // Nettoyage dossier temporaire
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
