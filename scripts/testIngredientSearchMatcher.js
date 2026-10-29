#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_search_matcher');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/helpers.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/shopping.ts src/types/fridge.ts src/services/vocabularyService.ts src/utils/ingredientSearchMatcher.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const {
    matchIngredientSearch,
    countMatchingItems,
    filterIngredientItems,
    areShoppingListsEqual,
    areFridgeListsEqual,
  } = require(path.join(tmpDir, 'utils/ingredientSearchMatcher.js'));

  console.log('🧪 Lancement des tests de ingredientSearchMatcher...');

  // 1. Requête vide ou espaces
  assert.strictEqual(
    matchIngredientSearch({ name: 'Carotte' }, ''),
    true,
    'Requête vide doit accepter tout item'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Carotte' }, '   '),
    true,
    'Requête avec espaces seuls doit accepter tout item'
  );
  console.log('✓ Requête vide gérée correctement');

  // 2. Insensibilité casse et accents
  assert.strictEqual(
    matchIngredientSearch({ name: 'Crème fraîche' }, 'creme'),
    true,
    '"creme" doit matcher "Crème fraîche"'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Crème fraîche' }, 'FRAICHE'),
    true,
    '"FRAICHE" doit matcher "Crème fraîche"'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Épinards' }, 'epinard'),
    true,
    '"epinard" sans accent doit matcher "Épinards"'
  );
  console.log('✓ Insensibilité casse et accents validée');

  // 3. Singulier et pluriel
  assert.strictEqual(
    matchIngredientSearch({ name: 'Tomate' }, 'tomates'),
    true,
    'Requête au pluriel "tomates" doit matcher "Tomate"'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Carottes râpées' }, 'carotte'),
    true,
    'Requête au singulier "carotte" doit matcher "Carottes râpées"'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Pommes de terre' }, 'pomme'),
    true,
    '"pomme" doit matcher "Pommes de terre"'
  );
  console.log('✓ Gestion singulier / pluriel validée');

  // 4. Multi-mots dans le désordre
  assert.strictEqual(
    matchIngredientSearch({ name: 'Sauce soja salée' }, 'soja sauce'),
    true,
    '"soja sauce" doit matcher "Sauce soja salée"'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: "Huile d'olive extra vierge" }, 'huile olive'),
    true,
    '"huile olive" doit matcher "Huile d\'olive extra vierge"'
  );
  console.log('✓ Multi-tokens dans le désordre validé');

  // 5. CanonicalId
  assert.strictEqual(
    matchIngredientSearch(
      { name: 'Parmigiano Reggiano', canonicalId: 'ing_canon_parmesan' },
      'parmesan'
    ),
    true,
    'Doit matcher via le canonicalId'
  );
  console.log('✓ Résolution via canonicalId validée');

  // 6. Rayon (aisle)
  assert.strictEqual(
    matchIngredientSearch(
      { name: 'Emmental râpé', aisle: 'Crèmerie & Produits laitiers' },
      'cremerie'
    ),
    true,
    'Doit pouvoir chercher par rayon "cremerie"'
  );
  assert.strictEqual(
    matchIngredientSearch(
      { name: 'Riz basmati', aisle: 'Épicerie & Condiments' },
      'epicerie'
    ),
    true,
    'Doit pouvoir chercher par rayon "epicerie"'
  );
  console.log('✓ Recherche par rayon validée');

  // 7. Recette d'origine (courses)
  assert.strictEqual(
    matchIngredientSearch(
      { name: 'Guanciale', recipeTitle: 'Pâtes à la carbonara' },
      'carbonara'
    ),
    true,
    'Doit matcher par titre de recette'
  );
  console.log('✓ Recherche par recette d\'origine validée');

  // 8. Cas négatifs (pas de faux positif)
  assert.strictEqual(
    matchIngredientSearch({ name: 'Chocolat noir' }, 'vanille'),
    false,
    'Ne doit pas matcher un ingrédient sans rapport'
  );
  assert.strictEqual(
    matchIngredientSearch({ name: 'Poivre noir' }, 'poivron'),
    false,
    '"poivron" ne doit pas matcher "poivre"'
  );
  console.log('✓ Rejet des non-correspondances validé');

  // 9. Comptage et filtrage de liste
  const mockStock = [
    { name: 'Tomates fraîches', aisle: 'Fruits & Légumes' },
    { name: 'Coulis de tomate', aisle: 'Épicerie & Condiments' },
    { name: 'Beurre demi-sel', aisle: 'Crèmerie & Produits laitiers' },
    { name: 'Farine T55', aisle: 'Épicerie & Condiments' },
  ];

  const countTomates = countMatchingItems(mockStock, 'tomate');
  assert.strictEqual(countTomates, 2, 'Doit compter 2 items contenant tomate');

  const filtered = filterIngredientItems(mockStock, 'beurre');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].name, 'Beurre demi-sel');

  console.log('✓ Fonctions countMatchingItems et filterIngredientItems validées');

  // 10. Dédoublonnement & égalité des listes courses / étagères
  const item1 = { id: '1', name: 'Carotte', isChecked: false, aisle: 'Fruits & Légumes' };
  const item2 = { id: '2', name: 'Farine', isChecked: true, aisle: 'Épicerie & Condiments' };

  assert.strictEqual(areShoppingListsEqual([item1, item2], [{ ...item1 }, { ...item2 }]), true, 'Listes identiques doivent être égales');
  assert.strictEqual(areShoppingListsEqual([item1], [{ ...item1, isChecked: true }]), false, 'Changement de isChecked doit invalider l\'égalité');
  assert.strictEqual(areShoppingListsEqual([item1], []), false, 'Tailles différentes doivent invalider l\'égalité');

  const fridge1 = { id: 'f1', name: 'Beurre', aisle: 'Produits Frais & Crèmerie', createdAt: '2026-01-01' };
  assert.strictEqual(areFridgeListsEqual([fridge1], [{ ...fridge1 }]), true, 'Listes de stock identiques doivent être égales');
  assert.strictEqual(areFridgeListsEqual([fridge1], [{ ...fridge1, name: 'Beurre salé' }]), false, 'Nom modifié doit invalider l\'égalité');
  console.log('✓ Fonctions areShoppingListsEqual et areFridgeListsEqual validées');

  // Nettoyage dossier temporaire
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('🎉 TOUS LES TESTS DE RECHERCHE D\'INGRÉDIENTS ONT RÉUSSI (0 ERREUR) !');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
