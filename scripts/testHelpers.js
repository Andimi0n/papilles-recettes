const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

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

  const {
    normalizeString,
    levenshteinDistance,
    stemWord,
    formatDuration,
    getRatingLabel,
    scaleQuantity,
    extractTimersFromText,
    formatTimerSeconds,
    getLocalDateString,
    addDaysToDateString,
    getDayOfWeekFromDateString
  } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de helpers.ts...');

  console.log('\n--- Test : normalizeString ---');
  assert.strictEqual(normalizeString('Café'), 'cafe');
  assert.strictEqual(normalizeString(' Crème Fraîche '), 'creme fraiche');
  assert.strictEqual(normalizeString('ÊTRE'), 'etre');
  console.log('✓ normalizeString OK');

  console.log('\n--- Test : levenshteinDistance ---');
  assert.strictEqual(levenshteinDistance('chat', 'chien'), 3);
  assert.strictEqual(levenshteinDistance('test', 'test'), 0);
  assert.strictEqual(levenshteinDistance('a', ''), 1);
  console.log('✓ levenshteinDistance OK');

  console.log('\n--- Test : stemWord ---');
  assert.strictEqual(stemWord('tomates'), 'tomate');
  assert.strictEqual(stemWord('oeufs'), 'oeuf');
  assert.strictEqual(stemWord('yeux'), 'oeil');
  assert.strictEqual(stemWord('gateaux'), 'gateau');
  console.log('✓ stemWord OK');

  console.log('\n--- Test : formatDuration ---');
  assert.strictEqual(formatDuration(45), '45 min');
  assert.strictEqual(formatDuration(60), '1 h');
  assert.strictEqual(formatDuration(75), '1h15');
  assert.strictEqual(formatDuration(0), '0 min');
  console.log('✓ formatDuration OK');

  console.log('\n--- Test : getRatingLabel ---');
  assert.strictEqual(getRatingLabel(5), 'Exceptionnel !');
  assert.strictEqual(getRatingLabel(4.5), 'Excellent');
  assert.strictEqual(getRatingLabel(3.5), 'Très bon');
  assert.strictEqual(getRatingLabel(0), 'Non noté');
  console.log('✓ getRatingLabel OK');

  console.log('\n--- Test : scaleQuantity ---');
  assert.strictEqual(scaleQuantity('1', 4, 8), '2');
  assert.strictEqual(scaleQuantity('1/2', 4, 8), '1');
  assert.strictEqual(scaleQuantity('1 1/2', 2, 4), '3');
  assert.strictEqual(scaleQuantity('½', 2, 4), '1');
  assert.strictEqual(scaleQuantity('200g', 2, 4), '400 g');
  console.log('✓ scaleQuantity OK');

  console.log('\n--- Test : extractTimersFromText ---');
  const timers1 = extractTimersFromText('Cuire pendant 1 h 30 puis 15 min.');
  assert.strictEqual(timers1.length, 2);
  assert.strictEqual(timers1[0].totalSeconds, 5400); // 1h30
  assert.strictEqual(timers1[1].totalSeconds, 900); // 15 min
  console.log('✓ extractTimersFromText OK');

  console.log('\n--- Test : formatTimerSeconds ---');
  assert.strictEqual(formatTimerSeconds(90), '01:30');
  assert.strictEqual(formatTimerSeconds(3600), '1:00:00');
  assert.strictEqual(formatTimerSeconds(3665), '1:01:05');
  console.log('✓ formatTimerSeconds OK');

  console.log('\n--- Test : Dates ---');
  const d = new Date(2023, 9, 23); // 23 Octobre 2023
  assert.strictEqual(getLocalDateString(d), '2023-10-23');
  assert.strictEqual(addDaysToDateString('2023-10-23', 1), '2023-10-24');
  assert.strictEqual(addDaysToDateString('2023-10-23', -1), '2023-10-22');
  assert.strictEqual(getDayOfWeekFromDateString('2023-10-23'), 'Lundi');
  console.log('✓ Fonctions de date OK');

  console.log('\n🎉 TOUS LES TESTS HELPERS ONT RÉUSSI (0 ERREUR) !');

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
