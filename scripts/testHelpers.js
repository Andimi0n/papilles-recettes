#!/usr/bin/env node

/**
 * Papilles - Test de validation unitaire de helpers.ts
 */

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

  const { formatTimerSeconds } = require(path.join(tmpDir, 'utils/helpers.js'));

  let totalTests = 0;
  let passedTests = 0;

  function runTest(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [SUCCÈS] ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ [ÉCHEC] ${name}`);
      console.error(`   Détails : ${error.message}`);
    }
  }

  console.log('\n==================================================');
  console.log('🧪 DÉBUT DES TESTS : helpers.ts - formatTimerSeconds');
  console.log('==================================================\n');

  runTest('Devrait formater correctement les secondes négatives et nulles', () => {
    assert.strictEqual(formatTimerSeconds(-10), '00:00');
    assert.strictEqual(formatTimerSeconds(0), '00:00');
  });

  runTest('Devrait formater correctement les secondes de moins d\'une minute', () => {
    assert.strictEqual(formatTimerSeconds(5), '00:05');
    assert.strictEqual(formatTimerSeconds(45), '00:45');
  });

  runTest('Devrait formater correctement les minutes exactes', () => {
    assert.strictEqual(formatTimerSeconds(60), '01:00');
    assert.strictEqual(formatTimerSeconds(600), '10:00');
  });

  runTest('Devrait formater correctement les minutes et secondes', () => {
    assert.strictEqual(formatTimerSeconds(65), '01:05');
    assert.strictEqual(formatTimerSeconds(125), '02:05');
    assert.strictEqual(formatTimerSeconds(659), '10:59');
  });

  runTest('Devrait formater correctement les heures, minutes et secondes', () => {
    assert.strictEqual(formatTimerSeconds(3600), '1:00:00');
    assert.strictEqual(formatTimerSeconds(3665), '1:01:05');
    assert.strictEqual(formatTimerSeconds(7200), '2:00:00');
    assert.strictEqual(formatTimerSeconds(7325), '2:02:05');
  });

  console.log('\n==================================================');
  console.log(`📊 BILAN : ${passedTests}/${totalTests} tests réussis`);
  console.log('==================================================\n');

  // Nettoyage
  try {
    execSync(`rm -rf "${tmpDir}"`);
  } catch (e) {
    // Ignorer les erreurs de nettoyage
  }

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
