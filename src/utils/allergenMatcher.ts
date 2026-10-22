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
  /** Tokens d'identité allergène stricts (uniquement les mots uniques de l'allergène ou synonymes stricts) */
  singleWordTokensSet: Set<string>;
  /** Expressions et alias multi-mots à tester comme locution entière (ex: "oignon blanc", "fruits de mer") */
  multiWordPhrasesSet: Set<string>;
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

// Mots vides fréquents, couleurs et découpes culinaires à ne pas indexer comme token autonome d'allergène
const ALLERGEN_STOP_TOKENS = new Set([
  // Mots de liaison et prépositions
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux',
  'pour', 'par', 'sans', 'avec', 'sous', 'sur', 'dans', 'd', 'l',
  // Couleurs (qui peuvent figurer dans des alias sans être l'allergène : "oignon blanc", "vin rouge", etc.)
  'blanc', 'blanche', 'blancs', 'blanches',
  'rouge', 'rouges',
  'jaune', 'jaunes',
  'vert', 'verts', 'verte', 'vertes',
  'noir', 'noirs', 'noire', 'noires',
  'brun', 'bruns', 'rose', 'bleu',
  // Découpes, préparations culinaires, états physiques
  'emince', 'eminces', 'emincee', 'emincees',
  'epluche', 'epluches', 'epluchee', 'epluchees',
  'hache', 'haches', 'hachee', 'hachees',
  'rape', 'rapes', 'rapee', 'rapees',
  'concasse', 'concasses', 'concassee', 'concassees',
  'frais', 'fraiche', 'fraiches',
  'sec', 'secs', 'seche', 'seches',
  'cuit', 'cuits', 'cuite', 'cuites',
  'moulu', 'moulus', 'moulue', 'moulues',
  'fondu', 'fondus', 'fondue', 'fondues',
  'surgele', 'surgeles', 'surgelee', 'surgelees',
  'entier', 'entiers', 'entiere', 'entieres',
  // Contenants et formes génériques
  'morceau', 'morceaux', 'tranche', 'tranches',
  'filet', 'filets', 'branche', 'branches',
  'boite', 'boites', 'cube', 'cubes',
  'graine', 'graines', 'poudre', 'puree',
  'creme', 'sauce', 'huile', 'vinaigre',
  'pate', 'pates', 'bouillon', 'sirop', 'jus', 'zeste',
  'gousse', 'gousses', 'feuille', 'feuilles',
  'petit', 'petits', 'petite', 'petites',
  'gros', 'grosse', 'grosses', 'grand', 'grands', 'grande', 'grandes',
]);

// Faux amis composés de la cuisine française où le mot ne représente pas l'allergène
interface CompoundExclusion {
  compoundRegex: RegExp;
  excludedAllergenToken: string;
}

const COMPOUND_EXCLUSIONS: CompoundExclusion[] = [
  // La pomme de terre n'est pas une pomme (fruit)
  { compoundRegex: /\bpommes?\s+de\s+terre\b/i, excludedAllergenToken: 'pomme' },
  // Le lait de coco n'est pas du lait animal (lactose)
  { compoundRegex: /\blait\s+de\s+coco\b/i, excludedAllergenToken: 'lait' },
  // La crème de coco n'est pas de la crème animale
  { compoundRegex: /\bcreme\s+de\s+coco\b/i, excludedAllergenToken: 'creme' },
  // La noix de muscade n'est pas un fruit à coque (noix)
  { compoundRegex: /\bnoix\s+de\s+muscade\b/i, excludedAllergenToken: 'noix' },
  // Le pois chiche n'est pas un petit pois
  { compoundRegex: /\bpois\s+chiches?\b/i, excludedAllergenToken: 'pois' },
  // Le beurre de cacahuète n'est pas du beurre animal
  { compoundRegex: /\bbeurre\s+de\s+cacahu[eè]tes?\b/i, excludedAllergenToken: 'beurre' },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  const singleWordTokensSet = new Set<string>();
  const multiWordPhrasesSet = new Set<string>();
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

    // Traitement du nom de l'allergène saisi / sélectionné
    const rawTokens = tokenizeText(rawName);
    if (rawTokens.length === 1) {
      const tok = rawTokens[0];
      if (tok.length >= 3 && !ALLERGEN_STOP_TOKENS.has(tok)) {
        singleWordTokensSet.add(tok);
        singleWordTokensSet.add(stemWord(tok));
      }
    } else if (rawTokens.length > 1) {
      multiWordPhrasesSet.add(normName);
    }

    if (item.canonicalId) {
      canonicalIdSet.add(item.canonicalId);
      const canonIng = vocabById.get(item.canonicalId);
      if (canonIng) {
        if (canonIng.allergen) {
          activeFamilies.add(canonIng.allergen);
          familyByNameMap.set(normName, canonIng.allergen);
        }

        // Ajouter le nom canonique s'il est composé d'un seul mot
        const cTokens = tokenizeText(canonIng.canonicalName);
        if (cTokens.length === 1) {
          const tok = cTokens[0];
          if (tok.length >= 3 && !ALLERGEN_STOP_TOKENS.has(tok)) {
            singleWordTokensSet.add(tok);
            singleWordTokensSet.add(stemWord(tok));
          }
        } else if (cTokens.length > 1) {
          multiWordPhrasesSet.add(normalizeString(canonIng.canonicalName));
        }

        // Ajouter les alias canoniques (ex: pour "Arachides" -> "cacahuète", "beurre de cacahuète")
        (canonIng.aliases || []).forEach((alias) => {
          const normAlias = normalizeString(alias);
          normalizedNamesSet.add(normAlias);
          stemmedNamesSet.add(stemWord(normAlias));

          const aliasTokens = tokenizeText(alias);
          if (aliasTokens.length === 1) {
            // Synonyme direct en un mot (ex: "cebette", "ciboule", "cacahuète")
            const tok = aliasTokens[0];
            if (tok.length >= 3 && !ALLERGEN_STOP_TOKENS.has(tok)) {
              singleWordTokensSet.add(tok);
              singleWordTokensSet.add(stemWord(tok));
            }
          } else if (aliasTokens.length > 1) {
            // Locution multi-mots (ex: "oignon blanc", "beurre de cacahuète")
            multiWordPhrasesSet.add(normAlias);
          }
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

        const cTokens = tokenizeText(canonIng.canonicalName);
        if (cTokens.length === 1) {
          const tok = cTokens[0];
          if (tok.length >= 3 && !ALLERGEN_STOP_TOKENS.has(tok)) {
            singleWordTokensSet.add(tok);
            singleWordTokensSet.add(stemWord(tok));
          }
        } else if (cTokens.length > 1) {
          multiWordPhrasesSet.add(normalizeString(canonIng.canonicalName));
        }

        (canonIng.aliases || []).forEach((alias) => {
          const normAlias = normalizeString(alias);
          normalizedNamesSet.add(normAlias);
          stemmedNamesSet.add(stemWord(normAlias));

          const aliasTokens = tokenizeText(alias);
          if (aliasTokens.length === 1) {
            const tok = aliasTokens[0];
            if (tok.length >= 3 && !ALLERGEN_STOP_TOKENS.has(tok)) {
              singleWordTokensSet.add(tok);
              singleWordTokensSet.add(stemWord(tok));
            }
          } else if (aliasTokens.length > 1) {
            multiWordPhrasesSet.add(normAlias);
          }
        });
      }
    }
  });

  return {
    items: userAllergens || [],
    canonicalIdSet,
    normalizedNamesSet,
    stemmedNamesSet,
    tokensSet: singleWordTokensSet,
    singleWordTokensSet,
    multiWordPhrasesSet,
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

  // 4. Correspondance par expression multi-mots exacte (ex: "fruits de mer", "oignon rouge", "beurre de cacahuete")
  for (const phrase of prepared.multiWordPhrasesSet) {
    const regex = new RegExp(`(^|\\s)${escapeRegex(phrase)}(\\s|$)`, 'i');
    if (regex.test(normStr) || regex.test(rawNormStr)) {
      const family = prepared.familyByNameMap.get(phrase) || null;
      return {
        isAllergen: true,
        matchedAllergenName: resolvedName || rawName,
        allergenFamily: family,
      };
    }
  }

  // 5. Correspondance par tokens entiers d'identité allergène stricte
  // Ex: "huile d'arachide" -> token "arachide" dans singleWordTokensSet
  const rawTokens = tokenizeText(rawName);
  const resolvedTokens = tokenizeText(resolvedName);
  const allTokens = Array.from(new Set([...rawTokens, ...resolvedTokens]));

  for (const token of allTokens) {
    if (token.length >= 3 && !ALLERGEN_STOP_TOKENS.has(token)) {
      const stemTok = stemWord(token);
      if (prepared.singleWordTokensSet.has(token) || prepared.singleWordTokensSet.has(stemTok)) {
        // Disambiguation des faux amis composés (ex: "pommes de terre" n'est pas une "pomme")
        const matchedTok = prepared.singleWordTokensSet.has(token) ? token : stemTok;
        const stemMatched = stemWord(matchedTok);
        const isExcluded = COMPOUND_EXCLUSIONS.some(
          (exc) =>
            (exc.excludedAllergenToken === matchedTok || exc.excludedAllergenToken === stemMatched) &&
            (exc.compoundRegex.test(normStr) || exc.compoundRegex.test(rawNormStr))
        );

        if (!isExcluded) {
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
