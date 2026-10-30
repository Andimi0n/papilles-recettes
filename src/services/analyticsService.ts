/**
 * AnalyticsService — Système de log interne d'actions utilisateur.
 *
 * Invisible par l'utilisateur, stocké en local via AsyncStorage.
 * Clé : @papilles_analytics_v1
 *
 * Politique de rétention : 90 jours glissants (nettoyage automatique à chaque écriture).
 * Limite : 5 000 événements max (les plus anciens sont purgés en premier si dépassement).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppEvent, AppEventType, NewAppEvent } from '../types/analytics';

const ANALYTICS_KEY = '@papilles_analytics_v1';
const MAX_EVENTS = 5000;
const RETENTION_DAYS = 90;

// Cache mémoire pour éviter des lectures AsyncStorage répétées
let memCache: AppEvent[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function pruneOldEvents(events: AppEvent[]): AppEvent[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString();

  const recent = events.filter((e) => e.timestamp >= cutoffStr);

  // Limite stricte : on ne garde que les MAX_EVENTS les plus récents
  if (recent.length > MAX_EVENTS) {
    return recent.slice(recent.length - MAX_EVENTS);
  }
  return recent;
}

async function loadEvents(): Promise<AppEvent[]> {
  if (memCache !== null) return memCache;
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_KEY);
    if (!raw) {
      memCache = [];
      return memCache;
    }
    const parsed = JSON.parse(raw);
    memCache = Array.isArray(parsed) ? parsed : [];
    return memCache;
  } catch {
    memCache = [];
    return memCache;
  }
}

async function persistEvents(events: AppEvent[]): Promise<void> {
  try {
    memCache = events;
    await AsyncStorage.setItem(ANALYTICS_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('[Analytics] Erreur écriture AsyncStorage:', err);
  }
}

export const AnalyticsService = {
  /**
   * Enregistre un événement dans le log interne.
   * Fire-and-forget : ne bloque jamais le flux UI.
   */
  async track(eventData: NewAppEvent): Promise<void> {
    const write = writeQueue.then(async () => {
      const event: AppEvent = {
        ...eventData,
        id: generateId(),
        timestamp: isoNow(),
      };

      const events = await loadEvents();
      const pruned = pruneOldEvents([...events, event]);
      await persistEvents(pruned);
    });
    writeQueue = write.catch((err) => {
      console.warn('[Analytics] track() échoué:', err);
    });
    await writeQueue;
  },

  /**
   * Récupère tous les événements enregistrés (du plus ancien au plus récent).
   */
  async getAll(): Promise<AppEvent[]> {
    return loadEvents();
  },

  /**
   * Récupère les événements filtrés par type.
   */
  async getByType(type: AppEventType): Promise<AppEvent[]> {
    const all = await loadEvents();
    return all.filter((e) => e.type === type);
  },

  /**
   * Récupère les événements dans une plage de dates.
   */
  async getByDateRange(from: Date, to: Date): Promise<AppEvent[]> {
    const all = await loadEvents();
    const fromStr = from.toISOString();
    const toStr = to.toISOString();
    return all.filter((e) => e.timestamp >= fromStr && e.timestamp <= toStr);
  },

  /**
   * Nombre total d'événements enregistrés.
   */
  async count(): Promise<number> {
    const all = await loadEvents();
    return all.length;
  },

  /**
   * Vide tous les logs (usage dev/test uniquement).
   */
  async clear(): Promise<void> {
    memCache = [];
    await AsyncStorage.removeItem(ANALYTICS_KEY);
  },

  /**
   * Invalide le cache mémoire (à appeler si le stockage est modifié en dehors du service).
   */
  invalidateCache(): void {
    memCache = null;
  },
};
