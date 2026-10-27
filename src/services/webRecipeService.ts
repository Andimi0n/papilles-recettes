import { Recipe, Category, Difficulty } from '../types/recipe';
import { RecipeAiService, isRecipeVegetarian } from './recipeAiService';
import { generateUniqueId } from '../utils/helpers';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { parseShoppingInput } from '../utils/shoppingInputParser';
import { sanitizeStoredRecipe } from './storageService';

/**
 * Valide qu'une URL web est valide, utilise le protocole HTTP ou HTTPS
 * et applique des garde-fous stricts contre les attaques SSRF (SEC-04).
 */
export function validateWebRecipeUrl(inputUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    throw new Error("L'URL fournie est invalide.");
  }

  // 1. Forcer le protocole HTTPS ou HTTP standard
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Seuls les protocoles Web (HTTPS ou HTTP) sont autorisés.');
  }

  // 2. Rejeter les identifiants utilisateur embarqués (anti-fuite & anti-SSRF)
  if (parsed.username || parsed.password) {
    throw new Error("Les identifiants dans l'URL ne sont pas autorisés.");
  }

  // 3. Forcer les ports web standards uniquement
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('Seuls les ports Web standards (80, 443) sont autorisés.');
  }

  // 4. Protection stricte anti-SSRF : interdire localhost, loopback et plages privées RFC 1918
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.example')
  ) {
    throw new Error("L'accès aux adresses locales et privées est strictement interdit.");
  }

  return parsed;
}

/**
 * Télécharge le contenu HTML d'une page Web avec un délai d'attente contrôlé
 * et des en-têtes de navigateur réalistes pour éviter les blocages 403.
 */
export async function fetchWebPage(url: string, timeoutMs = 15000): Promise<string> {
  const validUrl = validateWebRecipeUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(validUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Le site web a répondu avec le statut HTTP ${res.status}`);
    }

    return await res.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('timeout')) {
      throw new Error(`Délai d'attente dépassé (${Math.round(timeoutMs / 1000)}s) pour joindre le site.`);
    }
    throw err;
  }
}

/**
 * Nettoie les balises HTML et décode exhaustivement les entités HTML courantes,
 * numériques et hexadécimales (ex: &amp;, &#039;, &eacute;, &#8217;, &frac12;).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str || typeof str !== 'string') return '';

  const decodeOnce = (input: string): string => {
    return input
      .replace(/<[^>]+>/g, '') // Suppression des balises HTML
      .replace(/&amp;/g, '&')
      .replace(/&#039;|&apos;|&#39;/g, "'")
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
      .replace(/&oelig;/g, 'œ')
      .replace(/&deg;/g, '°')
      .replace(/&frac12;/g, '½')
      .replace(/&frac14;/g, '¼')
      .replace(/&frac34;/g, '¾')
      .replace(/&rsquo;|&lsquo;/g, "'")
      .replace(/&rdquo;|&ldquo;/g, '"')
      .replace(/&ndash;|&mdash;/g, '-')
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          const code = parseInt(dec, 10);
          return code > 0 ? String.fromCodePoint(code) : '';
        } catch {
          return '';
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          const code = parseInt(hex, 16);
          return code > 0 ? String.fromCodePoint(code) : '';
        } catch {
          return '';
        }
      })
      // Normalisation des apostrophes typographiques et guillemets pour faciliter la résolution lexicale
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
      .replace(/[\u201C\u201D\u201E\u2033]/g, '"');
  };

  let decoded = decodeOnce(str);
  // Deuxième passe si des entités doublement encodées subsistent (ex: &amp;eacute;)
  if (decoded.includes('&') && /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(decoded)) {
    decoded = decodeOnce(decoded);
  }

  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * Convertit une durée ISO 8601 (ex: "PT1H30M", "PT45M", "PT2H", "P0DT0H20M", "PT1.5H") en minutes.
 */
export function parseIsoDuration(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?/i);
  if (!match) return 0;

  const days = parseFloat(match[1] || '0');
  const hours = parseFloat(match[2] || '0');
  const minutes = parseFloat(match[3] || '0');
  const seconds = parseFloat(match[4] || '0');

  return Math.round(days * 1440 + hours * 60 + minutes + seconds / 60);
}

/**
 * Tente de parser une durée exprimée en langage naturel (ex: "1h30", "25 min", "1 heure", "45 minutes").
 */
export function parseHumanDuration(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.toLowerCase().trim();

  // Format "1h30", "1 h 30 min", "1 heure 30", "2 heures 15", "1h et 20min"
  const hMatch = clean.match(
    /(\d+)\s*(?:heures?|h)\s*(?:et\s*)?(\d+)?(?:\s*(?:m|min|minutes?))?/i
  );
  if (hMatch) {
    const hours = parseInt(hMatch[1], 10);
    const mins = parseInt(hMatch[2] || '0', 10);
    return hours * 60 + mins;
  }

  // Format "45 min" ou "45 minutes"
  const mMatch = clean.match(/(\d+)\s*(?:m|min|minutes?)/i);
  if (mMatch) {
    return parseInt(mMatch[1], 10);
  }

  // Nombre brut seul
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;

  return 0;
}

/**
 * Analyse une durée (ISO 8601 ou langage naturel).
 */
export function parseDuration(val: any): number {
  if (typeof val === 'number' && !isNaN(val) && val > 0) {
    return Math.round(val);
  }
  if (!val || typeof val !== 'string') return 0;
  const iso = parseIsoDuration(val);
  if (iso > 0) return iso;
  return parseHumanDuration(val);
}

/**
 * Extrait le nombre de portions / convives depuis recipeYield (nombre, chaîne ou tableau).
 * Gère les fourchettes ("4 à 6 personnes", "Serves 8-10") et les formulations diverses.
 */
export function extractServings(rawYield: any, defaultServings = 4): number {
  if (typeof rawYield === 'number' && !isNaN(rawYield) && rawYield > 0) {
    return Math.min(100, Math.max(1, Math.round(rawYield)));
  }

  const list = Array.isArray(rawYield) ? rawYield : [rawYield];
  for (const item of list) {
    if (!item) continue;
    const str = String(item).trim();

    // Fourchette : "4 à 6", "4-6", "4 to 6", "Serves 8-10"
    const rangeMatch = str.match(/(\d+)\s*(?:-|à|to)\s*(\d+)/i);
    if (rangeMatch) {
      const lower = parseInt(rangeMatch[1], 10);
      if (lower > 0) return Math.min(100, lower);
    }

    // Premier entier positif trouvé
    const numMatch = str.match(/\d+/);
    if (numMatch) {
      const val = parseInt(numMatch[0], 10);
      if (val > 0) return Math.min(100, val);
    }
  }

  return defaultServings;
}

/**
 * Détermine la catégorie d'une recette selon Schema.org (recipeCategory, keywords, titre).
 */
export function normalizeRecipeCategory(
  categoryStr?: string,
  title?: string,
  keywords?: string | string[]
): Category {
  const kwStr = Array.isArray(keywords) ? keywords.join(' ') : keywords || '';
  const text = `${categoryStr || ''} ${title || ''} ${kwStr}`.toLowerCase();

  // 1. Petit-déjeuner / Brunch
  if (/petit-d[eé]jeuner|brunch|granola|porridge|muesli|overnight oats|pancakes?/i.test(text)) {
    return 'Petit-déjeuner';
  }

  // 2. Boissons & Cocktails
  if (/boisson|cocktail|smoothie|jus|milkshake|th[eé]|infusion|sirop|drink|beverage/i.test(text)) {
    return 'Boisson';
  }

  // 3. Apéritifs & Tapas
  if (/ap[eé]ritif|ap[eé]ro|amuse-bouche|tapas|cocktail d[iî]natoire|canap[eé]|dips?|finger food/i.test(text)) {
    return 'Apéritif';
  }

  // 4. Entrées, Salades & Soupes
  if (
    /entr[eé]e|salade|soupe|velout[eé]|potage|quiche|tourte|tarte sal[eé]e|carpaccio|terrine|verrine|starter|appetizer|soup|salad/i.test(
      text
    )
  ) {
    return 'Entrée';
  }

  // 5. Desserts & Pâtisseries
  if (
    /dessert|g[aâ]teau|tarte sucr[eé]e|tartelette|tarte tatin|tarte aux (?:pommes?|poires?|fraises?|framboises?|citrons?|abricots?)|biscuit|cr[eê]pe|gaufre|mousse|flan|confiserie|brioche|p[aâ]tisserie|chocolat|muffin|fondant|crumble|clafoutis|pain perdu|glace|sorbet|brownie|financier|macaron|madeleine|cookie|cr[eè]me br[uû]l[eé]e|tiramisu|charlotte|cake sucr[eé]|cake aux fruits|banana bread|entremets?|sweet|cake|pie|pastry|waffle/i.test(
      text
    )
  ) {
    return 'Dessert';
  }

  return 'Plat';
}

function cleanInstructionText(text: string): string {
  const decoded = decodeHtmlEntities(text);
  if (!decoded) return '';
  return decoded
    .replace(/^(?:(?:[eé]tape|step)\s*\d+|\d+)[\.\):\s\-–]+\s*/i, '')
    .trim();
}

/**
 * Extrait et aplatit les étapes d'instructions depuis un JSON-LD Recipe Schema.org.
 * Gère les chaînes simples, les blocs multilignes, les HowToStep et les HowToSection imbriqués.
 */
export function extractInstructions(rawInstructions: any): string[] {
  if (!rawInstructions) return [];
  const list = Array.isArray(rawInstructions) ? rawInstructions : [rawInstructions];
  const results: string[] = [];

  for (const item of list) {
    if (!item) continue;

    if (typeof item === 'string') {
      const decoded = decodeHtmlEntities(item);
      if (!decoded) continue;

      // Si la chaîne contient plusieurs étapes séparées par des retours à la ligne
      if (decoded.includes('\n')) {
        const subLines = decoded.split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
        for (const line of subLines) {
          const cleaned = cleanInstructionText(line);
          if (cleaned.length > 3) results.push(cleaned);
        }
      } else {
        const cleaned = cleanInstructionText(decoded);
        if (cleaned.length > 2) results.push(cleaned);
      }
    } else if (Array.isArray(item.itemListElement)) {
      // Cas HowToSection avec sous-étapes imbriquées
      const subSteps = extractInstructions(item.itemListElement);
      results.push(...subSteps);
    } else if (typeof item.text === 'string' && item.text.trim()) {
      const cleaned = cleanInstructionText(item.text);
      if (cleaned) results.push(cleaned);
    } else if (typeof item.name === 'string' && item.name.trim()) {
      const cleaned = cleanInstructionText(item.name);
      if (cleaned && !/^étape\s*\d+$/i.test(cleaned) && !/^step\s*\d+$/i.test(cleaned)) {
        results.push(cleaned);
      }
    } else if (typeof item.description === 'string' && item.description.trim()) {
      const cleaned = cleanInstructionText(item.description);
      if (cleaned) results.push(cleaned);
    }
  }

  // Filtrage des doublons consécutifs et textes purement publicitaires
  const filtered: string[] = [];
  for (const step of results) {
    if (
      /^(?:bon app[eé]tit|n['’]h[eé]sitez pas [aà] laisser|abonn[eé]z-vous|regardez la vid[eé]o|laissez un commentaire)/i.test(
        step
      )
    ) {
      continue;
    }
    if (filtered.length === 0 || filtered[filtered.length - 1] !== step) {
      filtered.push(step);
    }
  }

  return filtered;
}

/**
 * Parcourt récursivement un objet JSON pour en extraire tous les nœuds de type "Recipe".
 */
function traverseForRecipes(node: any, out: any[]): void {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      traverseForRecipes(item, out);
    }
    return;
  }

  // Gestion du @graph (très fréquent sur WordPress, Yoast, BBC Good Food, 750g)
  if (Array.isArray(node['@graph'])) {
    for (const item of node['@graph']) {
      traverseForRecipes(item, out);
    }
  }

  // Vérification de @type ou type
  const typeVal = node['@type'] || node.type;
  if (typeVal) {
    const types = Array.isArray(typeVal) ? typeVal : [typeVal];
    const isRecipe = types.some((t) => {
      const s = String(t).trim().toLowerCase();
      return (
        s === 'recipe' ||
        s.endsWith('/recipe') ||
        s.endsWith(':recipe') ||
        s === 'https://schema.org/recipe' ||
        s === 'http://schema.org/recipe'
      );
    });

    if (isRecipe) {
      out.push(node);
    }
  }
}

/**
 * Extrait tous les objets Recipe Schema.org présents dans les balises script ld+json du HTML.
 */
export function extractJsonLdRecipes(html: string): any[] {
  const recipes: any[] = [];
  const jsonLdRegex = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    let raw = match[1].trim();
    if (!raw) continue;

    // Suppression des balises CDATA ou commentaires HTML
    raw = raw
      .replace(/^\s*\/\*\s*<!\[CDATA\[\s*\*\//i, '')
      .replace(/\/\*\s*\]\]>\s*\*\/\s*$/i, '')
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(decodeHtmlEntities(raw));
      } catch {
        try {
          // Correction des virgules traînantes éventuelles
          const cleaned = raw.replace(/,\s*([\]}])/g, '$1');
          parsed = JSON.parse(cleaned);
        } catch {
          continue;
        }
      }
    }

    if (parsed) {
      traverseForRecipes(parsed, recipes);
    }
  }

  return recipes;
}

/**
 * Sélectionne la fiche Recipe la plus pertinente et complète s'il y en a plusieurs.
 */
export function selectBestRecipeNode(nodes: any[]): any | null {
  if (!nodes || nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  const scoreNode = (node: any): number => {
    if (!node) return 0;
    let score = 0;
    if (node.name) score += 10;
    if (Array.isArray(node.recipeIngredient)) score += node.recipeIngredient.length * 3;
    if (node.recipeInstructions) {
      score += Array.isArray(node.recipeInstructions) ? node.recipeInstructions.length * 3 : 5;
    }
    if (node.image) score += 5;
    if (node.prepTime || node.cookTime || node.totalTime) score += 5;
    return score;
  };

  return nodes.reduce((best, curr) => (scoreNode(curr) > scoreNode(best) ? curr : best), nodes[0]);
}

/**
 * Résout une URL relative en URL absolue sûre.
 */
function resolveUrl(urlStr: string, baseUrl?: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  if (baseUrl) {
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Extrait toutes les images candidates haute résolution depuis le JSON-LD et le HTML (OpenGraph, Twitter).
 */
export function extractWebImages(html: string, recipeNode?: any, baseUrl?: string): string[] {
  const images: string[] = [];
  const seenUrls = new Set<string>();

  const addImage = (u?: string) => {
    if (!u) return;
    const resolved = resolveUrl(u, baseUrl);
    if (!resolved) return;

    // Rejeter les trackers 1x1, pixels, gifs transparents et svgs d'icônes
    const lower = resolved.toLowerCase();
    if (
      lower.includes('1x1') ||
      lower.includes('pixel') ||
      lower.includes('spacer') ||
      lower.includes('favicon') ||
      lower.endsWith('.svg')
    ) {
      return;
    }

    if (!seenUrls.has(resolved)) {
      seenUrls.add(resolved);
      images.push(resolved);
    }
  };

  // 1. Images déclarées dans le JSON-LD Recipe
  if (recipeNode && recipeNode.image) {
    const rawImg = recipeNode.image;
    const list = Array.isArray(rawImg) ? rawImg : [rawImg];
    for (const item of list) {
      if (typeof item === 'string') {
        addImage(item);
      } else if (item && typeof item === 'object') {
        if (typeof item.url === 'string') addImage(item.url);
        else if (typeof item.contentUrl === 'string') addImage(item.contentUrl);
        // Gestion des formats { "1x1": "...", "4x3": "...", "16x9": "..." }
        if (typeof item['16x9'] === 'string') addImage(item['16x9']);
        if (typeof item['4x3'] === 'string') addImage(item['4x3']);
        if (typeof item['1x1'] === 'string') addImage(item['1x1']);
      }
    }
  }

  // 2. OpenGraph Image (og:image)
  const ogMatches = [
    ...html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi),
    ...html.matchAll(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi),
  ];
  for (const m of ogMatches) {
    if (m[1]) addImage(m[1]);
  }

  // 3. Twitter Card Image
  const twMatches = [
    ...html.matchAll(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi),
    ...html.matchAll(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/gi),
  ];
  for (const m of twMatches) {
    if (m[1]) addImage(m[1]);
  }

  // 4. Galerie haute résolution Marmiton spécifique si applicable
  if (baseUrl && baseUrl.includes('marmiton.org')) {
    const marmitonRegex = /\/recipe\/(\d+)\/(\d+)_/g;
    let mMatch;
    while ((mMatch = marmitonRegex.exec(html)) !== null) {
      const [, date, imgId] = mMatch;
      addImage(`https://assets.afcdn.com/recipe/${date}/${imgId}_w1024h768c1.jpg`);
    }
  }

  return images;
}

/**
 * Extrait le titre de secours de la page HTML (<title> ou og:title).
 */
export function extractHtmlTitle(html: string): string {
  const ogTitleMatch =
    html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  if (ogTitleMatch && ogTitleMatch[1]) {
    return decodeHtmlEntities(ogTitleMatch[1]);
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    return decodeHtmlEntities(titleMatch[1]);
  }

  return 'Recette Web';
}

/**
 * Nettoie le titre d'une recette en supprimant les suffixes de marque de site web courants.
 */
export function cleanRecipeTitle(rawTitle: string): string {
  const decoded = decodeHtmlEntities(rawTitle);
  return decoded
    .replace(
      /\s*[-–|•]\s*(?:CuisineAZ|Cuisine AZ|750g|Marmiton|BBC Good Food|Chefclub|Jow|Papilles et Pupilles|Journal des Femmes|Recette de cuisine).*$/i,
      ''
    )
    .trim();
}

/**
 * Analyse un nœud JSON-LD Recipe et construit un objet Recipe officiel.
 */
export function parseRecipeJsonLd(
  recipeNode: any,
  html: string,
  sourceUrl: string,
  defaultServings = 4
): Recipe {
  const now = new Date().toISOString();
  const rawTitle = recipeNode.name || recipeNode.headline || extractHtmlTitle(html);
  const title = cleanRecipeTitle(String(rawTitle)) || 'Recette sans titre';

  const rawDescription = recipeNode.description || recipeNode.abstract || '';
  const description = decodeHtmlEntities(String(rawDescription));

  const servings = extractServings(recipeNode.recipeYield, defaultServings);

  const prepTimeMinutes = parseDuration(recipeNode.prepTime);
  const cookTimeMinutes = parseDuration(recipeNode.cookTime);
  const totalTimeMinutes = parseDuration(recipeNode.totalTime);

  let finalPrepTime = prepTimeMinutes;
  let finalCookTime = cookTimeMinutes;

  if (finalPrepTime === 0 && totalTimeMinutes > 0) {
    finalPrepTime = finalCookTime > 0 && totalTimeMinutes >= finalCookTime
      ? totalTimeMinutes - finalCookTime
      : totalTimeMinutes;
  } else if (finalCookTime === 0 && totalTimeMinutes > finalPrepTime) {
    finalCookTime = totalTimeMinutes - finalPrepTime;
  }

  if (finalPrepTime === 0 && finalCookTime === 0) {
    finalPrepTime = 15;
  }

  // Extraction et normalisation Lexique-First des ingrédients
  const rawIngredients = Array.isArray(recipeNode.recipeIngredient)
    ? recipeNode.recipeIngredient
    : Array.isArray(recipeNode.ingredients)
    ? recipeNode.ingredients
    : typeof recipeNode.recipeIngredient === 'string'
    ? recipeNode.recipeIngredient.split(/\r?\n+/)
    : [];

  const ingredients = rawIngredients
    .map((ingRaw: any, idx: number) => {
      let rawText = '';
      if (typeof ingRaw === 'string') {
        rawText = ingRaw;
      } else if (ingRaw && typeof ingRaw === 'object') {
        rawText = ingRaw.text || ingRaw.name || ingRaw.original || '';
      }
      const cleanIngStr = decodeHtmlEntities(rawText)
        .replace(/^[\s•\-*]+/, '') // Puces et tirets
        .replace(/^\d+[\.\)]\s*/, '') // Numérotation d'étape ou liste (ex: "1. ")
        .trim();
      if (!cleanIngStr) return null;

      // Filtrer les en-têtes de sous-sections d'ingrédients (ex: "Pour la garniture :")
      if (
        /^(?:pour (?:la|le|les|l'|garniture|pâte|sauce|finition)|garniture|sauce|pâte|dressage)\s*:/i.test(
          cleanIngStr
        ) ||
        /^---+.*---+$/.test(cleanIngStr)
      ) {
        return null;
      }

      const parsed = parseShoppingInput(cleanIngStr);
      const norm = normalizeIngredient({
        name: parsed.name || cleanIngStr,
        canonicalId: parsed.canonicalId,
        quantity: parsed.quantity,
        unit: parsed.unit,
      });

      return {
        id: generateUniqueId(`ing_web_${idx + 1}`),
        name: norm.name || parsed.name || cleanIngStr,
        canonicalId: norm.canonicalId || parsed.canonicalId,
        quantity: parsed.quantity || norm.quantity || '',
        unit: parsed.unit || norm.unit || '',
        isPantryStaple: norm.isPantryStaple,
        isOptional: norm.isOptional,
      };
    })
    .filter((ing: any): ing is NonNullable<typeof ing> => ing !== null);

  // Extraction des instructions
  const instructionTexts = extractInstructions(recipeNode.recipeInstructions);
  const steps = instructionTexts.map((instruction, idx) => ({
    id: generateUniqueId(`stp_web_${idx + 1}`),
    order: idx + 1,
    instruction,
  }));

  // Extraction des photos
  const availableImages = extractWebImages(html, recipeNode, sourceUrl);
  const imageUrl = availableImages.length > 0 ? availableImages[0] : '';

  // Classification catégorie
  const rawCategory = typeof recipeNode.recipeCategory === 'string'
    ? recipeNode.recipeCategory
    : Array.isArray(recipeNode.recipeCategory)
    ? recipeNode.recipeCategory.join(' ')
    : '';
  const category = normalizeRecipeCategory(rawCategory, title, recipeNode.keywords);

  // Détection végétarienne
  const dietVal = String(recipeNode.suitableForDiet || '').toLowerCase();
  const isDietVeg = dietVal.includes('vegetariandiet') || dietVal.includes('vegandiet');
  const isVegetarian = isDietVeg || isRecipeVegetarian(ingredients, title, description);

  // Difficulté
  let difficulty: Difficulty = 'Moyen';
  const diffStr = String(recipeNode.recipeDifficulty || recipeNode.difficulty || '').toLowerCase();
  if (diffStr.includes('facile') || diffStr.includes('easy')) {
    difficulty = 'Facile';
  } else if (diffStr.includes('difficile') || diffStr.includes('hard')) {
    difficulty = 'Difficile';
  } else {
    difficulty = 'Facile';
  }

  let sourceSite = '';
  try {
    sourceSite = new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {}

  const recipe: Recipe = {
    id: generateUniqueId('rec_web'),
    title,
    description,
    category,
    difficulty,
    prepTimeMinutes: finalPrepTime,
    cookTimeMinutes: finalCookTime,
    servings,
    rating: 0,
    imageUrl,
    availableImages: availableImages.length > 0 ? availableImages : undefined,
    isFavorite: false,
    isVegetarian,
    userNote: '',
    sourceUrl,
    sourceSite: sourceSite || undefined,
    createdAt: now,
    updatedAt: now,
    ingredients,
    steps,
  };

  return sanitizeStoredRecipe(recipe);
}

export const WebRecipeService = {
  /**
   * Valide une URL Web de recette.
   */
  validateUrl(url: string): URL {
    return validateWebRecipeUrl(url);
  },

  /**
   * Importe une recette depuis n'importe quelle URL web culinaire.
   * Analyse d'abord le balisage standard Schema.org JSON-LD (instantané et 0 coût IA).
   * Si aucun JSON-LD n'est disponible, bascule sur la structuration IA Gemini 3.8 Flash.
   */
  async importRecipeFromUrl(
    url: string,
    options?: { apiKey?: string; defaultServings?: number }
  ): Promise<Recipe> {
    const validUrl = validateWebRecipeUrl(url);
    const html = await fetchWebPage(validUrl.toString());

    // 1. Recherche du schéma de données Recipe (JSON-LD)
    const jsonLdRecipes = extractJsonLdRecipes(html);
    const bestRecipeNode = selectBestRecipeNode(jsonLdRecipes);

    // 2. Si un JSON-LD Recipe exploitable est présent (avec titre et ingrédients ou étapes)
    if (
      bestRecipeNode &&
      (bestRecipeNode.name ||
        (Array.isArray(bestRecipeNode.recipeIngredient) && bestRecipeNode.recipeIngredient.length > 0))
    ) {
      return parseRecipeJsonLd(
        bestRecipeNode,
        html,
        validUrl.toString(),
        options?.defaultServings || 4
      );
    }

    // 3. Fallback IA Gemini 3.8 Flash si aucun schéma JSON-LD n'a été trouvé
    const apiKey = options?.apiKey || (await RecipeAiService.getApiKey());
    if (!apiKey) {
      throw new Error(
        "Cette page web ne contient pas de données de recette standardisées (Schema.org JSON-LD). " +
          "Pour structurer cette page avec l'IA, veuillez configurer votre clé d'API Gemini dans les Paramètres."
      );
    }

    const availableImages = extractWebImages(html, null, validUrl.toString());
    const coverImage = availableImages.length > 0 ? availableImages[0] : '';

    // Élagage sécurisé du HTML pour le prompt IA
    const strippedHtml = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);

    const extracted = await RecipeAiService.extractRecipeFromText(strippedHtml, apiKey);
    const now = new Date().toISOString();

    const ingredients = (extracted.ingredients || []).map((ing, idx) => {
      const norm = normalizeIngredient({
        name: ing.name ? ing.name.trim() : '',
        quantity: ing.quantity || '',
        unit: ing.unit || '',
      });
      return {
        id: generateUniqueId(`ing_web_${idx + 1}`),
        name: norm.name || (ing.name ? ing.name.trim() : ''),
        canonicalId: norm.canonicalId,
        quantity: norm.quantity || '',
        unit: norm.unit || '',
        isPantryStaple: norm.isPantryStaple,
        isOptional: norm.isOptional,
      };
    });

    const steps = (extracted.steps || []).map((st, idx) => ({
      id: generateUniqueId(`stp_web_${idx + 1}`),
      order: st.order || idx + 1,
      instruction: st.instruction.trim(),
    }));

    let sourceSite = '';
    try {
      sourceSite = validUrl.hostname.replace(/^www\./, '');
    } catch {}

    const recipe: Recipe = {
      id: generateUniqueId('rec_web'),
      title: extracted.title || extractHtmlTitle(html) || 'Recette Web',
      description: extracted.description || '',
      category: extracted.category || 'Plat',
      difficulty: extracted.difficulty || 'Moyen',
      prepTimeMinutes: extracted.prepTimeMinutes || 15,
      cookTimeMinutes: extracted.cookTimeMinutes || 0,
      servings: extracted.servings || options?.defaultServings || 4,
      rating: 0,
      imageUrl: coverImage,
      availableImages: availableImages.length > 0 ? availableImages : undefined,
      isFavorite: false,
      isVegetarian: extracted.isVegetarian ?? isRecipeVegetarian(ingredients, extracted.title || '', ''),
      userNote: extracted.userNote ? extracted.userNote.trim() : '',
      sourceUrl: validUrl.toString(),
      sourceSite: sourceSite || undefined,
      createdAt: now,
      updatedAt: now,
      ingredients,
      steps,
    };

    return sanitizeStoredRecipe(recipe);
  },
};
