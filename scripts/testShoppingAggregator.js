#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de shoppingAggregator (Arbitrages 2 & 3)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_shopping');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/shoppingAggregator.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/types/shopping.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const {
    createShoppingItemFromIngredient,
    mergeShoppingItems,
    groupItemsByAisle,
  } = require(path.join(tmpDir, 'utils/shoppingAggregator.js'));

  console.log('🧪 Lancement des tests de shoppingAggregator (Arbitrages 2 & 3)...');

  // =========================================================================
  // TEST SECTION 1 : createShoppingItemFromIngredient
  // =========================================================================
  console.log('\n--- Test 1 : Création d\'articles de courses selon le lexique ---');

  // 1. Ingrédient régulier avec mise à l'échelle et rayon officiel issu du lexique
  const carotte = createShoppingItemFromIngredient(
    { id: 'ing1', name: 'carottes râpées', quantity: '200', unit: 'g' },
    4,
    6,
    'Salade de carottes',
    'rec1'
  );
  assert.ok(carotte !== null, 'Carotte ne doit pas être null');
  assert.strictEqual(carotte.name, 'Carotte', 'Doit afficher le nom canonique "Carotte"');
  assert.strictEqual(carotte.canonicalId, 'ing_canon_carotte');
  assert.strictEqual(carotte.quantity, '300', '200g pour 4 pers -> 300g pour 6 pers');
  assert.strictEqual(carotte.unit, 'g');
  assert.strictEqual(carotte.aisle, 'Fruits & Légumes', 'Rayon officiel du lexique canonique');
  console.log('✓ Carotte créée avec nom canonique, quantité mise à l\'échelle et rayon officiel');

  // 2. Exclusion stricte de l'eau (Arbitrage 2)
  const eau = createShoppingItemFromIngredient(
    { id: 'ing2', name: 'Eau', quantity: '1', unit: 'L', isPantryStaple: true },
    4,
    4,
    'Pâtes',
    'rec2'
  );
  assert.strictEqual(eau, null, 'L\'eau doit être strictement exclue (renvoie null)');
  console.log('✓ L\'ingrédient "Eau" est strictement exclu de la liste de courses');

  // 3. Fond de placard inclus volontairement : Nom Canonique SEUL, SANS quantité (Arbitrage 2)
  const sel = createShoppingItemFromIngredient(
    { id: 'ing3', name: 'Fleur de sel', quantity: '2', unit: 'pincées', isPantryStaple: true },
    4,
    8,
    'Steak',
    'rec3'
  );
  assert.ok(sel !== null, 'Sel ne doit pas être null');
  assert.strictEqual(sel.name, 'Sel', 'Nom canonique Sel');
  assert.strictEqual(sel.canonicalId, 'ing_canon_sel');
  assert.strictEqual(sel.quantity, undefined, 'Pas de quantité sur les fonds de placard');
  assert.strictEqual(sel.unit, undefined, 'Pas d\'unité sur les fonds de placard');
  assert.strictEqual(sel.aisle, 'Épicerie & Condiments');
  console.log('✓ Fond de placard inclus sous Nom Canonique SEUL sans quantité ni unité');

  // =========================================================================
  // TEST SECTION 2 : mergeShoppingItems (Fusion O(1) & Addition mathématique)
  // =========================================================================
  console.log('\n--- Test 2 : Fusion intelligente et addition mathématique ---');

  const existingItems = [
    {
      id: 's1',
      name: 'Pâtes',
      canonicalId: 'ing_canon_pates',
      quantity: '250',
      unit: 'g',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Pâtes au pesto',
    },
    {
      id: 's2',
      name: 'Huile d\'olive',
      canonicalId: 'ing_canon_huile_d_olive',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Salade grecque',
    },
  ];

  const newItems = [
    // Pâtes pour une autre recette : 250g + 150g -> 400g
    {
      id: 's3',
      name: 'Tagliatelles fraîches',
      canonicalId: 'ing_canon_pates',
      quantity: '150',
      unit: 'g',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Pâtes carbonara',
    },
    // Huile d'olive (fond de placard sans quantité) : doit rester une ligne unique
    {
      id: 's4',
      name: 'Huile d\'olive',
      canonicalId: 'ing_canon_huile_d_olive',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Ratatouille',
    },
    // Farine en conversion métrique : 1 kg + 250 g
    {
      id: 's5',
      name: 'Farine',
      canonicalId: 'ing_canon_farine',
      quantity: '1',
      unit: 'kg',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Pain',
    },
  ];

  const mergedStep1 = mergeShoppingItems(existingItems, newItems);

  // Vérification de la fusion des Pâtes
  const patesItem = mergedStep1.find((i) => i.canonicalId === 'ing_canon_pates');
  assert.ok(patesItem, 'Pâtes doivent être présentes');
  assert.strictEqual(patesItem.quantity, '400', '250g + 150g = 400g');
  assert.strictEqual(patesItem.unit, 'g');
  assert.ok(patesItem.recipeTitle.includes('Pâtes au pesto'), 'Contient Pâtes au pesto');
  assert.ok(patesItem.recipeTitle.includes('Pâtes carbonara'), 'Contient Pâtes carbonara');
  console.log('✓ Pâtes fusionnées avec addition mathématique (250g + 150g = 400g)');

  // Vérification de la fusion de l'Huile d'olive (staple sans qté)
  const huileItems = mergedStep1.filter((i) => i.canonicalId === 'ing_canon_huile_d_olive');
  assert.strictEqual(huileItems.length, 1, 'L\'huile d\'olive ne doit former qu\'UNE seule ligne');
  assert.strictEqual(huileItems[0].quantity, undefined);
  assert.ok(huileItems[0].recipeTitle.includes('Ratatouille'));
  console.log('✓ Fonds de placard fusionnés sur une ligne unique sans quantité parasite');

  // Test de la conversion métrique : ajout de 250g de farine
  const extraFarine = [
    {
      id: 's6',
      name: 'Farine',
      canonicalId: 'ing_canon_farine',
      quantity: '250',
      unit: 'g',
      isChecked: false,
      aisle: 'Épicerie & Condiments',
      recipeTitle: 'Crêpes',
    },
  ];
  const mergedStep2 = mergeShoppingItems(mergedStep1, extraFarine);
  const farineItem = mergedStep2.find((i) => i.canonicalId === 'ing_canon_farine');
  assert.ok(farineItem, 'Farine doit être présente');
  assert.strictEqual(farineItem.quantity, '1,25', '1 kg + 250 g = 1,25 kg');
  assert.strictEqual(farineItem.unit, 'kg');
  console.log('✓ Conversion métrique validée : 1 kg + 250 g = 1,25 kg');

  // =========================================================================
  // TEST SECTION 3 : Fractions Unicode, Fourchettes et Nouvelles Unités
  // =========================================================================
  console.log('\n--- Test 3 : Fractions Unicode, Fourchettes et Nouvelles Unités ---');

  const unicodeAndRangeItems = [
    {
      id: 'u1',
      name: 'Mâche',
      canonicalId: 'ing_canon_mache',
      quantity: '1',
      unit: 'poignée',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Salade A',
    },
    {
      id: 'u2',
      name: 'Mâche',
      canonicalId: 'ing_canon_mache',
      quantity: '2',
      unit: 'poignées',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Salade B',
    },
    {
      id: 'u3',
      name: 'Citron',
      canonicalId: 'ing_canon_citron',
      quantity: '½',
      unit: '',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Sauce A',
    },
    {
      id: 'u4',
      name: 'Citron',
      canonicalId: 'ing_canon_citron',
      quantity: '½',
      unit: '',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Sauce B',
    },
    {
      id: 'u5',
      name: 'Ail',
      canonicalId: 'ing_canon_ail',
      quantity: '2-3',
      unit: 'gousses',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Plat A',
    },
    {
      id: 'u6',
      name: 'Ail',
      canonicalId: 'ing_canon_ail',
      quantity: '1',
      unit: 'gousse',
      isChecked: false,
      aisle: 'Fruits & Légumes',
      recipeTitle: 'Plat B',
    },
  ];

  const mergedStep3 = mergeShoppingItems([], unicodeAndRangeItems);

  // Vérification de la fusion de mâche en poignées
  const macheItem = mergedStep3.find((i) => i.canonicalId === 'ing_canon_mache');
  assert.ok(macheItem, 'Mâche doit être présente');
  assert.strictEqual(macheItem.quantity, '3', '1 poignée + 2 poignées = 3 poignées');
  console.log('✓ Unités informelles (poignées) fusionnées : 1 + 2 = 3 poignées');

  // Vérification de l'addition des fractions Unicode
  const citronItem = mergedStep3.find((i) => i.canonicalId === 'ing_canon_citron');
  assert.ok(citronItem, 'Citron doit être présent');
  assert.strictEqual(citronItem.quantity, '1', '½ + ½ = 1');
  console.log('✓ Fractions typographiques Unicode (½ + ½) = 1 citron');

  // Vérification de l'addition d'une fourchette (2-3 -> 2.5 + 1 = 3.5)
  const ailItem = mergedStep3.find((i) => i.canonicalId === 'ing_canon_ail');
  assert.ok(ailItem, 'Ail doit être présent');
  assert.strictEqual(ailItem.quantity, '3,5', '2-3 (2,5) + 1 gousse = 3,5 gousses');
  console.log('✓ Fourchette numérique (2-3 gousses + 1) = 3,5 gousses');

  // =========================================================================
  // TEST SECTION 4 : groupItemsByAisle
  // =========================================================================
  console.log('\n--- Test 4 : Regroupement des articles par rayon ---');

  const itemsToGroup = [
    { id: 'g1', name: 'Carotte', aisle: 'Fruits & Légumes' },
    { id: 'g2', name: 'Lait', aisle: 'Produits Frais & Crèmerie' },
    { id: 'g3', name: 'Pain', aisle: 'Boulangerie & Pâtisserie' },
    { id: 'g4', name: 'Pomme', aisle: 'Fruits & Légumes' },
    { id: 'g5', name: 'Essuie-tout', aisle: 'Autre' },
    { id: 'g6', name: 'Produit Inconnu' }, // Pas d'aisle fourni
  ];

  const grouped = groupItemsByAisle(itemsToGroup);

  // Vérification de la présence des rayons
  assert.ok(grouped.find(g => g.aisle === 'Fruits & Légumes'), 'Le rayon Fruits & Légumes doit exister');
  assert.ok(grouped.find(g => g.aisle === 'Produits Frais & Crèmerie'), 'Le rayon Produits Frais & Crèmerie doit exister');
  assert.ok(grouped.find(g => g.aisle === 'Boulangerie & Pâtisserie'), 'Le rayon Boulangerie & Pâtisserie doit exister');
  assert.ok(grouped.find(g => g.aisle === 'Autre'), 'Le rayon Autre doit exister');

  // Vérification du contenu des rayons
  const fruitsLegumes = grouped.find(g => g.aisle === 'Fruits & Légumes');
  assert.strictEqual(fruitsLegumes.items.length, 2, 'Il doit y avoir 2 articles dans Fruits & Légumes');
  assert.strictEqual(fruitsLegumes.items[0].name, 'Carotte', 'Le premier article doit être Carotte');
  assert.strictEqual(fruitsLegumes.items[1].name, 'Pomme', 'Le deuxième article doit être Pomme');
  console.log('✓ Articles correctement regroupés dans leurs rayons respectifs');

  // Vérification du comportement par défaut pour les articles sans rayon ou rayon inconnu
  const autreRayon = grouped.find(g => g.aisle === 'Autre');
  assert.strictEqual(autreRayon.items.length, 2, 'Il doit y avoir 2 articles dans le rayon Autre (un explicite, un fallback)');
  assert.strictEqual(autreRayon.items[1].name, 'Produit Inconnu', 'L\'article sans rayon doit tomber dans "Autre"');
  console.log('✓ Comportement de repli validé : les articles sans rayon atterrissent dans "Autre"');

  // Vérification de l'ordre (doit respecter ALL_AISLES)
  const allAislesOrder = [
    'Fruits & Légumes',
    'Boucherie & Poissonnerie',
    'Produits Frais & Crèmerie',
    'Boulangerie & Pâtisserie',
    'Épicerie & Condiments',
    'Surgelés',
    'Boissons',
    'Autre',
  ];

  let previousIndex = -1;
  grouped.forEach(group => {
      const currentIndex = allAislesOrder.indexOf(group.aisle);
      assert.ok(currentIndex > previousIndex, `L'ordre des rayons est incorrect: ${group.aisle} ne devrait pas apparaître ici.`);
      previousIndex = currentIndex;
  });
  console.log('✓ L\'ordre des rayons respecte ALL_AISLES');

  // Vérification qu'aucun rayon vide n'est renvoyé
  const emptyAisles = grouped.filter(g => g.items.length === 0);
  assert.strictEqual(emptyAisles.length, 0, 'Il ne doit y avoir aucun rayon vide');
  console.log('✓ Aucun rayon vide n\'est renvoyé');


  console.log('\n🎉 TOUS LES TESTS DE SHOPPING AGGREGATOR ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS SHOPPING :', err);
  process.exit(1);
});
