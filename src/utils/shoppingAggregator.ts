import { Ingredient } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { classifyIngredientAisle, ALL_AISLES } from './aisleClassifier';
import { normalizeString, scaleQuantity, generateUniqueId } from './helpers';

/**
 * Tente de convertir une quantité textuelle en valeur numérique (ex: "250", "1.5", "1/2")
 */
function parseNumericQuantity(qtyStr?: string): number | null {
  if (!qtyStr || !qtyStr.trim()) return null;
  const trimmed = qtyStr.trim().replace(',', '.');

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
  if (Math.abs(rounded - 0.5) < 0.05) return '1/2';
  if (Math.abs(rounded - 0.25) < 0.05) return '1/4';
  if (Math.abs(rounded - 0.75) < 0.05) return '3/4';

  const withOne = Math.round(num * 10) / 10;
  return withOne.toString().replace('.', ',');
}

/**
 * Crée un ShoppingItem à partir d'un ingrédient mis à l'échelle des portions
 */
export function createShoppingItemFromIngredient(
  ingredient: Ingredient,
  baseServings: number,
  targetServings: number,
  recipeTitle?: string,
  recipeId?: string
): ShoppingItem {
  const scaledQty = scaleQuantity(ingredient.quantity, baseServings, targetServings);
  const aisle = classifyIngredientAisle(ingredient.name);

  return {
    id: generateUniqueId('shop'),
    name: ingredient.name.trim(),
    quantity: scaledQty || undefined,
    unit: ingredient.unit ? ingredient.unit.trim() : undefined,
    isChecked: false,
    aisle,
    recipeTitle,
    recipeId,
    servings: targetServings,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fusionne intelligemment une liste d'ingrédients existants avec de nouveaux ingrédients
 * - Si le même produit (même nom et même unité) existe déjà non coché, leurs quantités numériques sont additionnées !
 * - Sinon le nouvel article est ajouté à la liste.
 */
export function mergeShoppingItems(
  existingItems: ShoppingItem[],
  newItems: ShoppingItem[]
): ShoppingItem[] {
  const result: ShoppingItem[] = [...existingItems];

  newItems.forEach((newItem) => {
    const normNewName = normalizeString(newItem.name);
    const normNewUnit = normalizeString(newItem.unit || '');

    // Cherche un doublon non-coché avec le même nom et la même unité
    const matchIndex = result.findIndex((item) => {
      if (item.isChecked) return false;
      const normItemName = normalizeString(item.name);
      const normItemUnit = normalizeString(item.unit || '');
      return normItemName === normNewName && normItemUnit === normNewUnit;
    });

    if (matchIndex >= 0) {
      const existing = result[matchIndex];
      const num1 = parseNumericQuantity(existing.quantity);
      const num2 = parseNumericQuantity(newItem.quantity);

      if (num1 !== null && num2 !== null) {
        // Addition mathématique des quantités
        const summed = num1 + num2;
        result[matchIndex] = {
          ...existing,
          quantity: formatSummedQuantity(summed),
          recipeTitle: existing.recipeTitle && newItem.recipeTitle && existing.recipeTitle !== newItem.recipeTitle
            ? `${existing.recipeTitle}, ${newItem.recipeTitle}`
            : (existing.recipeTitle || newItem.recipeTitle),
        };
      } else {
        // Quantités textuelles complexes (ex: "au goût" ou "1 pincée")
        const mergedQty = [existing.quantity, newItem.quantity]
          .filter(Boolean)
          .join(' + ');
        result[matchIndex] = {
          ...existing,
          quantity: mergedQty || undefined,
          recipeTitle: existing.recipeTitle || newItem.recipeTitle,
        };
      }
    } else {
      result.push(newItem);
    }
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
