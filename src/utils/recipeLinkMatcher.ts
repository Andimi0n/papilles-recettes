import { Ingredient, Recipe } from '../types/recipe';
import { normalizeString } from './helpers';

// Mots et expressions accessoires couramment présents dans les titres de recettes
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

// Mots accessoires couramment présents dans les noms d'ingrédients en recette
const INGREDIENT_NAME_QUALIFIERS = [
  /\b(1 |2 )?rouleau(x)? (de |d')?\b/g,
  /\bpr[eê]te?s? [aà] d[eé]rouler\b/g,
  /\bdu commerce\b/g,
  /\bmaison\b/g,
  /\bfrais|fra[iî]che\b/g,
  /\ben bo[iî]te\b/g,
  /\ben bocal\b/g,
  /\bsurgel[eé]e?s?\b/g,
];

// Ingrédients monoproduits trop génériques pour autoriser un match partiel / flou
const GENERIC_INGREDIENTS = new Set([
  'sel',
  'eau',
  'poivre',
  'beurre',
  'huile',
  'sucre',
  'oeuf',
  'oeufs',
  'lait',
  'farine',
  'pain',
  'ail',
  'oignon',
  'carotte',
]);

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
 * Nettoie le nom d'un ingrédient pour la détection de lien culinaire (ex: "Pâte brisée prête à dérouler" -> "pate brisee")
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
 * Calcule un score de pertinence entre un nom d'ingrédient et un titre de recette (0 à 100).
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

  // 1. Correspondance exacte parfaite
  if (cIng === cRec) {
    return 100;
  }

  // 2. Correspondance avec le nom canonique officiel
  if (canonicalName) {
    const cCanon = cleanIngredientNameForMatching(canonicalName);
    if (cCanon && cCanon === cRec) {
      return 95;
    }
  }

  // Si c'est un ingrédient ultra-générique de base, refuser le match partiel
  if (GENERIC_INGREDIENTS.has(cIng) || GENERIC_INGREDIENTS.has(cRec)) {
    return 0;
  }

  // 3. Préfixe / Suffixe avec frontière de mot (ex: "pate brisee" et "pate brisee salee")
  if (cIng.length >= 5 && cRec.length >= 5) {
    if (cRec.startsWith(cIng + ' ') || cIng.startsWith(cRec + ' ')) {
      return 85;
    }
  }

  // 4. Inclusion si la chaîne est suffisamment distinctive (au moins 6 caractères)
  if (cIng.length >= 6 && cRec.length >= 6) {
    if (cRec.includes(cIng) || cIng.includes(cRec)) {
      return 80;
    }
  }

  return 0;
}

/**
 * Recherche la recette associée à un ingrédient :
 * 1. Si linkedRecipeId === 'none' : retourne null (dissociation explicite de l'utilisateur).
 * 2. Si linkedRecipeId est renseigné : recherche la recette correspondante par ID.
 * 3. Sinon : tente une résolution automatique parmi toutes les recettes disponibles (hors recette courante).
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

  // Résolution automatique
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
    if (score >= 80 && score > bestScore) {
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
