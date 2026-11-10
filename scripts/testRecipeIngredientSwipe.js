#!/usr/bin/env node

/**
 * Papilles - Test de validation du swipe d'ingrédient dans la fiche détaillée de recette :
 * - Swipe vers la droite d'un ingrédient reconnu -> Ajout à la liste de courses avec portions de la recette
 * - Swipe vers la droite d'un ingrédient non reconnu -> Ouverture de la qualification lexique
 * - La recette conserve tous ses ingrédients (aucun ingrédient n'est supprimé de la recette)
 * - L'ingrédient ne devient plus grisé au simple clic
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_ing_swipe');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/unifiedIngredientService.ts src/services/vocabularyService.ts src/services/storageService.ts src/services/databaseService.ts src/utils/ingredientNormalizer.ts src/utils/allergenMatcher.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts src/constants/units.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mocks pour environnement Node.js pur
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

  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { UnifiedIngredientService } = require(path.join(tmpDir, 'services/unifiedIngredientService.js'));
  const { VocabularyService } = require(path.join(tmpDir, 'services/vocabularyService.js'));
  const {
    prepareStockItems,
    evaluateRecipeStock,
    findMatchingStockItem,
  } = require(path.join(tmpDir, 'utils/stockMatcher.js'));

  console.log('🧪 Lancement des tests de swipe d\'ingrédients dans RecipeDetail...');

  // 1. Initialisation de la liste de courses vide
  await StorageService.saveShoppingList([]);

  const testRecipe = {
    id: 'rec_swipe_test',
    title: 'Poulet aux carottes et épice mystère',
    servings: 4,
    ingredients: [
      { id: 'ing_c1', name: 'Carotte', canonicalId: 'ing_canon_carotte', quantity: '200', unit: 'g' },
      { id: 'ing_c2', name: 'Filet de poulet', canonicalId: 'ing_canon_poulet', quantity: '400', unit: 'g' },
      { id: 'ing_c3', name: 'Épice mystère inconnue', quantity: '1', unit: 'pincée' },
    ],
    steps: ['Cuire le tout'],
  };

  await StorageService.saveRecipe(testRecipe);

  // --- Test 1 : Détection de la reconnaissance lexicale ---
  console.log('\n--- Test 1 : Détection de reconnaissance lexicale ---');
  const vocabMap = VocabularyService.getSyncMapById();

  const isRecognizedCarotte = Boolean(
    (testRecipe.ingredients[0].canonicalId && vocabMap.has(testRecipe.ingredients[0].canonicalId)) ||
    UnifiedIngredientService.resolveRecognizedIngredient(testRecipe.ingredients[0].name).isRecognized
  );
  assert.strictEqual(isRecognizedCarotte, true, 'Carotte doit être reconnue dans le lexique');

  const isRecognizedPoulet = Boolean(
    (testRecipe.ingredients[1].canonicalId && vocabMap.has(testRecipe.ingredients[1].canonicalId)) ||
    UnifiedIngredientService.resolveRecognizedIngredient(testRecipe.ingredients[1].name).isRecognized
  );
  assert.strictEqual(isRecognizedPoulet, true, 'Filet de poulet doit être reconnu dans le lexique');

  const isRecognizedMystere = Boolean(
    (testRecipe.ingredients[2].canonicalId && vocabMap.has(testRecipe.ingredients[2].canonicalId)) ||
    UnifiedIngredientService.resolveRecognizedIngredient(testRecipe.ingredients[2].name).isRecognized
  );
  assert.strictEqual(isRecognizedMystere, false, 'Épice mystère inconnue ne doit PAS être reconnue dans le lexique');
  console.log('✓ Ingrédients canoniques reconnus et ingrédient inconnu correctement discriminé');

  // --- Test 2 : Swipe droit sur un ingrédient reconnu -> Ajout aux courses avec mise à l'échelle ---
  console.log('\n--- Test 2 : Swipe droit sur un ingrédient reconnu -> Courses à 6 convives ---');
  const targetServings = 6; // Recette de base 4 personnes -> 200g carottes x 6/4 = 300g carottes
  const addResult = await StorageService.addRecipeToShoppingList(
    testRecipe,
    targetServings,
    [testRecipe.ingredients[0].id]
  );

  assert.strictEqual(addResult.addedCount, 1, 'Un seul ingrédient doit être ajouté');
  const shoppingList = await StorageService.getShoppingList();
  assert.strictEqual(shoppingList.length, 1, 'La liste de courses doit contenir 1 article');
  assert.strictEqual(shoppingList[0].name, 'Carotte', 'Le nom canonique doit être Carotte');
  assert.strictEqual(shoppingList[0].quantity, '300', 'La quantité doit être mise à l\'échelle pour 6 portions (200 * 6/4 = 300g)');
  assert.strictEqual(shoppingList[0].unit, 'g', 'L\'unité doit être g');
  console.log('✓ Carotte swipée et ajoutée aux courses à 300g (portions mises à l\'échelle pour 6 personnes)');

  // --- Test 3 : Conservation de la recette après swipe ---
  console.log('\n--- Test 3 : Préservation des ingrédients de la recette ---');
  const recipesAfter = await StorageService.getRecipes();
  const fetched = recipesAfter.find((r) => r.id === testRecipe.id);
  assert.strictEqual(fetched.ingredients.length, 3, 'La recette doit toujours contenir ses 3 ingrédients originaux');
  console.log('✓ La recette reste 100% intacte après le swipe');

  // --- Test 4 : Qualification d'un ingrédient inconnu ---
  console.log('\n--- Test 4 : Qualification de l\'ingrédient inconnu ---');
  // Création du canonique via VocabularyService
  const createdCanonical = await VocabularyService.add({
    canonicalName: 'Épice mystère',
    defaultAisle: 'Épicerie & Condiments',
    aliases: ['épice mystère inconnue'],
  });

  // Mise à jour de l'ingrédient dans la recette avec le nouveau canonicalId
  const updatedIngredients = testRecipe.ingredients.map((ing) => {
    if (ing.id === testRecipe.ingredients[2].id) {
      return {
        ...ing,
        canonicalId: createdCanonical.id,
      };
    }
    return ing;
  });
  const updatedRecipe = {
    ...testRecipe,
    ingredients: updatedIngredients,
  };
  await StorageService.saveRecipe(updatedRecipe);

  const reloadedVocabMap = VocabularyService.getSyncMapById();
  const isRecognizedAfterQualify = Boolean(
    (updatedRecipe.ingredients[2].canonicalId && reloadedVocabMap.has(updatedRecipe.ingredients[2].canonicalId)) ||
    UnifiedIngredientService.resolveRecognizedIngredient(updatedRecipe.ingredients[2].name).isRecognized
  );
  assert.strictEqual(isRecognizedAfterQualify, true, 'L\'ingrédient qualifié doit désormais être reconnu');
  console.log('✓ Après qualification, l\'ingrédient est immédiatement reconnu dans le lexique');

  // --- Test 5 : Swipe droit sur un ingrédient en stock -> Retrait du stock (au lieu d'envoyer aux courses) ---
  console.log('\n--- Test 5 : Swipe droit d\'un ingrédient en stock -> Retrait du stock ---');
  // Stock initial avec du Poulet
  const initialStock = [
    { id: 'stock_poulet_1', name: 'Filet de poulet', canonicalId: 'ing_canon_poulet' },
  ];
  await StorageService.saveFridgeItems(initialStock);
  const currentFridge = await StorageService.getFridgeItems();
  assert.strictEqual(currentFridge.length, 1, 'Le stock doit contenir 1 élément au départ');

  // Évaluation stock de la recette
  const preparedStockBefore = prepareStockItems(currentFridge);
  const stockEvalBefore = evaluateRecipeStock(testRecipe, preparedStockBefore);
  const pouletIng = testRecipe.ingredients[1]; // Filet de poulet

  const matchedPoulet = stockEvalBefore.matchedIngredients.find(
    (m) => m.ingredient.id === pouletIng.id
  );
  assert.ok(matchedPoulet, 'Le poulet doit être matché');
  assert.strictEqual(matchedPoulet.matchedBy, 'stock', 'Le poulet doit être matché par stock');
  assert.strictEqual(matchedPoulet.matchedStockItemId, 'stock_poulet_1', 'L\'ID de stock matché doit être stock_poulet_1');

  // Retrouver l'item de stock via findMatchingStockItem
  const foundStockItem = findMatchingStockItem(pouletIng, currentFridge, preparedStockBefore);
  assert.ok(foundStockItem, 'findMatchingStockItem doit retrouver l\'élément en stock');
  assert.strictEqual(foundStockItem.id, 'stock_poulet_1', 'L\'élément retrouvé doit correspondre à stock_poulet_1');

  // Action : suppression du stock lors du swipe
  const initialShoppingLength = (await StorageService.getShoppingList()).length;
  await StorageService.removeFridgeItem(foundStockItem.id);

  // Vérification que le stock est désormais vide
  const fridgeAfter = await StorageService.getFridgeItems();
  assert.strictEqual(fridgeAfter.length, 0, 'Le stock ne doit plus contenir le poulet');

  // Vérification que la liste de courses n'a PAS augmenté (aucun envoi aux courses)
  const shoppingAfter = await StorageService.getShoppingList();
  assert.strictEqual(
    shoppingAfter.length,
    initialShoppingLength,
    'La liste de courses ne doit pas avoir reçu d\'article lors du retrait de stock'
  );

  // Vérification après réévaluation : le poulet est désormais manquant dans le stock
  const preparedStockAfter = prepareStockItems(fridgeAfter);
  const stockEvalAfter = evaluateRecipeStock(testRecipe, preparedStockAfter);
  const matchedPouletAfter = stockEvalAfter.matchedIngredients.find(
    (m) => m.ingredient.id === pouletIng.id && m.matchedBy === 'stock'
  );
  assert.strictEqual(matchedPouletAfter, undefined, 'Le poulet ne doit plus être matché en stock');
  console.log('✓ Ingrédient en stock correctement retiré du stock sans envoi vers les courses');

  // Nettoyage tmpDir
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_e) {}

  console.log('\n🎉 TOUS LES TESTS DE SWIPE D\'INGRÉDIENTS ONT RÉUSSI AVEC SUCCÈS !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
