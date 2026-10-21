import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { WeeklyPlanMap, PlannedMeal, DayOfWeek, MealTime } from '../types/planner';
import { MealLogEntry, MealLogMap, DayMealLogSummary } from '../types/mealLog';
import { INITIAL_RECIPES } from '../data/initialRecipes';
import {
  generateUniqueId,
  getLocalDateString,
  formatMealLogDateFrench,
  getDayOfWeekFromDateString,
} from '../utils/helpers';
import { isRecipeVegetarian } from './recipeAiService';
import { createShoppingItemFromIngredient, mergeShoppingItems } from '../utils/shoppingAggregator';
import { classifyIngredientAisle } from '../utils/aisleClassifier';

const RECIPES_STORAGE_KEY = '@papilles_recipes_v4';
const SCHEMA_VERSION_KEY = '@papilles_schema_version';
const CURRENT_SCHEMA_VERSION = 'v4';
const SHOPPING_LIST_KEY = '@papilles_shopping_list_v1';
const WEEKLY_PLAN_KEY = '@papilles_weekly_plan_v1';
const MEAL_LOG_KEY = '@papilles_meal_log_v1';
const THEME_MODE_KEY = '@papilles_theme_mode_v1';
const DEFAULT_SERVINGS_KEY = '@papilles_default_servings_v1';

/**
 * Assainit une URL d'image pour s'assurer qu'elle n'exploite aucun protocole malveillant (SEC-09)
 */
function sanitizeImageUrl(url: any): string {
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
function sanitizeStoredRecipe(r: any): Recipe {
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
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.slice(0, 100).map((ing: any, idx: number) => ({
          id: typeof ing.id === 'string' ? ing.id.slice(0, 80) : generateUniqueId(`ing_${idx}`),
          name: typeof ing.name === 'string' ? ing.name.slice(0, 150) : '',
          quantity: ing.quantity ? String(ing.quantity).slice(0, 50) : '',
          unit: ing.unit ? String(ing.unit).slice(0, 50) : '',
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

export const StorageService = {
  /**
   * Charge toutes les recettes enregistrées.
   * Utilise une migration non-destructive par version de schéma (VULN-04 corrigé).
   * Les données créées par l'utilisateur ne sont JAMAIS écrasées.
   */
  async getRecipes(): Promise<Recipe[]> {
    try {
      const data = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (!data) {
        // Premier lancement absolu de l'application : initialisation avec les recettes cultes
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(INITIAL_RECIPES));
        await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        return INITIAL_RECIPES;
      }

      let parsed: any[];
      try {
        parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
          parsed = INITIAL_RECIPES;
        }
      } catch {
        console.error('Données locales corrompues, retour aux recettes initiales');
        return INITIAL_RECIPES;
      }

      // Vérification de la version du schéma pour migration sûre en place
      const version = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
      if (version !== CURRENT_SCHEMA_VERSION) {
        // Migration non-destructive : on complète les champs manquants sans écraser la collection
        const migrated = parsed.map(sanitizeStoredRecipe);
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(migrated));
        await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
        return migrated;
      }

      // Validation défensive runtime de chaque recette
      return parsed.map(sanitizeStoredRecipe);
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
      return INITIAL_RECIPES;
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

      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la recette:', error);
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

      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedRecipes));
      return updatedRecipes;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la note:', error);
      throw error;
    }
  },

  /**
   * Bascule l'état favori d'une recette.
   */
  async toggleFavorite(id: string): Promise<Recipe[]> {
    try {
      const recipes = await this.getRecipes();
      const updatedRecipes = recipes.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
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
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(INITIAL_RECIPES));
      await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
      return INITIAL_RECIPES;
    } catch (error) {
      console.error('Erreur réinitialisation recettes:', error);
      return INITIAL_RECIPES;
    }
  },

  // ==========================================
  // GESTION DE LA LISTE DE COURSES
  // ==========================================

  /**
   * Récupère la liste de courses stockée localement
   */
  async getShoppingList(): Promise<ShoppingItem[]> {
    try {
      const data = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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
      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
      return items;
    } catch (e) {
      console.error('Erreur sauvegarde liste de courses:', e);
      throw e;
    }
  },

  /**
   * Ajoute tous les ingrédients d'une recette avec mise à l'échelle des portions
   */
  async addRecipeToShoppingList(
    recipe: Recipe,
    targetServings: number
  ): Promise<{ updatedList: ShoppingItem[]; addedCount: number }> {
    try {
      const currentList = await this.getShoppingList();
      const baseServings = recipe.servings || 4;

      const newItems: ShoppingItem[] = recipe.ingredients.map((ing) =>
        createShoppingItemFromIngredient(
          ing,
          baseServings,
          targetServings,
          recipe.title,
          recipe.id
        )
      );

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
    aisle?: ShoppingAisle
  ): Promise<ShoppingItem[]> {
    try {
      const currentList = await this.getShoppingList();
      const resolvedAisle = aisle || classifyIngredientAisle(name);

      const newItem: ShoppingItem = {
        id: generateUniqueId('shop_custom'),
        name: name.trim(),
        quantity: quantity?.trim() || undefined,
        unit: unit?.trim() || undefined,
        isChecked: false,
        aisle: resolvedAisle,
        createdAt: new Date().toISOString(),
      };

      const updatedList = mergeShoppingItems(currentList, [newItem]);
      await this.saveShoppingList(updatedList);
      return updatedList;
    } catch (e) {
      console.error('Erreur ajout article custom liste courses:', e);
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
      await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify([]));
      return [];
    } catch (e) {
      console.error('Erreur vidage liste courses:', e);
      throw e;
    }
  },

  // ==========================================
  // GESTION DU MENU DE LA SEMAINE (PLANNING)
  // ==========================================

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
   * Assigne ou retire un repas prévu pour un créneau (Jour + Midi/Soir)
   */
  async setWeeklyMeal(
    day: DayOfWeek,
    mealTime: MealTime,
    meal: PlannedMeal | null
  ): Promise<WeeklyPlanMap> {
    try {
      const currentPlan = await this.getWeeklyPlan();
      const slotKey = `${day}_${mealTime}`;
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
   * Réinitialise le planning de la semaine
   */
  async clearWeeklyPlan(): Promise<WeeklyPlanMap> {
    try {
      await AsyncStorage.setItem(WEEKLY_PLAN_KEY, JSON.stringify({}));
      return {};
    } catch (e) {
      console.error('Erreur effacement planning semaine:', e);
      throw e;
    }
  },

  /**
   * Fusionne l'intégralité des ingrédients des recettes programmées de la semaine
   * avec calcul automatique selon le nombre de portions de chaque créneau
   */
  async generateShoppingListFromWeeklyPlan(
    recipes: Recipe[],
    plan: WeeklyPlanMap
  ): Promise<{ updatedList: ShoppingItem[]; addedCount: number }> {
    try {
      const currentShoppingList = await this.getShoppingList();
      const recipeMap = new Map<string, Recipe>();
      recipes.forEach((r) => recipeMap.set(r.id, r));

      const newItemsToMerge: ShoppingItem[] = [];

      Object.values(plan).forEach((plannedMeal) => {
        if (!plannedMeal || !plannedMeal.recipeId) return;

        const recipe = recipeMap.get(plannedMeal.recipeId);
        if (!recipe) return;

        const targetServings = plannedMeal.servings || recipe.servings || 4;
        const baseServings = recipe.servings || 4;

        recipe.ingredients.forEach((ing) => {
          newItemsToMerge.push(
            createShoppingItemFromIngredient(
              ing,
              baseServings,
              targetServings,
              plannedMeal.recipeTitle || recipe.title,
              recipe.id
            )
          );
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
   * Récupère le mode de thème sauvegardé ('system' | 'light' | 'dark')
   */
  async getThemeMode(): Promise<'system' | 'light' | 'dark'> {
    try {
      const mode = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (mode === 'light' || mode === 'dark' || mode === 'system') {
        return mode;
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
  async saveThemeMode(mode: 'system' | 'light' | 'dark'): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e);
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
   * Exporte l'intégralité des données sous forme de chaîne JSON formatée (recettes, courses, planning, suivi)
   */
  async exportAllData(): Promise<string> {
    const recipes = await this.getRecipes();
    const shoppingList = await this.getShoppingList();
    const weeklyPlan = await this.getWeeklyPlan();
    const mealLogs = await this.getMealLogs();
    return JSON.stringify(
      {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        recipes,
        shoppingList,
        weeklyPlan,
        mealLogs,
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

      if (incomingRecipes.length === 0 && (!parsed.mealLogs || typeof parsed.mealLogs !== 'object')) {
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

      return { success: true, count: addedOrUpdated };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Format JSON invalide.' };
    }
  },
};
