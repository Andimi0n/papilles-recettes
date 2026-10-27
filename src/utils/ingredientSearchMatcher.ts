import { normalizeString } from './helpers';
import { VocabularyService } from '../services/vocabularyService';

export interface SearchableIngredientItem {
  id?: string;
  name: string;
  canonicalId?: string;
  aisle?: string;
  recipeTitle?: string;
  notes?: string;
}

/**
 * Détermine si un ingrédient ou article de courses correspond à une requête de recherche utilisateur.
 * Prend en charge :
 * - Insensibilité à la casse et aux accents
 * - Correspondance par sous-chaîne
 * - Singulier / pluriel automatique (ex: "tomate" matche "tomates")
 * - Multi-mots / tokens découpés (ex: "sauce soja" ou "soja sauce" matche "Sauce soja")
 * - Résolution via le canonicalId et les alias du lexique canonique Papilles
 * - Correspondance par nom de rayon officiel (ex: "fruits" ou "épicerie")
 * - Correspondance par titre de recette d'origine (courses)
 */
export function matchIngredientSearch(
  item: SearchableIngredientItem,
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normQuery = normalizeString(trimmed);
  if (!normQuery) return true;

  const normName = normalizeString(item.name);

  // 1. Match direct du nom complet
  if (normName.includes(normQuery)) return true;

  // 2. Gestion singulier / pluriel sur le terme complet
  const querySingular = normQuery.endsWith('s') ? normQuery.slice(0, -1) : normQuery;
  const nameSingular = normName.endsWith('s') ? normName.slice(0, -1) : normName;

  if (querySingular.length >= 3 && normName.includes(querySingular)) return true;
  if (nameSingular.length >= 3 && nameSingular.includes(normQuery)) return true;

  // 3. Multi-tokens (si la requête comporte plusieurs mots, ex: "creme liquide")
  const tokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every((token) => {
      const tokSingular = token.endsWith('s') ? token.slice(0, -1) : token;
      return normName.includes(token) || (tokSingular.length >= 3 && normName.includes(tokSingular));
    });
    if (allTokensMatch) return true;
  }

  // 4. Résolution par CanonicalId & Alias du lexique canonique
  if (item.canonicalId) {
    const normCanonical = normalizeString(item.canonicalId);
    if (
      normCanonical.includes(normQuery) ||
      (querySingular.length >= 3 && normCanonical.includes(querySingular))
    ) {
      return true;
    }

    try {
      const syncList = VocabularyService.getSyncList();
      const canonicalIng = syncList.find((c) => c.id === item.canonicalId);
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
 * Compte le nombre d'éléments correspondant à une requête de recherche.
 */
export function countMatchingItems<T extends SearchableIngredientItem>(
  items: T[],
  query: string
): number {
  if (!query || !query.trim()) return 0;
  return items.filter((item) => matchIngredientSearch(item, query)).length;
}

/**
 * Filtre un tableau d'ingrédients ou articles avec la recherche.
 */
export function filterIngredientItems<T extends SearchableIngredientItem>(
  items: T[],
  query: string
): T[] {
  if (!query || !query.trim()) return items;
  return items.filter((item) => matchIngredientSearch(item, query));
}
