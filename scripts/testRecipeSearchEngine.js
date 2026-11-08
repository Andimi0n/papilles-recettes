const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const tmpDir = path.join(__dirname, '../.tmp_test_recipe_search');
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

const {
  searchRecipes,
  getTokenMatchQuality,
  isKnownCulinaryOrLexiconWord,
  resolveCanonicalIdsForToken,
} = require(searchEnginePath);

console.log('🧪 Lancement des tests du moteur de recherche de recettes...\n');

// -------------------------------------------------------------
// Données de test
// -------------------------------------------------------------
const recipePear = {
  id: 'r_pear',
  title: 'Tarte aux poires amandine',
  description: 'Délicieuse tarte sucrée aux poires fraîches',
  category: 'Dessert',
  difficulty: 'Moyen',
  prepTimeMinutes: 20,
  cookTimeMinutes: 30,
  servings: 6,
  rating: 4.8,
  ingredients: [
    { id: 'i1', name: 'Poires comice' },
    { id: 'i2', name: 'Pâte brisée' },
    { id: 'i3', name: 'Poudre d’amande' },
  ],
  steps: [{ id: 's1', instruction: 'Cuire la tarte', order: 1 }],
  tags: ['Dessert', 'Automne'],
};

const recipePepper = {
  id: 'r_pepper',
  title: 'Filet de boeuf au poivre noir',
  description: 'Steak savoureux avec sauce au poivre de Madagascar',
  category: 'Plat',
  difficulty: 'Facile',
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  rating: 4.5,
  ingredients: [
    { id: 'i4', name: 'Filet de boeuf' },
    { id: 'i5', name: 'Poivre noir moulu' },
    { id: 'i6', name: 'Crème fraîche' },
  ],
  steps: [{ id: 's2', instruction: 'Poivrer et cuire', order: 1 }],
  tags: ['Viande', 'Rapide'],
};

const recipeLeek = {
  id: 'r_leek',
  title: 'Poireaux vinaigrette',
  description: 'Entrée classique de bistrot',
  category: 'Entrée',
  difficulty: 'Facile',
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  servings: 4,
  rating: 4.0,
  ingredients: [
    { id: 'i7', name: 'Poireaux' },
    { id: 'i8', name: 'Vinaigrette maison' },
  ],
  steps: [{ id: 's3', instruction: 'Cuire les poireaux', order: 1 }],
  tags: ['Entrée'],
};

const recipeUnknownIng = {
  id: 'r_unknown',
  title: 'Salade exotique au fruit du dragon',
  description: 'Salade rafraîchissante',
  category: 'Entrée',
  difficulty: 'Facile',
  prepTimeMinutes: 10,
  cookTimeMinutes: 0,
  servings: 2,
  rating: 4.2,
  ingredients: [
    { id: 'i9', name: 'Pitaya fruit du dragon' }, // sans canonicalId
  ],
  steps: [{ id: 's4', instruction: 'Mélanger', order: 1 }],
  tags: ['Exotique'],
};

// =============================================================
// TEST 1 : Typo Guard et résolution des canonical IDs
// =============================================================
console.log('--- Test 1 : Typo Guard et Canonical IDs ---');

assert.strictEqual(
  isKnownCulinaryOrLexiconWord('poire'),
  true,
  '"poire" doit être reconnue comme un mot du lexique (Typo Guard actif)'
);
assert.strictEqual(
  isKnownCulinaryOrLexiconWord('poivre'),
  true,
  '"poivre" doit être reconnue comme un mot du lexique (Typo Guard actif)'
);
assert.strictEqual(
  isKnownCulinaryOrLexiconWord('courgete'),
  false,
  '"courgete" doit être considérée comme inconnue (faute de frappe éligible Levenshtein)'
);

const pearCanonicalIds = resolveCanonicalIdsForToken('poire');
assert(pearCanonicalIds.size > 0, 'resolveCanonicalIdsForToken doit trouver un canonicalId pour "poire"');
const pearId = Array.from(pearCanonicalIds)[0];
assert(pearId.includes('poire'), 'le canonicalId doit correspondre à la poire');

const pepperCanonicalIds = resolveCanonicalIdsForToken('poivre');
assert(pepperCanonicalIds.size > 0, 'resolveCanonicalIdsForToken doit trouver un canonicalId pour "poivre"');
const pepperId = Array.from(pepperCanonicalIds)[0];
assert(pepperId.includes('poivre'), 'le canonicalId doit correspondre au poivre');

assert(!pearCanonicalIds.has(pepperId), 'poire ne doit PAS contenir le canonicalId de poivre');
assert(!pepperCanonicalIds.has(pearId), 'poivre ne doit PAS contenir le canonicalId de poire');

console.log('✓ Typo Guard et Canonical IDs validés');

// =============================================================
// TEST 2 : Qualité de correspondance (Tiers de pondération)
// =============================================================
console.log('\n--- Test 2 : Qualité de correspondance (getTokenMatchQuality) ---');

// 2.1 Exact match = 1.0
assert.strictEqual(getTokenMatchQuality('poire', 'poire'), 1.0, 'Match exact = 1.0');

// 2.2 Préfixe = 0.7
assert.strictEqual(getTokenMatchQuality('choc', 'chocolat'), 0.7, 'Préfixe strict = 0.7');
assert.strictEqual(getTokenMatchQuality('poire', 'poireau'), 0.7, 'Préfixe strict poire -> poireau = 0.7');

// 2.3 Sous-chaîne / composé = 0.4
assert.strictEqual(getTokenMatchQuality('coco', 'noixdecoco'), 0.4, 'Sous-chaîne/composé = 0.4');

// 2.4 Bloqué par Typo Guard quand mot connu : "poire" vs "poivre" -> 0
assert.strictEqual(
  getTokenMatchQuality('poire', 'poivre', [], true),
  0,
  'Typo Guard doit bloquer la distance Levenshtein entre deux mots réels distincts'
);

// 2.5 Autorisé quand mot inconnu (faute de frappe) : "courgete" vs "courgette" -> 0.15
assert.strictEqual(
  getTokenMatchQuality('courgete', 'courgette', [], false),
  0.15,
  'Levenshtein autorisé pour les fautes de frappe sur mots inconnus = 0.15'
);

console.log('✓ Tiers de pondération validés');

// =============================================================
// TEST 3 : Le bug "poire" résolu !
// =============================================================
console.log('\n--- Test 3 : Résolution du bug "poire" (exclusion stricte du poivre) ---');

const resultsPear = searchRecipes([recipePear, recipePepper, recipeLeek], 'poire');

// La recette de poire doit être trouvée en tête
assert(resultsPear.length >= 1, 'Au moins une recette trouvée');
assert.strictEqual(resultsPear[0].recipe.id, 'r_pear', 'La tarte aux poires doit être #1');

// Vérification cruciale : la recette au poivre NE DOIT PAS être trouvée !
const pepperFound = resultsPear.some((r) => r.recipe.id === 'r_pepper');
assert.strictEqual(
  pepperFound,
  false,
  'CRITIQUE : La recette au poivre noir ne doit PAS matcher la recherche "poire" !'
);

// Et inversement quand on cherche "poivre"
const resultsPepper = searchRecipes([recipePear, recipePepper, recipeLeek], 'poivre');
assert(resultsPepper.length >= 1, 'La recette au poivre doit être trouvée');
assert.strictEqual(resultsPepper[0].recipe.id, 'r_pepper', 'Le filet au poivre doit être #1');
const pearFoundInPepper = resultsPepper.some((r) => r.recipe.id === 'r_pear');
assert.strictEqual(
  pearFoundInPepper,
  false,
  'La tarte aux poires ne doit PAS matcher la recherche "poivre"'
);

console.log('✓ Bug "poire" vs "poivre" parfaitement résolu (0 faux positif)');

// =============================================================
// TEST 4 : Scoring Titre (30 pts avec pondération) & Ingrédients (15 pts)
// =============================================================
console.log('\n--- Test 4 : Barème de score (Titre 30 pts, Ingrédient 15 pts, Bonus 50 pts) ---');

// Recette avec "poire" dans le titre (exact = 30) + ingrédient (canonical = 15) + bonus tous mots trouvés (50)
// Score attendu : 30 + 15 + 50 = 95 (+ 5 pts si description contient aussi "poire")
assert(resultsPear[0].score >= 95, `Score attendu >= 95, obtenu: ${resultsPear[0].score}`);
assert.deepStrictEqual(resultsPear[0].matchedIngredients, ['Poires comice']);

// Recette poireaux pour "poire" :
// Titre "poireaux" -> préfixe "poireau".includes("poire") ou startsWith("poire") -> 0.7 * 30 = 21 pts
// Ingrédient "poireau" n'est pas le canonicalId "poire" -> 0 pt ingrédient
// Bonus 1 mot trouvé = 50 pts
// Score attendu : 21 + 50 = 71 pts (nettement inférieur aux 95+ pts de la tarte aux poires)
const leekResult = resultsPear.find((r) => r.recipe.id === 'r_leek');
if (leekResult) {
  assert(leekResult.score < resultsPear[0].score, 'La tarte aux poires doit dépasser les poireaux');
}

console.log('✓ Barème de score validé');

// =============================================================
// TEST 5 : Ingrédient hors-lexique (pondération)
// =============================================================
console.log('\n--- Test 5 : Ingrédient hors-lexique avec pondération ---');

// Recherche du mot exact sur ingrédient hors-lexique : "dragon"
const resultsDragon = searchRecipes([recipeUnknownIng, recipePear], 'dragon');
assert.strictEqual(resultsDragon.length, 1);
assert.strictEqual(resultsDragon[0].recipe.id, 'r_unknown');

console.log('✓ Ingrédients hors-lexique avec pondération validés');

// Nettoyage
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log('\n🎉 TOUS LES TESTS DU MOTEUR DE RECHERCHE DE RECETTES ONT RÉUSSI (0 ERREUR) !');
