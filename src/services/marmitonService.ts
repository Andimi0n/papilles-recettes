import { Recipe } from '../types/recipe';
import { RecipeAiService } from './recipeAiService';
import { generateUniqueId } from '../utils/helpers';

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

  // 4. Vérifier que le chemin pointe vers une fiche recette
  if (!parsed.pathname.startsWith('/recettes/recette_')) {
    throw new Error("L'URL doit pointer vers une fiche recette Marmiton (/recettes/recette_...).");
  }

  return parsed;
}

/**
 * Exécute une requête fetch avec délai d'attente maximal (protection contre les requêtes bloquantes - VULN-11).
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

    while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
      const jsonContent = ldMatch[1].trim();
      try {
        const parsed = JSON.parse(jsonContent);
        const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
        for (const item of graph) {
          if (item && (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe'))) {
            payloadText = JSON.stringify(item);
            break;
          }
        }
      } catch {}
      if (payloadText) break;
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

    // 5. Extraction automatique de toutes les photos candidates de Marmiton
    const availableImages = MarmitonService.extractMarmitonImages(html);
    const coverImage = availableImages.length > 0 ? availableImages[0] : '';

    // 6. Appel de l'IA Gemini 3.8 Flash pour structurer la recette
    const extracted = await RecipeAiService.extractRecipeFromText(payloadText, apiKey);

    // 7. Construction de l'objet Recipe officiel avec identifiants uniques sûrs (VULN-10 corrigé)
    const now = new Date().toISOString();
    const recipeId = generateUniqueId('rec_marmiton');

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
      ingredients: (extracted.ingredients || []).map((ing, idx) => ({
        id: generateUniqueId(`ing_marm_${idx + 1}`),
        name: ing.name.trim(),
        quantity: ing.quantity || '',
        unit: ing.unit || '',
      })),
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
      } else if (ogUrl.startsWith('http')) {
        images.push(ogUrl);
      }
    }

    // 2. Balises images de la galerie de photos de la recette
    const imgTagRegex = /<img[^>]+class=["'][^"']*recipe-main-photo[^"']*["'][^>]+>/gi;
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
