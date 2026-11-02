import { Recipe, RecipeViewMode, ChefFavoritePrompt } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { FridgeItem } from '../types/fridge';
import {
  WeeklyPlanMap,
  PlannedMeal,
  DayOfWeek,
  MealTime,
  PlannerSettings,
  DEFAULT_PLANNER_SETTINGS,
} from '../types/planner';
import { MealLogEntry, MealLogMap, DayMealLogSummary } from '../types/mealLog';
import { UserAllergenItem, AllergenFamily } from '../types/vocabulary';

import {
  generateUniqueId,
  getLocalDateString,
  formatMealLogDateFrench,
  getDayOfWeekFromDateString,
  normalizeString,
} from '../utils/helpers';
import { isRecipeVegetarian, ChefMoodOption, CHEF_MOODS } from './recipeAiService';
import { createShoppingItemFromIngredient, mergeShoppingItems } from '../utils/shoppingAggregator';
import { parseShoppingInput } from '../utils/shoppingInputParser';
import { classifyIngredientAisle } from '../utils/aisleClassifier';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { isKnownDefaultPantryStaple } from '../data/canonicalVocabulary';
import { VocabularyService, VocabularyCascadeEvent } from './vocabularyService';
import { AnalyticsService } from './analyticsService';
import { DatabaseService } from './databaseService';
import { ImageStorageService } from './imageStorageService';
import { RecipePackService, ExtractedRecipePack } from './recipePackService';

export interface RecipePackMergeResult {
  success: boolean;
  addedCount: number;
  updatedCount: number;
  photosCount: number;
  error?: string;
}

// ─── Clés de settings SQLite (ex-AsyncStorage) ───────────────────────────────
const SETTING_SCHEMA_VERSION = 'schema_version';
const CURRENT_SCHEMA_VERSION = 'v4';
const SETTING_THEME_MODE = 'theme_mode_v1';
const SETTING_RECIPE_VIEW_MODE = 'recipe_view_mode_v1';
const SETTING_DEFAULT_SERVINGS = 'default_servings_v1';
const SETTING_ALLERGEN_FILTER = 'filter_allergens_recipes_v1';
const SETTING_ALLERGEN_EXCLUDE_AI = 'exclude_allergens_ai_v1';
const SETTING_CHEF_FAVORITE_PROMPTS = 'chef_favorite_prompts';
const SETTING_CHEF_MOODS = 'chef_moods_v1';
const SETTING_ONBOARDING = 'onboarded_v1';

export const DEFAULT_CHEF_FAVORITE_PROMPTS: ChefFavoritePrompt[] = [
  {
    id: 'seed_prompt_1',
    title: 'Sans cuisson au four',
    promptText: '100 % sans cuisson au four, uniquement poêle, casserole ou cru.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed_prompt_2',
    title: 'Sauce légère & saine',
    promptText: 'Sauce légère et digeste, sans crème fraîche ni excès de beurre.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'seed_prompt_3',
    title: 'Enfants bienvenus',
    promptText: 'Enfants bienvenus, saveurs douces, textures fondantes et présentation ludique.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];


// ─── File d'attente mutex (cascade vocabulaire) ───────────────────────────────
let cascadeMutexQueue: Promise<any> = Promise.resolve();

// ─── Listeners réactifs ───────────────────────────────────────────────────────
type StorageListener<T> = (items: T) => void;
let fridgeListeners: StorageListener<FridgeItem[]>[] = [];
let shoppingListeners: StorageListener<ShoppingItem[]>[] = [];

// ─── Cache mémoire (performance O(1) sur les re-renders) ─────────────────────
let memoryCache = {
  recipes: null as Recipe[] | null,
  fridgeItems: null as FridgeItem[] | null,
  shoppingList: null as ShoppingItem[] | null,
  recipeViewMode: null as RecipeViewMode | null,
};

// ─── Analytics helpers ────────────────────────────────────────────────────────
function trackShoppingItemAdded(item: ShoppingItem, source?: string): void {
  void AnalyticsService.track({
    type: 'shopping_item_added',
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    canonicalId: item.canonicalId,
    source,
  });
}

function trackShoppingItemRemoved(item: ShoppingItem): void {
  void AnalyticsService.track({
    type: 'shopping_item_removed',
    itemName: item.name,
    quantity: item.quantity,
    unit: item.unit,
    canonicalId: item.canonicalId,
  });
}

function trackFridgeItemAdded(item: FridgeItem): void {
  void AnalyticsService.track({
    type: 'fridge_item_added',
    itemName: item.name,
    canonicalId: item.canonicalId,
    aisle: item.aisle,
  });
}

function trackFridgeItemRemoved(item: FridgeItem): void {
  void AnalyticsService.track({
    type: 'fridge_item_removed',
    itemName: item.name,
    canonicalId: item.canonicalId,
  });
}

function trackMealPlanUpdate(
  slotKey: string,
  mealTime: MealTime,
  meal: PlannedMeal | undefined,
  added: boolean
): void {
  void AnalyticsService.track({
    type: 'meal_plan_updated',
    dateKey: meal?.date || slotKey.replace(/_(lunch|dinner)$/, ''),
    slot: mealTime,
    recipeId: meal?.recipeId,
    recipeTitle: meal?.recipeTitle,
    added,
  });
}

// ─── Sanitizers (inchangés) ────────────────────────────────────────────────────
/**
 * Assainit une URL d'image pour s'assurer qu'elle n'exploite aucun protocole malveillant (SEC-09)
 */
export function sanitizeImageUrl(url: any): string {
  if (typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('file://') ||
    lower.startsWith('data:image/')
  ) {
    return trimmed.slice(0, 2000);
  }
  return '';
}

/**
 * Assainit une recette chargée depuis le stockage pour éviter les crashs si des champs sont manquants
 * et applique des plafonds stricts pour immuniser SQLite contre les attaques DoS (SEC-06).
 */
export function sanitizeStoredRecipe(r: any): Recipe {
  return {
    id: typeof r.id === 'string' && r.id ? r.id.slice(0, 100) : generateUniqueId('rec'),
    title: typeof r.title === 'string' && r.title ? r.title.slice(0, 200) : 'Recette sans titre',
    description: typeof r.description === 'string' ? r.description.slice(0, 2000) : '',
    category: r.category || 'Plat',
    difficulty: r.difficulty || 'Moyen',
    prepTimeMinutes: typeof r.prepTimeMinutes === 'number' && r.prepTimeMinutes >= 0 ? Math.min(1440, r.prepTimeMinutes) : 15,
    cookTimeMinutes: typeof r.cookTimeMinutes === 'number' && r.cookTimeMinutes >= 0 ? Math.min(1440, r.cookTimeMinutes) : 0,
    servings: typeof r.servings === 'number' && r.servings > 0 ? Math.min(100, r.servings) : 4,
    rating: typeof r.rating === 'number' && r.rating >= 0 ? Math.min(5, Math.max(0, r.rating)) : 0,
    userNote: typeof r.userNote === 'string' ? r.userNote.slice(0, 1500) : undefined,
    imageUrl: sanitizeImageUrl(r.imageUrl),
    availableImages: Array.isArray(r.availableImages)
      ? r.availableImages.map(sanitizeImageUrl).filter(Boolean).slice(0, 10)
      : undefined,
    isFavorite: Boolean(r.isFavorite),
    isVegetarian:
      typeof r.isVegetarian === 'boolean'
        ? r.isVegetarian
        : isRecipeVegetarian(r.ingredients || [], r.title || '', r.description || ''),
    tags: Array.isArray(r.tags)
      ? Array.from(
          new Set(
            (r.tags as unknown[])
              .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
              .map((t) => t.trim().slice(0, 50))
          )
        ).slice(0, 30)
      : undefined,
    sourceUrl: typeof r.sourceUrl === 'string' && r.sourceUrl ? r.sourceUrl.slice(0, 500) : undefined,
    sourceSite: typeof r.sourceSite === 'string' && r.sourceSite ? r.sourceSite.slice(0, 100) : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.slice(0, 100).map((ing: any, idx: number) => ({
          id: typeof ing.id === 'string' ? ing.id.slice(0, 80) : generateUniqueId(`ing_${idx}`),
          name: typeof ing.name === 'string' ? ing.name.slice(0, 150) : '',
          canonicalId: typeof ing.canonicalId === 'string' && ing.canonicalId ? ing.canonicalId.slice(0, 100) : undefined,
          quantity: ing.quantity ? String(ing.quantity).slice(0, 50) : '',
          unit: ing.unit ? String(ing.unit).slice(0, 50) : '',
          isPantryStaple:
            typeof ing.isPantryStaple === 'boolean'
              ? ing.isPantryStaple
              : isKnownDefaultPantryStaple(ing.name)
              ? true
              : undefined,
          isOptional: typeof ing.isOptional === 'boolean' ? ing.isOptional : undefined,
          linkedRecipeId:
            typeof ing.linkedRecipeId === 'string' && ing.linkedRecipeId
              ? ing.linkedRecipeId.slice(0, 100)
              : undefined,
        }))
      : [],
    steps: Array.isArray(r.steps)
      ? r.steps.slice(0, 50).map((st: any, idx: number) => ({
          id: typeof st.id === 'string' ? st.id.slice(0, 80) : generateUniqueId(`stp_${idx}`),
          order: typeof st.order === 'number' ? st.order : idx + 1,
          instruction: typeof st.instruction === 'string' ? st.instruction.slice(0, 2500) : '',
        }))
      : [],
  };
}

/**
 * Assainit une entrée du journal des repas pour garantir la cohérence des données.
 */
function sanitizeMealLogEntry(e: any): MealLogEntry | null {
  if (!e || typeof e !== 'object' || typeof e.title !== 'string') return null;
  const title = e.title.trim().slice(0, 200);
  if (!title) return null;
  return {
    id: typeof e.id === 'string' && e.id ? e.id.slice(0, 80) : generateUniqueId('mlog'),
    date: typeof e.date === 'string' && e.date ? e.date.slice(0, 20) : getLocalDateString(),
    mealTime: e.mealTime === 'dinner' ? 'dinner' : 'lunch',
    title,
    recipeId: typeof e.recipeId === 'string' && e.recipeId ? e.recipeId.slice(0, 100) : undefined,
    recipeImageUrl: sanitizeImageUrl(e.recipeImageUrl),
    note: typeof e.note === 'string' && e.note.trim() ? e.note.trim().slice(0, 500) : undefined,
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString(),
  };
}

/**
 * Assainit un ingrédient ou aliment du frigo pour garantir la robustesse des données.
 */
function sanitizeFridgeItem(item: any): FridgeItem | null {
  if (!item || typeof item !== 'object' || typeof item.name !== 'string') return null;
  const name = item.name.trim().slice(0, 150);
  if (!name) return null;
  const canonicalId = typeof item.canonicalId === 'string' && item.canonicalId ? item.canonicalId.slice(0, 100) : undefined;
  const aisle: ShoppingAisle = (typeof item.aisle === 'string' && item.aisle)
    ? item.aisle
    : classifyIngredientAisle(name);

  return {
    id: typeof item.id === 'string' && item.id ? item.id.slice(0, 80) : generateUniqueId('fridge'),
    name,
    canonicalId,
    aisle,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
  };
}

/**
 * Chargement dynamique et paresseux (lazy) des recettes par défaut.
 * Évite d'embarquer et parser les 400 Ko de INITIAL_RECIPES au démarrage
 * lorsque l'utilisateur a déjà des recettes dans son stockage local.
 */
async function getInitialRecipes(): Promise<Recipe[]> {
  const { INITIAL_RECIPES } = await import('../data/initialRecipes');
  return INITIAL_RECIPES;
}

export const StorageService = {

  // ══════════════════════════════════════════════════════════════════════════
  // RECETTES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Charge toutes les recettes enregistrées.
   * Cache mémoire O(1) → SQLite → recettes initiales (premier lancement).
   */
  async getRecipes(): Promise<Recipe[]> {
    if (memoryCache.recipes) {
      return memoryCache.recipes;
    }

    try {
      const rows = await DatabaseService.getRecipes();

      if (rows.length === 0) {
        // Premier lancement absolu : initialisation avec les recettes cultes (chargement lazy)
        const initial = await getInitialRecipes();
        const sanitized = initial.map(sanitizeStoredRecipe);
        await DatabaseService.saveAllRecipes(sanitized);
        await DatabaseService.setSetting(SETTING_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
        memoryCache.recipes = sanitized;
        return sanitized;
      }

      // Validation défensive runtime
      const result = rows.map(sanitizeStoredRecipe);
      memoryCache.recipes = result;
      return result;
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
      const initial = await getInitialRecipes().catch(() => []);
      return initial;
    }
  },

  /**
   * Enregistre ou met à jour une recette complète avec identifiant unique garanti (VULN-10 corrigé).
   * Sécurise de manière permanente les photos locales dans documentDirectory/recipe_photos/.
   */
  async saveRecipe(recipe: Recipe): Promise<Recipe[]> {
    try {
      const safeRecipe: Recipe = sanitizeStoredRecipe(recipe);

      // Sécurisation permanente de la photo de couverture si locale
      if (safeRecipe.imageUrl) {
        safeRecipe.imageUrl = await ImageStorageService.persistImageLocally(safeRecipe.imageUrl);
      }
      if (Array.isArray(safeRecipe.availableImages) && safeRecipe.availableImages.length > 0) {
        safeRecipe.availableImages = await Promise.all(
          safeRecipe.availableImages.map((img) => ImageStorageService.persistImageLocally(img))
        );
      }

      const now = new Date().toISOString();
      // Lookup en mémoire prioritaire O(1) pour éviter un appel I/O si le cache est chaud
      const existing =
        memoryCache.recipes?.find((r) => r.id === safeRecipe.id) ||
        (await DatabaseService.getRecipeById(safeRecipe.id));

      // Nettoyage de l'ancienne photo permanente si elle a été remplacée
      if (existing?.imageUrl && existing.imageUrl !== safeRecipe.imageUrl) {
        await ImageStorageService.cleanupRecipePhoto(existing.imageUrl);
      }

      const finalRecipe: Recipe = existing
        ? { ...safeRecipe, updatedAt: now }
        : { ...safeRecipe, id: safeRecipe.id || generateUniqueId('rec'), createdAt: now, updatedAt: now };

      await DatabaseService.saveRecipe(finalRecipe);

      // Mise à jour ciblée du cache mémoire en place (évite un rechargement SQLite complet et des centaines de JSON.parse)
      if (memoryCache.recipes) {
        const existingIdx = memoryCache.recipes.findIndex((r) => r.id === finalRecipe.id);
        if (existingIdx >= 0) {
          memoryCache.recipes = [
            ...memoryCache.recipes.slice(0, existingIdx),
            finalRecipe,
            ...memoryCache.recipes.slice(existingIdx + 1),
          ];
        } else {
          memoryCache.recipes = [finalRecipe, ...memoryCache.recipes];
        }
        return memoryCache.recipes;
      }

      return this.getRecipes();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la recette:', error);
      throw error;
    }
  },

  /**
   * Sauvegarde l'ensemble complet des recettes (ex: suite à une synchronisation ou cascade)
   */
  async saveAllRecipes(recipes: Recipe[]): Promise<Recipe[]> {
    try {
      await DatabaseService.saveAllRecipes(recipes);
      memoryCache.recipes = recipes;
      return recipes;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde globale des recettes:', error);
      throw error;
    }
  },

  /**
   * Met à jour la note et éventuellement le commentaire/astuce d'une recette.
   */
  async updateRecipeRating(id: string, rating: number, userNote?: string): Promise<Recipe[]> {
    try {
      await DatabaseService.updateRecipeRating(id, rating, userNote);
      // Mise à jour du cache mémoire en place (évite un rechargement complet)
      if (memoryCache.recipes) {
        memoryCache.recipes = memoryCache.recipes.map((r) => {
          if (r.id !== id) return r;
          return {
            ...r,
            rating,
            userNote: userNote !== undefined ? userNote : r.userNote,
            updatedAt: new Date().toISOString(),
          };
        });
        return memoryCache.recipes;
      }
      return this.getRecipes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error);
      throw error;
    }
  },

  /**
   * Met à jour les tags personnalisés d'une recette.
   */
  async updateRecipeTags(id: string, tags: string[]): Promise<Recipe[]> {
    try {
      const cleanTags = Array.from(
        new Set(
          tags
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().slice(0, 50))
        )
      ).slice(0, 30);

      await DatabaseService.updateRecipeTags(id, cleanTags);

      if (memoryCache.recipes) {
        memoryCache.recipes = memoryCache.recipes.map((r) =>
          r.id === id
            ? { ...r, tags: cleanTags.length > 0 ? cleanTags : undefined, updatedAt: new Date().toISOString() }
            : r
        );
        return memoryCache.recipes;
      }
      return this.getRecipes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour des tags:', error);
      throw error;
    }
  },

  /**
   * Récupère la liste dédoublonnée et triée de tous les tags existants dans le carnet.
   */
  async getAllTags(): Promise<string[]> {
    try {
      return await DatabaseService.getAllTags();
    } catch (error) {
      console.error('Erreur lors de la récupération des tags:', error);
      return [];
    }
  },

  /**
   * Bascule l'état favori d'une recette.
   */
  async toggleFavorite(id: string): Promise<Recipe[]> {
    try {
      await DatabaseService.toggleFavorite(id);

      if (memoryCache.recipes) {
        memoryCache.recipes = memoryCache.recipes.map((r) =>
          r.id === id ? { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() } : r
        );
        return memoryCache.recipes;
      }
      return this.getRecipes();
    } catch (error) {
      console.error('Erreur lors de l\'inversion du favori:', error);
      throw error;
    }
  },

  /**
   * Supprime définitivement une recette sans risque de réinitialisation de la base.
   * Nettoie également les photos permanentes associées sur le disque.
   */
  async deleteRecipe(id: string): Promise<Recipe[]> {
    try {
      const existing = await DatabaseService.getRecipeById(id);
      if (existing?.imageUrl) {
        await ImageStorageService.cleanupRecipePhoto(existing.imageUrl);
      }
      if (Array.isArray(existing?.availableImages)) {
        for (const img of existing.availableImages) {
          await ImageStorageService.cleanupRecipePhoto(img);
        }
      }

      await DatabaseService.deleteRecipe(id);
      if (memoryCache.recipes) {
        memoryCache.recipes = memoryCache.recipes.filter((r) => r.id !== id);
        return memoryCache.recipes;
      }
      return this.getRecipes();
    } catch (error) {
      console.error('Erreur lors de la suppression de la recette:', error);
      throw error;
    }
  },

  /**
   * Réinitialise explicitement les données avec les recettes de démo (action manuelle uniquement).
   */
  async resetToDemoRecipes(): Promise<Recipe[]> {
    try {
      const initial = await getInitialRecipes();
      const sanitized = initial.map(sanitizeStoredRecipe);
      await DatabaseService.saveAllRecipes(sanitized);
      await DatabaseService.setSetting(SETTING_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
      memoryCache.recipes = sanitized;
      return sanitized;
    } catch (error) {
      console.error('Erreur réinitialisation recettes:', error);
      const initial = await getInitialRecipes().catch(() => []);
      return initial;
    }
  },

  /**
   * Supprime toutes les recettes par défaut (préfixe `rec_top100_`)
   * et ne conserve que les recettes ajoutées par l'utilisateur.
   * Retourne la liste mise à jour.
   */
  async deleteDefaultRecipes(): Promise<Recipe[]> {
    try {
      await DatabaseService.deleteRecipesByPrefix('rec_top100_');
      memoryCache.recipes = null;
      return this.getRecipes();
    } catch (error) {
      console.error('Erreur suppression recettes par défaut:', error);
      throw error;
    }
  },

  /**
   * Stub de migration conservé pour compatibilité d'interface (0 opération).
   */
  async runCanonicalVocabularyMigration(_force: boolean = false): Promise<{
    recipesUpdated: number;
    shoppingUpdated: number;
    fridgeUpdated: number;
  }> {
    return { recipesUpdated: 0, shoppingUpdated: 0, fridgeUpdated: 0 };
  },

  /**
   * Stub de démarrage conservé pour compatibilité d'interface (0 opération).
   */
  async migrateRecipesToCanonicalV1(): Promise<{ recipesUpdated: number; shoppingUpdated: number; fridgeUpdated: number }> {
    return { recipesUpdated: 0, shoppingUpdated: 0, fridgeUpdated: 0 };
  },

  /**
   * Propage en cascade les modifications structurelles du lexique
   * (promotions, fusions, suppressions, renommages de rayon)
   * vers les recettes, le stock et la liste de courses.
   * Sérialisé via mutex pour prévenir tout risque de collision SQLite.
   */
  async runWithCascadeMutex<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      cascadeMutexQueue = cascadeMutexQueue
        .then(() => task())
        .then(resolve)
        .catch(reject);
    });
  },

  async handleVocabularyCascade(event: VocabularyCascadeEvent): Promise<{
    recipesUpdated: number;
    shoppingUpdated: number;
    fridgeUpdated: number;
  }> {
    return new Promise((resolve, reject) => {
      cascadeMutexQueue = cascadeMutexQueue
        .then(() => this._executeVocabularyCascade(event))
        .then(resolve)
        .catch(reject);
    });
  },

  async _executeVocabularyCascade(event: VocabularyCascadeEvent): Promise<{
    recipesUpdated: number;
    shoppingUpdated: number;
    fridgeUpdated: number;
  }> {
    let recipesUpdated = 0;
    let shoppingUpdated = 0;
    let fridgeUpdated = 0;

    const vocabMapById = VocabularyService.getSyncMapById();

    // 1. Traitement des Recettes — UPDATE ciblé (pas de réécriture complète)
    try {
      const recipes = await DatabaseService.getRecipes();
      const recipeUpdates: { id: string; ingredients: any[]; updatedAt: string }[] = [];

      for (const recipe of recipes) {
        let hasRecipeChange = false;
        const updatedIngredients = (recipe.ingredients || []).map((ing) => {
          if (event.type === 'promote') {
            if (event.parentIds.includes(ing.canonicalId || '')) {
              const recheck = normalizeIngredient({ name: ing.name });
              if (recheck.canonicalId === event.newIngredient.id) {
                hasRecipeChange = true;
                return {
                  ...ing,
                  canonicalId: event.newIngredient.id,
                  isPantryStaple:
                    event.newIngredient.isPantryStaple !== undefined
                      ? event.newIngredient.isPantryStaple
                      : ing.isPantryStaple,
                };
              }
            }
          } else if (event.type === 'merge') {
            const isSource =
              ing.canonicalId === event.sourceId ||
              (event.sourceIngredient && (
                normalizeString(ing.name) === event.sourceIngredient.normalizedName ||
                (event.sourceIngredient.aliases && event.sourceIngredient.aliases.includes(normalizeString(ing.name)))
              ));
            if (isSource) {
              hasRecipeChange = true;
              return { ...ing, canonicalId: event.targetId };
            }
          } else if (event.type === 'delete') {
            if (ing.canonicalId === event.deletedId) {
              hasRecipeChange = true;
              const recheck = normalizeIngredient({ name: ing.name });
              return { ...ing, canonicalId: recheck.canonicalId };
            }
          } else if (event.type === 'reset') {
            const recheck = normalizeIngredient(ing);
            if (recheck.canonicalId !== ing.canonicalId) {
              hasRecipeChange = true;
              return { ...ing, canonicalId: recheck.canonicalId };
            }
          }
          return ing;
        });

        if (hasRecipeChange) {
          recipesUpdated++;
          recipeUpdates.push({
            id: recipe.id,
            ingredients: updatedIngredients,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (recipeUpdates.length > 0) {
        await DatabaseService.updateRecipesIngredientsBatch(recipeUpdates);
        memoryCache.recipes = null; // Invalide le cache
      }
    } catch (e) {
      console.error('Erreur cascade recettes:', e);
    }

    // 2. Traitement du Stock Frigo / Placard
    try {
      const fridgeItems = await DatabaseService.getFridgeItems();
      let hasAnyFridgeChange = false;
      let updatedFridge = fridgeItems.map((item) => {
        if (event.type === 'promote') {
          if (event.parentIds.includes(item.canonicalId || '')) {
            const recheck = normalizeIngredient({ name: item.name });
            if (recheck.canonicalId === event.newIngredient.id) {
              fridgeUpdated++;
              hasAnyFridgeChange = true;
              return { ...item, canonicalId: event.newIngredient.id, aisle: event.newIngredient.defaultAisle };
            }
          }
        } else if (event.type === 'merge') {
          const isSource =
            item.canonicalId === event.sourceId ||
            (event.sourceIngredient && (
              normalizeString(item.name) === event.sourceIngredient.normalizedName ||
              (event.sourceIngredient.aliases && event.sourceIngredient.aliases.includes(normalizeString(item.name)))
            ));
          if (isSource) {
            fridgeUpdated++;
            hasAnyFridgeChange = true;
            return {
              ...item,
              name: event.targetIngredient.canonicalName,
              canonicalId: event.targetId,
              aisle: event.targetIngredient.defaultAisle,
            };
          }
        } else if (event.type === 'update') {
          if (item.canonicalId === event.updatedIngredient.id) {
            if (item.aisle !== event.updatedIngredient.defaultAisle) {
              fridgeUpdated++;
              hasAnyFridgeChange = true;
              return { ...item, aisle: event.updatedIngredient.defaultAisle };
            }
          }
        } else if (event.type === 'delete') {
          if (item.canonicalId === event.deletedId) {
            fridgeUpdated++;
            hasAnyFridgeChange = true;
            const recheck = normalizeIngredient({ name: item.name });
            const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
            return { ...item, canonicalId: recheck.canonicalId, aisle: canonDef?.defaultAisle || item.aisle };
          }
        } else if (event.type === 'reset') {
          const recheck = normalizeIngredient({ name: item.name });
          const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
          if (recheck.canonicalId !== item.canonicalId || (canonDef && canonDef.defaultAisle !== item.aisle)) {
            fridgeUpdated++;
            hasAnyFridgeChange = true;
            return { ...item, canonicalId: recheck.canonicalId, aisle: canonDef?.defaultAisle || item.aisle };
          }
        }
        return item;
      });

      // Déduplication après merge
      if (event.type === 'merge') {
        const seenCanonical = new Set<string>();
        const seenNames = new Set<string>();
        const deduped: FridgeItem[] = [];
        for (const item of updatedFridge) {
          const cId = item.canonicalId;
          const nName = normalizeString(item.name);
          if (cId && seenCanonical.has(cId)) { hasAnyFridgeChange = true; fridgeUpdated++; continue; }
          if (seenNames.has(nName)) { hasAnyFridgeChange = true; fridgeUpdated++; continue; }
          if (cId) seenCanonical.add(cId);
          seenNames.add(nName);
          deduped.push(item);
        }
        updatedFridge = deduped;
      }

      if (hasAnyFridgeChange) {
        memoryCache.fridgeItems = updatedFridge;
        await this.saveFridgeItems(updatedFridge);
      }
    } catch (e) {
      console.error('Erreur cascade stock:', e);
    }

    // 3. Traitement de la Liste de Courses
    try {
      const shoppingItems = await DatabaseService.getShoppingItems();
      let hasAnyShoppingChange = false;
      let updatedShopping = shoppingItems.map((item) => {
        if (event.type === 'promote') {
          if (event.parentIds.includes(item.canonicalId || '')) {
            const recheck = normalizeIngredient({ name: item.name });
            if (recheck.canonicalId === event.newIngredient.id) {
              shoppingUpdated++;
              hasAnyShoppingChange = true;
              return {
                ...item,
                name: event.newIngredient.canonicalName,
                canonicalId: event.newIngredient.id,
                aisle: event.newIngredient.defaultAisle,
              };
            }
          }
        } else if (event.type === 'merge') {
          const isSource =
            item.canonicalId === event.sourceId ||
            (event.sourceIngredient && (
              normalizeString(item.name) === event.sourceIngredient.normalizedName ||
              (event.sourceIngredient.aliases && event.sourceIngredient.aliases.includes(normalizeString(item.name)))
            ));
          if (isSource) {
            shoppingUpdated++;
            hasAnyShoppingChange = true;
            return {
              ...item,
              name: event.targetIngredient.canonicalName,
              canonicalId: event.targetId,
              aisle: event.targetIngredient.defaultAisle,
            };
          }
        } else if (event.type === 'update') {
          if (item.canonicalId === event.updatedIngredient.id) {
            let changed = false;
            const nextItem = { ...item };
            if (
              event.previousIngredient.canonicalName === item.name &&
              event.updatedIngredient.canonicalName !== item.name
            ) {
              nextItem.name = event.updatedIngredient.canonicalName;
              changed = true;
            }
            if (event.updatedIngredient.defaultAisle !== item.aisle) {
              nextItem.aisle = event.updatedIngredient.defaultAisle;
              changed = true;
            }
            if (changed) {
              shoppingUpdated++;
              hasAnyShoppingChange = true;
              return nextItem;
            }
          }
        } else if (event.type === 'delete') {
          if (item.canonicalId === event.deletedId) {
            shoppingUpdated++;
            hasAnyShoppingChange = true;
            const recheck = normalizeIngredient({ name: item.name });
            const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
            return { ...item, canonicalId: recheck.canonicalId, aisle: canonDef?.defaultAisle || item.aisle };
          }
        } else if (event.type === 'reset') {
          const recheck = normalizeIngredient({ name: item.name });
          const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
          if (recheck.canonicalId !== item.canonicalId || (canonDef && canonDef.defaultAisle !== item.aisle)) {
            shoppingUpdated++;
            hasAnyShoppingChange = true;
            return {
              ...item,
              canonicalId: recheck.canonicalId,
              name: recheck.canonicalId ? recheck.name : item.name,
              aisle: canonDef?.defaultAisle || item.aisle,
            };
          }
        }
        return item;
      });

      // Consolidation après merge
      if (event.type === 'merge') {
        const consolidated: ShoppingItem[] = [];
        for (const item of updatedShopping) {
          const existingIdx = consolidated.findIndex((c) =>
            (c.canonicalId && item.canonicalId && c.canonicalId === item.canonicalId) ||
            normalizeString(c.name) === normalizeString(item.name)
          );
          if (existingIdx >= 0) {
            const existing = consolidated[existingIdx];
            const mergedQty = [existing.quantity, item.quantity].filter(Boolean).join(' + ');
            consolidated[existingIdx] = {
              ...existing,
              quantity: mergedQty || existing.quantity,
              isChecked: existing.isChecked && item.isChecked,
            };
            hasAnyShoppingChange = true;
            shoppingUpdated++;
          } else {
            consolidated.push(item);
          }
        }
        updatedShopping = consolidated;
      }

      if (hasAnyShoppingChange) {
        memoryCache.shoppingList = updatedShopping;
        await this.saveShoppingList(updatedShopping);
      }
    } catch (e) {
      console.error('Erreur cascade courses:', e);
    }

    return { recipesUpdated, shoppingUpdated, fridgeUpdated };
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GESTION DE LA LISTE DE COURSES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Écouteur réactif des mutations du stock frigo / étagères
   */
  onFridgeChange(listener: StorageListener<FridgeItem[]>): () => void {
    fridgeListeners.push(listener);
    return () => {
      fridgeListeners = fridgeListeners.filter((l) => l !== listener);
    };
  },

  /**
   * Écouteur réactif des mutations de la liste de courses
   */
  onShoppingListChange(listener: StorageListener<ShoppingItem[]>): () => void {
    shoppingListeners.push(listener);
    return () => {
      shoppingListeners = shoppingListeners.filter((l) => l !== listener);
    };
  },

  /**
   * Récupère la liste de courses de manière synchrone depuis le cache mémoire si elle est déjà chargée
   */
  getSyncShoppingList(): ShoppingItem[] | null {
    return memoryCache.shoppingList;
  },

  /**
   * Récupère la liste de courses stockée localement
   */
  async getShoppingList(): Promise<ShoppingItem[]> {
    if (memoryCache.shoppingList) {
      return memoryCache.shoppingList;
    }

    try {
      const items = await DatabaseService.getShoppingItems();
      memoryCache.shoppingList = items;
      return items;
    } catch (e) {
      console.error('Erreur lecture liste de courses:', e);
      return [];
    }
  },

  /**
   * Sauvegarde la liste de courses
   */
  async saveShoppingList(items: ShoppingItem[]): Promise<ShoppingItem[]> {
    try {
      const seenIds = new Set<string>();
      const deduplicated: ShoppingItem[] = [];
      for (const item of items) {
        if (!item || !item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        deduplicated.push(item);
      }
      memoryCache.shoppingList = deduplicated;
      await DatabaseService.saveShoppingItems(deduplicated);
      shoppingListeners.forEach((l) => {
        try { l(deduplicated); } catch (err) { console.error('Erreur listener shopping:', err); }
      });
      return deduplicated;
    } catch (e) {
      console.error('Erreur sauvegarde liste de courses:', e);
      throw e;
    }
  },

  /**
   * Ajoute les ingrédients d'une recette avec mise à l'échelle des portions.
   * Peut recevoir une sélection d'identifiants d'ingrédients pour exclure les fonds de placard / facultatifs.
   */
  async addRecipeToShoppingList(
    recipe: Recipe,
    targetServings: number,
    selectedIngredientIds?: string[]
  ): Promise<{ updatedList: ShoppingItem[]; addedCount: number }> {
    try {
      const currentList = await this.getShoppingList();
      const baseServings = recipe.servings || 4;

      const ingredientsToAdd = selectedIngredientIds && selectedIngredientIds.length > 0
        ? recipe.ingredients.filter((ing) => selectedIngredientIds.includes(ing.id))
        : recipe.ingredients;

      const newItems: ShoppingItem[] = ingredientsToAdd
        .map((ing) =>
          createShoppingItemFromIngredient(
            ing,
            baseServings,
            targetServings,
            recipe.title,
            recipe.id
          )
        )
        .filter((item): item is ShoppingItem => item !== null);

      const updatedList = mergeShoppingItems(currentList, newItems);
      await this.saveShoppingList(updatedList);
      newItems.forEach((item) => trackShoppingItemAdded(item, 'recipe'));
      return { updatedList, addedCount: newItems.length };
    } catch (e) {
      console.error('Erreur ajout recette liste de courses:', e);
      throw e;
    }
  },

  /**
   * Ajoute un article manuel ou personnalisé à la liste de courses
   */
  async addCustomShoppingItem(
    name: string,
    quantity?: string,
    unit?: string,
    aisle?: ShoppingAisle,
    canonicalId?: string
  ): Promise<ShoppingItem[]> {
    try {
      const trimmed = name.trim();
      if (!trimmed) return await this.getShoppingList();

      const norm = normalizeIngredient({ name: trimmed, canonicalId, quantity, unit });
      const resolvedCanonicalId = canonicalId || norm.canonicalId;
      const resolvedName = norm.canonicalId ? norm.name : (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));

      // Exclusion stricte de l'eau
      if (resolvedCanonicalId === 'ing_canon_eau' || normalizeString(resolvedName) === 'eau') {
        return await this.getShoppingList();
      }

      let resolvedAisle = aisle;
      if (!resolvedAisle && norm.canonicalId) {
        const vocabMapById = VocabularyService.getSyncMapById();
        const canonDef = norm.canonicalId ? vocabMapById.get(norm.canonicalId) : undefined;
        if (canonDef) resolvedAisle = canonDef.defaultAisle;
      }
      if (!resolvedAisle) {
        resolvedAisle = classifyIngredientAisle(resolvedName);
      }

      const isStaple = Boolean(norm.isPantryStaple);
      const finalQuantity = isStaple ? undefined : (quantity?.trim() || norm.quantity || undefined);
      const finalUnit = isStaple ? undefined : (unit?.trim() || norm.unit || undefined);

      const newItem: ShoppingItem = {
        id: generateUniqueId('shop_custom'),
        name: resolvedName,
        canonicalId: resolvedCanonicalId,
        quantity: finalQuantity,
        unit: finalUnit,
        isChecked: false,
        aisle: resolvedAisle,
        createdAt: new Date().toISOString(),
      };

      const currentList = await this.getShoppingList();
      const updatedList = mergeShoppingItems(currentList, [newItem]);
      await this.saveShoppingList(updatedList);
      trackShoppingItemAdded(newItem, 'manual');
      return updatedList;
    } catch (e) {
      console.error('Erreur ajout article custom liste courses:', e);
      throw e;
    }
  },

  /**
   * Ajoute un article à la liste de courses via saisie libre intelligente (ex: "1kg carottes", "kinder bueno", "6 oeufs")
   * Détecte automatiquement la quantité, l'unité, le nom canonique et le rayon de manière transparente.
   */
  async addFreeformShoppingItem(
    rawInput: string,
    preferredAisle?: ShoppingAisle | null
  ): Promise<ShoppingItem[]> {
    try {
      const parsed = parseShoppingInput(rawInput, preferredAisle);
      if (!parsed.name) return await this.getShoppingList();

      // Exclusion stricte de l'eau
      if (parsed.canonicalId === 'ing_canon_eau' || normalizeString(parsed.name) === 'eau') {
        return await this.getShoppingList();
      }

      const newItem: ShoppingItem = {
        id: generateUniqueId('shop_freeform'),
        name: parsed.name,
        canonicalId: parsed.canonicalId,
        quantity: parsed.quantity,
        unit: parsed.unit,
        isChecked: false,
        aisle: parsed.aisle,
        createdAt: new Date().toISOString(),
      };

      const currentList = await this.getShoppingList();
      const updatedList = mergeShoppingItems(currentList, [newItem]);
      await this.saveShoppingList(updatedList);
      trackShoppingItemAdded(newItem, 'manual');
      if (parsed.canonicalId) {
        VocabularyService.incrementUsage(parsed.canonicalId).catch(() => {});
      }
      return updatedList;
    } catch (e) {
      console.error('Erreur addFreeformShoppingItem:', e);
      throw e;
    }
  },

  /**
   * Coche ou décoche un article de courses
   */
  async toggleShoppingItem(id: string): Promise<ShoppingItem[]> {
    try {
      await DatabaseService.toggleShoppingItem(id);
      if (memoryCache.shoppingList) {
        memoryCache.shoppingList = memoryCache.shoppingList.map((item) =>
          item.id === id ? { ...item, isChecked: !item.isChecked } : item
        );
        return memoryCache.shoppingList;
      }
      return this.getShoppingList();
    } catch (e) {
      console.error('Erreur toggle shopping item:', e);
      throw e;
    }
  },

  /**
   * Modifie un article existant dans la liste de courses
   */
  async updateShoppingItem(updatedItem: ShoppingItem): Promise<ShoppingItem[]> {
    try {
      await DatabaseService.updateShoppingItem(updatedItem);
      if (memoryCache.shoppingList) {
        memoryCache.shoppingList = memoryCache.shoppingList.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        );
        return memoryCache.shoppingList;
      }
      return this.getShoppingList();
    } catch (e) {
      console.error('Erreur modification shopping item:', e);
      throw e;
    }
  },

  /**
   * Déplace tous les articles cochés de la liste de courses vers les étagères
   */
  async moveCheckedShoppingItemsToFridge(): Promise<{ shoppingList: ShoppingItem[]; fridgeItems: FridgeItem[]; movedCount: number }> {
    try {
      const currentList = await this.getShoppingList();
      const checkedItems = currentList.filter((i) => i.isChecked);
      if (checkedItems.length === 0) {
        const fridgeItems = await this.getFridgeItems();
        return { shoppingList: currentList, fridgeItems, movedCount: 0 };
      }

      let fridgeItems = await this.getFridgeItems();
      for (const item of checkedItems) {
        fridgeItems = await this.addFridgeItem(item.name, item.aisle, item.canonicalId);
      }

      const updatedShopping = currentList.filter((i) => !i.isChecked);
      await this.saveShoppingList(updatedShopping);
      checkedItems.forEach(trackShoppingItemRemoved);

      return { shoppingList: updatedShopping, fridgeItems, movedCount: checkedItems.length };
    } catch (e) {
      console.error('Erreur déplacement articles cochés vers frigo:', e);
      throw e;
    }
  },

  /**
   * Supprime un article spécifique de la liste de courses
   */
  async deleteShoppingItem(id: string): Promise<ShoppingItem[]> {
    try {
      const currentList = await this.getShoppingList();
      const removedItem = currentList.find((item) => item.id === id);
      await DatabaseService.deleteShoppingItem(id);
      if (memoryCache.shoppingList) {
        memoryCache.shoppingList = memoryCache.shoppingList.filter((item) => item.id !== id);
      }
      if (removedItem) trackShoppingItemRemoved(removedItem);
      return memoryCache.shoppingList ?? this.getShoppingList();
    } catch (e) {
      console.error('Erreur suppression shopping item:', e);
      throw e;
    }
  },

  /**
   * Supprime tous les articles cochés
   */
  async clearCompletedShoppingItems(): Promise<ShoppingItem[]> {
    try {
      const currentList = await this.getShoppingList();
      await DatabaseService.clearCheckedShoppingItems();
      const updatedList = currentList.filter((item) => !item.isChecked);
      memoryCache.shoppingList = updatedList;
      currentList.filter((item) => item.isChecked).forEach(trackShoppingItemRemoved);
      return updatedList;
    } catch (e) {
      console.error('Erreur suppression cochés:', e);
      throw e;
    }
  },

  /**
   * Vide l'intégralité de la liste de courses
   */
  async clearAllShoppingItems(): Promise<ShoppingItem[]> {
    try {
      const currentList = await this.getShoppingList();
      await DatabaseService.clearAllShoppingItems();
      memoryCache.shoppingList = [];
      currentList.forEach(trackShoppingItemRemoved);
      return [];
    } catch (e) {
      console.error('Erreur vidage liste courses:', e);
      throw e;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GESTION DU FRIGO (INVENTAIRE & STOCK)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère le stock du frigo de manière synchrone depuis le cache mémoire s'il est déjà chargé
   */
  getSyncFridgeItems(): FridgeItem[] | null {
    return memoryCache.fridgeItems;
  },

  /**
   * Récupère la liste des aliments actuellement présents dans le frigo
   */
  async getFridgeItems(): Promise<FridgeItem[]> {
    if (memoryCache.fridgeItems) {
      return memoryCache.fridgeItems;
    }

    try {
      const rows = await DatabaseService.getFridgeItems();
      const sanitized = rows.map(sanitizeFridgeItem).filter((i): i is FridgeItem => i !== null);

      // Auto-déduplication stricte
      const seenCanonical = new Set<string>();
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();
      const deduplicated: FridgeItem[] = [];
      let hadDuplicates = false;

      for (const item of sanitized) {
        if (!item || !item.id) continue;
        if (seenIds.has(item.id)) { hadDuplicates = true; continue; }
        const cId = item.canonicalId;
        const nName = normalizeString(item.name);
        if (cId && seenCanonical.has(cId)) { hadDuplicates = true; continue; }
        if (seenNames.has(nName)) { hadDuplicates = true; continue; }
        seenIds.add(item.id);
        if (cId) seenCanonical.add(cId);
        seenNames.add(nName);
        deduplicated.push(item);
      }

      if (hadDuplicates) {
        DatabaseService.saveFridgeItems(deduplicated).catch(() => {});
      }

      memoryCache.fridgeItems = deduplicated;
      return deduplicated;
    } catch (e) {
      console.error('Erreur lecture aliments frigo:', e);
      return [];
    }
  },

  /**
   * Sauvegarde la liste complète des aliments du frigo
   */
  async saveFridgeItems(items: FridgeItem[]): Promise<FridgeItem[]> {
    try {
      const sanitized = items.map(sanitizeFridgeItem).filter((i): i is FridgeItem => i !== null);
      const seenIds = new Set<string>();
      const deduplicated: FridgeItem[] = [];
      for (const item of sanitized) {
        if (!item || !item.id || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        deduplicated.push(item);
      }
      memoryCache.fridgeItems = deduplicated;
      await DatabaseService.saveFridgeItems(deduplicated);
      fridgeListeners.forEach((l) => {
        try { l(deduplicated); } catch (err) { console.error('Erreur listener fridge:', err); }
      });
      return deduplicated;
    } catch (e) {
      console.error('Erreur sauvegarde aliments frigo:', e);
      throw e;
    }
  },

  /**
   * Ajoute un nouvel aliment au frigo avec catégorisation automatique par rayon et canonicalId
   */
  async addFridgeItem(name: string, aisle?: ShoppingAisle, canonicalId?: string): Promise<FridgeItem[]> {
    try {
      const trimmed = name.trim();
      if (!trimmed) return await this.getFridgeItems();

      const currentItems = await this.getFridgeItems();

      // Résolution canonique
      const norm = normalizeIngredient({ name: trimmed, canonicalId });
      const resolvedCanonicalId = canonicalId || norm.canonicalId;
      const resolvedName = norm.canonicalId ? norm.name : (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));

      // Rayon officiel via defaultAisle
      let assignedAisle = aisle;
      if (!assignedAisle && resolvedCanonicalId) {
        const vocabMapById = VocabularyService.getSyncMapById();
        const canonDef = resolvedCanonicalId ? vocabMapById.get(resolvedCanonicalId) : undefined;
        if (canonDef) assignedAisle = canonDef.defaultAisle;
      }
      if (!assignedAisle) {
        assignedAisle = classifyIngredientAisle(resolvedName);
      }

      // Anti-doublon strict basé sur canonicalId (O(1)) ou nom normalisé
      const normNew = normalizeString(resolvedName);
      const existing = currentItems.find((i) => {
        if (resolvedCanonicalId && i.canonicalId) {
          return i.canonicalId === resolvedCanonicalId;
        }
        const normItem = normalizeString(i.name);
        return (
          normItem === normNew ||
          (normNew.endsWith('s') && normItem === normNew.slice(0, -1)) ||
          (!normNew.endsWith('s') && `${normItem}s` === normNew)
        );
      });
      if (existing) {
        return currentItems;
      }

      const newItem: FridgeItem = {
        id: generateUniqueId('fridge'),
        name: resolvedName,
        canonicalId: resolvedCanonicalId,
        aisle: assignedAisle,
        createdAt: new Date().toISOString(),
      };

      await DatabaseService.addFridgeItem(newItem);
      const updated = [newItem, ...currentItems];
      memoryCache.fridgeItems = updated;
      trackFridgeItemAdded(newItem);
      return updated;
    } catch (e) {
      console.error('Erreur ajout aliment frigo:', e);
      throw e;
    }
  },

  /**
   * Ajoute plusieurs aliments au frigo (ex: depuis suggestions rapides) avec canonicalId
   */
  async addMultipleFridgeItems(names: string[]): Promise<FridgeItem[]> {
    try {
      const currentItems = await this.getFridgeItems();
      const existingCanonicalIds = new Set(currentItems.map((i) => i.canonicalId).filter(Boolean));
      const existingNames = new Set(currentItems.map((i) => normalizeString(i.name)));
      const toAdd: FridgeItem[] = [];

      names.forEach((name) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const norm = normalizeIngredient({ name: trimmed });
        const resolvedCanonicalId = norm.canonicalId;
        const resolvedName = norm.canonicalId ? norm.name : (trimmed.charAt(0).toUpperCase() + trimmed.slice(1));
        const normClean = normalizeString(resolvedName);

        if (resolvedCanonicalId && existingCanonicalIds.has(resolvedCanonicalId)) return;
        if (existingNames.has(normClean)) return;

        if (resolvedCanonicalId) existingCanonicalIds.add(resolvedCanonicalId);
        existingNames.add(normClean);

        let assignedAisle: ShoppingAisle | undefined;
        if (resolvedCanonicalId) {
          const vocabMapById = VocabularyService.getSyncMapById();
          const canonDef = resolvedCanonicalId ? vocabMapById.get(resolvedCanonicalId) : undefined;
          if (canonDef) assignedAisle = canonDef.defaultAisle;
        }
        if (!assignedAisle) {
          assignedAisle = classifyIngredientAisle(resolvedName);
        }

        toAdd.push({
          id: generateUniqueId('fridge'),
          name: resolvedName,
          canonicalId: resolvedCanonicalId,
          aisle: assignedAisle,
          createdAt: new Date().toISOString(),
        });
      });

      if (toAdd.length === 0) return currentItems;
      const updated = [...toAdd, ...currentItems];
      await this.saveFridgeItems(updated);
      toAdd.forEach(trackFridgeItemAdded);
      return updated;
    } catch (e) {
      console.error('Erreur ajout multiple frigo:', e);
      throw e;
    }
  },

  /**
   * Supprime un aliment du frigo
   */
  async removeFridgeItem(id: string): Promise<FridgeItem[]> {
    try {
      const currentItems = await this.getFridgeItems();
      const removedItem = currentItems.find((item) => item.id === id);
      await DatabaseService.removeFridgeItem(id);
      if (memoryCache.fridgeItems) {
        memoryCache.fridgeItems = memoryCache.fridgeItems.filter((i) => i.id !== id);
      }
      if (removedItem) trackFridgeItemRemoved(removedItem);
      return memoryCache.fridgeItems ?? this.getFridgeItems();
    } catch (e) {
      console.error('Erreur suppression aliment frigo:', e);
      throw e;
    }
  },

  /**
   * Vide l'intégralité du frigo
   */
  async clearFridge(): Promise<FridgeItem[]> {
    try {
      const currentItems = await this.getFridgeItems();
      await DatabaseService.clearFridge();
      memoryCache.fridgeItems = [];
      currentItems.forEach(trackFridgeItemRemoved);
      return [];
    } catch (e) {
      console.error('Erreur vidage frigo:', e);
      throw e;
    }
  },

  /**
   * Déplace un article acheté de la liste de courses vers le frigo
   */
  async moveShoppingItemToFridge(shoppingItemId: string): Promise<{ shoppingList: ShoppingItem[]; fridgeItems: FridgeItem[] }> {
    try {
      const shoppingList = await this.getShoppingList();
      const targetItem = shoppingList.find((i) => i.id === shoppingItemId);
      if (!targetItem) {
        const fridgeItems = await this.getFridgeItems();
        return { shoppingList, fridgeItems };
      }

      // Ajout au frigo avec son canonicalId
      const updatedFridge = await this.addFridgeItem(targetItem.name, targetItem.aisle, targetItem.canonicalId);

      // Suppression de la liste de courses
      const updatedShopping = shoppingList.filter((i) => i.id !== shoppingItemId);
      await this.saveShoppingList(updatedShopping);
      trackShoppingItemRemoved(targetItem);

      return { shoppingList: updatedShopping, fridgeItems: updatedFridge };
    } catch (e) {
      console.error('Erreur déplacement courses vers frigo:', e);
      throw e;
    }
  },

  /**
   * Copie un aliment du frigo vers la liste de courses (ex: quand on en a plus)
   */
  async copyFridgeItemToShopping(fridgeItem: FridgeItem): Promise<ShoppingItem[]> {
    try {
      return await this.addCustomShoppingItem(fridgeItem.name, undefined, undefined, fridgeItem.aisle, fridgeItem.canonicalId);
    } catch (e) {
      console.error('Erreur copie aliment vers courses:', e);
      throw e;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GESTION DU MENU DE LA SEMAINE (PLANNING)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère les préférences de planification des menus (fixe vs dynamique, premier jour)
   */
  async getPlannerSettings(): Promise<PlannerSettings> {
    try {
      return await DatabaseService.getPlannerSettings();
    } catch (e) {
      console.error('Erreur lecture réglages planification:', e);
      return DEFAULT_PLANNER_SETTINGS;
    }
  },

  /**
   * Sauvegarde les préférences de planification des menus
   */
  async savePlannerSettings(
    settings: Partial<PlannerSettings>
  ): Promise<PlannerSettings> {
    try {
      const current = await this.getPlannerSettings();
      const updated: PlannerSettings = { ...current, ...settings };
      await DatabaseService.savePlannerSettings(updated);
      return updated;
    } catch (e) {
      console.error('Erreur sauvegarde réglages planification:', e);
      return DEFAULT_PLANNER_SETTINGS;
    }
  },

  /**
   * Récupère le planning des repas de la semaine
   */
  async getWeeklyPlan(): Promise<WeeklyPlanMap> {
    try {
      return await DatabaseService.getWeeklyPlan();
    } catch (e) {
      console.error('Erreur lecture planning semaine:', e);
      return {};
    }
  },

  /**
   * Sauvegarde le planning des repas
   */
  async saveWeeklyPlan(plan: WeeklyPlanMap): Promise<WeeklyPlanMap> {
    try {
      // Remplace tout le planning (supprime + réinsère)
      await DatabaseService.clearWeeklyPlan();
      for (const [slotKey, meal] of Object.entries(plan)) {
        if (meal) await DatabaseService.setWeeklyMeal(slotKey, meal);
      }
      return plan;
    } catch (e) {
      console.error('Erreur sauvegarde planning semaine:', e);
      throw e;
    }
  },

  /**
   * Assigne ou retire un repas prévu pour un créneau (Jour ou date + Midi/Soir)
   */
  async setWeeklyMeal(
    dayOrKey: DayOfWeek | string,
    mealTime: MealTime,
    meal: PlannedMeal | null
  ): Promise<WeeklyPlanMap> {
    try {
      const slotKey = dayOrKey.includes('_') ? dayOrKey : `${dayOrKey}_${mealTime}`;
      const currentPlan = await this.getWeeklyPlan();
      const previousMeal = currentPlan[slotKey];

      await DatabaseService.setWeeklyMeal(slotKey, meal);

      const nextPlan = { ...currentPlan };
      if (meal) {
        nextPlan[slotKey] = meal;
      } else {
        delete nextPlan[slotKey];
      }

      if (meal) {
        if (previousMeal && previousMeal.id !== meal.id) {
          trackMealPlanUpdate(slotKey, mealTime, previousMeal, false);
        }
        trackMealPlanUpdate(slotKey, mealTime, meal, true);
      } else if (previousMeal) {
        trackMealPlanUpdate(slotKey, mealTime, previousMeal, false);
      }
      return nextPlan;
    } catch (e) {
      console.error('Erreur mise à jour repas créneau:', e);
      throw e;
    }
  },

  /**
   * Réinitialise le planning de la semaine (ou une sélection spécifique de créneaux)
   */
  async clearWeeklyPlan(slotKeysToClear?: string[]): Promise<WeeklyPlanMap> {
    try {
      const currentPlan = await this.getWeeklyPlan();

      if (!slotKeysToClear || slotKeysToClear.length === 0) {
        await DatabaseService.clearWeeklyPlan();
        Object.entries(currentPlan).forEach(([slotKey, meal]) => {
          if (meal) trackMealPlanUpdate(slotKey, meal.mealTime, meal, false);
        });
        return {};
      }

      await DatabaseService.clearWeeklyPlan(slotKeysToClear);
      const nextPlan = { ...currentPlan };
      slotKeysToClear.forEach((k) => {
        const meal = currentPlan[k];
        if (meal) trackMealPlanUpdate(k, meal.mealTime, meal, false);
        delete nextPlan[k];
      });
      return nextPlan;
    } catch (e) {
      console.error('Erreur effacement planning semaine:', e);
      throw e;
    }
  },

  /**
   * Fusionne l'intégralité des ingrédients des recettes programmées de la semaine
   * avec calcul automatique selon le nombre de portions de chaque créneau.
   * Si slotKeysFilter est fourni, seuls les créneaux spécifiés sont pris en compte.
   */
  async generateShoppingListFromWeeklyPlan(
    recipes: Recipe[],
    plan: WeeklyPlanMap,
    slotKeysFilter?: string[]
  ): Promise<{ updatedList: ShoppingItem[]; addedCount: number }> {
    try {
      const currentShoppingList = await this.getShoppingList();
      const recipeMap = new Map<string, Recipe>();
      recipes.forEach((r) => recipeMap.set(r.id, r));

      const newItemsToMerge: ShoppingItem[] = [];

      const relevantEntries = slotKeysFilter
        ? slotKeysFilter.map((k) => plan[k]).filter(Boolean)
        : Object.values(plan);

      relevantEntries.forEach((plannedMeal) => {
        if (!plannedMeal || !plannedMeal.recipeId) return;

        const recipe = recipeMap.get(plannedMeal.recipeId);
        if (!recipe) return;

        const targetServings = plannedMeal.servings || recipe.servings || 4;
        const baseServings = recipe.servings || 4;

        recipe.ingredients.forEach((ing) => {
          // Ne pas encombrer la liste de courses avec les ingrédients de base / fonds de placard par défaut
          if (ing.isPantryStaple) return;

          const created = createShoppingItemFromIngredient(
            ing,
            baseServings,
            targetServings,
            plannedMeal.recipeTitle || recipe.title,
            recipe.id
          );
          if (created) {
            newItemsToMerge.push(created);
          }
        });
      });

      const updatedList = mergeShoppingItems(currentShoppingList, newItemsToMerge);
      await this.saveShoppingList(updatedList);
      newItemsToMerge.forEach((item) => trackShoppingItemAdded(item, 'planner'));
      return { updatedList, addedCount: newItemsToMerge.length };
    } catch (e) {
      console.error('Erreur génération liste de courses depuis planning:', e);
      throw e;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // JOURNAL DES REPAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Charge l'ensemble du journal des repas (ce qui a été mangé)
   */
  async getMealLogs(): Promise<MealLogMap> {
    try {
      return await DatabaseService.getMealLogs();
    } catch (e) {
      console.error('Erreur lecture suivi repas:', e);
      return {};
    }
  },

  /**
   * Sauvegarde le dictionnaire complet du suivi des repas
   */
  async saveMealLogs(logs: MealLogMap): Promise<MealLogMap> {
    try {
      await DatabaseService.saveMealLogs(logs);
      return logs;
    } catch (e) {
      console.error('Erreur sauvegarde suivi repas:', e);
      throw e;
    }
  },

  /**
   * Enregistre ou supprime un plat mangé pour une date ("YYYY-MM-DD") et un créneau (midi ou soir)
   */
  async setMealLog(
    date: string,
    mealTime: MealTime,
    entry: {
      title: string;
      recipeId?: string;
      recipeImageUrl?: string;
      note?: string;
    } | null
  ): Promise<MealLogMap> {
    try {
      const slotKey = `${date}_${mealTime}`;
      const currentLogs = await this.getMealLogs();

      if (entry && entry.title.trim()) {
        const existing = currentLogs[slotKey];
        const logEntry: MealLogEntry = {
          id: existing?.id || generateUniqueId('mlog'),
          date,
          mealTime,
          title: entry.title.trim().slice(0, 200),
          recipeId: entry.recipeId,
          recipeImageUrl: sanitizeImageUrl(entry.recipeImageUrl),
          note: entry.note?.trim(),
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await DatabaseService.setMealLog(slotKey, logEntry);
        return { ...currentLogs, [slotKey]: logEntry };
      } else {
        await DatabaseService.setMealLog(slotKey, null);
        const nextLogs = { ...currentLogs };
        delete nextLogs[slotKey];
        return nextLogs;
      }
    } catch (e) {
      console.error('Erreur enregistrement plat suivi repas:', e);
      throw e;
    }
  },

  /**
   * Récupère rapidement ce qui a été mangé aujourd'hui (midi et soir)
   */
  async getTodayMeals(): Promise<{ lunch?: MealLogEntry; dinner?: MealLogEntry }> {
    try {
      const todayStr = getLocalDateString();
      const logs = await this.getMealLogs();
      return {
        lunch: logs[`${todayStr}_lunch`],
        dinner: logs[`${todayStr}_dinner`],
      };
    } catch (e) {
      console.error('Erreur lecture repas aujourd\'hui:', e);
      return {};
    }
  },

  /**
   * Récupère la liste chronologique résumée des derniers jours pour l'historique
   */
  async getRecentDaysMealLogs(daysCount: number = 14): Promise<DayMealLogSummary[]> {
    try {
      const logs = await this.getMealLogs();
      const today = new Date();
      const results: DayMealLogSummary[] = [];

      for (let i = 0; i < daysCount; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayOfWeek = getDayOfWeekFromDateString(dateStr);
        const dateLabel = formatMealLogDateFrench(dateStr);

        results.push({
          date: dateStr,
          dateLabel,
          dayOfWeek,
          lunch: logs[`${dateStr}_lunch`],
          dinner: logs[`${dateStr}_dinner`],
        });
      }

      return results;
    } catch (e) {
      console.error('Erreur lecture historique repas:', e);
      return [];
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PRÉFÉRENCES UTILISATEUR (Thème, vue, portions, allergènes…)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère le mode de thème sauvegardé ('system' | 'light' | 'dark' | 'colorblind')
   */
  async getThemeMode(): Promise<'system' | 'light' | 'dark' | 'colorblind'> {
    try {
      const mode = await DatabaseService.getSetting(SETTING_THEME_MODE);
      if (mode === 'light' || mode === 'dark' || mode === 'system' || mode === 'colorblind') {
        return mode as 'system' | 'light' | 'dark' | 'colorblind';
      }
      return 'system';
    } catch (e) {
      console.error('Erreur lecture thème:', e);
      return 'system';
    }
  },

  /**
   * Sauvegarde le mode de thème
   */
  async saveThemeMode(mode: 'system' | 'light' | 'dark' | 'colorblind'): Promise<void> {
    try {
      await DatabaseService.setSetting(SETTING_THEME_MODE, mode);
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e);
    }
  },

  /**
   * Récupère le mode d'affichage des recettes sauvegardé ('detailed' | 'compact' | 'grid')
   */
  async getRecipeViewMode(): Promise<RecipeViewMode> {
    if (memoryCache.recipeViewMode) {
      return memoryCache.recipeViewMode;
    }
    try {
      const mode = await DatabaseService.getSetting(SETTING_RECIPE_VIEW_MODE);
      if (mode === 'compact' || mode === 'detailed' || mode === 'grid') {
        memoryCache.recipeViewMode = mode as RecipeViewMode;
        return mode as RecipeViewMode;
      }
      memoryCache.recipeViewMode = 'detailed';
      return 'detailed';
    } catch {
      return 'detailed';
    }
  },

  /**
   * Sauvegarde le mode d'affichage des recettes
   */
  async saveRecipeViewMode(mode: RecipeViewMode): Promise<void> {
    memoryCache.recipeViewMode = mode;
    try {
      await DatabaseService.setSetting(SETTING_RECIPE_VIEW_MODE, mode);
    } catch (e) {
      console.error('Erreur sauvegarde mode de vue recettes:', e);
    }
  },

  /**
   * Récupère le nombre de portions par défaut configuré
   */
  async getDefaultServings(): Promise<number> {
    try {
      const stored = await DatabaseService.getSetting(SETTING_DEFAULT_SERVINGS);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 50) return parsed;
      }
      return 4;
    } catch {
      return 4;
    }
  },

  /**
   * Sauvegarde le nombre de portions par défaut
   */
  async saveDefaultServings(servings: number): Promise<void> {
    try {
      await DatabaseService.setSetting(SETTING_DEFAULT_SERVINGS, String(servings));
    } catch (e) {
      console.error('Erreur sauvegarde portions par défaut:', e);
    }
  },

  /**
   * Récupère la liste des allergènes enregistrés par l'utilisateur
   */
  async getUserAllergens(): Promise<UserAllergenItem[]> {
    try {
      return await DatabaseService.getUserAllergens();
    } catch (e) {
      console.error('Erreur lecture allergènes:', e);
      return [];
    }
  },

  /**
   * Sauvegarde la liste complète des allergènes utilisateur
   */
  async saveUserAllergens(items: UserAllergenItem[]): Promise<void> {
    try {
      await DatabaseService.saveUserAllergens(items);
    } catch (e) {
      console.error('Erreur sauvegarde allergènes:', e);
      throw e;
    }
  },

  /**
   * Ajoute ou met à jour un allergène dans la liste personnelle
   */
  async addUserAllergen(item: {
    name: string;
    canonicalId?: string;
    allergenFamily?: AllergenFamily | null;
  }): Promise<UserAllergenItem> {
    const list = await this.getUserAllergens();
    const cleanNorm = normalizeString(item.name);
    const existingIdx = list.findIndex((i) => normalizeString(i.name) === cleanNorm);

    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      const updatedItem: UserAllergenItem = {
        ...list[existingIdx],
        allergenFamily: item.allergenFamily !== undefined ? item.allergenFamily : list[existingIdx].allergenFamily,
        canonicalId: item.canonicalId || list[existingIdx].canonicalId,
      };
      const nextList = [...list];
      nextList[existingIdx] = updatedItem;
      await this.saveUserAllergens(nextList);
      return updatedItem;
    }

    const newItem: UserAllergenItem = {
      id: generateUniqueId('allg'),
      name: item.name.trim(),
      canonicalId: item.canonicalId,
      allergenFamily: item.allergenFamily || null,
      addedAt: now,
    };
    await this.saveUserAllergens([...list, newItem]);
    return newItem;
  },

  /**
   * Supprime un allergène par identifiant ou par nom
   */
  async removeUserAllergen(idOrName: string): Promise<UserAllergenItem[]> {
    const list = await this.getUserAllergens();
    const cleanNorm = normalizeString(idOrName);
    const filtered = list.filter((i) => i.id !== idOrName && normalizeString(i.name) !== cleanNorm);
    await this.saveUserAllergens(filtered);
    return filtered;
  },

  /**
   * Supprime tous les allergènes associés à une famille majeure
   */
  async removeAllergensByFamily(family: AllergenFamily): Promise<UserAllergenItem[]> {
    const list = await this.getUserAllergens();
    const filtered = list.filter((i) => i.allergenFamily !== family);
    await this.saveUserAllergens(filtered);
    return filtered;
  },

  /**
   * Vérifie si le filtrage automatique des recettes contenant des allergènes est activé (vrai par défaut)
   */
  async getAllergenFilterEnabled(): Promise<boolean> {
    try {
      const stored = await DatabaseService.getSetting(SETTING_ALLERGEN_FILTER);
      if (stored === null) return true; // Activé par défaut
      return stored === 'true';
    } catch {
      return true;
    }
  },

  /**
   * Active ou désactive le filtrage automatique des recettes avec allergènes
   */
  async setAllergenFilterEnabled(enabled: boolean): Promise<void> {
    try {
      await DatabaseService.setSetting(SETTING_ALLERGEN_FILTER, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Erreur sauvegarde réglage filtre allergènes:', e);
    }
  },

  /**
   * Vérifie si l'exclusion des allergènes dans les suggestions Chef IA est activée (vrai par défaut)
   */
  async getAiAllergenExclusionEnabled(): Promise<boolean> {
    try {
      const stored = await DatabaseService.getSetting(SETTING_ALLERGEN_EXCLUDE_AI);
      if (stored === null) return true; // Activé par défaut
      return stored === 'true';
    } catch {
      return true;
    }
  },

  /**
   * Active ou désactive l'exclusion des allergènes pour le Chef IA
   */
  async setAiAllergenExclusionEnabled(enabled: boolean): Promise<void> {
    try {
      await DatabaseService.setSetting(SETTING_ALLERGEN_EXCLUDE_AI, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Erreur sauvegarde réglage exclusion IA allergènes:', e);
    }
  },

  /**
   * Récupère la liste des prompts favoris Chef IA (seeds par défaut si non configuré)
   */
  async getChefFavoritePrompts(): Promise<ChefFavoritePrompt[]> {
    try {
      const stored = await DatabaseService.getSetting(SETTING_CHEF_FAVORITE_PROMPTS);
      if (stored === null || stored === undefined) {
        return [...DEFAULT_CHEF_FAVORITE_PROMPTS];
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [...DEFAULT_CHEF_FAVORITE_PROMPTS];
    } catch (e) {
      console.error('Erreur lecture prompts favoris Chef IA:', e);
      return [...DEFAULT_CHEF_FAVORITE_PROMPTS];
    }
  },

  /**
   * Enregistre ou met à jour un prompt favori Chef IA
   */
  async saveChefFavoritePrompt(
    prompt: Omit<ChefFavoritePrompt, 'id' | 'createdAt'> & { id?: string }
  ): Promise<ChefFavoritePrompt> {
    try {
      const currentList = await this.getChefFavoritePrompts();
      let savedPrompt: ChefFavoritePrompt;

      if (prompt.id) {
        const existingIndex = currentList.findIndex((p) => p.id === prompt.id);
        if (existingIndex >= 0) {
          savedPrompt = {
            ...currentList[existingIndex],
            title: prompt.title.trim(),
            promptText: prompt.promptText.trim(),
          };
          currentList[existingIndex] = savedPrompt;
        } else {
          savedPrompt = {
            id: prompt.id,
            title: prompt.title.trim(),
            promptText: prompt.promptText.trim(),
            createdAt: new Date().toISOString(),
          };
          currentList.unshift(savedPrompt);
        }
      } else {
        savedPrompt = {
          id: generateUniqueId('fav_prompt'),
          title: prompt.title.trim(),
          promptText: prompt.promptText.trim(),
          createdAt: new Date().toISOString(),
        };
        currentList.unshift(savedPrompt);
      }

      await DatabaseService.setSetting(SETTING_CHEF_FAVORITE_PROMPTS, JSON.stringify(currentList));
      return savedPrompt;
    } catch (e) {
      console.error('Erreur sauvegarde prompt favori Chef IA:', e);
      throw e;
    }
  },

  /**
   * Supprime un prompt favori Chef IA par son ID
   */
  async deleteChefFavoritePrompt(id: string): Promise<void> {
    try {
      const currentList = await this.getChefFavoritePrompts();
      const updatedList = currentList.filter((p) => p.id !== id);
      await DatabaseService.setSetting(SETTING_CHEF_FAVORITE_PROMPTS, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Erreur suppression prompt favori Chef IA:', e);
      throw e;
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HUMEURS DU CHEF IA (StockCookModal & RecipeAiService)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Récupère la liste des humeurs du Chef IA.
   * Retourne la liste personnalisée stockée, ou une copie de CHEF_MOODS par défaut.
   */
  async getChefMoods(): Promise<ChefMoodOption[]> {
    try {
      const stored = await DatabaseService.getSetting(SETTING_CHEF_MOODS);
      if (!stored) {
        return [...CHEF_MOODS];
      }
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return [...CHEF_MOODS];
    } catch (e) {
      console.warn('⚠️ Erreur lecture des humeurs Chef IA, repli sur CHEF_MOODS:', e);
      return [...CHEF_MOODS];
    }
  },

  /**
   * Enregistre ou met à jour une humeur du Chef IA.
   */
  async saveChefMood(mood: ChefMoodOption): Promise<ChefMoodOption[]> {
    const currentList = await this.getChefMoods();
    const index = currentList.findIndex((m) => m.id === mood.id);
    let updatedList: ChefMoodOption[];
    if (index >= 0) {
      updatedList = [...currentList];
      updatedList[index] = { ...mood };
    } else {
      updatedList = [...currentList, { ...mood }];
    }
    await DatabaseService.setSetting(SETTING_CHEF_MOODS, JSON.stringify(updatedList));
    return updatedList;
  },

  /**
   * Supprime une humeur du Chef IA.
   * Interdit la suppression si c'est la seule humeur restante (sécurité).
   */
  async deleteChefMood(moodId: string): Promise<ChefMoodOption[]> {
    const currentList = await this.getChefMoods();
    if (currentList.length <= 1) {
      throw new Error('Impossible de supprimer la dernière humeur du Chef IA (au moins 1 humeur requise).');
    }
    const updatedList = currentList.filter((m) => m.id !== moodId);
    await DatabaseService.setSetting(SETTING_CHEF_MOODS, JSON.stringify(updatedList));
    return updatedList;
  },

  /**
   * Réinitialise les humeurs du Chef IA à la liste d'origine d'usine (CHEF_MOODS).
   */
  async resetChefMoods(): Promise<ChefMoodOption[]> {
    await DatabaseService.removeSetting(SETTING_CHEF_MOODS);
    return [...CHEF_MOODS];
  },


  // ══════════════════════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Exporte l'intégralité des données sous forme de chaîne JSON formatée (recettes, courses, planning, suivi, frigo, allergènes)
   */
  async exportAllData(): Promise<string> {
    const recipes = await this.getRecipes();
    const shoppingList = await this.getShoppingList();
    const weeklyPlan = await this.getWeeklyPlan();
    const mealLogs = await this.getMealLogs();
    const fridgeItems = await this.getFridgeItems();
    const userAllergens = await this.getUserAllergens();
    const isAllergenFilterEnabled = await this.getAllergenFilterEnabled();
    const isAiAllergenExclusionEnabled = await this.getAiAllergenExclusionEnabled();
    const plannerSettings = await this.getPlannerSettings();
    const chefMoods = await this.getChefMoods();
    return JSON.stringify(
      {
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        recipes,
        shoppingList,
        weeklyPlan,
        mealLogs,
        fridgeItems,
        userAllergens,
        isAllergenFilterEnabled,
        isAiAllergenExclusionEnabled,
        plannerSettings,
        chefMoods,
      },
      null,
      2
    );
  },

  /**
   * Importe des données depuis un fichier JSON en préservant l'intégrité
   */
  async importRecipes(recipesJson: string): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const parsed = JSON.parse(recipesJson);
      const incomingRecipes: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.recipes)
        ? parsed.recipes
        : [];

      if (
        incomingRecipes.length === 0 &&
        (!parsed.mealLogs || typeof parsed.mealLogs !== 'object') &&
        (!parsed.fridgeItems || !Array.isArray(parsed.fridgeItems)) &&
        (!parsed.userAllergens || !Array.isArray(parsed.userAllergens))
      ) {
        return { success: false, count: 0, error: 'Aucune recette ou donnée valide détectée dans le fichier.' };
      }

      let addedOrUpdated = 0;
      if (incomingRecipes.length > 0) {
        const sanitizedIncoming = incomingRecipes.map(sanitizeStoredRecipe);
        const current = await this.getRecipes();
        const currentMap = new Map<string, Recipe>();
        current.forEach((r) => currentMap.set(r.id, r));

        sanitizedIncoming.forEach((newRec) => {
          currentMap.set(newRec.id, newRec);
          addedOrUpdated++;
        });

        const merged = Array.from(currentMap.values());
        await DatabaseService.saveAllRecipes(merged);
        memoryCache.recipes = merged;
      }

      // Restauration facultative des entrées du journal des repas si présentes dans le backup
      if (parsed.mealLogs && typeof parsed.mealLogs === 'object') {
        const currentLogs = await this.getMealLogs();
        const mergedLogs = { ...currentLogs };
        Object.entries(parsed.mealLogs).forEach(([key, val]) => {
          const item = sanitizeMealLogEntry(val);
          if (item) {
            mergedLogs[key] = item;
          }
        });
        await this.saveMealLogs(mergedLogs);
      }

      // Restauration facultative des aliments du frigo
      if (parsed.fridgeItems && Array.isArray(parsed.fridgeItems)) {
        const incomingFridge = parsed.fridgeItems
          .map((raw: any) => sanitizeFridgeItem(raw))
          .filter((i: any): i is FridgeItem => i !== null);
        if (incomingFridge.length > 0) {
          const currentFridge = await this.getFridgeItems();
          const existingNames = new Set(currentFridge.map((i) => i.name.trim().toLowerCase()));
          const toAdd = incomingFridge.filter((i: FridgeItem) => !existingNames.has(i.name.trim().toLowerCase()));
          if (toAdd.length > 0) {
            await this.saveFridgeItems([...currentFridge, ...toAdd]);
          }
        }
      }

      // Restauration facultative des allergènes
      if (parsed.userAllergens && Array.isArray(parsed.userAllergens)) {
        const incomingAllergens = parsed.userAllergens
          .filter((i: any) => i && typeof i === 'object' && typeof i.name === 'string');
        if (incomingAllergens.length > 0) {
          const currentAllergens = await this.getUserAllergens();
          const currentNames = new Set(currentAllergens.map((i) => normalizeString(i.name)));
          const toAdd = incomingAllergens
            .filter((i: any) => !currentNames.has(normalizeString(i.name)))
            .map((i: any) => ({
              id: typeof i.id === 'string' && i.id ? i.id : generateUniqueId('allg'),
              canonicalId: typeof i.canonicalId === 'string' ? i.canonicalId : undefined,
              name: i.name.trim(),
              allergenFamily: typeof i.allergenFamily === 'string' ? i.allergenFamily : null,
              addedAt: typeof i.addedAt === 'string' ? i.addedAt : new Date().toISOString(),
            }));
          if (toAdd.length > 0) {
            await this.saveUserAllergens([...currentAllergens, ...toAdd]);
          }
        }
      }

      if (typeof parsed.isAllergenFilterEnabled === 'boolean') {
        await this.setAllergenFilterEnabled(parsed.isAllergenFilterEnabled);
      }
      if (typeof parsed.isAiAllergenExclusionEnabled === 'boolean') {
        await this.setAiAllergenExclusionEnabled(parsed.isAiAllergenExclusionEnabled);
      }

      return { success: true, count: addedOrUpdated };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Format JSON invalide.' };
    }
  },

  /**
   * Importe et fusionne un pack de recettes (JSON ou archive ZIP avec photos)
   * sans écraser le stock, la liste de courses ni le journal des repas.
   * Déduplique par titre normalisé et assainit chaque recette via sanitizeStoredRecipe().
   */
  async mergeRecipePack(
    pack: ExtractedRecipePack,
    onProgress?: (processed: number, total: number) => void
  ): Promise<RecipePackMergeResult> {
    try {
      if (!pack || !Array.isArray(pack.recipes) || pack.recipes.length === 0) {
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          photosCount: 0,
          error: 'Le pack ne contient aucune recette valide à importer.',
        };
      }

      const current = await this.getRecipes();
      const existingById = new Map<string, Recipe>();
      const existingByNormalizedTitle = new Map<string, Recipe>();
      const usedIds = new Set<string>();

      current.forEach((r) => {
        existingById.set(r.id, r);
        usedIds.add(r.id);
        const norm = normalizeString(r.title || '').trim().toLowerCase();
        if (norm) {
          existingByNormalizedTitle.set(norm, r);
        }
      });

      let addedCount = 0;
      let updatedCount = 0;
      let photosCount = 0;

      const mergedList: Recipe[] = [...current];
      const totalToProcess = pack.recipes.length;

      for (let i = 0; i < totalToProcess; i++) {
        const rawRecipe = pack.recipes[i];
        if (!rawRecipe || typeof rawRecipe !== 'object') continue;

        const sanitized = sanitizeStoredRecipe(rawRecipe);
        const normTitle = normalizeString(sanitized.title || '').trim().toLowerCase();

        // 1. Recherche de photo correspondante dans le pack
        let photoUri: string | null = null;
        if (pack.images && pack.images.size > 0) {
          const rawImageRef = typeof rawRecipe.imageUrl === 'string' ? rawRecipe.imageUrl : '';
          const imageRef = rawImageRef || sanitized.imageUrl || rawRecipe.id || sanitized.id;
          const found = RecipePackService.findImageBytes(pack.images, imageRef);
          if (found) {
            photoUri = await ImageStorageService.savePhotoBytesLocally(found.bytes, found.fileName);
            if (photoUri) {
              photosCount++;
            }
          }
        }

        // 2. Déduplication par titre normalisé
        const existingRecipe = normTitle ? existingByNormalizedTitle.get(normTitle) : undefined;

        if (existingRecipe) {
          // Mise à jour de la recette existante en conservant son ID
          const targetIndex = mergedList.findIndex((r) => r.id === existingRecipe.id);
          if (targetIndex !== -1) {
            const updatedRecipe: Recipe = {
              ...sanitized,
              id: existingRecipe.id,
              // Conserver la photo existante si aucune nouvelle photo n'a été trouvée
              imageUrl: photoUri || sanitized.imageUrl || existingRecipe.imageUrl,
            };
            mergedList[targetIndex] = updatedRecipe;
            existingById.set(existingRecipe.id, updatedRecipe);
            existingByNormalizedTitle.set(normTitle, updatedRecipe);
            updatedCount++;
          }
        } else {
          // Recette inédite : attribution d'un nouvel identifiant unique si collision ou manquant
          let newId = sanitized.id;
          if (!newId || usedIds.has(newId)) {
            newId = generateUniqueId('rec');
          }
          usedIds.add(newId);

          const newRecipe: Recipe = {
            ...sanitized,
            id: newId,
            imageUrl: photoUri || sanitized.imageUrl,
          };

          mergedList.push(newRecipe);
          existingById.set(newId, newRecipe);
          if (normTitle) {
            existingByNormalizedTitle.set(normTitle, newRecipe);
          }
          addedCount++;
        }

        if (onProgress) {
          onProgress(i + 1, totalToProcess);
        }
      }

      await DatabaseService.saveAllRecipes(mergedList);
      memoryCache.recipes = mergedList;

      return {
        success: true,
        addedCount,
        updatedCount,
        photosCount,
      };
    } catch (err: any) {
      console.error('[StorageService] Erreur lors de la fusion du pack de recettes :', err);
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        photosCount: 0,
        error: err?.message || 'Erreur inattendue lors de la fusion du pack.',
      };
    }
  },

  // ─── Onboarding ──────────────────────────────────────────────────────────

  /**
   * Retourne true si l'utilisateur a déjà complété l'onboarding.
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const val = await DatabaseService.getSetting(SETTING_ONBOARDING);
      return val === '1';
    } catch {
      return false;
    }
  },

  /**
   * Marque l'onboarding comme complété.
   */
  async completeOnboarding(): Promise<void> {
    try {
      await DatabaseService.setSetting(SETTING_ONBOARDING, '1');
    } catch (e) {
      console.error('Erreur sauvegarde onboarding:', e);
    }
  },

  /**
   * Réinitialise l'état d'onboarding (ex: lors d'une remise à zéro usine).
   */
  async resetOnboarding(): Promise<void> {
    try {
      await DatabaseService.removeSetting(SETTING_ONBOARDING);
    } catch (e) {
      console.error('Erreur réinitialisation onboarding:', e);
    }
  },
};

// Enregistrer la synchronisation en cascade automatique pour propager
// immédiatement toute mutation du vocabulaire canonique vers les recettes, le stock et les courses.
VocabularyService.onVocabularyCascade(async (event) => {
  await StorageService.handleVocabularyCascade(event);
});
