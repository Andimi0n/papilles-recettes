import { Recipe, Ingredient } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { NormalizationResult } from '../types/vocabulary';
import { normalizeIngredient } from './ingredientNormalizer';
import { normalizeString } from './helpers';
import { stemWord, tokenizeText } from './searchEngine';

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

export interface PreparedStock {
  items: FridgeItem[];
  canonicalIdMap: Map<string, string>;
  canonicalNameMap: Map<string, string>;
  normalizedNameMap: Map<string, string>;
  stemmedNameMap: Map<string, string>;
  wordsMap: Map<string, string>;
}

// Compatibilité descendante de type
export type PreparedStockItem = PreparedStock;

/**
 * Prépare et indexe en mémoire les aliments en stock pour des comparaisons O(1) ultra-rapides.
 * Remplace les boucles imbriquées et les compilations RegExp à chaque cycle.
 */
export function prepareStockItems(stockItems: FridgeItem[]): PreparedStock {
  const canonicalIdMap = new Map<string, string>();
  const canonicalNameMap = new Map<string, string>();
  const normalizedNameMap = new Map<string, string>();
  const stemmedNameMap = new Map<string, string>();
  const wordsMap = new Map<string, string>();

  stockItems.forEach((item) => {
    const rawName = item.name.trim();
    if (!rawName) return;

    if (item.canonicalId) {
      canonicalIdMap.set(item.canonicalId, rawName);
    }

    const norm = normalizeIngredient({ name: rawName, canonicalId: item.canonicalId });
    const cName = norm.name || rawName;
    const normStr = normalizeString(cName);
    const stemmed = stemWord(normStr);

    if (norm.canonicalId) {
      canonicalIdMap.set(norm.canonicalId, rawName);
    }
    canonicalNameMap.set(cName.toLowerCase(), rawName);
    normalizedNameMap.set(normStr, rawName);
    stemmedNameMap.set(stemmed, rawName);

    // Indexation par mot entier significatif (>= 3 lettres)
    const words = normStr.split(/\s+/);
    words.forEach((w) => {
      if (w.length >= 3) {
        wordsMap.set(w, rawName);
        wordsMap.set(stemWord(w), rawName);
      }
    });

    const origTokens = tokenizeText(rawName);
    origTokens.forEach((t) => {
      if (t.length >= 3) {
        wordsMap.set(t, rawName);
        wordsMap.set(stemWord(t), rawName);
      }
    });
  });

  return {
    items: stockItems,
    canonicalIdMap,
    canonicalNameMap,
    normalizedNameMap,
    stemmedNameMap,
    wordsMap,
  };
}

/**
 * Vérifie si un ingrédient de recette correspond à un aliment présent en stock (O(1)).
 */
export function isIngredientInStock(
  ing: Ingredient,
  preparedStock: PreparedStock,
  precomputedNorm?: NormalizationResult
): { inStock: boolean; matchedStockName?: string } {
  if (!preparedStock || preparedStock.items.length === 0) {
    return { inStock: false };
  }

  // 0. Identifiant canonique direct préexistant sur l'ingrédient (O(1))
  if (ing.canonicalId && preparedStock.canonicalIdMap.has(ing.canonicalId)) {
    return {
      inStock: true,
      matchedStockName: preparedStock.canonicalIdMap.get(ing.canonicalId),
    };
  }

  const normIng =
    precomputedNorm ||
    normalizeIngredient({
      name: ing.name,
      canonicalId: ing.canonicalId,
      quantity: ing.quantity,
      unit: ing.unit,
      isPantryStaple: ing.isPantryStaple,
      isOptional: ing.isOptional,
    });

  // 1. Identifiant canonique (O(1))
  if (normIng.canonicalId && preparedStock.canonicalIdMap.has(normIng.canonicalId)) {
    return {
      inStock: true,
      matchedStockName: preparedStock.canonicalIdMap.get(normIng.canonicalId),
    };
  }

  // 2. Nom canonique (O(1))
  const lowerName = (normIng.name || ing.name).toLowerCase();
  if (preparedStock.canonicalNameMap.has(lowerName)) {
    return {
      inStock: true,
      matchedStockName: preparedStock.canonicalNameMap.get(lowerName),
    };
  }

  // 3. Chaîne normalisée exacte (O(1))
  const ingNormStr = normalizeString(normIng.name || ing.name);
  if (preparedStock.normalizedNameMap.has(ingNormStr)) {
    return {
      inStock: true,
      matchedStockName: preparedStock.normalizedNameMap.get(ingNormStr),
    };
  }

  // 4. Stemming identique (ex: oeufs / oeuf, carottes / carotte) (O(1))
  const ingStemmed = stemWord(ingNormStr);
  if (preparedStock.stemmedNameMap.has(ingStemmed)) {
    return {
      inStock: true,
      matchedStockName: preparedStock.stemmedNameMap.get(ingStemmed),
    };
  }

  // 5. Fallback par mot entier UNIQUEMENT pour les ingrédients hors lexique (non résolus vers un canonicalId)
  if (!normIng.canonicalId) {
    const words = ingNormStr.split(/\s+/);
    for (const w of words) {
      if (w.length >= 3) {
        if (preparedStock.wordsMap.has(w)) {
          return {
            inStock: true,
            matchedStockName: preparedStock.wordsMap.get(w),
          };
        }
        const stemW = stemWord(w);
        if (preparedStock.wordsMap.has(stemW)) {
          return {
            inStock: true,
            matchedStockName: preparedStock.wordsMap.get(stemW),
          };
        }
      }
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
  preparedStock: PreparedStock,
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

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const norm = normalizeIngredient({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      isPantryStaple: ing.isPantryStaple,
      isOptional: ing.isOptional,
    });

    const isOptional = Boolean(ing.isOptional || norm.isOptional);
    const isStaple = Boolean(ing.isPantryStaple || norm.isPantryStaple);

    // Ingrédient facultatif : ne compte pas comme un requis bloquant
    if (isOptional) {
      const stockCheck = isIngredientInStock(ing, preparedStock, norm);
      matchedIngredients.push({
        ingredient: ing,
        isStaple,
        isOptional: true,
        matchedBy: stockCheck.inStock ? 'stock' : 'optional',
        matchedStockItemName: stockCheck.matchedStockName,
      });
      continue;
    }

    totalEssentialCount++;

    // Vérifier d'abord si l'ingrédient est présent dans le stock réel
    const stockCheck = isIngredientInStock(ing, preparedStock, norm);
    if (stockCheck.inStock) {
      matchedEssentialCount++;
      matchedIngredients.push({
        ingredient: ing,
        isStaple,
        isOptional: false,
        matchedBy: 'stock',
        matchedStockItemName: stockCheck.matchedStockName,
      });
      continue;
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
      continue;
    }

    // Ingrédient indispensable manquant
    missingIngredients.push(ing);
  }

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

// Cache global d'évaluation pour éviter tout recalcul lors de re-renders fréquents
let cachedEvaluationKey = '';
let cachedEvaluationMap: Map<string, RecipeStockEvaluation> = new Map();

/**
 * Évalue une liste complète de recettes par rapport au stock avec mémoïsation ultra-rapide (< 2ms).
 */
export function evaluateRecipesWithStock(
  recipes: Recipe[],
  stockItems: FridgeItem[],
  options?: { assumePantryStaplesAvailable?: boolean }
): Map<string, RecipeStockEvaluation> {
  if (recipes.length === 0 || stockItems.length === 0) {
    return new Map<string, RecipeStockEvaluation>();
  }

  // Clé d'invalidation rapide basée sur le nombre de recettes et la liste des stocks
  const stockFingerprint = stockItems.map((s) => s.id + s.name).join('_');
  const recipesFingerprint = recipes.length + '_' + (recipes[0]?.updatedAt || '');
  const key = `${stockFingerprint}::${recipesFingerprint}::${options?.assumePantryStaplesAvailable ?? true}`;

  if (key === cachedEvaluationKey && cachedEvaluationMap.size > 0) {
    return cachedEvaluationMap;
  }

  const preparedStock = prepareStockItems(stockItems);
  const map = new Map<string, RecipeStockEvaluation>();

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    map.set(r.id, evaluateRecipeStock(r, preparedStock, options));
  }

  cachedEvaluationKey = key;
  cachedEvaluationMap = map;

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
  if (stockItems.length === 0 || recipes.length === 0) return [];
  const evaluations = evaluateRecipesWithStock(recipes, stockItems, options);
  return recipes.filter((r) => evaluations.get(r.id)?.isDoable);
}
