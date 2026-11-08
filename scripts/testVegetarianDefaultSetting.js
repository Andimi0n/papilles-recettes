#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de l'option de filtrage végétarien par défaut
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de réglage du filtre végétarien par défaut...');
  const tmpDir = path.join(__dirname, '../.tmp_test_vege_default');

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

  // 1. Valeur par défaut
  console.log('  1. Vérification de la valeur initiale par défaut (false)...');
  assert(
    typeof StorageService.getDefaultVegetarianFilter === 'function',
    'StorageService.getDefaultVegetarianFilter doit être une fonction'
  );
  assert(
    typeof StorageService.saveDefaultVegetarianFilter === 'function',
    'StorageService.saveDefaultVegetarianFilter doit être une fonction'
  );

  const initialVal = await StorageService.getDefaultVegetarianFilter();
  assert.strictEqual(initialVal, false, 'Le filtre végé par défaut doit être initialement false');

  // 2. Activation du filtre
  console.log('  2. Sauvegarde et persistance de l\'activation (true)...');
  await StorageService.saveDefaultVegetarianFilter(true);
  const valAfterEnable = await StorageService.getDefaultVegetarianFilter();
  assert.strictEqual(valAfterEnable, true, 'Le filtre végé par défaut doit être true après activation');

  // 3. Désactivation du filtre
  console.log('  3. Sauvegarde et persistance de la désactivation (false)...');
  await StorageService.saveDefaultVegetarianFilter(false);
  const valAfterDisable = await StorageService.getDefaultVegetarianFilter();
  assert.strictEqual(valAfterDisable, false, 'Le filtre végé par défaut doit être false après désactivation');

  // Nettoyage dossier temporaire
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_e) {
    // ignorer
  }

  console.log('✅ Tous les tests de StorageService.getDefaultVegetarianFilter ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
