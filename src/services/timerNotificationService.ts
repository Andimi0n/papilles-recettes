import { Platform } from 'react-native';
import { ActiveCookingTimer } from '../types/timer';

export const COOKING_TIMER_CHANNEL_ID = 'cooking_timers';

// Module chargé paresseusement pour immuniser l'environnement Node/CLI de test
let _notificationsModule: typeof import('expo-notifications') | null = null;
let _isInitialized = false;

export function getNotificationsModule(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web') return null;
  if (_notificationsModule) return _notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _notificationsModule = require('expo-notifications');
    return _notificationsModule;
  } catch {
    return null;
  }
}

/**
 * Génère un identifiant déterministe pour une notification de minuteur
 */
export function getTimerNotificationIdentifier(timerId: string): string {
  return `cooking_timer_${timerId}`;
}

/**
 * Permet d'injecter un mock dans les tests Node.js
 */
export function setNotificationsModuleForTesting(mock: typeof import('expo-notifications') | null): void {
  _notificationsModule = mock;
  _isInitialized = false;
}

/**
 * Configure le gestionnaire d'affichage en avant-plan et le canal de notification Android
 */
export async function initTimerNotifications(): Promise<void> {
  if (Platform.OS === 'web' || _isInitialized) return;

  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    // Affiche l'alerte et joue le son même si l'application est au premier plan
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Canal Android haute priorité avec son et vibration d'alerte de cuisine
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync(COOKING_TIMER_CHANNEL_ID, {
        name: 'Minuteurs de cuisson',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#1B3D2C',
        sound: 'default',
        enableVibrate: true,
        bypassDnd: false,
        showBadge: false,
      });
    }

    _isInitialized = true;
  } catch (error) {
    console.warn('[TimerNotificationService] Erreur lors de l\'initialisation des notifications:', error);
  }
}

/**
 * Vérifie et demande la permission de notifications locales (Android 13+ / iOS)
 */
export async function requestTimerNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }

    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
      },
    });

    return request.granted;
  } catch {
    return false;
  }
}

/**
 * Programme une notification système locale pour avertir de la fin du minuteur
 */
export async function scheduleTimerNotification(options: {
  timerId?: string;
  label: string;
  stepIndex?: number;
  seconds: number;
}): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    await initTimerNotifications();
    const hasPermission = await requestTimerNotificationPermission();
    if (!hasPermission) return null;

    const targetSeconds = Math.max(1, Math.round(options.seconds));
    const stepLabel = typeof options.stepIndex === 'number' ? ` (Étape ${options.stepIndex + 1})` : '';
    const identifier = options.timerId
      ? (options.timerId.startsWith('cooking_timer_') ? options.timerId : getTimerNotificationIdentifier(options.timerId))
      : undefined;

    const notificationId = await Notifications.scheduleNotificationAsync({
      ...(identifier ? { identifier } : {}),
      content: {
        title: '⏲️ Minuteur de cuisine écoulé !',
        body: `« ${options.label} »${stepLabel} est prêt !`,
        sound: 'default',
        vibrate: [0, 500, 250, 500, 250, 500],
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: targetSeconds,
        repeats: false,
        channelId: COOKING_TIMER_CHANNEL_ID,
      },
    });

    return notificationId;
  } catch (error) {
    console.warn('[TimerNotificationService] Erreur lors de la programmation de la notification:', error);
    return null;
  }
}

/**
 * Annule une notification programmée (par ID de notification ou ID de minuteur)
 */
export async function cancelTimerNotification(notificationIdOrTimerId?: string | null): Promise<void> {
  if (!notificationIdOrTimerId || Platform.OS === 'web') return;

  const Notifications = getNotificationsModule();
  if (!Notifications || typeof Notifications.cancelScheduledNotificationAsync !== 'function') return;

  try {
    const identifier =
      notificationIdOrTimerId.startsWith('cooking_timer_') || notificationIdOrTimerId.startsWith('notif_')
        ? notificationIdOrTimerId
        : getTimerNotificationIdentifier(notificationIdOrTimerId);
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn('[TimerNotificationService] Erreur lors de l\'annulation de la notification:', error);
  }
}

/**
 * Calcule l'horodatage cible (en ms) à partir de secondes restantes
 */
export function calculateTargetTimestamp(seconds: number): number {
  return Date.now() + Math.max(0, seconds) * 1000;
}

/**
 * Calcule le nombre de secondes restantes précises à partir du timestamp cible
 */
export function calculateRemainingSeconds(targetTimestamp?: number, fallbackRemaining: number = 0): number {
  if (typeof targetTimestamp === 'number' && Number.isFinite(targetTimestamp)) {
    return Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
  }
  return Math.max(0, fallbackRemaining);
}

/**
 * Met à jour un minuteur lors du passage en avant-plan (AppState) ou tick d'intervalle
 */
export function syncTimerTick<T extends ActiveCookingTimer>(timer: T): {
  timer: T;
  hasFinished: boolean;
} {
  if (!timer.isRunning) {
    return { timer, hasFinished: false };
  }

  const remaining = calculateRemainingSeconds(timer.targetTimestamp, timer.remainingSeconds);

  if (remaining <= 0) {
    return {
      timer: {
        ...timer,
        remainingSeconds: 0,
        isRunning: false,
        targetTimestamp: undefined,
        notificationId: undefined,
      },
      hasFinished: true,
    };
  }

  return {
    timer: {
      ...timer,
      remainingSeconds: remaining,
    },
    hasFinished: false,
  };
}
