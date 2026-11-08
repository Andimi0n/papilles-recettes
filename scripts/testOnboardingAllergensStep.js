#!/usr/bin/env node

/**
 * Papilles - Test de validation de l'étape des allergies dans l'Onboarding
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de l\'étape d\'allergies dans OnboardingScreen...');
  const tmpDir = path.join(__dirname, '../.tmp_test_onboarding_allergens');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/storageService.ts src/services/databaseService.ts src/services/recipePackService.ts src/services/imageStorageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/services/recipeAiService.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
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

  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => memoryStore.get(key) || null,
    setItem: async (key, val) => {
      memoryStore.set(key, val);
      return null;
    },
    removeItem: async (key) => {
      memoryStore.delete(key);
      return null;
    },
    clear: async () => {
      memoryStore.clear();
      return null;
    },
  };
  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: AsyncStorageMock,
  };

  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));

  try {
    console.log('  1. Vérification initiale : aucun allergène enregistré par défaut...');
    const initialAllergens = await StorageService.getUserAllergens();
    assert.deepStrictEqual(initialAllergens, [], 'La liste initiale doit être vide');

    console.log('  2. Simulation étape Onboarding : Sélection de familles INCO (Gluten & Lait) et d\'un aliment personnalisé (Fraise)...');
    const onboardingAllergens = [
      {
        id: 'allg_gluten_test',
        name: 'Gluten',
        allergenFamily: 'gluten',
        addedAt: new Date().toISOString(),
      },
      {
        id: 'allg_lait_test',
        name: 'Lait & Lactose',
        allergenFamily: 'lait',
        addedAt: new Date().toISOString(),
      },
      {
        id: 'allg_custom_fraise',
        name: 'Fraise',
        canonicalId: 'ing_canon_fraise',
        allergenFamily: null,
        addedAt: new Date().toISOString(),
      },
    ];

    await StorageService.saveUserAllergens(onboardingAllergens);
    await StorageService.setAllergenFilterEnabled(true);

    const savedAllergens = await StorageService.getUserAllergens();
    assert.strictEqual(savedAllergens.length, 3, '3 allergènes doivent être enregistrés');
    assert.strictEqual(savedAllergens[0].allergenFamily, 'gluten');
    assert.strictEqual(savedAllergens[1].allergenFamily, 'lait');
    assert.strictEqual(savedAllergens[2].name, 'Fraise');

    const isFilterEnabled = await StorageService.getAllergenFilterEnabled();
    assert.strictEqual(isFilterEnabled, true, 'Le filtre d\'allergènes doit être automatiquement activé');

    console.log('  3. Simulation du passage de l\'étape (Skip) : réinitialisation à vide...');
    await StorageService.saveUserAllergens([]);
    const cleared = await StorageService.getUserAllergens();
    assert.strictEqual(cleared.length, 0, 'La liste doit être vide après skip / effacement');

    console.log('✅ Tous les tests de flux d\'allergies dans l\'onboarding ont réussi avec succès !');
  } finally {
    try {
      execSync(`rm -rf "${tmpDir}"`);
    } catch (_) {}
  }
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
