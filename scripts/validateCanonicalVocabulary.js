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

// Parsing brut des éléments du lexique
const items = [];
const itemRegex = /{\s*name:\s*[\x27"]([^\x27"]+)[\x27"],\s*aisle:\s*[\x27"]([^\x27"]+)[\x27"](?:,\s*aliases:\s*(\[[^\]]*\]))?(?:,\s*allergen:\s*[\x27"]([^\x27"]+)[\x27"])?(?:,\s*isPantryStaple:\s*(true|false))?/g;

let match;
while ((match = itemRegex.exec(content)) !== null) {
  let aliases = [];
  if (match[3]) {
    try {
      aliases = eval(match[3]);
    } catch (e) {
      aliases = [];
    }
  }

  items.push({
    name: match[1],
    aisle: match[2],
    aliases,
    allergen: match[4] || null,
    isPantryStaple: match[5] === 'true',
  });
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
