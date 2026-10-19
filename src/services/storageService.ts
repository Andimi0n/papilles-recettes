import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { INITIAL_RECIPES } from '../data/initialRecipes';

const RECIPES_STORAGE_KEY = '@papilles_recipes_v3';

export const StorageService = {
  /**
   * Charge toutes les recettes enregistrées, initialise avec les 100 recettes cultes si premier lancement.
   */
  async getRecipes(): Promise<Recipe[]> {
    try {
      const data = await AsyncStorage.getItem(RECIPES_STORAGE_KEY);
      if (!data) {
        // Premier lancement v3 : on sauvegarde les 100 recettes de Marmiton avec catégorisation végé
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(INITIAL_RECIPES));
        return INITIAL_RECIPES;
      }
      const parsed = JSON.parse(data) as Recipe[];
      // Si la base locale contient l'ancien format ou pas de flag isVegetarian, on synchronise avec INITIAL_RECIPES
      if (parsed.length <= 6 || parsed.some((r) => r.isVegetarian === undefined)) {
        await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(INITIAL_RECIPES));
        return INITIAL_RECIPES;
      }
      return parsed;
    } catch (error) {
      console.error('Erreur lors du chargement des recettes:', error);
      return INITIAL_RECIPES;
    }
  },

  /**
   * Enregistre ou met à jour une recette complète.
   */
  async saveRecipe(recipe: Recipe): Promise<Recipe[]> {
    try {
      const recipes = await this.getRecipes();
      const existingIndex = recipes.findIndex((r) => r.id === recipe.id);
      
      let updatedRecipes: Recipe[];
      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        // Mise à jour
        updatedRecipes = [...recipes];
        updatedRecipes[existingIndex] = {
          ...recipe,
          updatedAt: now,
        };
      } else {
        // Nouvelle recette ajoutée en tête de liste
        const newRecipe: Recipe = {
          ...recipe,
          id: recipe.id || `rec_${Date.now()}`,
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
   * Met à jour la note et éventuellement le commentaire/astuce d'une recette directement.
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
   * Supprime définitivement une recette.
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
   * Réinitialise les données avec les recettes de démo.
   */
  async resetToDemoRecipes(): Promise<Recipe[]> {
    try {
      await AsyncStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(INITIAL_RECIPES));
      return INITIAL_RECIPES;
    } catch (error) {
      console.error('Erreur réinitialisation recettes:', error);
      return INITIAL_RECIPES;
    }
  },
};
