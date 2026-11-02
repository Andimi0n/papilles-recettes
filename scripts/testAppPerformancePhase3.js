#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation pour la Phase 3 d'optimisation
 * - Écritures ciblées / deltas dans DatabaseService (saveFridgeItems & saveShoppingItems)
 * - Intégrité et absence de perte de données
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation des modules TypeScript pour le test de la Phase 3...');
  const tmpDir = path.join(__dirname, '../.tmp_test_perf_phase3');

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

  console.log('🧪 Lancement des tests de validation Phase 3...');

  // =========================================================================
  // TEST 1 : Écritures deltas FridgeItems sans écrasement aveugle
  // =========================================================================
  console.log('\n--- Test 1 : Écritures deltas sur fridge_items ---');

  const item1 = { id: 'f1', name: 'Carotte', canonicalId: 'ing_canon_carotte', aisle: 'Légumes', createdAt: '2026-11-01' };
  const item2 = { id: 'f2', name: 'Poulet', canonicalId: 'ing_canon_poulet', aisle: 'Boucherie', createdAt: '2026-11-01' };

  await DatabaseService.saveFridgeItems([item1, item2]);
  let stored = await DatabaseService.getFridgeItems();
  assert.strictEqual(stored.length, 2);
  console.log('✓ 2 éléments initiaux persistés');

  // Modification d'un élément et ajout d'un 3ème
  const item1Mod = { ...item1, aisle: 'Primeur' };
  const item3 = { id: 'f3', name: 'Pâtes', canonicalId: 'ing_canon_pates', aisle: 'Épicerie', createdAt: '2026-11-02' };

  await DatabaseService.saveFridgeItems([item1Mod, item2, item3]);
  stored = await DatabaseService.getFridgeItems();
  assert.strictEqual(stored.length, 3);
  assert.strictEqual(stored.find((i) => i.id === 'f1')?.aisle, 'Primeur');
  console.log('✓ Mise à jour ciblée et ajout delta validés');

  // Suppression d'un élément (f2)
  await DatabaseService.saveFridgeItems([item1Mod, item3]);
  stored = await DatabaseService.getFridgeItems();
  assert.strictEqual(stored.length, 2);
  assert.strictEqual(stored.some((i) => i.id === 'f2'), false);
  console.log('✓ Suppression delta validée');

  // Vidage complet
  await DatabaseService.saveFridgeItems([]);
  stored = await DatabaseService.getFridgeItems();
  assert.strictEqual(stored.length, 0);
  console.log('✓ Vidage complet géré proprement');

  // =========================================================================
  // TEST 2 : Écritures deltas ShoppingItems
  // =========================================================================
  console.log('\n--- Test 2 : Écritures deltas sur shopping_items ---');

  const s1 = { id: 's1', name: 'Lait', isChecked: false, createdAt: '2026-11-01' };
  const s2 = { id: 's2', name: 'Beurre', isChecked: true, createdAt: '2026-11-01' };

  await DatabaseService.saveShoppingItems([s1, s2]);
  let shopStored = await DatabaseService.getShoppingItems();
  assert.strictEqual(shopStored.length, 2);

  // Toggle s1 et ajout s3
  const s1Toggled = { ...s1, isChecked: true };
  const s3 = { id: 's3', name: 'Oeufs', isChecked: false, createdAt: '2026-11-02' };

  await DatabaseService.saveShoppingItems([s1Toggled, s3]);
  shopStored = await DatabaseService.getShoppingItems();
  assert.strictEqual(shopStored.length, 2);
  assert.strictEqual(shopStored.find((i) => i.id === 's1')?.isChecked, true);
  assert.strictEqual(shopStored.find((i) => i.id === 's3')?.name, 'Oeufs');
  assert.strictEqual(shopStored.some((i) => i.id === 's2'), false);
  console.log('✓ Gestion delta des courses (toggle, ajout, suppression) validée');

  console.log('\n🎉 TOUS LES TESTS DE LA PHASE 3 ONT RÉUSSI !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ÉCHEC DU TEST PHASE 3 :', err.message);
  process.exit(1);
});
