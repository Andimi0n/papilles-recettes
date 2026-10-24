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
      `"${tscBin}" src/utils/helpers.ts src/types/recipe.ts src/types/planner.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { extractTimersFromText } = require(path.join(tmpDir, 'utils/helpers.js'));

  console.log('🧪 Lancement des tests de extractTimersFromText...');

  // 1. Heures + Minutes
  const timers1 = extractTimersFromText('Cuire 1h30 puis 2 heures 15 minutes.');
  assert.strictEqual(timers1.length, 2);
  assert.strictEqual(timers1[0].totalSeconds, 90 * 60);
  assert.strictEqual(timers1[0].label, '1h30');
  assert.strictEqual(timers1[1].totalSeconds, 135 * 60);
  assert.strictEqual(timers1[1].label, '2h15');

  // 2. Heure et demie
  const timers2 = extractTimersFromText('Laisser reposer 1 heure et demie.');
  assert.strictEqual(timers2.length, 1);
  assert.strictEqual(timers2[0].totalSeconds, 90 * 60);
  assert.strictEqual(timers2[0].label, '1h30');

  // 3. Heures seules
  const timers3 = extractTimersFromText('Cuire 2 h puis 3 heures.');
  assert.strictEqual(timers3.length, 2);
  assert.strictEqual(timers3[0].totalSeconds, 2 * 3600);
  assert.strictEqual(timers3[0].label, '2 h');
  assert.strictEqual(timers3[1].totalSeconds, 3 * 3600);
  assert.strictEqual(timers3[1].label, '3 h');

  // 4. Fourchettes de minutes
  const timers4 = extractTimersFromText('Mijoter 15 à 20 min ou 10-15 minutes.');
  assert.strictEqual(timers4.length, 2);
  assert.strictEqual(timers4[0].totalSeconds, 15 * 60);
  assert.strictEqual(timers4[0].label, '15 à 20 min');
  assert.strictEqual(timers4[1].totalSeconds, 10 * 60);
  assert.strictEqual(timers4[1].label, '10 à 15 min');

  // 5. Minutes simples
  const timers5 = extractTimersFromText('Chauffer 15 min et 5 mn.');
  assert.strictEqual(timers5.length, 2);
  assert.strictEqual(timers5[0].totalSeconds, 15 * 60);
  assert.strictEqual(timers5[0].label, '15 min');
  assert.strictEqual(timers5[1].totalSeconds, 5 * 60);
  assert.strictEqual(timers5[1].label, '5 min');

  // 6. Secondes
  const timers6 = extractTimersFromText('Mixer 30 secondes ou 45 sec.');
  assert.strictEqual(timers6.length, 2);
  assert.strictEqual(timers6[0].totalSeconds, 30);
  assert.strictEqual(timers6[0].label, '30 sec');
  assert.strictEqual(timers6[1].totalSeconds, 45);
  assert.strictEqual(timers6[1].label, '45 sec');

  // Edge Case: Duplicate times (same total seconds)
  const timers7 = extractTimersFromText('Cuire 15 min, puis 15 min, puis 15 minutes.');
  assert.strictEqual(timers7.length, 1);
  assert.strictEqual(timers7[0].totalSeconds, 15 * 60);

  // Edge Case: 0 duration
  const timers8 = extractTimersFromText('Laisser 0 min.');
  assert.strictEqual(timers8.length, 0);

  // Edge Case: Overlapping/Combined
  const timers9 = extractTimersFromText('Préparation: 15 min. Cuisson: 1h30 (dont 10 min à feu vif, 45 sec de repos)');
  assert.strictEqual(timers9.length, 4);
  assert.strictEqual(timers9.find(t => t.totalSeconds === 900)?.label, '15 min');
  assert.strictEqual(timers9.find(t => t.totalSeconds === 5400)?.label, '1h30');
  assert.strictEqual(timers9.find(t => t.totalSeconds === 600)?.label, '10 min');
  assert.strictEqual(timers9.find(t => t.totalSeconds === 45)?.label, '45 sec');

  console.log('\n✅ Tous les tests ont réussi !');
}

main().catch(err => {
  console.error('Erreur :', err);
  process.exit(1);
});
