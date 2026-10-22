import { Recipe, Ingredient } from '../types/recipe';
import { UserAllergenItem, AllergenFamily, CanonicalIngredient } from '../types/vocabulary';
import { normalizeIngredient } from './ingredientNormalizer';
import { normalizeString } from './helpers';
import { stemWord, tokenizeText } from './searchEngine';
import { getInitialCanonicalVocabulary } from '../data/canonicalVocabulary';

export interface PreparedAllergens {
  /** Liste brute des allergènes enregistrés par l'utilisateur */
  items: UserAllergenItem[];
  /** Ensemble des IDs canoniques d'allergènes (O(1)) */
  canonicalIdSet: Set<string>;
  /** Noms d'affichage normalisés stricts (minuscules, sans accents) */
  normalizedNamesSet: Set<string>;
  /** Formes réduites après stemming pour pluriels et variantes (ex: "crevettes" -> "crevette") */
  stemmedNamesSet: Set<string>;
  /** Mots-clés / tokens entiers significatifs (>= 3 lettres) associés */
  tokensSet: Set<string>;
  /** Familles majeures INCO actives (ex: 'gluten', 'lait', 'arachides'...) */
  activeFamilies: Set<AllergenFamily>;
  /** Dictionnaire nom normalisé -> famille associée si connue */
  familyByNameMap: Map<string, AllergenFamily | null>;
  /** Dictionnaire canonique ID -> famille */
  familyByIdMap: Map<string, AllergenFamily>;
}

export interface MatchedAllergenDetail {
  ingredient: Ingredient;
  matchedAllergenName: string;
  allergenFamily?: AllergenFamily | null;
}

export interface RecipeAllergenEvaluation {
  /** Vrai si au moins un ingrédient de la recette correspond à un allergène utilisateur */
  hasAllergen: boolean;
  /** Ingrédients concernés avec détails de l'allergène déclencheur */
  allergenIngredients: MatchedAllergenDetail[];
}

// Mots vides fréquents à ne pas indexer comme token d'allergène
const ALLERGEN_STOP_TOKENS = new Set([
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux',
  'sauce', 'huile', 'vinaigre', 'poudre', 'puree', 'creme', 'pate', 'graines'
]);

/**
 * Prépare et indexe en mémoire les allergènes de l'utilisateur pour une vérification sub-milliseconde.
 */
export function prepareUserAllergens(
  userAllergens: UserAllergenItem[],
  customVocab?: CanonicalIngredient[]
): PreparedAllergens {
  const canonicalIdSet = new Set<string>();
  const normalizedNamesSet = new Set<string>();
  const stemmedNamesSet = new Set<string>();
  const tokensSet = new Set<string>();
  const activeFamilies = new Set<AllergenFamily>();
  const familyByNameMap = new Map<string, AllergenFamily | null>();
  const familyByIdMap = new Map<string, AllergenFamily>();

  // Map rapide sur le vocabulaire canonique (custom ou seed)
  const vocabList: CanonicalIngredient[] =
    customVocab && customVocab.length > 0 ? customVocab : getInitialCanonicalVocabulary();
  const vocabById = new Map<string, CanonicalIngredient>();
  const vocabByNormName = new Map<string, CanonicalIngredient>();

  vocabList.forEach((ing: CanonicalIngredient) => {
    vocabById.set(ing.id, ing);
    vocabByNormName.set(ing.normalizedName, ing);
    if (ing.allergen) {
      familyByIdMap.set(ing.id, ing.allergen);
    }
  });

  (userAllergens || []).forEach((item) => {
    const rawName = item.name?.trim();
    if (!rawName) return;

    const normName = normalizeString(rawName);
    const stemmed = stemWord(normName);

    normalizedNamesSet.add(normName);
    stemmedNamesSet.add(stemmed);

    if (item.allergenFamily) {
      activeFamilies.add(item.allergenFamily);
      familyByNameMap.set(normName, item.allergenFamily);
    } else {
      familyByNameMap.set(normName, null);
    }

    if (item.canonicalId) {
      canonicalIdSet.add(item.canonicalId);
      const canonIng = vocabById.get(item.canonicalId);
      if (canonIng) {
        if (canonIng.allergen) {
          activeFamilies.add(canonIng.allergen);
          familyByNameMap.set(normName, canonIng.allergen);
        }
        // Ajouter les alias canoniques (ex: pour "Arachides" -> "cacahuète", "beurre de cacahuète")
        (canonIng.aliases || []).forEach((alias) => {
          const normAlias = normalizeString(alias);
          normalizedNamesSet.add(normAlias);
          stemmedNamesSet.add(stemWord(normAlias));
          const aliasTokens = tokenizeText(alias);
          aliasTokens.forEach((t) => {
            if (t.length >= 3 && !ALLERGEN_STOP_TOKENS.has(t)) {
              tokensSet.add(t);
              tokensSet.add(stemWord(t));
            }
          });
        });
      }
    } else {
      // Chercher si correspond à un élément du lexique par nom
      const canonIng = vocabByNormName.get(normName);
      if (canonIng) {
        canonicalIdSet.add(canonIng.id);
        if (canonIng.allergen) {
          activeFamilies.add(canonIng.allergen);
          familyByNameMap.set(normName, canonIng.allergen);
        }
      }
    }

    // Indexer les tokens significatifs du nom de l'allergène
    const tokens = tokenizeText(rawName);
    tokens.forEach((t) => {
      if (t.length >= 3 && !ALLERGEN_STOP_TOKENS.has(t)) {
        tokensSet.add(t);
        tokensSet.add(stemWord(t));
      }
    });
  });

  return {
    items: userAllergens || [],
    canonicalIdSet,
    normalizedNamesSet,
    stemmedNamesSet,
    tokensSet,
    activeFamilies,
    familyByNameMap,
    familyByIdMap,
  };
}

/**
 * Vérifie si un ingrédient donné correspond à l'un des allergènes de l'utilisateur.
 */
export function isIngredientAllergen(
  ingredient: Ingredient | string,
  prepared: PreparedAllergens,
  vocabList?: CanonicalIngredient[]
): { isAllergen: boolean; matchedAllergenName?: string; allergenFamily?: AllergenFamily | null } {
  if (!prepared || prepared.items.length === 0) {
    return { isAllergen: false };
  }

  const rawName = typeof ingredient === 'string' ? ingredient.trim() : ingredient.name?.trim();
  if (!rawName) return { isAllergen: false };

  // Normalisation rapide de l'ingrédient
  const norm = normalizeIngredient({ name: rawName });
  const resolvedName = norm.name || rawName;
  const normStr = normalizeString(resolvedName);
  const stemmed = stemWord(normStr);

  // 1. Correspondance directe par ID canonique dans les allergènes enregistrés
  if (norm.canonicalId && prepared.canonicalIdSet.has(norm.canonicalId)) {
    const family =
      prepared.familyByIdMap.get(norm.canonicalId) ||
      prepared.familyByNameMap.get(normStr) ||
      null;
    return {
      isAllergen: true,
      matchedAllergenName: resolvedName,
      allergenFamily: family,
    };
  }

  // 2. Correspondance par Famille d'allergène INCO active
  // Si l'ingrédient de la recette a un ID canonique lié à une famille majeure déclarée par l'utilisateur
  if (norm.canonicalId) {
    const canonFamily = prepared.familyByIdMap.get(norm.canonicalId);
    if (canonFamily && prepared.activeFamilies.has(canonFamily)) {
      return {
        isAllergen: true,
        matchedAllergenName: resolvedName,
        allergenFamily: canonFamily,
      };
    }
  }

  // 3. Correspondance directe par Nom normalisé ou Stemmed
  if (prepared.normalizedNamesSet.has(normStr) || prepared.stemmedNamesSet.has(stemmed)) {
    const family = prepared.familyByNameMap.get(normStr) || null;
    return {
      isAllergen: true,
      matchedAllergenName: resolvedName,
      allergenFamily: family,
    };
  }

  // Vérifier aussi le nom brut d'origine
  const rawNormStr = normalizeString(rawName);
  const rawStemmed = stemWord(rawNormStr);
  if (prepared.normalizedNamesSet.has(rawNormStr) || prepared.stemmedNamesSet.has(rawStemmed)) {
    const family = prepared.familyByNameMap.get(rawNormStr) || null;
    return {
      isAllergen: true,
      matchedAllergenName: rawName,
      allergenFamily: family,
    };
  }

  // 4. Correspondance par tokens entiers significatifs
  // Ex: "huile d'arachide" -> token "arachide" dans tokensSet
  const rawTokens = tokenizeText(rawName);
  for (const token of rawTokens) {
    if (token.length >= 3 && !ALLERGEN_STOP_TOKENS.has(token)) {
      const stemTok = stemWord(token);
      if (prepared.tokensSet.has(token) || prepared.tokensSet.has(stemTok)) {
        // Retrouver la famille éventuelle
        const family =
          prepared.familyByNameMap.get(token) ||
          prepared.familyByNameMap.get(stemTok) ||
          null;
        return {
          isAllergen: true,
          matchedAllergenName: rawName,
          allergenFamily: family,
        };
      }
    }
  }

  return { isAllergen: false };
}

/**
 * Évalue l'ensemble des allergènes présents dans une recette.
 */
export function evaluateRecipeAllergens(
  recipe: Recipe,
  prepared: PreparedAllergens,
  vocabList?: CanonicalIngredient[]
): RecipeAllergenEvaluation {
  if (!prepared || prepared.items.length === 0 || !recipe || !Array.isArray(recipe.ingredients)) {
    return { hasAllergen: false, allergenIngredients: [] };
  }

  const allergenIngredients: MatchedAllergenDetail[] = [];

  for (const ing of recipe.ingredients) {
    const check = isIngredientAllergen(ing, prepared, vocabList);
    if (check.isAllergen) {
      allergenIngredients.push({
        ingredient: ing,
        matchedAllergenName: check.matchedAllergenName || ing.name,
        allergenFamily: check.allergenFamily,
      });
    }
  }

  return {
    hasAllergen: allergenIngredients.length > 0,
    allergenIngredients,
  };
}

/**
 * Détermine rapidement si une recette contient au moins un allergène (optimisé pour les filtres de recherche).
 */
export function recipeContainsAllergens(
  recipe: Recipe,
  prepared: PreparedAllergens,
  vocabList?: CanonicalIngredient[]
): boolean {
  if (!prepared || prepared.items.length === 0 || !recipe || !Array.isArray(recipe.ingredients)) {
    return false;
  }

  return recipe.ingredients.some(
    (ing) => isIngredientAllergen(ing, prepared, vocabList).isAllergen
  );
}
