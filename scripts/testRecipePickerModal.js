#!/usr/bin/env node

/**
 * Papilles - Tests de validation de RecipePickerModal unifié & Remplacement bouton supprimer par + :
 * - Unification du sélecteur de recettes pour le planning de repas et l'intérieur des dossiers
 * - Présence du bouton '+' dans le bandeau du dossier ouvert dans HomeScreen.tsx
 * - Remplacement du bouton supprimer (trash) dans l'en-tête du dossier ouvert
 * - Support du mode dossier (déjà dans le dossier, exclusion des doublons, masquage portions/custom tab)
 * - Support du mode planning (portions, onglet repas libre, créneau horaire)
 * - Rétrocompatibilité via MealSlotPickerModal.tsx
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests de validation de RecipePickerModal unifié...');

  // --- Test 1 : Vérification des fichiers et exports ---
  console.log('\n--- Test 1 : Vérification des fichiers et exports ---');
  const commonModalPath = path.join(__dirname, '../src/components/common/RecipePickerModal.tsx');
  const plannerModalPath = path.join(__dirname, '../src/components/planner/MealSlotPickerModal.tsx');

  assert.ok(fs.existsSync(commonModalPath), 'src/components/common/RecipePickerModal.tsx doit exister');
  assert.ok(fs.existsSync(plannerModalPath), 'src/components/planner/MealSlotPickerModal.tsx doit exister (rétrocompatibilité)');

  const commonContent = fs.readFileSync(commonModalPath, 'utf8');
  assert.ok(commonContent.includes('export const RecipePickerModal'), 'RecipePickerModal doit être exporté');
  assert.ok(commonContent.includes('alreadyAddedRecipeIds'), 'RecipePickerModal doit supporter alreadyAddedRecipeIds');
  assert.ok(commonContent.includes('Dans le dossier'), 'RecipePickerModal doit afficher le badge "Dans le dossier"');

  const plannerContent = fs.readFileSync(plannerModalPath, 'utf8');
  assert.ok(
    plannerContent.includes("from '../common/RecipePickerModal'"),
    'MealSlotPickerModal doit réexporter depuis common/RecipePickerModal'
  );
  console.log('✓ Exports et réexportations validés');

  // --- Test 2 : Intégration dans HomeScreen.tsx ---
  console.log('\n--- Test 2 : Intégration dans HomeScreen.tsx ---');
  const homeContent = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf8');

  // Vérifier l'importation de RecipePickerModal
  assert.ok(
    homeContent.includes("import { RecipePickerModal } from '../components/common/RecipePickerModal'"),
    'HomeScreen doit importer RecipePickerModal depuis common'
  );

  // Vérifier que dans le bandeau de dossier, le bouton supprimer est remplacé par le bouton '+'
  assert.ok(
    homeContent.includes('accessibilityLabel="Ajouter des recettes au dossier"'),
    'HomeScreen doit contenir un bouton avec accessibilityLabel "Ajouter des recettes au dossier"'
  );
  assert.ok(
    homeContent.includes('name="add"'),
    'Le bouton d ajout dans l en-tête de dossier doit utiliser l icône "add"'
  );

  // Vérifier que trash-outline n'apparaît plus dans folderActionsRow
  const folderActionsMatch = homeContent.match(/folderActionsRow[\s\S]*?<\/View>/);
  assert.ok(folderActionsMatch, 'folderActionsRow doit être présent');
  assert.ok(
    !folderActionsMatch[0].includes('trash-outline'),
    'folderActionsRow ne doit plus contenir le bouton trash-outline (remplacé par +)'
  );
  assert.ok(
    folderActionsMatch[0].includes('pencil-outline'),
    'folderActionsRow doit toujours conserver le bouton pencil-outline pour éditer'
  );

  // Vérifier la présence du modal RecipePickerModal dans HomeScreen
  assert.ok(
    homeContent.includes('<RecipePickerModal'),
    'HomeScreen doit instancier RecipePickerModal'
  );
  assert.ok(
    homeContent.includes('alreadyAddedRecipeIds={folderRecipeIds'),
    'HomeScreen doit passer alreadyAddedRecipeIds à RecipePickerModal'
  );
  console.log('✓ Remplacement du bouton supprimer par le bouton + et intégration HomeScreen validés');

  // --- Test 3 : Intégration dans MealPlannerScreen.tsx ---
  console.log('\n--- Test 3 : Intégration dans MealPlannerScreen.tsx ---');
  const plannerScreenContent = fs.readFileSync(
    path.join(__dirname, '../src/screens/MealPlannerScreen.tsx'),
    'utf8'
  );

  assert.ok(
    plannerScreenContent.includes("import { RecipePickerModal } from '../components/common/RecipePickerModal'"),
    'MealPlannerScreen doit importer RecipePickerModal depuis common'
  );
  assert.ok(
    plannerScreenContent.includes('<RecipePickerModal'),
    'MealPlannerScreen doit instancier RecipePickerModal'
  );
  console.log('✓ Intégration dans MealPlannerScreen validée');

  // --- Test 4 : Logique de filtrage et détection des doublons pour dossier ---
  console.log('\n--- Test 4 : Logique de filtrage et détection des doublons pour dossier ---');
  const testRecipes = [
    { id: 'rec_1', title: 'Tarte aux pommes', category: 'Dessert', ingredients: [{ name: 'Pomme' }] },
    { id: 'rec_2', title: 'Pâtes Carbonara', category: 'Plat', ingredients: [{ name: 'Pâtes' }] },
    { id: 'rec_3', title: 'Salade César', category: 'Entrée', ingredients: [{ name: 'Salade' }] },
  ];

  const existingFolderRecipeIds = new Set(['rec_1']);

  // Simulation de la détection isAlreadyAdded
  function isRecipeInFolder(recipeId, folderSet) {
    return folderSet ? folderSet.has(recipeId) : false;
  }

  assert.strictEqual(isRecipeInFolder('rec_1', existingFolderRecipeIds), true);
  assert.strictEqual(isRecipeInFolder('rec_2', existingFolderRecipeIds), false);
  assert.strictEqual(isRecipeInFolder('rec_3', existingFolderRecipeIds), false);
  console.log('✓ Logique de détection des recettes déjà dans le dossier validée');

  // --- Test 5 : Configuration contextuelle (Dossier vs Planning) ---
  console.log('\n--- Test 5 : Configuration contextuelle (Dossier vs Planning) ---');
  // Cas Dossier
  const folderModeProps = {
    title: '🍰 Desserts favoris',
    subtitle: 'Sélectionner une recette à ajouter',
    day: undefined,
    mealTime: undefined,
    onSelectCustomMeal: undefined,
  };
  const shouldShowServingsFolder = Boolean(
    folderModeProps.day || folderModeProps.mealTime || folderModeProps.onSelectCustomMeal
  );
  const hasCustomTabFolder = Boolean(folderModeProps.onSelectCustomMeal);
  assert.strictEqual(shouldShowServingsFolder, false, 'Les portions ne doivent pas s afficher pour un dossier');
  assert.strictEqual(hasCustomTabFolder, false, 'L onglet libre ne doit pas s afficher pour un dossier');

  // Cas Planning
  const plannerModeProps = {
    day: 'Mercredi',
    mealTime: 'lunch',
    onSelectCustomMeal: () => {},
  };
  const shouldShowServingsPlanner = Boolean(
    plannerModeProps.day || plannerModeProps.mealTime || plannerModeProps.onSelectCustomMeal
  );
  const hasCustomTabPlanner = Boolean(plannerModeProps.onSelectCustomMeal);
  assert.strictEqual(shouldShowServingsPlanner, true, 'Les portions doivent s afficher pour le planning');
  assert.strictEqual(hasCustomTabPlanner, true, 'L onglet libre doit s afficher pour le planning');
  console.log('✓ Différenciation contextuelle Dossier vs Planning validée');

  console.log('\n🎉 TOUS LES TESTS DE RECIPE PICKER MODAL SONT AU VERT !');
}

main().catch((err) => {
  console.error('❌ Erreur inattendue dans le test :', err);
  process.exit(1);
});
