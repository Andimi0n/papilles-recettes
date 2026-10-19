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
  quantity?: string; // ex: "200", "2", "1/2"
  unit?: string;     // ex: "g", "ml", "c. à soupe", "pièces"
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
  isFavorite: boolean;
  isVegetarian?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SortOption = 'rating_desc' | 'rating_asc' | 'prep_time' | 'title' | 'recent';

export interface FilterOptions {
  category: Category;
  searchQuery: string;
  selectedIngredients: string[];
  minRating: number;
  sortBy: SortOption;
  onlyFavorites: boolean;
  onlyVegetarian?: boolean;
}
