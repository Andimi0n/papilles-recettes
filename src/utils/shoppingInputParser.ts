import { ShoppingAisle, ShoppingItem } from '../types/shopping';
import { normalizeUnit, isStandardUnit } from '../constants/units';
import { classifyIngredientAisle } from './aisleClassifier';
import { VocabularyService } from '../services/vocabularyService';
import { normalizeIngredient } from './ingredientNormalizer';
import { generateUniqueId } from './helpers';

export interface ParsedShoppingItem {
  name: string;
  quantity?: string;
  unit?: string;
  canonicalId?: string;
  aisle: ShoppingAisle;
  isPantryStaple?: boolean;
  isOptional?: boolean;
}

/**
 * Table de conversion des fractions typographiques Unicode
 */
const UNICODE_FRACTIONS: { [key: string]: string } = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

function convertUnicodeFractions(str: string): string {
  let res = str;
  for (const [unicode, frac] of Object.entries(UNICODE_FRACTIONS)) {
    res = res.replace(new RegExp(unicode, 'g'), ` ${frac} `);
  }
  return res.replace(/\s+/g, ' ').trim();
}

/**
 * Met en majuscule la première lettre d'une chaîne
 */
function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Nettoie les prépositions en tête de nom d'ingrédient ("de carottes" -> "carottes", "d'ail" -> "ail")
 */
function stripLeadingPrepositions(str: string): string {
  return str.replace(/^(?:de\s+|d['’])\s*/i, '').trim();
}

/**
 * Regex pour capturer une quantité numérique en tête (ex: "1", "2.5", "1,5", "1/2", "2-3")
 */
const LEADING_NUMBER_REGEX = /^([0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?(?:\s*(?:-|–|à|a)\s*[0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?)?)\s*(.*)$/i;

/**
 * Regex pour capturer une quantité et unité en fin de chaîne (ex: "sauce tomate 500g", "lait 1L")
 */
const TRAILING_QTY_UNIT_REGEX = /^(.*?)\s+([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-ZÀ-ÿ\.]+)$/i;

/**
 * Analyse une chaîne de saisie libre pour la liste de courses et en extrait :
 * - Quantité
 * - Unité (normalisée si reconnue)
 * - Nom propre
 * - canonicalId (si reconnu dans le lexique culinaire)
 * - Rayon (officiel si lexique, sinon classifié automatiquement ou imposé par l'utilisateur)
 *
 * Exemples :
 * - "1kg carottes" -> { quantity: "1", unit: "kg", name: "Carotte", canonicalId: "ing_canon_carotte", aisle: "Fruits & Légumes" }
 * - "2 paquets de kinder bueno" -> { quantity: "2", unit: "paquet", name: "Kinder bueno", canonicalId: undefined, aisle: "Épicerie & Condiments" }
 * - "coca cola zero" -> { quantity: undefined, unit: undefined, name: "Coca cola zero", canonicalId: undefined, aisle: "Boissons" }
 */
export function parseShoppingInput(
  rawInput: string,
  preferredAisle?: ShoppingAisle | null
): ParsedShoppingItem {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      name: '',
      aisle: preferredAisle || 'Autre',
    };
  }

  // 1. Convertir les fractions Unicode
  let working = convertUnicodeFractions(trimmed);

  let extractedQuantity: string | undefined;
  let extractedUnit: string | undefined;
  let rawName = working;

  // 2. Tenter d'extraire quantité + unité en queue (ex: "sauce tomate 500g", "lait 1L")
  const trailingMatch = working.match(TRAILING_QTY_UNIT_REGEX);
  if (trailingMatch) {
    const potCandidateName = trailingMatch[1].trim();
    const potQty = trailingMatch[2].replace(',', '.');
    const potUnitCandidate = trailingMatch[3].trim();

    // On valide que le suffixe est bien une unité reconnue
    if (isStandardUnit(potUnitCandidate)) {
      extractedQuantity = potQty;
      extractedUnit = normalizeUnit(potUnitCandidate);
      rawName = potCandidateName;
    }
  }

  // 3. Si pas d'extraction en queue, tenter en tête (ex: "1kg carottes", "2 paquets de kinder", "6 oeufs")
  if (!extractedQuantity) {
    const leadingMatch = working.match(LEADING_NUMBER_REGEX);
    if (leadingMatch) {
      const numPart = leadingMatch[1].trim().replace(',', '.');
      const restPart = leadingMatch[2].trim();

      // Vérifier si restPart commence par une unité attachée ou détachée
      // Cas 3.1 : Unité attachée directement (ex: "1kg" suivi de "carottes" -> restPart commence par le mot unité)
      const words = restPart.split(/\s+/);
      const firstWord = words[0];
      const remainderAfterFirst = words.slice(1).join(' ').trim();
      const twoWords = words.slice(0, 2).join(' ');
      const threeWords = words.slice(0, 3).join(' ');

      // Tester dans l'ordre : 3 mots (ex: "cuillere a soupe"), 2 mots (ex: "c a cafe"), 1 mot (ex: "kg", "g")
      if (words.length >= 3 && isStandardUnit(threeWords)) {
        extractedQuantity = numPart;
        extractedUnit = normalizeUnit(threeWords);
        rawName = stripLeadingPrepositions(words.slice(3).join(' ').trim());
      } else if (words.length >= 2 && isStandardUnit(twoWords)) {
        extractedQuantity = numPart;
        extractedUnit = normalizeUnit(twoWords);
        rawName = stripLeadingPrepositions(words.slice(2).join(' ').trim());
      } else if (firstWord && isStandardUnit(firstWord)) {
        extractedQuantity = numPart;
        extractedUnit = normalizeUnit(firstWord);
        rawName = stripLeadingPrepositions(remainderAfterFirst);
      } else {
        // Ce n'est pas une unité, donc numPart est une quantité pure dénombrable (ex: "6 oeufs", "2 carottes")
        extractedQuantity = numPart;
        extractedUnit = undefined;
        rawName = stripLeadingPrepositions(restPart);
      }
    }
  }

  // 4. Nettoyage final du nom
  const cleanedName = stripLeadingPrepositions(rawName).trim() || trimmed;

  // 5. Résolution via le moteur de normalisation lexicale
  const norm = normalizeIngredient({ name: cleanedName });

  if (norm.canonicalId) {
    const vocabList = VocabularyService.getSyncList();
    const canon = vocabList.find((v) => v.id === norm.canonicalId);
    const finalAisle = preferredAisle || canon?.defaultAisle || classifyIngredientAisle(norm.name);

    return {
      name: norm.name,
      canonicalId: norm.canonicalId,
      quantity: extractedQuantity || norm.quantity,
      unit: extractedUnit || (norm.unit ? normalizeUnit(norm.unit) : undefined),
      aisle: finalAisle,
      isPantryStaple: norm.isPantryStaple,
      isOptional: norm.isOptional,
    };
  }

  // 6. Produit non répertorié au lexique (Kinder Bueno, Coca Cola, Lessive, etc.)
  // On ne pollue pas le lexique, on crée un article propre avec rayon auto-déterminé
  const autoAisle = preferredAisle || classifyIngredientAisle(cleanedName);

  return {
    name: capitalizeFirst(cleanedName),
    canonicalId: undefined,
    quantity: extractedQuantity,
    unit: extractedUnit ? normalizeUnit(extractedUnit) : undefined,
    aisle: autoAisle,
    isPantryStaple: norm.isPantryStaple,
    isOptional: norm.isOptional,
  };
}

export interface ParsedIngredientInput {
  name: string;
  quantity?: string;
  unit?: string;
  canonicalId?: string;
  isPantryStaple?: boolean;
  isOptional?: boolean;
}

/**
 * Analyse une saisie libre d'ingrédient de recette (ex: "250g farine", "3 oeufs", "sel")
 * et en extrait après coup la quantité, l'unité et le nom canonique/propre.
 */
export function parseRecipeIngredientInput(rawInput: string): ParsedIngredientInput {
  const parsed = parseShoppingInput(rawInput);
  return {
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
    canonicalId: parsed.canonicalId,
    isPantryStaple: parsed.isPantryStaple,
    isOptional: parsed.isOptional,
  };
}

/**
 * Crée un ShoppingItem complet prêt à être enregistré depuis une saisie libre
 */
export function createShoppingItemFromFreeform(
  rawInput: string,
  preferredAisle?: ShoppingAisle | null
): ShoppingItem | null {
  const parsed = parseShoppingInput(rawInput, preferredAisle);
  if (!parsed.name) return null;

  return {
    id: generateUniqueId('shop_item'),
    name: parsed.name,
    canonicalId: parsed.canonicalId,
    quantity: parsed.quantity,
    unit: parsed.unit,
    isChecked: false,
    aisle: parsed.aisle,
    createdAt: new Date().toISOString(),
  };
}
