import { Recipe, Ingredient } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { normalizeIngredient } from './ingredientNormalizer';
import { normalizeString } from './helpers';
import { stemWord, tokenizeText, tokenMatchesTargetTokens } from './searchEngine';

export interface MatchedStockIngredient {
  ingredient: Ingredient;
  isStaple: boolean;
  isOptional: boolean;
  matchedBy: 'stock' | 'staple' | 'optional';
  matchedStockItemName?: string;
}

export interface RecipeStockEvaluation {
  recipe: Recipe;
  /** Vrai si tous les ingrédients indispensables sont présents en stock ou sont des fonds de placard (sel, poivre, eau, huile...) */
  isDoable: boolean;
  /** Pourcentage de couverture des ingrédients indispensables (0 à 100) */
  matchPercentage: number;
  /** Nombre total d'ingrédients obligatoires (hors facultatifs) */
  totalEssentialCount: number;
  /** Nombre d'ingrédients obligatoires satisfaits (en stock ou placard) */
  matchedEssentialCount: number;
  /** Ingrédients validés et méthode de résolution */
  matchedIngredients: MatchedStockIngredient[];
  /** Ingrédients indispensables manquants à acheter */
  missingIngredients: Ingredient[];
}

export interface PreparedStockItem {
  original: FridgeItem;
  canonicalName: string;
  canonicalId?: string;
  normalizedName: string;
  stemmedName: string;
  tokens: string[];
}

/**
 * Prépare et indexe en mémoire les aliments en stock pour des comparaisons rapides O(1) / O(N).
 */
export function prepareStockItems(stockItems: FridgeItem[]): PreparedStockItem[] {
  return stockItems.map((item) => {
    const normalized = normalizeIngredient({ name: item.name });
    const normStr = normalizeString(normalized.name || item.name);
    return {
      original: item,
      canonicalName: normalized.name || item.name,
      canonicalId: normalized.canonicalId,
      normalizedName: normStr,
      stemmedName: stemWord(normStr),
      tokens: tokenizeText(item.name),
    };
  });
}

/**
 * Vérifie si une chaîne contient une autre chaîne sous forme de mot(s) entier(s).
 * Évite les faux positifs comme "écrémé" contenant "crème".
 */
function isWholeWordMatch(haystack: string, needle: string): boolean {
  if (!haystack || !needle || needle.length < 3) return false;
  if (haystack === needle) return true;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
  return regex.test(haystack);
}

/**
 * Vérifie si un ingrédient de recette correspond à un aliment présent en stock.
 */
export function isIngredientInStock(
  ing: Ingredient,
  preparedStock: PreparedStockItem[]
): { inStock: boolean; matchedStockName?: string } {
  if (preparedStock.length === 0) {
    return { inStock: false };
  }

  const normIng = normalizeIngredient({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    isPantryStaple: ing.isPantryStaple,
    isOptional: ing.isOptional,
  });

  const ingNormStr = normalizeString(normIng.name || ing.name);
  const ingStemmed = stemWord(ingNormStr);

  for (const stockItem of preparedStock) {
    // 1. Identifiant canonique identique (lexique canonique unifié avec tous les alias)
    if (
      normIng.canonicalId &&
      stockItem.canonicalId &&
      normIng.canonicalId === stockItem.canonicalId
    ) {
      return { inStock: true, matchedStockName: stockItem.original.name };
    }

    // 2. Nom canonique ou chaîne normalisée exacte
    if (
      normIng.name.toLowerCase() === stockItem.canonicalName.toLowerCase() ||
      ingNormStr === stockItem.normalizedName
    ) {
      return { inStock: true, matchedStockName: stockItem.original.name };
    }

    // 3. Stemming identique (ex: oeufs / oeuf, carottes / carotte, tomates / tomate)
    if (ingStemmed === stockItem.stemmedName) {
      return { inStock: true, matchedStockName: stockItem.original.name };
    }

    // 4. Inclusion de mots entiers (ex: "blanc de poulet" contient le mot "poulet")
    if (
      isWholeWordMatch(ingNormStr, stockItem.normalizedName) ||
      isWholeWordMatch(stockItem.normalizedName, ingNormStr)
    ) {
      return { inStock: true, matchedStockName: stockItem.original.name };
    }
  }

  return { inStock: false };
}

/**
 * Évalue la faisabilité d'une recette par rapport au stock de la cuisine.
 * - Prend en compte les fonds de placard indispensables (sel, poivre, eau, huiles usuelles)
 * - Exclut les ingrédients facultatifs des exigences de faisabilité
 */
export function evaluateRecipeStock(
  recipe: Recipe,
  preparedStock: PreparedStockItem[],
  options?: {
    assumePantryStaplesAvailable?: boolean;
  }
): RecipeStockEvaluation {
  const assumeStaples = options?.assumePantryStaplesAvailable ?? true;
  const ingredients = recipe.ingredients || [];

  const matchedIngredients: MatchedStockIngredient[] = [];
  const missingIngredients: Ingredient[] = [];

  let totalEssentialCount = 0;
  let matchedEssentialCount = 0;

  ingredients.forEach((ing) => {
    const norm = normalizeIngredient({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      isPantryStaple: ing.isPantryStaple,
      isOptional: ing.isOptional,
    });

    const isOptional = Boolean(ing.isOptional || norm.isOptional);
    const isStaple = Boolean(ing.isPantryStaple || norm.isPantryStaple);

    // Ingrédient facultatif : ne compte pas comme un requis obligatoire
    if (isOptional) {
      const stockCheck = isIngredientInStock(ing, preparedStock);
      matchedIngredients.push({
        ingredient: ing,
        isStaple,
        isOptional: true,
        matchedBy: stockCheck.inStock ? 'stock' : 'optional',
        matchedStockItemName: stockCheck.matchedStockName,
      });
      return;
    }

    totalEssentialCount++;

    // Vérifier d'abord si l'ingrédient est présent dans le stock réel
    const stockCheck = isIngredientInStock(ing, preparedStock);
    if (stockCheck.inStock) {
      matchedEssentialCount++;
      matchedIngredients.push({
        ingredient: ing,
        isStaple,
        isOptional: false,
        matchedBy: 'stock',
        matchedStockItemName: stockCheck.matchedStockName,
      });
      return;
    }

    // Si absent du stock mais c'est un fond de placard supposé présent
    if (isStaple && assumeStaples) {
      matchedEssentialCount++;
      matchedIngredients.push({
        ingredient: ing,
        isStaple: true,
        isOptional: false,
        matchedBy: 'staple',
      });
      return;
    }

    // Ingrédient manquant
    missingIngredients.push(ing);
  });

  const isDoable =
    totalEssentialCount > 0
      ? missingIngredients.length === 0
      : ingredients.length === 0;

  const matchPercentage =
    totalEssentialCount > 0
      ? Math.round((matchedEssentialCount / totalEssentialCount) * 100)
      : 100;

  return {
    recipe,
    isDoable,
    matchPercentage,
    totalEssentialCount,
    matchedEssentialCount,
    matchedIngredients,
    missingIngredients,
  };
}

/**
 * Évalue une liste complète de recettes par rapport au stock.
 */
export function evaluateRecipesWithStock(
  recipes: Recipe[],
  stockItems: FridgeItem[],
  options?: { assumePantryStaplesAvailable?: boolean }
): Map<string, RecipeStockEvaluation> {
  const preparedStock = prepareStockItems(stockItems);
  const map = new Map<string, RecipeStockEvaluation>();

  recipes.forEach((recipe) => {
    map.set(recipe.id, evaluateRecipeStock(recipe, preparedStock, options));
  });

  return map;
}

/**
 * Filtre les recettes strictement faisables avec le stock actuel.
 */
export function filterDoableRecipes(
  recipes: Recipe[],
  stockItems: FridgeItem[],
  options?: { assumePantryStaplesAvailable?: boolean }
): Recipe[] {
  if (stockItems.length === 0) return [];
  const evaluations = evaluateRecipesWithStock(recipes, stockItems, options);
  return recipes.filter((r) => evaluations.get(r.id)?.isDoable);
}
