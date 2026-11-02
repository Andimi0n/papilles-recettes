#!/usr/bin/env node

/**
 * Papilles - Test unitaire de validation de l'annulation (AbortController) dans RecipeAiService
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests d\'annulation RecipeAiService (AbortSignal)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_ai_cancellation');

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
  global.__DEV__ = false;
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

  const { RecipeAiService } = require(path.join(tmpDir, 'services/recipeAiService.js'));

  // Test 1 : suggestRecipeIdeasFromFridge avec un signal déjà avorté
  console.log('  1. Vérification que suggestRecipeIdeasFromFridge rejette immédiatement un signal déjà avorté...');
  const controller1 = new AbortController();
  controller1.abort();

  let rejected1 = false;
  try {
    await RecipeAiService.suggestRecipeIdeasFromFridge(
      { primary: ['Carotte'] },
      { signal: controller1.signal },
      'dummy-api-key'
    );
  } catch (err) {
    rejected1 = true;
    console.log('Erreur capturée :', err);
    assert.strictEqual(err.name, 'AbortError', 'L\'erreur doit être de type AbortError');
  }
  assert(rejected1, 'L\'appel doit être immédiatement rejeté avec AbortError');
  console.log('  ✓ Rejet immédiat validé');

  // Test 2 : generateRecipeFromIdea avec un signal déjà avorté
  console.log('  2. Vérification que generateRecipeFromIdea rejette immédiatement un signal déjà avorté...');
  const controller2 = new AbortController();
  controller2.abort();

  let rejected2 = false;
  try {
    await RecipeAiService.generateRecipeFromIdea(
      { id: 'idea_1', title: 'Curry doux de carottes', description: 'Plat savoureux', isVegetarian: true },
      ['Carotte'],
      { signal: controller2.signal },
      'dummy-api-key'
    );
  } catch (err) {
    rejected2 = true;
    assert.strictEqual(err.name, 'AbortError', 'L\'erreur doit être de type AbortError');
  }
  assert(rejected2, 'L\'appel generateRecipeFromIdea doit être immédiatement rejeté avec AbortError');
  console.log('  ✓ Rejet immédiat validé');

  // Nettoyage
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('✅ Tous les tests d\'annulation RecipeAiService ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err.message);
  process.exit(1);
});
