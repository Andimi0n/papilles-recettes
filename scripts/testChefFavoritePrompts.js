#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de la persistance des prompts favoris Chef IA
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de StorageService (Prompts favoris Chef IA)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_chef_prompts');

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

  // 1. Test chargement initial (Seed par défaut)
  console.log('  1. Vérification des prompts par défaut (seeds)...');
  const initialPrompts = await StorageService.getChefFavoritePrompts();
  assert(Array.isArray(initialPrompts), 'getChefFavoritePrompts doit retourner un tableau');
  assert.strictEqual(initialPrompts.length, 3, 'Doit contenir 3 prompts par défaut initialement');
  assert(initialPrompts.some((p) => p.title.includes('four')), 'Doit contenir le prompt sans cuisson au four');

  // 2. Test ajout d'un nouveau prompt
  console.log('  2. Ajout d\'un prompt personnalisé...');
  const newPrompt = await StorageService.saveChefFavoritePrompt({
    title: 'Express 15 min',
    promptText: 'Prêt en moins de 15 minutes chrono avec un minimum de vaisselle.',
  });
  assert(newPrompt.id, 'Le nouveau prompt doit avoir un ID unique généré');
  assert.strictEqual(newPrompt.title, 'Express 15 min');

  const afterAdd = await StorageService.getChefFavoritePrompts();
  assert.strictEqual(afterAdd.length, 4, 'Doit maintenant contenir 4 prompts');
  assert(afterAdd.some((p) => p.id === newPrompt.id), 'Le prompt ajouté doit être présent');

  // 3. Test suppression d'un prompt
  console.log('  3. Suppression d\'un prompt...');
  await StorageService.deleteChefFavoritePrompt(newPrompt.id);
  const afterDelete = await StorageService.getChefFavoritePrompts();
  assert.strictEqual(afterDelete.length, 3, 'Doit revenir à 3 prompts');
  assert(!afterDelete.some((p) => p.id === newPrompt.id), 'Le prompt supprimé ne doit plus être présent');

  // 4. Test suppression d'un seed (l'utilisateur doit pouvoir supprimer même les seeds)
  console.log('  4. Suppression d\'un prompt de base...');
  await StorageService.deleteChefFavoritePrompt(initialPrompts[0].id);
  const afterDeleteSeed = await StorageService.getChefFavoritePrompts();
  assert.strictEqual(afterDeleteSeed.length, 2, 'Doit contenir 2 prompts après suppression d\'un seed');

  console.log('✅ Tous les tests StorageService.chefFavoritePrompts ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
