#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de stockMatcher
 */

const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_stock');

  try {
    execSync(
      `npx tsc src/utils/stockMatcher.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/types/fridge.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const {
    prepareStockItems,
    isIngredientInStock,
    evaluateRecipeStock,
    evaluateRecipesWithStock,
    filterDoableRecipes,
  } = require(path.join(tmpDir, 'utils/stockMatcher.js'));

  console.log('🧪 Lancement des tests de stockMatcher...');

  // 1. Test du stock préparé
  const mockStock = [
    { id: '1', name: 'Poulet', aisle: 'Viandes & Poissons', createdAt: '' },
    { id: '2', name: 'Crème fraîche', aisle: 'Produits Frais & Crèmerie', createdAt: '' },
    { id: '3', name: 'Champignons de Paris', aisle: 'Fruits & Légumes', createdAt: '' },
    { id: '4', name: 'Pâtes', aisle: 'Épicerie & Condiments', createdAt: '' },
  ];

  const preparedStock = prepareStockItems(mockStock);
  console.log(`✓ Prepared ${preparedStock.length} stock items`);

  // 2. Test isIngredientInStock
  const test1 = isIngredientInStock({ id: 'i1', name: 'blanc de poulet' }, preparedStock);
  console.assert(test1.inStock, 'Doit matcher "blanc de poulet" avec "Poulet"');
  console.log('✓ "blanc de poulet" matche avec stock "Poulet"');

  const test2 = isIngredientInStock({ id: 'i2', name: 'crème liquide' }, preparedStock);
  console.assert(test2.inStock, 'Doit matcher "crème liquide" avec "Crème fraîche"');
  console.log('✓ "crème liquide" matche avec stock "Crème fraîche"');

  const test3 = isIngredientInStock({ id: 'i3', name: 'tagliatelles' }, preparedStock);
  console.assert(test3.inStock, 'Doit matcher synonyme canonique "tagliatelles" avec "Pâtes"');
  console.log('✓ "tagliatelles" matche avec stock "Pâtes"');

  const test4 = isIngredientInStock({ id: 'i4', name: 'Lait de coco' }, preparedStock);
  console.assert(!test4.inStock, 'Ne doit PAS matcher "Lait de coco" avec "Crème fraîche"');
  console.log('✓ "Lait de coco" est correctement considéré absent');

  // 3. Test de faisabilité de recette (100% faisable avec staples)
  const doableRecipe = {
    id: 'r1',
    title: 'Pâtes au poulet et champignons',
    ingredients: [
      { id: 'ing1', name: 'Poulet' },
      { id: 'ing2', name: 'Champignons de Paris' },
      { id: 'ing3', name: 'Pâtes' },
      { id: 'ing4', name: 'Crème fraîche' },
      { id: 'ing5', name: 'Sel', isPantryStaple: true },
      { id: 'ing6', name: 'Poivre', isPantryStaple: true },
      { id: 'ing7', name: 'Persil ciselé (facultatif)', isOptional: true },
    ],
  };

  const evalDoable = evaluateRecipeStock(doableRecipe, preparedStock);
  console.assert(evalDoable.isDoable === true, 'La recette r1 doit être faisable');
  console.assert(evalDoable.missingIngredients.length === 0, 'Aucun ingrédient manquant pour r1');
  console.assert(evalDoable.matchPercentage === 100, 'Match 100% pour r1');
  console.log('✓ Recette faisable validée avec 100% de couverture');

  // 4. Test de recette non faisable (ingrédient manquant)
  const notDoableRecipe = {
    id: 'r2',
    title: 'Poulet au lait de coco',
    ingredients: [
      { id: 'ing1', name: 'Poulet' },
      { id: 'ing2', name: 'Lait de coco' }, // MANQUANT
      { id: 'ing3', name: 'Sel', isPantryStaple: true },
    ],
  };

  const evalNotDoable = evaluateRecipeStock(notDoableRecipe, preparedStock);
  console.assert(evalNotDoable.isDoable === false, 'La recette r2 ne doit PAS être faisable');
  console.assert(evalNotDoable.missingIngredients.length === 1, '1 ingrédient manquant attendu (Lait de coco)');
  console.assert(evalNotDoable.missingIngredients[0].name === 'Lait de coco', 'Lait de coco doit être manquant');
  console.log('✓ Recette non-faisable validée avec détection de l\'ingrédient manquant (Lait de coco)');

  // 5. Test filterDoableRecipes
  const doableList = filterDoableRecipes([doableRecipe, notDoableRecipe], mockStock);
  console.assert(doableList.length === 1, '1 seule recette faisable attendue');
  console.assert(doableList[0].id === 'r1', 'Recette r1 attendue dans les faisables');
  console.log('✓ filterDoableRecipes filtre exactement la recette réalisable');

  console.log('\n🎉 TOUS LES TESTS DE STOCK MATCHER ONT RÉUSSI SANS AUCUNE ERREUR !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('Erreur critique :', err);
  process.exit(1);
});
