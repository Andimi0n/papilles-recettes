/**
 * folderService.ts
 *
 * Service de gestion des dossiers de recettes et des liaisons N-N (recipe_folders).
 * Intègre le modèle N-N, le calcul dynamique du dossier virtuel « Non classées »
 * et synchronise les notifications réactives via StorageService.
 */

import { Folder, FolderSummary, RecipeFolder, UNCATEGORIZED_FOLDER_ID } from '../types/folder';
import { DatabaseService } from './databaseService';
import { StorageService } from './storageService';
import { Recipe } from '../types/recipe';

export class FolderService {
  /**
   * Récupère tous les dossiers créés par l'utilisateur
   */
  static async getAllFolders(): Promise<Folder[]> {
    return DatabaseService.getFolders();
  }

  /**
   * Récupère un dossier par son identifiant
   */
  static async getFolderById(id: string): Promise<Folder | null> {
    return DatabaseService.getFolderById(id);
  }

  /**
   * Crée un nouveau dossier avec un nom et une icône/emoji
   */
  static async createFolder(name: string, icon: string = '📁'): Promise<Folder> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Le nom du dossier ne peut pas être vide');
    }
    const now = new Date().toISOString();
    const id = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const folder: Folder = {
      id,
      name: cleanName,
      icon: icon.trim() || '📁',
      createdAt: now,
      updatedAt: now,
    };
    await DatabaseService.createFolder(folder);
    StorageService.notifyFolderChange();
    return folder;
  }

  /**
   * Modifie le nom et/ou l'icône d'un dossier
   */
  static async updateFolder(id: string, updates: { name?: string; icon?: string }): Promise<Folder> {
    const existing = await DatabaseService.getFolderById(id);
    if (!existing) {
      throw new Error(`Dossier introuvable : ${id}`);
    }
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const icon = updates.icon !== undefined ? updates.icon.trim() : existing.icon;
    await DatabaseService.updateFolder(id, { name, icon });
    StorageService.notifyFolderChange();
    return {
      ...existing,
      name,
      icon,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Supprime un dossier et ses liaisons dans recipe_folders.
   * RÈGLE D'OR : Ne supprime JAMAIS de recette en base.
   */
  static async deleteFolder(id: string): Promise<void> {
    await DatabaseService.deleteFolder(id);
    StorageService.notifyFolderChange();
  }

  /**
   * Récupère toutes les liaisons (recette <-> dossier)
   */
  static async getRecipeFolders(): Promise<RecipeFolder[]> {
    return DatabaseService.getRecipeFolders();
  }

  /**
   * Récupère la liste des dossiers auxquels une recette appartient
   */
  static async getFolderIdsForRecipe(recipeId: string): Promise<string[]> {
    return DatabaseService.getFolderIdsForRecipe(recipeId);
  }

  /**
   * Récupère la liste des recettes contenues dans un dossier
   */
  static async getRecipeIdsForFolder(folderId: string): Promise<string[]> {
    return DatabaseService.getRecipeIdsForFolder(folderId);
  }

  /**
   * Ajoute de façon additive (INSERT OR IGNORE) plusieurs recettes dans plusieurs dossiers
   */
  static async addRecipesToFolders(recipeIds: string[], folderIds: string[]): Promise<void> {
    if (recipeIds.length === 0 || folderIds.length === 0) return;
    await DatabaseService.addRecipesToFolders(recipeIds, folderIds);
    StorageService.notifyFolderChange();
  }

  /**
   * Remplace l'ensemble des dossiers assignés à une recette (mode 1 recette sélectionnée)
   */
  static async setRecipeFolders(recipeId: string, folderIds: string[]): Promise<void> {
    await DatabaseService.setRecipeFolders(recipeId, folderIds);
    StorageService.notifyFolderChange();
  }

  /**
   * Retire une ou plusieurs recettes d'un dossier donné
   */
  static async removeRecipesFromFolder(recipeIds: string[], folderId: string): Promise<void> {
    if (recipeIds.length === 0) return;
    await DatabaseService.removeRecipesFromFolder(recipeIds, folderId);
    StorageService.notifyFolderChange();
  }

  /**
   * Récupère les identifiants de toutes les recettes qui ne sont rangées dans aucun dossier
   */
  static async getUncategorizedRecipeIds(): Promise<string[]> {
    return DatabaseService.getUncategorizedRecipeIds();
  }

  /**
   * Calcule les résumés complets de tous les dossiers (avec les images des 4 premières recettes
   * et le compteur) ainsi que la carte virtuelle « Non classées ».
   */
  static async getFolderSummaries(recipesOverride?: Recipe[]): Promise<FolderSummary[]> {
    const folders = await DatabaseService.getFolders();
    const recipeFolders = await DatabaseService.getRecipeFolders();
    const allRecipes = recipesOverride || (await DatabaseService.getRecipes());

    // Indexation Map O(1)
    const recipeMap = new Map<string, Recipe>();
    allRecipes.forEach((r) => recipeMap.set(r.id, r));

    // Regroupement par dossier
    const folderToRecipeIds = new Map<string, string[]>();
    const categorizedRecipeIds = new Set<string>();

    for (const rf of recipeFolders) {
      if (!folderToRecipeIds.has(rf.folderId)) {
        folderToRecipeIds.set(rf.folderId, []);
      }
      folderToRecipeIds.get(rf.folderId)!.push(rf.recipeId);
      categorizedRecipeIds.add(rf.recipeId);
    }

    const summaries: FolderSummary[] = [];

    // 1. Dossiers créés par l'utilisateur
    for (const f of folders) {
      const rIds = folderToRecipeIds.get(f.id) || [];
      const images: string[] = [];
      for (const rId of rIds) {
        const recipe = recipeMap.get(rId);
        if (recipe?.imageUrl) {
          images.push(recipe.imageUrl);
          if (images.length === 4) break;
        }
      }
      summaries.push({
        id: f.id,
        name: f.name,
        icon: f.icon,
        recipeCount: rIds.length,
        recipeImages: images,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      });
    }

    // 2. Dossier virtuel « Non classées »
    const uncategorizedRecipes = allRecipes.filter((r) => !categorizedRecipeIds.has(r.id));
    const uncatImages: string[] = [];
    for (const r of uncategorizedRecipes) {
      if (r.imageUrl) {
        uncatImages.push(r.imageUrl);
        if (uncatImages.length === 4) break;
      }
    }

    summaries.push({
      id: UNCATEGORIZED_FOLDER_ID,
      name: 'Non classées',
      icon: '📂',
      recipeCount: uncategorizedRecipes.length,
      recipeImages: uncatImages,
    });

    return summaries;
  }
}
