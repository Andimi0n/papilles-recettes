import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, RecipeViewMode } from '../types/recipe';
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

/**
 * Chargement dynamique et paresseux (lazy) des recettes par défaut.
 * Évite d'embarquer et parser les 400 Ko de INITIAL_RECIPES au démarrage
 * lorsque l'utilisateur a déjà des recettes dans son stockage local.
 */
async function getInitialRecipes(): Promise<Recipe[]> {
  const { INITIAL_RECIPES } = await import('../data/initialRecipes');
  return INITIAL_RECIPES;
}
import {
  generateUniqueId,
  getLocalDateString,
  formatMealLogDateFrench,
  getDayOfWeekFromDateString,
  normalizeString,
} from '../utils/helpers';
import { isRecipeVegetarian } from './recipeAiService';
import { createShoppingItemFromIngredient, mergeShoppingItems } from '../utils/shoppingAggregator';
import { parseShoppingInput } from '../utils/shoppingInputParser';
import { classifyIngredientAisle } from '../utils/aisleClassifier';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { isKnownDefaultPantryStaple } from '../data/canonicalVocabulary';
import { VocabularyService, VocabularyCascadeEvent } from './vocabularyService';

const RECIPES_STORAGE_KEY = '@papilles_recipes_v4';
const SCHEMA_VERSION_KEY = '@papilles_schema_version';
const CURRENT_SCHEMA_VERSION = 'v4';
const CANONICAL_MIGRATION_KEY = '@papilles_canonical_vocabulary_migrated_v1';
const SHOPPING_LIST_KEY = '@papilles_shopping_list_v1';
const FRIDGE_ITEMS_KEY = '@papilles_fridge_items_v1';
const WEEKLY_PLAN_KEY = '@papilles_weekly_plan_v1';
const MEAL_LOG_KEY = '@papilles_meal_log_v1';
const THEME_MODE_KEY = '@papilles_theme_mode_v1';
const DEFAULT_SERVINGS_KEY = '@papilles_default_servings_v1';
const USER_ALLERGENS_KEY = '@papilles_user_allergens_v1';
const ALLERGEN_FILTER_RECIPES_KEY = '@papilles_filter_allergens_recipes_v1';
const ALLERGEN_EXCLUDE_AI_KEY = '@papilles_exclude_allergens_ai_v1';
const PLANNER_SETTINGS_KEY = '@papilles_planner_settings_v1';
const RECIPE_VIEW_MODE_KEY = '@papilles_recipe_view_mode_v1';
const ONBOARDING_KEY = '@papilles_onboarded_v1';

// File d'attente séquentielle (mutex async) pour sérialiser les cascades de vocabulaire et éviter tout conflit AsyncStorage
let cascadeMutexQueue: Promise<any> = Promise.resolve();

type StorageListener<T> = (items: T) => void;
let fridgeListeners: StorageListener<FridgeItem[]>[] = [];
let shoppingListeners: StorageListener<ShoppingItem[]>[] = [];

// Caches en mémoire pour éviter les accès disque O(N) coûteux à chaque re-render
let memoryCache = {
  recipes: null as Recipe[] | null,
  fridgeItems: null as FridgeItem[] | null,
  shoppingList: null as ShoppingItem[] | null,
};

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

export const StorageService = {
  /**
   * Charge toutes les recettes enregistrées.
   * Utilise une migration non-destructive par version de schéma (VULN-04 corrigé).
   * Les données créées par l'utilisateur ne sont JAMAIS écrasées.
   */
  async getRecipes(): Promise<Recipe[]> {
    if (memoryCache.recipes) {
      return memoryCache.recipes;
    }

    try {
      const data = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (!data) {
        // Premier lancement absolu de l'application : initialisation avec les recettes cultes (chargement lazy)
        const initial = await getInitialRecipes();
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(initial));
        await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        memoryCache.recipes = initial;
        return initial;
      }

      let parsed: any[];
      try {
        parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
          parsed = await getInitialRecipes();
        }
      } catch {
        console.error('Données locales corrompues, retour aux recettes initiales');
        const initial = await getInitialRecipes();
        memoryCache.recipes = initial;
        return initial;
      }

      // Vérification de la version du schéma pour migration sûre en place
      const version = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
      if (version !== CURRENT_SCHEMA_VERSION) {
        // Migration non-destructive : on complète les champs manquants sans écraser la collection
        const migrated = parsed.map(sanitizeStoredRecipe);
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(migrated));
        await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        memoryCache.recipes = migrated;
        return migrated;
      }

      // Validation défensive runtime de chaque recette
      const result = parsed.map(sanitizeStoredRecipe);
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
   */
  async saveRecipe(recipe: Recipe): Promise<Recipe[]> {
    try {
      const recipes = await this.getRecipes();
      const safeRecipe: Recipe = sanitizeStoredRecipe(recipe);
      const existingIndex = recipes.findIndex((r) => r.id === safeRecipe.id);

      let updatedRecipes: Recipe[];
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        // Mise à jour de la recette existante
        updatedRecipes = [...recipes];
        updatedRecipes[existingIndex] = {
          ...safeRecipe,
          updatedAt: now,
        };
      } else {
        // Nouvelle recette ajoutée en tête avec ID robuste garanti unique
        const newRecipe: Recipe = {
          ...safeRecipe,
          id: safeRecipe.id || generateUniqueId('rec'),
          createdAt: now,
          updatedAt: now,
        };
        updatedRecipes = [newRecipe, ...recipes];
      }

      memoryCache.recipes = updatedRecipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
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
      memoryCache.recipes = recipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
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
      const recipes = await this.getRecipes();
      const updatedRecipes = recipes.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            rating,
            userNote: userNote !== undefined ? userNote : r.userNote,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });

      memoryCache.recipes = updatedRecipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
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
      const recipes = await this.getRecipes();
      const cleanTags = Array.from(
        new Set(
          tags
            .filter((t) => typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().slice(0, 50))
        )
      ).slice(0, 30);

      const updatedRecipes = recipes.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            tags: cleanTags.length > 0 ? cleanTags : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      });

      memoryCache.recipes = updatedRecipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
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
      const recipes = await this.getRecipes();
      const tagSet = new Set<string>();
      recipes.forEach((r) => {
        if (Array.isArray(r.tags)) {
          r.tags.forEach((t) => {
            const trimmed = typeof t === 'string' ? t.trim() : '';
            if (trimmed) tagSet.add(trimmed);
          });
        }
      });
      return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr'));
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
      const recipes = await this.getRecipes();
      const updatedRecipes = recipes.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
      memoryCache.recipes = updatedRecipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
    } catch (error) {
      console.error('Erreur lors de l\'inversion du favori:', error);
      throw error;
    }
  },

  /**
   * Supprime définitivement une recette sans risque de réinitialisation de la base.
   */
  async deleteRecipe(id: string): Promise<Recipe[]> {
    try {
      const recipes = await this.getRecipes();
      const updatedRecipes = recipes.filter((r) => r.id !== id);
      memoryCache.recipes = updatedRecipes;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
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
      memoryCache.recipes = initial;
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(initial));
      await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
      return initial;
    } catch (error) {
      console.error('Erreur réinitialisation recettes:', error);
      const initial = await getInitialRecipes().catch(() => []);
      return initial;
    }
  },

  /**
   * Migration ou harmonisation des données de l'utilisateur
   * (recettes personnelles, liste de courses et étagères du placard/frigo)
   * pour normaliser les ingrédients selon le lexique canonique strict.
   * Si force=true, réexécute l'harmonisation même si elle a déjà été jouée.
   */
  async runCanonicalVocabularyMigration(force: boolean = false): Promise<{
    recipesUpdated: number;
    shoppingUpdated: number;
    fridgeUpdated: number;
  }> {
    try {
      if (!force) {
        const alreadyDone = await AsyncStorage.getItem(CANONICAL_MIGRATION_KEY);
        if (alreadyDone === 'done') {
          return { recipesUpdated: 0, shoppingUpdated: 0, fridgeUpdated: 0 };
        }
      }

      let recipesUpdated = 0;
      let shoppingUpdated = 0;
      let fridgeUpdated = 0;

      // 1. Migration des recettes existantes
      const recipesData = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (recipesData) {
        try {
          const parsedRecipes: Recipe[] = JSON.parse(recipesData);
          if (Array.isArray(parsedRecipes)) {
            const updatedRecipes = parsedRecipes.map((recipe) => {
              let hasChanges = false;
              const updatedIngredients = (recipe.ingredients || []).map((ing) => {
                const res = normalizeIngredient(ing);
                if (
                  res.name !== ing.name ||
                  res.unit !== ing.unit ||
                  res.quantity !== ing.quantity ||
                  res.canonicalId !== ing.canonicalId
                ) {
                  hasChanges = true;
                }
                return {
                  ...ing,
                  name: res.name || ing.name,
                  canonicalId: res.canonicalId || ing.canonicalId,
                  quantity: res.quantity !== undefined ? res.quantity : ing.quantity,
                  unit: res.unit !== undefined ? res.unit : ing.unit,
                  isPantryStaple: res.isPantryStaple !== undefined ? res.isPantryStaple : ing.isPantryStaple,
                  isOptional: res.isOptional !== undefined ? res.isOptional : ing.isOptional,
                };
              });

              if (hasChanges) {
                recipesUpdated++;
                return {
                  ...recipe,
                  ingredients: updatedIngredients,
                  // les étapes restent 100% intouchées
                };
              }
              return recipe;
            });

            if (recipesUpdated > 0) {
              await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
            }
          }
        } catch (e) {
          console.error('Erreur migration recettes:', e);
        }
      }

      // 2. Migration de la liste de courses
      const shoppingData = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (shoppingData) {
        try {
          const parsedShopping: ShoppingItem[] = JSON.parse(shoppingData);
          if (Array.isArray(parsedShopping)) {
            const vocabMapById = VocabularyService.getSyncMapById();
            const updatedShopping = parsedShopping.map((item) => {
              const res = normalizeIngredient({ name: item.name, canonicalId: item.canonicalId });
              const canonDef = res.canonicalId ? vocabMapById.get(res.canonicalId) : undefined;
              const resolvedAisle = canonDef?.defaultAisle || item.aisle || classifyIngredientAisle(res.name || item.name);

              if (res.name !== item.name || res.canonicalId !== item.canonicalId || resolvedAisle !== item.aisle) {
                shoppingUpdated++;
                return {
                  ...item,
                  name: res.name || item.name,
                  canonicalId: res.canonicalId || item.canonicalId,
                  quantity: item.quantity || res.quantity,
                  unit: item.unit || res.unit,
                  aisle: resolvedAisle,
                };
              }
              return item;
            });

            if (shoppingUpdated > 0) {
              await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(updatedShopping));
            }
          }
        } catch (e) {
          console.error('Erreur migration courses:', e);
        }
      }

      // 3. Migration des étagères (stock du frigo / placard)
      const fridgeData = await AsyncStorage.getItem(FRIDGE_ITEMS_KEY);
      if (fridgeData) {
        try {
          const parsedFridge: FridgeItem[] = JSON.parse(fridgeData);
          if (Array.isArray(parsedFridge)) {
            const vocabMapById = VocabularyService.getSyncMapById();
            const updatedFridge = parsedFridge.map((item) => {
              const res = normalizeIngredient({ name: item.name, canonicalId: item.canonicalId });
              const canonDef = res.canonicalId ? vocabMapById.get(res.canonicalId) : undefined;
              const resolvedAisle = canonDef?.defaultAisle || item.aisle || classifyIngredientAisle(res.name || item.name);

              if (res.name !== item.name || res.canonicalId !== item.canonicalId || resolvedAisle !== item.aisle) {
                fridgeUpdated++;
                return {
                  ...item,
                  name: res.name || item.name,
                  canonicalId: res.canonicalId || item.canonicalId,
                  aisle: resolvedAisle,
                };
              }
              return item;
            });

            if (fridgeUpdated > 0) {
              await AsyncStorage.setItem(FRIDGE_ITEMS_KEY, JSON.stringify(updatedFridge));
            }
          }
        } catch (e) {
          console.error('Erreur migration étagères:', e);
        }
      }

      // Marquer la migration comme effectuée avec succès
      await AsyncStorage.setItem(CANONICAL_MIGRATION_KEY, 'done');
      return { recipesUpdated, shoppingUpdated, fridgeUpdated };
    } catch (err) {
      console.error('Erreur globale migration canonique:', err);
      return { recipesUpdated: 0, shoppingUpdated: 0, fridgeUpdated: 0 };
    }
  },

  /**
   * Alias de démarrage pour la migration v1 vers les identifiants canoniques
   */
  async migrateRecipesToCanonicalV1(): Promise<{ recipesUpdated: number; shoppingUpdated: number; fridgeUpdated: number }> {
    return this.runCanonicalVocabularyMigration(false);
  },

  /**
   * Propage en cascade les modifications structurelles du lexique
   * (promotions, fusions, suppressions, renommages de rayon)
   * vers les recettes, le stock et la liste de courses.
   * Sérialisé via mutex pour prévenir tout risque de collision AsyncStorage.
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

    // 1. Traitement des Recettes (@papilles_recipes_v4)
    try {
      const recipesData = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (recipesData) {
        const recipes: Recipe[] = JSON.parse(recipesData);
        if (Array.isArray(recipes)) {
          let hasAnyRecipeChange = false;
          const updatedRecipes = recipes.map((recipe) => {
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
                  return {
                    ...ing,
                    canonicalId: event.targetId,
                  };
                }
              } else if (event.type === 'delete') {
                if (ing.canonicalId === event.deletedId) {
                  hasRecipeChange = true;
                  const recheck = normalizeIngredient({ name: ing.name });
                  return {
                    ...ing,
                    canonicalId: recheck.canonicalId,
                  };
                }
              } else if (event.type === 'reset') {
                const recheck = normalizeIngredient(ing);
                if (recheck.canonicalId !== ing.canonicalId) {
                  hasRecipeChange = true;
                  return {
                    ...ing,
                    canonicalId: recheck.canonicalId,
                  };
                }
              }
              return ing;
            });

            if (hasRecipeChange) {
              recipesUpdated++;
              hasAnyRecipeChange = true;
              return {
                ...recipe,
                ingredients: updatedIngredients,
                updatedAt: new Date().toISOString(),
              };
            }
            return recipe;
          });

          if (hasAnyRecipeChange) {
            memoryCache.recipes = updatedRecipes;
            await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
          }
        }
      }
    } catch (e) {
      console.error('Erreur cascade recettes:', e);
    }

    // 2. Traitement du Stock Frigo / Placard (@papilles_fridge_items_v1)
    try {
      const fridgeData = await AsyncStorage.getItem(FRIDGE_ITEMS_KEY);
      if (fridgeData) {
        const fridgeItems: FridgeItem[] = JSON.parse(fridgeData);
        if (Array.isArray(fridgeItems)) {
          let hasAnyFridgeChange = false;
          const updatedFridge = fridgeItems.map((item) => {
            if (event.type === 'promote') {
              if (event.parentIds.includes(item.canonicalId || '')) {
                const recheck = normalizeIngredient({ name: item.name });
                if (recheck.canonicalId === event.newIngredient.id) {
                  fridgeUpdated++;
                  hasAnyFridgeChange = true;
                  return {
                    ...item,
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
                  return {
                    ...item,
                    aisle: event.updatedIngredient.defaultAisle,
                  };
                }
              }
            } else if (event.type === 'delete') {
              if (item.canonicalId === event.deletedId) {
                fridgeUpdated++;
                hasAnyFridgeChange = true;
                const recheck = normalizeIngredient({ name: item.name });
                const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
                return {
                  ...item,
                  canonicalId: recheck.canonicalId,
                  aisle: canonDef?.defaultAisle || item.aisle,
                };
              }
            } else if (event.type === 'reset') {
              const recheck = normalizeIngredient({ name: item.name });
              const canonDef = recheck.canonicalId ? vocabMapById.get(recheck.canonicalId) : undefined;
              if (recheck.canonicalId !== item.canonicalId || (canonDef && canonDef.defaultAisle !== item.aisle)) {
                fridgeUpdated++;
                hasAnyFridgeChange = true;
                return {
                  ...item,
                  canonicalId: recheck.canonicalId,
                  aisle: canonDef?.defaultAisle || item.aisle,
                };
              }
            }
            return item;
          });

          let finalFridge = updatedFridge;
          if (event.type === 'merge') {
            const seenCanonical = new Set<string>();
            const seenNames = new Set<string>();
            finalFridge = [];
            for (const item of updatedFridge) {
              const cId = item.canonicalId;
              const nName = normalizeString(item.name);
              if (cId && seenCanonical.has(cId)) {
                hasAnyFridgeChange = true;
                fridgeUpdated++;
                continue;
              }
              if (seenNames.has(nName)) {
                hasAnyFridgeChange = true;
                fridgeUpdated++;
                continue;
              }
              if (cId) seenCanonical.add(cId);
              seenNames.add(nName);
              finalFridge.push(item);
            }
          }

          if (hasAnyFridgeChange) {
            memoryCache.fridgeItems = finalFridge;
            await this.saveFridgeItems(finalFridge);
          }
        }
      }
    } catch (e) {
      console.error('Erreur cascade stock:', e);
    }

    // 3. Traitement de la Liste de Courses (@papilles_shopping_list_v1)
    try {
      const shoppingData = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (shoppingData) {
        const shoppingItems: ShoppingItem[] = JSON.parse(shoppingData);
        if (Array.isArray(shoppingItems)) {
          let hasAnyShoppingChange = false;
          const updatedShopping = shoppingItems.map((item) => {
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
                return {
                  ...item,
                  canonicalId: recheck.canonicalId,
                  aisle: canonDef?.defaultAisle || item.aisle,
                };
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

          let finalShopping = updatedShopping;
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
            finalShopping = consolidated;
          }

          if (hasAnyShoppingChange) {
            memoryCache.shoppingList = finalShopping;
            await this.saveShoppingList(finalShopping);
          }
        }
      }
    } catch (e) {
      console.error('Erreur cascade courses:', e);
    }

    return { recipesUpdated, shoppingUpdated, fridgeUpdated };
  },

  // ==========================================
  // GESTION DE LA LISTE DE COURSES
  // ==========================================

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
      const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (!data) {
        memoryCache.shoppingList = [];
        return [];
      }
      const parsed = JSON.parse(data);
      const result = Array.isArray(parsed) ? parsed : [];
      memoryCache.shoppingList = result;
      return result;
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
      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(deduplicated));
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
      const currentList = await this.getShoppingList();
      const updatedList = currentList.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      );
      await this.saveShoppingList(updatedList);
      return updatedList;
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
      const currentList = await this.getShoppingList();
      const updatedList = currentList.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );
      await this.saveShoppingList(updatedList);
      return updatedList;
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
      const updatedList = currentList.filter((item) => item.id !== id);
      await this.saveShoppingList(updatedList);
      return updatedList;
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
      const updatedList = currentList.filter((item) => !item.isChecked);
      await this.saveShoppingList(updatedList);
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
      return await this.saveShoppingList([]);
    } catch (e) {
      console.error('Erreur vidage liste courses:', e);
      throw e;
    }
  },

  // ==========================================
  // GESTION DU FRIGO (INVENTAIRE & STOCK)
  // ==========================================

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
      const data = await AsyncStorage.getItem(FRIDGE_ITEMS_KEY);
      if (!data) {
        memoryCache.fridgeItems = [];
        return [];
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        memoryCache.fridgeItems = [];
        return [];
      }
      const sanitized = parsed.map(sanitizeFridgeItem).filter((i): i is FridgeItem => i !== null);

      // Auto-guérison et déduplication stricte par canonicalId ou nom normalisé
      const seenCanonical = new Set<string>();
      const seenNames = new Set<string>();
      const seenIds = new Set<string>();
      const deduplicated: FridgeItem[] = [];
      let hadDuplicates = false;

      for (const item of sanitized) {
        if (!item || !item.id) continue;
        if (seenIds.has(item.id)) {
          hadDuplicates = true;
          continue;
        }
        const cId = item.canonicalId;
        const nName = normalizeString(item.name);
        if (cId && seenCanonical.has(cId)) {
          hadDuplicates = true;
          continue;
        }
        if (seenNames.has(nName)) {
          hadDuplicates = true;
          continue;
        }
        seenIds.add(item.id);
        if (cId) seenCanonical.add(cId);
        seenNames.add(nName);
        deduplicated.push(item);
      }

      if (hadDuplicates) {
        AsyncStorage.setItem(FRIDGE_ITEMS_KEY, JSON.stringify(deduplicated)).catch(() => {});
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
      await AsyncStorage.setItem(FRIDGE_ITEMS_KEY, JSON.stringify(deduplicated));
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

      const updated = [newItem, ...currentItems];
      await this.saveFridgeItems(updated);
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

        if (resolvedCanonicalId && existingCanonicalIds.has(resolvedCanonicalId)) {
          return;
        }
        if (existingNames.has(normClean)) {
          return;
        }

        if (resolvedCanonicalId) {
          existingCanonicalIds.add(resolvedCanonicalId);
        }
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
      const updated = currentItems.filter((i) => i.id !== id);
      await this.saveFridgeItems(updated);
      return updated;
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
      return await this.saveFridgeItems([]);
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

  // ==========================================
  // GESTION DU MENU DE LA SEMAINE (PLANNING)
  // ==========================================

  /**
   * Récupère les préférences de planification des menus (fixe vs dynamique, premier jour)
   */
  async getPlannerSettings(): Promise<PlannerSettings> {
    try {
      const data = await AsyncStorage.getItem(PLANNER_SETTINGS_KEY);
      if (!data) return DEFAULT_PLANNER_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        mode: parsed?.mode === 'dynamic' ? 'dynamic' : 'fixed',
        startDay: parsed?.startDay || 'Lundi',
      };
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
      const updated: PlannerSettings = {
        ...current,
        ...settings,
      };
      await AsyncStorage.setItem(PLANNER_SETTINGS_KEY, JSON.stringify(updated));
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
      const data = await AsyncStorage.getItem(WEEKLY_PLAN_KEY);
      if (!data) return {};
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
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
      await AsyncStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify(plan));
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
      const currentPlan = await this.getWeeklyPlan();
      const slotKey = dayOrKey.includes('_') ? dayOrKey : `${dayOrKey}_${mealTime}`;
      const nextPlan = { ...currentPlan };

      if (meal) {
        nextPlan[slotKey] = meal;
      } else {
        delete nextPlan[slotKey];
      }

      await this.saveWeeklyPlan(nextPlan);
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
      if (!slotKeysToClear || slotKeysToClear.length === 0) {
        await AsyncStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify({}));
        return {};
      }
      const currentPlan = await this.getWeeklyPlan();
      const nextPlan = { ...currentPlan };
      slotKeysToClear.forEach((k) => delete nextPlan[k]);
      await this.saveWeeklyPlan(nextPlan);
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
      return { updatedList, addedCount: newItemsToMerge.length };
    } catch (e) {
      console.error('Erreur génération liste de courses depuis planning:', e);
      throw e;
    }
  },

  /**
   * Charge l'ensemble du journal des repas (ce qui a été mangé)
   */
  async getMealLogs(): Promise<MealLogMap> {
    try {
      const data = await AsyncStorage.getItem(MEAL_LOG_KEY);
      if (!data) return {};
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object') return {};

      const sanitized: MealLogMap = {};
      Object.entries(parsed).forEach(([key, val]) => {
        const item = sanitizeMealLogEntry(val);
        if (item) {
          sanitized[key] = item;
        }
      });
      return sanitized;
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
      await AsyncStorage.setItem(MEAL_LOG_KEY, JSON.stringify(logs));
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
      const currentLogs = await this.getMealLogs();
      const slotKey = `${date}_${mealTime}`;
      const nextLogs = { ...currentLogs };

      if (entry && entry.title.trim()) {
        const existing = nextLogs[slotKey];
        nextLogs[slotKey] = {
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
      } else {
        delete nextLogs[slotKey];
      }

      await this.saveMealLogs(nextLogs);
      return nextLogs;
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
      console.error('Erreur lecture repas aujourd’hui:', e);
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

  /**
   * Récupère le mode de thème sauvegardé ('system' | 'light' | 'dark' | 'colorblind')
   */
  async getThemeMode(): Promise<'system' | 'light' | 'dark' | 'colorblind'> {
    try {
      const mode = await AsyncStorage.getItem(THEME_MODE_KEY);
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
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e);
    }
  },

  /**
   * Récupère le mode d'affichage des recettes sauvegardé ('detailed' | 'compact' | 'grid')
   */
  async getRecipeViewMode(): Promise<RecipeViewMode> {
    try {
      const mode = await AsyncStorage.getItem(RECIPE_VIEW_MODE_KEY);
      if (mode === 'compact' || mode === 'detailed' || mode === 'grid') {
        return mode as RecipeViewMode;
      }
      return 'detailed';
    } catch {
      return 'detailed';
    }
  },

  /**
   * Sauvegarde le mode d'affichage des recettes
   */
  async saveRecipeViewMode(mode: RecipeViewMode): Promise<void> {
    try {
      await AsyncStorage.setItem(RECIPE_VIEW_MODE_KEY, mode);
    } catch (e) {
      console.error('Erreur sauvegarde mode de vue recettes:', e);
    }
  },

  /**
   * Récupère le nombre de portions par défaut configuré
   */
  async getDefaultServings(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_SERVINGS_KEY);
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
      await AsyncStorage.setItem(DEFAULT_SERVINGS_KEY, String(servings));
    } catch (e) {
      console.error('Erreur sauvegarde portions par défaut:', e);
    }
  },

  /**
   * Récupère la liste des allergènes enregistrés par l'utilisateur
   */
  async getUserAllergens(): Promise<UserAllergenItem[]> {
    try {
      const stored = await AsyncStorage.getItem(USER_ALLERGENS_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((raw: any) => {
          if (!raw || typeof raw !== 'object') return null;
          const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 100) : '';
          if (!name) return null;
          return {
            id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 100) : generateUniqueId('allg'),
            canonicalId: typeof raw.canonicalId === 'string' ? raw.canonicalId.slice(0, 100) : undefined,
            name,
            allergenFamily: typeof raw.allergenFamily === 'string' ? (raw.allergenFamily as AllergenFamily) : null,
            addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : new Date().toISOString(),
          } as UserAllergenItem;
        })
        .filter((i): i is UserAllergenItem => i !== null);
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
      await AsyncStorage.setItem(USER_ALLERGENS_KEY, JSON.stringify(items));
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
    // Vérifier si déjà présent par nom normalisé strict
    const existingIdx = list.findIndex(
      (i) => normalizeString(i.name) === cleanNorm
    );

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
      const stored = await AsyncStorage.getItem(ALLERGEN_FILTER_RECIPES_KEY);
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
      await AsyncStorage.setItem(ALLERGEN_FILTER_RECIPES_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Erreur sauvegarde réglage filtre allergènes:', e);
    }
  },

  /**
   * Vérifie si l'exclusion des allergènes dans les suggestions Chef IA est activée (vrai par défaut)
   */
  async getAiAllergenExclusionEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(ALLERGEN_EXCLUDE_AI_KEY);
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
      await AsyncStorage.setItem(ALLERGEN_EXCLUDE_AI_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.error('Erreur sauvegarde réglage exclusion IA allergènes:', e);
    }
  },

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
        memoryCache.recipes = merged;
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(merged));
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

  // ─── Onboarding ──────────────────────────────────────────────────────────

  /**
   * Retourne true si l'utilisateur a déjà complété l'onboarding.
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(ONBOARDING_KEY);
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
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch (e) {
      console.error('Erreur sauvegarde onboarding:', e);
    }
  },

  /**
   * Réinitialise l'état d'onboarding (ex: lors d'une remise à zéro usine).
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
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
