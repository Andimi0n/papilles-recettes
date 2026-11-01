/**
 * ImageStorageService — Gestion de la persistance permanente des photos de recettes
 *
 * Déplace/copie les photos sélectionnées ou prises (qui résident initialement dans
 * le cache temporaire de l'OS) vers le répertoire de documents sécurisé et permanent
 * de l'application (documentDirectory/recipe_photos/).
 *
 * Immunise l'application contre les nettoyages de cache de l'OS ou de l'utilisateur.
 */

// ─── Chargement sécurisé d'expo-file-system/legacy ───────────────────────────
declare const require: any;

let _fsModule: typeof import('expo-file-system/legacy') | null = null;
let _fsChecked = false;

function getFileSystem(): typeof import('expo-file-system/legacy') | null {
  if (_fsChecked) return _fsModule;
  _fsChecked = true;
  try {
    const mod = require('expo-file-system/legacy');
    if (mod && mod.documentDirectory) {
      _fsModule = mod;
    } else {
      _fsModule = null;
    }
  } catch {
    _fsModule = null;
  }
  return _fsModule;
}

const RECIPE_PHOTOS_DIR_NAME = 'recipe_photos/';

export const ImageStorageService = {
  /**
   * Retourne le chemin complet du dossier persistant des photos.
   */
  getPhotosDirectory(): string | null {
    const fs = getFileSystem();
    if (!fs?.documentDirectory) return null;
    return `${fs.documentDirectory}${RECIPE_PHOTOS_DIR_NAME}`;
  },

  /**
   * Assure que le répertoire permanent existe.
   */
  async ensureDirectoryExists(): Promise<boolean> {
    const fs = getFileSystem();
    const dir = this.getPhotosDirectory();
    if (!fs || !dir) return false;

    try {
      const info = await fs.getInfoAsync(dir);
      if (!info.exists) {
        await fs.makeDirectoryAsync(dir, { intermediates: true });
      }
      return true;
    } catch (e) {
      console.warn('[ImageStorage] Erreur création répertoire permanent:', e);
      return false;
    }
  },

  /**
   * Vérifie si une URI est déjà stockée de manière permanente dans notre dossier dédié.
   */
  isPermanent(uri: string | null | undefined): boolean {
    if (!uri || typeof uri !== 'string') return false;
    return uri.includes(RECIPE_PHOTOS_DIR_NAME);
  },

  /**
   * Copie une image locale (ex: issue de la galerie ou de l'appareil photo dans le cache)
   * vers le dossier persistant permanent de l'application.
   *
   * - Si l'image est distante (http://, https://) ou inline (data:), elle est retournée telle quelle.
   * - Si l'image est déjà dans le dossier permanent, elle est retournée telle quelle.
   * - Si l'image est un fichier local (file://), elle est copiée vers documentDirectory/recipe_photos/
   *   avec un nom unique indélébile.
   */
  async persistImageLocally(sourceUri: string | null | undefined): Promise<string> {
    if (!sourceUri || typeof sourceUri !== 'string') return '';
    const trimmed = sourceUri.trim();
    if (!trimmed) return '';

    // Les images web ou inline restent intactes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('data:image/')
    ) {
      return trimmed;
    }

    // Déjà stockée dans notre dossier persistant
    if (this.isPermanent(trimmed)) {
      return trimmed;
    }

    // Si environnement sans FileSystem (tests Node, web...), retourner la source
    const fs = getFileSystem();
    const targetDir = this.getPhotosDirectory();
    if (!fs || !targetDir) {
      return trimmed;
    }

    try {
      const dirReady = await this.ensureDirectoryExists();
      if (!dirReady) return trimmed;

      // Détecter l'extension
      const cleanUri = trimmed.split('?')[0].split('#')[0];
      const dotIdx = cleanUri.lastIndexOf('.');
      let ext = '.jpg';
      if (dotIdx !== -1) {
        const candidateExt = cleanUri.substring(dotIdx).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'].includes(candidateExt)) {
          ext = candidateExt;
        }
      }

      // Nom de fichier unique avec timestamp et sel aléatoire
      const fileName = `rec_photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      const destinationUri = `${targetDir}${fileName}`;

      await fs.copyAsync({
        from: trimmed,
        to: destinationUri,
      });

      return destinationUri;
    } catch (err) {
      console.warn('[ImageStorage] Échec copie permanente, fallback sur URI source:', err);
      return trimmed;
    }
  },

  /**
   * Sauvegarde directement un flux d'octets d'image (ex: extrait d'une archive ZIP)
   * dans le stockage permanent des photos avec URI propre file:///... (ou data URI en fallback).
   */
  async savePhotoBytesLocally(bytes: Uint8Array, originalFileName?: string): Promise<string> {
    if (!bytes || bytes.length === 0) return '';

    // Détecter l'extension
    let ext = '.jpg';
    if (originalFileName) {
      const clean = originalFileName.split('?')[0].split('#')[0];
      const dotIdx = clean.lastIndexOf('.');
      if (dotIdx !== -1) {
        const candidateExt = clean.substring(dotIdx).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'].includes(candidateExt)) {
          ext = candidateExt;
        }
      }
    }

    const uint8ArrayToBase64 = (arr: Uint8Array): string => {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(arr).toString('base64');
      }
      let binary = '';
      const len = arr.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(arr[i]);
      }
      return typeof btoa !== 'undefined' ? btoa(binary) : '';
    };

    const fs = getFileSystem();
    const targetDir = this.getPhotosDirectory();

    if (fs && targetDir) {
      try {
        const dirReady = await this.ensureDirectoryExists();
        if (dirReady) {
          const fileName = `rec_photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
          const destinationUri = `${targetDir}${fileName}`;
          const base64Data = uint8ArrayToBase64(bytes);

          await fs.writeAsStringAsync(destinationUri, base64Data, {
            encoding: fs.EncodingType.Base64,
          });

          return destinationUri;
        }
      } catch (err) {
        console.warn('[ImageStorage] Échec écriture photo depuis bytes, fallback data URI:', err);
      }
    }

    // Fallback Web ou environnement sans FileSystem (Node test)
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const base64 = uint8ArrayToBase64(bytes);
    return `data:${mime};base64,${base64}`;
  },

  /**
   * Supprime une photo persistée du disque local si et seulement si
   * elle réside dans notre dossier dédié (évite d'effacer les photos de la galerie de l'utilisateur).
   */
  async cleanupRecipePhoto(imageUri: string | null | undefined): Promise<void> {
    if (!imageUri || typeof imageUri !== 'string') return;
    if (!this.isPermanent(imageUri)) return;

    const fs = getFileSystem();
    if (!fs) return;

    try {
      await fs.deleteAsync(imageUri, { idempotent: true });
    } catch (err) {
      // Nettoyage en arrière-plan non bloquant
      console.warn('[ImageStorage] Échec suppression photo locale:', err);
    }
  },
};
