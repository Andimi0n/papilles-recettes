import { Recipe, Difficulty } from '../types/recipe';
import { normalizeString } from './helpers';
import { normalizeIngredient } from './ingredientNormalizer';

/**
 * Calcule la distance de Levenshtein entre deux chaînes normalisées.
 * Optimisé en mémoire O(min(M, N)).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }

  const aLen = a.length;
  const bLen = b.length;
  let prevRow = new Array(aLen + 1);
  let currRow = new Array(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    currRow[0] = j;
    const bChar = b[j - 1];

    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === bChar ? 0 : 1;
      currRow[i] = Math.min(
        currRow[i - 1] + 1,      // insertion
        prevRow[i] + 1,          // suppression
        prevRow[i - 1] + cost    // substitution
      );
    }

    for (let i = 0; i <= aLen; i++) {
      prevRow[i] = currRow[i];
    }
  }

  return prevRow[aLen];
}

/**
 * Normalisation avancée pour la recherche :
 * - Minuscules, sans accents
 * - Stemming simple pour le français (pluriels en -s, -x, etc.)
 */
export function stemWord(word: string): string {
  const clean = normalizeString(word);
  if (clean.length <= 3) return clean;

  // Pluriels irréguliers courants
  if (clean === 'oeufs') return 'oeuf';
  if (clean === 'yeux') return 'oeil';
  if (clean === 'ails') return 'ail';

  // Pluriel en -x (gateaux -> gateau, choux -> chou, morceaux -> morceau)
  if (clean.endsWith('x') && clean.length > 4) {
    return clean.slice(0, -1);
  }

  // Pluriel en -s (tomates -> tomate, carottes -> carotte, lardons -> lardon)
  if (clean.endsWith('s') && clean.length > 3) {
    return clean.slice(0, -1);
  }

  return clean;
}

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
 * Vérifie si un token saisi par l'utilisateur correspond à un mot de la recette :
 * - Égalité exacte
 * - Préfixe (ex: "choc" -> "chocolat")
 * - Tolérance aux fautes de frappe (lettre manquante, coquille)
 */
export function isFuzzyOrTypoMatch(queryToken: string, targetToken: string): boolean {
  if (queryToken === targetToken) return true;
  if (!queryToken || !targetToken) return false;

  const qLen = queryToken.length;
  const tLen = targetToken.length;

  // Préfixe : target commence par query (ex: "parm" -> "parmesan")
  if (qLen >= 3 && targetToken.startsWith(queryToken)) {
    return true;
  }

  // Sous-chaîne directe
  if (qLen >= 3 && targetToken.includes(queryToken)) {
    return true;
  }

  // Tolérance aux fautes de frappe (ex: "tomte" pour "tomate", "champinon" pour "champignon")
  // Pour éviter les faux positifs, requiert au minimum 4 lettres et la même première lettre
  if (qLen < 4 || targetToken[0] !== queryToken[0]) {
    return false;
  }

  const lenDiff = Math.abs(qLen - tLen);
  if (lenDiff > 2) return false;

  const dist = levenshteinDistance(queryToken, targetToken);

  if (qLen <= 6) {
    return dist <= 1; // 1 lettre manquante ou erronée
  } else {
    return dist <= 2; // Jusqu'à 2 lettres pour les mots longs (ex: "courgete", "champinon")
  }
}

/**
 * Vérifie si un synonyme correspond à un mot cible (match strict ou préfixe/sous-chaîne)
 */
function isSynonymMatch(synonymToken: string, targetToken: string): boolean {
  if (synonymToken === targetToken) return true;
  if (!synonymToken || !targetToken) return false;

  // Si le synonyme est composé ou si l'ingrédient contient le synonyme
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
  // 1. Match direct ou avec tolérance faute de frappe
  for (const target of targetTokens) {
    if (isFuzzyOrTypoMatch(queryToken, target)) {
      return true;
    }
  }

  // 2. Match via synonymes culinaires (comparaison ciblée)
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

export interface RecipeSearchResult {
  recipe: Recipe;
  score: number;
  matchedTokensCount: number;
  totalTokensCount: number;
  matchedIngredients: string[];
}

/**
 * Moteur de recherche intelligent de recettes.
 * - Multi-mots / multi-ingrédients (ex: "poulet tomate", "creme lardon")
 * - Tolérance aux fautes de frappe / lettres manquantes ("tomte", "courgete")
 * - Synonymes et équivalences culinaires ("patate" -> "pomme de terre", "fromage" -> "parmesan")
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

  const results: RecipeSearchResult[] = [];

  recipes.forEach((recipe) => {
    const titleTokens = tokenizeText(recipe.title);
    const descTokens = tokenizeText(recipe.description);
    
    // Tokens par ingrédient pour identifier avec précision ceux qui correspondent
    const ingredientTokensMap = recipe.ingredients.map((ing) => ({
      name: ing.name,
      tokens: tokenizeText(ing.name),
    }));

    let matchedTokensForThisRecipe = 0;
    let score = 0;
    const matchedIngNames = new Set<string>();

    queryTokens.forEach((qToken) => {
      let tokenMatchedInRecipe = false;

      // 1. Titre (pondération prioritaire : 25 pts)
      if (tokenMatchesTargetTokens(qToken, titleTokens)) {
        score += 25;
        tokenMatchedInRecipe = true;
      }

      // 2. Ingrédients (pondération forte : 15 pts)
      ingredientTokensMap.forEach((ing) => {
        if (tokenMatchesTargetTokens(qToken, ing.tokens)) {
          score += 15;
          tokenMatchedInRecipe = true;
          matchedIngNames.add(ing.name);
        }
      });

      // 3. Description (pondération modérée : 5 pts)
      if (tokenMatchesTargetTokens(qToken, descTokens)) {
        score += 5;
        tokenMatchedInRecipe = true;
      }

      if (tokenMatchedInRecipe) {
        matchedTokensForThisRecipe++;
      }
    });

    // Si au moins un terme recherché correspond
    if (matchedTokensForThisRecipe > 0) {
      // Bonus très important si TOUS les termes recherchés sont présents
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

  // Tri par score de pertinence décroissant
  results.sort((a, b) => b.score - a.score);

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
 * Rétrocompatibilité : Vérifie si le temps total d'une recette est inférieur ou égal au maximum.
 */
export function recipeMatchesMaxTime(recipe: Recipe, maxTotalMinutes: number | null): boolean {
  return recipeMatchesTime(recipe, maxTotalMinutes, 'max');
}

/**
 * Vérifie si la difficulté d'une recette correspond à une des difficultés sélectionnées.
 */
export function recipeMatchesDifficulty(recipe: Recipe, difficulties: Difficulty[]): boolean {
  if (!difficulties || difficulties.length === 0) return true;
  return difficulties.includes(recipe.difficulty);
}
