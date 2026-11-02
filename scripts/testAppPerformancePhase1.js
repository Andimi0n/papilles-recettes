#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation pour la Phase 1 d'optimisation
 * - Invalidation fiable du cache d'évaluation du stock (stockMatcher)
 * - Mise à jour in-memory du cache recettes dans StorageService.saveRecipe
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation des modules TypeScript pour le test de la Phase 1...');
  const tmpDir = path.join(__dirname, '../.tmp_test_perf_phase1');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/stockMatcher.ts src/services/storageService.ts src/services/databaseService.ts src/services/recipePackService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts src/types/recipe.ts src/types/fridge.ts src/types/shopping.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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

  const { evaluateRecipesWithStock } = require(path.join(tmpDir, 'utils/stockMatcher.js'));
  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { DatabaseService } = require(path.join(tmpDir, 'services/databaseService.js'));

  console.log('🧪 Lancement des tests de validation Phase 1 (Red Phase)...');

  // =========================================================================
  // TEST 1 : Invalidation de cache de stockMatcher lors de la modif d'une recette non-index-0
  // =========================================================================
  console.log('\n--- Test 1 : Invalidation fiable du cache de stockMatcher ---');

  const stock = [
    { id: 's1', name: 'Poulet', canonicalId: 'ing_canon_poulet' },
    { id: 's2', name: 'Carotte', canonicalId: 'ing_canon_carotte' },
  ];

  const r0 = {
    id: 'r0',
    title: 'Poulet rôti',
    ingredients: [{ id: 'i1', name: 'Poulet', canonicalId: 'ing_canon_poulet' }],
    updatedAt: '2026-11-01T10:00:00.000Z',
  };

  const r1Initial = {
    id: 'r1',
    title: 'Soupe de poireaux',
    ingredients: [{ id: 'i2', name: 'Poireau', canonicalId: 'ing_canon_poireau' }], // Non présent dans le stock
    updatedAt: '2026-11-01T10:00:00.000Z',
  };

  const initialRecipes = [r0, r1Initial];

  // Première évaluation
  const eval1 = evaluateRecipesWithStock(initialRecipes, stock);
  assert.strictEqual(eval1.get('r0')?.isDoable, true, 'r0 doit être réalisable');
  assert.strictEqual(eval1.get('r1')?.isDoable, false, 'r1 initial ne doit PAS être réalisable');
  console.log('✓ Évaluation initiale conforme (r0: oui, r1: non)');

  // Mise à jour de r1 pour utiliser Carotte (présente dans le stock)
  // r0 reste strictement identique, le nombre de recettes reste 2, seul r1 a changé
  const r1Updated = {
    id: 'r1',
    title: 'Carottes râpées',
    ingredients: [{ id: 'i3', name: 'Carotte', canonicalId: 'ing_canon_carotte' }], // Présent dans le stock !
    updatedAt: '2026-11-02T12:00:00.000Z', // Horodatage mis à jour
  };

  const updatedRecipes = [r0, r1Updated];

  const eval2 = evaluateRecipesWithStock(updatedRecipes, stock);
  assert.strictEqual(
    eval2.get('r1')?.isDoable,
    true,
    'CRITIQUE : r1 doit être recalculé comme faisable après mise à jour, le cache ne doit pas être stale !'
  );
  console.log('✓ Le cache stockMatcher s\'invalide correctement lors de la modification de r1');

  // =========================================================================
  // TEST 2 : StorageService.saveRecipe met à jour le cache en place sans requêter DatabaseService.getRecipes
  // =========================================================================
  console.log('\n--- Test 2 : Mise à jour in-memory du cache dans StorageService.saveRecipe ---');

  // Préchauffer le cache avec initialRecipes
  await StorageService.saveAllRecipes([r0, r1Initial]);
  const cachedBefore = await StorageService.getRecipes();
  assert.strictEqual(cachedBefore.length, 2);

  // Espionner DatabaseService.getRecipes pour s'assurer qu'il n'est PAS appelé pendant saveRecipe
  let getRecipesCallCount = 0;
  const originalDbGetRecipes = DatabaseService.getRecipes;
  DatabaseService.getRecipes = async function () {
    getRecipesCallCount++;
    return originalDbGetRecipes.apply(this, arguments);
  };

  try {
    const recipeToSave = {
      ...r1Updated,
      description: 'Délicieuse entrée fraîche',
      category: 'Entrée',
      difficulty: 'Facile',
    };

    const resultRecipes = await StorageService.saveRecipe(recipeToSave);

    assert.strictEqual(
      getRecipesCallCount,
      0,
      `DatabaseService.getRecipes ne doit pas être appelé lors d'un saveRecipe (appelé ${getRecipesCallCount} fois) !`
    );

    const savedInList = resultRecipes.find((r) => r.id === 'r1');
    assert.strictEqual(savedInList?.title, 'Carottes râpées', 'Le titre doit être mis à jour dans le cache');
    assert.strictEqual(savedInList?.description, 'Délicieuse entrée fraîche');
    console.log('✓ StorageService.saveRecipe a mis à jour le cache en mémoire sans relecture globale SQLite');
  } finally {
    DatabaseService.getRecipes = originalDbGetRecipes;
  }

  console.log('\n🎉 TOUS LES TESTS DE LA PHASE 1 ONT RÉUSSI !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ÉCHEC DU TEST (RED PHASE CONFIRMÉE) :', err.message);
  process.exit(1);
});
