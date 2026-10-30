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
    markModelDegraded,
    isModelDegraded,
    prioritizeHealthyModels,
    CHEF_MOODS,
    RECIPE_PIMP_SCHEMA,
    RECIPE_SOS_SCHEMA,
    RecipeAiService,
    cleanApiKey,
    getGeminiHeaders,
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
  // TEST SECTION 4 : Cascades de modèles Gemini & Circuit Breaker
  // =========================================================================
  console.log('\n--- Test 4 : Cascades de modèles Gemini & Circuit Breaker ---');
  assert.strictEqual(
    GEMINI_MODELS_CASCADE[0],
    'gemini-3.5-flash-lite',
    'GEMINI_MODELS_CASCADE doit avoir gemini-3.5-flash-lite comme premier modèle (vitesse & disponibilité)'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE[0],
    'gemini-3.5-flash-lite',
    'FAST_GEMINI_MODELS_CASCADE doit avoir gemini-3.5-flash-lite comme premier modèle'
  );
  assert.strictEqual(
    FAST_GEMINI_MODELS_CASCADE[1],
    'gemini-3.8-flash',
    'FAST_GEMINI_MODELS_CASCADE doit avoir gemini-3.8-flash comme modèle de repli'
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

  // Test du Circuit Breaker
  assert.strictEqual(isModelDegraded('gemini-3.8-flash'), false);
  markModelDegraded('gemini-3.8-flash');
  assert.strictEqual(isModelDegraded('gemini-3.8-flash'), true);
  const prioritized = prioritizeHealthyModels(['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  assert.strictEqual(prioritized[0], 'gemini-3.5-flash-lite', 'Le modèle sain doit passer en tête de cascade');
  assert.strictEqual(prioritized[1], 'gemini-3.8-flash', 'Le modèle dégradé doit passer en fin de cascade');
  console.log('✓ Cascades Gemini 3 actives et Circuit Breaker validés');

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


  // =========================================================================
  // TEST SECTION 7 : CHEF_MOODS
  // =========================================================================
  console.log('\n--- Test 7 : CHEF_MOODS ---');
  assert.ok(Array.isArray(CHEF_MOODS), 'CHEF_MOODS doit être un tableau');
  assert.ok(CHEF_MOODS.length >= 6, 'CHEF_MOODS doit proposer au moins 6 styles');
  assert.ok(CHEF_MOODS.some((m) => m.id === 'quotidien'), 'Doit inclure le mood quotidien');
  assert.ok(CHEF_MOODS.some((m) => m.id === 'creatif'), 'Doit inclure le mood creatif');
  assert.ok(CHEF_MOODS.some((m) => m.id === 'express'), 'Doit inclure le mood express');
  assert.ok(CHEF_MOODS.some((m) => m.id === 'reconfort'), 'Doit inclure le mood reconfort');
  console.log('✓ Catalogue des styles & moods du Chef validé');

  // =========================================================================
  // TEST SECTION 8 : Pimp & SOS Features Integrity
  // =========================================================================
  console.log('\n--- Test 8 : Pimp & SOS Features ---');
  assert.strictEqual(RECIPE_PIMP_SCHEMA.type, 'OBJECT');
  assert.ok(RECIPE_PIMP_SCHEMA.required.includes('suggestions'));
  assert.ok(RECIPE_PIMP_SCHEMA.required.includes('chefNote'));
  assert.strictEqual(RECIPE_SOS_SCHEMA.type, 'OBJECT');
  assert.ok(RECIPE_SOS_SCHEMA.required.includes('suggestions'));
  assert.ok(RECIPE_SOS_SCHEMA.required.includes('chefNote'));
  console.log('✓ Schémas JSON RECIPE_PIMP_SCHEMA et RECIPE_SOS_SCHEMA conformes');

  // Validation rejets stock vide
  await assert.rejects(
    async () => {
      await RecipeAiService.pimpRecipeWithStock({ title: 'Test', ingredients: [] }, [], 'fake-key');
    },
    /Votre frigo est vide/,
    'pimpRecipeWithStock doit rejeter si stock vide'
  );

  await assert.rejects(
    async () => {
      await RecipeAiService.suggestSubstituteWithStock('Poivre', [], 'fake-key');
    },
    /Votre frigo est vide/,
    'suggestSubstituteWithStock doit rejeter si stock vide'
  );

  // Validation rejets clé API manquante
  await assert.rejects(
    async () => {
      await RecipeAiService.pimpRecipeWithStock({ title: 'Test', ingredients: [] }, ['Carotte'], '');
    },
    /Clé API Gemini non configurée/,
    'pimpRecipeWithStock doit rejeter si clé API absente'
  );

  await assert.rejects(
    async () => {
      await RecipeAiService.suggestSubstituteWithStock('Poivre', ['Carotte'], '');
    },
    /Clé API Gemini non configurée/,
    'suggestSubstituteWithStock doit rejeter si clé API absente'
  );
  console.log('✓ Validation défensive et gestion des erreurs pimpRecipeWithStock & suggestSubstituteWithStock validées');

  // =========================================================================
  // TEST SECTION 9 : Sécurisation & Assainissement des Clés API (BYOK)
  // =========================================================================
  console.log('\n--- Test 9 : cleanApiKey & getGeminiHeaders ---');
  assert.strictEqual(cleanApiKey('  AIzaSy12345  '), 'AIzaSy12345', 'cleanApiKey doit retirer les espaces de bordure');
  assert.strictEqual(cleanApiKey('"AIzaSy12345"'), 'AIzaSy12345', 'cleanApiKey doit retirer les guillemets doubles');
  assert.strictEqual(cleanApiKey("'AIzaSy12345'"), 'AIzaSy12345', 'cleanApiKey doit retirer les guillemets simples');
  assert.strictEqual(cleanApiKey('\u200BAIzaSy\uFEFF12345\u200C'), 'AIzaSy12345', 'cleanApiKey doit retirer les caractères invisibles / BOM / zero-width');
  assert.strictEqual(cleanApiKey('AIzaSy 12345\n678'), 'AIzaSy12345678', 'cleanApiKey doit supprimer les espaces ou retours à la ligne internes accidentels');
  assert.strictEqual(cleanApiKey(''), '', 'cleanApiKey doit retourner une chaîne vide pour une entrée vide');

  const headers = getGeminiHeaders('  "AIzaSyKeyValid"  ');
  assert.strictEqual(headers['x-goog-api-key'], 'AIzaSyKeyValid', 'getGeminiHeaders doit assainir la clé');
  assert.strictEqual(headers['X-Goog-Api-Key'], undefined, 'getGeminiHeaders ne doit PAS contenir de clé dupliquée X-Goog-Api-Key');
  const headersObj = new Headers(headers);
  assert.strictEqual(headersObj.get('x-goog-api-key'), 'AIzaSyKeyValid', 'Headers ne doit pas concaténer de doublons par virgule');
  console.log('✓ Nettoyage de clé et unicité des en-têtes HTTP (zéro duplication "key, key") validés');

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
