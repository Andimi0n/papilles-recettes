#!/usr/bin/env node

/**
 * Papilles - Test de validation du bouton "Allergique ?" lors de la gestion du lexique
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests du toggle "Allergique ?" dans le gestionnaire de lexique...');
  const tmpDir = path.join(__dirname, '../.tmp_test_vocab_allergic');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/databaseService.ts src/services/recipePackService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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
    exports: AsyncStorageMock,
  };

  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { VocabularyService } = require(path.join(tmpDir, 'services/vocabularyService.js'));

  try {
    console.log('  1. Ajout d\'un ingrédient au lexique avec le toggle "Allergique ?" activé (sans famille INCO)...');
    const createdItem = await VocabularyService.add({
      canonicalName: 'Kiwi Jaune',
      defaultAisle: 'Fruits & Légumes',
      aliases: ['kiwi jaune', 'kiwis jaunes'],
      isCustom: true,
    });
    assert.strictEqual(createdItem.canonicalName, 'Kiwi Jaune');
    assert.strictEqual(createdItem.allergen, undefined, 'Aucune famille INCO requise');

    // Action toggle "Allergique ?"
    await StorageService.addUserAllergen({
      name: createdItem.canonicalName,
      canonicalId: createdItem.id,
      allergenFamily: null,
    });

    const userAllergens = await StorageService.getUserAllergens();
    const foundAllergen = userAllergens.find((a) => a.canonicalId === createdItem.id);
    assert.ok(foundAllergen, 'L\'aliment doit être présent dans les allergies de l\'utilisateur');
    assert.strictEqual(foundAllergen.allergenFamily, null, 'Doit être sans famille INCO');

    console.log('  2. Désactivation du toggle "Allergique ?" lors d\'une édition ultérieure...');
    await StorageService.removeUserAllergen(createdItem.id);
    await StorageService.removeUserAllergen(createdItem.canonicalName);

    const afterRemove = await StorageService.getUserAllergens();
    const stillPresent = afterRemove.some((a) => a.canonicalId === createdItem.id || a.name === createdItem.canonicalName);
    assert.strictEqual(stillPresent, false, 'L\'aliment doit être retiré des allergies');

    console.log('  3. Ajout d\'un ingrédient avec famille INCO optionnelle via l\'accordéon déplié...');
    const withInco = await VocabularyService.add({
      canonicalName: 'Crabe des Neiges',
      defaultAisle: 'Poissons & Crustacés',
      isCustom: true,
      allergen: 'crustaces',
    });
    assert.strictEqual(withInco.allergen, 'crustaces', 'La famille INCO doit être conservée');

    await StorageService.addUserAllergen({
      name: withInco.canonicalName,
      canonicalId: withInco.id,
      allergenFamily: withInco.allergen || null,
    });

    const afterWithInco = await StorageService.getUserAllergens();
    const incoAllergen = afterWithInco.find((a) => a.canonicalId === withInco.id);
    assert.ok(incoAllergen, 'L\'aliment avec famille INCO doit être enregistré');
    assert.strictEqual(incoAllergen.allergenFamily, 'crustaces');

    console.log('✅ Tous les tests du toggle "Allergique ?" et de l\'accordéon ont réussi avec succès !');
  } finally {
    try {
      execSync(`rm -rf "${tmpDir}"`);
    } catch (_) {}
  }
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
