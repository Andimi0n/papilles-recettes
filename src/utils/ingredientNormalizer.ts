import { NormalizationResult, CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { isKnownDefaultPantryStaple } from '../data/canonicalVocabulary';
import { normalizeString } from './helpers';
import { stemWord, levenshteinDistance } from './searchEngine';

// Expressions indiquant un ingrédient facultatif ou décoratif (sur chaîne normalisée ou brute)
const OPTIONAL_REGEX = /\b(?:facultatif|facultative|optionnel|optionnelle|au choix|selon les gouts?|selon votre gout|pour decorer|pour servir)\b/i;

// Contenants et unités incorporés fréquemment (formulés sans accents pour compatibilité regex \b absolue)
const CONTAINER_PREFIXES: { regex: RegExp; unitLabel: string }[] = [
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|belles?|grandes?)?\s*(?:boites?\s+de?|boites?\s+d')\s*/i, unitLabel: 'boîte' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|beaux?|grands?)?\s*(?:bocaux|bocals?)\s+de?\s*/i, unitLabel: 'bocal' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|beaux?|grands?)?\s*(?:sachets?|paquets?)\s+de?\s*/i, unitLabel: 'sachet' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|belles?|grandes?)?\s*(?:barquettes?)\s+de?\s*/i, unitLabel: 'barquette' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:belles?|fines?|grosses?)?\s*(?:tranches?)\s+de?\s*/i, unitLabel: 'tranche' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:gousses?)\s+d['e]?\s*/i, unitLabel: 'gousse' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:pincees?)\s+de?\s*/i, unitLabel: 'pincée' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:brins?)\s+de?\s*/i, unitLabel: 'brin' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|grands?)?\s*(?:pots?)\s+de?\s*/i, unitLabel: 'pot' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|grandes?)?\s*(?:bouteilles?)\s+de?\s*/i, unitLabel: 'bouteille' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:tablettes?)\s+de?\s*/i, unitLabel: 'tablette' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:cubes?)\s+de?\s*/i, unitLabel: 'cube' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:feuilles?)\s+de?\s*/i, unitLabel: 'feuille' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:morceaux|morceau)\s+de?\s*/i, unitLabel: 'morceau' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:c\.?\s*a\s*soupe|cuilleres?\s+a\s+soupe)\s+de?\s*/i, unitLabel: 'c. à soupe' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:c\.?\s*a\s*cafe|cuilleres?\s+a\s+cafe)\s+de?\s*/i, unitLabel: 'c. à café' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:verres?|tasses?)\s+de?\s*/i, unitLabel: 'verre' },
  { regex: /^(?:un\s+)?(?:filet\s+d['e]?|goutte\s+de)\s*/i, unitLabel: 'filet' },
];

// Préfixes de quantité au début du nom (ex: "2 carottes")
const LEADING_QUANTITY_REGEX = /^([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)\s+(.*)$/;

// Adjectifs et découpes superflus formulés en minuscules sans accents
const QUALIFIER_PATTERNS: RegExp[] = [
  /\s*\([^)]*\)/g, // Parenthèses descriptives
  /\b(?:et\s+)?coupe?e?s?\s+en\s+des\b/gi,
  /\b(?:et\s+)?coupe?e?s?\s+en\s+rondelles\b/gi,
  /\b(?:et\s+)?coupe?e?s?\s+en\s+lamelles\b/gi,
  /\b(?:et\s+)?coupe?e?s?\s+en\s+morceaux\b/gi,
  /\b(?:et\s+)?en\s+des\b/gi,
  /\b(?:et\s+)?en\s+rondelles\b/gi,
  /\b(?:et\s+)?en\s+lamelles\b/gi,
  /\b(?:et\s+)?en\s+morceaux\b/gi,
  /\b(?:et\s+)?en\s+julienne\b/gi,
  /\bcoupe?e?s?\b/gi,
  /\bepluche?e?s?\b/gi,
  /\brape?e?s?\b/gi,
  /\bhache?e?s?\b/gi,
  /\bemince?e?s?\b/gi,
  /\bcisele?e?s?\b/gi,
  /\bpele?e?s?\b/gi,
  /\bconcasse?e?s?\b/gi,
  /\bcuit(?:e|s|es)?\b/gi,
  /\bfondu(?:e|s|es)?\b/gi,
  /\bfrais\b|\bfraiche?s?\b/gi,
  /\bsurgele?e?s?\b/gi,
  /\ben\s+conserve\b/gi,
  /\ben\s+boite\b/gi,
  /\bau\s+naturel\b/gi,
  /\ben\s+poudre\b/gi,
  /\bmoulu(?:e|s|es)?\b/gi,
  /\bdecortique?e?s?\b/gi,
  /\bdenoyaute?e?s?\b/gi,
  /\bprecuit(?:e|s|es)?\b/gi,
];

export function stemPhrase(str: string): string {
  const norm = normalizeString(str);
  if (!norm) return '';
  return norm.split(/\s+/).map(stemWord).join(' ');
}

/**
 * Extrait les quantités et contenants en tête de chaîne sans modifier les adjectifs
 */
function extractQuantityAndContainer(raw: string): {
  remainderNorm: string;
  extractedQuantity?: string;
  extractedUnit?: string;
} {
  let s = normalizeString(raw);
  let extractedQuantity: string | undefined;
  let extractedUnit: string | undefined;

  // 1. Extraire un éventuel nombre en tête (ex: "2 carottes")
  const leadMatch = s.match(LEADING_QUANTITY_REGEX);
  if (leadMatch) {
    extractedQuantity = leadMatch[1];
    s = leadMatch[2].trim();
  }

  // 2. Extraire les contenants (ex: "boite de", "tranche de", "pincee de")
  for (const container of CONTAINER_PREFIXES) {
    if (container.regex.test(s)) {
      extractedUnit = container.unitLabel;
      s = s.replace(container.regex, '').trim();
      break;
    }
  }

  s = s
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+/, '')
    .replace(/[,.\s-]+$/, '')
    .trim();

  return { remainderNorm: s, extractedQuantity, extractedUnit };
}

/**
 * Nettoie une chaîne brute pour la préparation de l'ingrédient (élagage complet des adjectifs & découpes)
 */
function cleanRawIngredientString(raw: string): {
  cleanedNorm: string;
  extractedQuantity?: string;
  extractedUnit?: string;
  extractedOptional?: boolean;
} {
  let norm = normalizeString(raw);
  let extractedOptional: boolean | undefined;

  // 0. Détecter si l'ingrédient est mentionné comme facultatif ou décoratif
  if (OPTIONAL_REGEX.test(norm)) {
    extractedOptional = true;
    norm = norm.replace(OPTIONAL_REGEX, ' ');
  }

  // 1 & 2. Extraire quantités et contenants
  const { remainderNorm, extractedQuantity, extractedUnit } = extractQuantityAndContainer(norm);
  norm = remainderNorm;

  // 3. Supprimer les adjectifs et qualificatifs de préparation
  for (const pattern of QUALIFIER_PATTERNS) {
    norm = norm.replace(pattern, ' ');
  }

  // 4. Nettoyer les espaces résiduels, apostrophes, virgules ou tirets
  norm = norm
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+/, '')
    .replace(/[,.\s-]+$/, '')
    .trim();

  return {
    cleanedNorm: norm,
    extractedQuantity,
    extractedUnit,
    extractedOptional,
  };
}

// Index mémoire accéléré O(1) pour le lexique
interface VocabLookupIndex {
  exactMap: Map<string, CanonicalIngredient>;
  stemMap: Map<string, CanonicalIngredient>;
}

let CACHED_VOCAB_REF: CanonicalIngredient[] | null = null;
let CACHED_LOOKUP_INDEX: VocabLookupIndex | null = null;

function getVocabLookupIndex(vocabList: CanonicalIngredient[]): VocabLookupIndex {
  if (CACHED_LOOKUP_INDEX && CACHED_VOCAB_REF === vocabList) {
    return CACHED_LOOKUP_INDEX;
  }

  const exactMap = new Map<string, CanonicalIngredient>();
  const stemMap = new Map<string, CanonicalIngredient>();

  vocabList.forEach((item) => {
    // 1. Nom canonique et normalisé
    const cNorm = normalizeString(item.canonicalName);
    exactMap.set(cNorm, item);
    stemMap.set(stemPhrase(cNorm), item);

    if (item.normalizedName) {
      const nNorm = normalizeString(item.normalizedName);
      exactMap.set(nNorm, item);
      stemMap.set(stemPhrase(nNorm), item);
    }

    // 2. Alias
    (item.aliases || []).forEach((alias) => {
      const aNorm = normalizeString(alias);
      if (aNorm) {
        exactMap.set(aNorm, item);
        stemMap.set(stemPhrase(aNorm), item);
      }
    });
  });

  CACHED_VOCAB_REF = vocabList;
  CACHED_LOOKUP_INDEX = { exactMap, stemMap };
  return CACHED_LOOKUP_INDEX;
}

// Cache mémoire pour accélérer les résolutions répétitives (O(1))
const NORMALIZATION_CACHE = new Map<string, NormalizationResult>();

export function clearNormalizationCache(): void {
  NORMALIZATION_CACHE.clear();
  CACHED_VOCAB_REF = null;
  CACHED_LOOKUP_INDEX = null;
}

/**
 * Normalise un nom d'ingrédient individuel par rapport au vocabulaire canonique.
 * Applique la cascade stricte « Lexique-First » :
 * 1. Lookup Direct Lexique O(1) : match exact direct (protège "Crème fraîche", "Légumes surgelés", "Poudre d'amande")
 * 2. Si échec : Élagage des préfixes de quantités et contenants uniquement ("1 pot de crème fraîche" -> "Crème fraîche")
 * 3. Si échec : Élagage des qualificatifs culinaires & découpes ("émincé", "en dés"...)
 * 4. Si échec : Stemming et approximations floues (Levenshtein contrôlé)
 * 5. Si échec : Repli hors lexique (canonicalId = undefined)
 * 
 * ATTENTION : Ce moteur s'applique EXCLUSIVEMENT aux ingrédients, jamais aux étapes de recettes.
 */
export function normalizeIngredient(raw: {
  name: string;
  canonicalId?: string;
  quantity?: string;
  unit?: string;
  isPantryStaple?: boolean;
  isOptional?: boolean;
}): NormalizationResult {
  const originalName = raw.name || '';
  if (!originalName.trim()) {
    return {
      name: '',
      quantity: raw.quantity,
      unit: raw.unit,
      originalName,
      wasNormalized: false,
      isPantryStaple: raw.isPantryStaple,
      isOptional: raw.isOptional,
    };
  }

  const cacheKey = `${originalName}__${raw.canonicalId || ''}__${raw.quantity || ''}__${raw.unit || ''}__${raw.isPantryStaple}__${raw.isOptional}`;
  const cached = NORMALIZATION_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const saveCache = (res: NormalizationResult): NormalizationResult => {
    if (NORMALIZATION_CACHE.size > 2000) {
      NORMALIZATION_CACHE.clear();
    }
    NORMALIZATION_CACHE.set(cacheKey, res);
    return res;
  };

  const vocabList = VocabularyService.getSyncList();
  const lookupIndex = getVocabLookupIndex(vocabList);

  const minNorm = normalizeString(originalName);

  // Détection optionnel
  const hasOptionalInName = OPTIONAL_REGEX.test(minNorm);
  const strippedNorm = minNorm.replace(OPTIONAL_REGEX, ' ').trim();

  const resolvedOptional =
    typeof raw.isOptional === 'boolean'
      ? raw.isOptional
      : Boolean(hasOptionalInName || (raw.unit && OPTIONAL_REGEX.test(normalizeString(raw.unit))));

  const resolveStaple = (item?: CanonicalIngredient, fallbackTerm?: string) => {
    if (typeof raw.isPantryStaple === 'boolean') {
      return raw.isPantryStaple;
    }
    if (item && typeof item.isPantryStaple === 'boolean') {
      return item.isPantryStaple;
    }
    return isKnownDefaultPantryStaple(item ? item.canonicalName : (fallbackTerm || originalName));
  };

  // =========================================================================
  // ÉTAPE 0 : Si un canonicalId valide est déjà fourni en amont
  // =========================================================================
  if (raw.canonicalId) {
    const existingById = vocabList.find((v) => v.id === raw.canonicalId);
    if (existingById) {
      return saveCache({
        name: existingById.canonicalName,
        quantity: raw.quantity,
        unit: raw.unit,
        originalName,
        wasNormalized: existingById.canonicalName !== originalName.trim(),
        canonicalId: existingById.id,
        isPantryStaple: resolveStaple(existingById),
        isOptional: resolvedOptional,
      });
    }
  }

  // =========================================================================
  // ÉTAPE 1 : LOOKUP DIRECT LEXIQUE (O(1)) - Le « Vrai » Lexique-First
  // Priorité absolue sur le terme brut normalisé typographiquement (sans regex destructive).
  // Garantit que "Crème fraîche", "Légumes surgelés", "Poudre d'amande", "Noix de muscade",
  // "Vin blanc" matchent IMMÉDIATEMENT sans aucune altération de leurs adjectifs constitutifs.
  // =========================================================================
  const directMatch = lookupIndex.exactMap.get(strippedNorm);
  if (directMatch) {
    return saveCache({
      name: directMatch.canonicalName,
      quantity: raw.quantity,
      unit: raw.unit,
      originalName,
      wasNormalized: directMatch.canonicalName !== originalName.trim(),
      canonicalId: directMatch.id,
      matchedAlias: strippedNorm,
      isPantryStaple: resolveStaple(directMatch),
      isOptional: resolvedOptional,
    });
  }

  // =========================================================================
  // ÉTAPE 2 : Élagage des Quantités & Contenants en tête uniquement
  // Ex: "1 pot de crème fraîche" -> quantité: "1", unité: "pot", reste: "crème fraîche"
  // Ex: "2 carottes" -> quantité: "2", reste: "carottes"
  // =========================================================================
  const { remainderNorm, extractedQuantity, extractedUnit } = extractQuantityAndContainer(strippedNorm);
  const containerMatch = lookupIndex.exactMap.get(remainderNorm);
  if (containerMatch) {
    const finalQuantity = raw.quantity?.trim() || extractedQuantity;
    const finalUnit = raw.unit?.trim() || extractedUnit;
    return saveCache({
      name: containerMatch.canonicalName,
      quantity: finalQuantity,
      unit: finalUnit,
      originalName,
      wasNormalized: containerMatch.canonicalName !== originalName.trim(),
      canonicalId: containerMatch.id,
      matchedAlias: remainderNorm,
      isPantryStaple: resolveStaple(containerMatch),
      isOptional: resolvedOptional,
    });
  }

  // =========================================================================
  // ÉTAPE 3 : Élagage des Qualificatifs culinaires & découpes (cleanRawIngredientString)
  // Ex: "2 oignons blancs émincés" -> extrait "2", découpe "émincés" -> reste "oignons blancs"
  // =========================================================================
  const { cleanedNorm, extractedQuantity: qClean, extractedUnit: uClean } = cleanRawIngredientString(strippedNorm);
  const finalQuantity = raw.quantity?.trim() || extractedQuantity || qClean;
  const finalUnit = raw.unit?.trim() || extractedUnit || uClean;

  const cleanedMatch = lookupIndex.exactMap.get(cleanedNorm);
  if (cleanedMatch) {
    return saveCache({
      name: cleanedMatch.canonicalName,
      quantity: finalQuantity,
      unit: finalUnit,
      originalName,
      wasNormalized: cleanedMatch.canonicalName !== originalName.trim(),
      canonicalId: cleanedMatch.id,
      matchedAlias: cleanedNorm,
      isPantryStaple: resolveStaple(cleanedMatch),
      isOptional: resolvedOptional,
    });
  }

  // =========================================================================
  // ÉTAPE 4 : Stemming & Approximations Floues (Levenshtein contrôlé)
  // =========================================================================
  // 4.1 Stemming exact par phrase sur la chaîne nettoyée
  const stemmedCleaned = stemPhrase(cleanedNorm);
  const stemMatch = lookupIndex.stemMap.get(stemmedCleaned);
  if (stemMatch) {
    return saveCache({
      name: stemMatch.canonicalName,
      quantity: finalQuantity,
      unit: finalUnit,
      originalName,
      wasNormalized: stemMatch.canonicalName !== originalName.trim(),
      canonicalId: stemMatch.id,
      matchedAlias: stemmedCleaned,
      isPantryStaple: resolveStaple(stemMatch),
      isOptional: resolvedOptional,
    });
  }

  // 4.2 Stemming direct sur le terme minimal non-élagué (ex: "oignons" -> "oignon")
  const stemmedMin = stemPhrase(strippedNorm);
  const stemMinMatch = lookupIndex.stemMap.get(stemmedMin);
  if (stemMinMatch) {
    return saveCache({
      name: stemMinMatch.canonicalName,
      quantity: raw.quantity,
      unit: raw.unit,
      originalName,
      wasNormalized: stemMinMatch.canonicalName !== originalName.trim(),
      canonicalId: stemMinMatch.id,
      matchedAlias: stemmedMin,
      isPantryStaple: resolveStaple(stemMinMatch),
      isOptional: resolvedOptional,
    });
  }

  // 4.3 Recherche dans les alias composés (couverture >= 70%)
  for (const item of vocabList) {
    for (const alias of item.aliases) {
      const aNorm = normalizeString(alias);
      if (cleanedNorm.includes(aNorm) || aNorm.includes(cleanedNorm)) {
        const minLen = Math.min(aNorm.length, cleanedNorm.length);
        const maxLen = Math.max(aNorm.length, cleanedNorm.length);
        if (minLen / maxLen >= 0.7) {
          return saveCache({
            name: item.canonicalName,
            quantity: finalQuantity,
            unit: finalUnit,
            originalName,
            wasNormalized: true,
            canonicalId: item.id,
            matchedAlias: alias,
            isPantryStaple: resolveStaple(item),
            isOptional: resolvedOptional,
          });
        }
      }
    }
  }

  // 4.4 Fuzzy matching Levenshtein contrôlé (interdit pour les mots courts <= 3 lettres pour éviter eau -> veau, sel -> miel)
  if (cleanedNorm.length >= 4) {
    let bestMatch: CanonicalIngredient | null = null;
    let bestDistance = Infinity;

    for (const item of vocabList) {
      const dist = levenshteinDistance(item.normalizedName, cleanedNorm);
      const maxAllowed = cleanedNorm.length >= 7 ? 2 : 1;

      if (dist <= maxAllowed && dist < bestDistance) {
        bestDistance = dist;
        bestMatch = item;
      }
    }

    if (bestMatch) {
      return saveCache({
        name: bestMatch.canonicalName,
        quantity: finalQuantity,
        unit: finalUnit,
        originalName,
        wasNormalized: true,
        canonicalId: bestMatch.id,
        isPantryStaple: resolveStaple(bestMatch),
        isOptional: resolvedOptional,
      });
    }
  }

  // =========================================================================
  // ÉTAPE 5 : Repli Hors Lexique (canonicalId = undefined)
  // Formate au moins proprement le nom nettoyé avec une majuscule au début
  // =========================================================================
  const fallbackTerm = cleanedNorm || originalName.trim();
  const formattedCleaned = fallbackTerm
    ? fallbackTerm.charAt(0).toUpperCase() + fallbackTerm.slice(1)
    : originalName.trim();

  return saveCache({
    name: formattedCleaned,
    quantity: finalQuantity,
    unit: finalUnit,
    originalName,
    wasNormalized: formattedCleaned !== originalName.trim(),
    isPantryStaple: resolveStaple(undefined, fallbackTerm),
    isOptional: resolvedOptional,
  });
}

/**
 * Normalise un tableau d'ingrédients complet (ex: résultat d'extraction IA, scan ou Marmiton).
 * Ne modifie que les ingrédients. Les étapes de préparation restent 100% intouchées.
 * Propage scrupuleusement le `canonicalId` résolu.
 */
export function normalizeIngredients<
  T extends {
    name: string;
    canonicalId?: string;
    quantity?: string;
    unit?: string;
    isPantryStaple?: boolean;
    isOptional?: boolean;
  }
>(ingredients: T[]): T[] {
  if (!Array.isArray(ingredients)) return [];

  return ingredients.map((ing) => {
    const res = normalizeIngredient(ing);
    return {
      ...ing,
      name: res.name,
      canonicalId: res.canonicalId,
      quantity: res.quantity || '',
      unit: res.unit || '',
      isPantryStaple: res.isPantryStaple,
      isOptional: res.isOptional,
    };
  });
}
