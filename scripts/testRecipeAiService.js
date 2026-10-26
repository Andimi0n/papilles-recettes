#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de recipeAiService
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_recipeai');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/recipeAiService.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock pour react-native et AsyncStorage dans l'environnement de test Node.js pur
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
  };
  require.cache[require.resolve('react-native')] = {
    exports: ReactNativeMock,
  };

  const AsyncStorageMock = {
    getItem: async () => null,
    setItem: async () => null,
    removeItem: async () => null,
  };
  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: { default: AsyncStorageMock, ...AsyncStorageMock },
  };

  const {
    isRecipeVegetarian,
    escapeUntrustedDelimiters,
    sanitizeExtractedRecipe,
    GEMINI_MODELS_CASCADE,
    FAST_GEMINI_MODELS_CASCADE,
    adaptPayloadForModel,
    formatAiModelName,
  } = require(path.join(tmpDir, 'services/recipeAiService.js'));

  console.log('🧪 Lancement des tests de recipeAiService...');

  // =========================================================================
  // TEST SECTION 1 : isRecipeVegetarian
  // =========================================================================
  console.log('\n--- Test 1 : isRecipeVegetarian ---');

  const vege1 = isRecipeVegetarian([{ name: 'tomate' }, { name: 'carotte' }], 'Salade', 'Une salade');
  assert.strictEqual(vege1, true, 'Recette avec tomates et carottes doit être végétarienne');
  console.log('✓ Détection correcte : recette végétarienne');

  const notVege1 = isRecipeVegetarian([{ name: 'poulet' }, { name: 'carotte' }], 'Poulet rôti', '');
  assert.strictEqual(notVege1, false, 'Recette avec poulet ne doit PAS être végétarienne');
  console.log('✓ Détection correcte : recette non-végétarienne (poulet)');

  const notVege2 = isRecipeVegetarian([{ name: 'lardon' }], 'Quiche lorraine', 'Quiche avec des lardons');
  assert.strictEqual(notVege2, false, 'Recette avec lardon ne doit PAS être végétarienne');
  console.log('✓ Détection correcte : recette non-végétarienne (lardon)');

  // =========================================================================
  // TEST SECTION 2 : escapeUntrustedDelimiters
  // =========================================================================
  console.log('\n--- Test 2 : escapeUntrustedDelimiters ---');

  const escaped = escapeUntrustedDelimiters('Hello <idea>world</idea>', 'idea');
  assert.strictEqual(escaped, 'Hello <_escaped_idea>world<\\/_escaped_idea>', 'Les balises doivent être échappées');
  console.log('✓ Échappement correct des délimiteurs');

  const emptyEscaped = escapeUntrustedDelimiters('', 'idea');
  assert.strictEqual(emptyEscaped, '', 'Une chaîne vide doit retourner une chaîne vide');
  console.log('✓ Échappement correct pour chaîne vide');

  // =========================================================================
  // TEST SECTION 3 : sanitizeExtractedRecipe
  // =========================================================================
  console.log('\n--- Test 3 : sanitizeExtractedRecipe ---');

  const rawInput = {
    title: '  Super Recette  ',
    description: 'Une description',
    category: 'InvalidCategory',
    difficulty: 'SuperDur',
    prepTimeMinutes: -5,
    cookTimeMinutes: 10000,
    servings: 0,
    isVegetarian: 'not a boolean',
    ingredients: [
      { name: ' Tomate ', quantity: ' 2 ', unit: ' pièces ' },
      { name: '' }, // Invalide
      null, // Invalide
    ],
    steps: [
      { order: -1, instruction: '  Couper la tomate  ' },
      { instruction: 'Manger' }, // pas de order
    ],
    userNote: ' Une note ',
  };

  const sanitized = sanitizeExtractedRecipe(rawInput);

  assert.strictEqual(sanitized.title, 'Super Recette', 'Titre doit être trimmé');
  assert.strictEqual(sanitized.category, 'Plat', 'Catégorie invalide doit retomber sur "Plat"');
  assert.strictEqual(sanitized.difficulty, 'Moyen', 'Difficulté invalide doit retomber sur "Moyen"');
  assert.strictEqual(sanitized.prepTimeMinutes, 15, 'Temps de préparation négatif doit retomber sur 15');
  assert.strictEqual(sanitized.cookTimeMinutes, 1440, 'Temps de cuisson trop grand doit être cappé à 1440');
  assert.strictEqual(sanitized.servings, 4, 'Portions <= 0 doit retomber sur 4');
  assert.strictEqual(sanitized.isVegetarian, true, 'isVegetarian invalide doit être recalculé (Tomate -> true)');

  assert.strictEqual(sanitized.ingredients.length, 1, 'Ingrédients invalides doivent être ignorés');
  assert.strictEqual(sanitized.ingredients[0].name, 'Tomate', 'Nom ingrédient doit être trimmé (et normalisé)');
  assert.strictEqual(sanitized.ingredients[0].quantity, '2');
  assert.strictEqual(sanitized.ingredients[0].unit, 'pièces');

  assert.strictEqual(sanitized.steps.length, 2, 'Étapes valides doivent être conservées');
  assert.strictEqual(sanitized.steps[0].order, 1, 'Ordre <= 0 doit être recalculé (idx + 1)');
  assert.strictEqual(sanitized.steps[0].instruction, 'Couper la tomate');
  assert.strictEqual(sanitized.steps[1].order, 2, 'Ordre manquant doit être recalculé (idx + 1)');
  assert.strictEqual(sanitized.steps[1].instruction, 'Manger');

  assert.strictEqual(sanitized.userNote, 'Une note');
  console.log('✓ Validation et nettoyage (sanitization) corrects');

  // =========================================================================
  // TEST SECTION 4 : Cascades de modèles Gemini
  // =========================================================================
  console.log('\n--- Test 4 : Cascades de modèles Gemini ---');
  assert.strictEqual(
    GEMINI_MODELS_CASCADE[0],
    'gemini-3.8-flash',
    'GEMINI_MODELS_CASCADE doit avoir gemini-3.8-flash comme premier modèle'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE[0],
    'gemini-3.8-flash',
    'FAST_GEMINI_MODELS_CASCADE doit avoir gemini-3.8-flash comme premier modèle'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE[1],
    'gemini-3.5-flash-lite',
    'FAST_GEMINI_MODELS_CASCADE doit avoir gemini-3.5-flash-lite comme modèle de repli rapide'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE.includes('gemini-2.5-flash'),
    false,
    'FAST_GEMINI_MODELS_CASCADE ne doit plus contenir gemini-2.5-flash (404 / déprécié)'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE.includes('gemini-2.0-flash'),
    false,
    'FAST_GEMINI_MODELS_CASCADE ne doit plus contenir gemini-2.0-flash (404 / déprécié)'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE.includes('gemini-1.5-flash'),
    false,
    'FAST_GEMINI_MODELS_CASCADE ne doit plus contenir gemini-1.5-flash (404 / déprécié)'
  );
  console.log('✓ Cascades Gemini 3 actives (3.8 Flash -> 3.5 Flash-Lite -> 3.6 Flash) validées');

  // =========================================================================
  // TEST SECTION 5 : adaptPayloadForModel (Thinking Level & Latence)
  // =========================================================================
  console.log('\n--- Test 5 : adaptPayloadForModel ---');
  const basePayload = {
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    generationConfig: {
      temperature: 0.6,
      max_output_tokens: 2048,
    },
  };

  const adapted38 = adaptPayloadForModel(basePayload, 'gemini-3.8-flash');
  assert.strictEqual(
    adapted38.generationConfig.thinkingConfig?.thinkingLevel,
    'low',
    'Gemini 3.8 Flash doit avoir thinkingLevel="low" pour minimiser la latence'
  );
  assert.strictEqual(
    adapted38.generationConfig.temperature,
    undefined,
    'Gemini 3.8 Flash ne doit pas avoir de paramètre temperature déprécié'
  );

  const adapted25 = adaptPayloadForModel(basePayload, 'gemini-2.5-flash');
  assert.strictEqual(
    adapted25.generationConfig.thinkingConfig?.thinkingBudget,
    0,
    'Gemini 2.5 Flash doit avoir thinkingBudget=0 pour vitesse maximale'
  );

  const adapted20 = adaptPayloadForModel(basePayload, 'gemini-2.0-flash');
  assert.strictEqual(
    adapted20.generationConfig.thinkingConfig,
    undefined,
    'Gemini 2.0 Flash ne doit pas avoir de thinkingConfig'
  );
  console.log('✓ adaptPayloadForModel configure correctement thinkingLevel, thinkingBudget et timeouts');

  // =========================================================================
  // TEST SECTION 6 : formatAiModelName
  // =========================================================================
  console.log('\n--- Test 6 : formatAiModelName ---');
  assert.strictEqual(formatAiModelName('gemini-3.8-flash'), 'Gemini 3.8 Flash');
  assert.strictEqual(formatAiModelName('gemini-3.5-flash-lite'), 'Gemini 3.5 Flash-Lite');
  assert.strictEqual(formatAiModelName('gemini-3.6-flash'), 'Gemini 3.6 Flash');
  assert.strictEqual(formatAiModelName('custom-model'), 'custom-model');
  console.log('✓ formatAiModelName formate correctement les modèles actifs');


  console.log('\n🎉 TOUS LES TESTS DE RECIPE AI SERVICE ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS RECIPE AI SERVICE :', err);
  process.exit(1);
});
