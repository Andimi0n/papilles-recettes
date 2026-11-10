/**
 * databaseService.ts
 *
 * Couche de persistance SQLite (expo-sqlite) pour Papilles.
 * Remplace le blob monolithique AsyncStorage par une base relationnelle
 * native, sans limite de taille, avec lectures/écritures par ligne (O(1)).
 *
 * Initialisation directe du schéma natif SQLite.
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
import { Folder, RecipeFolder } from '../types/folder';

// ─── Clés AsyncStorage (fallback Node.js test & web) ─────────────────────────
const AS_RECIPES_KEY = '@papilles_recipes_v4';
const AS_SHOPPING_KEY = '@papilles_shopping_list_v1';
const AS_FRIDGE_KEY = '@papilles_fridge_items_v1';
const AS_WEEKLY_PLAN_KEY = '@papilles_weekly_plan_v1';
const AS_MEAL_LOG_KEY = '@papilles_meal_log_v1';
const AS_PLANNER_SETTINGS_KEY = '@papilles_planner_settings_v1';
const AS_USER_ALLERGENS_KEY = '@papilles_user_allergens_v1';
const AS_FOLDERS_KEY = '@papilles_folders_v1';
const AS_RECIPE_FOLDERS_KEY = '@papilles_recipe_folders_v1';

// ─── Détection et chargement sécurisé d'expo-sqlite ─────────────────────────
let _sqliteModule: typeof import('expo-sqlite') | null = null;
let _sqliteChecked = false;

/**
 * Vérifie de manière non intrusive la présence du module natif ExpoSQLite
 * sans exécuter `require('expo-sqlite')` à l'aveugle.
 * Cela évite que le chargeur de modules de Metro (guardedLoadModule) n'intercepte
 * l'exception au require et la déclare comme erreur fatale (ErrorUtils.reportFatalError)
 * en environnement Expo Go ou dev client sans SQLite.
 */
function hasNativeSQLite(): boolean {
  try {
    // 1. Détection via requireOptionalNativeModule de l'API Expo (ne throw jamais)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo');
    if (typeof requireOptionalNativeModule === 'function') {
      const nativeMod = requireOptionalNativeModule('ExpoSQLite');
      if (nativeMod) return true;
    }
  } catch {
    // Environnement sans runtime Expo (ex: Node.js tests)
  }

  try {
    // 2. Détection défensive sur les registres globaux React Native / TurboModules
    const g = globalThis as {
      expo?: { modules?: Record<string, unknown> };
      nativeModuleProxy?: Record<string, unknown>;
      RN$TurboModuleRegistry?: { get?: (name: string) => unknown };
    };
    if (g.expo?.modules?.ExpoSQLite) return true;
    if (g.nativeModuleProxy?.ExpoSQLite) return true;
    if (typeof g.RN$TurboModuleRegistry?.get === 'function' && g.RN$TurboModuleRegistry.get('ExpoSQLite')) return true;
  } catch {
    // Ignorer
  }

  return false;
}

function getSQLiteModule(): typeof import('expo-sqlite') | null {
  if (_sqliteChecked) return _sqliteModule;
  _sqliteChecked = true;
  try {
    // Si le binaire natif ExpoSQLite n'est pas présent sur l'appareil (ex: Expo Go ou dev build non reconstruit),
    // on ne tente PAS require('expo-sqlite') pour éviter le crash fatal de Metro.
    if (!hasNativeSQLite()) {
      _sqliteModule = null;
      return null;
    }
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
// ─── Singleton base de données & Détection de déconnexion ────────────────────
let _db: SQLiteTypes.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLiteTypes.SQLiteDatabase | null> | null = null;
let _transactionMutex: Promise<any> = Promise.resolve();

function isDbClosedError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || '');
  const name = String(err?.name || '');
  return (
    msg.includes('closed resource') ||
    msg.includes('closed') ||
    name === 'AccessClosedResourceException' ||
    name === 'DatabaseClosedException'
  );
}

function isDbAlive(db: SQLiteTypes.SQLiteDatabase | null): boolean {
  if (!db) return false;
  try {
    if (typeof db.getFirstSync === 'function') {
      db.getFirstSync('SELECT 1');
      return true;
    }
    if (typeof db.isInTransactionSync === 'function') {
      db.isInTransactionSync();
      return true;
    }
  } catch (err) {
    if (isDbClosedError(err)) return false;
  }
  return true;
}

async function getDb(): Promise<SQLiteTypes.SQLiteDatabase | null> {
  const mod = getSQLiteModule();
  if (!mod) return null;
  if (_db && isDbAlive(_db)) {
    return _db;
  }
  // Réinitialisation si la connexion native a été fermée (Fast Refresh / reload Expo Go)
  _db = null;
  if (!_initPromise) {
    _initPromise = _openAndInit(mod).finally(() => {
      _initPromise = null;
    });
  }
  return await _initPromise;
}

async function _openAndInit(mod: typeof import('expo-sqlite')): Promise<SQLiteTypes.SQLiteDatabase | null> {
  try {
    const db = typeof mod.openDatabaseSync === 'function'
      ? mod.openDatabaseSync('papilles.db')
      : await mod.openDatabaseAsync('papilles.db');
    await _createSchema(db);
    _db = db;
    return _db;
  } catch (err) {
    console.warn('[DB] Erreur initialisation SQLite, passage en fallback:', err);
    _db = null;
    return null;
  }
}

// ─── Primitives d'exécution JSI synchrones auto-réparatrices ───────────────────
// En cas de coupure native (ex: Fast Refresh Metro invalidant le handle natif),
// withDbRetry réinitialise la connexion et réessaye automatiquement avec succès transparent.

async function withDbRetry<T>(
  preferredDb: SQLiteTypes.SQLiteDatabase,
  action: (activeDb: SQLiteTypes.SQLiteDatabase) => Promise<T> | T
): Promise<T> {
  try {
    return await action(preferredDb);
  } catch (err) {
    if (isDbClosedError(err)) {
      console.warn('[DB] Détection ressource SQLite fermée, réouverture automatique et réessai...');
      _db = null;
      _initPromise = null;
      const freshDb = await getDb();
      if (freshDb) {
        return await action(freshDb);
      }
    }
    throw err;
  }
}

async function execDb(db: SQLiteTypes.SQLiteDatabase, sql: string): Promise<void> {
  await withDbRetry(db, async (activeDb) => {
    if (typeof activeDb.execSync === 'function') {
      activeDb.execSync(sql);
      return;
    }
    await activeDb.execAsync(sql);
  });
}

async function runDb(db: SQLiteTypes.SQLiteDatabase, sql: string, params: any[] = []): Promise<void> {
  await withDbRetry(db, async (activeDb) => {
    if (typeof activeDb.runSync === 'function') {
      activeDb.runSync(sql, params);
      return;
    }
    await activeDb.runAsync(sql, params);
  });
}

async function getAllDb<T>(db: SQLiteTypes.SQLiteDatabase, sql: string, params: any[] = []): Promise<T[]> {
  return withDbRetry(db, (activeDb) => {
    if (typeof activeDb.getAllSync === 'function') {
      return activeDb.getAllSync<T>(sql, params);
    }
    return activeDb.getAllAsync<T>(sql, params);
  });
}

async function getFirstDb<T>(db: SQLiteTypes.SQLiteDatabase, sql: string, params: any[] = []): Promise<T | null> {
  return withDbRetry(db, (activeDb) => {
    if (typeof activeDb.getFirstSync === 'function') {
      return activeDb.getFirstSync<T>(sql, params);
    }
    return activeDb.getFirstAsync<T>(sql, params);
  });
}

async function transactionDb(
  db: SQLiteTypes.SQLiteDatabase,
  task: (run: (sql: string, params?: any[]) => void) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    _transactionMutex = _transactionMutex
      .then(async () => {
        await withDbRetry(db, (activeDb) => {
          if (typeof activeDb.withTransactionSync === 'function') {
            activeDb.withTransactionSync(() => {
              task((sql, params = []) => {
                if (typeof activeDb.runSync === 'function') {
                  activeDb.runSync(sql, params);
                } else {
                  void activeDb.runAsync(sql, params);
                }
              });
            });
            return;
          }
          return activeDb.withExclusiveTransactionAsync(async (txn) => {
            task((sql, params = []) => {
              void txn.runAsync(sql, params);
            });
          });
        });
      })
      .then(resolve)
      .catch(reject);
  });
}

// ─── Création du schéma ───────────────────────────────────────────────────────
async function _createSchema(db: SQLiteTypes.SQLiteDatabase): Promise<void> {
  await execDb(db, `
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

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📁',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at ASC);

    CREATE TABLE IF NOT EXISTS recipe_folders (
      recipe_id TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      added_at TEXT NOT NULL,
      PRIMARY KEY (recipe_id, folder_id),
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_recipe_folders_folder ON recipe_folders(folder_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_folders_recipe ON recipe_folders(recipe_id);
  `);
}

function _rowToFolder(row: any): Folder {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '📁',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Helpers settings ────────────────────────────────────────────────────────
async function _getSetting(db: SQLiteTypes.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await getFirstDb<{ value: string }>(db, 'SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function _setSetting(db: SQLiteTypes.SQLiteDatabase, key: string, value: string): Promise<void> {
  await runDb(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]);
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM recipes ORDER BY created_at DESC');
    return rows.map(_rowToRecipe);
  },

  async getRecipeById(id: string): Promise<Recipe | null> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      return recipes.find((r) => r.id === id) || null;
    }
    const row = await getFirstDb<any>(db, 'SELECT * FROM recipes WHERE id = ?', [id]);
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
    await runDb(
      db,
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
    await transactionDb(db, (run) => {
      run('DELETE FROM recipes');
      for (const recipe of recipes) {
        run(
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
      await runDb(
        db,
        'UPDATE recipes SET rating = ?, user_note = ?, updated_at = ? WHERE id = ?',
        [rating, userNote, new Date().toISOString(), id]
      );
    } else {
      await runDb(
        db,
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
    await runDb(
      db,
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
    await runDb(
      db,
      'UPDATE recipes SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  },

  async deleteRecipe(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(recipes.filter((r) => r.id !== id)));
      const rfData = await AsyncStorage.getItem(AS_RECIPE_FOLDERS_KEY);
      if (rfData) {
        try {
          const list: RecipeFolder[] = JSON.parse(rfData);
          await AsyncStorage.setItem(AS_RECIPE_FOLDERS_KEY, JSON.stringify(list.filter((rf) => rf.recipeId !== id)));
        } catch {
          // ignore
        }
      }
      return;
    }
    await runDb(db, 'DELETE FROM recipe_folders WHERE recipe_id = ?', [id]);
    await runDb(db, 'DELETE FROM recipes WHERE id = ?', [id]);
  },

  async deleteRecipesByPrefix(prefix: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      await AsyncStorage.setItem(AS_RECIPES_KEY, JSON.stringify(recipes.filter((r) => !r.id.startsWith(prefix))));
      return;
    }
    await runDb(db, 'DELETE FROM recipes WHERE id LIKE ?', [`${prefix}%`]);
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
    const rows = await getAllDb<{ tags: string }>(db, 'SELECT tags FROM recipes WHERE tags IS NOT NULL AND tags != "[]"');
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
    await transactionDb(db, (run) => {
      for (const u of updates) {
        run(
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM fridge_items ORDER BY created_at DESC');
    return rows.map(_rowToFridgeItem);
  },

  async saveFridgeItems(items: FridgeItem[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_FRIDGE_KEY, JSON.stringify(items));
      return;
    }
    await transactionDb(db, (run) => {
      if (items.length === 0) {
        run('DELETE FROM fridge_items');
        return;
      }
      // Suppression ciblée des éléments retirés (évite un DROP/DELETE complet)
      const placeholders = items.map(() => '?').join(',');
      const ids = items.map((i) => i.id);
      run(`DELETE FROM fridge_items WHERE id NOT IN (${placeholders})`, ids);

      // Insertion ou mise à jour in-place des éléments
      for (const item of items) {
        run(
          'INSERT OR REPLACE INTO fridge_items (id, name, canonical_id, aisle, created_at) VALUES (?,?,?,?,?)',
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
    await runDb(
      db,
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
    await runDb(db, 'DELETE FROM fridge_items WHERE id = ?', [id]);
  },

  async clearFridge(): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_FRIDGE_KEY, JSON.stringify([]));
      return;
    }
    await runDb(db, 'DELETE FROM fridge_items');
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
    await transactionDb(db, (run) => {
      for (const u of updates) {
        run(
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM shopping_items ORDER BY created_at ASC');
    return rows.map(_rowToShoppingItem);
  },

  async saveShoppingItems(items: ShoppingItem[]): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_SHOPPING_KEY, JSON.stringify(items));
      return;
    }
    await transactionDb(db, (run) => {
      if (items.length === 0) {
        run('DELETE FROM shopping_items');
        return;
      }
      // Suppression ciblée des articles supprimés
      const placeholders = items.map(() => '?').join(',');
      const ids = items.map((i) => i.id);
      run(`DELETE FROM shopping_items WHERE id NOT IN (${placeholders})`, ids);

      // Insertion ou mise à jour ciblée
      for (const item of items) {
        run(
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
    await runDb(
      db,
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
    await runDb(
      db,
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
    await runDb(
      db,
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
    await runDb(db, 'DELETE FROM shopping_items WHERE id = ?', [id]);
  },

  async clearCheckedShoppingItems(): Promise<void> {
    const db = await getDb();
    if (!db) {
      const items = await this.getShoppingItems();
      await this.saveShoppingItems(items.filter((i) => !i.isChecked));
      return;
    }
    await runDb(db, 'DELETE FROM shopping_items WHERE is_checked = 1');
  },

  async clearAllShoppingItems(): Promise<void> {
    const db = await getDb();
    if (!db) {
      await this.saveShoppingItems([]);
      return;
    }
    await runDb(db, 'DELETE FROM shopping_items');
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
    await transactionDb(db, (run) => {
      for (const u of updates) {
        run(
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM weekly_plan');
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
      await runDb(
        db,
        `INSERT OR REPLACE INTO weekly_plan (slot_key, recipe_id, recipe_title, recipe_image_url, servings, meal_time, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
        [slotKey, meal.recipeId ?? null, meal.recipeTitle ?? null, meal.recipeImageUrl ?? null, meal.servings ?? null, meal.mealTime ?? null, new Date().toISOString()]
      );
    } else {
      await runDb(db, 'DELETE FROM weekly_plan WHERE slot_key = ?', [slotKey]);
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
      await runDb(db, 'DELETE FROM weekly_plan');
    } else {
      await transactionDb(db, (run) => {
        for (const key of slotKeysToClear) {
          run('DELETE FROM weekly_plan WHERE slot_key = ?', [key]);
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM meal_logs ORDER BY date DESC');
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
      await runDb(
        db,
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
      await runDb(db, 'DELETE FROM meal_logs WHERE slot_key = ?', [slotKey]);
    }
  },

  async saveMealLogs(logs: MealLogMap): Promise<void> {
    const db = await getDb();
    if (!db) {
      await AsyncStorage.setItem(AS_MEAL_LOG_KEY, JSON.stringify(logs));
      return;
    }
    await transactionDb(db, (run) => {
      run('DELETE FROM meal_logs');
      for (const [slotKey, entry] of Object.entries(logs)) {
        if (!entry) continue;
        run(
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
    const rows = await getAllDb<any>(db, 'SELECT * FROM user_allergens ORDER BY added_at ASC');
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
    await transactionDb(db, (run) => {
      run('DELETE FROM user_allergens');
      for (const item of items) {
        run(
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
    await runDb(db, 'DELETE FROM settings WHERE key = ?', [key]);
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
  // DOSSIERS & LIAISONS RECETTES (N-N)
  // ══════════════════════════════════════════════════════

  async getFolders(): Promise<Folder[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_FOLDERS_KEY);
      if (!data) return [];
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    const rows = await getAllDb<any>(db, 'SELECT * FROM folders ORDER BY created_at ASC');
    return rows.map(_rowToFolder);
  },

  async getFolderById(id: string): Promise<Folder | null> {
    const db = await getDb();
    if (!db) {
      const folders = await this.getFolders();
      return folders.find((f) => f.id === id) ?? null;
    }
    const row = await getFirstDb<any>(db, 'SELECT * FROM folders WHERE id = ?', [id]);
    return row ? _rowToFolder(row) : null;
  },

  async createFolder(folder: Folder): Promise<void> {
    const db = await getDb();
    if (!db) {
      const folders = await this.getFolders();
      folders.push(folder);
      await AsyncStorage.setItem(AS_FOLDERS_KEY, JSON.stringify(folders));
      return;
    }
    await runDb(
      db,
      'INSERT INTO folders (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [folder.id, folder.name, folder.icon, folder.createdAt, folder.updatedAt]
    );
  },

  async updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'icon'>>): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    if (!db) {
      const folders = await this.getFolders();
      const updated = folders.map((f) =>
        f.id === id
          ? {
              ...f,
              name: updates.name !== undefined ? updates.name : f.name,
              icon: updates.icon !== undefined ? updates.icon : f.icon,
              updatedAt: now,
            }
          : f
      );
      await AsyncStorage.setItem(AS_FOLDERS_KEY, JSON.stringify(updated));
      return;
    }
    await runDb(
      db,
      'UPDATE folders SET name = COALESCE(?, name), icon = COALESCE(?, icon), updated_at = ? WHERE id = ?',
      [updates.name ?? null, updates.icon ?? null, now, id]
    );
  },

  async deleteFolder(id: string): Promise<void> {
    const db = await getDb();
    if (!db) {
      const folders = await this.getFolders();
      await AsyncStorage.setItem(AS_FOLDERS_KEY, JSON.stringify(folders.filter((f) => f.id !== id)));
      const rfData = await AsyncStorage.getItem(AS_RECIPE_FOLDERS_KEY);
      if (rfData) {
        try {
          const list: RecipeFolder[] = JSON.parse(rfData);
          await AsyncStorage.setItem(
            AS_RECIPE_FOLDERS_KEY,
            JSON.stringify(list.filter((rf) => rf.folderId !== id))
          );
        } catch {
          // ignore
        }
      }
      return;
    }
    await runDb(db, 'DELETE FROM recipe_folders WHERE folder_id = ?', [id]);
    await runDb(db, 'DELETE FROM folders WHERE id = ?', [id]);
  },

  async getRecipeFolders(): Promise<RecipeFolder[]> {
    const db = await getDb();
    if (!db) {
      const data = await AsyncStorage.getItem(AS_RECIPE_FOLDERS_KEY);
      if (!data) return [];
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    const rows = await getAllDb<any>(db, 'SELECT recipe_id, folder_id, added_at FROM recipe_folders');
    return rows.map((r) => ({
      recipeId: r.recipe_id,
      folderId: r.folder_id,
      addedAt: r.added_at,
    }));
  },

  async getFolderIdsForRecipe(recipeId: string): Promise<string[]> {
    const db = await getDb();
    if (!db) {
      const list = await this.getRecipeFolders();
      return list.filter((rf) => rf.recipeId === recipeId).map((rf) => rf.folderId);
    }
    const rows = await getAllDb<{ folder_id: string }>(
      db,
      'SELECT folder_id FROM recipe_folders WHERE recipe_id = ?',
      [recipeId]
    );
    return rows.map((r) => r.folder_id);
  },

  async getRecipeIdsForFolder(folderId: string): Promise<string[]> {
    const db = await getDb();
    if (!db) {
      const list = await this.getRecipeFolders();
      return list.filter((rf) => rf.folderId === folderId).map((rf) => rf.recipeId);
    }
    const rows = await getAllDb<{ recipe_id: string }>(
      db,
      'SELECT recipe_id FROM recipe_folders WHERE folder_id = ? ORDER BY added_at DESC',
      [folderId]
    );
    return rows.map((r) => r.recipe_id);
  },

  async addRecipesToFolders(recipeIds: string[], folderIds: string[]): Promise<void> {
    if (recipeIds.length === 0 || folderIds.length === 0) return;
    const db = await getDb();
    const now = new Date().toISOString();

    if (!db) {
      const list = await this.getRecipeFolders();
      const existingKeySet = new Set(list.map((item) => `${item.recipeId}::${item.folderId}`));
      const toAdd: RecipeFolder[] = [];
      for (const rId of recipeIds) {
        for (const fId of folderIds) {
          const key = `${rId}::${fId}`;
          if (!existingKeySet.has(key)) {
            existingKeySet.add(key);
            toAdd.push({ recipeId: rId, folderId: fId, addedAt: now });
          }
        }
      }
      if (toAdd.length > 0) {
        await AsyncStorage.setItem(AS_RECIPE_FOLDERS_KEY, JSON.stringify([...list, ...toAdd]));
      }
      return;
    }

    for (const rId of recipeIds) {
      for (const fId of folderIds) {
        await runDb(
          db,
          'INSERT OR IGNORE INTO recipe_folders (recipe_id, folder_id, added_at) VALUES (?, ?, ?)',
          [rId, fId, now]
        );
      }
    }
  },

  async setRecipeFolders(recipeId: string, folderIds: string[]): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    if (!db) {
      const list = await this.getRecipeFolders();
      const filtered = list.filter((item) => item.recipeId !== recipeId);
      const toAdd: RecipeFolder[] = folderIds.map((fId) => ({
        recipeId,
        folderId: fId,
        addedAt: now,
      }));
      await AsyncStorage.setItem(AS_RECIPE_FOLDERS_KEY, JSON.stringify([...filtered, ...toAdd]));
      return;
    }

    await runDb(db, 'DELETE FROM recipe_folders WHERE recipe_id = ?', [recipeId]);
    for (const fId of folderIds) {
      await runDb(
        db,
        'INSERT OR IGNORE INTO recipe_folders (recipe_id, folder_id, added_at) VALUES (?, ?, ?)',
        [recipeId, fId, now]
      );
    }
  },

  async removeRecipesFromFolder(recipeIds: string[], folderId: string): Promise<void> {
    if (recipeIds.length === 0) return;
    const db = await getDb();
    if (!db) {
      const list = await this.getRecipeFolders();
      const removeSet = new Set(recipeIds);
      const updated = list.filter((item) => !(item.folderId === folderId && removeSet.has(item.recipeId)));
      await AsyncStorage.setItem(AS_RECIPE_FOLDERS_KEY, JSON.stringify(updated));
      return;
    }

    for (const rId of recipeIds) {
      await runDb(db, 'DELETE FROM recipe_folders WHERE recipe_id = ? AND folder_id = ?', [rId, folderId]);
    }
  },

  async getUncategorizedRecipeIds(): Promise<string[]> {
    const db = await getDb();
    if (!db) {
      const recipes = await this.getRecipes();
      const list = await this.getRecipeFolders();
      const categorizedSet = new Set(list.map((item) => item.recipeId));
      return recipes.filter((r) => !categorizedSet.has(r.id)).map((r) => r.id);
    }
    const rows = await getAllDb<{ id: string }>(
      db,
      'SELECT r.id FROM recipes r LEFT JOIN recipe_folders rf ON r.id = rf.recipe_id WHERE rf.recipe_id IS NULL'
    );
    return rows.map((r) => r.id);
  },

  // ══════════════════════════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════════════════════════

  /** Retourne true si SQLite est actif (false en fallback Node.js) */
  async isMigrated(): Promise<boolean> {
    const db = await getDb();
    return db !== null;
  },

  /** Initialise explicitement la base (utile pour le démarrage de l'app) */
  async init(): Promise<void> {
    await getDb();
  },
};
