import AsyncStorage from '@react-native-async-storage/async-storage';
import { CanonicalIngredient } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';
import { getInitialCanonicalVocabulary, isKnownDefaultPantryStaple } from '../data/canonicalVocabulary';
import { normalizeString } from '../utils/helpers';
import { classifyIngredientAisle } from '../utils/aisleClassifier';

const VOCABULARY_STORAGE_KEY = '@papilles_canonical_vocabulary_v1';

// Cache en mémoire pour garantir 0 ms de latence sur l'autocomplétion pendant la frappe
let memoryCache: CanonicalIngredient[] | null = null;
let isInitializing = false;
let initPromise: Promise<CanonicalIngredient[]> | null = null;

export const VocabularyService = {
  /**
   * Initialise le vocabulaire : charge depuis AsyncStorage ou peuple avec le jeu initial.
   */
  async getAll(): Promise<CanonicalIngredient[]> {
    if (memoryCache) {
      return memoryCache;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        const storedJson = await AsyncStorage.getItem(VOCABULARY_STORAGE_KEY);
        if (storedJson) {
          const parsed: CanonicalIngredient[] = JSON.parse(storedJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let hadMissingStaple = false;
            const migrated = parsed.map((item) => {
              if (item.isPantryStaple === undefined) {
                hadMissingStaple = true;
                return {
                  ...item,
                  isPantryStaple: isKnownDefaultPantryStaple(item.canonicalName),
                };
              }
              return item;
            });
            if (hadMissingStaple) {
              AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(migrated)).catch(() => {});
            }
            memoryCache = migrated;
            return memoryCache;
          }
        }

        // Première utilisation : peuplement initial
        const initialList = getInitialCanonicalVocabulary();
        await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(initialList));
        memoryCache = initialList;
        return memoryCache;
      } catch (err) {
        console.error('Erreur chargement vocabulaire canonique:', err);
        const fallback = getInitialCanonicalVocabulary();
        memoryCache = fallback;
        return fallback;
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  /**
   * Retourne la liste en mémoire synchrone (ou la seed de repli si le stockage n'est pas encore prêt)
   */
  getSyncList(): CanonicalIngredient[] {
    if (memoryCache) {
      return memoryCache;
    }
    // Déclenche l'initialisation asynchrone en tâche de fond
    this.getAll().catch(() => {});
    return getInitialCanonicalVocabulary();
  },

  /**
   * Sauvegarde l'état actuel de la liste dans le cache et AsyncStorage
   */
  async saveAll(list: CanonicalIngredient[]): Promise<void> {
    memoryCache = list;
    await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(list));
  },

  /**
   * Ajoute un nouvel ingrédient canonique dans le lexique.
   */
  async add(item: {
    canonicalName: string;
    defaultAisle?: ShoppingAisle;
    aliases?: string[];
    isCustom?: boolean;
    isPantryStaple?: boolean;
  }): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const cleanName = item.canonicalName.trim();
    if (!cleanName) {
      throw new Error('Le nom de l\'ingrédient ne peut pas être vide.');
    }

    const norm = normalizeString(cleanName);
    // Vérifier si un ingrédient identique existe déjà
    const existing = list.find((i) => i.normalizedName === norm);
    if (existing) {
      return existing;
    }

    // Si ce terme était un alias d'un autre ingrédient, le promouvoir en ingrédient canonique distinct
    const isAliasOfAnother = list.some((i) => i.aliases.includes(norm));
    if (isAliasOfAnother) {
      return await this.promoteAliasToCanonical(cleanName, item.defaultAisle);
    }

    const now = new Date().toISOString();
    const uniqueId = `ing_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const aisle = item.defaultAisle || classifyIngredientAisle(cleanName);

    const aliasSet = new Set<string>();
    aliasSet.add(norm);
    if (!norm.endsWith('s')) {
      aliasSet.add(`${norm}s`);
    }
    (item.aliases || []).forEach((a) => {
      const cleanAlias = normalizeString(a);
      if (cleanAlias) aliasSet.add(cleanAlias);
    });

    const isPantryStaple =
      typeof item.isPantryStaple === 'boolean'
        ? item.isPantryStaple
        : isKnownDefaultPantryStaple(cleanName);

    const newEntry: CanonicalIngredient = {
      id: uniqueId,
      canonicalName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      normalizedName: norm,
      aliases: Array.from(aliasSet),
      defaultAisle: aisle,
      isCustom: item.isCustom ?? true,
      isPantryStaple,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newEntry, ...list];
    await this.saveAll(updated);
    return newEntry;
  },

  /**
   * Promeut délibérément un synonyme ou alias en un ingrédient canonique à part entière.
   * Si ce terme (ou une variante proche) appartenait aux alias d'un ingrédient existant,
   * cet alias et ceux qui s'en rapprochent sont retirés de l'ingrédient d'origine,
   * et le nouvel ingrédient est créé avec ses propres synonymes.
   */
  async promoteAliasToCanonical(
    rawName: string,
    defaultAisle?: ShoppingAisle
  ): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const cleanName = rawName.trim();
    if (!cleanName) {
      throw new Error("Le nom de l'ingrédient ne peut pas être vide.");
    }

    const norm = normalizeString(cleanName);
    // Si l'ingrédient existe déjà exactement en tant que nom canonique, on le renvoie
    const existingCanonical = list.find((i) => i.normalizedName === norm);
    if (existingCanonical) {
      return existingCanonical;
    }

    const now = new Date().toISOString();
    let sourceAisle: ShoppingAisle | undefined;
    const detachedAliases: string[] = [];

    // Mots composants le terme promu (ex: ["noix", "de", "muscade"])
    const normTokens = norm.split(/\s+/).filter((t) => t.length > 1);

    // Parcourir le lexique et détacher le synonyme et ses variantes proches
    const updatedList = list.map((item) => {
      const parentTokens = item.normalizedName.split(/\s+/).filter((t) => t.length > 1);
      // Mots spécifiques au terme promu qui n'appartiennent pas au parent canonique (ex: ["noix"])
      const distinctiveTokens = normTokens.filter((t) => !parentTokens.includes(t));

      // Vérifier si cet ingrédient contient norm ou un alias qui lui est lié
      const hasMatchingAlias = item.aliases.some((a) => {
        if (a === norm || a === `${norm}s` || norm === `${a}s`) return true;
        if (a.includes(norm) || norm.includes(a)) return true;
        if (distinctiveTokens.length > 0 && distinctiveTokens.every((dt) => a.includes(dt))) return true;
        return false;
      });

      if (!hasMatchingAlias) {
        return item;
      }

      if (!sourceAisle) {
        sourceAisle = item.defaultAisle;
      }

      const keptAliases: string[] = [];

      item.aliases.forEach((a) => {
        const isExactOrPlural = a === norm || a === `${norm}s` || norm === `${a}s`;
        const isSubstring = (a.includes(norm) || norm.includes(a)) && a.length >= 3;
        const matchesDistinctive =
          distinctiveTokens.length > 0 &&
          distinctiveTokens.every((dt) => a.includes(dt)) &&
          // S'assurer de ne pas toucher au nom canonique du parent lui-même
          a !== item.normalizedName;

        if (isExactOrPlural || isSubstring || matchesDistinctive) {
          detachedAliases.push(a);
        } else {
          keptAliases.push(a);
        }
      });

      return {
        ...item,
        aliases: keptAliases,
        updatedAt: now,
      };
    });

    // Construire le jeu d'alias pour le nouvel ingrédient
    const newAliasSet = new Set<string>();
    newAliasSet.add(norm);
    if (!norm.endsWith('s')) {
      newAliasSet.add(`${norm}s`);
    }
    detachedAliases.forEach((a) => {
      newAliasSet.add(a);
      if (!a.endsWith('s')) {
        newAliasSet.add(`${a}s`);
      }
    });

    const aisle = defaultAisle || sourceAisle || classifyIngredientAisle(cleanName);
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    const newEntry: CanonicalIngredient = {
      id: `ing_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      canonicalName: formattedName,
      normalizedName: norm,
      aliases: Array.from(newAliasSet),
      defaultAisle: aisle,
      isCustom: true,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const finalList = [newEntry, ...updatedList];
    await this.saveAll(finalList);
    return newEntry;
  },

  /**
   * Modifie un ingrédient existant (renommer, changer de rayon, mettre à jour les alias)
   */
  async update(id: string, updates: Partial<CanonicalIngredient>): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) {
      throw new Error('Ingrédient introuvable.');
    }

    const current = list[idx];
    const now = new Date().toISOString();

    const newCanonicalName = updates.canonicalName
      ? updates.canonicalName.trim()
      : current.canonicalName;
    const newNormalized = normalizeString(newCanonicalName);

    // Mettre à jour les alias
    const aliasSet = new Set<string>(updates.aliases ? updates.aliases.map(normalizeString) : current.aliases);
    aliasSet.add(newNormalized);
    if (!newNormalized.endsWith('s')) {
      aliasSet.add(`${newNormalized}s`);
    }

    const updatedItem: CanonicalIngredient = {
      ...current,
      ...updates,
      canonicalName: newCanonicalName,
      normalizedName: newNormalized,
      aliases: Array.from(aliasSet),
      updatedAt: now,
    };

    const nextList = [...list];
    nextList[idx] = updatedItem;
    await this.saveAll(nextList);
    return updatedItem;
  },

  /**
   * Bascule l'état "fond de placard / ingrédient de base" d'un ingrédient canonique
   */
  async togglePantryStaple(id: string): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const item = list.find((i) => i.id === id);
    if (!item) {
      throw new Error('Ingrédient introuvable.');
    }
    return this.update(id, { isPantryStaple: !item.isPantryStaple });
  },

  /**
   * Supprime un ingrédient du lexique
   */
  async delete(id: string): Promise<void> {
    const list = await this.getAll();
    const nextList = list.filter((i) => i.id !== id);
    await this.saveAll(nextList);
  },

  /**
   * Fusionne un ingrédient source vers un ingrédient cible.
   * Tous les alias et le compteur d'utilisation de la source sont transférés vers la cible.
   */
  async merge(sourceId: string, targetId: string): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const source = list.find((i) => i.id === sourceId);
    const target = list.find((i) => i.id === targetId);

    if (!source || !target) {
      throw new Error('L\'un des ingrédients à fusionner est introuvable.');
    }

    const aliasSet = new Set<string>(target.aliases);
    aliasSet.add(source.normalizedName);
    source.aliases.forEach((a) => aliasSet.add(a));

    const updatedTarget: CanonicalIngredient = {
      ...target,
      aliases: Array.from(aliasSet),
      usageCount: target.usageCount + source.usageCount,
      updatedAt: new Date().toISOString(),
    };

    const nextList = list
      .filter((i) => i.id !== sourceId)
      .map((i) => (i.id === targetId ? updatedTarget : i));

    await this.saveAll(nextList);
    return updatedTarget;
  },

  /**
   * Incrémente le compteur d'utilisation d'un ingrédient pour favoriser son autocomplétion.
   */
  async incrementUsage(nameOrId: string): Promise<void> {
    const list = await this.getAll();
    const norm = normalizeString(nameOrId);
    const item = list.find((i) => i.id === nameOrId || i.normalizedName === norm || i.aliases.includes(norm));

    if (item) {
      item.usageCount += 1;
      item.updatedAt = new Date().toISOString();
      await this.saveAll([...list]);
    }
  },

  /**
   * Réinitialise le vocabulaire aux données initiales de base
   */
  async resetToDefaults(): Promise<void> {
    const defaults = getInitialCanonicalVocabulary();
    await this.saveAll(defaults);
  },

  /**
   * Recherche synchrone ultrarapide pour l'autocomplétion
   */
  search(query: string, limit = 8): CanonicalIngredient[] {
    const clean = normalizeString(query);
    if (!clean) return [];

    const list = this.getSyncList();

    const matches: { item: CanonicalIngredient; score: number }[] = [];

    for (const item of list) {
      let score = -1;

      // Correspondance exacte sur le nom canonique
      if (item.normalizedName === clean) {
        score = 100;
      }
      // Commence par le mot recherché
      else if (item.normalizedName.startsWith(clean)) {
        score = 80;
      }
      // Contient le mot recherché
      else if (item.normalizedName.includes(clean)) {
        score = 60;
      }
      // Correspondance dans les alias
      else {
        for (const alias of item.aliases) {
          if (alias === clean) {
            score = Math.max(score, 75);
            break;
          } else if (alias.startsWith(clean)) {
            score = Math.max(score, 55);
          } else if (alias.includes(clean)) {
            score = Math.max(score, 40);
          }
        }
      }

      if (score > 0) {
        // Bonus basé sur la fréquence d'usage passée
        const frequencyBonus = Math.min(15, item.usageCount * 2);
        matches.push({ item, score: score + frequencyBonus });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit).map((m) => m.item);
  },
};
