import { Recipe, Category } from '../types/recipe';
import { RecipeAiService, isRecipeVegetarian } from './recipeAiService';
import { generateUniqueId } from '../utils/helpers';
import { normalizeIngredient } from '../utils/ingredientNormalizer';

export interface MarmitonSearchResult {
  title: string;
  url: string;
}

/**
 * Valide strictement qu'une URL provient du site officiel Marmiton en HTTPS (protection SSRF - VULN-03).
 */
export function validateMarmitonUrl(inputUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    throw new Error("L'URL fournie est invalide.");
  }

  // 1. Forcer strictement le protocole HTTPS
  if (parsed.protocol !== 'https:') {
    throw new Error('Seul le protocole sécurisé HTTPS est autorisé.');
  }

  // 2. Liste blanche stricte de noms d'hôte
  const hostname = parsed.hostname.toLowerCase();
  const allowedHosts = ['www.marmiton.org', 'marmiton.org'];
  if (!allowedHosts.includes(hostname)) {
    throw new Error(
      "L'URL doit obligatoirement provenir du domaine officiel Marmiton (ex: https://www.marmiton.org/recettes/recette_...)"
    );
  }

  // 3. Rejeter les identifiants utilisateur embarqués
  if (parsed.username || parsed.password) {
    throw new Error("Les identifiants dans l'URL ne sont pas autorisés.");
  }

  // 4. Forcer le port standard HTTPS uniquement (SEC-04)
  if (parsed.port && parsed.port !== '443') {
    throw new Error('Seul le port HTTPS standard (443) est autorisé.');
  }

  // 5. Vérifier que le chemin pointe vers une fiche recette
  if (!parsed.pathname.startsWith('/recettes/recette_')) {
    throw new Error("L'URL doit pointer vers une fiche recette Marmiton (/recettes/recette_...).");
  }

  return parsed;
}

/**
 * Exécute une requête fetch avec délai d'attente maximal et interdiction des redirections non contrôlées (SEC-04).
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: 'error', // Interdit le suivi automatique de redirections vers des tiers ou des hôtes internes (anti-SSRF)
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('timeout')) {
      throw new Error(`Délai d'attente dépassé (${Math.round(timeoutMs / 1000)}s) pour joindre le serveur.`);
    }
    throw err;
  }
}


/**
 * Convertit une durée ISO 8601 (ex: "PT1H30M") en minutes.
 */
function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 60 + minutes + Math.round(seconds / 60);
}

/**
 * Nettoie les balises HTML et décode les entités HTML courantes (ex: &amp;, &#039;, &eacute;).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&icirc;/g, 'î')
    .replace(/&iuml;/g, 'ï')
    .replace(/&ucirc;/g, 'û')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    })
    .trim();
}

/**
 * Détermine la catégorie d'une recette Marmiton (JSON-LD ou titre)
 */
export function normalizeMarmitonCategory(categoryStr?: string, title?: string): Category {
  const text = `${categoryStr || ''} ${title || ''}`.toLowerCase();

  if (
    /dessert|g[aâ]teau|tarte sucr[eé]e|tartelette|tarte tatin|tarte aux (?:pommes?|poires?|fraises?|framboises?|citrons?|abricots?)|biscuit|cr[eê]pe|gaufre|mousse|flan|confiserie|brioche|p[aâ]tisserie|chocolat|muffin|fondant|crumble|clafoutis|pain perdu|glace|sorbet|brownie|financier|macaron|madeleine|cookie|cr[eè]me br[uû]l[eé]e|tiramisu|charlotte|cake sucr[eé]/i.test(
      text
    )
  ) {
    return 'Dessert';
  }
  if (
    /entr[eé]e|salade|soupe|velout[eé]|potage|quiche|tourte|tarte sal[eé]e|carpaccio|terrine|verrine/i.test(
      text
    )
  ) {
    return 'Entrée';
  }
  if (/ap[eé]ritif|amuse-bouche|tapas|cocktail d[iî]natoire|canap[eé]|dips?/i.test(text)) {
    return 'Apéritif';
  }
  if (/boisson|cocktail|smoothie|jus|milkshake|th[eé]|infusion|sirop/i.test(text)) {
    return 'Boisson';
  }
  if (/petit-d[eé]jeuner|brunch|pancake|granola/i.test(text)) {
    return 'Petit-déjeuner';
  }

  return 'Plat';
}

/**
 * Extrait et aplatit les étapes d'instructions depuis un JSON-LD Recipe Schema.org.
 * Gère les chaînes simples, les HowToStep et les HowToSection imbriqués.
 */
export function extractInstructions(rawInstructions: any): string[] {
  if (!rawInstructions) return [];
  const list = Array.isArray(rawInstructions) ? rawInstructions : [rawInstructions];
  const results: string[] = [];

  for (const item of list) {
    if (!item) continue;
    if (typeof item === 'string') {
      const cleaned = decodeHtmlEntities(item);
      if (cleaned) results.push(cleaned);
    } else if (Array.isArray(item.itemListElement)) {
      // Cas HowToSection avec sous-étapes imbriquées
      const subSteps = extractInstructions(item.itemListElement);
      results.push(...subSteps);
    } else if (typeof item.text === 'string') {
      const cleaned = decodeHtmlEntities(item.text);
      if (cleaned) results.push(cleaned);
    } else if (typeof item.name === 'string') {
      const cleaned = decodeHtmlEntities(item.name);
      if (cleaned) results.push(cleaned);
    }
  }

  return results;
}

export const MarmitonService = {
  /**
   * Recherche des recettes sur Marmiton et extrait la liste des liens et titres
   */
  async searchRecipes(query: string): Promise<MarmitonSearchResult[]> {
    if (!query || !query.trim()) return [];

    const searchUrl = `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(
      query.trim()
    )}`;

    try {
      const response = await fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }, 12000);

      if (!response.ok) {
        throw new Error(`Marmiton a répondu avec le statut ${response.status}`);
      }

      const html = await response.text();

      // Extraction des liens de recettes /recettes/recette_...
      const linkRegex = /<a[^>]+href=["'](\/recettes\/recette_[^"']+)["'][^>]*>(.*?)<\/a>/gi;
      const results: MarmitonSearchResult[] = [];
      const seenUrls = new Set<string>();

      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const path = match[1];
        const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();

        const fullUrl = `https://www.marmiton.org${path}`;

        if (!seenUrls.has(fullUrl) && rawTitle.length > 3) {
          const lower = rawTitle.toLowerCase();
          if (!lower.startsWith('voir la recette') && !lower.startsWith('découvrir')) {
            seenUrls.add(fullUrl);
            results.push({
              title: rawTitle.replace(/&amp;/g, '&').replace(/&#039;/g, "'"),
              url: fullUrl,
            });
          }
        }

        if (results.length >= 15) break;
      }

      return results;
    } catch (err: any) {
      console.error('Erreur recherche Marmiton:', err);
      throw new Error(
        `Impossible de chercher sur Marmiton (${err?.message || 'Vérifiez votre connexion'})`
      );
    }
  },

  /**
   * Récupère le code HTML d'une page Marmiton validée, extrait le contenu de la recette,
   * le fait structurer par l'IA Gemini 3.8 Flash, et retourne l'objet Recipe.
   */
  async importRecipeFromUrl(url: string, apiKey?: string): Promise<Recipe> {
    // 1. Validation stricte de sécurité anti-SSRF (VULN-03 corrigé)
    const validUrl = validateMarmitonUrl(url);

    // 2. Récupération sécurisée du HTML avec timeout
    let html = '';
    try {
      const response = await fetchWithTimeout(validUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }, 15000);

      if (!response.ok) {
        throw new Error(`La page Marmiton n'a pas pu être chargée (${response.status})`);
      }

      html = await response.text();
    } catch (err: any) {
      throw new Error(`Erreur lors du téléchargement de la page : ${err.message}`);
    }

    // 3. Extraction du schéma de données Recipe (JSON-LD) si présent dans la page
    let payloadText = '';
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    let jsonLdRecipe: any = null;

    while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
      const jsonContent = ldMatch[1].trim();
      try {
        const parsed = JSON.parse(jsonContent);
        const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
        for (const item of graph) {
          if (item && (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe'))) {
            payloadText = JSON.stringify(item);
            jsonLdRecipe = item;
            break;
          }
        }
      } catch {}
      if (payloadText) break;
    }

    // 5. Extraction automatique de toutes les photos candidates de Marmiton
    const availableImages = MarmitonService.extractMarmitonImages(html);
    const coverImage = availableImages.length > 0 ? availableImages[0] : '';
    const now = new Date().toISOString();
    const recipeId = generateUniqueId('rec_marmiton');

    // Tenter de parser directement le JSON-LD pour éviter un appel IA
    if (jsonLdRecipe && (jsonLdRecipe.name || jsonLdRecipe.recipeIngredient)) {
      try {
        const rawTitle = jsonLdRecipe.name ? String(jsonLdRecipe.name).trim() : 'Recette Marmiton';
        const title = decodeHtmlEntities(rawTitle) || 'Recette Marmiton';
        const rawDescription = jsonLdRecipe.description ? String(jsonLdRecipe.description).trim() : '';
        const description = decodeHtmlEntities(rawDescription);

        let servings = 4;
        if (jsonLdRecipe.recipeYield) {
          const yieldMatch = String(jsonLdRecipe.recipeYield).match(/\d+/);
          if (yieldMatch) {
            servings = parseInt(yieldMatch[0], 10);
          }
        }

        const prepTimeMinutes = parseIsoDuration(jsonLdRecipe.prepTime || '');
        const cookTimeMinutes = parseIsoDuration(jsonLdRecipe.cookTime || '');

        const rawIngredients = Array.isArray(jsonLdRecipe.recipeIngredient)
          ? jsonLdRecipe.recipeIngredient
          : (jsonLdRecipe.recipeIngredient ? [jsonLdRecipe.recipeIngredient] : []);

        const ingredients = rawIngredients.map((ingStr: string, idx: number) => {
          const cleanIngStr = decodeHtmlEntities(String(ingStr));
          const norm = normalizeIngredient({
            name: cleanIngStr,
            quantity: '',
            unit: '',
          });
          return {
            id: generateUniqueId(`ing_marm_${idx + 1}`),
            name: norm.name || cleanIngStr.trim(),
            canonicalId: norm.canonicalId,
            quantity: norm.quantity || '',
            unit: norm.unit || '',
            isPantryStaple: norm.isPantryStaple,
            isOptional: norm.isOptional,
          };
        });

        const instructionTexts = extractInstructions(jsonLdRecipe.recipeInstructions);
        const steps = instructionTexts.map((instruction, idx) => ({
          id: generateUniqueId(`stp_marm_${idx + 1}`),
          order: idx + 1,
          instruction,
        }));

        const rawCategory = typeof jsonLdRecipe.recipeCategory === 'string'
          ? jsonLdRecipe.recipeCategory
          : (Array.isArray(jsonLdRecipe.recipeCategory) ? jsonLdRecipe.recipeCategory.join(' ') : '');
        const category = normalizeMarmitonCategory(rawCategory, title);

        const isVegetarian = isRecipeVegetarian(ingredients, title, description);

        const recipe: Recipe = {
          id: recipeId,
          title,
          description,
          category,
          difficulty: 'Facile',
          prepTimeMinutes: prepTimeMinutes || 15,
          cookTimeMinutes: cookTimeMinutes || 0,
          servings: servings || 4,
          rating: 0,
          imageUrl: coverImage,
          availableImages,
          isFavorite: false,
          isVegetarian,
          userNote: '',
          createdAt: now,
          updatedAt: now,
          ingredients,
          steps,
        };

        return recipe;
      } catch (e) {
        console.error("Erreur lors du parsing direct du JSON-LD, fallback sur l'IA", e);
      }
    }

    // 4. Si aucun JSON-LD n'est trouvé, nettoyage linéaire sûr sans ReDoS (VULN-07 corrigé)
    if (!payloadText) {
      const strippedHtml = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      payloadText = strippedHtml.slice(0, 12000);
    }

    // 6. Appel de l'IA Gemini 3.8 Flash pour structurer la recette (Fallback)
    const extracted = await RecipeAiService.extractRecipeFromText(payloadText, apiKey);

    // 7. Construction de l'objet Recipe officiel avec identifiants uniques sûrs (VULN-10 corrigé)
    const recipe: Recipe = {
      id: recipeId,
      title: extracted.title || 'Recette Marmiton',
      description: extracted.description || '',
      category: extracted.category || 'Plat',
      difficulty: extracted.difficulty || 'Facile',
      prepTimeMinutes: extracted.prepTimeMinutes || 15,
      cookTimeMinutes: extracted.cookTimeMinutes || 0,
      servings: extracted.servings || 4,
      rating: 0, // Par défaut : 0 étoile
      imageUrl: coverImage, // Première photo Marmiton par défaut
      availableImages, // Liste complète des photos détectées
      isFavorite: false,
      isVegetarian: extracted.isVegetarian ?? false,
      userNote: extracted.userNote ? extracted.userNote.trim() : '',
      createdAt: now,
      updatedAt: now,
      ingredients: (extracted.ingredients || []).map((ing, idx) => {
        const norm = normalizeIngredient({
          name: ing.name ? ing.name.trim() : '',
          quantity: ing.quantity || '',
          unit: ing.unit || '',
        });
        return {
          id: generateUniqueId(`ing_marm_${idx + 1}`),
          name: norm.name || ing.name.trim(),
          canonicalId: norm.canonicalId,
          quantity: norm.quantity || '',
          unit: norm.unit || '',
          isPantryStaple: norm.isPantryStaple,
          isOptional: norm.isOptional,
        };
      }),
      steps: (extracted.steps || []).map((st, idx) => ({
        id: generateUniqueId(`stp_marm_${idx + 1}`),
        order: st.order || idx + 1,
        instruction: st.instruction.trim(),
      })),
    };

    return recipe;
  },

  /**
   * Détecte et extrait toutes les images haute résolution d'une page Marmiton
   */
  extractMarmitonImages(html: string): string[] {
    const images: string[] = [];
    const seenIds = new Set<string>();

    // 1. Image principale OpenGraph
    const ogMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) {
      const ogUrl = ogMatch[1].trim();
      const m = ogUrl.match(/\/recipe\/(\d+)\/(\d+)_/);
      if (m) {
        const [, date, imgId] = m;
        images.push(`https://assets.afcdn.com/recipe/${date}/${imgId}_w1024h768c1.jpg`);
        seenIds.add(imgId);
      } else if (ogUrl.startsWith('https://')) {
        images.push(ogUrl);
      }
    }

    // 2. Balises images de la galerie de photos de la recette
    const imgTagRegex = /<img[^>]+class=["'][^"']*recipe-main-photo[^"']*["'][^>]*>/gi;
    let tagMatch;
    while ((tagMatch = imgTagRegex.exec(html)) !== null) {
      const tag = tagMatch[0];
      const srcMatch = tag.match(/(?:src|data-src)=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const src = srcMatch[1];
        const m = src.match(/\/recipe\/(\d+)\/(\d+)_/);
        if (m) {
          const [, date, imgId] = m;
          if (!seenIds.has(imgId)) {
            images.push(`https://assets.afcdn.com/recipe/${date}/${imgId}_w1024h768c1.jpg`);
            seenIds.add(imgId);
          }
        }
      }
    }

    // 3. Schéma JSON-LD Recipe
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(ldMatch[1].trim());
        const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
        for (const item of graph) {
          if (item && (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe'))) {
            const rawImg = item.image;
            const imgList = Array.isArray(rawImg) ? rawImg : rawImg ? [rawImg] : [];
            for (const u of imgList) {
              const urlStr = typeof u === 'string' ? u : u?.url;
              if (urlStr) {
                const m = urlStr.match(/\/recipe\/(\d+)\/(\d+)_/);
                if (m) {
                  const [, date, imgId] = m;
                  if (!seenIds.has(imgId)) {
                    images.push(`https://assets.afcdn.com/recipe/${date}/${imgId}_w1024h768c1.jpg`);
                    seenIds.add(imgId);
                  }
                } else if (urlStr.startsWith('https://')) {
                  images.push(urlStr);
                }
              }
            }
          }
        }
      } catch {}
    }

    return images;
  },
};
