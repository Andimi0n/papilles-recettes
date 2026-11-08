const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const tmpDir = path.join(__dirname, '../.tmp_test_recipe_sorting');
if (fs.existsSync(tmpDir)) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
fs.mkdirSync(tmpDir, { recursive: true });

console.log('🔄 Compilation temporaire des modules TypeScript pour test...');

try {
  const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
  execSync(
    `"${tscBin}" src/types/recipe.ts src/utils/searchEngine.ts src/utils/helpers.ts src/utils/ingredientNormalizer.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/services/vocabularyService.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --target ES2022 --module CommonJS --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0`,
    { stdio: 'pipe' }
  );
} catch (e) {
  console.error('Erreur compilation tsc:', e.stdout ? e.stdout.toString() : e);
  process.exit(1);
}

const searchEnginePath = fs.existsSync(path.join(tmpDir, 'searchEngine.js'))
  ? path.join(tmpDir, 'searchEngine.js')
  : path.join(tmpDir, 'utils/searchEngine.js');

const { compareRecipes } = require(searchEnginePath);

console.log('🧪 Lancement des tests de tri des recettes (règles métier et tie-breakers)...\n');

// -------------------------------------------------------------
// Données de test
// -------------------------------------------------------------
const rAllStockHighRating = {
  id: 'r_all_5',
  title: 'Tarte aux poires',
  rating: 4.9,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30, // total 45
  createdAt: '2026-03-01T12:00:00Z',
  ingredients: [{ id: 'i1', name: 'Poires' }],
};

const rAllStockLowRating = {
  id: 'r_all_4',
  title: 'Compote de poires',
  rating: 4.2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 35, // total 45
  createdAt: '2026-03-01T12:00:00Z',
  ingredients: [{ id: 'i2', name: 'Poires' }],
};

const rAllStockHighRatingAlphaZ = {
  id: 'r_all_5_z',
  title: 'Zeste de citron givré',
  rating: 4.9,
  prepTimeMinutes: 20,
  cookTimeMinutes: 25, // total 45
  createdAt: '2026-03-01T12:00:00Z',
  ingredients: [{ id: 'i3', name: 'Citron' }],
};

const rAllStockHighRatingAlphaA = {
  id: 'r_all_5_a',
  title: 'Amandine aux poires',
  rating: 4.9,
  prepTimeMinutes: 15,
  cookTimeMinutes: 30, // total 45
  createdAt: '2026-03-01T12:00:00Z',
  ingredients: [{ id: 'i4', name: 'Poires' }],
};

const rMissing1HighRating = {
  id: 'r_m1_5',
  title: 'Boeuf bourguignon',
  rating: 4.8,
  prepTimeMinutes: 20,
  cookTimeMinutes: 120, // total 140
  createdAt: '2026-02-15T10:00:00Z',
  ingredients: [{ id: 'i5', name: 'Boeuf' }],
};

const rMissing1LowRating = {
  id: 'r_m1_3',
  title: 'Carbonara express',
  rating: 3.5,
  prepTimeMinutes: 10,
  cookTimeMinutes: 10, // total 20
  createdAt: '2026-02-15T10:00:00Z',
  ingredients: [{ id: 'i6', name: 'Pâtes' }],
};

const rMissing2 = {
  id: 'r_m2',
  title: 'Ratatouille niçoise',
  rating: 4.7,
  prepTimeMinutes: 20,
  cookTimeMinutes: 40, // total 60
  createdAt: '2026-01-10T08:00:00Z',
  ingredients: [{ id: 'i7', name: 'Aubergine' }],
};

// Simulation d'évaluation de stock
const mockDoableMap = new Map();
mockDoableMap.set('r_all_5', { isDoable: true, missingIngredients: [] }); // 0 manquant
mockDoableMap.set('r_all_4', { isDoable: true, missingIngredients: [] }); // 0 manquant
mockDoableMap.set('r_all_5_z', { isDoable: true, missingIngredients: [] }); // 0 manquant
mockDoableMap.set('r_all_5_a', { isDoable: true, missingIngredients: [] }); // 0 manquant
mockDoableMap.set('r_m1_5', { isDoable: false, missingIngredients: [{ id: 'm1', name: 'Boeuf' }] }); // 1 manquant
mockDoableMap.set('r_m1_3', { isDoable: false, missingIngredients: [{ id: 'm2', name: 'Lardons' }] }); // 1 manquant
mockDoableMap.set('r_m2', { isDoable: false, missingIngredients: [{ id: 'm3', name: 'Courgette' }, { id: 'm4', name: 'Poivron' }] }); // 2 manquants

// =============================================================
// TEST 1 : Tri par Ingrédients en stock ('stock')
// D'abord 0 manquant, puis 1 manquant, puis 2 manquants...
// En cas d'égalité : d'abord note, puis alphabétique.
// =============================================================
console.log('--- Test 1 : Tri par ingrédients en stock (stock) ---');

const listStock = [
  rMissing2,
  rMissing1LowRating,
  rMissing1HighRating,
  rAllStockLowRating,
  rAllStockHighRatingAlphaZ,
  rAllStockHighRatingAlphaA,
];

listStock.sort((a, b) => compareRecipes(a, b, 'stock', mockDoableMap));

// Ordre attendu :
// 0 manquant :
//   - rAllStockHighRatingAlphaA (note 4.9, titre 'Amandine...')
//   - rAllStockHighRatingAlphaZ (note 4.9, titre 'Zeste...')
//   - rAllStockLowRating (note 4.2, titre 'Compote...')
// 1 manquant :
//   - rMissing1HighRating (note 4.8)
//   - rMissing1LowRating (note 3.5)
// 2 manquants :
//   - rMissing2
assert.strictEqual(listStock[0].id, 'r_all_5_a', '0 manquant, note 4.9, "Amandine" avant "Zeste"');
assert.strictEqual(listStock[1].id, 'r_all_5_z', '0 manquant, note 4.9, "Zeste"');
assert.strictEqual(listStock[2].id, 'r_all_4', '0 manquant, note 4.2 après 4.9');
assert.strictEqual(listStock[3].id, 'r_m1_5', '1 manquant, note 4.8 avant note 3.5');
assert.strictEqual(listStock[4].id, 'r_m1_3', '1 manquant, note 3.5 après note 4.8');
assert.strictEqual(listStock[5].id, 'r_m2', '2 manquants en fin de liste');

console.log('✓ Tri par ingrédients en stock validé (0 manquant -> 1 manquant -> 2 manquants avec tie-breakers note puis titre)');

// =============================================================
// TEST 2 : Tri par Temps de préparation ('prep_time')
// Temps croissant. En cas d'égalité : note puis alphabétique.
// =============================================================
console.log('\n--- Test 2 : Tri par temps de préparation (prep_time) ---');

// rMissing1LowRating : total 20 min
// rAllStockHighRatingAlphaA : total 45 min, note 4.9
// rAllStockHighRatingAlphaZ : total 45 min, note 4.9
// rAllStockLowRating : total 45 min, note 4.2
// rMissing2 : total 60 min
const listTime = [
  rMissing2,
  rAllStockLowRating,
  rAllStockHighRatingAlphaZ,
  rAllStockHighRatingAlphaA,
  rMissing1LowRating,
];

listTime.sort((a, b) => compareRecipes(a, b, 'prep_time'));

assert.strictEqual(listTime[0].id, 'r_m1_3', 'Le plus rapide (20 min) doit être #1');
assert.strictEqual(listTime[1].id, 'r_all_5_a', 'À 45 min : note 4.9 et "Amandine" en premier');
assert.strictEqual(listTime[2].id, 'r_all_5_z', 'À 45 min : note 4.9 et "Zeste" en second');
assert.strictEqual(listTime[3].id, 'r_all_4', 'À 45 min : note 4.2 après 4.9');
assert.strictEqual(listTime[4].id, 'r_m2', 'À 60 min en dernier');

console.log('✓ Tri par temps de préparation validé (temps -> note -> titre)');

// =============================================================
// TEST 3 : Tri par Date d'ajout ('recent')
// Date décroissante. En cas d'égalité : note puis alphabétique.
// =============================================================
console.log('\n--- Test 3 : Tri par date d\'ajout (recent) ---');

// Même date 2026-03-01T12:00:00Z :
// rAllStockHighRatingAlphaA (4.9)
// rAllStockHighRatingAlphaZ (4.9)
// rAllStockLowRating (4.2)
// Date 2026-02-15T10:00:00Z :
// rMissing1HighRating (4.8)
// rMissing1LowRating (3.5)
const listRecent = [
  rMissing1LowRating,
  rAllStockLowRating,
  rMissing1HighRating,
  rAllStockHighRatingAlphaZ,
  rAllStockHighRatingAlphaA,
];

listRecent.sort((a, b) => compareRecipes(a, b, 'recent'));

assert.strictEqual(listRecent[0].id, 'r_all_5_a', 'Date mars 2026, note 4.9, Amandine');
assert.strictEqual(listRecent[1].id, 'r_all_5_z', 'Date mars 2026, note 4.9, Zeste');
assert.strictEqual(listRecent[2].id, 'r_all_4', 'Date mars 2026, note 4.2');
assert.strictEqual(listRecent[3].id, 'r_m1_5', 'Date février 2026, note 4.8');
assert.strictEqual(listRecent[4].id, 'r_m1_3', 'Date février 2026, note 3.5');

console.log('✓ Tri par date d\'ajout validé (date -> note -> titre)');

// =============================================================
// TEST 4 : Tri par Note ('rating_desc')
// Note décroissante. En cas d'égalité : alphabétique.
// =============================================================
console.log('\n--- Test 4 : Tri par note (rating_desc) ---');

const listRating = [
  rAllStockLowRating,        // 4.2, Compote
  rAllStockHighRatingAlphaZ, // 4.9, Zeste
  rMissing1HighRating,       // 4.8, Boeuf
  rAllStockHighRatingAlphaA, // 4.9, Amandine
];

listRating.sort((a, b) => compareRecipes(a, b, 'rating_desc'));

assert.strictEqual(listRating[0].id, 'r_all_5_a', 'Note 4.9, "Amandine" avant "Zeste"');
assert.strictEqual(listRating[1].id, 'r_all_5_z', 'Note 4.9, "Zeste" après "Amandine"');
assert.strictEqual(listRating[2].id, 'r_m1_5', 'Note 4.8 après 4.9');
assert.strictEqual(listRating[3].id, 'r_all_4', 'Note 4.2 en dernier');

console.log('✓ Tri par note validé (note -> alphabétique)');

// Nettoyage
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('\n🎉 TOUS LES TESTS DE TRI ONT RÉUSSI (0 ERREUR) !');
