import { Ingredient } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { classifyIngredientAisle, ALL_AISLES } from './aisleClassifier';
import { normalizeString, scaleQuantity, generateUniqueId, convertUnicodeFractions } from './helpers';
import { normalizeIngredient } from './ingredientNormalizer';
import { VocabularyService } from '../services/vocabularyService';

/**
 * Tente de convertir une quantité textuelle en valeur numérique (ex: "250", "1.5", "1/2", "½", "2 à 3")
 */
function parseNumericQuantity(qtyStr?: string): number | null {
  if (!qtyStr || !qtyStr.trim()) return null;
  const trimmed = convertUnicodeFractions(qtyStr.trim()).replace(',', '.');

  // Fourchette simple "2-3" ou "2 à 3" -> moyenne arithmétique
  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|à|a)\s*(\d+(?:\.\d+)?)$/i);
  if (range) {
    const min = parseFloat(range[1]);
    const max = parseFloat(range[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return (min + max) / 2;
    }
  }

  // Nombre composé avec fraction "1 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const n = parseFloat(mixed[2]);
    const d = parseFloat(mixed[3]);
    return d !== 0 ? whole + n / d : null;
  }

  // Fraction simple "1/2"
  const frac = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const n = parseFloat(frac[1]);
    const d = parseFloat(frac[2]);
    return d !== 0 ? n / d : null;
  }

  const num = parseFloat(trimmed);
  return !isNaN(num) ? num : null;
}

function formatSummedQuantity(num: number): string {
  if (num <= 0) return '0';
  if (Number.isInteger(num)) return num.toString();
  if (num >= 15) return Math.round(num).toString();

  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - 0.5) < 0.01) return '1/2';
  if (Math.abs(rounded - 0.25) < 0.01) return '1/4';
  if (Math.abs(rounded - 0.75) < 0.01) return '3/4';

  return rounded.toString().replace('.', ',');
}

/**
 * Normalise et standardise les unités métriques pour addition mathématique
 */
function normalizeUnitKey(unit?: string): string {
  if (!unit) return '';
  const u = normalizeString(unit);
  if (['g', 'gr', 'gramme', 'grammes'].includes(u)) return 'g';
  if (['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes'].includes(u)) return 'kg';
  if (['ml', 'millilitre', 'millilitres'].includes(u)) return 'ml';
  if (['cl', 'centilitre', 'centilitres'].includes(u)) return 'cl';
  if (['l', 'litre', 'litres'].includes(u)) return 'l';
  if (['c a soupe', 'cuillere a soupe', 'cuilleres a soupe', 'cas', 'c.a.s'].includes(u)) return 'c. à soupe';
  if (['c a cafe', 'cuillere a cafe', 'cuilleres a cafe', 'cac', 'c.a.c'].includes(u)) return 'c. à café';
  if (['pincee', 'pincees'].includes(u)) return 'pincée';
  if (['gousse', 'gousses'].includes(u)) return 'gousse';
  if (['tranche', 'tranches'].includes(u)) return 'tranche';
  if (['boite', 'boites'].includes(u)) return 'boîte';
  if (['bocal', 'bocaux'].includes(u)) return 'bocal';
  if (['pot', 'pots'].includes(u)) return 'pot';
  if (['morceau', 'morceaux'].includes(u)) return 'morceau';
  if (['filet', 'filets'].includes(u)) return 'filet';
  if (['sachet', 'sachets'].includes(u)) return 'sachet';
  if (['poignee', 'poignees'].includes(u)) return 'poignée';
  if (['branche', 'branches'].includes(u)) return 'branche';
  if (['botte', 'bottes'].includes(u)) return 'botte';
  if (['pointe', 'pointes'].includes(u)) return 'pointe';
  if (['trait', 'traits'].includes(u)) return 'trait';
  if (['zeste', 'zestes'].includes(u)) return 'zeste';
  if (['noisette', 'noisettes'].includes(u)) return 'noisette';
  if (['goutte', 'gouttes'].includes(u)) return 'goutte';
  return u;
}

/**
 * Tente d'additionner deux quantités numériques avec conversion métrique (g ↔ kg, ml ↔ cl ↔ L)
 */
function sumMetricQuantities(
  qty1: number,
  unit1: string,
  qty2: number,
  unit2: string
): { sumQty: string; finalUnit: string } | null {
  const u1 = normalizeUnitKey(unit1);
  const u2 = normalizeUnitKey(unit2);

  // Unités identiques
  if (u1 === u2) {
    return {
      sumQty: formatSummedQuantity(qty1 + qty2),
      finalUnit: unit1 || unit2,
    };
  }

  // Masse : g et kg
  if ((u1 === 'g' && u2 === 'kg') || (u1 === 'kg' && u2 === 'g')) {
    const valInG = (u1 === 'kg' ? qty1 * 1000 : qty1) + (u2 === 'kg' ? qty2 * 1000 : qty2);
    if (valInG >= 1000) {
      return {
        sumQty: formatSummedQuantity(valInG / 1000),
        finalUnit: 'kg',
      };
    }
    return {
      sumQty: formatSummedQuantity(valInG),
      finalUnit: 'g',
    };
  }

  // Volume : ml, cl, l
  const volumeUnits = ['ml', 'cl', 'l'];
  if (volumeUnits.includes(u1) && volumeUnits.includes(u2)) {
    const toMl = (q: number, u: string) => (u === 'l' ? q * 1000 : u === 'cl' ? q * 10 : q);
    const totalMl = toMl(qty1, u1) + toMl(qty2, u2);
    if (totalMl >= 1000) {
      return {
        sumQty: formatSummedQuantity(totalMl / 1000),
        finalUnit: 'L',
      };
    }
    if (totalMl >= 10 && totalMl % 10 === 0) {
      return {
        sumQty: formatSummedQuantity(totalMl / 10),
        finalUnit: 'cl',
      };
    }
    return {
      sumQty: formatSummedQuantity(totalMl),
      finalUnit: 'ml',
    };
  }

  return null;
}

/**
 * Crée un ShoppingItem à partir d'un ingrédient mis à l'échelle des portions
 * selon les règles du lexique canonique (Arbitrages 2 & 3) :
 * - Nom canonique standardisé
 * - Rayon issu de defaultAisle du lexique
 * - Staples inclus sans quantité ni unité
 * - Exclusion stricte de l'eau (renvoie null)
 */
export function createShoppingItemFromIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number,
  recipeTitle?: string,
  recipeId?: string
): ShoppingItem | null {
  const norm = normalizeIngredient(ingredient);
  const resolvedCanonicalId = ingredient.canonicalId || norm.canonicalId;
  const canonicalName = norm.canonicalId ? norm.name : ingredient.name.trim();

  // EXCLUSION STRICTE DE L'EAU (Arbitrage 2)
  const normLower = normalizeString(canonicalName);
  if (resolvedCanonicalId === 'ing_canon_eau' || normLower === 'eau') {
    return null;
  }

  // RAYON OFFICIEL : defaultAisle du lexique canonique (Arbitrage 3)
  let aisle: ShoppingAisle;
  if (resolvedCanonicalId) {
    const vocabList = VocabularyService.getSyncList();
    const canonItem = vocabList.find((v) => v.id === resolvedCanonicalId);
    aisle = canonItem?.defaultAisle || classifyIngredientAisle(canonicalName);
  } else {
    aisle = classifyIngredientAisle(canonicalName);
  }

  // FONDS DE PLACARD (Arbitrage 2) : Nom canonique seul, sans quantité
  const isStaple = Boolean(ingredient.isPantryStaple || norm.isPantryStaple);
  const scaledQty = isStaple ? undefined : scaleQuantity(ingredient.quantity, baseServings, targetServings);
  const finalUnit = isStaple ? undefined : (ingredient.unit ? ingredient.unit.trim() : undefined);

  return {
    id: generateUniqueId('shop'),
    name: canonicalName,
    canonicalId: resolvedCanonicalId,
    quantity: scaledQty || undefined,
    unit: finalUnit || undefined,
    isChecked: false,
    aisle,
    recipeTitle,
    recipeId,
    servings: targetServings,
    createdAt: new Date().toISOString(),
  };
}

function mergeRecipeTitles(existingTitle?: string, newTitle?: string): string | undefined {
  if (!newTitle) return existingTitle;
  if (!existingTitle) return newTitle;
  if (existingTitle.includes(newTitle)) return existingTitle;
  return `${existingTitle}, ${newTitle}`;
}

/**
 * Fusionne intelligemment une liste d'ingrédients existants avec de nouveaux ingrédients
 * - Priorité O(1) par canonicalId sous nom canonique standardisé
 * - Addition mathématique et conversion métrique (g ↔ kg, ml ↔ cl ↔ L)
 * - Les fonds de placard sans quantité restent groupés sous une ligne unique
 * - L'eau est strictement exclue
 */
export function mergeShoppingItems(
  existingItems: ShoppingItem[],
  newItems: (ShoppingItem | null)[]
): ShoppingItem[] {
  const result: ShoppingItem[] = [...existingItems];

  const validNewItems = newItems.filter((i): i is ShoppingItem => {
    if (!i) return false;
    const n = normalizeString(i.name);
    return i.canonicalId !== 'ing_canon_eau' && n !== 'eau';
  });

  validNewItems.forEach((newItem) => {
    const normNewName = normalizeString(newItem.name);

    // Cherche un doublon non-coché :
    // 1. Par canonicalId si présent sur les deux
    // 2. Sinon par nom normalisé strict
    const matchIndex = result.findIndex((item) => {
      if (item.isChecked) return false;

      if (newItem.canonicalId && item.canonicalId) {
        if (newItem.canonicalId !== item.canonicalId) return false;

        // Vérifier si fusionnable (unités compatibles ou les deux sans quantité)
        if (!newItem.quantity && !item.quantity) return true;
        const u1 = normalizeUnitKey(item.unit);
        const u2 = normalizeUnitKey(newItem.unit);
        if (u1 === u2) return true;
        if (sumMetricQuantities(1, u1, 1, u2) !== null) return true;

        return false;
      }

      const normItemName = normalizeString(item.name);
      if (normItemName === normNewName) {
        if (!newItem.quantity && !item.quantity) return true;
        const u1 = normalizeUnitKey(item.unit);
        const u2 = normalizeUnitKey(newItem.unit);
        return u1 === u2;
      }

      return false;
    });

    if (matchIndex < 0) {
      result.push(newItem);
      return;
    }

    const existing = result[matchIndex];
    const mergedRecipeTitle = mergeRecipeTitles(existing.recipeTitle, newItem.recipeTitle);

    // Cas 1 : Fonds de placard ou articles sans quantité (ex: "Sel", "Muscade")
    if (!existing.quantity && !newItem.quantity) {
      result[matchIndex] = {
        ...existing,
        canonicalId: existing.canonicalId || newItem.canonicalId,
        recipeTitle: mergedRecipeTitle,
      };
      return;
    }

    // Cas 2 : Addition mathématique numérique
    const num1 = parseNumericQuantity(existing.quantity);
    const num2 = parseNumericQuantity(newItem.quantity);

    if (num1 !== null && num2 !== null) {
      const metricSum = sumMetricQuantities(num1, existing.unit || '', num2, newItem.unit || '');
      if (metricSum) {
        result[matchIndex] = {
          ...existing,
          canonicalId: existing.canonicalId || newItem.canonicalId,
          quantity: metricSum.sumQty,
          unit: metricSum.finalUnit || undefined,
          recipeTitle: mergedRecipeTitle,
        };
        return;
      }
    }

    // Cas 3 : Concaténation textuelle si unités complexes
    const mergedQty = [existing.quantity, newItem.quantity]
      .filter(Boolean)
      .join(' + ');

    result[matchIndex] = {
      ...existing,
      canonicalId: existing.canonicalId || newItem.canonicalId,
      quantity: mergedQty || undefined,
      recipeTitle: mergedRecipeTitle,
    };
  });

  return result;
}

/**
 * Regroupe les articles par rayon de supermarché pour l'affichage et le parcours en magasin
 */
export function groupItemsByAisle(
  items: ShoppingItem[]
): { aisle: ShoppingAisle; items: ShoppingItem[] }[] {
  const grouped: Record<ShoppingAisle, ShoppingItem[]> = {
    'Fruits & Légumes': [],
    'Boucherie & Poissonnerie': [],
    'Produits Frais & Crèmerie': [],
    'Boulangerie & Pâtisserie': [],
    'Épicerie & Condiments': [],
    'Surgelés': [],
    'Boissons': [],
    'Autre': [],
  };

  items.forEach((item) => {
    const aisle = item.aisle || 'Autre';
    if (!grouped[aisle]) {
      grouped[aisle] = [];
    }
    grouped[aisle].push(item);
  });

  return ALL_AISLES.filter((a) => grouped[a] && grouped[a].length > 0).map((a) => ({
    aisle: a,
    items: grouped[a],
  }));
}

/**
 * Formate un texte clair, élégant et soigné pour partager la liste de courses par SMS, WhatsApp, Mail, etc.
 */
export function formatShoppingListForShare(items: ShoppingItem[]): string {
  if (items.length === 0) {
    return '🛒 Ma liste de courses Papilles est vide.';
  }

  const uncompleted = items.filter((i) => !i.isChecked);
  const targetItems = uncompleted.length > 0 ? uncompleted : items;
  const groups = groupItemsByAisle(targetItems);

  const aisleEmojis: Record<ShoppingAisle, string> = {
    'Fruits & Légumes': '🥦',
    'Boucherie & Poissonnerie': '🥩',
    'Produits Frais & Crèmerie': '🧀',
    'Boulangerie & Pâtisserie': '🍞',
    'Épicerie & Condiments': '🍝',
    'Surgelés': '❄️',
    'Boissons': '🍷',
    'Autre': '🧺',
  };

  const lines: string[] = [
    `🛒 *Ma Liste de Courses Papilles* (${targetItems.length} article${targetItems.length > 1 ? 's' : ''})`,
    '',
  ];

  groups.forEach(({ aisle, items: aisleItems }) => {
    const emoji = aisleEmojis[aisle] || '•';
    lines.push(`${emoji} *${aisle.toUpperCase()}*`);
    aisleItems.forEach((it) => {
      let qtyPart = '';
      if (it.quantity && it.unit) {
        qtyPart = `${it.quantity} ${it.unit} `;
      } else if (it.quantity) {
        qtyPart = `${it.quantity} `;
      } else if (it.unit) {
        qtyPart = `${it.unit} `;
      }
      lines.push(`  [ ] ${qtyPart}${it.name}`);
    });
    lines.push('');
  });

  lines.push('Généré avec Papilles Recettes 👩‍🍳');

  return lines.join('\n');
}
