#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire d'allergenMatcher (Arbitrage 5 & Sécurité Sanitaire)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_allergens');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/allergenMatcher.ts src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const {
    prepareUserAllergens,
    isIngredientAllergen,
    evaluateRecipeAllergens,
  } = require(path.join(tmpDir, 'utils/allergenMatcher.js'));

  console.log('🧪 Lancement des tests d\'allergenMatcher (Arbitrage 5)...');

  // Configuration utilisateur : Allergie Lait & Lactose, Sulfites, et Fruits à coque
  const mockUserAllergens = [
    {
      id: 'a1',
      name: 'Lait & Lactose',
      allergenFamily: 'lait',
      addedAt: '',
    },
    {
      id: 'a2',
      name: 'Sulfites',
      allergenFamily: 'sulfites',
      addedAt: '',
    },
    {
      id: 'a3',
      name: 'Fruits à coque',
      allergenFamily: 'fruits_a_coque',
      addedAt: '',
    },
  ];

  const prepared = prepareUserAllergens(mockUserAllergens);
  assert.ok(prepared.activeFamilies.has('lait'), 'Lait doit être actif');
  assert.ok(prepared.activeFamilies.has('sulfites'), 'Sulfites doit être actif');
  assert.ok(prepared.activeFamilies.has('fruits_a_coque'), 'Fruits à coque doit être actif');

  // =========================================================================
  // TEST SECTION 1 : Zéro faux positif sur ingrédients canoniques distincts
  // =========================================================================
  console.log('\n--- Test 1 : Zéro faux positif (Lexique-First) ---');

  // Oignon blanc NE DOIT PAS déclencher Sulfites (bug historique résolu)
  const oignonBlanc = isIngredientAllergen('oignon blanc', prepared);
  assert.strictEqual(oignonBlanc.isAllergen, false, '"oignon blanc" ne doit JAMAIS déclencher d\'allergène sulfites');
  console.log('✓ "oignon blanc" ne déclenche aucun allergène sulfites (0 faux positif)');

  // Noix de muscade NE DOIT PAS déclencher Fruits à coque
  const muscade = isIngredientAllergen('noix de muscade', prepared);
  assert.strictEqual(muscade.isAllergen, false, '"noix de muscade" ne doit PAS déclencher fruits à coque');
  console.log('✓ "noix de muscade" ne déclenche pas fruits à coque');

  // Lait de coco NE DOIT PAS déclencher Lait
  const laitCoco = isIngredientAllergen('lait de coco', prepared);
  assert.strictEqual(laitCoco.isAllergen, false, '"lait de coco" ne doit PAS déclencher l\'allergène lait');
  console.log('✓ "lait de coco" ne déclenche pas l\'allergène lait');

  // =========================================================================
  // TEST SECTION 2 : Faux négatifs éliminés via racines sémantiques (Arbitrage 5)
  // =========================================================================
  console.log('\n--- Test 2 : Détection des racines sémantiques sur termes hors lexique ---');

  // Terme inconnu hors lexique contenant du lait (béchamel)
  const bechamel = isIngredientAllergen('sauce béchamel maison', prepared);
  assert.strictEqual(bechamel.isAllergen, true, '"sauce béchamel maison" doit être détectée comme allergène lait');
  assert.strictEqual(bechamel.allergenFamily, 'lait');
  console.log('✓ "sauce béchamel maison" correctement détectée comme allergène lait');

  // Terme inconnu hors lexique contenant des noisettes
  const coulisNoisette = isIngredientAllergen('coulis de noisettes torréfiées', prepared);
  assert.strictEqual(coulisNoisette.isAllergen, true, '"coulis de noisettes" doit être détecté comme fruits à coque');
  assert.strictEqual(coulisNoisette.allergenFamily, 'fruits_a_coque');
  console.log('✓ "coulis de noisettes torréfiées" correctement détecté comme fruits à coque');

  // Termes végétaux non laitiers (faux amis "beurre", "crème", "lait")
  const beurreCacahuete = isIngredientAllergen('beurre de cacahuète artisanal', prepared);
  assert.strictEqual(beurreCacahuete.isAllergen, false, '"beurre de cacahuète" ne doit PAS déclencher l\'allergène lait');
  const cremeMarrons = isIngredientAllergen('crème de marrons d\'Ardèche', prepared);
  assert.strictEqual(cremeMarrons.isAllergen, false, '"crème de marrons" ne doit PAS déclencher l\'allergène lait');
  const laitRiz = isIngredientAllergen('lait de riz bio', prepared);
  assert.strictEqual(laitRiz.isAllergen, false, '"lait de riz" ne doit PAS déclencher l\'allergène lait');
  console.log('✓ Faux amis végétaux (beurre de cacahuète, crème de marrons, lait de riz) ne déclenchent pas l\'allergène lait');

  // =========================================================================
  // TEST SECTION 3 : Évaluation de recette et indicateur de précaution
  // =========================================================================
  console.log('\n--- Test 3 : Évaluation de recette et précaution ---');

  const recipeWithUnrecognized = {
    id: 'r_unrec',
    title: 'Gâteau mystère',
    ingredients: [
      { id: 'i1', name: 'Farine', canonicalId: 'ing_canon_farine' },
      { id: 'i2', name: 'Sucre', canonicalId: 'ing_canon_sucre' },
      { id: 'i3', name: 'Pâte de yuzu bio' }, // Hors lexique et sans allergène configuré
    ],
  };

  const evalRecipe = evaluateRecipeAllergens(recipeWithUnrecognized, prepared);
  assert.strictEqual(evalRecipe.hasAllergen, false, 'Aucun allergène avéré');
  assert.strictEqual(evalRecipe.hasUnrecognizedIngredients, true, 'Doit lever l\'indicateur de précaution');
  assert.strictEqual(evalRecipe.unrecognizedIngredients.length, 1);
  assert.strictEqual(evalRecipe.unrecognizedIngredients[0].name, 'Pâte de yuzu bio');
  console.log('✓ Indicateur de précaution visuel correctement activé pour les ingrédients hors lexique');

  console.log('\n🎉 TOUS LES TESTS D\'ALLERGEN MATCHER ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS ALLERGÈNES :', err);
  process.exit(1);
});
