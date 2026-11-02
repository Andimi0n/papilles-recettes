#!/usr/bin/env node

/**
 * Papilles - Test unitaire du moteur de sélection tactile d'ingrédients de StockCookModal
 * TDD Phase 3 :
 * 1. Cycle à 3 états : Optionnel ➔ ⭐ Indispensable ➔ Inactif ➔ Optionnel
 * 2. Épinglage prioritaire des ingrédients ⭐ Indispensables en tête de liste
 * 3. Pré-sélection intégrale du stock en Optionnel à l'ouverture (zéro effet page blanche, CTA actif)
 * 4. Filtrage précis des ingrédients actifs pour la génération Chef IA
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Lancement des tests du moteur de sélection tactile (StockCookModal)...');

// 1. Définition et test de la logique pure
function cycleIngredientState(currentState) {
  switch (currentState) {
    case 'optional':
      return 'primary';
    case 'primary':
      return 'inactive';
    case 'inactive':
    default:
      return 'optional';
  }
}

function initializeStockIngredients(stockItems) {
  if (!stockItems || stockItems.length === 0) {
    return {
      primaryIngredients: [],
      optionalIngredients: [],
      inactiveIngredients: [],
    };
  }
  const seen = new Set();
  const names = [];
  for (const item of stockItems) {
    const trimmed = item.name ? item.name.trim() : '';
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      names.push(trimmed);
    }
  }
  return {
    primaryIngredients: [],
    optionalIngredients: names,
    inactiveIngredients: [],
  };
}

function organizeIngredientsForDisplay(itemsWithState) {
  // itemsWithState: Array<{ name: string; state: 'primary' | 'optional' | 'inactive' }>
  const primaries = itemsWithState.filter((i) => i.state === 'primary');
  const optionals = itemsWithState.filter((i) => i.state === 'optional');
  const inactives = itemsWithState.filter((i) => i.state === 'inactive');

  return [...primaries, ...optionals, ...inactives];
}

function getActiveIngredientsForAi(itemsWithState) {
  return {
    primary: itemsWithState.filter((i) => i.state === 'primary').map((i) => i.name),
    optional: itemsWithState.filter((i) => i.state === 'optional').map((i) => i.name),
  };
}

// Tests unitaires du cycle
assert.strictEqual(cycleIngredientState('optional'), 'primary', 'Optionnel ➔ Indispensable');
assert.strictEqual(cycleIngredientState('primary'), 'inactive', 'Indispensable ➔ Inactif');
assert.strictEqual(cycleIngredientState('inactive'), 'optional', 'Inactif ➔ Optionnel');

// Tests d'initialisation à l'ouverture
const mockStock = [{ name: 'Carotte' }, { name: 'Oeuf' }, { name: 'Courgette' }, { name: 'carotte' }];
const initialSelection = initializeStockIngredients(mockStock);
assert.deepStrictEqual(
  initialSelection.optionalIngredients,
  ['Carotte', 'Oeuf', 'Courgette'],
  'Tout le stock doit être en Optionnel par défaut et dédupliqué sans distinction de casse'
);
assert.strictEqual(initialSelection.primaryIngredients.length, 0);
assert.strictEqual(initialSelection.inactiveIngredients.length, 0);

// Test d'épinglage : les indispensables doivent être en tête
const sampleItems = [
  { name: 'Courgette', state: 'optional' },
  { name: 'Oeuf', state: 'primary' },
  { name: 'Carotte', state: 'inactive' },
  { name: 'Parmesan', state: 'primary' },
];
const organized = organizeIngredientsForDisplay(sampleItems);
assert.strictEqual(organized[0].name, 'Oeuf', 'Le 1er item doit être un primary');
assert.strictEqual(organized[1].name, 'Parmesan', 'Le 2nd item doit être un primary');
assert.strictEqual(organized[2].name, 'Courgette', 'Le 3e item doit être optionnel');
assert.strictEqual(organized[3].name, 'Carotte', 'Le 4e item doit être inactif');

// Test de filtrage pour le Chef IA : les inactifs doivent être totalement exclus
const activeForAi = getActiveIngredientsForAi(sampleItems);
assert.deepStrictEqual(activeForAi.primary, ['Oeuf', 'Parmesan']);
assert.deepStrictEqual(activeForAi.optional, ['Courgette']);
assert.strictEqual(
  activeForAi.primary.includes('Carotte') || activeForAi.optional.includes('Carotte'),
  false,
  'Carotte (inactive) ne doit pas être envoyée à l’IA'
);

console.log('✅ Logique algorithmique du cycle à 3 états et d’épinglage validée.');

// 2. Vérification statique dans StockCookModal.tsx
const modalPath = path.join(__dirname, '../src/components/StockCookModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// Le code source actuel a `setOptionalIngredients([])` à l'ouverture,
// ce qui vide tout le stock et produit l'effet page blanche.
const hasOldEmptyStockReset =
  modalContent.includes('setPrimaryIngredients([]);\n        setOptionalIngredients([]);') ||
  modalContent.includes('setPrimaryIngredients([])\n        setOptionalIngredients([])');

const hasDirectCycleSupport =
  modalContent.includes('cycleIngredientState') ||
  modalContent.includes('inactiveIngredients') ||
  modalContent.includes('handleCycleIngredient');

if (hasOldEmptyStockReset || !hasDirectCycleSupport) {
  console.error('❌ Échec TDD attendu : StockCookModal.tsx réinitialise encore les ingrédients à vide ou ne supporte pas le cycle à 3 états');
  process.exit(1);
}

console.log('🎉 Tous les tests du moteur de sélection tactile ont réussi !');
