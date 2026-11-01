/**
 * databaseService.ts
 *
 * Couche de persistance SQLite (expo-sqlite) pour Papilles.
 * Remplace le blob monolithique AsyncStorage par une base relationnelle
 * native, sans limite de taille, avec lectures/écritures par ligne (O(1)).
 *
 * Migration one-shot depuis AsyncStorage au premier démarrage sur appareil natif.
 * Fallback transparent sur AsyncStorage en environnement sans SQLite (ex: Node.js tests, web).
 * API publique identique à l'ancien StorageService — aucun changement côté écrans.
 */

import type * as SQLiteTypes from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { FridgeItem } from '../types/fridge';
import {
  WeeklyPlanMap,
  PlannedMeal,
  MealTime,
  PlannerSettings,
  DEFAULT_PLANNER_SETTINGS,
} from '../types/planner';
import { MealLogEntry, MealLogMap } from '../types/mealLog';
import { UserAllergenItem, AllergenFamily } from '../types/vocabulary';

// ─── Clés AsyncStorage (pour la migration one-shot & le fallback) ───────────
const AS_RECIPES_KEY = '@papilles_recipes_v4';
const AS_SHOPPING_KEY = '@papilles_shopping_list_v1';
const AS_FRIDGE_KEY = '@papilles_fridge_items_v1';
const AS_WEEKLY_PLAN_KEY = '@papilles_weekly_plan_v1';
const AS_MEAL_LOG_KEY = '@papilles_meal_log_v1';
const AS_PLANNER_SETTINGS_KEY = '@papilles_planner_settings_v1';
const AS_USER_ALLERGENS_KEY = '@papilles_user_allergens_v1';
const AS_THEME_MODE_KEY = '@papilles_theme_mode_v1';
const AS_RECIPE_VIEW_MODE_KEY = '@papilles_recipe_view_mode_v1';
const AS_DEFAULT_SERVINGS_KEY = '@papilles_default_servings_v1';
const AS_ALLERGEN_FILTER_KEY = '@papilles_filter_allergens_recipes_v1';
const AS_ALLERGEN_EXCLUDE_AI_KEY = '@papilles_exclude_allergens_ai_v1';
const AS_SCHEMA_VERSION_KEY = '@papilles_schema_version';
const AS_CANONICAL_MIGRATION_KEY = '@papilles_canonical_vocabulary_migrated_v1';
const AS_ONBOARDING_KEY = '@papilles_onboarded_v1';

// ─── Clés de settings SQLite ─────────────────────────────────────────────────
const SETTING_DB_MIGRATED = 'db_migrated_from_async_v1';
const SETTING_SCHEMA_VERSION = 'schema_version';
const CURRENT_SCHEMA_VERSION = 'v4';

// ─── Détection et chargement sécurisé d'expo-sqlite ─────────────────────────
let _sqliteModule: typeof import('expo-sqlite') | null = null;
let _sqliteChecked = false;

function getSQLiteModule(): typeof import('expo-sqlite') | null {
  if (_sqliteChecked) return _sqliteModule;
  _sqliteChecked = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-sqlite');
    if (mod && typeof mod.openDatabaseAsync === 'function') {
      _sqliteModule = mod;
    } else {
      _sqliteModule = null;
    }
  } catch {
    _sqliteModule = null;
  }
  return _sqliteModule;
}

// ─── Singleton base de données ───────────────────────────────────────────────
let _db: SQLiteTypes.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

async function getDb(): Promise<SQLiteTypes.SQLiteDatabase | null> {
  const mod = getSQLiteModule();
  if (!mod) return null;
  if (_db) return _db;
  if (!_initPromise) {
    _initPromise = _openAndInit(mod);
  }
  await _initPromise;
  return _db;
}

async function _openAndInit(mod: typeof import('expo-sqlite')): Promise<void> {
  try {
    _db = await mod.openDatabaseAsync('papilles.db');
    await _createSchema(_db);
    await _runMigrationFromAsyncStorage(_db);
  } catch (err) {
    console.error('[DB] Erreur initialisation SQLite, passage en fallback:', err);
    _db = null;
  }
}

// ─── Création du schéma ───────────────────────────────────────────────────────
async function _createSchema(db: SQLiteTypes.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Plat',
      difficulty TEXT NOT NULL DEFAULT 'Facile',
      prep_time_minutes INTEGER DEFAULT 0,
      cook_time_minutes INTEGER DEFAULT 0,
      servings INTEGER DEFAULT 4,
      rating REAL DEFAULT 0,
      user_note TEXT,
      image_url TEXT DEFAULT '',
      available_images TEXT DEFAULT '[]',
      is_favorite INTEGER DEFAULT 0,
      is_vegetarian INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      source_url TEXT,
      source_site TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ingredients TEXT NOT NULL DEFAULT '[]',
      steps TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
    CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating DESC);
    CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recipes_is_favorite ON recipes(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON recipes(updated_at DESC);

    CREATE TABLE IF NOT EXISTS fridge_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      canonical_id TEXT,
      aisle TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_fridge_canonical ON fridge_items(canonical_id);

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      canonical_id TEXT,
      quantity TEXT,
      unit TEXT,
      is_checked INTEGER DEFAULT 0,
      aisle TEXT,
      created_at TEXT NOT NULL,
      recipe_id TEXT,
      recipe_title TEXT
    );

    CREATE TABLE IF NOT EXISTS weekly_plan (
      slot_key TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT,
      recipe_title TEXT,
      recipe_image_url TEXT,
      servings INTEGER,
      meal_time TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id TEXT PRIMARY KEY NOT NULL,
      slot_key TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      meal_time TEXT NOT NULL,
      title TEXT NOT NULL,
      recipe_id TEXT,
      recipe_image_url TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date DESC);

    CREATE TABLE IF NOT EXISTS user_allergens (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      canonical_id TEXT,
      allergen_family TEXT,
      added_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

// ─── Migration one-shot depuis AsyncStorage ───────────────────────────────────
async function _runMigrationFromAsyncStorage(db: SQLiteTypes.SQLiteDatabase): Promise<void> {
  try {
    const migrated = await _getSetting(db, SETTING_DB_MIGRATED);
    if (migrated === '1') return; // Déjà migré

    console.log('[DB] Migration depuis AsyncStorage → SQLite...');

    // 1. Recettes
    try {
      const recipesData = await AsyncStorage.getItem(AS_RECIPES_KEY);
      if (recipesData) {
        const recipes: any[] = JSON.parse(recipesData);
        if (Array.isArray(recipes) && recipes.length > 0) {
          await db.withExclusiveTransactionAsync(async (txn) => {
            for (const r of recipes) {
              if (!r?.id) continue;
              await txn.runAsync(
                `INSERT OR REPLACE INTO recipes
                  (id, title, description, category, difficulty, prep_time_minutes,
                   cook_time_minutes, servings, rating, user_note, image_url,
                   available_images, is_favorite, is_vegetarian, tags, source_url,
                   source_site, created_at, updated_at, ingredients, steps)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                  r.id,
                  r.title || '',
                  r.description || '',
                  r.category || 'Plat',
                  r.difficulty || 'Facile',
                  r.prepTimeMinutes ?? 0,
                  r.cookTimeMinutes ?? 0,
                  r.servings ?? 4,
                  r.rating ?? 0,
                  r.userNote ?? null,
                  r.imageUrl || '',
                  JSON.stringify(r.availableImages ?? []),
                  r.isFavorite ? 1 : 0,
                  r.isVegetarian ? 1 : 0,
                  JSON.stringify(r.tags ?? []),
                  r.sourceUrl ?? null,
                  r.sourceSite ?? null,
                  r.createdAt || new Date().toISOString(),
                  r.updatedAt || new Date().toISOString(),
                  JSON.stringify(r.ingredients ?? []),
                  JSON.stringify(r.steps ?? []),
                ]
              );
            }
          });
          console.log(`[DB] ${recipes.length} recettes migrées.`);
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration recettes:', e);
    }

    // 2. Frigo
    try {
      const fridgeData = await AsyncStorage.getItem(AS_FRIDGE_KEY);
      if (fridgeData) {
        const items: any[] = JSON.parse(fridgeData);
        if (Array.isArray(items) && items.length > 0) {
          await db.withExclusiveTransactionAsync(async (txn) => {
            for (const item of items) {
              if (!item?.id) continue;
              await txn.runAsync(
                `INSERT OR REPLACE INTO fridge_items (id, name, canonical_id, aisle, created_at)
                 VALUES (?,?,?,?,?)`,
                [item.id, item.name || '', item.canonicalId ?? null, item.aisle ?? null, item.createdAt || new Date().toISOString()]
              );
            }
          });
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration frigo:', e);
    }

    // 3. Liste de courses
    try {
      const shoppingData = await AsyncStorage.getItem(AS_SHOPPING_KEY);
      if (shoppingData) {
        const items: any[] = JSON.parse(shoppingData);
        if (Array.isArray(items) && items.length > 0) {
          await db.withExclusiveTransactionAsync(async (txn) => {
            for (const item of items) {
              if (!item?.id) continue;
              await txn.runAsync(
                `INSERT OR REPLACE INTO shopping_items
                  (id, name, canonical_id, quantity, unit, is_checked, aisle, created_at, recipe_id, recipe_title)
                 VALUES (?,?,?,?,?,?,?,?,?,?)`,
                [
                  item.id, item.name || '', item.canonicalId ?? null,
                  item.quantity ?? null, item.unit ?? null,
                  item.isChecked ? 1 : 0, item.aisle ?? null,
                  item.createdAt || new Date().toISOString(),
                  item.recipeId ?? null, item.recipeTitle ?? null,
                ]
              );
            }
          });
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration courses:', e);
    }

    // 4. Planning hebdomadaire
    try {
      const planData = await AsyncStorage.getItem(AS_WEEKLY_PLAN_KEY);
      if (planData) {
        const plan: Record<string, any> = JSON.parse(planData);
        if (plan && typeof plan === 'object') {
          const entries = Object.entries(plan);
          if (entries.length > 0) {
            await db.withExclusiveTransactionAsync(async (txn) => {
              for (const [slotKey, meal] of entries) {
                if (!meal) continue;
                await txn.runAsync(
                  `INSERT OR REPLACE INTO weekly_plan
                    (slot_key, recipe_id, recipe_title, recipe_image_url, servings, meal_time, updated_at)
                   VALUES (?,?,?,?,?,?,?)`,
                  [
                    slotKey, meal.recipeId ?? null, meal.recipeTitle ?? null,
                    meal.recipeImageUrl ?? null, meal.servings ?? null,
                    meal.mealTime ?? null, new Date().toISOString(),
                  ]
                );
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration planning:', e);
    }

    // 5. Journal des repas
    try {
      const logsData = await AsyncStorage.getItem(AS_MEAL_LOG_KEY);
      if (logsData) {
        const logs: Record<string, any> = JSON.parse(logsData);
        if (logs && typeof logs === 'object') {
          const entries = Object.entries(logs);
          if (entries.length > 0) {
            await db.withExclusiveTransactionAsync(async (txn) => {
              for (const [slotKey, entry] of entries) {
                if (!entry?.id) continue;
                await txn.runAsync(
                  `INSERT OR REPLACE INTO meal_logs
                    (id, slot_key, date, meal_time, title, recipe_id, recipe_image_url, note, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?)`,
                  [
                    entry.id, slotKey, entry.date || '', entry.mealTime || '',
                    entry.title || '', entry.recipeId ?? null,
                    entry.recipeImageUrl ?? null, entry.note ?? null,
                    entry.createdAt || new Date().toISOString(),
                    entry.updatedAt || new Date().toISOString(),
                  ]
                );
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration journal repas:', e);
    }

    // 6. Allergènes utilisateur
    try {
      const allergensData = await AsyncStorage.getItem(AS_USER_ALLERGENS_KEY);
      if (allergensData) {
        const allergens: any[] = JSON.parse(allergensData);
        if (Array.isArray(allergens) && allergens.length > 0) {
          await db.withExclusiveTransactionAsync(async (txn) => {
            for (const item of allergens) {
              if (!item?.id || !item?.name) continue;
              await txn.runAsync(
                `INSERT OR REPLACE INTO user_allergens (id, name, canonical_id, allergen_family, added_at)
                 VALUES (?,?,?,?,?)`,
                [item.id, item.name, item.canonicalId ?? null, item.allergenFamily ?? null, item.addedAt || new Date().toISOString()]
              );
            }
          });
        }
      }
    } catch (e) {
      console.error('[DB] Erreur migration allergènes:', e);
    }

    // 7. Settings (thème, portions, flags)
    const settingsToMigrate: [string, string | null][] = [
      [AS_THEME_MODE_KEY, null],
      [AS_RECIPE_VIEW_MODE_KEY, null],
      [AS_DEFAULT_SERVINGS_KEY, null],
      [AS_ALLERGEN_FILTER_KEY, null],
      [AS_ALLERGEN_EXCLUDE_AI_KEY, null],
      [AS_SCHEMA_VERSION_KEY, null],
      [AS_CANONICAL_MIGRATION_KEY, null],
      [AS_ONBOARDING_KEY, null],
      [AS_PLANNER_SETTINGS_KEY, null],
    ];

    for (const [asKey] of settingsToMigrate) {
      try {
        const val = await AsyncStorage.getItem(asKey);
        if (val !== null) {
          const dbKey = asKey.replace('@papilles_', '');
          await _setSetting(db, dbKey, val);
        }
      } catch {
        // Non bloquant
      }
    }

    await _setSetting(db, SETTING_DB_MIGRATED, '1');
    await _setSetting(db, SETTING_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
    console.log('[DB] Migration AsyncStorage → SQLite terminée avec succès.');
  } catch (err) {
    console.error('[DB] Erreur lors de la migration one-shot:', err);
  }
}

// ─── Helpers settings ────────────────────────────────────────────────────────
async function _getSetting(db: SQLiteTypes.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function _setSetting(db: SQLiteTypes.SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);
}

// ─── Conversions SQLite row → objets métier ──────────────────────────────────
function _rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    difficulty: row.difficulty,
    prepTimeMinutes: row.prep_time_minutes ?? 0,
    cookTimeMinutes: row.cook_time_minutes ?? 0,
    servings: row.servings ?? 4,
    rating: row.rating ?? 0,
    userNote: row.user_note ?? undefined,
    imageUrl: row.image_url ?? '',
    availableImages: _parseJsonArray(row.available_images),
    isFavorite: Boolean(row.is_favorite),
    isVegetarian: Boolean(row.is_vegetarian),
    tags: _parseJsonArray(row.tags),
    sourceUrl: row.source_url ?? undefined,
    sourceSite: row.source_site ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ingredients: _parseJsonArray(row.ingredients),
    steps: _parseJsonArray(row.steps),
  };
}

function _parseJsonArray(val: string | null | undefined): any[] {
  if (!val) return [];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

function _rowToFridgeItem(row: any): FridgeItem {
  return {
    id: row.id,
    name: row.name,
    canonicalId: row.canonical_id ?? undefined,
    aisle: (row.aisle as ShoppingAisle) || 'Autre',
    createdAt: row.created_at,
  };
}

function _rowToShoppingItem(row: any): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    canonicalId: row.canonical_id ?? undefined,
    quantity: row.quantity ?? undefined,
    unit: row.unit ?? undefined,
    isChecked: Boolean(row.is_checked),
    aisle: row.aisle ?? undefined,
    createdAt: row.created_at,
    recipeId: row.recipe_id ?? undefined,
    recipeTitle: row.recipe_title ?? undefined,
  };
}

function _rowToMealLogEntry(row: any): MealLogEntry {
  return {
    id: row.id,
    date: row.date,
    mealTime: row.meal_time as MealTime,
    title: row.title,
    recipeId: row.recipe_id ?? undefined,
    recipeImageUrl: row.recipe_image_url ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── API Publique ─────────────────────────────────────────────────────────────

export const DatabaseService = {

  // ══════════════════════════════════════════════════════
  // RECETTES
  // ══════════════════════════════════════════════════════

  async getRecipes(): Promise<Recipe[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_RECIPES_KEY);
      if (!data) return [];
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM recipes ORDER BY created_at DESC');
    return rows.map(_rowToRecipe);
  },

  async getRecipeById(id: string): Promise<Recipe | null> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      return recipes.find((r) => r.id === id) || null;
    }
    const row = await db.getFirstAsync<any>('SELECT * FROM recipes WHERE id = ?', [id]);
    return row ? _rowToRecipe(row) : null;
  },

  async saveRecipe(recipe: Recipe): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const existingIdx = recipes.findIndex((r) => r.id === recipe.id);
      let updated: Recipe[];
      if (existingIdx >= 0) {
        updated = [...recipes];
        updated[existingIdx] = recipe;
      } else {
        updated = [recipe, ...recipes];
      }
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(updated));
      return;
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO recipes
        (id, title, description, category, difficulty, prep_time_minutes,
         cook_time_minutes, servings, rating, user_note, image_url,
         available_images, is_favorite, is_vegetarian, tags, source_url,
         source_site, created_at, updated_at, ingredients, steps)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        recipe.id,
        recipe.title,
        recipe.description ?? '',
        recipe.category,
        recipe.difficulty,
        recipe.prepTimeMinutes ?? 0,
        recipe.cookTimeMinutes ?? 0,
        recipe.servings ?? 4,
        recipe.rating ?? 0,
        recipe.userNote ?? null,
        recipe.imageUrl ?? '',
        JSON.stringify(recipe.availableImages ?? []),
        recipe.isFavorite ? 1 : 0,
        recipe.isVegetarian ? 1 : 0,
        JSON.stringify(recipe.tags ?? []),
        recipe.sourceUrl ?? null,
        recipe.sourceSite ?? null,
        recipe.createdAt,
        recipe.updatedAt,
        JSON.stringify(recipe.ingredients ?? []),
        JSON.stringify(recipe.steps ?? []),
      ]
    );
  },

  async saveAllRecipes(recipes: Recipe[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(recipes));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM recipes');
      for (const recipe of recipes) {
        await txn.runAsync(
          `INSERT INTO recipes
            (id, title, description, category, difficulty, prep_time_minutes,
             cook_time_minutes, servings, rating, user_note, image_url,
             available_images, is_favorite, is_vegetarian, tags, source_url,
             source_site, created_at, updated_at, ingredients, steps)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            recipe.id,
            recipe.title,
            recipe.description ?? '',
            recipe.category,
            recipe.difficulty,
            recipe.prepTimeMinutes ?? 0,
            recipe.cookTimeMinutes ?? 0,
            recipe.servings ?? 4,
            recipe.rating ?? 0,
            recipe.userNote ?? null,
            recipe.imageUrl ?? '',
            JSON.stringify(recipe.availableImages ?? []),
            recipe.isFavorite ? 1 : 0,
            recipe.isVegetarian ? 1 : 0,
            JSON.stringify(recipe.tags ?? []),
            recipe.sourceUrl ?? null,
            recipe.sourceSite ?? null,
            recipe.createdAt,
            recipe.updatedAt,
            JSON.stringify(recipe.ingredients ?? []),
            JSON.stringify(recipe.steps ?? []),
          ]
        );
      }
    });
  },

  async updateRecipeRating(id: string, rating: number, userNote?: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const updated = recipes.map((r) =>
        r.id === id
          ? { ...r, rating, userNote: userNote !== undefined ? userNote : r.userNote, updatedAt: new Date().toISOString() }
          : r
      );
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(updated));
      return;
    }
    if (userNote !== undefined) {
      await db.runAsync(
        'UPDATE recipes SET rating = ?, user_note = ?, updated_at = ? WHERE id = ?',
        [rating, userNote, new Date().toISOString(), id]
      );
    } else {
      await db.runAsync(
        'UPDATE recipes SET rating = ?, updated_at = ? WHERE id = ?',
        [rating, new Date().toISOString(), id]
      );
    }
  },

  async updateRecipeTags(id: string, tags: string[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const updated = recipes.map((r) =>
        r.id === id ? { ...r, tags, updatedAt: new Date().toISOString() } : r
      );
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(updated));
      return;
    }
    await db.runAsync(
      'UPDATE recipes SET tags = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(tags), new Date().toISOString(), id]
    );
  },

  async toggleFavorite(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const updated = recipes.map((r) =>
        r.id === id ? { ...r, isFavorite: !r.isFavorite, updatedAt: new Date().toISOString() } : r
      );
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(updated));
      return;
    }
    await db.runAsync(
      'UPDATE recipes SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  },

  async deleteRecipe(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(recipes.filter((r) => r.id !== id)));
      return;
    }
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
  },

  async deleteRecipesByPrefix(prefix: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(recipes.filter((r) => !r.id.startsWith(prefix))));
      return;
    }
    await db.runAsync('DELETE FROM recipes WHERE id LIKE ?', [`${prefix}%`]);
  },

  async getAllTags(): Promise<string[]> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const tagSet = new Set<string>();
      recipes.forEach((r) => {
        (r.tags || []).forEach((t) => {
          if (typeof t === 'string' && t.trim()) tagSet.add(t.trim());
        });
      });
      return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr'));
    }
    const rows = await db.getAllAsync<{ tags: string }>('SELECT tags FROM recipes WHERE tags IS NOT NULL AND tags != "[]"');
    const tagSet = new Set<string>();
    for (const row of rows) {
      const arr = _parseJsonArray(row.tags);
      for (const t of arr) {
        if (typeof t === 'string' && t.trim()) tagSet.add(t.trim());
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'fr'));
  },

  async updateRecipesIngredientsBatch(
    updates: { id: string; ingredients: any[]; updatedAt: string }[]
  ): Promise<void> {
    if (updates.length === 0) return;
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const updated = recipes.map((r) => {
        const u = updateMap.get(r.id);
        return u ? { ...r, ingredients: u.ingredients, updatedAt: u.updatedAt } : r;
      });
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(updated));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const u of updates) {
        await txn.runAsync(
          'UPDATE recipes SET ingredients = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(u.ingredients), u.updatedAt, u.id]
        );
      }
    });
  },

  // ══════════════════════════════════════════════════════
  // FRIGO / STOCK
  // ══════════════════════════════════════════════════════

  async getFridgeItems(): Promise<FridgeItem[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_FRIDGE_KEY);
      if (!data) return [];
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM fridge_items ORDER BY created_at DESC');
    return rows.map(_rowToFridgeItem);
  },

  async saveFridgeItems(items: FridgeItem[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_FRIDGE_KEY, JSON.stringify(items));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM fridge_items');
      for (const item of items) {
        await txn.runAsync(
          'INSERT INTO fridge_items (id, name, canonical_id, aisle, created_at) VALUES (?,?,?,?,?)',
          [item.id, item.name, item.canonicalId ?? null, item.aisle ?? null, item.createdAt]
        );
      }
    });
  },

  async addFridgeItem(item: FridgeItem): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getFridgeItems();
      const filtered = items.filter((i) => i.id !== item.id);
      await this.saveFridgeItems([item, ...filtered]);
      return;
    }
    await db.runAsync(
      'INSERT OR REPLACE INTO fridge_items (id, name, canonical_id, aisle, created_at) VALUES (?,?,?,?,?)',
      [item.id, item.name, item.canonicalId ?? null, item.aisle ?? null, item.createdAt]
    );
  },

  async removeFridgeItem(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getFridgeItems();
      await this.saveFridgeItems(items.filter((i) => i.id !== id));
      return;
    }
    await db.runAsync('DELETE FROM fridge_items WHERE id = ?', [id]);
  },

  async clearFridge(): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_FRIDGE_KEY, JSON.stringify([]));
      return;
    }
    await db.runAsync('DELETE FROM fridge_items');
  },

  async updateFridgeItemsBatch(
    updates: { id: string; canonicalId?: string; aisle?: ShoppingAisle }[]
  ): Promise<void> {
    if (updates.length === 0) return;
    const db = await getDb();
    if (!db) {
      const items = await this.getFridgeItems();
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const updated: FridgeItem[] = items.map((i) => {
        const u = updateMap.get(i.id);
        return u ? { ...i, canonicalId: u.canonicalId, aisle: u.aisle ?? i.aisle } : i;
      });
      await this.saveFridgeItems(updated);
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const u of updates) {
        await txn.runAsync(
          'UPDATE fridge_items SET canonical_id = ?, aisle = ? WHERE id = ?',
          [u.canonicalId ?? null, u.aisle ?? null, u.id]
        );
      }
    });
  },

  // ══════════════════════════════════════════════════════
  // LISTE DE COURSES
  // ══════════════════════════════════════════════════════

  async getShoppingItems(): Promise<ShoppingItem[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_SHOPPING_KEY);
      if (!data) return [];
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM shopping_items ORDER BY created_at ASC');
    return rows.map(_rowToShoppingItem);
  },

  async saveShoppingItems(items: ShoppingItem[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_SHOPPING_KEY, JSON.stringify(items));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM shopping_items');
      for (const item of items) {
        await txn.runAsync(
          `INSERT INTO shopping_items
            (id, name, canonical_id, quantity, unit, is_checked, aisle, created_at, recipe_id, recipe_title)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            item.id, item.name, item.canonicalId ?? null,
            item.quantity ?? null, item.unit ?? null,
            item.isChecked ? 1 : 0, item.aisle ?? null,
            item.createdAt, item.recipeId ?? null, item.recipeTitle ?? null,
          ]
        );
      }
    });
  },

  async addShoppingItem(item: ShoppingItem): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      const filtered = items.filter((i) => i.id !== item.id);
      await this.saveShoppingItems([...filtered, item]);
      return;
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO shopping_items
        (id, name, canonical_id, quantity, unit, is_checked, aisle, created_at, recipe_id, recipe_title)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id, item.name, item.canonicalId ?? null,
        item.quantity ?? null, item.unit ?? null,
        item.isChecked ? 1 : 0, item.aisle ?? null,
        item.createdAt, item.recipeId ?? null, item.recipeTitle ?? null,
      ]
    );
  },

  async toggleShoppingItem(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      await this.saveShoppingItems(
        items.map((i) => (i.id === id ? { ...i, isChecked: !i.isChecked } : i))
      );
      return;
    }
    await db.runAsync(
      'UPDATE shopping_items SET is_checked = CASE WHEN is_checked = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id]
    );
  },

  async updateShoppingItem(item: ShoppingItem): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      await this.saveShoppingItems(items.map((i) => (i.id === item.id ? item : i)));
      return;
    }
    await db.runAsync(
      `UPDATE shopping_items SET name=?, canonical_id=?, quantity=?, unit=?, is_checked=?, aisle=?, recipe_id=?, recipe_title=?
       WHERE id=?`,
      [
        item.name, item.canonicalId ?? null, item.quantity ?? null,
        item.unit ?? null, item.isChecked ? 1 : 0, item.aisle ?? null,
        item.recipeId ?? null, item.recipeTitle ?? null, item.id,
      ]
    );
  },

  async deleteShoppingItem(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      await this.saveShoppingItems(items.filter((i) => i.id !== id));
      return;
    }
    await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [id]);
  },

  async clearCheckedShoppingItems(): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      await this.saveShoppingItems(items.filter((i) => !i.isChecked));
      return;
    }
    await db.runAsync('DELETE FROM shopping_items WHERE is_checked = 1');
  },

  async clearAllShoppingItems(): Promise<void> {
    const db = await getDb();
    if (!db) {
      await this.saveShoppingItems([]);
      return;
    }
    await db.runAsync('DELETE FROM shopping_items');
  },

  async updateShoppingItemsBatch(
    updates: { id: string; name?: string; canonicalId?: string; aisle?: ShoppingAisle }[]
  ): Promise<void> {
    if (updates.length === 0) return;
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      const updateMap = new Map(updates.map((u) => [u.id, u]));
      const updated = items.map((i) => {
        const u = updateMap.get(i.id);
        return u
          ? {
              ...i,
              name: u.name ?? i.name,
              canonicalId: u.canonicalId ?? i.canonicalId,
              aisle: u.aisle ?? i.aisle,
            }
          : i;
      });
      await this.saveShoppingItems(updated);
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const u of updates) {
        await txn.runAsync(
          'UPDATE shopping_items SET name = COALESCE(?,name), canonical_id = ?, aisle = COALESCE(?,aisle) WHERE id = ?',
          [u.name ?? null, u.canonicalId ?? null, u.aisle ?? null, u.id]
        );
      }
    });
  },

  // ══════════════════════════════════════════════════════
  // PLANNING HEBDOMADAIRE
  // ══════════════════════════════════════════════════════

  async getWeeklyPlan(): Promise<WeeklyPlanMap> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_WEEKLY_PLAN_KEY);
      if (!data) return {};
      try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM weekly_plan');
    const plan: WeeklyPlanMap = {};
    for (const row of rows) {
      if (!row.recipe_id) continue;
      const day = (row.slot_key as string).replace(/_(lunch|dinner)$/, '') as PlannedMeal['day'];
      plan[row.slot_key] = {
        id: row.slot_key,
        day,
        recipeId: row.recipe_id,
        recipeTitle: row.recipe_title ?? '',
        recipeImageUrl: row.recipe_image_url ?? '',
        servings: row.servings ?? 4,
        mealTime: row.meal_time as MealTime,
      };
    }
    return plan;
  },

  async setWeeklyMeal(slotKey: string, meal: PlannedMeal | null): Promise<void> {
    const db = await getDb();
    if (!db) {
      const plan = await this.getWeeklyPlan();
      if (meal) plan[slotKey] = meal; else delete plan[slotKey];
      await AsyncStorage.setItem(AS_WEEKLY_PLAN_KEY, JSON.stringify(plan));
      return;
    }
    if (meal) {
      await db.runAsync(
        `INSERT OR REPLACE INTO weekly_plan (slot_key, recipe_id, recipe_title, recipe_image_url, servings, meal_time, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [slotKey, meal.recipeId ?? null, meal.recipeTitle ?? null, meal.recipeImageUrl ?? null, meal.servings ?? null, meal.mealTime ?? null, new Date().toISOString()]
      );
    } else {
      await db.runAsync('DELETE FROM weekly_plan WHERE slot_key = ?', [slotKey]);
    }
  },

  async clearWeeklyPlan(slotKeysToClear?: string[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      if (!slotKeysToClear || slotKeysToClear.length === 0) {
        await AsyncStorage.setItem(AS_WEEKLY_PLAN_KEY, JSON.stringify({}));
      } else {
        const plan = await this.getWeeklyPlan();
        slotKeysToClear.forEach((k) => delete plan[k]);
        await AsyncStorage.setItem(AS_WEEKLY_PLAN_KEY, JSON.stringify(plan));
      }
      return;
    }
    if (!slotKeysToClear || slotKeysToClear.length === 0) {
      await db.runAsync('DELETE FROM weekly_plan');
    } else {
      await db.withExclusiveTransactionAsync(async (txn) => {
        for (const key of slotKeysToClear) {
          await txn.runAsync('DELETE FROM weekly_plan WHERE slot_key = ?', [key]);
        }
      });
    }
  },

  // ══════════════════════════════════════════════════════
  // JOURNAL DES REPAS
  // ══════════════════════════════════════════════════════

  async getMealLogs(): Promise<MealLogMap> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_MEAL_LOG_KEY);
      if (!data) return {};
      try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM meal_logs ORDER BY date DESC');
    const map: MealLogMap = {};
    for (const row of rows) {
      map[row.slot_key] = _rowToMealLogEntry(row);
    }
    return map;
  },

  async setMealLog(slotKey: string, entry: MealLogEntry | null): Promise<void> {
    const db = await getDb();
    if (!db) {
      const logs = await this.getMealLogs();
      if (entry) logs[slotKey] = entry; else delete logs[slotKey];
      await AsyncStorage.setItem(AS_MEAL_LOG_KEY, JSON.stringify(logs));
      return;
    }
    if (entry) {
      await db.runAsync(
        `INSERT OR REPLACE INTO meal_logs
          (id, slot_key, date, meal_time, title, recipe_id, recipe_image_url, note, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          entry.id, slotKey, entry.date, entry.mealTime, entry.title,
          entry.recipeId ?? null, entry.recipeImageUrl ?? null, entry.note ?? null,
          entry.createdAt, entry.updatedAt,
        ]
      );
    } else {
      await db.runAsync('DELETE FROM meal_logs WHERE slot_key = ?', [slotKey]);
    }
  },

  async saveMealLogs(logs: MealLogMap): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_MEAL_LOG_KEY, JSON.stringify(logs));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM meal_logs');
      for (const [slotKey, entry] of Object.entries(logs)) {
        if (!entry) continue;
        await txn.runAsync(
          `INSERT INTO meal_logs
            (id, slot_key, date, meal_time, title, recipe_id, recipe_image_url, note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            entry.id, slotKey, entry.date, entry.mealTime, entry.title,
            entry.recipeId ?? null, entry.recipeImageUrl ?? null, entry.note ?? null,
            entry.createdAt, entry.updatedAt,
          ]
        );
      }
    });
  },

  // ══════════════════════════════════════════════════════
  // ALLERGÈNES UTILISATEUR
  // ══════════════════════════════════════════════════════

  async getUserAllergens(): Promise<UserAllergenItem[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_USER_ALLERGENS_KEY);
      if (!data) return [];
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    const rows = await db.getAllAsync<any>('SELECT * FROM user_allergens ORDER BY added_at ASC');
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      canonicalId: row.canonical_id ?? undefined,
      allergenFamily: (row.allergen_family ?? null) as AllergenFamily | null,
      addedAt: row.added_at,
    }));
  },

  async saveUserAllergens(items: UserAllergenItem[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_USER_ALLERGENS_KEY, JSON.stringify(items));
      return;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM user_allergens');
      for (const item of items) {
        await txn.runAsync(
          'INSERT INTO user_allergens (id, name, canonical_id, allergen_family, added_at) VALUES (?,?,?,?,?)',
          [item.id, item.name, item.canonicalId ?? null, item.allergenFamily ?? null, item.addedAt]
        );
      }
    });
  },

  // ══════════════════════════════════════════════════════
  // SETTINGS GÉNÉRIQUES (thème, portions, flags, etc.)
  // ══════════════════════════════════════════════════════

  async getSetting(key: string): Promise<string | null> {
    const db = await getDb();
    if (!db) {
      return await AsyncStorage.getItem(`@papilles_${key}`);
    }
    return _getSetting(db, key);
  },

  async setSetting(key: string, value: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(`@papilles_${key}`, value);
      return;
    }
    await _setSetting(db, key, value);
  },

  async removeSetting(key: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.removeItem(`@papilles_${key}`);
      return;
    }
    await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
  },

  // ══════════════════════════════════════════════════════
  // PLANNER SETTINGS (objet JSON dans settings)
  // ══════════════════════════════════════════════════════

  async getPlannerSettings(): Promise<PlannerSettings> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_PLANNER_SETTINGS_KEY);
      if (!data) return DEFAULT_PLANNER_SETTINGS;
      try {
        const parsed = JSON.parse(data);
        return {
          mode: parsed?.mode === 'dynamic' ? 'dynamic' : 'fixed',
          startDay: parsed?.startDay || 'Lundi',
        };
      } catch {
        return DEFAULT_PLANNER_SETTINGS;
      }
    }
    const val = await _getSetting(db, 'planner_settings_v1');
    if (!val) return DEFAULT_PLANNER_SETTINGS;
    try {
      const parsed = JSON.parse(val);
      return {
        mode: parsed?.mode === 'dynamic' ? 'dynamic' : 'fixed',
        startDay: parsed?.startDay || 'Lundi',
      };
    } catch {
      return DEFAULT_PLANNER_SETTINGS;
    }
  },

  async savePlannerSettings(settings: PlannerSettings): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_PLANNER_SETTINGS_KEY, JSON.stringify(settings));
      return;
    }
    await _setSetting(db, 'planner_settings_v1', JSON.stringify(settings));
  },

  // ══════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════

  /** Retourne true si la migration AsyncStorage→SQLite a déjà été effectuée */
  async isMigrated(): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;
    const val = await _getSetting(db, SETTING_DB_MIGRATED);
    return val === '1';
  },

  /** Initialise explicitement la base (utile pour le démarrage de l'app) */
  async init(): Promise<void> {
    await getDb();
  },
};
