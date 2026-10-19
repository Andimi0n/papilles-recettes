import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { WeeklyPlanMap, PlannedMeal, DayOfWeek, MealTime } from '../types/planner';
import { INITIAL_RECIPES } from '../data/initialRecipes';
import { generateUniqueId } from '../utils/helpers';
import { isRecipeVegetarian } from './recipeAiService';
import { createShoppingItemFromIngredient, mergeShoppingItems } from '../utils/shoppingAggregator';
import { classifyIngredientAisle } from '../utils/aisleClassifier';

const RECIPES_STORAGE_KEY = '@papilles_recipes_v4';
const SCHEMA_VERSION_KEY = '@papilles_schema_version';
const CURRENT_SCHEMA_VERSION = 'v4';
const SHOPPING_LIST_KEY = '@papilles_shopping_list_v1';
const WEEKLY_PLAN_KEY = '@papilles_weekly_plan_v1';

/**
 * Assainit une recette chargée depuis le stockage pour éviter les crashs si des champs sont manquants
 */
function sanitizeStoredRecipe(r: any): Recipe {
  return {
    id: typeof r.id === 'string' && r.id ? r.id : generateUniqueId('rec'),
    title: typeof r.title === 'string' && r.title ? r.title : 'Recette sans titre',
    description: typeof r.description === 'string' ? r.description : '',
    category: r.category || 'Plat',
    difficulty: r.difficulty || 'Moyen',
    prepTimeMinutes: typeof r.prepTimeMinutes === 'number' ? r.prepTimeMinutes : 15,
    cookTimeMinutes: typeof r.cookTimeMinutes === 'number' ? r.cookTimeMinutes : 0,
    servings: typeof r.servings === 'number' && r.servings > 0 ? r.servings : 4,
    rating: typeof r.rating === 'number' ? r.rating : 0,
    userNote: typeof r.userNote === 'string' ? r.userNote : undefined,
    imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : '',
    availableImages: Array.isArray(r.availableImages) ? r.availableImages : undefined,
    isFavorite: Boolean(r.isFavorite),
    isVegetarian:
      typeof r.isVegetarian === 'boolean'
        ? r.isVegetarian
        : isRecipeVegetarian(r.ingredients || [], r.title || '', r.description || ''),
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
    ingredients: Array.isArray(r.ingredients)
      ? r.ingredients.map((ing: any, idx: number) => ({
          id: typeof ing.id === 'string' ? ing.id : generateUniqueId(`ing_${idx}`),
          name: typeof ing.name === 'string' ? ing.name : '',
          quantity: ing.quantity ? String(ing.quantity) : '',
          unit: ing.unit ? String(ing.unit) : '',
        }))
      : [],
    steps: Array.isArray(r.steps)
      ? r.steps.map((st: any, idx: number) => ({
          id: typeof st.id === 'string' ? st.id : generateUniqueId(`stp_${idx}`),
          order: typeof st.order === 'number' ? st.order : idx + 1,
          instruction: typeof st.instruction === 'string' ? st.instruction : '',
        }))
      : [],
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
};
