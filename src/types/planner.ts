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
  day: DayOfWeek | string;
  mealTime: MealTime;
  date?: string;
  recipeId?: string;
  recipeTitle: string;
  recipeImageUrl?: string;
  servings: number;
  customNote?: string;
}

export type WeeklyPlanMap = Record<string, PlannedMeal | undefined>;

export type PlannerMode = 'fixed' | 'dynamic';

export interface PlannerSettings {
  mode: PlannerMode;
  startDay: DayOfWeek;
}

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  mode: 'fixed',
  startDay: 'Lundi',
};
