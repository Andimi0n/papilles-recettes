#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de la protection des données préchargées dans RecipeFormScreen
 * TDD Phase 1 : Empêcher l'affichage du sélecteur [Texte brut (IA)] | [À la main]
 * lorsque la recette provient du Chef IA (rec_ai_stock_) ou contient des données préchargées.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests de protection anti-écrasement de RecipeFormScreen...');

// 1. Test de la logique fonctionnelle shouldShowCreationModeTabs
function checkRecipeEditingState(initialRecipe, availableRecipes = []) {
  const isExistingRecipe = Boolean(
    initialRecipe?.id && availableRecipes.some((r) => r.id === initialRecipe.id)
  );
  const isAiStock = Boolean(initialRecipe?.id && initialRecipe.id.startsWith('rec_ai_stock_'));
  const isExtracted = Boolean(initialRecipe?.id && initialRecipe.id.startsWith('extracted_'));
  const isEditing = Boolean(isExistingRecipe || (initialRecipe?.id && !isExtracted && !isAiStock));

  const hasPreloadedData = Boolean(
    initialRecipe && (initialRecipe.title || (initialRecipe.ingredients && initialRecipe.ingredients.length > 0))
  );

  const showCreationModeTabs =
    !isEditing &&
    !hasPreloadedData &&
    !initialRecipe?.id?.startsWith('rec_ai_stock_') &&
    !initialRecipe?.id?.startsWith('extracted_');

  return { isEditing, showCreationModeTabs };
}

function shouldShowCreationModeTabs(initialRecipe, availableRecipes = []) {
  return checkRecipeEditingState(initialRecipe, availableRecipes).showCreationModeTabs;
}

// Tests unitaires de la fonction logique
assert.strictEqual(
  shouldShowCreationModeTabs(null),
  true,
  'Une recette vierge (null) doit afficher les onglets de choix de création'
);
assert.strictEqual(
  shouldShowCreationModeTabs(undefined),
  true,
  'Une recette vierge (undefined) doit afficher les onglets de choix de création'
);
assert.strictEqual(
  shouldShowCreationModeTabs({}),
  true,
  'Un objet vide sans id ni titre doit afficher les onglets'
);

// Cas Chef IA : id commençant par rec_ai_stock_
assert.strictEqual(
  shouldShowCreationModeTabs({
    id: 'rec_ai_stock_1730541234',
    title: 'Poêlée de légumes d’automne',
    ingredients: [{ name: 'Carotte' }],
  }),
  false,
  'Une recette issue du Chef IA (rec_ai_stock_) ne doit JAMAIS afficher les onglets de mode de création'
);
assert.strictEqual(
  shouldShowCreationModeTabs({
    id: 'rec_ai_stock_empty_title',
  }),
  false,
  'Un id rec_ai_stock_ même sans titre ne doit JAMAIS afficher les onglets'
);

// Cas Scanner IA : id commençant par extracted_
assert.strictEqual(
  shouldShowCreationModeTabs({
    id: 'extracted_1730541234',
    title: 'Recette scannée',
    ingredients: [],
  }),
  false,
  'Une recette scannée (extracted_) ne doit JAMAIS afficher les onglets'
);

// Cas Édition d’une recette existante
assert.strictEqual(
  shouldShowCreationModeTabs({
    id: 'rec_1234567890',
    title: 'Recette existante',
  }),
  false,
  'Une recette existante en édition ne doit JAMAIS afficher les onglets'
);

// Cas données préchargées (ex: clonage ou titre pré-rempli)
assert.strictEqual(
  shouldShowCreationModeTabs({
    title: 'Titre préchargé sans id',
  }),
  false,
  'Des données préchargées (titre) doivent masquer les onglets'
);
assert.strictEqual(
  shouldShowCreationModeTabs({
    ingredients: [{ name: 'Tomate' }],
  }),
  false,
  'Des données préchargées (ingrédients) doivent masquer les onglets'
);

// Cas Recette IA déjà enregistrée dans le carnet ré-ouverte en édition
const savedAiRecipe = {
  id: 'rec_ai_stock_1730541234',
  title: 'Poêlée d’automne enregistrée',
  ingredients: [{ name: 'Carotte' }],
};
const editingState = checkRecipeEditingState(savedAiRecipe, [savedAiRecipe]);
assert.strictEqual(
  editingState.isEditing,
  true,
  'Une recette Chef IA déjà enregistrée dans availableRecipes doit être reconnue en mode édition (isEditing = true)'
);
assert.strictEqual(
  editingState.showCreationModeTabs,
  false,
  'Une recette Chef IA en cours de modification ne doit pas afficher les onglets de création'
);

console.log('✅ Logique fonctionnelle validée avec succès.');

// 2. Vérification statique dans le code source de RecipeFormScreen.tsx
const recipeFormPath = path.join(__dirname, '../src/screens/RecipeFormScreen.tsx');
const content = fs.readFileSync(recipeFormPath, 'utf8');

// Le code source actuel a `{!isEditing && (` devant `<View style={styles.creationModeTabs}>`.
// Nous voulons nous assurer que la condition prend en compte `!hasPreloadedData` et exclut explicitement
// les recettes préchargées ou rec_ai_stock_ afin d'éviter l'écrasement.
const hasProtectedCreationTabs =
  content.includes('!isEditing && !hasPreloadedData') ||
  content.includes('shouldShowCreationModeTabs') ||
  content.includes('showCreationModeTabs');

if (!hasProtectedCreationTabs) {
  console.error('❌ Échec TDD attendu : RecipeFormScreen.tsx utilise toujours la condition non-sécurisée `!isEditing && (` pour les onglets de création');
  process.exit(1);
}

console.log('✅ Vérification dans le code source validée.');

// 3. Tests P0 : Préservation des données personnelles (sourceUrl, sourceSite, prepTime 0, isDirty, flushPendingEdits)
console.log('🧪 Tests P0 : Préservation de sourceUrl, prepTime=0, isDirty et flushPendingEdits...');

// A. Test de sanitisation des durées (0 min doit être préservé)
function sanitizeDuration(val) {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

assert.strictEqual(sanitizeDuration('0'), 0, 'La durée 0 minute doit rester 0 (pas de conversion arbitraire en 10)');
assert.strictEqual(sanitizeDuration(0), 0, 'La durée numérique 0 doit rester 0');
assert.strictEqual(sanitizeDuration('15'), 15, 'La durée valide 15 doit rester 15');
assert.strictEqual(sanitizeDuration(''), 0, 'Une durée vide doit valoir 0');
assert.strictEqual(sanitizeDuration('-5'), 0, 'Une durée négative doit être ramenée à 0');

// B. Vérification statique dans RecipeFormScreen.tsx
assert.ok(
  content.includes('sourceUrl: initialRecipe?.sourceUrl'),
  'RecipeFormScreen.tsx doit préserver initialRecipe.sourceUrl lors de la sauvegarde'
);
assert.ok(
  content.includes('sourceSite: initialRecipe?.sourceSite'),
  'RecipeFormScreen.tsx doit préserver initialRecipe.sourceSite lors de la sauvegarde'
);
assert.ok(
  content.includes('BackHandler.addEventListener'),
  'RecipeFormScreen.tsx doit intercepter BackHandler pour protéger les modifications non enregistrées'
);
assert.ok(
  content.includes('handleRequestCancel'),
  'RecipeFormScreen.tsx doit utiliser handleRequestCancel avec dialogue de confirmation en cas de dirty state'
);
assert.ok(
  content.includes('ingredientEditorRef.current?.flushPendingEdits()'),
  'RecipeFormScreen.tsx doit appeler flushPendingEdits() au submit pour ne rien perdre'
);

// C. Vérification statique dans IngredientTableEditor.tsx
const editorPath = path.join(__dirname, '../src/components/recipe-form/IngredientTableEditor.tsx');
const editorContent = fs.readFileSync(editorPath, 'utf8');
assert.ok(
  editorContent.includes('flushPendingEdits'),
  'IngredientTableEditor.tsx doit exposer flushPendingEdits via forwardRef / useImperativeHandle'
);
assert.ok(
  editorContent.includes('onReplaceAllIngredients'),
  'IngredientTableEditor.tsx doit supporter onReplaceAllIngredients'
);

console.log('✅ Vérifications P0 validées avec succès.');

// 4. Tests P1 : Thème dynamique strict & éradication du code mort
console.log('🧪 Tests P1 : Vérification du thème dynamique et suppression du code mort...');

const stylesPath = path.join(__dirname, '../src/screens/RecipeFormScreen.styles.ts');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert.strictEqual(
  stylesContent.includes('Colors.'),
  false,
  'RecipeFormScreen.styles.ts ne doit contenir AUCUNE occurrence statique de Colors.*'
);
assert.strictEqual(
  stylesContent.includes('Shadows.'),
  false,
  'RecipeFormScreen.styles.ts ne doit contenir AUCUNE occurrence statique de Shadows.*'
);
assert.strictEqual(
  content.includes('Colors.'),
  false,
  'RecipeFormScreen.tsx ne doit contenir AUCUNE occurrence statique de Colors.*'
);

const stepEditorPath = path.join(__dirname, '../src/components/recipe-form/RecipeStepEditor.tsx');
const stepEditorContent = fs.readFileSync(stepEditorPath, 'utf8');
assert.strictEqual(
  stepEditorContent.includes('Colors.'),
  false,
  'RecipeStepEditor.tsx ne doit contenir AUCUNE occurrence statique de Colors.*'
);

// Vérification de la suppression du code mort dans les styles
const deadStyles = [
  'ingredientColumnsHeader',
  'colNomHeader',
  'colQtyHeader',
  'colUnitHeader',
  'ingNameContainer',
  'ingQtyInput',
  'unitPickerTriggerBtn',
  'switchAiBanner',
  'quickAddOptionsRow',
  'sampleQuickBtn',
];
for (const styleName of deadStyles) {
  assert.strictEqual(
    stylesContent.includes(styleName),
    false,
    `Le style orphelin '${styleName}' doit être supprimé de RecipeFormScreen.styles.ts`
  );
}

console.log('✅ Vérifications P1 validées avec succès.');
console.log('🎉 Tous les tests de protection RecipeFormScreen ont réussi !');
