#!/usr/bin/env node

/**
 * Test unitaire automatisé pour le moteur de liaison automatique de recettes
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
} = require(recipeLinkMatcherPath);

console.log('🧪 Lancement des tests de recipeLinkMatcher (Liaison intelligente de recettes)...');

const mockRecipes = [
  {
    id: 'rec_quiche',
    title: 'Quiche lorraine maison',
    ingredients: [
      { id: 'ing_1', name: 'Pâte brisée', canonicalId: 'ing_canon_pate_brisee' },
      { id: 'ing_2', name: 'Lardon', canonicalId: 'ing_canon_lardon' },
      { id: 'ing_3', name: 'Beurre', canonicalId: 'ing_canon_beurre' },
      { id: 'ing_4', name: 'Sel', isPantryStaple: true },
    ],
  },
  {
    id: 'rec_pate_brisee',
    title: 'Pâte brisée vite faite',
    ingredients: [{ id: 'ing_pb_1', name: 'Farine' }, { id: 'ing_pb_2', name: 'Beurre' }],
  },
  {
    id: 'rec_sauce_tomate',
    title: 'Sauce tomate maison',
    ingredients: [{ id: 'ing_st_1', name: 'Tomate' }],
  },
  {
    id: 'rec_beurre_blanc',
    title: 'Beurre blanc nantais',
    ingredients: [{ id: 'ing_bb_1', name: 'Beurre' }, { id: 'ing_bb_2', name: 'Échalote' }],
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
assert(
  cleanRecipeTitleForMatching('Sauce tomate (recette de grand-mère)') === 'sauce tomate',
  'cleanRecipeTitleForMatching retire parenthèses et qualificatifs'
);

// 2. Nettoyage de nom d'ingrédient
assert(
  cleanIngredientNameForMatching('Pâte brisée (1 rouleau)') === 'pate brisee',
  'cleanIngredientNameForMatching retire "1 rouleau"'
);
assert(
  cleanIngredientNameForMatching('Pâte brisée prête à dérouler') === 'pate brisee',
  'cleanIngredientNameForMatching retire "prête à dérouler"'
);

// 3. Calcul de score
assert(
  computeRecipeMatchScore('Pâte brisée', 'Pâte brisée vite faite') === 100,
  'Score 100 pour Pâte brisée vs Pâte brisée vite faite'
);
assert(
  computeRecipeMatchScore('Lardon', 'Quiche lorraine maison') === 0,
  'Score 0 pour ingrédient partiel non pertinent (Lardon vs Quiche)'
);
assert(
  computeRecipeMatchScore('Beurre', 'Beurre blanc nantais') === 0,
  'Score 0 pour ingrédient générique (Beurre vs Beurre blanc)'
);
assert(
  computeRecipeMatchScore('Sel', 'Sauce tomate maison') === 0,
  'Score 0 pour condiment de base (Sel)'
);

// 4. Détection automatique pour Quiche lorraine
const ingPate = mockRecipes[0].ingredients[0];
const matchedAuto = findLinkedRecipeForIngredient(ingPate, mockRecipes, mockRecipes[0].id);
assert(
  matchedAuto && matchedAuto.id === 'rec_pate_brisee',
  'Détection automatique réussie : Pâte brisée liée à Pâte brisée vite faite'
);

// 5. Prévention d'auto-liaison
const matchedSelf = findAutoMatchCandidate('Pâte brisée', mockRecipes, 'rec_pate_brisee');
assert(
  matchedSelf === null,
  'Une recette ne peut pas être liée à elle-même'
);

// 6. Dissociation explicite (linkedRecipeId === 'none')
const ingPateExplicitNone = {
  ...ingPate,
  linkedRecipeId: 'none',
};
const matchedNone = findLinkedRecipeForIngredient(ingPateExplicitNone, mockRecipes, mockRecipes[0].id);
assert(
  matchedNone === null,
  'linkedRecipeId: "none" désactive le lien automatique'
);

// 7. Liaison manuelle prioritaire
const ingPateManual = {
  ...ingPate,
  linkedRecipeId: 'rec_sauce_tomate', // Choix manuel pour tester l'override
};
const matchedManual = findLinkedRecipeForIngredient(ingPateManual, mockRecipes, mockRecipes[0].id);
assert(
  matchedManual && matchedManual.id === 'rec_sauce_tomate',
  'Liaison manuelle par linkedRecipeId respectée prioritairement'
);

// 8. Synthèse des préparations liées pour une recette
const linkedList = getLinkedRecipesForRecipe(mockRecipes[0], mockRecipes);
assert(
  linkedList.length === 1 && linkedList[0].linkedRecipe.id === 'rec_pate_brisee',
  'getLinkedRecipesForRecipe extrait correctement la préparation maison liée'
);

// Nettoyage tmpDir
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

console.log(`\n🎉 TOUS LES ${totalPassed} TESTS DE RECIPE LINK MATCHER ONT RÉUSSI (0 ERREUR) !`);
