import AsyncStorage from '@react-native-async-storage/async-storage';
import { CanonicalIngredient, AllergenFamily } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';
import {
  getInitialCanonicalVocabulary,
  isKnownDefaultPantryStaple,
  getDefaultAllergen,
  generateCanonicalSlugId,
  FORBIDDEN_ISOLATED_ALIASES,
} from '../data/canonicalVocabulary';
import { normalizeString } from '../utils/helpers';
import { classifyIngredientAisle } from '../utils/aisleClassifier';

const VOCABULARY_STORAGE_KEY = '@papilles_canonical_vocabulary_v1';

export type VocabularyCascadeEvent =
  | {
      type: 'promote';
      parentIds: string[];
      newIngredient: CanonicalIngredient;
      detachedAliases: string[];
    }
  | {
      type: 'merge';
      sourceId: string;
      targetId: string;
      sourceIngredient?: CanonicalIngredient;
      targetIngredient: CanonicalIngredient;
    }
  | {
      type: 'update';
      updatedIngredient: CanonicalIngredient;
      previousIngredient: CanonicalIngredient;
    }
  | {
      type: 'delete';
      deletedId: string;
    }
  | {
      type: 'reset';
    };

export type VocabularyCascadeListener = (event: VocabularyCascadeEvent) => Promise<void> | void;

// Cache en mémoire pour garantir 0 ms de latence sur l'autocomplétion pendant la frappe
let memoryCache: CanonicalIngredient[] | null = null;
let memoryMapById: Map<string, CanonicalIngredient> | null = null;
let memoryMapByNormName: Map<string, CanonicalIngredient> | null = null;
let memoryMapByAlias: Map<string, CanonicalIngredient> | null = null;

function rebuildMaps(list: CanonicalIngredient[]) {
  const byId = new Map<string, CanonicalIngredient>();
  const byNorm = new Map<string, CanonicalIngredient>();
  const byAlias = new Map<string, CanonicalIngredient>();
  list.forEach(item => {
    byId.set(item.id, item);
    byNorm.set(item.normalizedName, item);
    if (item.aliases) {
      item.aliases.forEach(alias => byAlias.set(alias, item));
    }
  });
  memoryMapById = byId;
  memoryMapByNormName = byNorm;
  memoryMapByAlias = byAlias;
}

let initPromise: Promise<CanonicalIngredient[]> | null = null;
let cascadeListeners: VocabularyCascadeListener[] = [];
let onSaveCallback: (() => void) | null = null;

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
            let hadChanges = false;

            // Répertoire de tous les noms canoniques normalisés
            const canonicalMap = new Map<string, string>(); // normName -> id
            parsed.forEach((item) => {
              canonicalMap.set(item.normalizedName, item.id);
            });

            // Map de la graine initiale pour enrichir rétroactivement les densités par défaut
            const initialSeedMap = new Map<string, CanonicalIngredient>();
            getInitialCanonicalVocabulary().forEach((s) => {
              initialSeedMap.set(s.normalizedName, s);
            });

            const sanitized = parsed.map((item) => {
              let itemUpdated = false;
              let isPantryStaple = item.isPantryStaple;

              if (isPantryStaple === undefined) {
                isPantryStaple = isKnownDefaultPantryStaple(item.canonicalName);
                itemUpdated = true;
              }

              let allergen = item.allergen;
              if (allergen === undefined) {
                const defaultAllergen = getDefaultAllergen(item.canonicalName) || getDefaultAllergen(item.normalizedName);
                if (defaultAllergen) {
                  allergen = defaultAllergen;
                  itemUpdated = true;
                }
              }

              let density = item.density;
              if (density === undefined && !item.isCustom) {
                const seed = initialSeedMap.get(item.normalizedName);
                if (seed?.density !== undefined) {
                  density = seed.density;
                  itemUpdated = true;
                }
              }

              // Correction d'identifiant : assigner un identifiant canonique stable et unique basé sur le slug
              let id = item.id;
              if (!item.isCustom) {
                const stableId = generateCanonicalSlugId(item.canonicalName);
                if (id !== stableId) {
                  id = stableId;
                  itemUpdated = true;
                }
              }

              // Nettoyage anti-conflits des alias :
              // Un ingrédient ne doit JAMAIS posséder comme alias le nom canonique d'un AUTRE ingrédient
              const cleanedAliases: string[] = [];
              const seen = new Set<string>();

              // S'assurer que le nom canonique et son pluriel font partie des alias
              seen.add(item.normalizedName);
              cleanedAliases.push(item.normalizedName);
              if (!item.normalizedName.endsWith('s')) {
                const plural = `${item.normalizedName}s`;
                seen.add(plural);
                cleanedAliases.push(plural);
              }

              (item.aliases || []).forEach((a) => {
                const cleanA = normalizeString(a);
                if (!cleanA) return;

                // Si cet alias est exactement le nom canonique d'un AUTRE ingrédient
                const ownerId = canonicalMap.get(cleanA);
                if (ownerId && ownerId !== item.id) {
                  // Conflit détecté (ex: "sucre" dans les alias de "Sucre glace") -> on l'élimine !
                  itemUpdated = true;
                  return;
                }

                // Vérifier aussi pour le pluriel d'un autre ingrédient
                if (cleanA.endsWith('s')) {
                  const singular = cleanA.slice(0, -1);
                  const singularOwnerId = canonicalMap.get(singular);
                  if (singularOwnerId && singularOwnerId !== item.id) {
                    itemUpdated = true;
                    return;
                  }
                }

                if (!seen.has(cleanA)) {
                  seen.add(cleanA);
                  cleanedAliases.push(cleanA);
                }
              });

              if (cleanedAliases.length !== (item.aliases || []).length) {
                itemUpdated = true;
              }

              if (itemUpdated) {
                hadChanges = true;
                return {
                  ...item,
                  id,
                  isPantryStaple,
                  allergen,
                  density,
                  aliases: cleanedAliases,
                  updatedAt: new Date().toISOString(),
                };
              }

              return item;
            });

            // Déduplication stricte par nom normalisé
            const uniqueMap = new Map<string, CanonicalIngredient>();
            for (const item of sanitized) {
              const key = item.normalizedName;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
              } else {
                hadChanges = true;
                const existing = uniqueMap.get(key)!;
                const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...(item.aliases || [])]));
                uniqueMap.set(key, {
                  ...existing,
                  allergen: existing.allergen || item.allergen,
                  usageCount: Math.max(existing.usageCount || 0, item.usageCount || 0),
                  aliases: mergedAliases,
                  updatedAt: new Date().toISOString(),
                });
              }
            }
            let finalList = Array.from(uniqueMap.values());

            // Synchroniser les nouveaux ingrédients de base (ex: Cacahuètes, Sésame, Tofu, Noix...)
            const existingNormalized = new Set(finalList.map((i) => i.normalizedName));
            const initialSeed = getInitialCanonicalVocabulary();
            const missingSeeds = initialSeed.filter((s) => !existingNormalized.has(s.normalizedName));
            if (missingSeeds.length > 0) {
              finalList = [...finalList, ...missingSeeds];
              hadChanges = true;
            }

            // S'assurer de l'unicité absolue de chaque identifiant dans la liste finale
            const seenIds = new Set<string>();
            finalList = finalList.map((item) => {
              let uniqueId = item.id;
              if (seenIds.has(uniqueId)) {
                hadChanges = true;
                uniqueId = `${uniqueId}_${Math.random().toString(36).slice(2, 6)}`;
              }
              seenIds.add(uniqueId);
              return uniqueId !== item.id ? { ...item, id: uniqueId } : item;
            });

            // S'assurer que "Sucre glace" est répertorié de façon autonome
            const hasSucreGlace = finalList.some((i) => i.normalizedName === 'sucre glace');
            if (!hasSucreGlace) {
              const newEntry: CanonicalIngredient = {
                id: 'ing_canon_sucre_glace',
                canonicalName: 'Sucre glace',
                normalizedName: 'sucre glace',
                aliases: ['sucre glace', 'sucre glaces', 'sucre impalpable'],
                defaultAisle: 'Épicerie & Condiments',
                isCustom: false,
                isPantryStaple: false,
                usageCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              finalList = [newEntry, ...finalList];
              hadChanges = true;
            }

            if (hadChanges) {
              AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(finalList)).catch(() => {});
            }
            memoryCache = finalList;
            rebuildMaps(finalList);
            return memoryCache;
          }
        }

        // Première utilisation : peuplement initial
        const initialList = getInitialCanonicalVocabulary();
        await AsyncStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(initialList));
        memoryCache = initialList;
        rebuildMaps(initialList);
        return memoryCache;
      } catch (err: any) {
        if (!err || typeof err.message !== 'string' || !err.message.includes('window is not defined')) {
          console.error('Erreur chargement vocabulaire canonique:', err);
        }
        const fallback = getInitialCanonicalVocabulary();
        memoryCache = fallback;
        rebuildMaps(fallback);
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

  getSyncMapById(): Map<string, CanonicalIngredient> {
    if (memoryMapById) {
      return memoryMapById;
    }
    this.getAll().catch(() => {});
    const fallbackList = getInitialCanonicalVocabulary();
    const map = new Map<string, CanonicalIngredient>();
    fallbackList.forEach(item => map.set(item.id, item));
    return map;
  },

  getSyncMapByNormName(): Map<string, CanonicalIngredient> {
    if (memoryMapByNormName) {
      return memoryMapByNormName;
    }
    this.getAll().catch(() => {});
    const fallbackList = getInitialCanonicalVocabulary();
    const map = new Map<string, CanonicalIngredient>();
    fallbackList.forEach(item => map.set(item.normalizedName, item));
    return map;
  },

  getSyncMapByAlias(): Map<string, CanonicalIngredient> {
    if (memoryMapByAlias) {
      return memoryMapByAlias;
    }
    this.getAll().catch(() => {});
    const fallbackList = getInitialCanonicalVocabulary();
    const map = new Map<string, CanonicalIngredient>();
    fallbackList.forEach(item => {
      if (item.aliases) {
        item.aliases.forEach(alias => map.set(alias, item));
      }
    });
    return map;
  },

  /**
   * Enregistre un callback de notification déclenché immédiatement lors de saveAll
   * (utilisé par ingredientNormalizer pour vider ses caches mémoire sans cycle d'import)
   */
  registerOnSaveCallback(cb: () => void): void {
    onSaveCallback = cb;
  },

  /**
   * Enregistre un écouteur de cascade pour propager les changements structurels du lexique
   * (promotions, fusions, suppressions, renommages de rayon) vers les recettes, le stock et les courses.
   */
  onVocabularyCascade(listener: VocabularyCascadeListener): () => void {
    cascadeListeners.push(listener);
    return () => {
      cascadeListeners = cascadeListeners.filter((l) => l !== listener);
    };
  },

  /**
   * Notifie tous les écouteurs d'un événement de cascade
   */
  async notifyCascade(event: VocabularyCascadeEvent): Promise<void> {
    for (const listener of cascadeListeners) {
      try {
        await listener(event);
      } catch (err) {
        console.error('Erreur listener cascade vocabulaire:', err);
      }
    }
  },

  /**
   * Sauvegarde l'état actuel de la liste dans le cache et AsyncStorage
   */
  async saveAll(list: CanonicalIngredient[]): Promise<void> {
    memoryCache = list;
    rebuildMaps(list);
    if (onSaveCallback) {
      try {
        onSaveCallback();
      } catch (e) {
        console.error('Erreur onSaveCallback vocabulaire:', e);
      }
    }
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
    allergen?: AllergenFamily;
    density?: number;
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
      if (item.allergen && existing.allergen !== item.allergen) {
        return await this.updateAllergenFamily(existing.id, item.allergen);
      }
      return existing;
    }

    // Si ce terme était un alias d'un autre ingrédient, le promouvoir en ingrédient canonique distinct
    const isAliasOfAnother = list.some((i) => i.aliases.includes(norm));
    if (isAliasOfAnother) {
      const promoted = await this.promoteAliasToCanonical(
        cleanName,
        item.defaultAisle,
        item.aliases,
        item.isPantryStaple
      );
      if (item.allergen) {
        return await this.updateAllergenFamily(promoted.id, item.allergen);
      }
      return promoted;
    }

    const now = new Date().toISOString();
    const slug = generateCanonicalSlugId(cleanName).replace('ing_canon_', '');
    const uniqueId = `ing_custom_${slug}_${Date.now().toString(36)}`;
    const aisle = item.defaultAisle || classifyIngredientAisle(cleanName);

    // Collecter les noms canoniques et alias des autres ingrédients pour interdire tout conflit
    const otherCanonicalNames = new Set(list.map((i) => i.normalizedName));
    list.forEach((i) => otherCanonicalNames.add(`${i.normalizedName}s`));

    const otherAliases = new Set<string>();
    list.forEach((i) => {
      (i.aliases || []).forEach((a) => otherAliases.add(a));
    });

    const aliasSet = new Set<string>();
    aliasSet.add(norm);
    if (!norm.endsWith('s')) {
      aliasSet.add(`${norm}s`);
    }
    (item.aliases || []).forEach((a) => {
      const cleanAlias = normalizeString(a);
      if (
        cleanAlias &&
        !FORBIDDEN_ISOLATED_ALIASES.has(cleanAlias) &&
        !otherCanonicalNames.has(cleanAlias) &&
        !otherAliases.has(cleanAlias)
      ) {
        aliasSet.add(cleanAlias);
      }
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
      allergen: item.allergen,
      density: typeof item.density === 'number' && item.density > 0 ? item.density : undefined,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newEntry, ...list];
    await this.saveAll(updated);
    return newEntry;
  },

  /**
   * Modifie ou assigne la famille d'allergène majeure d'un ingrédient
   */
  async updateAllergenFamily(
    idOrName: string,
    allergenFamily?: AllergenFamily | null
  ): Promise<CanonicalIngredient> {
    const list = await this.getAll();
    const cleanNorm = normalizeString(idOrName);
    const idx = list.findIndex(
      (i) => i.id === idOrName || i.normalizedName === cleanNorm
    );
    if (idx === -1) {
      throw new Error(`Ingrédient introuvable: ${idOrName}`);
    }

    const updated: CanonicalIngredient = {
      ...list[idx],
      allergen: allergenFamily || undefined,
      updatedAt: new Date().toISOString(),
    };

    const nextList = [...list];
    nextList[idx] = updated;
    await this.saveAll(nextList);
    return updated;
  },

  /**
   * Promeut délibérément un synonyme ou alias en un ingrédient canonique à part entière.
   * Si ce terme (ou une variante proche) appartenait aux alias d'un ingrédient existant,
   * cet alias et ceux qui s'en rapprochent sont retirés de l'ingrédient d'origine,
   * et le nouvel ingrédient est créé avec ses propres synonymes.
   * Règle anti-conflit stricte : le nom de base du parent ne peut JAMAIS être transféré.
   */
  async promoteAliasToCanonical(
    rawName: string,
    defaultAisle?: ShoppingAisle,
    initialCustomAliases?: string[],
    isPantryStaple?: boolean
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
    const affectedParentIds: string[] = [];

    // Mots composants le terme promu (ex: ["noix", "de", "muscade"])
    const normTokens = norm.split(/\s+/).filter((t) => t.length > 1);

    // Parcourir le lexique et détacher le synonyme et ses variantes proches
    const updatedList = list.map((item) => {
      const parentTokens = item.normalizedName.split(/\s+/).filter((t) => t.length > 1);
      // Mots spécifiques au terme promu qui n'appartiennent pas au parent canonique (ex: ["glace"] pour "sucre glace", ["noix"] pour "noix de muscade")
      const distinctiveTokens = normTokens.filter((t) => !parentTokens.includes(t));

      // Vérifier si cet ingrédient contient norm ou un alias qui lui est lié
      const hasMatchingAlias = item.aliases.some((a) => {
        if (a === norm || a === `${norm}s` || norm === `${a}s`) return true;
        if (a.includes(norm)) return true;
        if (distinctiveTokens.length > 0 && distinctiveTokens.every((dt) => a.includes(dt))) return true;
        return false;
      });

      if (!hasMatchingAlias) {
        return item;
      }

      affectedParentIds.push(item.id);

      if (!sourceAisle) {
        sourceAisle = item.defaultAisle;
      }

      const keptAliases: string[] = [];

      item.aliases.forEach((a) => {
        // RÈGLE ABSOLUE 1 : Le nom canonique du parent et son pluriel ne sont JAMAIS détachés
        if (a === item.normalizedName || a === `${item.normalizedName}s`) {
          keptAliases.push(a);
          return;
        }

        const isExactOrPlural = a === norm || a === `${norm}s` || norm === `${a}s`;
        // Un alias est lié au terme promu s'il CONTIENT le terme promu (ex: "sucre glace vanillé" contient "sucre glace")
        // En AUCUN CAS l'inverse (norm.includes(a)) car sinon "sucre glace" détacherait "sucre" !
        const isSuperstringOfNorm = a.includes(norm);
        const matchesDistinctive =
          distinctiveTokens.length > 0 &&
          distinctiveTokens.every((dt) => a.includes(dt));

        if (isExactOrPlural || isSuperstringOfNorm || matchesDistinctive) {
          detachedAliases.push(a);
        } else {
          keptAliases.push(a);
        }
      });

      // S'assurer que le parent conserve toujours son propre nom canonique
      if (!keptAliases.includes(item.normalizedName)) {
        keptAliases.push(item.normalizedName);
      }

      return {
        ...item,
        aliases: keptAliases,
        updatedAt: now,
      };
    });

    // Collecter les noms canoniques des autres ingrédients pour interdire tout conflit
    const otherCanonicalNorms = new Set(updatedList.map((i) => i.normalizedName));
    updatedList.forEach((i) => otherCanonicalNorms.add(`${i.normalizedName}s`));

    // Construire le jeu d'alias pour le nouvel ingrédient
    const newAliasSet = new Set<string>();
    newAliasSet.add(norm);
    if (!norm.endsWith('s')) {
      newAliasSet.add(`${norm}s`);
    }

    detachedAliases.forEach((a) => {
      if (!otherCanonicalNorms.has(a)) {
        newAliasSet.add(a);
        if (!a.endsWith('s') && !otherCanonicalNorms.has(`${a}s`)) {
          newAliasSet.add(`${a}s`);
        }
      }
    });

    if (initialCustomAliases && Array.isArray(initialCustomAliases)) {
      initialCustomAliases.forEach((ca) => {
        const cleanAlias = normalizeString(ca);
        if (cleanAlias && !otherCanonicalNorms.has(cleanAlias)) {
          newAliasSet.add(cleanAlias);
          if (!cleanAlias.endsWith('s') && !otherCanonicalNorms.has(`${cleanAlias}s`)) {
            newAliasSet.add(`${cleanAlias}s`);
          }
        }
      });
    }

    const aisle = defaultAisle || sourceAisle || classifyIngredientAisle(cleanName);
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    const isStaple =
      typeof isPantryStaple === 'boolean'
        ? isPantryStaple
        : isKnownDefaultPantryStaple(cleanName);

    const baseSlug = generateCanonicalSlugId(cleanName);
    const existingWithSlug = list.some((i) => i.id === baseSlug);
    const uniqueId = existingWithSlug
      ? `${baseSlug}_${Date.now()}`
      : baseSlug;

    const newEntry: CanonicalIngredient = {
      id: uniqueId,
      canonicalName: formattedName,
      normalizedName: norm,
      aliases: Array.from(newAliasSet),
      defaultAisle: aisle,
      isCustom: true,
      isPantryStaple: isStaple,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const finalList = [newEntry, ...updatedList];
    await this.saveAll(finalList);
    await this.notifyCascade({
      type: 'promote',
      parentIds: affectedParentIds,
      newIngredient: newEntry,
      detachedAliases,
    });
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

    // Vérifier si un autre ingrédient porte déjà ce nom normalisé
    if (updates.canonicalName) {
      const conflict = list.find((i) => i.id !== id && i.normalizedName === newNormalized);
      if (conflict) {
        throw new Error(`Un autre ingrédient porte déjà le nom "${conflict.canonicalName}".`);
      }
    }

    // Collecter les noms canoniques des AUTRES ingrédients pour interdire tout conflit
    const otherCanonicalNames = new Set(
      list.filter((i) => i.id !== id).map((i) => i.normalizedName)
    );
    list.filter((i) => i.id !== id).forEach((i) => {
      otherCanonicalNames.add(`${i.normalizedName}s`);
    });

    const otherAliases = new Set<string>();
    list.filter((i) => i.id !== id).forEach((i) => {
      (i.aliases || []).forEach((a) => otherAliases.add(a));
    });

    // Mettre à jour les alias
    const rawAliases = updates.aliases ? updates.aliases.map(normalizeString) : current.aliases;
    const aliasSet = new Set<string>();
    aliasSet.add(newNormalized);
    if (!newNormalized.endsWith('s')) {
      aliasSet.add(`${newNormalized}s`);
    }

    rawAliases.forEach((a) => {
      const cleanA = normalizeString(a);
      if (
        cleanA &&
        !FORBIDDEN_ISOLATED_ALIASES.has(cleanA) &&
        !otherCanonicalNames.has(cleanA) &&
        !otherAliases.has(cleanA)
      ) {
        aliasSet.add(cleanA);
      }
    });

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
    await this.notifyCascade({
      type: 'update',
      updatedIngredient: updatedItem,
      previousIngredient: current,
    });
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
    await this.notifyCascade({
      type: 'delete',
      deletedId: id,
    });
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
    await this.notifyCascade({
      type: 'merge',
      sourceId,
      targetId,
      sourceIngredient: source,
      targetIngredient: updatedTarget,
    });
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
    await this.notifyCascade({
      type: 'reset',
    });
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

  /**
   * Retourne la densité (en g/ml) d'un ingrédient par son identifiant ou son nom (lookup synchrone O(1))
   */
  getDensity(nameOrId?: string): number | undefined {
    if (!nameOrId || !nameOrId.trim()) return undefined;
    const clean = nameOrId.trim();
    const byId = this.getSyncMapById().get(clean);
    if (byId?.density && byId.density > 0) return byId.density;
    const norm = normalizeString(clean);
    const byNorm = this.getSyncMapByNormName().get(norm);
    if (byNorm?.density && byNorm.density > 0) return byNorm.density;
    if (memoryMapByAlias) {
      const byAlias = memoryMapByAlias.get(norm);
      if (byAlias?.density && byAlias.density > 0) return byAlias.density;
    }
    return undefined;
  },
};
