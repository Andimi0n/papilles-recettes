#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire du rangement des courses vers les étagères :
 * 1. moveCheckedShoppingItemsToFridge ne range que les ingrédients reconnus par le lexique.
 * 2. Les articles non reconnus restent dans la liste de courses.
 * 3. Si seuls des éléments non reconnus sont cochés, aucun article n'est rangé.
 * 4. Détection précise de isShoppingItemRecognizedInLexicon pour le masquage du bouton Ranger.
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de rangement Courses -> Étagères...');
  const tmpDir = path.join(__dirname, '../.tmp_test_shopping_shelves');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/databaseService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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
    exports: { default: AsyncStorageMock, ...AsyncStorageMock, __esModule: true },
  };

  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { isShoppingItemRecognizedInLexicon } = require(path.join(tmpDir, 'utils/shoppingAggregator.js'));

  // =========================================================================
  // TEST 1 : Rangement avec mélange d'articles reconnus et non reconnus
  // =========================================================================
  console.log('\n--- Test 1 : Rangement mixte (reconnus + non reconnus) ---');

  const initialShopping = [
    {
      id: 'shop_1',
      name: 'Carotte',
      canonicalId: 'ing_canon_carotte',
      quantity: '500',
      unit: 'g',
      isChecked: true,
      aisle: 'Fruits & Légumes',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'shop_2',
      name: 'Papier toilette 6 rouleaux',
      quantity: '1',
      isChecked: true,
      aisle: 'Autre',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'shop_3',
      name: 'Beurre',
      canonicalId: 'ing_canon_beurre',
      quantity: '250',
      unit: 'g',
      isChecked: true,
      aisle: 'Produits Frais & Crèmerie',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'shop_4',
      name: 'Lessive liquide',
      quantity: '1',
      isChecked: true,
      aisle: 'Autre',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'shop_5',
      name: 'Pommes',
      quantity: '1',
      unit: 'kg',
      isChecked: false, // Non coché
      aisle: 'Fruits & Légumes',
      createdAt: new Date().toISOString(),
    },
  ];

  await StorageService.saveShoppingList(initialShopping);
  await StorageService.saveFridgeItems([]);

  const res1 = await StorageService.moveCheckedShoppingItemsToFridge();

  assert.strictEqual(res1.movedCount, 2, 'Seuls 2 articles reconnus (Carotte, Beurre) doivent être rangés');
  assert.strictEqual(res1.unmovedCheckedCount, 2, '2 articles non alimentaires achetés doivent être détectés non transférés');
  assert.strictEqual(res1.fridgeItems.length, 2, 'Les étagères doivent contenir exactement 2 articles');
  assert.ok(res1.fridgeItems.some((f) => f.canonicalId === 'ing_canon_carotte'));
  assert.ok(res1.fridgeItems.some((f) => f.canonicalId === 'ing_canon_beurre'));

  // Vérifier la liste de courses restante
  assert.strictEqual(res1.shoppingList.length, 3, 'La liste de courses doit conserver les 2 non reconnus + 1 non coché');
  assert.ok(res1.shoppingList.some((s) => s.id === 'shop_2'), 'Papier toilette doit rester dans la liste');
  assert.ok(res1.shoppingList.some((s) => s.id === 'shop_4'), 'Lessive liquide doit rester dans la liste');
  assert.ok(res1.shoppingList.some((s) => s.id === 'shop_5'), 'Pommes doit rester dans la liste');
  console.log('✓ Seuls les articles reconnus ont été déplacés dans les étagères');
  console.log('✓ Les articles non reconnus sont restés intacts dans la liste de courses');
  console.log('✓ unmovedCheckedCount vaut bien 2 pour proposer la purge via Alert');

  // =========================================================================
  // TEST 2 : Rangement lorsque SEULS des articles non reconnus sont cochés
  // =========================================================================
  console.log('\n--- Test 2 : Seuls des articles non reconnus cochés ---');

  // Actuellement, shop_2 (Papier toilette) et shop_4 (Lessive) sont toujours isChecked: true dans res1.shoppingList
  const checkedRemaining = res1.shoppingList.filter((s) => s.isChecked);
  assert.strictEqual(checkedRemaining.length, 2);

  // Vérification de la condition UI pour le bouton ranger
  const recognizedCount = checkedRemaining.filter(isShoppingItemRecognizedInLexicon).length;
  assert.strictEqual(recognizedCount, 0, 'Aucun article coché n\'est reconnu par le lexique');
  const shouldShowRangerButton = recognizedCount > 0;
  assert.strictEqual(shouldShowRangerButton, false, 'Le bouton Ranger dans mes étagères NE DOIT PAS être affiché');
  console.log('✓ Condition UI vérifiée : pas de bouton Ranger affiché quand seuls des non reconnus sont cochés');

  // Si moveCheckedShoppingItemsToFridge est invoqué alors que seuls des non reconnus sont cochés :
  const res2 = await StorageService.moveCheckedShoppingItemsToFridge();
  assert.strictEqual(res2.movedCount, 0, 'movedCount doit valoir 0');
  assert.strictEqual(res2.shoppingList.length, 3, 'Aucun article ne doit être supprimé de la liste');
  assert.strictEqual(res2.fridgeItems.length, 2, 'Les étagères ne doivent pas changer');
  console.log('✓ moveCheckedShoppingItemsToFridge ne déplace rien si aucun article reconnu n\'est coché');

  // =========================================================================
  // TEST 3 : Cocher un article reconnu en plus réactive le bouton et ne range que celui-ci
  // =========================================================================
  console.log('\n--- Test 3 : Réactivation du bouton lors du cochage d\'un ingrédient reconnu ---');

  // On coche shop_5 (Pommes)
  const currentList = await StorageService.getShoppingList();
  const updatedList = currentList.map((s) => (s.id === 'shop_5' ? { ...s, isChecked: true } : s));
  await StorageService.saveShoppingList(updatedList);

  const newChecked = updatedList.filter((s) => s.isChecked);
  const newRecognizedCount = newChecked.filter(isShoppingItemRecognizedInLexicon).length;
  assert.strictEqual(newRecognizedCount, 1, 'Exactement 1 article reconnu est maintenant coché');
  assert.strictEqual(newRecognizedCount > 0, true, 'Le bouton Ranger dans mes étagères DOIT réapparaître');

  const res3 = await StorageService.moveCheckedShoppingItemsToFridge();
  assert.strictEqual(res3.movedCount, 1, 'Seul Pommes a été rangé');
  assert.strictEqual(res3.unmovedCheckedCount, 2, 'Les 2 articles non reconnus restent non transférés');
  assert.strictEqual(res3.fridgeItems.length, 3, 'Les étagères contiennent maintenant 3 articles');
  assert.strictEqual(res3.shoppingList.length, 2, 'Seuls Papier toilette et Lessive restent dans la liste de courses');
  console.log('✓ Pommes rangées avec succès, les 2 articles non reconnus sont restés dans les courses');

  // =========================================================================
  // TEST 4 : Purge des articles non alimentaires cochés restants
  // =========================================================================
  console.log('\n--- Test 4 : Purge des articles non alimentaires cochés ---');
  const purgedList = await StorageService.clearCompletedShoppingItems();
  assert.strictEqual(purgedList.length, 0, 'La liste de courses doit être totalement vidée après confirmation de purge');
  console.log('✓ Purge des articles achetés restants validée à 100%');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('\n🎉 TOUS LES TESTS DE RANGEMENT COURSES -> ÉTAGÈRES ONT RÉUSSI (0 ERREUR) !');
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS SHOPPING -> ÉTAGÈRES :', err);
  process.exit(1);
});
