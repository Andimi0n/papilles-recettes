#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de helpers.ts
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_helpers');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/helpers.ts src/types/recipe.ts src/types/planner.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { levenshteinDistance } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de helpers...');

  // =========================================================================
  // TEST SECTION 1 : levenshteinDistance
  // =========================================================================
  console.log('\n--- Test 1 : levenshteinDistance ---');

  // Identiques
  assert.strictEqual(levenshteinDistance('', ''), 0, 'Chaînes vides');
  assert.strictEqual(levenshteinDistance('a', 'a'), 0, 'Chaînes identiques courtes');
  assert.strictEqual(levenshteinDistance('test', 'test'), 0, 'Chaînes identiques longues');
  console.log('✓ Chaînes identiques (distance 0)');

  // Vides
  assert.strictEqual(levenshteinDistance('', 'a'), 1, 'Vide et 1 caractère');
  assert.strictEqual(levenshteinDistance('test', ''), 4, '1 chaîne vide');
  assert.strictEqual(levenshteinDistance('', 'test'), 4, '1 chaîne vide');
  console.log('✓ Chaînes vides gérées correctement');

  // Remplacement
  assert.strictEqual(levenshteinDistance('test', 'tent'), 1, 'Remplacement 1 caractère');
  assert.strictEqual(levenshteinDistance('abc', 'xyz'), 3, 'Remplacement complet');
  console.log('✓ Remplacement de caractères');

  // Insertion / Suppression
  assert.strictEqual(levenshteinDistance('test', 'tests'), 1, 'Insertion');
  assert.strictEqual(levenshteinDistance('tests', 'test'), 1, 'Suppression');
  assert.strictEqual(levenshteinDistance('chat', 'chats'), 1, 'Insertion à la fin');
  assert.strictEqual(levenshteinDistance('chat', 'achat'), 1, 'Insertion au début');
  console.log('✓ Insertion et suppression');

  // Mixte
  assert.strictEqual(levenshteinDistance('kitten', 'sitting'), 3, 'Cas classique kitten/sitting');
  assert.strictEqual(levenshteinDistance('flaw', 'lawn'), 2, 'Cas classique flaw/lawn');
  assert.strictEqual(levenshteinDistance('intention', 'execution'), 5, 'Cas classique intention/execution');
  console.log('✓ Opérations mixtes (kitten -> sitting, flaw -> lawn)');

  // Casse / normalisation
  assert.strictEqual(levenshteinDistance('Test', 'test'), 1, 'Sensible à la casse (si pas normalisé avant)');
  console.log('✓ Sensibilité à la casse (comportement brut attendu)');

  console.log('\n🎉 TOUS LES TESTS DE HELPERS ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS HELPERS :', err);
  process.exit(1);
});
