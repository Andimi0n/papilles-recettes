import { Share } from 'react-native';
import LZString from 'lz-string';
import { toQR } from 'toqr';
import { Recipe, Ingredient } from '../types/recipe';
import { generateUniqueId } from '../utils/helpers';
import { sanitizeStoredRecipe } from './storageService';
import { normalizeIngredient } from '../utils/ingredientNormalizer';

/**
 * Schéma compact pour optimiser la taille dans les URLs et QR codes.
 */
interface PackedRecipe {
  t: string;               // title
  d?: string;              // description
  c?: string;              // category
  dif?: string;            // difficulty
  pt?: number;             // prepTimeMinutes
  ct?: number;             // cookTimeMinutes
  s?: number;              // servings
  r?: number;              // rating
  n?: string;              // userNote
  img?: string;            // imageUrl (web seulement)
  veg?: number;            // isVegetarian (0 ou 1)
  tg?: string[];           // tags
  i: [
    string,                // name
    string?,               // quantity
    string?,               // unit
    string?,               // canonicalId
    number?,               // isPantryStaple (0 ou 1)
    number?                // isOptional (0 ou 1)
  ][];
  st: string[];            // steps instruction strings
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode un Uint8Array en base64 de façon 100 % pure JS (zéro dépendance native / node).
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      B64_CHARS[(n >> 18) & 63] +
      B64_CHARS[(n >> 12) & 63] +
      B64_CHARS[(n >> 6) & 63] +
      B64_CHARS[n & 63];
  }
  if (i < len) {
    const n = (bytes[i] << 16) | ((i + 1 < len ? bytes[i + 1] : 0) << 8);
    result += B64_CHARS[(n >> 18) & 63] + B64_CHARS[(n >> 12) & 63];
    if (i + 1 < len) {
      result += B64_CHARS[(n >> 6) & 63] + '=';
    } else {
      result += '==';
    }
  }
  return result;
}

/**
 * Génère une image BMP monochrome 1-bit en data URI à partir d'une matrice QR booléenne.
 * Extrêmement compact (quelques Ko) et rendu instantané par le composant Image React Native.
 */
function qrMatrixToBmpDataUri(
  modules: Uint8Array,
  size: number,
  scale = 4,
  margin = 4
): string {
  const fullSize = size + margin * 2;
  const imgWidth = fullSize * scale;
  const imgHeight = fullSize * scale;

  // Lignes alignées sur 4 octets (32 bits) pour le format BMP monochrome
  const rowBytes = Math.ceil(imgWidth / 32) * 4;
  const imageSize = rowBytes * imgHeight;
  const fileSize = 14 + 40 + 8 + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // BITMAPFILEHEADER (14 octets)
  bytes[0] = 0x42; // 'B'
  bytes[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 62, true); // Offset vers le tableau de pixels (14 + 40 + 8)

  // BITMAPINFOHEADER (40 octets)
  view.setUint32(14, 40, true);
  view.setInt32(18, imgWidth, true);
  view.setInt32(22, imgHeight, true); // positif = bas vers le haut
  view.setUint16(26, 1, true); // plans
  view.setUint16(28, 1, true); // 1 bit par pixel
  view.setUint32(30, 0, true); // BI_RGB sans compression
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true); // ~72 DPI
  view.setInt32(42, 2835, true);
  view.setUint32(46, 2, true); // 2 couleurs
  view.setUint32(50, 2, true);

  // Palette 2 couleurs : Index 0 = Noir (#000000), Index 1 = Blanc (#FFFFFF)
  bytes[54] = 0; bytes[55] = 0; bytes[56] = 0; bytes[57] = 0;
  bytes[58] = 255; bytes[59] = 255; bytes[60] = 255; bytes[61] = 0;

  const pixelOffset = 62;
  // Initialise l'image en blanc (bits à 1)
  bytes.fill(0xff, pixelOffset, fileSize);

  // Remplissage des modules noirs (bits à 0) de bas en haut
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isBlack = modules[r * size + c] === 1;
      if (isBlack) {
        const qrY = margin + r;
        const qrX = margin + c;
        for (let dy = 0; dy < scale; dy++) {
          const pixelY = imgHeight - 1 - (qrY * scale + dy);
          const rowStart = pixelOffset + pixelY * rowBytes;
          for (let dx = 0; dx < scale; dx++) {
            const pixelX = qrX * scale + dx;
            const byteIndex = rowStart + (pixelX >> 3);
            const bitIndex = 7 - (pixelX & 7);
            bytes[byteIndex] &= ~(1 << bitIndex);
          }
        }
      }
    }
  }

  return 'data:image/bmp;base64,' + uint8ArrayToBase64(bytes);
}

export const RecipeShareService = {
  /**
   * Compacte une recette pour le transport réseau / deep link.
   */
  packRecipe(recipe: Recipe): PackedRecipe {
    return {
      t: recipe.title.trim(),
      d: recipe.description ? recipe.description.trim() : undefined,
      c: recipe.category,
      dif: recipe.difficulty,
      pt: recipe.prepTimeMinutes,
      ct: recipe.cookTimeMinutes,
      s: recipe.servings,
      r: recipe.rating,
      n: recipe.userNote ? recipe.userNote.trim() : undefined,
      img:
        recipe.imageUrl &&
        (recipe.imageUrl.startsWith('http://') || recipe.imageUrl.startsWith('https://'))
          ? recipe.imageUrl
          : undefined,
      veg: recipe.isVegetarian ? 1 : 0,
      tg: recipe.tags && recipe.tags.length > 0 ? recipe.tags : undefined,
      i: (recipe.ingredients || []).map((ing) => [
        ing.name.trim(),
        ing.quantity ? String(ing.quantity).trim() : undefined,
        ing.unit ? ing.unit.trim() : undefined,
        ing.canonicalId || undefined,
        ing.isPantryStaple ? 1 : 0,
        ing.isOptional ? 1 : 0,
      ]),
      st: (recipe.steps || []).map((s) => s.instruction.trim()),
    };
  },

  /**
   * Compresse une recette en une chaîne URL-safe.
   */
  encodeRecipe(recipe: Recipe): string {
    const packed = this.packRecipe(recipe);
    const json = JSON.stringify(packed);
    return LZString.compressToEncodedURIComponent(json);
  },

  /**
   * Construit le deep link complet Papilles.
   */
  createShareUrl(recipe: Recipe): string {
    const encoded = this.encodeRecipe(recipe);
    return `papilles://import?r=${encoded}`;
  },

  /**
   * Décode et réconcilie une recette reçue via deep link, QR code ou chaîne JSON.
   */
  decodeRecipe(input: string): Recipe | null {
    if (!input || typeof input !== 'string') return null;

    let payload = input.trim();

    // Extraction du paramètre 'r' ou 'data' si l'entrée est une URL
    if (payload.includes('?')) {
      const queryString = payload.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const rParam = params.get('r') || params.get('data');
      if (rParam) {
        payload = rParam;
      }
    } else if (payload.startsWith('papilles://')) {
      payload = payload.replace(/^papilles:\/\/[^?]*\??(r=|data=)?/, '');
    }

    let jsonString: string | null = null;

    // 1. Essai décompression LZ-String
    try {
      jsonString = LZString.decompressFromEncodedURIComponent(payload);
    } catch {
      jsonString = null;
    }

    // 2. Repli si la chaîne était directement URL-encodée ou en clair
    if (!jsonString) {
      try {
        jsonString = decodeURIComponent(payload);
      } catch {
        jsonString = payload;
      }
    }

    if (!jsonString) return null;

    try {
      const rawData = JSON.parse(jsonString);
      if (!rawData || typeof rawData !== 'object') return null;

      let partialRecipe: Partial<Recipe>;

      // Schéma compact PackedRecipe
      if ('t' in rawData && 'i' in rawData) {
        const packed = rawData as PackedRecipe;
        partialRecipe = {
          title: packed.t,
          description: packed.d || '',
          category: (packed.c as any) || 'Plat',
          difficulty: (packed.dif as any) || 'Facile',
          prepTimeMinutes: typeof packed.pt === 'number' ? packed.pt : 15,
          cookTimeMinutes: typeof packed.ct === 'number' ? packed.ct : 0,
          servings: typeof packed.s === 'number' ? packed.s : 4,
          rating: typeof packed.r === 'number' ? packed.r : 0,
          userNote: packed.n,
          imageUrl: packed.img || '',
          isVegetarian: Boolean(packed.veg),
          tags: Array.isArray(packed.tg) ? packed.tg : [],
          ingredients: (packed.i || []).map((row, idx) => {
            const name = String(row[0] || '').trim();
            // Normalisation lexicale pour réconcilier avec le lexique local du destinataire
            const norm = normalizeIngredient({
              name,
              canonicalId: row[3] || undefined,
              quantity: row[1] ? String(row[1]) : undefined,
              unit: row[2] ? String(row[2]) : undefined,
              isPantryStaple: Boolean(row[4]),
              isOptional: Boolean(row[5]),
            });
            const canonicalId = row[3] || norm.canonicalId;

            const ing: Ingredient = {
              id: generateUniqueId(`ing_${idx}`),
              name,
              quantity: row[1] ? String(row[1]) : undefined,
              unit: row[2] ? String(row[2]) : undefined,
              canonicalId,
              isPantryStaple: Boolean(row[4]),
              isOptional: Boolean(row[5]),
            };
            return ing;
          }),
          steps: (packed.st || []).map((instruction, idx) => ({
            id: generateUniqueId(`step_${idx}`),
            order: idx + 1,
            instruction: String(instruction || '').trim(),
          })),
        };
      } else {
        // Schéma Recipe standard direct
        const r = rawData as Partial<Recipe>;
        partialRecipe = {
          ...r,
          ingredients: (r.ingredients || []).map((ing, idx) => {
            const norm = normalizeIngredient(ing);
            return {
              ...ing,
              id: ing.id || generateUniqueId(`ing_${idx}`),
              canonicalId: ing.canonicalId || norm.canonicalId,
            };
          }),
          steps: (r.steps || []).map((step, idx) => ({
            id: step.id || generateUniqueId(`step_${idx}`),
            order: typeof step.order === 'number' ? step.order : idx + 1,
            instruction: step.instruction || '',
          })),
        };
      }

      // Neutralisation des URIs locales système (file://) sur les recettes reçues de l'extérieur (SEC-04)
      if (typeof partialRecipe.imageUrl === 'string' && partialRecipe.imageUrl.trim().toLowerCase().startsWith('file://')) {
        partialRecipe.imageUrl = '';
      }
      if (Array.isArray(partialRecipe.availableImages)) {
        partialRecipe.availableImages = partialRecipe.availableImages.filter(
          (img) => typeof img === 'string' && !img.trim().toLowerCase().startsWith('file://')
        );
      }

      // Toujours générer un nouvel ID unique pour ne jamais écraser une recette locale existante
      partialRecipe.id = generateUniqueId('rec_shared');

      return sanitizeStoredRecipe(partialRecipe);
    } catch (e) {
      console.warn('[RecipeShareService] Erreur lors du parsing JSON de la recette partagée:', e);
      return null;
    }
  },

  /**
   * Génère une data URI d'un QR code prêt à afficher dans un composant <Image />.
   */
  generateRecipeQrCodeBmp(recipeOrUrl: Recipe | string): string | null {
    try {
      const url =
        typeof recipeOrUrl === 'string'
          ? recipeOrUrl
          : this.createShareUrl(recipeOrUrl);

      const qr = toQR(url);
      const size = Math.round(Math.sqrt(qr.length));
      return qrMatrixToBmpDataUri(qr, size, 4, 4);
    } catch (e) {
      console.error('[RecipeShareService] Erreur génération QR code:', e);
      return null;
    }
  },

  /**
   * Ouvre la feuille de partage native du système avec le lien profond et le résumé de la recette.
   */
  async shareRecipeViaSystem(
    recipe: Recipe,
    currentServings?: number
  ): Promise<boolean> {
    try {
      const shareUrl = this.createShareUrl(recipe);
      const servings = currentServings || recipe.servings || 4;

      const ingredientLines = (recipe.ingredients || [])
        .slice(0, 15)
        .map((i) => {
          const qty = i.quantity ? `${i.quantity} ` : '';
          const unit = i.unit ? `${i.unit} ` : '';
          return `• ${qty}${unit}${i.name}`.trim();
        })
        .join('\n');

      const extraCount = (recipe.ingredients || []).length - 15;
      const extraSuffix = extraCount > 0 ? `\n... et ${extraCount} autres ingrédients` : '';

      const message = [
        `🍽️ Recette Papilles : ${recipe.title} (${servings} pers.)`,
        recipe.description ? `\n${recipe.description}` : '',
        `\n📲 Ouvre ce lien sur ton téléphone pour l'ajouter directement dans ton application Papilles :\n${shareUrl}`,
        `\nIngrédients :\n${ingredientLines}${extraSuffix}`,
      ]
        .filter(Boolean)
        .join('\n');

      await Share.share({
        title: recipe.title,
        message,
        url: shareUrl, // Pris en compte sur iOS
      });

      return true;
    } catch (e) {
      console.error('[RecipeShareService] Erreur partage natif:', e);
      return false;
    }
  },

  /**
   * Vérifie si une chaîne semble être un deep link ou un payload de partage Papilles.
   */
  isSharePayload(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    return (
      trimmed.startsWith('papilles://') ||
      trimmed.includes('papilles://import') ||
      trimmed.includes('papilles://recipe') ||
      trimmed.includes('?r=')
    );
  },
};
