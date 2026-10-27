#!/usr/bin/env node

/**
 * Test unitaire automatisé pour le moteur de liaison automatique de recettes (Détection stricte et rigide)
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Compilation temporaire du module recipeLinkMatcher...');
const tmpDir = path.join(__dirname, '../.tmp_test_recipe_links');

try {
  const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
  execSync(
    `"${tscBin}" src/utils/recipeLinkMatcher.ts src/utils/helpers.ts src/types/recipe.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
    { stdio: 'pipe' }
  );
} catch (err) {
  console.error('Erreur lors de la compilation :', err.message);
  process.exit(1);
}

const recipeLinkMatcherPath = fs.existsSync(path.join(tmpDir, 'recipeLinkMatcher.js'))
  ? path.join(tmpDir, 'recipeLinkMatcher.js')
  : path.join(tmpDir, 'utils/recipeLinkMatcher.js');

const {
  cleanRecipeTitleForMatching,
  cleanIngredientNameForMatching,
  computeRecipeMatchScore,
  findLinkedRecipeForIngredient,
  findAutoMatchCandidate,
  getLinkedRecipesForRecipe,
  toSingular,
} = require(recipeLinkMatcherPath);

console.log('🧪 Lancement des tests de recipeLinkMatcher (Règles strictes sans faux positifs)...');

const mockRecipes = [
  {
    id: 'rec_quiche',
    title: 'Quiche lorraine maison',
    ingredients: [
      { id: 'ing_1', name: 'Pâte brisée', canonicalId: 'ing_canon_pate_brisee' },
      { id: 'ing_2', name: 'Lardons', canonicalId: 'ing_canon_lardon' },
      { id: 'ing_3', name: 'Crème fraîche', canonicalId: 'ing_canon_creme_fraiche' },
      { id: 'ing_4', name: 'Beurre', canonicalId: 'ing_canon_beurre' },
      { id: 'ing_5', name: 'Sel', isPantryStaple: true },
    ],
  },
  {
    id: 'rec_pate_brisee',
    title: 'Pâte brisée vite faite',
    ingredients: [{ id: 'ing_pb_1', name: 'Farine' }, { id: 'ing_pb_2', name: 'Beurre' }],
  },
  {
    id: 'rec_tarte_poireaux_lardons',
    title: 'Tarte aux poireaux et lardons',
    ingredients: [{ id: 'ing_tpl_1', name: 'Poireaux' }],
  },
  {
    id: 'rec_creme_patissiere',
    title: 'Crème pâtissière',
    ingredients: [{ id: 'ing_cp_1', name: 'Lait' }],
  },
  {
    id: 'rec_beurre_blanc',
    title: 'Beurre blanc nantais',
    ingredients: [{ id: 'ing_bb_1', name: 'Beurre' }],
  },
  {
    id: 'rec_sauce_tomate',
    title: 'Sauce tomate maison',
    ingredients: [{ id: 'ing_st_1', name: 'Tomate' }],
  },
];

let totalPassed = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    process.exit(1);
  }
  console.log(`✓ ${message}`);
  totalPassed++;
}

// 1. Nettoyage de titre
assert(
  cleanRecipeTitleForMatching('Pâte brisée vite faite') === 'pate brisee',
  'cleanRecipeTitleForMatching élague "vite faite"'
);
assert(
  cleanRecipeTitleForMatching('Quiche lorraine maison') === 'quiche lorraine',
  'cleanRecipeTitleForMatching élague "maison"'
);

// 2. Nettoyage d'ingrédient : préservation des qualificatifs intrinsèques comme "fraîche"
assert(
  cleanIngredientNameForMatching('Pâte brisée (1 rouleau)') === 'pate brisee',
  'cleanIngredientNameForMatching retire "1 rouleau"'
);
assert(
  cleanIngredientNameForMatching('Crème fraîche') === 'creme fraiche',
  'cleanIngredientNameForMatching préserve "fraîche" (intégrité culinaire)'
);

// 3. Test singulier / pluriel
assert(
  toSingular('cremes fraiches') === 'creme fraiche',
  'toSingular convertit les pluriels en singulier'
);
assert(
  toSingular('lardons') === 'lardon',
  'toSingular convertit "lardons" en "lardon"'
);

// 4. Score strict & élimination des faux positifs
assert(
  computeRecipeMatchScore('Pâte brisée', 'Pâte brisée vite faite') === 100,
  'Score 100 pour Pâte brisée vs Pâte brisée vite faite'
);
assert(
  computeRecipeMatchScore('Lardons', 'Tarte aux poireaux et lardons') === 0,
  'Score 0 STRICT : Lardons ne matche PAS Tarte aux poireaux et lardons (zéro faux positif)'
);
assert(
  computeRecipeMatchScore('Crème fraîche', 'Crème pâtissière') === 0,
  'Score 0 STRICT : Crème fraîche ne matche PAS Crème pâtissière (zéro faux positif)'
);
assert(
  computeRecipeMatchScore('Beurre', 'Beurre blanc nantais') === 0,
  'Score 0 STRICT : Beurre ne matche PAS Beurre blanc nantais'
);

// 5. Détection automatique pour Quiche lorraine
const quiche = mockRecipes[0];
const ingPate = quiche.ingredients[0];
const ingLardons = quiche.ingredients[1];
const ingCreme = quiche.ingredients[2];

const matchPate = findLinkedRecipeForIngredient(ingPate, mockRecipes, quiche.id);
assert(
  matchPate && matchPate.id === 'rec_pate_brisee',
  'Match automatique réussi pour Pâte brisée -> Pâte brisée vite faite'
);

const matchLardons = findLinkedRecipeForIngredient(ingLardons, mockRecipes, quiche.id);
assert(
  matchLardons === null,
  'Aucun match automatique erroné pour Lardons'
);

const matchCreme = findLinkedRecipeForIngredient(ingCreme, mockRecipes, quiche.id);
assert(
  matchCreme === null,
  'Aucun match automatique erroné pour Crème fraîche'
);

// 6. Dissociation explicite et liaison manuelle
const ingNone = { ...ingPate, linkedRecipeId: 'none' };
assert(
  findLinkedRecipeForIngredient(ingNone, mockRecipes, quiche.id) === null,
  'linkedRecipeId: "none" désactive tout lien'
);

const ingManual = { ...ingLardons, linkedRecipeId: 'rec_tarte_poireaux_lardons' };
const matchManual = findLinkedRecipeForIngredient(ingManual, mockRecipes, quiche.id);
assert(
  matchManual && matchManual.id === 'rec_tarte_poireaux_lardons',
  'Liaison manuelle explicite acceptée si choisie par l\'utilisateur'
);

// 7. Synthèse des préparations liées pour la quiche
const linkedList = getLinkedRecipesForRecipe(quiche, mockRecipes);
assert(
  linkedList.length === 1 && linkedList[0].linkedRecipe.id === 'rec_pate_brisee',
  'getLinkedRecipesForRecipe extrait UNIQUEMENT la préparation maison valide'
);

// Nettoyage tmpDir
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

console.log(`\n🎉 TOUS LES ${totalPassed} TESTS STRICTS DE RECIPE LINK MATCHER ONT RÉUSSI (0 FAUX POSITIF) !`);
