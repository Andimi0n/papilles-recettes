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

  const {
    CANONICAL_VOCAB_INDEX,
    findCanonicalIngredient,
    stripCulinaryStopWords,
  } = require(path.join(tmpDir, 'data/canonicalVocabulary.js'));

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

  // =========================================================================
  // TEST SECTION 4 : Multi-allergènes
  // =========================================================================
  console.log('\n--- Test 4 : Ingrédients multi-allergènes ---');

  const preparedMustard = prepareUserAllergens([
    { id: 'm1', name: 'Moutarde', allergenFamily: 'moutarde', addedAt: '' },
  ]);
  const mayoCheck = isIngredientAllergen('Mayonnaise', preparedMustard);
  assert.strictEqual(mayoCheck.isAllergen, true, 'Mayonnaise doit déclencher l\'allergie moutarde (secondaire)');
  assert.strictEqual(mayoCheck.allergenFamily, 'moutarde');
  console.log('✓ Mayonnaise détectée avec allergène secondaire moutarde');

  const preparedNuts = prepareUserAllergens([
    { id: 'n1', name: 'Fruits à coque', allergenFamily: 'fruits_a_coque', addedAt: '' },
  ]);
  const pestoCheck = isIngredientAllergen('Pesto', preparedNuts);
  assert.strictEqual(pestoCheck.isAllergen, true, 'Pesto doit déclencher l\'allergie fruits à coque (secondaire)');
  assert.strictEqual(pestoCheck.allergenFamily, 'fruits_a_coque');
  console.log('✓ Pesto détecté avec allergène secondaire fruits à coque');

  const preparedGluten = prepareUserAllergens([
    { id: 'g1', name: 'Gluten', allergenFamily: 'gluten', addedAt: '' },
  ]);
  const soyCheck = isIngredientAllergen('Sauce soja', preparedGluten);
  assert.strictEqual(soyCheck.isAllergen, true, 'Sauce soja doit déclencher l\'allergie gluten (secondaire)');
  assert.strictEqual(soyCheck.allergenFamily, 'gluten');
  console.log('✓ Sauce soja détectée avec allergène secondaire gluten');

  const preparedEggs = prepareUserAllergens([
    { id: 'e1', name: 'Oeufs', allergenFamily: 'oeufs', addedAt: '' },
  ]);
  const briocheCheck = isIngredientAllergen('Brioche', preparedEggs);
  assert.strictEqual(briocheCheck.isAllergen, true, 'Brioche doit déclencher l\'allergie oeufs (secondaire)');
  assert.strictEqual(briocheCheck.allergenFamily, 'oeufs');
  console.log('✓ Brioche détectée avec allergène secondaire oeufs');

  // =========================================================================
  // TEST SECTION 5 : Indexation O(1) et Stop-Words culinaires
  // =========================================================================
  console.log('\n--- Test 5 : CANONICAL_VOCAB_INDEX & findCanonicalIngredient ---');

  assert.ok(CANONICAL_VOCAB_INDEX instanceof Map, 'CANONICAL_VOCAB_INDEX doit être une Map');
  assert.ok(CANONICAL_VOCAB_INDEX.size > 200, 'CANONICAL_VOCAB_INDEX doit contenir les ingrédients et leurs alias');
  assert.ok(CANONICAL_VOCAB_INDEX.has('basilic cisele'), 'Alias basilic cisele présent');
  assert.ok(CANONICAL_VOCAB_INDEX.has('sake doux'), 'Alias sake doux présent');
  assert.ok(CANONICAL_VOCAB_INDEX.has('huile d olive vierge'), 'Alias huile d olive vierge présent');

  // Séparation Frais / Épicerie / Surgelés
  const petitsPoisConserve = findCanonicalIngredient('boite de petits pois');
  assert.ok(petitsPoisConserve, 'boite de petits pois doit être trouvée');
  assert.strictEqual(petitsPoisConserve.canonicalName, 'Petits pois en conserve');
  assert.strictEqual(petitsPoisConserve.defaultAisle, 'Épicerie & Condiments');

  const petitsPoisSurgeles = findCanonicalIngredient('petits pois surgeles');
  assert.ok(petitsPoisSurgeles, 'petits pois surgeles doit être trouvé');
  assert.strictEqual(petitsPoisSurgeles.canonicalName, 'Petits pois surgelés');
  assert.strictEqual(petitsPoisSurgeles.defaultAisle, 'Surgelés');

  const haricotsConserve = findCanonicalIngredient('boite de haricots verts');
  assert.ok(haricotsConserve, 'boite de haricots verts doit être trouvée');
  assert.strictEqual(haricotsConserve.canonicalName, 'Haricots verts en conserve');
  assert.strictEqual(haricotsConserve.defaultAisle, 'Épicerie & Condiments');

  const sardinesBoite = findCanonicalIngredient('boite de sardines');
  assert.ok(sardinesBoite, 'boite de sardines doit être trouvée');
  assert.strictEqual(sardinesBoite.defaultAisle, 'Épicerie & Condiments');

  const maquereauBoite = findCanonicalIngredient('boite de maquereaux');
  assert.ok(maquereauBoite, 'boite de maquereaux doit être trouvée');
  assert.strictEqual(maquereauBoite.defaultAisle, 'Épicerie & Condiments');

  const gingembreFrais = findCanonicalIngredient('gingembre frais');
  assert.ok(gingembreFrais, 'gingembre frais doit être trouvé');
  assert.strictEqual(gingembreFrais.canonicalName, 'Gingembre');
  assert.strictEqual(gingembreFrais.defaultAisle, 'Fruits & Légumes');

  const gingembrePoudre = findCanonicalIngredient('gingembre moulu');
  assert.ok(gingembrePoudre, 'gingembre moulu doit être trouvé');
  assert.strictEqual(gingembrePoudre.canonicalName, 'Gingembre en poudre');
  assert.strictEqual(gingembrePoudre.defaultAisle, 'Épicerie & Condiments');

  // Fallback stop-words culinaires
  const courgetteRapee = findCanonicalIngredient('courgette rapee');
  assert.ok(courgetteRapee, 'courgette rapee doit être trouvée via fallback stop-words');
  assert.strictEqual(courgetteRapee.canonicalName, 'Courgette');

  // Test fallback stop-words avec allergène utilisateur
  const preparedCourgette = prepareUserAllergens([
    { id: 'c1', name: 'Courgette', addedAt: '' },
  ]);
  const courgetteAllergenCheck = isIngredientAllergen('courgette rapee', preparedCourgette);
  assert.strictEqual(courgetteAllergenCheck.isAllergen, true, '"courgette rapee" doit matcher avec allergène Courgette');
  console.log('✓ Index O(1) et fallback stop-words validés');

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
