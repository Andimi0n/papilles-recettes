import JSZip from 'jszip';

export interface ExtractedRecipePack {
  recipes: any[];
  /** Map de nom/chemin d'image (ex: 'photos/clafoutis.jpg') vers les octets de l'image */
  images: Map<string, Uint8Array>;
}

export interface ExtractPackOptions {
  batchSize?: number;
  onBatchProcessed?: (processedCount: number, totalCount: number) => void;
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.bmp']);

function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const lastDotIndex = lower.lastIndexOf('.');
  if (lastDotIndex === -1) return false;
  const ext = lower.slice(lastDotIndex);
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
}

function sanitizeZipPath(filePath: string): string {
  // Normalisation des séparateurs
  const normalized = filePath.replace(/\\/g, '/');
  // Rejet de chemin absolu ou remontée de répertoire
  if (
    normalized.startsWith('/') ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized === '..' ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw new Error(`Fichier d'archive non sécurisé (détection de chemin interdit ou Zip Slip : "${filePath}").`);
  }
  return normalized;
}

/**
 * Service d'analyse et d'extraction de packs de recettes (JSON brut ou archive ZIP avec photos)
 */
export class RecipePackService {
  /**
   * Analyse un texte JSON brut pour extraire les recettes
   */
  static async parsePackFromJson(jsonString: string): Promise<ExtractedRecipePack> {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Le contenu JSON fourni est vide ou invalide.');
    }

    let parsed: any;
    try {
      const cleanJson = jsonString.trim().replace(/^\uFEFF/, '');
      parsed = JSON.parse(cleanJson);
    } catch (e: any) {
      throw new Error(`Format JSON invalide : ${e?.message || 'Erreur de syntaxe'}`);
    }

    const recipes: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.recipes)
      ? parsed.recipes
      : Array.isArray(parsed?.recettes)
      ? parsed.recettes
      : Array.isArray(parsed?.data)
      ? parsed.data
      : [];

    if (recipes.length === 0) {
      throw new Error('Aucune recette valide détectée dans le fichier JSON (tableau vide ou clé "recipes" absente).');
    }

    return {
      recipes,
      images: new Map<string, Uint8Array>(),
    };
  }

  /**
   * Extrait un pack complet depuis le buffer d'une archive ZIP (recettes JSON + dossier photos)
   * avec traitement séquentiel par petits lots pour préserver la mémoire (Point de vigilance 1).
   */
  static async extractPackFromZipBuffer(
    zipBuffer: ArrayBuffer | Uint8Array | Buffer,
    options?: ExtractPackOptions
  ): Promise<ExtractedRecipePack> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipBuffer);

    // 1. Validation de sécurité Zip Slip sur toutes les entrées
    const validFiles: { name: string; zipEntry: JSZip.JSZipObject }[] = [];
    loadedZip.forEach((relativePath, zipEntry) => {
      sanitizeZipPath(relativePath);
      if (!zipEntry.dir) {
        validFiles.push({ name: relativePath, zipEntry });
      }
    });

    // 2. Recherche du fichier JSON de recettes (racine ou 'recipes.json')
    let recipesEntry = validFiles.find((f) => f.name.toLowerCase() === 'recipes.json');
    if (!recipesEntry) {
      // Recherche de n'importe quel fichier .json à la racine
      recipesEntry = validFiles.find((f) => f.name.toLowerCase().endsWith('.json') && !f.name.includes('/'));
    }
    if (!recipesEntry) {
      // Recherche de n'importe quel fichier .json dans l'archive
      recipesEntry = validFiles.find((f) => f.name.toLowerCase().endsWith('.json'));
    }

    if (!recipesEntry) {
      throw new Error('Aucun fichier de recettes JSON (.json) trouvé dans l\'archive ZIP.');
    }

    const recipesJsonContent = await recipesEntry.zipEntry.async('string');
    const { recipes } = await this.parsePackFromJson(recipesJsonContent);

    // 3. Extraction séquentielle par lots des photos
    const imageFiles = validFiles.filter((f) => isImageFile(f.name));
    const imagesMap = new Map<string, Uint8Array>();

    const batchSize = Math.max(1, options?.batchSize || 4);
    const totalImages = imageFiles.length;

    for (let i = 0; i < totalImages; i += batchSize) {
      const currentBatch = imageFiles.slice(i, i + batchSize);

      for (const file of currentBatch) {
        // Extraction des octets bruts
        const bytes = await file.zipEntry.async('uint8array');

        // Stockage sous son chemin relatif canonique normalisé
        const normalizedPath = file.name.replace(/\\/g, '/');
        imagesMap.set(normalizedPath, bytes);
      }

      if (options?.onBatchProcessed) {
        options.onBatchProcessed(Math.min(i + batchSize, totalImages), totalImages);
      }

      // Laisser respirer le thread d'exécution pour permettre au Garbage Collector de passer
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return {
      recipes,
      images: imagesMap,
    };
  }

  /**
   * Recherche et récupère les octets d'une image dans la Map extraite
   * Supporte la correspondance exacte, par nom de fichier simple, ou par identifiant de recette.
   */
  static findImageBytes(
    imagesMap: Map<string, Uint8Array>,
    imageRefOrRecipeId: string
  ): { bytes: Uint8Array; fileName: string } | null {
    if (!imageRefOrRecipeId || imagesMap.size === 0) return null;

    const ref = imageRefOrRecipeId.trim().replace(/\\/g, '/');
    const baseName = ref.split('/').pop() || ref;
    const baseWithoutExt = baseName.replace(/\.[^/.]+$/, '');

    // 1. Recherche par chemin exact
    if (imagesMap.has(ref)) {
      return { bytes: imagesMap.get(ref)!, fileName: baseName };
    }

    // 2. Recherche par nom de fichier simple
    for (const [key, bytes] of imagesMap.entries()) {
      const keyBase = key.split('/').pop();
      if (keyBase && keyBase.toLowerCase() === baseName.toLowerCase()) {
        return { bytes, fileName: keyBase };
      }
    }

    // 3. Recherche par nom sans extension (ex: match entre "photos/r3.jpg" et l'id "r3")
    for (const [key, bytes] of imagesMap.entries()) {
      const keyBase = key.split('/').pop() || key;
      const keyWithoutExt = keyBase.replace(/\.[^/.]+$/, '');
      if (keyWithoutExt.toLowerCase() === baseWithoutExt.toLowerCase()) {
        return { bytes, fileName: keyBase };
      }
    }

    // 4. Recherche insensible aux accents, tirets, séparateurs et casse (ex: "clafoutis-cerises" vs "Clafoutis Cerises.jpg")
    const normalizeKey = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const targetNorm = normalizeKey(baseWithoutExt);
    if (targetNorm) {
      for (const [key, bytes] of imagesMap.entries()) {
        const keyBase = key.split('/').pop() || key;
        const keyWithoutExt = keyBase.replace(/\.[^/.]+$/, '');
        if (normalizeKey(keyWithoutExt) === targetNorm) {
          return { bytes, fileName: keyBase };
        }
      }
    }

    return null;
  }
}
