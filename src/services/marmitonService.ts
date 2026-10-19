import { Recipe } from '../types/recipe';
import { RecipeAiService } from './recipeAiService';

export interface MarmitonSearchResult {
  title: string;
  url: string;
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
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

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
          // Évite les faux positifs (comme "Voir la recette")
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
   * Récupère le code HTML d'une page Marmiton, extrait le contenu de la recette,
   * le fait structurer par l'IA Gemini 3.8 Flash, et retourne l'objet Recipe
   * avec 0 étoile et sans photo par défaut.
   */
  async importRecipeFromUrl(url: string, apiKey?: string): Promise<Recipe> {
    const cleanUrl = url.trim();

    if (!cleanUrl.includes('marmiton.org')) {
      throw new Error(
        "L'URL doit provenir du site Marmiton (ex: https://www.marmiton.org/recettes/recette_...)"
      );
    }

    // 1. Récupération du HTML
    let html = '';
    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`La page Marmiton n'a pas pu être chargée (${response.status})`);
      }

      html = await response.text();
    } catch (err: any) {
      throw new Error(`Erreur lors du téléchargement de la page : ${err.message}`);
    }

    // 2. Extraction du schéma de données Recipe (JSON-LD) si présent dans la page
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

    // Si aucun JSON-LD n'est trouvé, on extrait le texte brut de la page en enlevant les balises scripts et styles
    if (!payloadText) {
      const strippedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      payloadText = strippedHtml.slice(0, 12000);
    }

    // 3. Appel de l'IA Gemini 3.8 Flash pour structurer la recette
    const extracted = await RecipeAiService.extractRecipeFromText(payloadText, apiKey);

    // 4. Construction de l'objet Recipe officiel de Papilles
    // Contrainte demandée : 0 étoile par défaut et pas de photo requise
    const now = new Date().toISOString();
    const recipeId = `rec_marmiton_${Date.now()}`;

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
      imageUrl: '', // Pas besoin de photo
      isFavorite: false,
      isVegetarian: extracted.isVegetarian ?? false,
      userNote: extracted.userNote || `Importé depuis Marmiton (${cleanUrl})`,
      createdAt: now,
      updatedAt: now,
      ingredients: (extracted.ingredients || []).map((ing, idx) => ({
        id: `ing_marm_${recipeId}_${idx + 1}`,
        name: ing.name.trim(),
        quantity: ing.quantity || '',
        unit: ing.unit || '',
      })),
      steps: (extracted.steps || []).map((st, idx) => ({
        id: `stp_marm_${recipeId}_${idx + 1}`,
        order: st.order || idx + 1,
        instruction: st.instruction.trim(),
      })),
    };

    return recipe;
  },
};
