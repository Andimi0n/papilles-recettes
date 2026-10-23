export type Category =
  | 'Tous'
  | 'Entrée'
  | 'Plat'
  | 'Dessert'
  | 'Apéritif'
  | 'Petit-déjeuner'
  | 'Boisson';

export type Difficulty = 'Facile' | 'Moyen' | 'Difficile';

export interface Ingredient {
  id: string;
  name: string;
  canonicalId?: string;
  quantity?: string; // ex: "200", "2", "1/2"
  unit?: string;     // ex: "g", "ml", "c. à soupe", "pièces"
  isPantryStaple?: boolean; // Ingrédient de base / fond de placard (sel, poivre, huile, épices...)
  isOptional?: boolean;     // Ingrédient facultatif / de finition
}

export interface RecipeStep {
  id: string;
  instruction: string;
  order: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  rating: number; // 0 to 5
  userNote?: string; // personal chef tip or comment
  imageUrl: string;
  availableImages?: string[];
  isFavorite?: boolean;
  isVegetarian?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SortOption = 'rating_desc' | 'rating_asc' | 'prep_time' | 'title' | 'recent';

export type TimeFilterMode = 'max' | 'min';

export interface AdvancedFilterOptions {
  targetTotalTime: number | null; // Temps total cible en minutes (ex: 15, 30, 45, 60... ou null)
  timeFilterMode: TimeFilterMode;  // 'max' = ≤ (moins de / rapide), 'min' = ≥ (plus de / mijoté)
  maxTotalTime?: number | null;   // Rétrocompatibilité
  difficulties: Difficulty[];     // Ex: ['Facile'], tableau vide = toutes
  selectedIngredients: string[];  // Liste des ingrédients ciblés
  ingredientMatchMode: 'all' | 'any'; // 'all' = contient TOUS les ingrédients (ET), 'any' = au moins un (OU)
}

export interface FilterOptions {
  category: Category;
  searchQuery: string;
  selectedIngredients: string[];
  minRating: number;
  sortBy: SortOption;
  onlyFavorites?: boolean;
  onlyVegetarian?: boolean;
  targetTotalTime?: number | null;
  timeFilterMode?: TimeFilterMode;
  maxTotalTime?: number | null;
  difficulties?: Difficulty[];
  ingredientMatchMode?: 'all' | 'any';
}

export interface RecipeIdea {
  id: string;
  title: string;
  description: string;
  estimatedTime?: string;
  highlightIngredients?: string[];
}
