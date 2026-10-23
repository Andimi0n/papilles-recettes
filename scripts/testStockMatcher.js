#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire stricte de stockMatcher & normaliseur Lexique-First
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_stock');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/stockMatcher.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/types/fridge.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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

  const { normalizeIngredient } = require(path.join(tmpDir, 'utils/ingredientNormalizer.js'));

  console.log('🧪 Lancement des tests stricts de stockMatcher & Lexique-First...');

  // =========================================================================
  // TEST SECTION 1 : Normaliseur Lexique-First (Résolution sans régression)
  // =========================================================================
  console.log('\n--- Test 1 : Pipeline Lexique-First sur termes sensibles ---');

  const normCremeFraiche = normalizeIngredient({ name: 'Crème fraîche' });
  assert.strictEqual(normCremeFraiche.name, 'Crème fraîche', 'Crème fraîche ne doit pas être tronqué en Crème');
  assert.strictEqual(normCremeFraiche.canonicalId, 'ing_canon_creme_fraiche');
  console.log('✓ "Crème fraîche" résolu exactement vers ing_canon_creme_fraiche');

  const normLegumesSurgeles = normalizeIngredient({ name: 'Légumes surgelés' });
  assert.strictEqual(normLegumesSurgeles.name, 'Légumes surgelés', 'Légumes surgelés ne doit pas perdre "surgelés"');
  assert.strictEqual(normLegumesSurgeles.canonicalId, 'ing_canon_legumes_surgeles');
  console.log('✓ "Légumes surgelés" résolu exactement vers ing_canon_legumes_surgeles');

  const normPoudreAmande = normalizeIngredient({ name: 'Poudre d\'amande' });
  assert.strictEqual(normPoudreAmande.name, 'Poudre d\'amande');
  assert.strictEqual(normPoudreAmande.canonicalId, 'ing_canon_poudre_d_amande', 'Poudre d\'amande doit pointer vers ing_canon_poudre_d_amande');
  console.log('✓ "Poudre d\'amande" résolu exactement vers ing_canon_poudre_d_amande');

  const normOignonBlanc = normalizeIngredient({ name: '2 oignons blancs émincés' });
  assert.strictEqual(normOignonBlanc.name, 'Oignon');
  assert.strictEqual(normOignonBlanc.canonicalId, 'ing_canon_oignon');
  assert.strictEqual(normOignonBlanc.quantity, '2');
  console.log('✓ "2 oignons blancs émincés" résolu vers Oignon avec quantité 2');

  const normPotCreme = normalizeIngredient({ name: '1 pot de crème fraîche' });
  assert.strictEqual(normPotCreme.name, 'Crème fraîche');
  assert.strictEqual(normPotCreme.canonicalId, 'ing_canon_creme_fraiche');
  assert.strictEqual(normPotCreme.quantity, '1');
  assert.strictEqual(normPotCreme.unit, 'pot');
  console.log('✓ "1 pot de crème fraîche" extrait quantité 1, unité pot, résolu Crème fraîche');

  const normFractionUnicode = normalizeIngredient({ name: '½ citron' });
  assert.strictEqual(normFractionUnicode.name, 'Citron');
  assert.strictEqual(normFractionUnicode.canonicalId, 'ing_canon_citron');
  assert.strictEqual(normFractionUnicode.quantity, '1/2');
  console.log('✓ "½ citron" extrait fraction Unicode 1/2 et résolu vers Citron');

  const normPoigneeMache = normalizeIngredient({ name: '1 belle poignée de mâche' });
  assert.strictEqual(normPoigneeMache.name, 'Mâche');
  assert.strictEqual(normPoigneeMache.canonicalId, 'ing_canon_mache');
  assert.strictEqual(normPoigneeMache.unit, 'poignée');
  console.log('✓ "1 belle poignée de mâche" extrait contenant poignée et résolu vers Mâche');

  const normBranchesCeleri = normalizeIngredient({ name: '3 branches de céleri' });
  assert.strictEqual(normBranchesCeleri.name, 'Céleri');
  assert.strictEqual(normBranchesCeleri.canonicalId, 'ing_canon_celeri');
  assert.strictEqual(normBranchesCeleri.unit, 'branche');
  assert.strictEqual(normBranchesCeleri.quantity, '3');
  console.log('✓ "3 branches de céleri" extrait quantité 3, unité branche et résolu vers Céleri');

  const normAubergineGrillee = normalizeIngredient({ name: 'aubergines grillées' });
  assert.strictEqual(normAubergineGrillee.name, 'Aubergine');
  assert.strictEqual(normAubergineGrillee.canonicalId, 'ing_canon_aubergine');
  console.log('✓ "aubergines grillées" élague le qualificatif grillé et résolu vers Aubergine');

  // =========================================================================
  // TEST SECTION 2 : Stock Matcher et correspondances d'inventaire
  // =========================================================================
  console.log('\n--- Test 2 : Correspondances Stock (StockMatcher) ---');

  const mockStock = [
    { id: '1', name: 'Poulet', canonicalId: 'ing_canon_poulet', aisle: 'Boucherie & Poissonnerie', createdAt: '' },
    { id: '2', name: 'Crème fraîche', canonicalId: 'ing_canon_creme_fraiche', aisle: 'Produits Frais & Crèmerie', createdAt: '' },
    { id: '3', name: 'Champignons de Paris', canonicalId: 'ing_canon_champignon_de_paris', aisle: 'Fruits & Légumes', createdAt: '' },
    { id: '4', name: 'Pâtes', canonicalId: 'ing_canon_pates', aisle: 'Épicerie & Condiments', createdAt: '' },
    { id: '5', name: 'Pomme', canonicalId: 'ing_canon_pomme', aisle: 'Fruits & Légumes', createdAt: '' },
    { id: '6', name: 'Muscade', canonicalId: 'ing_canon_muscade', aisle: 'Épicerie & Condiments', createdAt: '' },
  ];

  const preparedStock = prepareStockItems(mockStock);
  assert.strictEqual(preparedStock.items.length, 6, '6 éléments de stock préparés attendus');
  console.log(`✓ Prepared ${preparedStock.items.length} stock items`);

  // A. Correspondances positives attendues
  const test1 = isIngredientInStock({ id: 'i1', name: 'blanc de poulet' }, preparedStock);
  assert.ok(test1.inStock, 'Doit matcher "blanc de poulet" avec "Poulet"');
  console.log('✓ "blanc de poulet" matche avec stock "Poulet"');

  const test2 = isIngredientInStock({ id: 'i2', name: 'crème liquide' }, preparedStock);
  assert.ok(test2.inStock, 'Doit matcher "crème liquide" avec "Crème fraîche"');
  console.log('✓ "crème liquide" matche avec stock "Crème fraîche"');

  const test3 = isIngredientInStock({ id: 'i3', name: 'tagliatelles' }, preparedStock);
  assert.ok(test3.inStock, 'Doit matcher synonyme canonique "tagliatelles" avec "Pâtes"');
  console.log('✓ "tagliatelles" matche avec stock "Pâtes"');

  const testCanonicalIdMatch = isIngredientInStock({ id: 'iC', name: 'Pennette rigate', canonicalId: 'ing_canon_pates' }, preparedStock);
  assert.ok(testCanonicalIdMatch.inStock, 'Doit matcher directement par canonicalId');
  console.log('✓ Match O(1) direct par canonicalId confirmé');

  // B. Faux amis et exclusions strictes garanties
  const test4 = isIngredientInStock({ id: 'i4', name: 'Lait de coco' }, preparedStock);
  assert.strictEqual(test4.inStock, false, 'Ne doit PAS matcher "Lait de coco" avec "Crème fraîche"');
  console.log('✓ "Lait de coco" est correctement considéré absent');

  const testPommeDeTerre = isIngredientInStock({ id: 'i5', name: 'Pomme de terre' }, preparedStock);
  assert.strictEqual(testPommeDeTerre.inStock, false, 'Avoir "Pomme" en stock ne doit JAMAIS valider "Pomme de terre"');
  console.log('✓ Avoir "Pomme" ne valide PAS "Pomme de terre"');

  const testNoix = isIngredientInStock({ id: 'i6', name: 'Noix' }, preparedStock);
  assert.strictEqual(testNoix.inStock, false, 'Avoir "Muscade" en stock ne doit JAMAIS valider "Noix"');
  console.log('✓ Avoir "Muscade" ne valide PAS "Noix"');

  // =========================================================================
  // TEST SECTION 3 : Évaluation de Recettes Faisables vs Non Faisables
  // =========================================================================
  console.log('\n--- Test 3 : Évaluation Recette Faisable / Non Faisable ---');

  const doableRecipe = {
    id: 'r1',
    title: 'Pâtes au poulet et champignons',
    ingredients: [
      { id: 'ing1', name: 'Poulet', canonicalId: 'ing_canon_poulet' },
      { id: 'ing2', name: 'Champignons de Paris', canonicalId: 'ing_canon_champignon_de_paris' },
      { id: 'ing3', name: 'Pâtes', canonicalId: 'ing_canon_pates' },
      { id: 'ing4', name: 'Crème fraîche', canonicalId: 'ing_canon_creme_fraiche' },
      { id: 'ing5', name: 'Sel', isPantryStaple: true },
      { id: 'ing6', name: 'Poivre', isPantryStaple: true },
      { id: 'ing7', name: 'Persil ciselé (facultatif)', isOptional: true },
    ],
  };

  const evalDoable = evaluateRecipeStock(doableRecipe, preparedStock);
  assert.strictEqual(evalDoable.isDoable, true, 'La recette r1 doit être faisable');
  assert.strictEqual(evalDoable.missingIngredients.length, 0, 'Aucun ingrédient manquant pour r1');
  assert.strictEqual(evalDoable.matchPercentage, 100, 'Match 100% pour r1');
  console.log('✓ Recette faisable validée avec 100% de couverture');

  const notDoableRecipe = {
    id: 'r2',
    title: 'Poulet au lait de coco',
    ingredients: [
      { id: 'ing1', name: 'Poulet', canonicalId: 'ing_canon_poulet' },
      { id: 'ing2', name: 'Lait de coco', canonicalId: 'ing_canon_lait_de_coco' }, // MANQUANT
      { id: 'ing3', name: 'Sel', isPantryStaple: true },
    ],
  };

  const evalNotDoable = evaluateRecipeStock(notDoableRecipe, preparedStock);
  assert.strictEqual(evalNotDoable.isDoable, false, 'La recette r2 ne doit PAS être faisable');
  assert.strictEqual(evalNotDoable.missingIngredients.length, 1, '1 ingrédient manquant attendu (Lait de coco)');
  assert.strictEqual(evalNotDoable.missingIngredients[0].name, 'Lait de coco', 'Lait de coco doit être manquant');
  console.log('✓ Recette non-faisable validée avec détection de l\'ingrédient manquant (Lait de coco)');

  const doableList = filterDoableRecipes([doableRecipe, notDoableRecipe], mockStock);
  assert.strictEqual(doableList.length, 1, '1 seule recette faisable attendue');
  assert.strictEqual(doableList[0].id, 'r1', 'Recette r1 attendue dans les faisables');
  console.log('✓ filterDoableRecipes filtre exactement la recette réalisable');

  console.log('\n🎉 TOUS LES TESTS STRICTS ONT RÉUSSI AVEC SUCCÈS (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS :', err);
  process.exit(1);
});
