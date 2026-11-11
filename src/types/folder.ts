/**
 * Types pour le système de dossiers de recettes (modèle N-N)
 */

export const UNCATEGORIZED_FOLDER_ID = 'UNCATEGORIZED';

export interface Folder {
  id: string;
  name: string;
  icon: string; // Emoji personnalisé ou icône
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFolder {
  recipeId: string;
  folderId: string;
  addedAt: string;
}

export interface FolderSummary {
  id: string; // Folder ID ou UNCATEGORIZED_FOLDER_ID
  name: string;
  icon: string;
  recipeCount: number;
  recipeImages: string[]; // Jusqu'à 4 URLs/chemins d'images pour la mosaïque 2x2
  recipeIds?: string[]; // Identifiants des recettes contenues dans ce dossier
  createdAt?: string;
  updatedAt?: string;
}
