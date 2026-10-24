#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_helpers');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/helpers.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { scaleQuantity } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de scaleQuantity (Edge cases)...');

  console.log('\n--- Test 1 : baseServings = 0 ---');
  const res1 = scaleQuantity('2', 0, 4);
  assert.strictEqual(res1, '2', 'Quand baseServings est 0, devrait retourner la quantité originale au lieu de Infinity');
  console.log('✓ baseServings = 0 géré correctement');

  console.log('\n--- Test 2 : targetServings = 0 ---');
  const res2 = scaleQuantity('2', 4, 0);
  assert.strictEqual(res2, '0', 'Quand targetServings est 0, devrait retourner "0"');
  console.log('✓ targetServings = 0 géré correctement');

  console.log('\n--- Test 3 : baseServings < 0 ou targetServings < 0 ---');
  const res3 = scaleQuantity('2', -1, 4);
  assert.strictEqual(res3, '2', 'Quand baseServings est < 0, devrait retourner la quantité originale');
  console.log('✓ baseServings < 0 géré correctement');

  const res4 = scaleQuantity('2', 4, -1);
  assert.strictEqual(res4, '2', 'Quand targetServings est < 0, devrait retourner la quantité originale');
  console.log('✓ targetServings < 0 géré correctement');

  console.log('\n--- Test 4 : rawQty null/undefined/empty ---');
  assert.strictEqual(scaleQuantity(undefined, 2, 4), '', 'Doit gérer undefined');
  assert.strictEqual(scaleQuantity('', 2, 4), '', 'Doit gérer chaîne vide');
  assert.strictEqual(scaleQuantity('   ', 2, 4), '   ', 'Doit gérer espaces');
  console.log('✓ rawQty invalides gérés correctement');

  console.log('\n--- Test 5 : Normal scaling ---');
  assert.strictEqual(scaleQuantity('2', 2, 4), '4', '2 pour 2 pers -> 4 pour 4 pers');
  assert.strictEqual(scaleQuantity('1/2', 2, 4), '1', '1/2 pour 2 pers -> 1 pour 4 pers');
  assert.strictEqual(scaleQuantity('1 1/2', 2, 4), '3', '1 1/2 pour 2 pers -> 3 pour 4 pers');
  console.log('✓ Calculs de mise à l\'échelle normaux corrects');

  console.log('\n🎉 TOUS LES TESTS DE HELPERS ONT RÉUSSI (0 ERREUR) !');

  // Nettoyage
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS HELPERS :', err);
  process.exit(1);
});
