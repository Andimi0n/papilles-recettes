#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_unit_converter');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/constants/units.ts src/utils/helpers.ts src/utils/unitConverter.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const jsPath = fs.existsSync(path.join(tmpDir, 'utils/unitConverter.js'))
    ? path.join(tmpDir, 'utils/unitConverter.js')
    : fs.existsSync(path.join(tmpDir, 'unitConverter.js'))
    ? path.join(tmpDir, 'unitConverter.js')
    : path.join(tmpDir, 'src/utils/unitConverter.js');

  const {
    convertIngredientQuantity,
    getNextConversionTarget,
    isIngredientConvertible,
    parseQuantityNumber,
    getUnitType,
  } = require(jsPath);

  console.log('🧪 Lancement des tests de unitConverter & densités...');

  // --- Test 1 : Parsing des quantités numériques ---
  console.log('\n--- Test 1 : Parsing des quantités ---');
  assert.strictEqual(parseQuantityNumber('250'), 250);
  assert.strictEqual(parseQuantityNumber('1.5'), 1.5);
  assert.strictEqual(parseQuantityNumber('1,5'), 1.5);
  assert.strictEqual(parseQuantityNumber('1/2'), 0.5);
  assert.strictEqual(parseQuantityNumber('½'), 0.5);
  assert.strictEqual(parseQuantityNumber('1 1/2'), 1.5);
  assert.strictEqual(parseQuantityNumber('2-3'), 2.5);
  assert.strictEqual(parseQuantityNumber('2 à 3'), 2.5);
  assert.strictEqual(parseQuantityNumber('au goût'), null);
  assert.strictEqual(parseQuantityNumber(''), null);
  console.log('✓ Parsing de fractions, fourchettes et virgules OK');

  // --- Test 2 : Identification des types d\'unités ---
  console.log('\n--- Test 2 : Identification des types d\'unités ---');
  assert.strictEqual(getUnitType('g'), 'mass');
  assert.strictEqual(getUnitType('kg'), 'mass');
  assert.strictEqual(getUnitType('ml'), 'metric_volume');
  assert.strictEqual(getUnitType('cl'), 'metric_volume');
  assert.strictEqual(getUnitType('L'), 'metric_volume');
  assert.strictEqual(getUnitType('c. à soupe'), 'spoon_volume');
  assert.strictEqual(getUnitType('cas'), 'spoon_volume');
  assert.strictEqual(getUnitType('c. à café'), 'spoon_volume');
  assert.strictEqual(getUnitType('cac'), 'spoon_volume');
  assert.strictEqual(getUnitType('verre'), 'spoon_volume');
  assert.strictEqual(getUnitType('brin'), 'unconvertible');
  assert.strictEqual(getUnitType('botte'), 'unconvertible');
  assert.strictEqual(getUnitType('poignée'), 'unconvertible');
  assert.strictEqual(getUnitType('tranche'), 'unconvertible');
  console.log('✓ Classification des unités OK');

  // --- Test 3 : Conversion vers Grammes ('mass') ---
  console.log('\n--- Test 3 : Conversion vers Grammes ---');
  // Eau (densité 1.0) : 250 ml -> 250 g
  const eauRes = convertIngredientQuantity('250', 'ml', 'mass', 1.0);
  assert.strictEqual(eauRes.isConverted, true);
  assert.strictEqual(eauRes.quantity, '250');
  assert.strictEqual(eauRes.unit, 'g');

  // Farine (densité 0.57) : 100 ml -> 57 g
  const farineRes = convertIngredientQuantity('100', 'ml', 'mass', 0.57);
  assert.strictEqual(farineRes.isConverted, true);
  assert.strictEqual(farineRes.quantity, '57');
  assert.strictEqual(farineRes.unit, 'g');

  // Huile d'olive (densité 0.92) : 2 c. à soupe (30 ml) -> ~28 g
  const huileRes = convertIngredientQuantity('2', 'c. à soupe', 'mass', 0.92);
  assert.strictEqual(huileRes.isConverted, true);
  assert.strictEqual(huileRes.quantity, '28');
  assert.strictEqual(huileRes.unit, 'g');

  // 1 kg -> 1000 g
  const kgRes = convertIngredientQuantity('1', 'kg', 'mass', undefined);
  assert.strictEqual(kgRes.isConverted, true);
  assert.strictEqual(kgRes.quantity, '1000');
  assert.strictEqual(kgRes.unit, 'g');

  // Déjà en g -> isConverted false
  const dejaG = convertIngredientQuantity('150', 'g', 'mass', 0.57);
  assert.strictEqual(dejaG.isConverted, false);
  assert.strictEqual(dejaG.quantity, '150');
  assert.strictEqual(dejaG.unit, 'g');

  // Sans densité, volume -> masse impossible
  const sansDensite = convertIngredientQuantity('200', 'ml', 'mass', undefined);
  assert.strictEqual(sansDensite.isConverted, false);
  assert.strictEqual(sansDensite.quantity, '200');
  assert.strictEqual(sansDensite.unit, 'ml');

  console.log('✓ Conversions vers masse (g) validées');

  // --- Test 4 : Conversion vers Volume ('volume') ---
  console.log('\n--- Test 4 : Conversion vers Volume ---');
  // Farine (0.57) : 250 g -> 250 / 0.57 = 438.6 ml -> 439 ml
  const farineVol = convertIngredientQuantity('250', 'g', 'volume', 0.57);
  assert.strictEqual(farineVol.isConverted, true);
  assert.strictEqual(farineVol.unit, 'ml');
  assert.strictEqual(farineVol.quantity, '439');

  // Eau (1.0) : 200 g -> 200 ml -> 20 cl
  const eauVol = convertIngredientQuantity('200', 'g', 'volume', 1.0);
  assert.strictEqual(eauVol.isConverted, true);
  assert.strictEqual(eauVol.unit, 'cl');
  assert.strictEqual(eauVol.quantity, '20');

  // Cuillère sans densité vers volume métrique : 2 c. à soupe -> 30 ml
  const cuillereVol = convertIngredientQuantity('2', 'c. à soupe', 'volume', undefined);
  assert.strictEqual(cuillereVol.isConverted, true);
  assert.strictEqual(cuillereVol.quantity, '30');
  assert.strictEqual(cuillereVol.unit, 'ml');

  // 1 c. à café -> 5 ml
  const cacVol = convertIngredientQuantity('1', 'c. à café', 'volume', undefined);
  assert.strictEqual(cacVol.isConverted, true);
  assert.strictEqual(cacVol.quantity, '5');
  assert.strictEqual(cacVol.unit, 'ml');

  // Grand volume : 1500 g eau (1.0) -> 1,5 L
  const grandVol = convertIngredientQuantity('1500', 'g', 'volume', 1.0);
  assert.strictEqual(grandVol.isConverted, true);
  assert.strictEqual(grandVol.unit, 'L');
  assert.strictEqual(grandVol.quantity, '1,5');

  // Sans densité, masse -> volume impossible
  const sansDensiteVol = convertIngredientQuantity('200', 'g', 'volume', undefined);
  assert.strictEqual(sansDensiteVol.isConverted, false);
  assert.strictEqual(sansDensiteVol.quantity, '200');
  assert.strictEqual(sansDensiteVol.unit, 'g');

  console.log('✓ Conversions vers volume validées');

  // --- Test 5 : Unités non convertibles ---
  console.log('\n--- Test 5 : Unités non convertibles ---');
  const botteRes = convertIngredientQuantity('1', 'botte', 'mass', 1.0);
  assert.strictEqual(botteRes.isConverted, false);
  assert.strictEqual(botteRes.quantity, '1');
  assert.strictEqual(botteRes.unit, 'botte');

  const brinRes = convertIngredientQuantity('3', 'brins', 'volume', 1.0);
  assert.strictEqual(brinRes.isConverted, false);
  assert.strictEqual(brinRes.quantity, '3');
  assert.strictEqual(brinRes.unit, 'brins');

  assert.strictEqual(isIngredientConvertible('1', 'botte', 1.0), false);
  assert.strictEqual(isIngredientConvertible('3', 'brins', 1.0), false);
  console.log('✓ Unités non convertibles protégées');

  // --- Test 6 : Cycle de conversion par ingrédient individuel ---
  console.log('\n--- Test 6 : Cycles de conversion ---');
  // Cas masse (ex: 250 g farine, d = 0.57) : original -> volume -> original
  assert.strictEqual(getNextConversionTarget('original', 'g', 0.57), 'volume');
  assert.strictEqual(getNextConversionTarget('volume', 'g', 0.57), 'original');

  // Cas masse sans densité : original -> original
  assert.strictEqual(getNextConversionTarget('original', 'g', undefined), 'original');

  // Cas volume métrique (ex: 20 cl lait, d = 1.03) : original -> mass -> original
  assert.strictEqual(getNextConversionTarget('original', 'cl', 1.03), 'mass');
  assert.strictEqual(getNextConversionTarget('mass', 'cl', 1.03), 'original');

  // Cas cuillère avec densité (ex: 2 c. à soupe huile, d = 0.92) : original -> mass -> volume -> original
  assert.strictEqual(getNextConversionTarget('original', 'c. à soupe', 0.92), 'mass');
  assert.strictEqual(getNextConversionTarget('mass', 'c. à soupe', 0.92), 'volume');
  assert.strictEqual(getNextConversionTarget('volume', 'c. à soupe', 0.92), 'original');

  // Cas cuillère sans densité : original -> volume -> original
  assert.strictEqual(getNextConversionTarget('original', 'c. à soupe', undefined), 'volume');
  assert.strictEqual(getNextConversionTarget('volume', 'c. à soupe', undefined), 'original');

  // Cas non convertible : original -> original
  assert.strictEqual(getNextConversionTarget('original', 'botte', 1.0), 'original');

  console.log('✓ Règle du cycle Base -> Volume/Poids -> Volume/Poids -> Base 100% respectée');

  // Nettoyage dossier temporaire
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n🎉 TOUS LES TESTS DE CONVERSION D\'UNITÉ ONT RÉUSSI (0 ERREUR) !');
}

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
