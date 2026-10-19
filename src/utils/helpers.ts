import { Recipe, Ingredient } from '../types/recipe';

/**
 * Nettoie une chaîne de caractères (minuscule, sans accents, sans espaces superflus)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Formate une durée en minutes en texte lisible (ex: "25 min" ou "1h15")
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours}h${remainingMinutes < 10 ? '0' : ''}${remainingMinutes}`;
}

/**
 * Retourne une appréciation textuelle selon la note sur 5
 */
export function getRatingLabel(rating: number): string {
  if (rating >= 4.8) return 'Exceptionnel !';
  if (rating >= 4.2) return 'Excellent';
  if (rating >= 3.5) return 'Très bon';
  if (rating >= 2.5) return 'Bon';
  if (rating >= 1.5) return 'Moyen';
  if (rating > 0) return 'À perfectionner';
  return 'Non noté';
}

/**
 * Extrait la liste unique et ordonnée de tous les noms d'ingrédients présents dans les recettes
 */
export function extractUniqueIngredientNames(recipes: Recipe[]): string[] {
  const map = new Map<string, string>();
  
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      const clean = ing.name.trim();
      const norm = normalizeString(clean);
      if (clean && !map.has(norm)) {
        map.set(norm, clean);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export interface IngredientMatchResult {
  recipe: Recipe;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchCount: number;
  totalIngredients: number;
  matchRatio: number; // 0 to 1
}

/**
 * Calcule la correspondance d'une recette par rapport à un ensemble d'ingrédients choisis
 */
export function matchRecipeWithIngredients(
  recipe: Recipe,
  selectedIngredients: string[]
): IngredientMatchResult {
  if (selectedIngredients.length === 0) {
    return {
      recipe,
      matchedIngredients: [],
      missingIngredients: recipe.ingredients.map((i) => i.name),
      matchCount: 0,
      totalIngredients: recipe.ingredients.length,
      matchRatio: 0,
    };
  }

  const normalizedSelected = selectedIngredients.map(normalizeString);
  const matched: string[] = [];
  const missing: string[] = [];

  recipe.ingredients.forEach((ing) => {
    const normIng = normalizeString(ing.name);
    // Vérifie si un des ingrédients sélectionnés correspond (inclus ou mot-clé)
    const hasMatch = normalizedSelected.some((sel) => normIng.includes(sel) || sel.includes(normIng));
    if (hasMatch) {
      matched.push(ing.name);
    } else {
      missing.push(ing.name);
    }
  });

  const total = recipe.ingredients.length;
  const matchRatio = total > 0 ? matched.length / total : 0;

  return {
    recipe,
    matchedIngredients: matched,
    missingIngredients: missing,
    matchCount: matched.length,
    totalIngredients: total,
    matchRatio,
  };
}

/**
 * Calcule et formate la quantité d'un ingrédient en fonction du ratio de portions
 */
export function scaleQuantity(
  rawQty: string | undefined,
  baseServings: number,
  targetServings: number
): string {
  if (!rawQty || !rawQty.trim() || baseServings <= 0 || targetServings <= 0) {
    return rawQty || '';
  }

  const ratio = targetServings / baseServings;
  if (ratio === 1) return rawQty;

  const trimmed = rawQty.trim().replace(',', '.');

  // Fractions simples ex: "1/2", "3/4"
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[2]);
    if (den !== 0) {
      const scaled = (num / den) * ratio;
      return formatScaledNumber(scaled);
    }
  }

  // Nombre composé avec fraction ex: "1 1/2"
  const mixedFractionMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedFractionMatch) {
    const whole = parseFloat(mixedFractionMatch[1]);
    const num = parseFloat(mixedFractionMatch[2]);
    const den = parseFloat(mixedFractionMatch[3]);
    if (den !== 0) {
      const scaled = (whole + num / den) * ratio;
      return formatScaledNumber(scaled);
    }
  }

  // Nombre pur (entier ou décimal)
  const numericVal = parseFloat(trimmed);
  if (!isNaN(numericVal) && trimmed === numericVal.toString()) {
    const scaled = numericVal * ratio;
    return formatScaledNumber(scaled);
  }

  // Chiffre suivi d'un texte (ex: "2 à 3", "1 verre")
  const leadingNumberMatch = trimmed.match(/^([\d.]+)\s*(.*)$/);
  if (leadingNumberMatch) {
    const num = parseFloat(leadingNumberMatch[1]);
    const rest = leadingNumberMatch[2];
    if (!isNaN(num)) {
      const scaled = num * ratio;
      return `${formatScaledNumber(scaled)} ${rest}`.trim();
    }
  }

  // Texte qualitatif ("au goût", "un filet"), on conserve
  return rawQty;
}

function formatScaledNumber(num: number): string {
  if (num <= 0) return '0';
  if (Number.isInteger(num)) return num.toString();

  // Pour les poids/volumes >= 15 (ex: grammes, ml), arrondir à l'entier
  if (num >= 15) {
    return Math.round(num).toString();
  }

  // Fractions usuelles
  const rounded = Math.round(num * 100) / 100;
  if (Math.abs(rounded - 0.5) < 0.05) return '1/2';
  if (Math.abs(rounded - 0.25) < 0.05) return '1/4';
  if (Math.abs(rounded - 0.75) < 0.05) return '3/4';
  if (Math.abs(rounded - 0.33) < 0.05) return '1/3';
  if (Math.abs(rounded - 0.67) < 0.05) return '2/3';

  // Décimal lisible
  const withOneDecimal = Math.round(num * 10) / 10;
  return withOneDecimal.toString().replace('.', ',');
}
