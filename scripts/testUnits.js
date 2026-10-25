#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_units');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/constants/units.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const jsPath = fs.existsSync(path.join(tmpDir, 'units.js'))
    ? path.join(tmpDir, 'units.js')
    : path.join(tmpDir, 'constants/units.js');

  const {
    STANDARD_UNITS,
    QUICK_PICK_UNITS,
    normalizeUnit,
    findStandardUnit,
    isStandardUnit,
    formatQuantityWithUnit,
  } = require(jsPath);

  console.log('🧪 Lancement des tests de constants/units...');

  // Test 1 : Normalisation des unités de masse
  assert.strictEqual(normalizeUnit('g'), 'g');
  assert.strictEqual(normalizeUnit('gr'), 'g');
  assert.strictEqual(normalizeUnit('grammes'), 'g');
  assert.strictEqual(normalizeUnit('kg'), 'kg');
  assert.strictEqual(normalizeUnit('kilo'), 'kg');
  assert.strictEqual(normalizeUnit('kilogrammes'), 'kg');
  console.log('✓ Normalisation masse (g, kg) OK');

  // Test 2 : Normalisation des unités de volume
  assert.strictEqual(normalizeUnit('ml'), 'ml');
  assert.strictEqual(normalizeUnit('millilitres'), 'ml');
  assert.strictEqual(normalizeUnit('cl'), 'cl');
  assert.strictEqual(normalizeUnit('l'), 'l');
  assert.strictEqual(normalizeUnit('L'), 'l');
  assert.strictEqual(normalizeUnit('litres'), 'l');
  console.log('✓ Normalisation volume (ml, cl, L) OK');

  // Test 3 : Normalisation des mesures culinaires & accents
  assert.strictEqual(normalizeUnit('c. à soupe'), 'c. à soupe');
  assert.strictEqual(normalizeUnit('cas'), 'c. à soupe');
  assert.strictEqual(normalizeUnit('c.a.s'), 'c. à soupe');
  assert.strictEqual(normalizeUnit('c.à.s'), 'c. à soupe');
  assert.strictEqual(normalizeUnit('cuillere a soupe'), 'c. à soupe');
  assert.strictEqual(normalizeUnit('c. à café'), 'c. à café');
  assert.strictEqual(normalizeUnit('cac'), 'c. à café');
  assert.strictEqual(normalizeUnit('pincee'), 'pincée');
  assert.strictEqual(normalizeUnit('pincées'), 'pincée');
  console.log('✓ Normalisation cuillères & mesures OK');

  // Test 4 : Préservation de l'entrée libre si non standard
  assert.strictEqual(normalizeUnit('brique de 20cl'), 'brique de 20cl');
  assert.strictEqual(normalizeUnit('gros bouquet'), 'gros bouquet');
  assert.strictEqual(normalizeUnit(''), '');
  assert.strictEqual(normalizeUnit(undefined), '');
  console.log('✓ Préservation entrée libre OK');

  // Test 5 : Détection standard vs libre
  assert.strictEqual(isStandardUnit('g'), true);
  assert.strictEqual(isStandardUnit('kilo'), true);
  assert.strictEqual(isStandardUnit('brique de 20cl'), false);
  assert.strictEqual(isStandardUnit(''), false);
  console.log('✓ Détection isStandardUnit OK');

  // Test 6 : Formatage quantité + unité
  assert.strictEqual(formatQuantityWithUnit('200', 'g'), '200 g');
  assert.strictEqual(formatQuantityWithUnit('2', ''), '2');
  assert.strictEqual(formatQuantityWithUnit('2', undefined), '2');
  assert.strictEqual(formatQuantityWithUnit('', 'pincée'), 'pincée');
  assert.strictEqual(formatQuantityWithUnit('', ''), '');
  console.log('✓ Formatage formatQuantityWithUnit OK');

  // Test 7 : Intégrité des QUICK_PICK_UNITS
  assert.ok(QUICK_PICK_UNITS.length >= 8, 'Au moins 8 unités en quick-pick');
  QUICK_PICK_UNITS.forEach((id) => {
    assert.ok(findStandardUnit(id), `Quick pick ${id} doit être une unité standard`);
  });
  console.log('✓ Intégrité QUICK_PICK_UNITS OK');

  // Nettoyage
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('🎉 TOUS LES TESTS DES UNITÉS ONT RÉUSSI (0 ERREUR) !');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
