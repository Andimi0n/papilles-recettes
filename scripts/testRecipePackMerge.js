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

    console.log('\n--- Test 3 : Import complet avec notes, tags, végétarien, ingrédients et étapes ---');
    const richPack = {
      recipes: [
        {
          id: 'rec_risotto_mushrooms',
          title: 'Risotto crémeux aux champignons',
          description: 'Un risotto réconfortant aux champignons de Paris',
          category: 'plat',
          difficulty: 'facile',
          prepTime: '20',
          cookTime: '30',
          servings: '4',
          rating: '4.5',
          notes: 'Ajouter une noisette de beurre froid à la fin pour la mantecatura.',
          isVegetarian: true,
          tags: ['Italien', 'Réconfortant', 'Automne'],
          imageUrl: 'photos/risotto.jpg',
          availableImages: ['photos/risotto_detail.jpg'],
          ingredients: [
            '300g riz arborio',
            '250g champignons de paris',
            '1 oignon',
            '50g parmesan',
            'sel',
            'huile d olive',
          ],
          steps: [
            'Émincer les champignons et l oignon.',
            'Faire suer l oignon dans l huile d olive.',
            'Nacrer le riz et mouiller au bouillon.',
            'Incorporer le parmesan et servir chaud.',
          ],
        },
      ],
      images: new Map([
        ['photos/risotto.jpg', new Uint8Array([1, 2, 3])],
        ['photos/risotto_detail.jpg', new Uint8Array([4, 5, 6])],
      ]),
    };

    const richRes = await StorageService.mergeRecipePack(richPack);
    assert.strictEqual(richRes.success, true);
    assert.strictEqual(richRes.addedCount, 1);
    assert.ok(richRes.photosCount >= 1);
    assert.strictEqual(typeof richRes.totalIngredientsCount, 'number', 'totalIngredientsCount doit être un nombre');
    assert.strictEqual(typeof richRes.canonicalIngredientsCount, 'number', 'canonicalIngredientsCount doit être un nombre');
    assert.strictEqual(typeof richRes.unmatchedIngredientsCount, 'number', 'unmatchedIngredientsCount doit être un nombre');
    assert.strictEqual(richRes.totalIngredientsCount, 6, '6 ingrédients dans le pack');
    assert.strictEqual(richRes.canonicalIngredientsCount, 6, 'Les 6 ingrédients du risotto sont canoniques');
    assert.strictEqual(richRes.unmatchedIngredientsCount, 0, '0 ingrédient non canonique');

    const recipesNow = await StorageService.getRecipes();
    const risotto = recipesNow.find((r) => r.title === 'Risotto crémeux aux champignons');
    assert.ok(risotto, 'Le risotto doit être présent');
    assert.strictEqual(risotto.category, 'Plat', 'Catégorie normalisée à Plat');
    assert.strictEqual(risotto.difficulty, 'Facile', 'Difficulté normalisée à Facile');
    assert.strictEqual(risotto.prepTimeMinutes, 20, 'Temps de prép parsé à 20');
    assert.strictEqual(risotto.cookTimeMinutes, 30, 'Temps de cuisson parsé à 30');
    assert.strictEqual(risotto.servings, 4, 'Servings parsé à 4');
    assert.strictEqual(risotto.rating, 4.5, 'Rating parsé à 4.5');
    assert.strictEqual(risotto.userNote, 'Ajouter une noisette de beurre froid à la fin pour la mantecatura.', 'userNote préservé depuis notes');
    assert.strictEqual(risotto.isVegetarian, true, 'isVegetarian respecté à true');
    assert.deepStrictEqual(risotto.tags, ['Italien', 'Réconfortant', 'Automne'], 'Tags préservés');
    assert.strictEqual(risotto.steps.length, 4, '4 étapes extraites depuis les strings');
    assert.strictEqual(risotto.steps[0].instruction, 'Émincer les champignons et l oignon.');
    assert.strictEqual(risotto.steps[0].order, 1);
    assert.strictEqual(risotto.ingredients.length, 6, '6 ingrédients parsés depuis les strings');
    assert.ok(risotto.ingredients[0].canonicalId, 'canonicalId auto-détecté pour riz');
    assert.strictEqual(risotto.availableImages?.length, 1, 'availableImages extrait et sauvegardé');

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
