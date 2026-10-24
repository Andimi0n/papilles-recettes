#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire stricte de ingredientNormalizer
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_normalizer');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/ingredientNormalizer.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/utils/helpers.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  let success = false;
  try {
    const {
      normalizeIngredient,
      normalizeIngredients,
      stemPhrase
    } = require(path.join(tmpDir, 'utils/ingredientNormalizer.js'));

    console.log('🧪 Lancement des tests stricts de ingredientNormalizer...');

    // =========================================================================
    // TEST SECTION 1 : normalizeIngredient
    // =========================================================================
    console.log('\n--- Test 1 : normalizeIngredient (Résolution exacte) ---');

    const normCremeFraiche = normalizeIngredient({ name: 'Crème fraîche' });
    assert.strictEqual(normCremeFraiche.name, 'Crème fraîche');
    assert.strictEqual(normCremeFraiche.canonicalId, 'ing_canon_creme_fraiche');
    console.log('✓ "Crème fraîche" résolu exactement');

    const normPoudreAmande = normalizeIngredient({ name: 'Poudre d\'amande' });
    assert.strictEqual(normPoudreAmande.name, 'Poudre d\'amande');
    assert.strictEqual(normPoudreAmande.canonicalId, 'ing_canon_poudre_d_amande');
    console.log('✓ "Poudre d\'amande" résolu exactement');

    const normLegumesSurgeles = normalizeIngredient({ name: 'Légumes surgelés' });
    assert.strictEqual(normLegumesSurgeles.name, 'Légumes surgelés');
    assert.strictEqual(normLegumesSurgeles.canonicalId, 'ing_canon_legumes_surgeles');
    console.log('✓ "Légumes surgelés" résolu exactement');

    console.log('\n--- Test 2 : normalizeIngredient (Extraction quantité/unité) ---');

    const normOignonBlanc = normalizeIngredient({ name: '2 oignons blancs émincés' });
    assert.strictEqual(normOignonBlanc.name, 'Oignon');
    assert.strictEqual(normOignonBlanc.canonicalId, 'ing_canon_oignon');
    assert.strictEqual(normOignonBlanc.quantity, '2');
    console.log('✓ "2 oignons blancs émincés" extrait quantité 2 et résolu vers Oignon');

    const normPotCreme = normalizeIngredient({ name: '1 pot de crème fraîche' });
    assert.strictEqual(normPotCreme.name, 'Crème fraîche');
    assert.strictEqual(normPotCreme.canonicalId, 'ing_canon_creme_fraiche');
    assert.strictEqual(normPotCreme.quantity, '1');
    assert.strictEqual(normPotCreme.unit, 'pot');
    console.log('✓ "1 pot de crème fraîche" extrait quantité 1, unité pot, résolu Crème fraîche');

    const normFractionUnicode = normalizeIngredient({ name: '½ citron' });
    assert.strictEqual(normFractionUnicode.name, 'Citron');
    assert.strictEqual(normFractionUnicode.canonicalId, 'ing_canon_citron');
    assert.strictEqual(normFractionUnicode.quantity, '1/2');
    console.log('✓ "½ citron" extrait fraction Unicode 1/2 et résolu vers Citron');

    const normBranchesCeleri = normalizeIngredient({ name: '3 branches de céleri' });
    assert.strictEqual(normBranchesCeleri.name, 'Céleri');
    assert.strictEqual(normBranchesCeleri.canonicalId, 'ing_canon_celeri');
    assert.strictEqual(normBranchesCeleri.unit, 'branche');
    assert.strictEqual(normBranchesCeleri.quantity, '3');
    console.log('✓ "3 branches de céleri" extrait quantité 3, unité branche et résolu vers Céleri');

    const normPoigneeMache = normalizeIngredient({ name: '1 belle poignée de mâche' });
    assert.strictEqual(normPoigneeMache.name, 'Mâche');
    assert.strictEqual(normPoigneeMache.canonicalId, 'ing_canon_mache');
    assert.strictEqual(normPoigneeMache.unit, 'poignée');
    console.log('✓ "1 belle poignée de mâche" extrait contenant poignée et résolu vers Mâche');

    console.log('\n--- Test 3 : normalizeIngredient (Élagage Qualificatifs & Approximations Floues) ---');

    const normAubergineGrillee = normalizeIngredient({ name: 'aubergines grillées' });
    assert.strictEqual(normAubergineGrillee.name, 'Aubergine');
    assert.strictEqual(normAubergineGrillee.canonicalId, 'ing_canon_aubergine');
    console.log('✓ "aubergines grillées" élague le qualificatif grillé et résolu vers Aubergine');

    console.log('\n--- Test 4 : normalizeIngredient (Détection optionnel) ---');

    const normOptional = normalizeIngredient({ name: 'sel (facultatif)' });
    assert.strictEqual(normOptional.name, 'Sel');
    assert.strictEqual(normOptional.isOptional, true);
    console.log('✓ "sel (facultatif)" résolu vers Sel avec isOptional: true');

    console.log('\n--- Test 5 : stemPhrase ---');

    const stemmed = stemPhrase('oignons blancs');
    assert.strictEqual(stemmed, 'oignon blanc');
    console.log('✓ "oignons blancs" stemmé en "oignon blanc"');

    const stemmedTomates = stemPhrase('tomates cerises');
    assert.strictEqual(stemmedTomates, 'tomate cerise');
    console.log('✓ "tomates cerises" stemmé en "tomate cerise"');

    console.log('\n--- Test 6 : normalizeIngredients (Tableau) ---');

    const arr = normalizeIngredients([
      { name: '1 pomme' },
      { name: '2 poires' }
    ]);
    assert.strictEqual(arr.length, 2);
    assert.strictEqual(arr[0].name, 'Pomme');
    assert.strictEqual(arr[0].quantity, '1');
    assert.strictEqual(arr[1].name, 'Poire');
    assert.strictEqual(arr[1].quantity, '2');
    console.log('✓ Tableau d\'ingrédients normalisé avec succès');


    console.log('\n🎉 TOUS LES TESTS STRICTS ONT RÉUSSI AVEC SUCCÈS (0 ERREUR) !');
    success = true;
  } finally {
    // Nettoyage toujours exécuté (même en cas d'erreur)
    try {
      const fs = require('fs');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS :', err);
  process.exit(1);
});
