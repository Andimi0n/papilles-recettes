import { Recipe, Difficulty, SortOption } from '../types/recipe';
import { normalizeString, stemWord, levenshteinDistance } from './helpers';
import { normalizeIngredient } from './ingredientNormalizer';
import { VocabularyService } from '../services/vocabularyService';

export { stemWord, levenshteinDistance };

/**
 * Mots vides ou termes génériques fréquents à ignorer dans l'indexation de recherche
 */
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux',
  'pour', 'avec', 'sans', 'dans', 'sur', 'par', 'a', 'd', 'l', 'ou',
  'recette', 'recettes', 'plat', 'plats', 'cuisine', 'cuisiner', 'preparation',
  'facile', 'moyen', 'difficile', 'faire', 'servir', 'deguster', 'maison'
]);

/**
 * Thésaurus culinaire français des synonymes et équivalences.
 */
const CULINARY_SYNONYM_GROUPS: string[][] = [
  // Pâtes & Féculents
  [
    'pate', 'pates', 'spaghetti', 'spaghettis', 'tagliatelle', 'tagliatelles',
    'penne', 'pennes', 'coquillette', 'coquillettes', 'macaroni', 'macaronis',
    'nouille', 'nouilles', 'lasagne', 'lasagnes', 'linguine', 'linguines',
    'fusilli', 'fusillis', 'tortellini', 'gnocchi', 'gnocchis', 'farfalle'
  ],
  // Riz & Risotto
  ['riz', 'risotto', 'basmati', 'arborio', 'jasmin'],
  // Pomme de terre
  ['pomme de terre', 'pommes de terre', 'patate', 'patates', 'pdt', 'puree', 'frite', 'frites', 'grenaille', 'grenailles'],
  // Semoule & Céréales
  ['semoule', 'couscous', 'quinoa', 'boulgour', 'polenta', 'avoine', 'ble'],
  // Pain
  ['pain', 'baguette', 'toast', 'mie', 'tartine', 'crouton', 'croutons'],

  // Volailles
  ['poulet', 'volaille', 'volailles', 'dinde', 'blanc de poulet', 'cuisse de poulet', 'filet de poulet', 'aiguillettes', 'coquelet', 'chapon', 'pintade'],
  // Boeuf & Viandes rouges
  ['boeuf', 'viande', 'viandes', 'steak', 'steaks', 'viande hachee', 'hache', 'bavette', 'entrecote', 'faux filet', 'rumsteck', 'paleron', 'bourguignon', 'carpaccio'],
  // Porc & Charcuterie
  ['porc', 'lardon', 'lardons', 'bacon', 'pancetta', 'jambon', 'jambon blanc', 'jambon cru', 'prosciutto', 'saucisse', 'saucisses', 'chipolata', 'merguez', 'chorizo'],
  // Veau & Agneau & Canard
  ['veau', 'escalope de veau'],
  ['agneau', 'gigot'],
  ['canard', 'magret'],

  // Poissons
  ['poisson', 'poissons', 'saumon', 'thon', 'cabillaud', 'colin', 'merlu', 'dorade', 'daurade', 'bar', 'loup', 'truite', 'maquereau', 'sardine', 'sardines', 'sole', 'églefin', 'lieu'],
  // Fruits de mer
  ['fruits de mer', 'crevette', 'crevettes', 'gambas', 'scampi', 'moule', 'moules', 'saint jacques', 'calamar', 'calamars', 'poulpe', 'seiche', 'crabe'],

  // Crème
  ['creme', 'cremes', 'creme fraiche', 'creme liquide', 'creme epaisse', 'fleurette'],
  // Fromages
  ['fromage', 'fromages', 'parmesan', 'mozzarella', 'mozza', 'gruyere', 'emmental', 'comte', 'chevre', 'feta', 'ricotta', 'mascarpone', 'cheddar', 'reblochon', 'raclette', 'burrata', 'pecorino', 'grana padano', 'gorgonzola', 'roquefort'],
  ['parmesan', 'grana padano', 'pecorino'],
  ['mozzarella', 'mozza', 'burrata'],
  ['gruyere', 'emmental', 'comte', 'beaufort'],
  ['chevre', 'fromage de chevre', 'buche de chevre'],

  // Matières grasses
  ['beurre', 'margarine', 'ghee'],
  ['huile', 'huiles', 'huile d olive', 'huile de tournesol', 'huile de colza', 'huile de sesame'],

  // Tomates
  ['tomate', 'tomates', 'coulis', 'sauce tomate', 'concentre de tomate', 'pulpe de tomate', 'tomates pelees', 'tomates cerises'],

  // Alliacés
  ['oignon', 'oignons', 'oignon jaune', 'oignon rouge', 'oignon blanc', 'cebette', 'ciboule'],
  ['echalote', 'echalotes'],
  ['ail', 'gousse d ail', 'gousses d ail', 'ails'],
  ['poireau', 'poireaux'],

  // Champignons
  ['champignon', 'champignons', 'champignons de paris', 'cepe', 'cepes', 'bolet', 'bolets', 'pleurote', 'pleurotes', 'girolle', 'girolles', 'shiitake'],

  // Légumes
  ['courgette', 'courgettes'],
  ['aubergine', 'aubergines'],
  ['poivron', 'poivrons', 'poivron rouge', 'poivron vert', 'poivron jaune'],
  ['carotte', 'carottes'],
  ['salade', 'laitue', 'mache', 'roquette', 'batavia'],
  ['epinard', 'epinards', 'pousses d epinard'],
  ['haricot', 'haricots', 'haricots verts'],
  ['avocat', 'avocats', 'guacamole'],
  ['brocoli', 'brocolis', 'chou fleur'],
  ['concombre', 'concombres'],

  // Herbes
  ['herbe', 'herbes', 'persil', 'coriandre', 'basilic', 'ciboulette', 'menthe', 'thym', 'romarin', 'origan', 'aneth', 'laurier'],

  // Pâtisserie / Sucré
  ['chocolat', 'cacao', 'chocolat noir', 'chocolat au lait', 'chocolat blanc'],
  ['sucre', 'cassonade', 'sucre roux', 'sucre glace', 'miel', 'sirop d erable'],
  ['vanille', 'extrait de vanille', 'gousse de vanille'],
  ['farine', 'farine de ble', 'fecule', 'maizena'],
  ['oeuf', 'oeufs', 'jaune d oeuf', 'blanc d oeuf'],
  ['lait', 'lait demi ecreme', 'lait entier', 'lait d amande', 'lait d avoine', 'lait de coco'],

  // Fruits
  ['citron', 'citrons', 'citron jaune', 'citron vert', 'lime'],
  ['pomme', 'pommes'],
  ['fraise', 'fraises', 'framboise', 'framboises', 'fruits rouges', 'myrtille', 'myrtilles'],
  ['banane', 'bananes'],

  // Épices & Condiments
  ['epice', 'epices', 'curry', 'cumin', 'paprika', 'curcuma', 'piment', 'cannelle', 'muscade', 'gingembre'],
  ['moutarde', 'moutarde de dijon', 'moutarde a l ancienne'],
  ['sauce soja', 'soja', 'tamari'],
  ['vinaigre', 'vinaigre balsamique', 'vinaigre de vin', 'vinaigre de cidre']
];

// Map pré-calculée mot -> liste des synonymes
const SYNONYM_INDEX = new Map<string, Set<string>>();

CULINARY_SYNONYM_GROUPS.forEach((group) => {
  const normGroup = group.map((w) => stemWord(w));
  normGroup.forEach((term) => {
    if (!SYNONYM_INDEX.has(term)) {
      SYNONYM_INDEX.set(term, new Set());
    }
    const set = SYNONYM_INDEX.get(term)!;
    normGroup.forEach((syn) => {
      if (syn !== term) set.add(syn);
    });
  });
});

/**
 * Retourne les synonymes culinaires pour un mot donné
 */
export function getSynonymsForWord(word: string): string[] {
  const stemmed = stemWord(word);
  const found = SYNONYM_INDEX.get(stemmed);
  return found ? Array.from(found) : [];
}

/**
 * Découpe une chaîne en tokens normalisés et nettoyés
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeString(text)
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  return normalized
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .map(stemWord);
}

/**
 * Récupère directement le canonicalId d'un mot s'il existe dans le lexique
 * (recherche exacte par id, nom normalisé ou alias officiel).
 */
export function getCanonicalIdForWord(word: string): string | undefined {
  if (!word || word.length < 2) return undefined;
  const clean = normalizeString(word);

  try {
    const vocabMapById = VocabularyService.getSyncMapById();
    const byId = vocabMapById.get(clean);
    if (byId) return byId.id;

    const vocabMapByNorm = VocabularyService.getSyncMapByNormName();
    const byNorm = vocabMapByNorm.get(clean);
    if (byNorm) return byNorm.id;

    const vocabMapByAlias = VocabularyService.getSyncMapByAlias();
    const byAlias = vocabMapByAlias.get(clean);
    if (byAlias) return byAlias.id;

    // Test singulier / pluriel direct
    const stem = stemWord(clean);
    const byStemNorm = vocabMapByNorm.get(stem);
    if (byStemNorm) return byStemNorm.id;
    const byStemAlias = vocabMapByAlias.get(stem);
    if (byStemAlias) return byStemAlias.id;

    if (clean.endsWith('s') && clean.length > 3) {
      const singular = clean.slice(0, -1);
      const bySingular = vocabMapByNorm.get(singular) || vocabMapByAlias.get(singular);
      if (bySingular) return bySingular.id;
    } else {
      const plural = clean + 's';
      const byPlural = vocabMapByNorm.get(plural) || vocabMapByAlias.get(plural);
      if (byPlural) return byPlural.id;
    }
  } catch {
    // Environnement sans stockage
  }

  return undefined;
}

/**
 * Vérifie si un token correspond à un mot réel et valide du lexique canonique,
 * du thésaurus de synonymes ou des mots vides culinaires.
 * Active le Typo Guard pour bloquer le fallback Levenshtein vers d'autres vrais mots
 * (ex: "poire" ne doit pas matcher "poivre", "pain" ne doit pas matcher "bain").
 */
export function isKnownCulinaryOrLexiconWord(token: string): boolean {
  if (!token || token.length < 2) return false;
  const clean = normalizeString(token);
  if (STOP_WORDS.has(clean)) return true;
  if (SYNONYM_INDEX.has(stemWord(clean))) return true;

  if (getCanonicalIdForWord(token)) {
    return true;
  }

  return false;
}

/**
 * Récupère les identifiants canoniques associés à un terme recherché en utilisant
 * le lexique canonique et les synonymes culinaires.
 */
export function resolveCanonicalIdsForToken(token: string, synonyms: string[] = []): Set<string> {
  const ids = new Set<string>();

  // 1. Terme direct
  const directId = getCanonicalIdForWord(token);
  if (directId) {
    ids.add(directId);
  }

  // 2. Synonymes culinaires (ex: "spaghetti" -> "pates", "fromage" -> "parmesan", "mozzarella"...)
  if (synonyms && synonyms.length > 0) {
    for (const syn of synonyms) {
      const synId = getCanonicalIdForWord(syn);
      if (synId) {
        ids.add(synId);
      }
    }
  }

  return ids;
}

/**
 * Évalue la qualité de correspondance entre un token recherché et un token cible :
 * - Match exact : 1.0 (égalité stricte ou synonyme exact)
 * - Préfixe strict : 0.7 (la cible commence par la requête, ex: "choc" -> "chocolat")
 * - Sous-chaîne / composé : 0.4 (la cible contient la requête, ex: "poireau" pour "poire", min 4 lettres)
 * - Faute de frappe Levenshtein : 0.15 (lettre manquante ou coquille, si le mot n'est PAS un vrai mot connu)
 * - Aucune correspondance : 0
 */
export function getTokenMatchQuality(
  queryToken: string,
  targetToken: string,
  synonyms: string[] = [],
  isKnownLexiconWord = false
): number {
  if (!queryToken || !targetToken) return 0;
  if (queryToken === targetToken) return 1.0;

  // Match exact via synonyme culinaire
  if (synonyms.length > 0 && synonyms.some((s) => s === targetToken)) {
    return 1.0;
  }

  const qLen = queryToken.length;
  const tLen = targetToken.length;

  // 1. Préfixe strict : target commence par query (ex: "choc" -> "chocolat")
  if (qLen >= 3 && targetToken.startsWith(queryToken)) {
    return 0.7;
  }
  if (synonyms.length > 0 && synonyms.some((s) => s.length >= 3 && targetToken.startsWith(s))) {
    return 0.7;
  }

  // 2. Sous-mot / composé (min 4 lettres pour éviter les faux-amis courts comme "ail" dans "volaille")
  if (qLen >= 4 && targetToken.includes(queryToken)) {
    return 0.4;
  }
  if (synonyms.length > 0 && synonyms.some((s) => s.length >= 4 && targetToken.includes(s))) {
    return 0.4;
  }

  // 3. Faute de frappe Levenshtein :
  // Si le mot est un vrai mot connu du lexique (ex: "poire"), le Typo Guard bloque le Levenshtein vers "poivre"
  if (isKnownLexiconWord) {
    return 0;
  }

  // Tolérance aux fautes de frappe réservée aux mots inconnus (ex: "courgete", "champinon")
  if (qLen < 4 || targetToken[0] !== queryToken[0]) {
    return 0;
  }

  const lenDiff = Math.abs(qLen - tLen);
  if (lenDiff > 2) return 0;

  const dist = levenshteinDistance(queryToken, targetToken);

  if (qLen <= 6) {
    if (dist <= 1) return 0.15;
  } else {
    if (dist <= 2) return 0.15;
  }

  return 0;
}

/**
 * Vérifie si un token saisi correspond à un mot cible (rétrocompatibilité).
 */
export function isFuzzyOrTypoMatch(queryToken: string, targetToken: string): boolean {
  return getTokenMatchQuality(queryToken, targetToken) > 0;
}

/**
 * Vérifie si un synonyme correspond à un mot cible (match strict ou préfixe/sous-chaîne)
 */
function isSynonymMatch(synonymToken: string, targetToken: string): boolean {
  if (synonymToken === targetToken) return true;
  if (!synonymToken || !targetToken) return false;

  if (synonymToken.length >= 3 && targetToken.includes(synonymToken)) {
    return true;
  }
  if (targetToken.length >= 3 && synonymToken.includes(targetToken)) {
    return true;
  }

  return false;
}

/**
 * Vérifie si un mot de requête (ou ses synonymes) matche une liste de tokens d'un champ
 */
export function tokenMatchesTargetTokens(queryToken: string, targetTokens: string[]): boolean {
  if (targetTokens.length === 0) return false;

  for (const target of targetTokens) {
    if (getTokenMatchQuality(queryToken, target) > 0) {
      return true;
    }
  }

  const synonyms = getSynonymsForWord(queryToken);
  if (synonyms.length > 0) {
    for (const syn of synonyms) {
      for (const target of targetTokens) {
        if (isSynonymMatch(syn, target)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Version évitant de re-résoudre les synonymes à chaque champ
 */
export function tokenMatchesTargetTokensWithSynonyms(
  queryToken: string,
  synonyms: string[],
  targetTokens: string[]
): boolean {
  if (targetTokens.length === 0) return false;

  for (const target of targetTokens) {
    if (getTokenMatchQuality(queryToken, target, synonyms) > 0) {
      return true;
    }
  }

  return false;
}

export interface RecipeSearchResult {
  recipe: Recipe;
  score: number;
  matchedTokensCount: number;
  totalTokensCount: number;
  matchedIngredients: string[];
}

interface CachedIngredientSearchData {
  name: string;
  canonicalId?: string;
  tokens: string[];
}

interface CachedRecipeSearchTokens {
  titleTokens: string[];
  descTokens: string[];
  ingredients: CachedIngredientSearchData[];
}

/**
 * Cache mémoire O(1) des tokens de recettes.
 * Utilise WeakMap pour un ramasse-miettes automatique sans risque de fuite mémoire.
 */
const RECIPE_SEARCH_INDEX_CACHE = new WeakMap<Recipe, CachedRecipeSearchTokens>();

function getOrIndexRecipeTokens(recipe: Recipe): CachedRecipeSearchTokens {
  let cached = RECIPE_SEARCH_INDEX_CACHE.get(recipe);
  if (!cached) {
    const ingredients: CachedIngredientSearchData[] = (recipe.ingredients || []).map((ing) => {
      let canonicalId = ing.canonicalId;
      if (!canonicalId && ing.name) {
        try {
          const norm = normalizeIngredient({ name: ing.name });
          canonicalId = norm.canonicalId;
        } catch {
          // Ignorer
        }
      }
      return {
        name: ing.name,
        canonicalId,
        tokens: tokenizeText(ing.name),
      };
    });

    cached = {
      titleTokens: tokenizeText(recipe.title || ''),
      descTokens: tokenizeText(recipe.description || ''),
      ingredients,
    };
    RECIPE_SEARCH_INDEX_CACHE.set(recipe, cached);
  }
  return cached;
}

/**
 * Moteur de recherche intelligent de recettes.
 * - Multi-mots / multi-ingrédients (ex: "poulet tomate", "creme lardon")
 * - Titre : +30 pts par token avec pondération graduée (Exact: 1.0, Préfixe: 0.7, Sous-mot: 0.4, Typo: 0.15)
 * - Ingrédients : +15 pts par ingrédient matché. Résolution Lexique-First par canonicalId (avec synonymes).
 *   Si aucun canonicalId n'est trouvé pour le terme recherché, repli sur la pondération.
 * - Description : +5 pts par token avec pondération
 * - Tags : exclus du scoring rapide
 * - Bonus "Tous les mots trouvés" : +50 pts (ou ratio si partiel)
 * - Tri par pertinence
 */
export function searchRecipes(recipes: Recipe[], queryString: string): RecipeSearchResult[] {
  if (!queryString || !queryString.trim()) {
    return recipes.map((r) => ({
      recipe: r,
      score: 1,
      matchedTokensCount: 0,
      totalTokensCount: 0,
      matchedIngredients: [],
    }));
  }

  const queryTokens = tokenizeText(queryString);
  if (queryTokens.length === 0) {
    return recipes.map((r) => ({
      recipe: r,
      score: 1,
      matchedTokensCount: 0,
      totalTokensCount: 0,
      matchedIngredients: [],
    }));
  }

  // Pré-résolution des tokens de recherche :
  // - Synonymes culinaires
  // - Statut dans le lexique (Typo Guard)
  // - Résolution des canonicalId via le lexique et les synonymes
  const preparedQueryTokens = queryTokens.map((qToken) => {
    const synonyms = getSynonymsForWord(qToken);
    const isKnownWord = isKnownCulinaryOrLexiconWord(qToken);
    const canonicalIds = resolveCanonicalIdsForToken(qToken, synonyms);
    return {
      token: qToken,
      synonyms,
      isKnownWord,
      canonicalIds,
    };
  });

  // Résolution optionnelle pour une expression multi-mots complète (ex: "pomme de terre", "creme fraiche")
  const fullQueryCanonicalId = queryTokens.length > 1
    ? normalizeIngredient({ name: queryString.trim() }).canonicalId
    : undefined;

  const results: RecipeSearchResult[] = [];

  recipes.forEach((recipe) => {
    const { titleTokens, descTokens, ingredients } = getOrIndexRecipeTokens(recipe);

    let matchedTokensForThisRecipe = 0;
    let score = 0;
    const matchedIngNames = new Set<string>();

    preparedQueryTokens.forEach(({ token: qToken, synonyms, isKnownWord, canonicalIds }) => {
      let tokenMatchedInRecipe = false;

      // 1. Titre : +30 points par token avec pondération (Piste 2)
      let bestTitleQuality = 0;
      for (const tToken of titleTokens) {
        const quality = getTokenMatchQuality(qToken, tToken, synonyms, isKnownWord);
        if (quality > bestTitleQuality) {
          bestTitleQuality = quality;
          if (bestTitleQuality === 1.0) break;
        }
      }
      if (bestTitleQuality > 0) {
        score += 30 * bestTitleQuality;
        tokenMatchedInRecipe = true;
      }

      // 2. Ingrédients : +15 points par ingrédient matché
      // Règle : lexique d'abord pour canonicalId (avec synonymes). Si non résolu, pondération.
      if (canonicalIds.size > 0 || (fullQueryCanonicalId && queryTokens.length > 1)) {
        // CAS A : Canonical ID trouvé via le lexique / synonymes
        ingredients.forEach((ing) => {
          const isCanonicalMatch = Boolean(
            (ing.canonicalId && canonicalIds.has(ing.canonicalId)) ||
            (fullQueryCanonicalId && ing.canonicalId === fullQueryCanonicalId)
          );
          // Sécurité pour ingrédient non catalogué : match exact de token uniquement
          const isFallbackExactTokenMatch = !ing.canonicalId && ing.tokens.includes(qToken);

          if (isCanonicalMatch || isFallbackExactTokenMatch) {
            score += 15;
            tokenMatchedInRecipe = true;
            matchedIngNames.add(ing.name);
          }
        });
      } else {
        // CAS B : Aucun canonical ID trouvé -> repli sur la pondération
        ingredients.forEach((ing) => {
          let bestIngQuality = 0;
          for (const iToken of ing.tokens) {
            const quality = getTokenMatchQuality(qToken, iToken, synonyms, isKnownWord);
            if (quality > bestIngQuality) {
              bestIngQuality = quality;
              if (bestIngQuality === 1.0) break;
            }
          }
          if (bestIngQuality > 0) {
            score += 15 * bestIngQuality;
            tokenMatchedInRecipe = true;
            matchedIngNames.add(ing.name);
          }
        });
      }

      // 3. Description : +5 points par token avec pondération
      let bestDescQuality = 0;
      for (const dToken of descTokens) {
        const quality = getTokenMatchQuality(qToken, dToken, synonyms, isKnownWord);
        if (quality > bestDescQuality) {
          bestDescQuality = quality;
          if (bestDescQuality === 1.0) break;
        }
      }
      if (bestDescQuality > 0) {
        score += 5 * bestDescQuality;
        tokenMatchedInRecipe = true;
      }

      if (tokenMatchedInRecipe) {
        matchedTokensForThisRecipe++;
      }
    });

    // 4. Tags : Enlevés du scoring (demandé explicitement)

    // Si au moins un terme recherché correspond
    if (matchedTokensForThisRecipe > 0) {
      // Bonus très important si TOUS les termes recherchés sont présents (+50 pts)
      if (matchedTokensForThisRecipe === queryTokens.length) {
        score += 50;
      } else {
        // Pondération si recherche multi-ingrédients partielle
        const matchRatio = matchedTokensForThisRecipe / queryTokens.length;
        score = score * matchRatio;
      }

      results.push({
        recipe,
        score,
        matchedTokensCount: matchedTokensForThisRecipe,
        totalTokensCount: queryTokens.length,
        matchedIngredients: Array.from(matchedIngNames),
      });
    }
  });

  // Tri par pertinence décroissante, puis alphabétique sur le titre
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.recipe.title.localeCompare(b.recipe.title);
  });

  return results;
}

/**
 * Vérifie si une recette contient un ingrédient donné en se basant sur le lexique canonique.
 */
export function recipeContainsIngredient(recipe: Recipe, targetIngredient: string): boolean {
  if (!targetIngredient || !targetIngredient.trim()) return true;
  if (!recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return false;
  }

  // 1. Résolution canonique de l'ingrédient cible
  const normTarget = normalizeIngredient({ name: targetIngredient });
  const targetCanonicalId = normTarget.canonicalId;
  const targetCanonicalName = normalizeString(normTarget.name || targetIngredient);
  const targetStem = stemWord(targetCanonicalName);

  return recipe.ingredients.some((ing) => {
    const normIng = normalizeIngredient({ name: ing.name });

    // A. Correspondance directe par identifiant canonique (O(1))
    if (targetCanonicalId && normIng.canonicalId) {
      if (normIng.canonicalId === targetCanonicalId) {
        return true;
      }
    }

    // B. Correspondance par nom principal canonique
    const ingCanonicalName = normalizeString(normIng.name || ing.name);
    if (ingCanonicalName === targetCanonicalName) {
      return true;
    }

    // C. Fallback uniquement si l'un des ingrédients n'a pas pu être résolu dans le lexique
    if (!targetCanonicalId || !normIng.canonicalId) {
      const ingStem = stemWord(ingCanonicalName);
      if (ingCanonicalName === targetCanonicalName || ingStem === targetStem) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Vérifie si une recette correspond à une liste d'ingrédients ciblés selon le mode 'all' (ET) ou 'any' (OU).
 */
export function recipeMatchesIngredients(
  recipe: Recipe,
  targetIngredients: string[],
  mode: 'all' | 'any' = 'all'
): boolean {
  if (!targetIngredients || targetIngredients.length === 0) return true;

  if (mode === 'all') {
    return targetIngredients.every((target) => recipeContainsIngredient(recipe, target));
  } else {
    return targetIngredients.some((target) => recipeContainsIngredient(recipe, target));
  }
}

/**
 * Vérifie si le temps total d'une recette (préparation + cuisson) correspond au filtre spécifié.
 * - mode 'max' (≤) : total <= targetMinutes (recettes rapides / moins d'une certaine durée)
 * - mode 'min' (≥) : total >= targetMinutes (recettes mijotées / plus d'une certaine durée)
 */
export function recipeMatchesTime(
  recipe: Recipe,
  targetMinutes: number | null | undefined,
  mode: 'max' | 'min' = 'max'
): boolean {
  if (targetMinutes === null || targetMinutes === undefined) return true;
  const total = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  if (mode === 'min') {
    return total >= targetMinutes;
  }
  return total <= targetMinutes;
}

/**
 * Vérifie si la difficulté d'une recette correspond à une des difficultés sélectionnées.
 */
export function recipeMatchesDifficulty(recipe: Recipe, difficulties: Difficulty[]): boolean {
  if (!difficulties || difficulties.length === 0) return true;
  return difficulties.includes(recipe.difficulty);
}

/**
 * Vérifie si une recette correspond aux tags sélectionnés.
 * - mode 'any' : la recette possède au moins un des tags sélectionnés
 * - mode 'all' : la recette possède TOUS les tags sélectionnés
 */
export function recipeMatchesTags(
  recipe: Recipe,
  targetTags: string[],
  mode: 'all' | 'any' = 'any'
): boolean {
  if (!targetTags || targetTags.length === 0) return true;
  if (!recipe.tags || recipe.tags.length === 0) return false;

  const normalizedRecipeTags = recipe.tags.map((t) => t.trim().toLowerCase());

  if (mode === 'all') {
    return targetTags.every((target) =>
      normalizedRecipeTags.includes(target.trim().toLowerCase())
    );
  } else {
    return targetTags.some((target) =>
      normalizedRecipeTags.includes(target.trim().toLowerCase())
    );
  }
}

/**
 * Comparateur de recettes respectant les règles métier de tri de Papilles :
 * - Stock ('stock') : d'abord ingrédients en stock (0 manquant, puis 1, 2...),
 *   en cas d'égalité d'abord note puis alphabétique sur le titre.
 * - Temps de préparation ('prep_time') : temps total croissant (préparation + cuisson),
 *   en cas d'égalité d'abord note puis alphabétique sur le titre.
 * - Date d'ajout ('recent') : date de création décroissante,
 *   en cas d'égalité d'abord note puis alphabétique sur le titre.
 * - Note ('rating_desc') : note décroissante,
 *   en cas d'égalité alphabétique sur le titre.
 * - Titre ('title') : alphabétique sur le titre, en cas d'égalité note décroissante.
 */
export function compareRecipes(
  a: Recipe,
  b: Recipe,
  sortBy: SortOption,
  doableRecipesMap?: Map<string, { missingIngredients: any[] }>
): number {
  const compareRatingThenTitle = (): number => {
    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
  };

  const compareTitle = (): number => {
    return (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
  };

  switch (sortBy) {
    case 'stock': {
      const getMissing = (r: Recipe): number => {
        if (doableRecipesMap) {
          const ev = doableRecipesMap.get(r.id);
          if (ev && Array.isArray(ev.missingIngredients)) {
            return ev.missingIngredients.length;
          }
        }
        return (r.ingredients || []).filter((i) => !i.isPantryStaple && !i.isOptional).length;
      };
      const missingA = getMissing(a);
      const missingB = getMissing(b);
      if (missingA !== missingB) {
        return missingA - missingB;
      }
      return compareRatingThenTitle();
    }

    case 'prep_time': {
      const timeA = (a.prepTimeMinutes || 0) + (a.cookTimeMinutes || 0);
      const timeB = (b.prepTimeMinutes || 0) + (b.cookTimeMinutes || 0);
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return compareRatingThenTitle();
    }

    case 'recent': {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return compareRatingThenTitle();
    }

    case 'rating_desc': {
      const ratingA = typeof a.rating === 'number' ? a.rating : 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      return compareTitle();
    }

    case 'rating_asc': {
      const ratingA = typeof a.rating === 'number' ? a.rating : 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : 0;
      if (ratingA !== ratingB) {
        return ratingA - ratingB;
      }
      return compareTitle();
    }

    case 'title': {
      const titleCmp = compareTitle();
      if (titleCmp !== 0) {
        return titleCmp;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    }

    default:
      return compareRatingThenTitle();
  }
}
