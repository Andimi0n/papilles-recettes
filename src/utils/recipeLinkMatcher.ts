import { Ingredient, Recipe } from '../types/recipe';
import { normalizeString } from './helpers';

// Mots et expressions accessoires couramment présents dans les titres de recettes de base/préparations
const RECIPE_TITLE_QUALIFIERS = [
  /\b(fait )?maison\b/g,
  /\bvite faite?s?\b/g,
  /\brapides?\b/g,
  /\bfaciles?\b/g,
  /\bexpress\b/g,
  /\binratables?\b/g,
  /\bsimples?\b/g,
  /\btraditionnelle?s?\b/g,
  /\ba l[' ]ancienne\b/g,
  /\bclassiques?\b/g,
  /\bde grand[- ]m[eè]re\b/g,
  /\bde base\b/g,
  /\brecette (de |du |d' |des )?/g,
  /\brecette\b/g,
  /\bau thermomix\b/g,
  /\bau robot\b/g,
  /\bau companion\b/g,
  /\bau cookeo\b/g,
  /\bau magimix\b/g,
];

// Mots accessoires de conditionnement couramment présents dans les ingrédients
const INGREDIENT_NAME_QUALIFIERS = [
  /\b[0-9]+ ?(rouleau|rouleaux) (de |d')?\b/g,
  /\b(1 |2 )?rouleau(x)? (de |d')?\b/g,
  /\bpr[eê]te?s? [aà] d[eé]rouler\b/g,
  /\bdu commerce\b/g,
];

/**
 * Normalise un terme en passant au singulier strict (retrait du 's' ou 'x' terminal par mot)
 */
export function toSingular(term: string): string {
  if (!term) return '';
  return term
    .split(' ')
    .filter(Boolean)
    .map((word) => word.replace(/s$/g, '').replace(/x$/g, ''))
    .join(' ');
}

/**
 * Nettoie le titre d'une recette pour la détection de lien culinaire (ex: "Pâte brisée vite faite" -> "pate brisee")
 */
export function cleanRecipeTitleForMatching(title: string): string {
  if (!title) return '';
  // Supprime le contenu entre parenthèses
  let cleaned = title.replace(/\(.*?\)/g, ' ');
  // Normalise (minuscule, sans accents, sans ponctuation exotique)
  cleaned = normalizeString(cleaned);

  // Supprime les qualificatifs de titres
  for (const regex of RECIPE_TITLE_QUALIFIERS) {
    cleaned = cleaned.replace(regex, ' ');
  }

  // Nettoie les espaces multiples
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Nettoie le nom d'un ingrédient pour la détection de lien culinaire (ex: "Pâte brisée (1 rouleau)" -> "pate brisee")
 */
export function cleanIngredientNameForMatching(name: string): string {
  if (!name) return '';
  let cleaned = name.replace(/\(.*?\)/g, ' ');
  cleaned = normalizeString(cleaned);

  for (const regex of INGREDIENT_NAME_QUALIFIERS) {
    cleaned = cleaned.replace(regex, ' ');
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Calcule un score de pertinence strict entre un nom d'ingrédient et un titre de recette (0 à 100).
 * RÈGLE D'OR : Strictement rigide (zéro sous-chaîne, zéro préfixe partiel, zéro faux positif).
 * Seule l'égalité stricte entre la préparation cuisinée et l'ingrédient demandé est autorisée.
 */
export function computeRecipeMatchScore(
  ingredientName: string,
  recipeTitle: string,
  canonicalName?: string
): number {
  const cIng = cleanIngredientNameForMatching(ingredientName);
  const cRec = cleanRecipeTitleForMatching(recipeTitle);

  if (!cIng || !cRec) return 0;
  if (cIng.length < 3 || cRec.length < 3) return 0;

  const sIng = toSingular(cIng);
  const sRec = toSingular(cRec);

  // 1. Correspondance stricte (avec équivalence singulier/pluriel)
  if (sIng === sRec) {
    return 100;
  }

  // 2. Correspondance stricte avec le nom canonique officiel
  if (canonicalName) {
    const cCanon = cleanIngredientNameForMatching(canonicalName);
    const sCanon = toSingular(cCanon);
    if (sCanon && sCanon === sRec) {
      return 95;
    }
  }

  // Zéro tolérance pour les inclusions partielles (ex: "lardon" dans "tarte aux lardons" = 0,
  // "crème fraîche" vs "crème pâtissière" = 0)
  return 0;
}

/**
 * Recherche la recette associée à un ingrédient :
 * 1. Si linkedRecipeId === 'none' : retourne null (dissociation explicite de l'utilisateur).
 * 2. Si linkedRecipeId est renseigné : recherche la recette correspondante par ID.
 * 3. Sinon : tente une résolution automatique stricte parmi toutes les recettes disponibles (hors recette courante).
 */
export function findLinkedRecipeForIngredient(
  ingredient: Ingredient,
  allRecipes: Recipe[],
  currentRecipeId?: string,
  canonicalName?: string
): Recipe | null {
  if (!ingredient) return null;

  // Dissociation explicite par l'utilisateur
  if (ingredient.linkedRecipeId === 'none') {
    return null;
  }

  // Liaison manuelle explicite par ID
  if (ingredient.linkedRecipeId) {
    const manualMatch = allRecipes.find((r) => r.id === ingredient.linkedRecipeId);
    if (manualMatch && manualMatch.id !== currentRecipeId) {
      return manualMatch;
    }
    // Si la recette manuelle liée a été supprimée, on bascule en auto-matching fallback
  }

  // Résolution automatique stricte
  return findAutoMatchCandidate(ingredient.name, allRecipes, currentRecipeId, canonicalName);
}

/**
 * Détecte automatiquement la meilleure recette candidate pour un nom d'ingrédient donné.
 */
export function findAutoMatchCandidate(
  ingredientName: string,
  allRecipes: Recipe[],
  currentRecipeId?: string,
  canonicalName?: string
): Recipe | null {
  if (!ingredientName || !allRecipes || allRecipes.length === 0) return null;

  let bestMatch: Recipe | null = null;
  let bestScore = 0;

  for (const recipe of allRecipes) {
    // Ne jamais lier une recette à elle-même
    if (currentRecipeId && recipe.id === currentRecipeId) {
      continue;
    }

    const score = computeRecipeMatchScore(ingredientName, recipe.title, canonicalName);
    if (score >= 90 && score > bestScore) {
      bestScore = score;
      bestMatch = recipe;
      if (bestScore === 100) {
        break; // Match parfait immédiat
      }
    }
  }

  return bestMatch;
}

/**
 * Retourne la liste de toutes les préparations maison liées dans une recette donnée.
 */
export function getLinkedRecipesForRecipe(
  recipe: Recipe,
  allRecipes: Recipe[]
): { ingredient: Ingredient; linkedRecipe: Recipe; isAuto: boolean }[] {
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) return [];

  const results: { ingredient: Ingredient; linkedRecipe: Recipe; isAuto: boolean }[] = [];
  const seenRecipeIds = new Set<string>();

  for (const ing of recipe.ingredients) {
    const matched = findLinkedRecipeForIngredient(ing, allRecipes, recipe.id);
    if (matched && !seenRecipeIds.has(matched.id)) {
      seenRecipeIds.add(matched.id);
      results.push({
        ingredient: ing,
        linkedRecipe: matched,
        isAuto: !ing.linkedRecipeId || ing.linkedRecipeId !== matched.id,
      });
    }
  }

  return results;
}
