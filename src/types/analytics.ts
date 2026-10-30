/**
 * Types pour le système de logs d'actions interne (invisible utilisateur).
 * Stocké localement dans AsyncStorage : @papilles_analytics_v1
 */

export type AppEventType =
  | 'fridge_item_added'
  | 'fridge_item_removed'
  | 'shopping_item_added'
  | 'shopping_item_removed'
  | 'cooking_started'
  | 'cooking_completed'
  | 'meal_plan_updated';

export interface AppEventBase {
  id: string;
  type: AppEventType;
  timestamp: string; // ISO 8601
}

export interface FridgeItemAddedEvent extends AppEventBase {
  type: 'fridge_item_added';
  itemName: string;
  canonicalId?: string;
  aisle?: string;
}

export interface FridgeItemRemovedEvent extends AppEventBase {
  type: 'fridge_item_removed';
  itemName: string;
  canonicalId?: string;
}

export interface ShoppingItemAddedEvent extends AppEventBase {
  type: 'shopping_item_added';
  itemName: string;
  quantity?: string;
  unit?: string;
  canonicalId?: string;
  /** Origine : saisie manuelle, recette, planificateur, etc. */
  source?: string;
}

export interface ShoppingItemRemovedEvent extends AppEventBase {
  type: 'shopping_item_removed';
  itemName: string;
  quantity?: string;
  unit?: string;
  canonicalId?: string;
}

export interface CookingStartedEvent extends AppEventBase {
  type: 'cooking_started';
  recipeId: string;
  recipeTitle: string;
  servings: number;
}

export interface CookingCompletedEvent extends AppEventBase {
  type: 'cooking_completed';
  recipeId: string;
  recipeTitle: string;
  servings: number;
  /** Durée totale de la session en secondes */
  sessionDurationSeconds: number;
}

export interface MealPlanUpdatedEvent extends AppEventBase {
  type: 'meal_plan_updated';
  dateKey: string; // ex: "2026-10-30"
  slot: 'lunch' | 'dinner';
  recipeId?: string;
  recipeTitle?: string;
  /** true = ajout, false = suppression */
  added: boolean;
}

export type AppEvent =
  | FridgeItemAddedEvent
  | FridgeItemRemovedEvent
  | ShoppingItemAddedEvent
  | ShoppingItemRemovedEvent
  | CookingStartedEvent
  | CookingCompletedEvent
  | MealPlanUpdatedEvent;

export type NewAppEvent = AppEvent extends infer Event
  ? Event extends AppEvent
    ? Omit<Event, 'id' | 'timestamp'>
    : never
  : never;
