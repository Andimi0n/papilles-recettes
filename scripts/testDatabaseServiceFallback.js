#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation du fallback transparent de DatabaseService
 * Vérifie que l'absence du module natif ExpoSQLite (ex: Expo Go ou dev client non reconstruit)
 * ne déclenche aucune erreur fatale et bascule proprement sur AsyncStorage.
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests de DatabaseService (Résilience & Fallback AsyncStorage)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_db_fallback');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/databaseService.ts src/types/planner.ts src/types/recipe.ts src/types/shopping.ts src/types/fridge.ts src/types/mealLog.ts src/types/vocabulary.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock AsyncStorage
  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: async (key, val) => {
      memoryStore.set(key, String(val));
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

  const compiledDbPath = path.join(tmpDir, 'services/databaseService.js');
  const { DatabaseService } = require(compiledDbPath);

  console.log('\n--- Test 1 : Initialisation sans runtime natif ExpoSQLite ---');
  // En environnement Node, hasNativeSQLite() retourne false et aucun crash ne doit survenir
  await DatabaseService.init();
  const isMigrated = await DatabaseService.isMigrated();
  assert.strictEqual(isMigrated, false, 'isMigrated doit être false en fallback');
  console.log('✓ DatabaseService.init() et isMigrated() exécutés sans crash');

  console.log('\n--- Test 2 : Lecture / Écriture via fallback AsyncStorage ---');
  await DatabaseService.setSetting('test_key', 'test_value');
  const val = await DatabaseService.getSetting('test_key');
  assert.strictEqual(val, 'test_value', 'La valeur sauvegardée doit être relue depuis AsyncStorage');

  // Sauvegarde et récupération d'une recette
  const mockRecipe = {
    id: 'rec_test_1',
    title: 'Tarte aux pommes',
    ingredients: [{ name: 'Pomme', quantity: 3, unit: 'pièce' }],
    steps: ['Peler les pommes', 'Enfourner'],
    servings: 4,
    tags: ['Dessert'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await DatabaseService.saveRecipe(mockRecipe);
  const recipes = await DatabaseService.getRecipes();
  assert.strictEqual(recipes.length, 1, 'Une recette doit être présente');
  assert.strictEqual(recipes[0].title, 'Tarte aux pommes');
  console.log('✓ Sauvegarde et lecture de recette réussies via AsyncStorage');

  console.log('\n--- Test 3 : Gestion du stock frigo en fallback ---');
  const mockFridgeItem = {
    id: 'fridge_1',
    name: 'Carottes',
    createdAt: new Date().toISOString(),
  };
  await DatabaseService.addFridgeItem(mockFridgeItem);
  const fridgeItems = await DatabaseService.getFridgeItems();
  assert.strictEqual(fridgeItems.length, 1);
  assert.strictEqual(fridgeItems[0].name, 'Carottes');
  console.log('✓ Gestion des étagères fonctionnelle en fallback');

  // Nettoyage
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('\n🎉 TOUS LES TESTS DE FALLBACK DE DATABASESERVICE ONT RÉUSSI (0 ERREUR) !');
}

main().catch((err) => {
  console.error('❌ Échec des tests DatabaseService Fallback :', err);
  process.exit(1);
});
