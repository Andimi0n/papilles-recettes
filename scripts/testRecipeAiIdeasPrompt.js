#!/usr/bin/env node

/**
 * Papilles - Test unitaire TDD de la logique de prompt Chef IA (Idées de recettes, végé garanti, refus FIFO)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de RecipeAiService (Idées de recettes & prompting)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_ai_ideas_prompt');

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

  // Mocks environnement Node.js
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
    id: require.resolve('@react-native-async-storage/async-storage'),
    filename: require.resolve('@react-native-async-storage/async-storage'),
    loaded: true,
    exports: Object.assign(AsyncStorageMock, { default: AsyncStorageMock }),
  };

  const {
    buildChefRecipeIdeasPrompt,
    hasNonVegetarianIngredients,
  } = require(path.join(tmpDir, 'services/recipeAiService.js'));

  if (typeof buildChefRecipeIdeasPrompt !== 'function') {
    throw new Error('buildChefRecipeIdeasPrompt n\'est pas encore défini (Red Phase confirmée).');
  }

  // 1. Test Ingrédients Principaux vs Optionnels
  console.log('  1. Vérification de la distinction Ingrédients Principaux vs Optionnels...');
  const prompt1 = buildChefRecipeIdeasPrompt({
    primaryIngredients: ['Tomate', 'Courgette'],
    optionalIngredients: ['Parmesan', 'Crème fraîche'],
    mealType: 'Plat',
  });
  assert(prompt1.userPayload.includes('<untrusted_primary_ingredients>'), 'Doit inclure la balise primary');
  assert(prompt1.userPayload.includes('Tomate, Courgette'), 'Doit lister les ingrédients obligatoires');
  assert(prompt1.userPayload.includes('<untrusted_optional_ingredients>'), 'Doit inclure la balise optional');
  assert(prompt1.userPayload.includes('Parmesan, Crème fraîche'), 'Doit lister les ingrédients optionnels');

  // 2. Test Garantie Végétarienne (Stock sans viande)
  console.log('  2. Vérification de la garantie d\'au moins 1 idée végétarienne...');
  assert.strictEqual(prompt1.isVegeGuaranteed, true, 'isVegeGuaranteed doit être true sans viande obligatoire');
  assert(prompt1.systemPrompt.includes('au moins 1 idée 100% végétarienne'), 'Le prompt système doit exiger au moins 1 idée végé');

  // 3. Test Règle d'arbitrage Végétarienne (Viande en ingrédient obligatoire)
  console.log('  3. Vérification de l\'arbitrage végétarien avec viande obligatoire...');
  const promptCarnivore = buildChefRecipeIdeasPrompt({
    primaryIngredients: ['Blanc de poulet', 'Lardons'],
    optionalIngredients: ['Oignon', 'Crème'],
    mealType: 'Plat',
  });
  assert.strictEqual(promptCarnivore.isVegeGuaranteed, false, 'isVegeGuaranteed doit être false avec viande obligatoire');
  assert(!promptCarnivore.systemPrompt.includes('au moins 1 idée 100% végétarienne'), 'Ne doit pas forcer l\'idée végé en conflit avec la viande obligatoire');

  // 4. Test Mémoire des Refus & Plafond FIFO 15 titres
  console.log('  4. Vérification de la mémoire des refus (FIFO 15 max)...');
  const rejectedTitles = Array.from({ length: 20 }, (_, i) => `Recette Rejetée ${i + 1}`);
  const promptRefus = buildChefRecipeIdeasPrompt({
    primaryIngredients: ['Pomme de terre'],
    rejectedIdeaTitles: rejectedTitles,
  });
  assert(promptRefus.systemPrompt.includes('IDÉES PRÉCÉDEMMENT REFUSÉES'), 'Doit inclure la section des refus');
  assert.strictEqual(promptRefus.sanitizedRejectedTitles.length, 15, 'Doit plafonner à 15 titres max');
  assert.strictEqual(promptRefus.sanitizedRejectedTitles[0], 'Recette Rejetée 6', 'Doit conserver les 15 plus récents (FIFO)');
  assert.strictEqual(promptRefus.sanitizedRejectedTitles[14], 'Recette Rejetée 20');

  // 5. Test rejet si stock totalement vide
  console.log('  5. Vérification de validation stock vide...');
  assert.throws(
    () => {
      buildChefRecipeIdeasPrompt({
        primaryIngredients: [],
        optionalIngredients: [],
      });
    },
    /Veuillez sélectionner au moins un ingrédient/,
    'Doit lever une exception si aucun ingrédient'
  );

  console.log('✅ Tous les tests de buildChefRecipeIdeasPrompt ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err.message);
  process.exit(1);
});
