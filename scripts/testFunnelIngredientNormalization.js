#!/usr/bin/env node

/**
 * Papilles - Tests de l'Entonnoir de Normalisation des Ingrédients (Phase 1 & 2)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_funnel');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { cwd: path.join(__dirname, '..'), stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  let success = false;
  try {
    const { normalizeIngredient } = require(path.join(tmpDir, 'utils/ingredientNormalizer.js'));

    console.log('🧪 Lancement des tests de l\'entonnoir de normalisation...');

    // =========================================================================
    // SECTION 1 : Élagage des labels de qualité et affinage
    // =========================================================================
    console.log('\n--- Test 1 : Élagage des labels de qualité (AOP, AOC, bio, au lait cru, non salé...) ---');

    const normFetaAop = normalizeIngredient({ name: 'feta AOP' });
    assert.strictEqual(normFetaAop.canonicalId, 'ing_canon_feta', 'feta AOP doit résoudre vers ing_canon_feta');
    console.log('✓ "feta AOP" résolu vers Feta');

    const normFetaLower = normalizeIngredient({ name: 'féta aop' });
    assert.strictEqual(normFetaLower.canonicalId, 'ing_canon_feta', 'féta aop doit résoudre vers ing_canon_feta');
    console.log('✓ "féta aop" résolu vers Feta');

    const normCacahuetes = normalizeIngredient({ name: 'cacahuètes grillées non salées' });
    assert.strictEqual(normCacahuetes.canonicalId, 'ing_canon_cacahuete', 'cacahuètes grillées non salées doit résoudre vers ing_canon_cacahuete');
    console.log('✓ "cacahuètes grillées non salées" résolu vers Cacahuète');

    const normVinaigreChoix = normalizeIngredient({ name: 'vinaigre de votre choix' });
    assert.strictEqual(normVinaigreChoix.canonicalId, 'ing_canon_vinaigre', 'vinaigre de votre choix doit résoudre vers ing_canon_vinaigre');
    console.log('✓ "vinaigre de votre choix" résolu vers Vinaigre');

    const normLaitPasteurise = normalizeIngredient({ name: 'lait pasteurisé' });
    assert.strictEqual(normLaitPasteurise.canonicalId, 'ing_canon_lait', 'lait pasteurisé doit résoudre vers ing_canon_lait');
    console.log('✓ "lait pasteurisé" résolu vers Lait');

    const normLaitCru = normalizeIngredient({ name: 'lait cru' });
    assert.strictEqual(normLaitCru.canonicalId, 'ing_canon_lait', 'lait cru doit résoudre vers ing_canon_lait');
    console.log('✓ "lait cru" résolu vers Lait');

    const normFromageLaitCru = normalizeIngredient({ name: 'fromage au lait cru' });
    assert.strictEqual(normFromageLaitCru.canonicalId, 'ing_canon_fromage', 'fromage au lait cru doit résoudre vers ing_canon_fromage');
    console.log('✓ "fromage au lait cru" résolu vers Fromage');

    const normDemiBaguettePrecuite = normalizeIngredient({ name: 'demi baguette précuite' });
    assert.strictEqual(normDemiBaguettePrecuite.canonicalId, 'ing_canon_pain', 'demi baguette précuite doit résoudre vers ing_canon_pain');
    console.log('✓ "demi baguette précuite" résolu vers Pain');

    // =========================================================================
    // SECTION 2 : Garde-fous Anti-Faux-Amis
    // =========================================================================
    console.log('\n--- Test 2 : Garde-fous Anti-Faux-Amis (interdiction des correspondances trompeuses) ---');

    const normPulpe = normalizeIngredient({ name: 'pulpe de tomate' });
    assert.notStrictEqual(normPulpe.canonicalId, 'ing_canon_poulpe', 'pulpe de tomate ne doit JAMAIS résoudre vers Poulpe');
    console.log('✓ "pulpe de tomate" ne résout pas vers Poulpe');

    const normPateCurry = normalizeIngredient({ name: 'pâte de curry' });
    assert.notStrictEqual(normPateCurry.canonicalId, 'ing_canon_pates', 'pâte de curry ne doit JAMAIS résoudre vers Pâtes');
    console.log('✓ "pâte de curry" ne résout pas vers Pâtes');

    const normPoudreCurry = normalizeIngredient({ name: 'poudre de curry' });
    assert.notStrictEqual(normPoudreCurry.canonicalId, 'ing_canon_pates', 'poudre de curry ne doit JAMAIS résoudre vers Pâtes');
    console.log('✓ "poudre de curry" ne résout pas vers Pâtes');

    const normPainCiabatta = normalizeIngredient({ name: 'pain ciabatta' });
    assert.notStrictEqual(normPainCiabatta.canonicalId, 'ing_canon_pain_pita', 'pain ciabatta ne doit pas résoudre vers Pain pita');
    console.log('✓ "pain ciabatta" ne résout pas vers Pain pita');

    // =========================================================================
    // SECTION 3 : Alternatives culinaires ("ou", "/")
    // =========================================================================
    console.log('\n--- Test 3 : Alternatives culinaires (préservation du libellé + canonicalId du 1er choix) ---');

    const normCremeOuYaourt = normalizeIngredient({ name: 'crème fraîche ou yaourt' });
    assert.strictEqual(normCremeOuYaourt.canonicalId, 'ing_canon_creme_fraiche', 'crème fraîche ou yaourt doit lier ing_canon_creme_fraiche');
    assert.strictEqual(normCremeOuYaourt.name, 'crème fraîche ou yaourt', 'le libellé complet doit être conservé pour l\'affichage');
    console.log('✓ "crème fraîche ou yaourt" -> conservé et lié à Crème fraîche');

    const normPatatesSlash = normalizeIngredient({ name: 'patates douces / pommes de terre' });
    assert.strictEqual(normPatatesSlash.canonicalId, 'ing_canon_patate_douce', 'patates douces / pommes de terre doit lier ing_canon_patate_douce');
    assert.strictEqual(normPatatesSlash.name, 'patates douces / pommes de terre', 'le libellé complet doit être conservé pour l\'affichage');
    console.log('✓ "patates douces / pommes de terre" -> conservé et lié à Patate douce');

    // =========================================================================
    // SECTION 4 : Nouveaux aliments canoniques & enrichissement d'alias (Phase 2)
    // =========================================================================
    console.log('\n--- Test 4 : Résolution des nouveaux aliments canoniques ajoutés ---');

    const normSpatzle = normalizeIngredient({ name: 'spätzle' });
    assert.ok(normSpatzle.canonicalId, 'spätzle doit avoir un canonicalId');
    console.log('✓ "spätzle" résolu vers', normSpatzle.name);

    const normChouRave = normalizeIngredient({ name: 'chou-rave' });
    assert.ok(normChouRave.canonicalId, 'chou-rave doit avoir un canonicalId');
    console.log('✓ "chou-rave" résolu vers', normChouRave.name);

    const normFalafel = normalizeIngredient({ name: 'falafels' });
    assert.ok(normFalafel.canonicalId, 'falafels doit avoir un canonicalId');
    console.log('✓ "falafels" résolu vers', normFalafel.name);

    const normPanko = normalizeIngredient({ name: 'chapelure panko' });
    assert.ok(normPanko.canonicalId, 'chapelure panko doit avoir un canonicalId');
    console.log('✓ "chapelure panko" résolu vers', normPanko.name);

    const normBaiesRoses = normalizeIngredient({ name: 'baies roses' });
    assert.ok(normBaiesRoses.canonicalId, 'baies roses doit avoir un canonicalId');
    console.log('✓ "baies roses" résolu vers', normBaiesRoses.name);

    const normJeunesPoussesEpinards = normalizeIngredient({ name: "jeunes pousses d'épinards" });
    assert.ok(normJeunesPoussesEpinards.canonicalId, "jeunes pousses d'épinards doit avoir un canonicalId");
    console.log('✓ "jeunes pousses d\'épinards" résolu vers', normJeunesPoussesEpinards.name);

    const normPommesGrenailles = normalizeIngredient({ name: 'pommes de terre grenailles' });
    assert.strictEqual(normPommesGrenailles.canonicalId, 'ing_canon_pomme_de_terre');
    console.log('✓ "pommes de terre grenailles" résolu vers Pomme de terre');

    const normYaourtGrecque = normalizeIngredient({ name: 'yaourt à la grecque' });
    assert.strictEqual(normYaourtGrecque.canonicalId, 'ing_canon_yaourt');
    console.log('✓ "yaourt à la grecque" résolu vers Yaourt');



    console.log('\n🎉 TOUS LES TESTS DE LA SECTION ONT RÉUSSI !');
    success = true;
  } finally {
    try {
      const fs = require('fs');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }

  if (!success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Échec du test :', err.message);
  process.exit(1);
});
