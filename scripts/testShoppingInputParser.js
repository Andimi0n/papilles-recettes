#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_parser');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/constants/units.ts src/utils/aisleClassifier.ts src/utils/helpers.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/types/recipe.ts src/types/shopping.ts src/services/vocabularyService.ts src/utils/searchEngine.ts src/utils/ingredientNormalizer.ts src/utils/shoppingInputParser.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  const { parseShoppingInput } = require(path.join(tmpDir, 'utils/shoppingInputParser.js'));

  console.log('🧪 Lancement des tests de validation du parseur de courses libre...');

  // 1. Quantité + Unité attachée en tête
  const t1 = parseShoppingInput('1kg carottes');
  assert.strictEqual(t1.name, 'Carotte', 'Doit reconnaître le nom canonique Carotte');
  assert.strictEqual(t1.canonicalId, 'ing_canon_carotte', 'Doit lier au canonicalId');
  assert.strictEqual(t1.quantity, '1');
  assert.strictEqual(t1.unit, 'kg');
  assert.strictEqual(t1.aisle, 'Fruits & Légumes');
  console.log('✓ "1kg carottes" -> 1 kg Carotte (Fruits & Légumes)');

  const t2 = parseShoppingInput('500g de fraises');
  assert.strictEqual(t2.name, 'Fraise');
  assert.strictEqual(t2.canonicalId, 'ing_canon_fraise');
  assert.strictEqual(t2.quantity, '500');
  assert.strictEqual(t2.unit, 'g');
  console.log('✓ "500g de fraises" -> 500 g Fraise');

  // 2. Quantité + Unité détachée avec préposition "de"
  const t3 = parseShoppingInput('2 paquets de kinder bueno');
  assert.strictEqual(t3.name, 'Kinder bueno');
  assert.strictEqual(t3.canonicalId, undefined, 'Ne doit PAS polluer le lexique canonique');
  assert.strictEqual(t3.quantity, '2');
  assert.strictEqual(t3.unit, 'paquet');
  assert.strictEqual(t3.aisle, 'Épicerie & Condiments');
  console.log('✓ "2 paquets de kinder bueno" -> 2 paquet Kinder bueno (Hors lexique, Épicerie)');

  const t4 = parseShoppingInput('3 bouteilles de coca cola');
  assert.strictEqual(t4.name, 'Coca cola');
  assert.strictEqual(t4.canonicalId, undefined);
  assert.strictEqual(t4.quantity, '3');
  assert.strictEqual(t4.unit, 'bouteille');
  assert.strictEqual(t4.aisle, 'Boissons');
  console.log('✓ "3 bouteilles de coca cola" -> 3 bouteille Coca cola (Boissons)');

  // 3. Quantité pure dénombrable (sans unité)
  const t5 = parseShoppingInput('6 oeufs');
  assert.strictEqual(t5.name, 'Œufs');
  assert.strictEqual(t5.canonicalId, 'ing_canon_ufs');
  assert.strictEqual(t5.quantity, '6');
  assert.strictEqual(t5.unit, undefined);
  assert.strictEqual(t5.aisle, 'Produits Frais & Crèmerie');
  console.log('✓ "6 oeufs" -> 6 Œufs (sans unité)');

  const t6 = parseShoppingInput('2 carottes');
  assert.strictEqual(t6.name, 'Carotte');
  assert.strictEqual(t6.canonicalId, 'ing_canon_carotte');
  assert.strictEqual(t6.quantity, '2');
  assert.strictEqual(t6.unit, undefined);
  console.log('✓ "2 carottes" -> 2 Carotte (sans unité)');

  // 4. Fractions Unicode
  const t7 = parseShoppingInput('½ melon');
  assert.strictEqual(t7.name, 'Melon');
  assert.strictEqual(t7.quantity, '1/2');
  assert.strictEqual(t7.unit, undefined);
  console.log('✓ "½ melon" -> 1/2 Melon');

  // 5. Article simple sans quantité
  const t8 = parseShoppingInput('coca cola zero');
  assert.strictEqual(t8.name, 'Coca cola zero');
  assert.strictEqual(t8.canonicalId, undefined);
  assert.strictEqual(t8.quantity, undefined);
  assert.strictEqual(t8.unit, undefined);
  assert.strictEqual(t8.aisle, 'Boissons');
  console.log('✓ "coca cola zero" -> Coca cola zero (Boissons, sans quantité)');

  const t9 = parseShoppingInput('kinder bueno');
  assert.strictEqual(t9.name, 'Kinder bueno');
  assert.strictEqual(t9.canonicalId, undefined);
  assert.strictEqual(t9.aisle, 'Épicerie & Condiments');
  console.log('✓ "kinder bueno" -> Kinder bueno (Épicerie & Condiments)');

  const t10 = parseShoppingInput('lessive liquide');
  assert.strictEqual(t10.name, 'Lessive liquide');
  assert.strictEqual(t10.canonicalId, undefined);
  assert.strictEqual(t10.aisle, 'Autre');
  console.log('✓ "lessive liquide" -> Lessive liquide (Autre)');

  // 6. Quantité + Unité à la fin
  const t11 = parseShoppingInput('lait 1L');
  assert.strictEqual(t11.name, 'Lait');
  assert.strictEqual(t11.canonicalId, 'ing_canon_lait');
  assert.strictEqual(t11.quantity, '1');
  assert.strictEqual(t11.unit, 'l');
  console.log('✓ "lait 1L" -> 1 l Lait');

  const t12 = parseShoppingInput('sauce tomate 500g');
  assert.strictEqual(t12.name, 'Coulis de tomate');
  assert.strictEqual(t12.quantity, '500');
  assert.strictEqual(t12.unit, 'g');
  console.log('✓ "sauce tomate 500g" -> 500 g Coulis de tomate');

  // 7. Rayon forcé par l'utilisateur
  const t13 = parseShoppingInput('kinder bueno', 'Surgelés');
  assert.strictEqual(t13.aisle, 'Surgelés', 'Doit respecter le rayon choisi manuellement');
  console.log('✓ Rayon forcé respecté');

  // Nettoyage
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n🎉 TOUS LES TESTS DU PARSEUR DE COURSES ONT RÉUSSI (0 ERREUR) !');
}

main().catch((err) => {
  console.error('\n❌ ERREUR DANS LES TESTS DU PARSEUR :', err);
  process.exit(1);
});
