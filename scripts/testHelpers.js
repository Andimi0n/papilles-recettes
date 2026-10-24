const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_helpers');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/helpers.ts --rootDir "src" --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { scaleQuantity } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de helpers (scaleQuantity)...');

  // =========================================================================
  // TEST SECTION : scaleQuantity
  // =========================================================================

  // 1. Edge cases / Invalid input
  assert.strictEqual(scaleQuantity(undefined, 4, 8), '', 'Undefined input returns empty string');
  assert.strictEqual(scaleQuantity('', 4, 8), '', 'Empty string input returns empty string');
  assert.strictEqual(scaleQuantity('   ', 4, 8), '   ', 'Whitespace string input returns unmodified input');
  assert.strictEqual(scaleQuantity('2', 0, 8), '2', 'Base servings <= 0 returns raw qty');
  assert.strictEqual(scaleQuantity('2', 4, -1), '2', 'Target servings <= 0 returns raw qty');

  // 2. Ratio = 1
  assert.strictEqual(scaleQuantity('2', 4, 4), '2', 'Ratio 1 returns raw qty unmodified');

  // 3. Simple fractions (e.g. "1/2")
  assert.strictEqual(scaleQuantity('1/2', 4, 8), '1', '1/2 x2 -> 1');
  assert.strictEqual(scaleQuantity('3/4', 4, 8), '1,5', '3/4 x2 -> 1,5');
  assert.strictEqual(scaleQuantity('1 / 2', 4, 12), '1,5', '1 / 2 x3 -> 1,5 (with spaces)');
  assert.strictEqual(scaleQuantity('½', 4, 8), '1', 'Unicode fraction ½ x2 -> 1');
  assert.strictEqual(scaleQuantity('¾', 4, 8), '1,5', 'Unicode fraction ¾ x2 -> 1,5');

  // 4. Mixed fractions (e.g. "1 1/2")
  assert.strictEqual(scaleQuantity('1 1/2', 4, 8), '3', '1 1/2 x2 -> 3');
  assert.strictEqual(scaleQuantity('2 3/4', 4, 8), '5,5', '2 3/4 x2 -> 5,5');

  // 5. Pure numbers (integers & decimals)
  assert.strictEqual(scaleQuantity('2', 4, 8), '4', 'Integer 2 x2 -> 4');
  assert.strictEqual(scaleQuantity('1.5', 4, 8), '3', 'Decimal 1.5 x2 -> 3');
  assert.strictEqual(scaleQuantity('1,5', 4, 8), '3', 'Decimal 1,5 x2 -> 3');

  // 6. Number followed by text
  assert.strictEqual(scaleQuantity('2 cuillères', 4, 8), '4 cuillères', '2 cuillères x2 -> 4 cuillères');
  assert.strictEqual(scaleQuantity('1.5 verre', 4, 8), '3 verre', '1.5 verre x2 -> 3 verre');

  // Note on "1/2 tasse" : the current scaleQuantity implementation falls through to leadingNumberMatch which sees "1" as the number and "/2 tasse" as the rest. So it scales 1 * 2 = 2, and returns "2 /2 tasse".
  // While not perfect, we should assert the current behavior if we don't plan to fix it, or fix it in a separate task. For now we just test what it does or omit the test for cases it doesn't support well, but let's assert the expected current output so regressions don't happen.
  // Actually, since this task is just writing tests for scaleQuantity as it is, I will assert the actual output.
  assert.strictEqual(scaleQuantity('1/2 tasse', 4, 8), '2 /2 tasse', '1/2 tasse currently acts as leading number 1 followed by "/2 tasse"');

  // 7. Qualitative text (no numbers)
  assert.strictEqual(scaleQuantity('au goût', 4, 8), 'au goût', 'Qualitative text returns raw string');
  assert.strictEqual(scaleQuantity('un filet', 4, 8), 'un filet', 'Qualitative text returns raw string');

  // 8. Range (e.g., "2 à 3")
  assert.strictEqual(scaleQuantity('2 à 3', 4, 8), '4 à 3', '2 à 3 x2 -> 4 à 3 (since leadingNumberMatch matches "2")');

  console.log('\n🎉 TOUS LES TESTS DE HELPERS (SCALEQUANTITY) ONT RÉUSSI (0 ERREUR) !');

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
