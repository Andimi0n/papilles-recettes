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
function shouldShowCreationModeTabs(initialRecipe) {
  if (!initialRecipe) return true;
  const isAiStock = Boolean(initialRecipe.id && initialRecipe.id.startsWith('rec_ai_stock_'));
  const isExtracted = Boolean(initialRecipe.id && initialRecipe.id.startsWith('extracted_'));
  const isEditing = Boolean(initialRecipe.id && !isExtracted && !isAiStock);
  if (isEditing) return false;
  if (isAiStock || isExtracted) return false;

  const hasPreloadedData = Boolean(
    initialRecipe.title || (initialRecipe.ingredients && initialRecipe.ingredients.length > 0)
  );
  if (hasPreloadedData) return false;

  return true;
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
console.log('🎉 Tous les tests de protection RecipeFormScreen ont réussi !');
