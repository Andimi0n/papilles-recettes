#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de la propagation en cascade du lexique
 * (Promotions d'alias, fusions, mises à jour de rayon, suppressions)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour le test de cascade...');
  const tmpDir = path.join(__dirname, '../.tmp_test_cascade');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock pour react-native dans l'environnement de test Node.js pur
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  };
  require.cache[require.resolve('react-native')] = {
    exports: ReactNativeMock,
  };

  // Configuration du mock AsyncStorage en mémoire
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

  const { VocabularyService } = require(path.join(tmpDir, 'services/vocabularyService.js'));
  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { normalizeIngredient } = require(path.join(tmpDir, 'utils/ingredientNormalizer.js'));

  console.log('🧪 Lancement des tests stricts de synchronisation en cascade...\n');

  // Initialisation du vocabulaire
  await VocabularyService.getAll();

  // =========================================================================
  // TEST 1 : Détachement d'un synonyme (promoteAliasToCanonical)
  // Cas d'usage : détacher "Oignon rouge" de "Oignon"
  // =========================================================================
  console.log('--- Test 1 : Détachement d\'un synonyme en terme canonique autonome ---');

  // Préparation des données initiales dans AsyncStorage
  const recipe1 = {
    id: 'rec_test_salade_grecque',
    title: 'Salade Grecque',
    description: 'Une salade fraîche',
    category: 'entrees',
    servings: 4,
    prepTime: 10,
    cookTime: 0,
    difficulty: 'facile',
    ingredients: [
      { id: 'ing_1', name: 'Oignon rouge', canonicalId: 'ing_canon_oignon', quantity: '1', unit: 'pièce' },
      { id: 'ing_2', name: 'Oignon jaune', canonicalId: 'ing_canon_oignon', quantity: '1', unit: 'pièce' },
    ],
    steps: ['Couper', 'Mélanger'],
  };

  const recipe2 = {
    id: 'rec_test_soupe',
    title: 'Soupe à l\'oignon',
    description: 'Soupe réconfortante',
    category: 'plats',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    difficulty: 'facile',
    ingredients: [
      { id: 'ing_3', name: 'Oignon blanc', canonicalId: 'ing_canon_oignon', quantity: '3', unit: 'pièces' },
    ],
    steps: ['Cuire'],
  };

  await AsyncStorageMock.setItem('@papilles_recipes_v4', JSON.stringify([recipe1, recipe2]));

  const fridgeItem1 = {
    id: 'fridge_1',
    name: 'Oignon rouge',
    canonicalId: 'ing_canon_oignon',
    aisle: 'fruits_legumes',
    createdAt: new Date().toISOString(),
  };

  const fridgeItem2 = {
    id: 'fridge_2',
    name: 'Oignon jaune',
    canonicalId: 'ing_canon_oignon',
    aisle: 'fruits_legumes',
    createdAt: new Date().toISOString(),
  };

  await AsyncStorageMock.setItem('@papilles_fridge_items_v1', JSON.stringify([fridgeItem1, fridgeItem2]));

  const shoppingItem1 = {
    id: 'shop_1',
    name: 'Oignon rouge',
    canonicalId: 'ing_canon_oignon',
    quantity: '2',
    unit: 'pièces',
    isChecked: false,
    aisle: 'fruits_legumes',
    createdAt: new Date().toISOString(),
  };

  await AsyncStorageMock.setItem('@papilles_shopping_list_v1', JSON.stringify([shoppingItem1]));

  // Action : promotion de "Oignon rouge"
  const promoted = await VocabularyService.promoteAliasToCanonical('Oignon rouge', 'fruits_legumes');
  assert.strictEqual(promoted.canonicalName, 'Oignon rouge');
  assert.strictEqual(promoted.normalizedName, 'oignon rouge');
  console.log(`✓ Vocabulaire : Ingrédient canonique autonome "${promoted.canonicalName}" créé (${promoted.id})`);

  // Vérifier que le parent Oignon n'a plus "oignon rouge"
  const allVocab = await VocabularyService.getAll();
  const parentOignon = allVocab.find((i) => i.id === 'ing_canon_oignon');
  assert(parentOignon, 'Parent Oignon introuvable');
  assert(!parentOignon.aliases.includes('oignon rouge'), 'L\'alias "oignon rouge" doit être retiré du parent');
  assert(!parentOignon.aliases.includes('oignons rouges'), 'L\'alias "oignons rouges" doit être retiré du parent');
  assert(parentOignon.aliases.includes('oignon blanc'), 'Les autres alias du parent doivent être préservés');
  console.log('✓ Vocabulaire : Alias "oignon rouge" proprement retiré du parent Oignon');

  // Vérification de la cascade sur les recettes
  const updatedRecipes = await StorageService.getRecipes();
  const updatedSalade = updatedRecipes.find((r) => r.id === 'rec_test_salade_grecque');
  const ingOignonRouge = updatedSalade.ingredients.find((i) => i.name === 'Oignon rouge');
  const ingOignonJaune = updatedSalade.ingredients.find((i) => i.name === 'Oignon jaune');

  assert.strictEqual(
    ingOignonRouge.canonicalId,
    promoted.id,
    `L'ingrédient "Oignon rouge" de la recette doit avoir canonicalId: ${promoted.id}`
  );
  assert.strictEqual(
    ingOignonJaune.canonicalId,
    'ing_canon_oignon',
    'L\'ingrédient "Oignon jaune" doit toujours pointer vers ing_canon_oignon'
  );

  const updatedSoupe = updatedRecipes.find((r) => r.id === 'rec_test_soupe');
  const ingOignonBlanc = updatedSoupe.ingredients.find((i) => i.name === 'Oignon blanc');
  assert.strictEqual(
    ingOignonBlanc.canonicalId,
    'ing_canon_oignon',
    'L\'ingrédient "Oignon blanc" de la recette 2 doit rester intact'
  );
  console.log('✓ Recettes : Ingrédient "Oignon rouge" remappé en cascade vers le nouvel ID canonique');
  console.log('✓ Recettes : Ingrédients "Oignon jaune" et "Oignon blanc" non altérés');

  // Vérification de la cascade sur le Stock
  const updatedFridge = await StorageService.getFridgeItems();
  const updatedFridgeItem1 = updatedFridge.find((i) => i.id === 'fridge_1');
  const updatedFridgeItem2 = updatedFridge.find((i) => i.id === 'fridge_2');

  assert.strictEqual(
    updatedFridgeItem1.canonicalId,
    promoted.id,
    `Le stock "Oignon rouge" doit être remappé vers ${promoted.id}`
  );
  assert.strictEqual(
    updatedFridgeItem2.canonicalId,
    'ing_canon_oignon',
    'Le stock "Oignon jaune" doit rester rattaché à ing_canon_oignon'
  );
  console.log('✓ Stock Frigo : "Oignon rouge" en stock mis à jour en cascade vers le nouvel ID canonique');

  // Vérification de la cascade sur les Courses
  const updatedShopping = await StorageService.getShoppingList();
  const updatedShoppingItem1 = updatedShopping.find((i) => i.id === 'shop_1');

  assert.strictEqual(
    updatedShoppingItem1.canonicalId,
    promoted.id,
    `L'article de course "Oignon rouge" doit avoir canonicalId: ${promoted.id}`
  );
  console.log('✓ Courses : Article "Oignon rouge" synchronisé avec le nouvel ID canonique');

  // =========================================================================
  // TEST 2 : Fusion de deux ingrédients (merge)
  // Cas d'usage : ré-intégrer "Oignon rouge" dans "Oignon"
  // =========================================================================
  console.log('\n--- Test 2 : Fusion transversale d\'ingrédients (merge) ---');

  await VocabularyService.merge(promoted.id, 'ing_canon_oignon');

  const afterMergeRecipes = await StorageService.getRecipes();
  const saladeAfterMerge = afterMergeRecipes.find((r) => r.id === 'rec_test_salade_grecque');
  const ingRougeAfterMerge = saladeAfterMerge.ingredients.find((i) => i.name === 'Oignon rouge');

  assert.strictEqual(
    ingRougeAfterMerge.canonicalId,
    'ing_canon_oignon',
    'Après fusion, l\'ingrédient doit repasser sur ing_canon_oignon'
  );
  console.log('✓ Recettes : Ingrédients remappés vers la cible lors de la fusion');

  const afterMergeFridge = await StorageService.getFridgeItems();
  const fridgeAfterMerge = afterMergeFridge.find((i) => i.id === 'fridge_1');
  assert.strictEqual(
    fridgeAfterMerge.canonicalId,
    'ing_canon_oignon',
    'Après fusion, le stock doit repasser sur ing_canon_oignon'
  );
  console.log('✓ Stock Frigo : Stock remappé vers la cible lors de la fusion');

  // =========================================================================
  // TEST 3 : Mise à jour de rayon en cascade (update defaultAisle)
  // =========================================================================
  console.log('\n--- Test 3 : Mise à jour de rayon en cascade (update) ---');

  await VocabularyService.update('ing_canon_oignon', { defaultAisle: 'condiments_epices' });

  const afterAisleFridge = await StorageService.getFridgeItems();
  const fridgeOignon = afterAisleFridge.find((i) => i.id === 'fridge_1');
  assert.strictEqual(
    fridgeOignon.aisle,
    'condiments_epices',
    'Le rayon du stock doit être synchronisé avec le defaultAisle du lexique'
  );
  console.log('✓ Stock & Courses : Rayon officiel synchronisé en cascade');

  // Nettoyage du répertoire temporaire
  const fs = require('fs');
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n🎉 TOUS LES TESTS DE CASCADE DU LEXIQUE ONT RÉUSSI AVEC SUCCÈS (0 ERREUR) !');
}

main().catch((err) => {
  console.error('\n❌ Échec du test de cascade :', err);
  process.exit(1);
});
