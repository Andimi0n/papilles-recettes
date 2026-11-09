#!/usr/bin/env node

/**
 * Papilles - Test de validation de la barre verticale d'indicateur de stock / lexique
 * des ingrédients dans la fiche détaillée d'une recette.
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_ing_stock_bar');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/unifiedIngredientService.ts src/services/vocabularyService.ts src/services/storageService.ts src/utils/ingredientNormalizer.ts src/utils/allergenMatcher.ts src/utils/shoppingAggregator.ts src/utils/stockMatcher.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts src/constants/units.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mocks pour environnement Node.js pur
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
    exports: { default: AsyncStorageMock, ...AsyncStorageMock },
  };

  const {
    prepareStockItems,
    evaluateRecipeStock,
  } = require(path.join(tmpDir, 'utils/stockMatcher.js'));
  const { UnifiedIngredientService } = require(path.join(tmpDir, 'services/unifiedIngredientService.js'));
  const { VocabularyService } = require(path.join(tmpDir, 'services/vocabularyService.js'));
  const { normalizeString } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de statut stock & barre d\'ingrédient...');

  // Mock colors
  const colors = {
    amber: '#D97706',
    isDark: false,
  };

  function computeIngredientBar(ing, groupKey, stockEvaluation, isDark = false) {
    const isPantry = groupKey === 'pantry' || Boolean(ing.isPantryStaple);
    if (isPantry) {
      return { hasBar: false, isPantry: true };
    }

    const vocabMapById = VocabularyService.getSyncMapById();
    const isRecognized = Boolean(
      (ing.canonicalId && vocabMapById.has(ing.canonicalId)) ||
      UnifiedIngredientService.resolveRecognizedIngredient(ing.name).isRecognized
    );

    const inStockSet = new Set();
    if (stockEvaluation) {
      for (const m of stockEvaluation.matchedIngredients) {
        if (m.matchedBy === 'stock' || m.matchedBy === 'staple') {
          if (m.ingredient.id) inStockSet.add(m.ingredient.id);
          inStockSet.add(normalizeString(m.ingredient.name));
        }
      }
    }

    const isInStock = inStockSet.has(ing.id) || inStockSet.has(normalizeString(ing.name));

    let barColor;
    if (!isRecognized) {
      barColor = isDark ? '#FBBF24' : '#EAB308';
    } else if (isInStock) {
      barColor = isDark ? '#4ADE80' : '#22C55E';
    } else {
      barColor = isDark ? '#FB7185' : '#F43F5E';
    }

    return { hasBar: true, isPantry: false, isRecognized, isInStock, barColor };
  }

  // Stock utilisateur contenant uniquement des Carottes
  const stockItems = [
    { id: 'stock_1', name: 'Carottes', canonicalId: 'ing_canon_carotte' },
  ];
  const preparedStock = prepareStockItems(stockItems);

  const testRecipe = {
    id: 'rec_test_1',
    title: 'Recette Test',
    servings: 4,
    ingredients: [
      { id: 'ing_1', name: 'Carotte', canonicalId: 'ing_canon_carotte', quantity: '2', unit: 'pièce' },
      { id: 'ing_2', name: 'Poulet', canonicalId: 'ing_canon_poulet', quantity: '300', unit: 'g' },
      { id: 'ing_3', name: 'Sel fin', canonicalId: 'ing_canon_sel', isPantryStaple: true, quantity: '1', unit: 'pincée' },
      { id: 'ing_4', name: 'Élixir magique inconnu', quantity: '1', unit: 'goutte' },
    ],
    steps: ['Étape 1'],
  };

  const evaluation = evaluateRecipeStock(testRecipe, preparedStock, { assumePantryStaplesAvailable: true });

  // 1. Carotte : Dans le lexique ET en stock -> Barre Vert clair
  const resCarotte = computeIngredientBar(testRecipe.ingredients[0], 'main', evaluation, false);
  assert.strictEqual(resCarotte.hasBar, true, 'Carotte doit avoir une barre');
  assert.strictEqual(resCarotte.isRecognized, true, 'Carotte doit être reconnue dans le lexique');
  assert.strictEqual(resCarotte.isInStock, true, 'Carotte doit être en stock');
  assert.strictEqual(resCarotte.barColor, '#22C55E', 'Carotte doit avoir la barre vert clair');
  console.log('✓ Carotte (dans le stock) -> Barre Vert clair (#22C55E)');

  // 2. Poulet : Dans le lexique ET ABSENT du stock -> Barre Rouge clair rubis
  const resPoulet = computeIngredientBar(testRecipe.ingredients[1], 'main', evaluation, false);
  assert.strictEqual(resPoulet.hasBar, true, 'Poulet doit avoir une barre');
  assert.strictEqual(resPoulet.isRecognized, true, 'Poulet doit être reconnu dans le lexique');
  assert.strictEqual(resPoulet.isInStock, false, 'Poulet doit être absent du stock');
  assert.strictEqual(resPoulet.barColor, '#F43F5E', 'Poulet doit avoir la barre rouge clair rubis');
  console.log('✓ Poulet (absent du stock) -> Barre Rouge clair rubis (#F43F5E)');

  // 3. Sel fin : Assaisonnement et condiment (isPantryStaple / group pantry) -> AUCUNE BARRE
  const resSelPantryGroup = computeIngredientBar(testRecipe.ingredients[2], 'pantry', evaluation, false);
  assert.strictEqual(resSelPantryGroup.hasBar, false, 'Assaisonnement et condiment ne doit avoir AUCUNE barre');
  console.log('✓ Sel fin (assaisonnement et condiment) -> AUCUNE barre');

  const resSelStapleFlag = computeIngredientBar(testRecipe.ingredients[2], 'main', evaluation, false);
  assert.strictEqual(resSelStapleFlag.hasBar, false, 'Ingrédient avec isPantryStaple ne doit avoir AUCUNE barre');
  console.log('✓ Ingrédient isPantryStaple -> AUCUNE barre');

  // 4. Élixir inconnu : Hors lexique -> Jaune d\'or solaire (distinct du rouge)
  const resInconnu = computeIngredientBar(testRecipe.ingredients[3], 'main', evaluation, false);
  assert.strictEqual(resInconnu.hasBar, true, 'Ingrédient principal inconnu doit avoir une barre');
  assert.strictEqual(resInconnu.isRecognized, false, 'Ingrédient inconnu ne doit pas être dans le lexique');
  assert.strictEqual(resInconnu.barColor, '#EAB308', 'Ingrédient inconnu doit avoir la barre jaune d\'or solaire (#EAB308)');
  console.log('✓ Élixir magique inconnu (hors lexique) -> Jaune d\'or solaire (#EAB308)');

  // 5. Test en mode sombre
  const resPouletDark = computeIngredientBar(testRecipe.ingredients[1], 'main', evaluation, true);
  assert.strictEqual(resPouletDark.barColor, '#FB7185', 'Poulet en mode sombre doit être #FB7185 (rouge rubis clair)');
  const resCarotteDark = computeIngredientBar(testRecipe.ingredients[0], 'main', evaluation, true);
  assert.strictEqual(resCarotteDark.barColor, '#4ADE80', 'Carotte en mode sombre doit être #4ADE80 (vert clair)');
  const resInconnuDark = computeIngredientBar(testRecipe.ingredients[3], 'main', evaluation, true);
  assert.strictEqual(resInconnuDark.barColor, '#FBBF24', 'Inconnu en mode sombre doit être #FBBF24 (jaune d\'or solaire)');
  console.log('✓ Mode sombre : Vert clair (#4ADE80), Rouge rubis (#FB7185) et Jaune d\'or (#FBBF24) validés');

  // Nettoyage tmpDir
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_e) {}

  console.log('\n🎉 Tous les tests de la barre de stock / lexique ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
