import { MealTime, DayOfWeek } from './planner';

export interface MealLogEntry {
  id: string;
  date: string; // Format local ISO "YYYY-MM-DD"
  mealTime: MealTime; // 'lunch' | 'dinner'
  title: string; // Nom ou description libre du plat (ex: "Sushi au restaurant", "Pâtes au pesto")
  recipeId?: string; // ID optionnel si lié à une recette du carnet
  recipeImageUrl?: string; // Image optionnelle de la recette liée
  note?: string; // Note ou commentaire personnel libre
  createdAt: string;
  updatedAt: string;
}

export type MealLogMap = Record<string, MealLogEntry>; // Clé composite: `${date}_${mealTime}`

export interface DayMealLogSummary {
  date: string; // "YYYY-MM-DD"
  dateLabel: string; // Ex: "Aujourd'hui", "Hier", "Lundi 19 oct."
  dayOfWeek: DayOfWeek;
  lunch?: MealLogEntry;
  dinner?: MealLogEntry;
}
