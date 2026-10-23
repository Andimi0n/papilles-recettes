/**
 * Script de validation et d'audit d'intégrité du Lexique Canonique (canonicalVocabulary.ts)
 * 
 * Exécution : node scripts/validateCanonicalVocabulary.js
 */

const fs = require('fs');
const path = require('path');

const vocabPath = path.resolve(__dirname, '../src/data/canonicalVocabulary.ts');
const content = fs.readFileSync(vocabPath, 'utf8');

function normalizeString(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const VALID_ALLERGEN_FAMILIES = new Set([
  'gluten',
  'crustaces',
  'oeufs',
  'poissons',
  'soja',
  'lait',
  'arachides',
  'fruits_a_coque',
  'celeri',
  'moutarde',
  'sesame',
  'sulfites',
  'lupin',
  'mollusques',
]);

const FORBIDDEN_ISOLATED_ALIASES = new Set([
  'blanc', 'blanche', 'rouge', 'jaune', 'vert', 'verte', 'noir', 'noire',
  'emince', 'epluche', 'hache', 'rape', 'concasse', 'frais', 'fraiche',
  'sec', 'seche', 'cuit', 'cuite', 'moulu', 'surgele', 'sauce', 'huile',
  'poudre', 'puree', 'creme', 'pate', 'petit', 'gros', 'grand', 'morceau',
]);

// Extraction et évaluation directe du tableau RAW_SEED_INGREDIENTS
const matchSeed = content.match(/const RAW_SEED_INGREDIENTS[^=]*=\s*(\[[\s\S]*?\n\];)/);
if (!matchSeed) {
  console.error("❌ ERREUR : Impossible d'extraire RAW_SEED_INGREDIENTS de canonicalVocabulary.ts");
  process.exit(1);
}

let items = [];
try {
  items = eval(matchSeed[1]);
} catch (e) {
  console.error("❌ ERREUR lors de l'évaluation de RAW_SEED_INGREDIENTS :", e.message);
  process.exit(1);
}

console.log(`\n🔍 AUDIT DU LEXIQUE CANONIQUE (${items.length} ingrédients analysés)\n`);

let errorCount = 0;
let warningCount = 0;

// 1. Unicité des noms canoniques
const seenNames = new Map();
items.forEach((item, idx) => {
  const norm = normalizeString(item.name);
  if (seenNames.has(norm)) {
    console.error(`❌ ERREUR : Nom principal en doublon "${item.name}" (déjà présent pour "${seenNames.get(norm)}")`);
    errorCount++;
  } else {
    seenNames.set(norm, item.name);
  }
});

// 2. Collisions d'alias entre ingrédients distincts
const aliasOwners = new Map();
items.forEach((item) => {
  (item.aliases || []).forEach((alias) => {
    const normAlias = normalizeString(alias);
    if (aliasOwners.has(normAlias)) {
      const other = aliasOwners.get(normAlias);
      console.error(`❌ ERREUR : Collision d'alias "${alias}" présent à la fois sur "${other}" et "${item.name}"`);
      errorCount++;
    } else {
      aliasOwners.set(normAlias, item.name);
    }
  });
});

// 3. Alias génériques isolés interdits
items.forEach((item) => {
  (item.aliases || []).forEach((alias) => {
    const normAlias = normalizeString(alias);
    if (FORBIDDEN_ISOLATED_ALIASES.has(normAlias)) {
      console.error(`❌ ERREUR : Alias générique isolé interdit "${alias}" sur l'ingrédient "${item.name}"`);
      errorCount++;
    }
  });
});

// 4. Validation des familles d'allergènes
items.forEach((item) => {
  if (item.allergen) {
    if (!VALID_ALLERGEN_FAMILIES.has(item.allergen)) {
      console.error(`❌ ERREUR : Famille d'allergène inconnue "${item.allergen}" sur l'ingrédient "${item.name}"`);
      errorCount++;
    }
  }
});

// 5. Vérification des faux amis courants
const FAKE_FRIENDS = [
  { item: 'Muscade', forbiddenAllergen: 'fruits_a_coque' },
  { item: 'Lait de coco', forbiddenAllergen: 'lait' },
  { item: 'Pomme de terre', forbiddenAllergen: 'any' },
];

FAKE_FRIENDS.forEach((rule) => {
  const found = items.find((i) => normalizeString(i.name) === normalizeString(rule.item));
  if (found) {
    if (rule.forbiddenAllergen === 'any' && found.allergen) {
      console.error(`❌ ERREUR : Faux ami "${found.name}" tagué à tort avec l'allergène "${found.allergen}"`);
      errorCount++;
    } else if (found.allergen === rule.forbiddenAllergen) {
      console.error(`❌ ERREUR : Faux ami "${found.name}" tagué à tort avec l'allergène "${found.allergen}"`);
      errorCount++;
    }
  }
});

console.log('\n--- BILAN DE L\'AUDIT ---');
if (errorCount === 0) {
  console.log('✅ AUCUNE ERREUR : Le lexique respecte 100% des contraintes d\'intégrité !');
} else {
  console.log(`❌ ${errorCount} erreur(s) détectée(s) nécessitant une correction.`);
}
console.log('-------------------------\n');
