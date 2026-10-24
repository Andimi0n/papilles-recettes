import { CanonicalIngredient, AllergenFamily } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';
import { VocabularyService } from './vocabularyService';
import { StorageService } from './storageService';
import { normalizeString } from '../utils/helpers';
import { stemWord, levenshteinDistance } from '../utils/searchEngine';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { classifyIngredientAisle } from '../utils/aisleClassifier';
import {
  FORBIDDEN_ISOLATED_ALIASES,
  getDefaultAllergen,
  isKnownDefaultPantryStaple,
} from '../data/canonicalVocabulary';
import { detectProbableAllergenFamily } from '../utils/allergenMatcher';

export interface ClosestCanonicalMatch {
  item: CanonicalIngredient;
  similarity: number;
  reason: 'exact_alias' | 'typo' | 'stem' | 'token_overlap' | 'family';
  label: string;
  matchedText: string;
}

export interface DropdownSuggestionItem {
  item: CanonicalIngredient;
  isFuzzySuggestion?: boolean;
  suggestionLabel?: string;
}

export interface NewIngredientCandidate {
  canonicalName: string;
  defaultAisle: ShoppingAisle;
  allergen?: AllergenFamily | null;
  isPantryStaple: boolean;
  aliases?: string[];
  allowPromoteAlias?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  formattedName?: string;
  parentOfAlias?: CanonicalIngredient;
}

/**
 * Normalisation phonétique simplifiée pour le français culinaire.
 * Permet de faire converger des graphies phonétiquement proches (ex: "voeu" -> "veau").
 */
export function frenchPhonetic(str: string): string {
  let s = normalizeString(str);
  if (!s) return '';
  // Équivalences voyelles phonétiques courantes en français
  s = s.replace(/oeu|eau|eaux|aux|au/g, 'o');
  s = s.replace(/ph/g, 'f');
  s = s.replace(/qu|ck|k/g, 'c');
  // Les diphtongues nasales composées doivent être évaluées avant les voyelles simples
  s = s.replace(/ain|ein|aim|in|yn|ym/g, 'in');
  s = s.replace(/ai|ei|ez|er|et/g, 'e');
  s = s.replace(/an|am|en|em/g, 'an');
  s = s.replace(/on|om/g, 'on');
  s = s.replace(/ou/g, 'u');
  s = s.replace(/ch|sh/g, 'x');
  s = s.replace(/gu(?=[eiaou])/g, 'g');
  // Éliminer les consonnes doubles répétées
  s = s.replace(/(.)\1+/g, '$1');
  return s;
}

/**
 * Suggestions d'indispensables du quotidien 100% alignées sur le lexique canonique.
 * Partagées entre les Étagères (stock) et la Liste de courses.
 */
export const CANONICAL_QUICK_SUGGESTIONS = [
  'Œufs',
  'Beurre',
  'Lait',
  'Farine',
  'Pâtes',
  'Riz',
  'Huile d\'olive',
  'Crème fraîche',
  'Fromage râpé',
  'Tomate',
  'Oignon',
  'Ail',
  'Carotte',
  'Courgette',
  'Pomme de terre',
  'Pain',
  'Poulet',
  'Jambon',
  'Poivron',
  'Champignon',
  'Citron',
  'Pomme',
];

/**
 * Service universel d'entrée d'ingrédient (Stocks, Courses, Recherche & Recettes).
 * Implémente rigoureusement les contraintes de la Section 8 :
 * - Zéro pollution silencieuse
 * - Détection des correspondances proches & suggestion de synonymes
 * - Validation stricte du Passeport Ingrédient (Allergènes, Rayon, Placard, Alias)
 * - Rétroactivité immédiate lors de la création
 */
export const UnifiedIngredientService = {
  /**
   * Détecte si un ingrédient brut correspond déjà à une entrée du lexique (direct ou via normaliseur).
   */
  resolveRecognizedIngredient(rawName: string): {
    isRecognized: boolean;
    canonical?: CanonicalIngredient;
    extractedQuantity?: string;
    extractedUnit?: string;
    resolvedName: string;
  } {
    const trimmed = rawName.trim();
    if (!trimmed) {
      return { isRecognized: false, resolvedName: '' };
    }

    const norm = normalizeIngredient({ name: trimmed });
    const list = VocabularyService.getSyncList();

    if (norm.canonicalId) {
      const canonical = list.find((item) => item.id === norm.canonicalId);
      if (canonical) {
        return {
          isRecognized: true,
          canonical,
          extractedQuantity: norm.quantity,
          extractedUnit: norm.unit,
          resolvedName: canonical.canonicalName,
        };
      }
    }

    // Lookup direct O(1) sur le nom normalisé
    const cleanNorm = normalizeString(trimmed);
    const directCanon = list.find(
      (item) => item.normalizedName === cleanNorm || (item.aliases && item.aliases.includes(cleanNorm))
    );
    if (directCanon) {
      return {
        isRecognized: true,
        canonical: directCanon,
        extractedQuantity: norm.quantity,
        extractedUnit: norm.unit,
        resolvedName: directCanon.canonicalName,
      };
    }

    return {
      isRecognized: false,
      extractedQuantity: norm.quantity,
      extractedUnit: norm.unit,
      resolvedName: norm.name || trimmed,
    };
  },

  /**
   * Recherche les ingrédients canoniques les plus proches d'une saisie non répertoriée.
   * Utilise Levenshtein contrôlé, équivalences de racines, synonymes existants et chevauchement de tokens.
   */
  findClosestCanonicalMatches(query: string, limit = 3): ClosestCanonicalMatch[] {
    const rawTrimmed = query.trim();
    if (!rawTrimmed || rawTrimmed.length < 2) return [];

    const normResult = normalizeIngredient({ name: rawTrimmed });
    const cleanName = normResult.name || rawTrimmed;
    const normQuery = normalizeString(cleanName);
    if (!normQuery || normQuery.length < 2) return [];

    const queryStem = stemWord(normQuery);
    const queryPhonetic = frenchPhonetic(cleanName);
    const queryTokens = normQuery.split(/\s+/).filter((t) => t.length >= 3);

    const list = VocabularyService.getSyncList();
    const scoredMap = new Map<string, ClosestCanonicalMatch>();

    for (const item of list) {
      const itemNorm = item.normalizedName;
      const itemStem = stemWord(itemNorm);
      const itemPhonetic = frenchPhonetic(itemNorm);
      let bestScore = 0;
      let bestReason: ClosestCanonicalMatch['reason'] = 'family';
      let bestLabel = 'Famille proche';
      let matchedText = item.canonicalName;

      // 1. Synonyme exact présent dans les alias de cet ingrédient
      if (item.aliases && item.aliases.includes(normQuery)) {
        bestScore = 96;
        bestReason = 'exact_alias';
        bestLabel = 'Synonyme répertorié';
        matchedText = normQuery;
      }
      // 2. Équivalence de pluriel / singulier (Stemming prioritaire sur la phonétique)
      else if (queryStem === itemStem || (itemNorm.endsWith('s') && itemNorm.slice(0, -1) === normQuery) || (normQuery.endsWith('s') && normQuery.slice(0, -1) === itemNorm)) {
        bestScore = 92;
        bestReason = 'stem';
        bestLabel = 'Variante singulier / pluriel';
        matchedText = item.canonicalName;
      }
      // 3. Prononciation phonétique identique (ex: "voeu" -> "veau")
      else if (queryPhonetic && queryPhonetic.length >= 2 && queryPhonetic === itemPhonetic) {
        bestScore = 91;
        bestReason = 'typo';
        bestLabel = 'Prononciation très proche';
        matchedText = item.canonicalName;
      }
      // 4. Distance de Levenshtein sur le nom canonique
      else {
        const distCanon = levenshteinDistance(normQuery, itemNorm);
        if (normQuery.length >= 4 && distCanon === 1) {
          bestScore = 86;
          bestReason = 'typo';
          bestLabel = 'Orthographe très proche';
          matchedText = item.canonicalName;
        } else if (normQuery.length >= 4 && distCanon <= 2 && normQuery[0] === itemNorm[0]) {
          bestScore = 82;
          bestReason = 'typo';
          bestLabel = 'Variante orthographique';
          matchedText = item.canonicalName;
        }
      }

      // 5. Examen approfondi des alias de l'ingrédient
      if (bestScore < 90 && item.aliases) {
        for (const alias of item.aliases) {
          if (!alias || alias.length < 3) continue;

          if (alias === normQuery) {
            bestScore = Math.max(bestScore, 95);
            bestReason = 'exact_alias';
            bestLabel = `Synonyme de "${item.canonicalName}"`;
            matchedText = alias;
            break;
          }

          const aliasStem = stemWord(alias);
          if (queryStem === aliasStem) {
            if (bestScore < 90) {
              bestScore = 90;
              bestReason = 'stem';
              bestLabel = `Variante de "${alias}"`;
              matchedText = alias;
            }
          }

          const aliasPhonetic = frenchPhonetic(alias);
          if (queryPhonetic && queryPhonetic.length >= 2 && queryPhonetic === aliasPhonetic) {
            if (bestScore < 89) {
              bestScore = 89;
              bestReason = 'typo';
              bestLabel = `Prononciation proche de "${alias}"`;
              matchedText = alias;
            }
          }

          const distAlias = levenshteinDistance(normQuery, alias);
          if (normQuery.length >= 4 && distAlias === 1) {
            if (bestScore < 84) {
              bestScore = 84;
              bestReason = 'typo';
              bestLabel = `Proche du synonyme "${alias}"`;
              matchedText = alias;
            }
          } else if (normQuery.length >= 4 && distAlias <= 2 && normQuery[0] === alias[0]) {
            if (bestScore < 78) {
              bestScore = 78;
              bestReason = 'typo';
              bestLabel = `Proche du synonyme "${alias}"`;
              matchedText = alias;
            }
          }
        }
      }

      // 5. Chevauchement de tokens sémantiques (ex: "farine de châtaigne" -> "Farine")
      if (bestScore < 70 && queryTokens.length > 0) {
        const itemTokens = itemNorm.split(/\s+/).filter((t) => t.length >= 3);
        const hasTokenOverlap = queryTokens.some((qt) => itemTokens.includes(qt));
        if (hasTokenOverlap) {
          bestScore = 68;
          bestReason = 'token_overlap';
          bestLabel = 'Ingrédient de la même famille';
          matchedText = item.canonicalName;
        } else if (itemNorm.includes(normQuery) || normQuery.includes(itemNorm)) {
          bestScore = 65;
          bestReason = 'family';
          bestLabel = 'Déclinaison culinaire';
          matchedText = item.canonicalName;
        }
      }

      if (bestScore >= 65) {
        // Bonus basé sur la fréquence d'usage pour prioriser les ingrédients courants
        const usageBonus = Math.min(10, Math.floor((item.usageCount || 0) * 1.5));
        const finalScore = bestScore + usageBonus;

        scoredMap.set(item.id, {
          item,
          similarity: finalScore,
          reason: bestReason,
          label: bestLabel,
          matchedText,
        });
      }
    }

    const results = Array.from(scoredMap.values());
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  },

  /**
   * Retourne une liste qualitative de suggestions pour le menu déroulant :
   * 1. Correspondances directes (nom canonique ou alias débutant ou contenant le terme)
   * 2. Suggestions phonétiques et d'orthographe proche (ex: "voeu" -> "Veau", "tomatte" -> "Tomate")
   */
  getQualitativeDropdownSuggestions(query: string, limit = 6): DropdownSuggestionItem[] {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    const directMatches = VocabularyService.search(trimmed, limit);
    const seenIds = new Set<string>();
    const results: DropdownSuggestionItem[] = [];

    // 1. Ajouter d'abord les correspondances directes
    for (const item of directMatches) {
      seenIds.add(item.id);
      results.push({ item });
    }

    // 2. Si la liste n'est pas pleine, compléter avec les suggestions phonétiques et proches
    if (results.length < limit) {
      const closest = this.findClosestCanonicalMatches(trimmed, limit);
      for (const cm of closest) {
        if (!seenIds.has(cm.item.id)) {
          seenIds.add(cm.item.id);
          results.push({
            item: cm.item,
            isFuzzySuggestion: true,
            suggestionLabel: cm.label,
          });
        }
        if (results.length >= limit) break;
      }
    }

    return results;
  },

  /**
   * Associe un nouveau synonyme / alias à un ingrédient canonique existant.
   * Respecte strictement la Validation 3 & Validation 4 de la Section 8.3 :
   * - Interdiction des termes génériques de la liste noire
   * - Interdiction du vol de nom canonique d'un autre ingrédient
   * - Interdiction du vol d'alias d'un autre ingrédient
   */
  async addAliasToCanonical(
    canonicalId: string,
    rawAlias: string
  ): Promise<{ success: boolean; updated?: CanonicalIngredient; error?: string }> {
    const cleanAlias = rawAlias.trim();
    if (!cleanAlias) {
      return { success: false, error: 'Le nom du synonyme ne peut pas être vide.' };
    }

    const normAlias = normalizeString(cleanAlias);
    if (normAlias.length < 2) {
      return { success: false, error: 'Le synonyme doit comporter au moins 2 caractères.' };
    }

    if (FORBIDDEN_ISOLATED_ALIASES.has(normAlias)) {
      return {
        success: false,
        error: `« ${cleanAlias} » est un terme trop générique ou un simple qualificatif (interdit comme alias isolé).`,
      };
    }

    const list = await VocabularyService.getAll();
    const target = list.find((i) => i.id === canonicalId);
    if (!target) {
      return { success: false, error: 'Ingrédient canonique cible introuvable.' };
    }

    // Vérifier si le terme est déjà le nom canonique d'un AUTRE ingrédient
    const conflictCanon = list.find(
      (i) => i.id !== canonicalId && (i.normalizedName === normAlias || `${i.normalizedName}s` === normAlias)
    );
    if (conflictCanon) {
      return {
        success: false,
        error: `Ce terme est déjà le nom canonique officiel de « ${conflictCanon.canonicalName} ».`,
      };
    }

    // Vérifier si le terme est déjà un alias d'un AUTRE ingrédient
    const conflictParent = list.find(
      (i) => i.id !== canonicalId && i.aliases && i.aliases.includes(normAlias)
    );
    if (conflictParent) {
      return {
        success: false,
        error: `« ${cleanAlias} » est déjà un synonyme de « ${conflictParent.canonicalName} ». Détachez-le d'abord si vous souhaitez le réassigner.`,
      };
    }

    // Construire le nouvel ensemble d'alias (avec singulier et pluriel)
    const nextAliases = new Set<string>(target.aliases || []);
    nextAliases.add(normAlias);
    if (!normAlias.endsWith('s')) {
      nextAliases.add(`${normAlias}s`);
    } else if (normAlias.length > 3) {
      nextAliases.add(normAlias.slice(0, -1));
    }

    try {
      const updated = await VocabularyService.update(target.id, {
        aliases: Array.from(nextAliases),
      });

      // Synchronisation rétroactive immédiate des occurrences existantes
      await this.linkUnrecognizedItemsToNewCanonical(updated);

      return { success: true, updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement du synonyme.';
      return { success: false, error: message };
    }
  },

  /**
   * Valide les métadonnées d'un nouvel ingrédient canonique selon la Section 8.3 & 8.4.
   */
  validateNewIngredient(candidate: NewIngredientCandidate): ValidationResult {
    const rawName = candidate.canonicalName?.trim();
    if (!rawName) {
      return { valid: false, error: 'Veuillez saisir un nom pour l\'ingrédient.' };
    }

    if (rawName.length < 3 || rawName.length > 50) {
      return { valid: false, error: 'Le nom de l\'ingrédient doit comporter entre 3 et 50 caractères.' };
    }

    // Rejet des quantités et unités chiffrées tout en autorisant les farines normalisées (T45, T55, T65, T80, T110, T150)
    const cleanForDigits = rawName.replace(/\bT\d{2,3}\b/gi, '');
    if (
      /^\d+([.,]\d+)?\s*(g|kg|ml|cl|l|càs|càc|cuillères?|pincées?|gousses?|tranches?|sachets?|pots?|boîtes?)?\s+/i.test(cleanForDigits) ||
      /\b\d+([.,]\d+)?\s*(g|kg|ml|cl|l)\b/i.test(cleanForDigits) ||
      /\d{2,}/.test(cleanForDigits)
    ) {
      return { valid: false, error: 'Le nom ne doit pas contenir de quantités ou d\'unités de mesure (ex: 200g, 2).' };
    }

    const normName = normalizeString(rawName);

    // Rejet des mots génériques isolés
    if (FORBIDDEN_ISOLATED_ALIASES.has(normName)) {
      return {
        valid: false,
        error: `« ${rawName} » est un terme trop générique ou un simple qualificatif (interdit comme nom canonique).`,
      };
    }

    const list = VocabularyService.getSyncList();

    // Conflit exact sur nom canonique normalisé
    const existingSame = list.find((i) => i.normalizedName === normName);
    if (existingSame) {
      return {
        valid: false,
        error: `Un ingrédient portant le nom officiel « ${existingSame.canonicalName} » existe déjà dans le lexique.`,
      };
    }

    // Conflit singulier / pluriel
    const existingPlural = list.find(
      (i) => i.normalizedName === `${normName}s` || (normName.endsWith('s') && i.normalizedName === normName.slice(0, -1))
    );
    if (existingPlural) {
      return {
        valid: false,
        error: `L'ingrédient « ${existingPlural.canonicalName} » existe déjà (conflit singulier / pluriel).`,
      };
    }

    // Conflit alias existant
    const parentWithAlias = list.find((i) => i.aliases && i.aliases.includes(normName));
    if (parentWithAlias && !candidate.allowPromoteAlias) {
      return {
        valid: false,
        error: `« ${rawName} » est déjà un synonyme de « ${parentWithAlias.canonicalName} ».`,
        parentOfAlias: parentWithAlias,
      };
    }

    // Validation des alias supplémentaires
    if (candidate.aliases && candidate.aliases.length > 0) {
      const otherCanonMap = new Map<string, string>();
      const otherAliasesMap = new Map<string, string>();
      list.forEach((i) => {
        otherCanonMap.set(i.normalizedName, i.canonicalName);
        otherCanonMap.set(`${i.normalizedName}s`, i.canonicalName);
        (i.aliases || []).forEach((a) => otherAliasesMap.set(a, i.canonicalName));
      });

      for (const alias of candidate.aliases) {
        const normA = normalizeString(alias);
        if (!normA) continue;
        if (FORBIDDEN_ISOLATED_ALIASES.has(normA)) {
          return {
            valid: false,
            error: `Le synonyme « ${alias} » est un terme générique interdit.`,
          };
        }
        if (otherCanonMap.has(normA)) {
          return {
            valid: false,
            error: `Le synonyme « ${alias} » est le nom réservé de « ${otherCanonMap.get(normA)} ».`,
          };
        }
        if (otherAliasesMap.has(normA)) {
          return {
            valid: false,
            error: `Le synonyme « ${alias} » est déjà associé à « ${otherAliasesMap.get(normA)} ».`,
          };
        }
      }
    }

    // Formatage officiel : Majuscule au premier caractère, reste fidèle
    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    // Avertissement de similarité Levenshtein si proche d'un terme existant
    let warning: string | undefined;
    for (const item of list) {
      const dist = levenshteinDistance(normName, item.normalizedName);
      if (normName.length >= 4 && dist <= 2) {
        warning = `Un ingrédient portant un nom proche (« ${item.canonicalName} ») existe déjà. S'agit-il du même aliment ?`;
        break;
      }
    }

    return {
      valid: true,
      formattedName,
      warning,
    };
  },

  /**
   * Enregistre un nouvel ingrédient canonique qualifié (Passeport Ingrédient)
   * et applique la synchronisation rétroactive sur les données existantes (Section 8.5).
   */
  async registerNewCanonicalIngredient(
    candidate: NewIngredientCandidate
  ): Promise<{ success: boolean; ingredient?: CanonicalIngredient; error?: string }> {
    const validation = this.validateNewIngredient(candidate);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const cleanName = validation.formattedName || candidate.canonicalName.trim();
    const aisle = candidate.defaultAisle || classifyIngredientAisle(cleanName);

    try {
      const created = await VocabularyService.add({
        canonicalName: cleanName,
        defaultAisle: aisle,
        aliases: candidate.aliases || [],
        isCustom: true,
        isPantryStaple: candidate.isPantryStaple,
        allergen: candidate.allergen || undefined,
      });

      // Synchronisation rétroactive immédiate (Section 8.5)
      await this.linkUnrecognizedItemsToNewCanonical(created);

      return { success: true, ingredient: created };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la création de l\'ingrédient.';
      return { success: false, error: message };
    }
  },

  /**
   * Synchronisation rétroactive : rattache les recettes et articles existants
   * qui portaient ce nom mais n'avaient pas de canonicalId (Section 8.5).
   * Sérialisée via le mutex de cascade pour prévenir toute race condition.
   */
  async linkUnrecognizedItemsToNewCanonical(newIngredient: CanonicalIngredient): Promise<void> {
    return StorageService.runWithCascadeMutex(async () => {
      try {
        const normTarget = newIngredient.normalizedName;
        const aliasesSet = new Set((newIngredient.aliases || []).map((a) => normalizeString(a)));

        const isTargetMatch = (rawItemName: string): boolean => {
          const norm = normalizeString(rawItemName);
          if (!norm) return false;
          if (norm === normTarget) return true;
          if (normTarget.endsWith('s') ? norm === normTarget.slice(0, -1) : norm === `${normTarget}s`) return true;
          if (aliasesSet.has(norm)) return true;
          return false;
        };

        // 1. Recettes sauvegardées
        const recipes = await StorageService.getRecipes();
        let recipesModified = false;
        const updatedRecipes = recipes.map((recipe) => {
          let recipeChanged = false;
          const nextIngredients = recipe.ingredients.map((ing) => {
            if (!ing.canonicalId && ing.name) {
              if (isTargetMatch(ing.name)) {
                recipeChanged = true;
                return {
                  ...ing,
                  canonicalId: newIngredient.id,
                  isPantryStaple:
                    typeof ing.isPantryStaple === 'boolean'
                      ? ing.isPantryStaple
                      : newIngredient.isPantryStaple,
                };
              }
            }
            return ing;
          });

          if (recipeChanged) {
            recipesModified = true;
            return { ...recipe, ingredients: nextIngredients };
          }
          return recipe;
        });

        if (recipesModified) {
          await StorageService.saveAllRecipes(updatedRecipes);
        }

        // 2. Étagères (stock frigo / placard)
        const fridgeItems = await StorageService.getFridgeItems();
        let fridgeModified = false;
        const updatedFridge = fridgeItems.map((item) => {
          if (!item.canonicalId && item.name) {
            if (isTargetMatch(item.name)) {
              fridgeModified = true;
              return {
                ...item,
                canonicalId: newIngredient.id,
                aisle: newIngredient.defaultAisle,
              };
            }
          }
          return item;
        });

        if (fridgeModified) {
          await StorageService.saveFridgeItems(updatedFridge);
        }

        // 3. Liste de courses
        const shoppingList = await StorageService.getShoppingList();
        let shoppingModified = false;
        const updatedShopping = shoppingList.map((item) => {
          if (!item.canonicalId && item.name) {
            if (isTargetMatch(item.name)) {
              shoppingModified = true;
              return {
                ...item,
                canonicalId: newIngredient.id,
                aisle: newIngredient.defaultAisle,
              };
            }
          }
          return item;
        });

        if (shoppingModified) {
          await StorageService.saveShoppingList(updatedShopping);
        }
      } catch (e) {
        // Erreur silencieuse tolérée ici car ce n'est pas bloquant
      }
    });
  },

  /**
   * Suggère automatiquement l'allergène probable et l'état fond de placard pour pré-remplir le Passeport.
   */
  getSuggestedDefaults(rawName: string): {
    suggestedAisle: ShoppingAisle;
    suggestedAllergen: AllergenFamily | null;
    suggestedIsPantryStaple: boolean;
  } {
    const cleanName = rawName.trim();
    const suggestedAisle = classifyIngredientAisle(cleanName);
    const suggestedAllergen =
      getDefaultAllergen(cleanName) ||
      detectProbableAllergenFamily(cleanName);
    const suggestedIsPantryStaple = isKnownDefaultPantryStaple(cleanName);

    return {
      suggestedAisle,
      suggestedAllergen,
      suggestedIsPantryStaple,
    };
  },
};
