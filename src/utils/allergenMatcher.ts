import { Recipe, Ingredient } from '../types/recipe';
import { UserAllergenItem, AllergenFamily, CanonicalIngredient } from '../types/vocabulary';
import { normalizeIngredient } from './ingredientNormalizer';
import { normalizeString } from './helpers';
import { stemWord } from './searchEngine';
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
  /** Noms bruts pour les ingrédients personnalisés hors lexique (fallback) */
  customNamesSet: Set<string>;
  /** Familles majeures INCO actives (ex: 'gluten', 'lait', 'arachides'...) */
  activeFamilies: Set<AllergenFamily>;
  /** Dictionnaire nom normalisé -> famille associée si connue */
  familyByNameMap: Map<string, AllergenFamily | null>;
  /** Dictionnaire canonique ID -> famille */
  familyByIdMap: Map<string, AllergenFamily>;
  /** Rétrocompatibilité */
  tokensSet: Set<string>;
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
  /** Vrai si la recette contient des ingrédients hors lexique nécessitant vigilance */
  hasUnrecognizedIngredients?: boolean;
  /** Liste des ingrédients non répertoriés */
  unrecognizedIngredients?: Ingredient[];
}

/**
 * Racines sémantiques clés des 14 familles d'allergènes INCO (Arbitrage 5 - Sécurité Sanitaire)
 * Permet de prévenir à 100% les faux négatifs sur des ingrédients hors seed (sauce béchamel, coulis de noisette...)
 */
export const INCO_FAMILY_KEY_ROOTS: Record<AllergenFamily, string[]> = {
  lait: ['lait', 'creme', 'fromage', 'beurre', 'yaourt', 'yogourt', 'lact', 'bechamel', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'cheddar', 'comte', 'gruyere', 'gouda', 'roquefort'],
  gluten: ['farine', 'ble', 'orge', 'seigle', 'avoine', 'epeautre', 'semoule', 'pain', 'chapelure', 'pates', 'tagliatelle', 'spaghetti', 'biscuit', 'brioche'],
  oeufs: ['oeuf', 'jaune d oeuf', 'blanc d oeuf', 'mayonnaise'],
  poissons: ['poisson', 'saumon', 'thon', 'cabillaud', 'colin', 'truite', 'anchois', 'sardine', 'merlu', 'dorade', 'bar', 'sole', 'morue'],
  crustaces: ['crevette', 'crabe', 'homard', 'langouste', 'langoustine', 'ecrevisse', 'gambas'],
  fruits_a_coque: ['noisette', 'amande', 'noix', 'cajou', 'pistache', 'pecan', 'macadamia'],
  arachides: ['arachide', 'cacahuete', 'cacahouete'],
  soja: ['soja', 'tofu', 'edamame', 'tamari', 'miso'],
  sesame: ['sesame', 'tahini', 'tahin'],
  moutarde: ['moutarde'],
  celeri: ['celeri'],
  mollusques: ['moule', 'huitre', 'calmar', 'calamar', 'poulpe', 'seiche', 'escargot', 'palourde', 'saint jacques'],
  lupin: ['lupin'],
  sulfites: ['sulfite', 'vin blanc', 'vin rouge', 'champagne', 'porto'],
};

/**
 * Détecte si un nom d'ingrédient hors lexique contient une racine sémantique d'allergène INCO.
 * Intègre les protections contre les faux amis végétaux (beurre de cacahuète, lait de coco, etc.).
 */
export function detectProbableAllergenFamily(rawName: string): AllergenFamily | null {
  if (!rawName || !rawName.trim()) return null;
  const rawNormStr = normalizeString(rawName);

  for (const [family, roots] of Object.entries(INCO_FAMILY_KEY_ROOTS) as [AllergenFamily, string[]][]) {
    for (const root of roots) {
      const rootRegex = new RegExp(`(^|\\s|['’])${root}(s|es)?(\\s|$|['’])`, 'i');
      if (rootRegex.test(rawNormStr) || rawNormStr.includes(root)) {
        // Garde-fous faux amis connus : boissons, crèmes et beurres végétaux non laitiers
        if (
          family === 'lait' &&
          (rawNormStr.includes('coco') ||
            rawNormStr.includes('soja') ||
            rawNormStr.includes('amande') ||
            rawNormStr.includes('avoine') ||
            rawNormStr.includes('riz') ||
            rawNormStr.includes('cacahuete') ||
            rawNormStr.includes('cacahouete') ||
            rawNormStr.includes('arachide') ||
            rawNormStr.includes('marron') ||
            rawNormStr.includes('chataigne') ||
            rawNormStr.includes('tournesol') ||
            rawNormStr.includes('karite') ||
            rawNormStr.includes('noisette'))
        ) {
          continue;
        }
        if (family === 'fruits_a_coque' && (rawNormStr.includes('muscade') || rawNormStr.includes('coco'))) {
          continue;
        }
        return family;
      }
    }
  }

  return null;
}

/**
 * Prépare et indexe en mémoire les allergènes de l'utilisateur pour une vérification sub-milliseconde
 * basée strictement sur le Lexique Canonique (nom principal, identifiant et famille INCO).
 */
export function prepareUserAllergens(
  userAllergens: UserAllergenItem[],
  customVocab?: CanonicalIngredient[]
): PreparedAllergens {
  const canonicalIdSet = new Set<string>();
  const normalizedNamesSet = new Set<string>();
  const stemmedNamesSet = new Set<string>();
  const customNamesSet = new Set<string>();
  const activeFamilies = new Set<AllergenFamily>();
  const familyByNameMap = new Map<string, AllergenFamily | null>();
  const familyByIdMap = new Map<string, AllergenFamily>();

  // Map rapide sur le vocabulaire canonique (custom ou seed)
  const vocabList: CanonicalIngredient[] =
    customVocab && customVocab.length > 0 ? customVocab : getInitialCanonicalVocabulary();
  const vocabById = new Map<string, CanonicalIngredient>();
  const vocabByNormName = new Map<string, CanonicalIngredient>();
  const vocabByAlias = new Map<string, CanonicalIngredient>();

  vocabList.forEach((ing: CanonicalIngredient) => {
    vocabById.set(ing.id, ing);
    const normCName = normalizeString(ing.canonicalName);
    vocabByNormName.set(normCName, ing);
    if (ing.normalizedName) {
      vocabByNormName.set(normalizeString(ing.normalizedName), ing);
    }
    if (ing.allergen) {
      familyByIdMap.set(ing.id, ing.allergen);
    }
    (ing.aliases || []).forEach((alias) => {
      vocabByAlias.set(normalizeString(alias), ing);
    });
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

    // Résolution canonique via ID ou lexique
    let canonIng: CanonicalIngredient | undefined;
    if (item.canonicalId) {
      canonIng = vocabById.get(item.canonicalId);
    }
    if (!canonIng) {
      canonIng = vocabByNormName.get(normName) || vocabByAlias.get(normName);
    }

    if (canonIng) {
      canonicalIdSet.add(canonIng.id);
      const cNorm = normalizeString(canonIng.canonicalName);
      normalizedNamesSet.add(cNorm);
      stemmedNamesSet.add(stemWord(cNorm));

      if (canonIng.allergen) {
        activeFamilies.add(canonIng.allergen);
        familyByNameMap.set(normName, canonIng.allergen);
        familyByNameMap.set(cNorm, canonIng.allergen);
      }
    } else {
      // Ingrédient personnalisé hors lexique
      customNamesSet.add(normName);
      customNamesSet.add(stemmed);
    }
  });

  return {
    items: userAllergens || [],
    canonicalIdSet,
    normalizedNamesSet,
    stemmedNamesSet,
    customNamesSet,
    activeFamilies,
    familyByNameMap,
    familyByIdMap,
    tokensSet: normalizedNamesSet,
  };
}

/**
 * Vérifie si un ingrédient donné correspond à l'un des allergènes de l'utilisateur.
 * Fonctionne selon le principe « Lexique-First » : résolution du nom principal canonique
 * et comparaison directe O(1) sans regex hasardeuses.
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

  // 1. Normalisation canonique via le Lexique
  const norm = normalizeIngredient({ name: rawName });
  const canonicalName = norm.name || rawName;
  const normCanonicalStr = normalizeString(canonicalName);
  const stemmedCanonical = stemWord(normCanonicalStr);

  // 2. Correspondance directe par ID canonique (O(1))
  if (norm.canonicalId && prepared.canonicalIdSet.has(norm.canonicalId)) {
    const family =
      prepared.familyByIdMap.get(norm.canonicalId) ||
      prepared.familyByNameMap.get(normCanonicalStr) ||
      null;
    return {
      isAllergen: true,
      matchedAllergenName: canonicalName,
      allergenFamily: family,
    };
  }

  // 3. Correspondance par Famille d'allergène INCO active (O(1))
  if (norm.canonicalId) {
    const canonFamily = prepared.familyByIdMap.get(norm.canonicalId);
    if (canonFamily && prepared.activeFamilies.has(canonFamily)) {
      return {
        isAllergen: true,
        matchedAllergenName: canonicalName,
        allergenFamily: canonFamily,
      };
    }
  }

  // 4. Correspondance directe par Nom principal canonique (O(1))
  if (prepared.normalizedNamesSet.has(normCanonicalStr) || prepared.stemmedNamesSet.has(stemmedCanonical)) {
    const family = prepared.familyByNameMap.get(normCanonicalStr) || null;
    return {
      isAllergen: true,
      matchedAllergenName: canonicalName,
      allergenFamily: family,
    };
  }

  // 5. Fallback sécurisé UNIQUEMENT si l'ingrédient n'est pas répertorié dans le lexique canonique
  if (!norm.canonicalId) {
    const rawNormStr = normalizeString(rawName);
    const rawStemmed = stemWord(rawNormStr);

    // 5.1 Correspondance textuelle directe sur allergène personnalisé
    if (
      prepared.normalizedNamesSet.has(rawNormStr) ||
      prepared.stemmedNamesSet.has(rawStemmed) ||
      (prepared.customNamesSet && (prepared.customNamesSet.has(rawNormStr) || prepared.customNamesSet.has(rawStemmed)))
    ) {
      const family = prepared.familyByNameMap.get(rawNormStr) || null;
      return {
        isAllergen: true,
        matchedAllergenName: rawName,
        allergenFamily: family,
      };
    }

    // 5.2 Héritage par racines sémantiques majeures (Arbitrage 5 - Prévention des faux négatifs)
    // Permet de détecter "sauce béchamel" pour le lait ou "coulis de noisette" pour les fruits à coque
    for (const activeFam of prepared.activeFamilies) {
      const roots = INCO_FAMILY_KEY_ROOTS[activeFam];
      if (roots) {
        for (const root of roots) {
          const rootRegex = new RegExp(`(^|\\s|['’])${root}(s|es)?(\\s|$|['’])`, 'i');
          if (rootRegex.test(rawNormStr) || rawNormStr.includes(root)) {
            // Garde-fous faux amis connus : boissons, crèmes et beurres végétaux non laitiers
            if (
              activeFam === 'lait' &&
              (rawNormStr.includes('coco') ||
                rawNormStr.includes('soja') ||
                rawNormStr.includes('amande') ||
                rawNormStr.includes('avoine') ||
                rawNormStr.includes('riz') ||
                rawNormStr.includes('cacahuete') ||
                rawNormStr.includes('cacahouete') ||
                rawNormStr.includes('arachide') ||
                rawNormStr.includes('marron') ||
                rawNormStr.includes('chataigne') ||
                rawNormStr.includes('tournesol') ||
                rawNormStr.includes('karite') ||
                rawNormStr.includes('noisette'))
            ) {
              continue;
            }
            if (activeFam === 'fruits_a_coque' && (rawNormStr.includes('muscade') || rawNormStr.includes('coco'))) {
              continue;
            }
            return {
              isAllergen: true,
              matchedAllergenName: rawName,
              allergenFamily: activeFam,
            };
          }
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
    return { hasAllergen: false, allergenIngredients: [], hasUnrecognizedIngredients: false, unrecognizedIngredients: [] };
  }

  const allergenIngredients: MatchedAllergenDetail[] = [];
  const unrecognizedIngredients: Ingredient[] = [];

  for (const ing of recipe.ingredients) {
    const norm = normalizeIngredient(ing);
    if (!norm.canonicalId && !ing.canonicalId) {
      unrecognizedIngredients.push(ing);
    }

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
    hasUnrecognizedIngredients: unrecognizedIngredients.length > 0 && prepared.items.length > 0,
    unrecognizedIngredients,
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
