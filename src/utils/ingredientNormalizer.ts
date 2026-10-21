import { NormalizationResult, CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { normalizeString } from './helpers';
import { stemWord, levenshteinDistance } from './searchEngine';

// Contenants et unités incorporés fréquemment dans le nom de l'ingrédient
const CONTAINER_PREFIXES: { regex: RegExp; unitLabel: string }[] = [
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|belles?|grandes?)?\s*(?:bo[iî]tes?\s+de?|bo[iî]tes?\s+d')\s*/i, unitLabel: 'boîte' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|beaux?|grands?)?\s*(?:bocaux|bocals?)\s+de?\s*/i, unitLabel: 'bocal' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|beaux?|grands?)?\s*(?:sachets?|paquets?)\s+de?\s*/i, unitLabel: 'sachet' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|belles?|grandes?)?\s*(?:barquettes?)\s+de?\s*/i, unitLabel: 'barquette' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:belles?|fines?|grosses?)?\s*(?:tranches?)\s+de?\s*/i, unitLabel: 'tranche' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:gousses?)\s+d['e]\s*/i, unitLabel: 'gousse' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:pinc[eé]es?)\s+de?\s*/i, unitLabel: 'pincée' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:brins?)\s+de?\s*/i, unitLabel: 'brin' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petits?|gros?|grands?)?\s*(?:pots?)\s+de?\s*/i, unitLabel: 'pot' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:petites?|grosses?|grandes?)?\s*(?:bouteilles?)\s+de?\s*/i, unitLabel: 'bouteille' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:tablettes?)\s+de?\s*/i, unitLabel: 'tablette' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:cubes?)\s+de?\s*/i, unitLabel: 'cube' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:feuilles?)\s+de?\s*/i, unitLabel: 'feuille' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:morceaux|morceau)\s+de?\s*/i, unitLabel: 'morceau' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:c\.\s*[aà]\s*soupe|cuill[eè]res?\s+[aà]\s+soupe)\s+de?\s*/i, unitLabel: 'c. à soupe' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:c\.\s*[aà]\s*caf[eé]|cuill[eè]res?\s+[aà]\s+caf[eé])\s+de?\s*/i, unitLabel: 'c. à café' },
  { regex: /^(?:une?|[0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?|\d+)?\s*(?:verres?|tasses?)\s+de?\s*/i, unitLabel: 'verre' },
  { regex: /^(?:un\s+)?(?:filet\s+d['e]|goutte\s+de)\s*/i, unitLabel: 'filet' },
];

// Préfixes de quantité au début du nom (ex: "2 carottes")
const LEADING_QUANTITY_REGEX = /^([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)\s+(.*)$/;

// Adjectifs et préparations culinaires superflus à élaguer dans le nom de l'ingrédient
const QUALIFIER_PATTERNS: RegExp[] = [
  /\s*\([^)]*\)/g, // Parenthèses descriptives ex: (coupés), (facultatif), (en dés)
  /\b(?:et\s+)?coup[eé]e?s?\s+en\s+d[eé]s\b/gi,
  /\b(?:et\s+)?coup[eé]e?s?\s+en\s+rondelles\b/gi,
  /\b(?:et\s+)?coup[eé]e?s?\s+en\s+lamelles\b/gi,
  /\b(?:et\s+)?coup[eé]e?s?\s+en\s+morceaux\b/gi,
  /\b(?:et\s+)?en\s+d[eé]s\b/gi,
  /\b(?:et\s+)?en\s+rondelles\b/gi,
  /\b(?:et\s+)?en\s+lamelles\b/gi,
  /\b(?:et\s+)?en\s+morceaux\b/gi,
  /\b(?:et\s+)?en\s+julienne\b/gi,
  /\bcoup[eé]e?s?\b/gi,
  /\b[eé]pluch[eé]e?s?\b/gi,
  /\br[aâ]p[eé]e?s?\b/gi,
  /\bhach[eé]e?s?\b/gi,
  /\b[eé]minc[eé]e?s?\b/gi,
  /\bcis[eé]l[eé]e?s?\b/gi,
  /\bpel[eé]e?s?\b/gi,
  /\bconcass[eé]e?s?\b/gi,
  /\bcuit(?:e|s|es)?\b/gi,
  /\bfondu(?:e|s|es)?\b/gi,
  /\bfrais\b|\bfra[iî]che?s?\b/gi,
  /\bsurgel[eé]e?s?\b/gi,
  /\ben\s+conserve\b/gi,
  /\ben\s+bo[iî]te\b/gi,
  /\bau\s+naturel\b/gi,
  /\ben\s+poudre\b/gi,
  /\bmoulu(?:e|s|es)?\b/gi,
  /\bd[eé]cortiqu[eé]e?s?\b/gi,
  /\bd[eé]noyaut[eé]e?s?\b/gi,
  /\bpr[eé]cuit(?:e|s|es)?\b/gi,
];

/**
 * Nettoie une chaîne brute pour la préparation de l'ingrédient
 */
function cleanRawIngredientString(raw: string): {
  cleaned: string;
  extractedQuantity?: string;
  extractedUnit?: string;
} {
  let str = raw.trim();
  let extractedQuantity: string | undefined;
  let extractedUnit: string | undefined;

  // 1. Extraire un éventuel nombre en tête (ex: "2 carottes")
  const leadMatch = str.match(LEADING_QUANTITY_REGEX);
  if (leadMatch) {
    extractedQuantity = leadMatch[1];
    str = leadMatch[2].trim();
  }

  // 2. Extraire les contenants (ex: "boîte de", "tranche de", "pincée de")
  for (const container of CONTAINER_PREFIXES) {
    if (container.regex.test(str)) {
      extractedUnit = container.unitLabel;
      str = str.replace(container.regex, '').trim();
      break;
    }
  }

  // 3. Supprimer les adjectifs et qualificatifs de préparation
  for (const pattern of QUALIFIER_PATTERNS) {
    str = str.replace(pattern, ' ');
  }

  // 4. Nettoyer les espaces résiduels, apostrophes, virgules ou tirets
  str = str
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+/, '')
    .replace(/[,.\s-]+$/, '')
    .trim();

  return {
    cleaned: str,
    extractedQuantity,
    extractedUnit,
  };
}

/**
 * Normalise un nom d'ingrédient individuel par rapport au vocabulaire canonique.
 * ATTENTION : Ce moteur s'applique EXCLUSIVEMENT aux ingrédients, jamais aux étapes de recettes.
 */
export function normalizeIngredient(raw: {
  name: string;
  quantity?: string;
  unit?: string;
}): NormalizationResult {
  const originalName = raw.name || '';
  if (!originalName.trim()) {
    return {
      name: '',
      quantity: raw.quantity,
      unit: raw.unit,
      originalName,
      wasNormalized: false,
    };
  }

  const { cleaned, extractedQuantity, extractedUnit } = cleanRawIngredientString(originalName);
  const finalQuantity = raw.quantity?.trim() || extractedQuantity;
  const finalUnit = raw.unit?.trim() || extractedUnit;

  const vocabList = VocabularyService.getSyncList();
  const normalizedCleaned = normalizeString(cleaned);
  const stemmedCleaned = stemWord(normalizedCleaned);

  // Étape A : Recherche exacte sur nom canonique ou alias
  for (const item of vocabList) {
    if (
      item.normalizedName === normalizedCleaned ||
      item.aliases.includes(normalizedCleaned) ||
      stemWord(item.normalizedName) === stemmedCleaned
    ) {
      return {
        name: item.canonicalName,
        quantity: finalQuantity,
        unit: finalUnit,
        originalName,
        wasNormalized: item.canonicalName !== originalName.trim(),
        canonicalId: item.id,
        matchedAlias: normalizedCleaned,
      };
    }
  }

  // Étape B : Recherche dans les alias composés (ex: "carotte epluchee" dans alias)
  for (const item of vocabList) {
    for (const alias of item.aliases) {
      if (
        normalizedCleaned.includes(alias) ||
        alias.includes(normalizedCleaned)
      ) {
        // Seulement si la correspondance couvre la majorité du terme
        const minLen = Math.min(alias.length, normalizedCleaned.length);
        const maxLen = Math.max(alias.length, normalizedCleaned.length);
        if (minLen / maxLen >= 0.7) {
          return {
            name: item.canonicalName,
            quantity: finalQuantity,
            unit: finalUnit,
            originalName,
            wasNormalized: true,
            canonicalId: item.id,
            matchedAlias: alias,
          };
        }
      }
    }
  }

  // Étape C : Fuzzy matching (Levenshtein) sur les mots principaux
  let bestMatch: CanonicalIngredient | null = null;
  let bestDistance = Infinity;

  for (const item of vocabList) {
    // Distance sur nom canonique normalisé
    const dist = levenshteinDistance(item.normalizedName, normalizedCleaned);
    const maxAllowed = normalizedCleaned.length > 5 ? 2 : 1;

    if (dist <= maxAllowed && dist < bestDistance) {
      bestDistance = dist;
      bestMatch = item;
    }
  }

  if (bestMatch) {
    return {
      name: bestMatch.canonicalName,
      quantity: finalQuantity,
      unit: finalUnit,
      originalName,
      wasNormalized: true,
      canonicalId: bestMatch.id,
    };
  }

  // Étape D : Repli élégant si l'ingrédient est inconnu du lexique
  // On formate au moins proprement le nom nettoyé (Majuscule en début)
  const formattedCleaned = cleaned
    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    : originalName.trim();

  return {
    name: formattedCleaned,
    quantity: finalQuantity,
    unit: finalUnit,
    originalName,
    wasNormalized: formattedCleaned !== originalName.trim(),
  };
}

/**
 * Normalise un tableau d'ingrédients complet (ex: résultat d'extraction IA, scan ou Marmiton).
 * Ne modifie que les ingrédients. Les étapes de préparation restent 100% intouchées.
 */
export function normalizeIngredients<T extends { name: string; quantity?: string; unit?: string }>(
  ingredients: T[]
): T[] {
  if (!Array.isArray(ingredients)) return [];

  return ingredients.map((ing) => {
    const res = normalizeIngredient(ing);
    return {
      ...ing,
      name: res.name,
      quantity: res.quantity || '',
      unit: res.unit || '',
    };
  });
}
