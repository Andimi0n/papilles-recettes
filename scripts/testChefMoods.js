#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de la persistance et gestion des humeurs du Chef IA
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de StorageService (Humeurs et personnalités du Chef IA)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_chef_moods');

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
    id: require.resolve('@react-native-async-storage/async-storage'),
    filename: require.resolve('@react-native-async-storage/async-storage'),
    loaded: true,
    exports: Object.assign(AsyncStorageMock, { default: AsyncStorageMock }),
  };

  // Chargement du module StorageService compilé
  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { CHEF_MOODS } = require(path.join(tmpDir, 'services/recipeAiService.js'));

  // 1. Test chargement initial (Repli sur CHEF_MOODS d'usine)
  console.log('  1. Vérification des humeurs par défaut d\'usine...');
  assert(typeof StorageService.getChefMoods === 'function', 'StorageService.getChefMoods doit être une fonction');

  const initialMoods = await StorageService.getChefMoods();
  assert(Array.isArray(initialMoods), 'getChefMoods doit retourner un tableau');
  assert.strictEqual(initialMoods.length, CHEF_MOODS.length, `Doit contenir initialement ${CHEF_MOODS.length} humeurs par défaut`);
  assert.strictEqual(initialMoods[0].id, 'quotidien', 'La première humeur par défaut doit être "quotidien"');

  // 2. Test ajout d'une nouvelle humeur personnalisée
  console.log('  2. Ajout d\'une nouvelle humeur personnalisée...');
  assert(typeof StorageService.saveChefMood === 'function', 'StorageService.saveChefMood doit être une fonction');

  const customMood = {
    id: 'custom_barbecue',
    label: 'Barbecue & Fumoir',
    icon: 'flame-outline',
    systemPersona: 'Tu es un maître du barbecue et fumoir américain.',
    userDirective: 'Propose 3 idées de grillades et marinades intenses',
    recipeExecutionPrompt: 'Détaille la marinade et le temps de braisage ou fumage.',
    isCustom: true,
  };

  const afterAdd = await StorageService.saveChefMood(customMood);
  assert.strictEqual(afterAdd.length, initialMoods.length + 1, 'La liste doit contenir 1 humeur de plus');
  const foundAdded = afterAdd.find((m) => m.id === 'custom_barbecue');
  assert(foundAdded, 'La nouvelle humeur doit être présente');
  assert.strictEqual(foundAdded.label, 'Barbecue & Fumoir');

  // 3. Test modification d'une humeur existante
  console.log('  3. Modification d\'une humeur existante...');
  const modifiedQuotidien = {
    ...initialMoods[0],
    label: 'Cuisine Familiale & Rapide',
  };
  const afterModify = await StorageService.saveChefMood(modifiedQuotidien);
  const foundModified = afterModify.find((m) => m.id === 'quotidien');
  assert.strictEqual(foundModified.label, 'Cuisine Familiale & Rapide', 'Le libellé de l\'humeur quotidien doit être mis à jour');

  // 4. Test suppression d'une humeur
  console.log('  4. Suppression d\'une humeur...');
  assert(typeof StorageService.deleteChefMood === 'function', 'StorageService.deleteChefMood doit être une fonction');

  const afterDelete = await StorageService.deleteChefMood('custom_barbecue');
  assert(!afterDelete.some((m) => m.id === 'custom_barbecue'), 'L\'humeur supprimée ne doit plus être présente');

  // 5. Test interdiction de suppression si une seule humeur reste
  console.log('  5. Test sécurité : interdiction de supprimer la dernière humeur...');
  // On supprime toutes les humeurs sauf une
  let currentList = afterDelete;
  while (currentList.length > 1) {
    currentList = await StorageService.deleteChefMood(currentList[currentList.length - 1].id);
  }
  assert.strictEqual(currentList.length, 1, 'Il ne reste plus qu\'une seule humeur');

  let failedToDeleteLast = false;
  try {
    await StorageService.deleteChefMood(currentList[0].id);
  } catch (err) {
    failedToDeleteLast = true;
  }
  assert(failedToDeleteLast, 'La suppression de la dernière humeur restante doit échouer');

  // 6. Test réinitialisation aux valeurs d'usine
  console.log('  6. Réinitialisation aux humeurs d\'usine (resetChefMoods)...');
  assert(typeof StorageService.resetChefMoods === 'function', 'StorageService.resetChefMoods doit être une fonction');

  const afterReset = await StorageService.resetChefMoods();
  assert.strictEqual(afterReset.length, CHEF_MOODS.length, 'La liste doit retrouver le nombre d\'humeurs initial');
  assert.strictEqual(afterReset[0].id, 'quotidien');
  assert.strictEqual(afterReset[0].label, 'Quotidien', 'Le libellé de quotidien doit être restauré à son état d\'origine');

  console.log('✅ Tous les tests StorageService.chefMoods ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
