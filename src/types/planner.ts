export type DayOfWeek =
  | 'Lundi'
  | 'Mardi'
  | 'Mercredi'
  | 'Jeudi'
  | 'Vendredi'
  | 'Samedi'
  | 'Dimanche';

export type MealTime = 'lunch' | 'dinner';

export interface PlannedMeal {
  id: string;
  day: DayOfWeek;
  mealTime: MealTime;
  recipeId?: string;
  recipeTitle: string;
  recipeImageUrl?: string;
  servings: number;
  customNote?: string;
}

export type WeeklyPlanMap = Record<string, PlannedMeal | undefined>;
