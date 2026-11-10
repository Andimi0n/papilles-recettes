import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface AudioModeNative {
  getRingerMode: () => number;
  isNormalSoundMode: () => boolean;
}

const AudioMode = requireOptionalNativeModule<AudioModeNative>('AudioMode');

/**
 * Détermine si le téléphone Android est en mode son normal (ie ni silencieux, ni vibreur).
 * - Sur iOS ou autre plateforme : renvoie true.
 * - Sur Android : renvoie true si AudioManager.ringerMode == RINGER_MODE_NORMAL (2).
 *   Renvoie false si RINGER_MODE_SILENT (0) ou RINGER_MODE_VIBRATE (1).
 */
export function isAndroidSoundMode(): boolean {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (!AudioMode) {
    return true;
  }
  try {
    return AudioMode.isNormalSoundMode();
  } catch (err) {
    console.warn('[AudioMode] Impossible de lire le mode son Android:', err);
    return true;
  }
}
