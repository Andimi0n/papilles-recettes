import { normalizeString } from './helpers';
import { VocabularyService } from '../services/vocabularyService';
import { ShoppingItem } from '../types/shopping';
import { FridgeItem } from '../types/fridge';

export interface SearchableIngredientItem {
  id?: string;
  name: string;
  canonicalId?: string;
  aisle?: string;
  recipeTitle?: string;
  notes?: string;
}

export interface PreparedSearchQuery {
  trimmed: string;
  normQuery: string;
  querySingular: string;
  tokens: string[];
}

/**
 * Pré-normalise et découpe une requête de recherche une seule fois en amont
 * pour éviter de répéter les opérations de chaînes sur chaque élément de la liste.
 */
export function prepareSearchQuery(query: string): PreparedSearchQuery | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const normQuery = normalizeString(trimmed);
  if (!normQuery) return null;

  const querySingular = normQuery.endsWith('s') ? normQuery.slice(0, -1) : normQuery;
  const tokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);

  return {
    trimmed,
    normQuery,
    querySingular,
    tokens,
  };
}

/**
 * Détermine si un ingrédient ou article de courses correspond à une requête de recherche utilisateur.
 * Prend en charge :
 * - Insensibilité à la casse et aux accents
 * - Correspondance par sous-chaîne
 * - Singulier / pluriel automatique (ex: "tomate" matche "tomates")
 * - Multi-mots / tokens découpés (ex: "sauce soja" ou "soja sauce" matche "Sauce soja")
 * - Résolution O(1) via le canonicalId et les alias du lexique canonique Papilles
 * - Correspondance par nom de rayon officiel (ex: "fruits" ou "épicerie")
 * - Correspondance par titre de recette d'origine (courses)
 */
export function matchIngredientSearch(
  item: SearchableIngredientItem,
  query: string | PreparedSearchQuery
): boolean {
  const prepared = typeof query === 'string' ? prepareSearchQuery(query) : query;
  if (!prepared) return true;

  const { normQuery, querySingular, tokens } = prepared;
  const normName = normalizeString(item.name);

  // 1. Match direct du nom complet
  if (normName.includes(normQuery)) return true;

  // 2. Gestion singulier / pluriel sur le terme complet
  const nameSingular = normName.endsWith('s') ? normName.slice(0, -1) : normName;

  if (querySingular.length >= 3 && normName.includes(querySingular)) return true;
  if (nameSingular.length >= 3 && nameSingular.includes(normQuery)) return true;

  // 3. Multi-tokens (si la requête comporte plusieurs mots, ex: "creme liquide")
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every((token) => {
      const tokSingular = token.endsWith('s') ? token.slice(0, -1) : token;
      return normName.includes(token) || (tokSingular.length >= 3 && normName.includes(tokSingular));
    });
    if (allTokensMatch) return true;
  }

  // 4. Résolution O(1) par CanonicalId & Alias du lexique canonique (Lookup direct sans boucle linéaire)
  if (item.canonicalId) {
    const normCanonical = normalizeString(item.canonicalId);
    if (
      normCanonical.includes(normQuery) ||
      (querySingular.length >= 3 && normCanonical.includes(querySingular))
    ) {
      return true;
    }

    try {
      const vocabMapById = VocabularyService.getSyncMapById();
      const canonicalIng = vocabMapById.get(item.canonicalId);
      if (canonicalIng) {
        const normCanonName = normalizeString(canonicalIng.canonicalName);
        if (normCanonName.includes(normQuery) || (querySingular.length >= 3 && normCanonName.includes(querySingular))) {
          return true;
        }

        if (
          canonicalIng.aliases.some((alias) => {
            const normAlias = normalizeString(alias);
            return normAlias.includes(normQuery) || (querySingular.length >= 3 && normAlias.includes(querySingular));
          })
        ) {
          return true;
        }
      }
    } catch {
      // Tolérance si le service n'est pas encore initialisé
    }
  }

  // 5. Match par rayon officiel
  if (item.aisle) {
    const normAisle = normalizeString(item.aisle);
    if (normAisle.includes(normQuery) || (querySingular.length >= 4 && normAisle.includes(querySingular))) {
      return true;
    }
  }

  // 6. Match par recette d'origine ou note personnelle
  if (item.recipeTitle) {
    const normRecipe = normalizeString(item.recipeTitle);
    if (normRecipe.includes(normQuery)) return true;
  }

  if (item.notes) {
    const normNotes = normalizeString(item.notes);
    if (normNotes.includes(normQuery)) return true;
  }

  return false;
}

/**
 * Compte le nombre d'éléments correspondant à une requête de recherche avec pré-normalisation unique.
 */
export function countMatchingItems<T extends SearchableIngredientItem>(
  items: T[],
  query: string
): number {
  const prepared = prepareSearchQuery(query);
  if (!prepared) return 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    if (matchIngredientSearch(items[i], prepared)) {
      count++;
    }
  }
  return count;
}

/**
 * Filtre un tableau d'ingrédients ou articles avec la recherche avec pré-normalisation unique.
 */
export function filterIngredientItems<T extends SearchableIngredientItem>(
  items: T[],
  query: string
): T[] {
  const prepared = prepareSearchQuery(query);
  if (!prepared) return items;
  return items.filter((item) => matchIngredientSearch(item, prepared));
}

/**
 * Compare deux listes de courses de manière stricte mais ultra-rapide O(N)
 * pour éviter les re-renders redondants lors des retours de StorageService.
 */
export function areShoppingListsEqual(
  a?: ShoppingItem[] | null,
  b?: ShoppingItem[] | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (
      itemA.id !== itemB.id ||
      itemA.isChecked !== itemB.isChecked ||
      itemA.name !== itemB.name ||
      itemA.quantity !== itemB.quantity ||
      itemA.unit !== itemB.unit ||
      itemA.canonicalId !== itemB.canonicalId ||
      itemA.aisle !== itemB.aisle ||
      itemA.recipeTitle !== itemB.recipeTitle ||
      itemA.recipeId !== itemB.recipeId ||
      itemA.servings !== itemB.servings
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Compare deux listes d'étagères/stock de manière stricte mais ultra-rapide O(N)
 * pour éviter les re-renders redondants lors des retours de StorageService.
 */
export function areFridgeListsEqual(
  a?: FridgeItem[] | null,
  b?: FridgeItem[] | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (
      itemA.id !== itemB.id ||
      itemA.name !== itemB.name ||
      itemA.canonicalId !== itemB.canonicalId ||
      itemA.aisle !== itemB.aisle
    ) {
      return false;
    }
  }
  return true;
}
