const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_aisle');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/aisleClassifier.ts src/utils/helpers.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { classifyIngredientAisle } = require(path.join(tmpDir, 'utils/aisleClassifier.js'));

  console.log('🧪 Lancement des tests de aisleClassifier...');

  // =========================================================================
  // TEST SECTION 1 : Compound Phrases
  // =========================================================================
  console.log('\n--- Test 1 : Phrases composées prioritaires (Pass 1) ---');

  assert.strictEqual(classifyIngredientAisle('pomme de terre'), 'Fruits & Légumes');
  assert.strictEqual(classifyIngredientAisle('pommes de terre'), 'Fruits & Légumes');
  assert.strictEqual(classifyIngredientAisle('huile d\'olive'), 'Épicerie & Condiments');
  assert.strictEqual(classifyIngredientAisle('vin rouge'), 'Boissons');
  assert.strictEqual(classifyIngredientAisle('blanc de poulet'), 'Boucherie & Poissonnerie');
  assert.strictEqual(classifyIngredientAisle('creme fraiche'), 'Produits Frais & Crèmerie');
  assert.strictEqual(classifyIngredientAisle('pain de mie'), 'Boulangerie & Pâtisserie');
  assert.strictEqual(classifyIngredientAisle('poelee surgelee'), 'Surgelés');

  console.log('✓ Phrases composées prioritaires correctement classifiées');

  // =========================================================================
  // TEST SECTION 2 : Exact Token Matches
  // =========================================================================
  console.log('\n--- Test 2 : Mots-clés unitaires précis (Pass 2) ---');

  // Surgelés
  assert.strictEqual(classifyIngredientAisle('glace'), 'Surgelés');
  assert.strictEqual(classifyIngredientAisle('sorbets'), 'Surgelés');

  // Boissons
  assert.strictEqual(classifyIngredientAisle('biere'), 'Boissons');
  assert.strictEqual(classifyIngredientAisle('champagne'), 'Boissons');

  // Boucherie
  assert.strictEqual(classifyIngredientAisle('poulet'), 'Boucherie & Poissonnerie');
  assert.strictEqual(classifyIngredientAisle('steaks'), 'Boucherie & Poissonnerie');

  // Crémerie
  assert.strictEqual(classifyIngredientAisle('fromage'), 'Produits Frais & Crèmerie');
  assert.strictEqual(classifyIngredientAisle('oeufs'), 'Produits Frais & Crèmerie');

  // Boulangerie
  assert.strictEqual(classifyIngredientAisle('pain'), 'Boulangerie & Pâtisserie');
  assert.strictEqual(classifyIngredientAisle('croissants'), 'Boulangerie & Pâtisserie');

  // Fruits & Légumes
  assert.strictEqual(classifyIngredientAisle('carotte'), 'Fruits & Légumes');
  assert.strictEqual(classifyIngredientAisle('tomates'), 'Fruits & Légumes');

  // Épicerie
  assert.strictEqual(classifyIngredientAisle('pates'), 'Épicerie & Condiments');
  assert.strictEqual(classifyIngredientAisle('farine'), 'Épicerie & Condiments');

  console.log('✓ Mots-clés unitaires précis correctement classifiés');

  // =========================================================================
  // TEST SECTION 3 : Prefix Matches
  // =========================================================================
  console.log('\n--- Test 3 : Préfixes et correspondances partielles (Pass 3) ---');

  assert.strictEqual(classifyIngredientAisle('chocolatine'), 'Épicerie & Condiments'); // choc...
  assert.strictEqual(classifyIngredientAisle('epicer'), 'Épicerie & Condiments'); // epice...
  assert.strictEqual(classifyIngredientAisle('fromagerie'), 'Produits Frais & Crèmerie'); // fromag...
  assert.strictEqual(classifyIngredientAisle('poulettes'), 'Boucherie & Poissonnerie'); // poulet...
  assert.strictEqual(classifyIngredientAisle('courgettes'), 'Fruits & Légumes'); // courget... (matched by exact, let's use courgetti)
  assert.strictEqual(classifyIngredientAisle('courgetti'), 'Fruits & Légumes'); // courget...

  console.log('✓ Préfixes lexicaux correctement classifiés');

  // =========================================================================
  // TEST SECTION 4 : Edge Cases and Fallbacks
  // =========================================================================
  console.log('\n--- Test 4 : Cas particuliers et retours par défaut ---');

  assert.strictEqual(classifyIngredientAisle(''), 'Autre');
  assert.strictEqual(classifyIngredientAisle('   '), 'Autre');
  assert.strictEqual(classifyIngredientAisle(null), 'Autre');
  assert.strictEqual(classifyIngredientAisle(undefined), 'Autre');
  assert.strictEqual(classifyIngredientAisle('ordinateur'), 'Autre');
  assert.strictEqual(classifyIngredientAisle('table'), 'Autre');

  console.log('✓ Cas particuliers et retours par défaut correctement gérés');

  console.log('\n🎉 TOUS LES TESTS DE AISLE CLASSIFIER ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS AISLE CLASSIFIER :', err);
  process.exit(1);
});
