#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de mergeRecipePack dans StorageService
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de StorageService.mergeRecipePack...');
  const tmpDir = path.join(__dirname, '../.tmp_test_merge_pack');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/recipePackService.ts src/services/databaseService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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

  try {
    const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));

    if (typeof StorageService.mergeRecipePack !== 'function') {
      throw new Error('StorageService.mergeRecipePack n\'est pas encore défini (Red Phase confirmée).');
    }

    // Scénarios de tests lorsque la méthode sera implémentée
    console.log('\n--- Test 1 : Rejet d un pack sans recettes ---');
    const emptyResult = await StorageService.mergeRecipePack({ recipes: [], images: new Map() });
    assert.strictEqual(emptyResult.success, false, 'Doit échouer si le pack est vide');

    console.log('\n--- Test 2 : Fusion avec déduplication et conservation du stock ---');
    const initialRecipes = [
      {
        id: 'rec_exist_1',
        title: 'Gratin Dauphinois',
        servings: 4,
        ingredients: [{ name: 'Pomme de terre', quantity: '1', unit: 'kg' }],
        steps: ['Couper', 'Cuire'],
      },
    ];
    await StorageService.saveAllRecipes(initialRecipes);

    await StorageService.saveFridgeItems([
      { id: 'stock_1', name: 'Lait', category: 'Produits Frais' },
    ]);

    const mockImageBytes = new Uint8Array([137, 80, 78, 71]);
    const imagesMap = new Map();
    imagesMap.set('tarte.png', mockImageBytes);

    const incomingPack = {
      recipes: [
        {
          id: 'colliding_or_new_id_1',
          title: 'Gratin dauphinois',
          servings: 6,
          ingredients: [{ name: 'Pomme de terre', quantity: '1.5', unit: 'kg' }],
          steps: ['Nouvelles étapes'],
        },
        {
          id: 'rec_inédite_2',
          title: 'Tarte tatin aux poires',
          imageUrl: 'photos/tarte.png',
          servings: 4,
          ingredients: [{ name: 'Poire', quantity: '4', unit: 'pièce' }],
          steps: ['Caraméliser'],
        },
      ],
      images: imagesMap,
    };

    const mergeRes = await StorageService.mergeRecipePack(incomingPack);
    assert.strictEqual(mergeRes.success, true, 'La fusion doit réussir');
    assert.strictEqual(mergeRes.addedCount, 1, '1 recette ajoutée');
    assert.strictEqual(mergeRes.updatedCount, 1, '1 recette mise à jour');
    assert.ok(mergeRes.photosCount >= 1, 'Au moins 1 photo liée');

    const finalRecipes = await StorageService.getRecipes();
    assert.strictEqual(finalRecipes.length, 2, 'Exactement 2 recettes au total');

    const updatedGratin = finalRecipes.find((r) => r.id === 'rec_exist_1');
    assert.ok(updatedGratin, 'Le Gratin existant doit avoir conservé son id rec_exist_1');
    assert.strictEqual(updatedGratin.servings, 6, 'Portions mises à jour à 6');

    const newTarte = finalRecipes.find((r) => r.title === 'Tarte tatin aux poires');
    assert.ok(newTarte, 'La Tarte doit exister');
    assert.ok(newTarte.imageUrl && newTarte.imageUrl.length > 0, 'La Tarte doit avoir une URL d image');

    const stockAfter = await StorageService.getFridgeItems();
    assert.strictEqual(stockAfter.length, 1, 'Le stock doit être intact');
    assert.strictEqual(stockAfter[0].name, 'Lait', 'Lait toujours en stock');

    console.log('✓ Tous les scénarios de mergeRecipePack sont validés avec succès !');
  } catch (err) {
    console.error('❌ Échec :', err.message);
    process.exit(1);
  } finally {
    try {
      const fs = require('fs');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

main();
