import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe, Category, Difficulty } from '../types/recipe';

const GEMINI_API_KEY_STORAGE = '@papilles_gemini_api_key';

// Clé d'API par défaut lue depuis les variables d'environnement (si définie dans .env)
const ENV_GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export interface ExtractedRecipeData {
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  ingredients: { name: string; quantity?: string; unit?: string }[];
  steps: { order: number; instruction: string }[];
  userNote?: string;
  isVegetarian?: boolean;
}

export type AiStatusCode =
  | 'OK'
  | 'NO_INTERNET'
  | 'INVALID_KEY'
  | 'INVALID_MODEL'
  | 'QUOTA_EXCEEDED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface AiConnectionStatus {
  ok: boolean;
  code: AiStatusCode;
  message: string;
}

const NON_VEGETARIAN_KEYWORDS = [
  'boeuf', 'bœuf', 'steak', 'steaks', 'viande', 'viandes', 'veau', 'agneau', 'mouton', 'porc', 'cochon',
  'lardon', 'lardons', 'bacon', 'pancetta', 'jambon', 'prosciutto', 'saucisse', 'saucisses', 'chipolata',
  'merguez', 'chorizo', 'échine', 'bavette', 'entrecôte', 'entrecote', 'rumsteck', 'paleron', 'bourguignon',
  'carpaccio', 'canard', 'magret', 'confit de canard', 'foie gras', 'boudin',
  'lapin', 'lièvre', 'lievre', 'gibier', 'sanglier', 'chevreuil', 'cerf', 'biche', 'caille', 'cailles',
  'poulet', 'volaille', 'volailles', 'dinde', 'blanc de poulet', 'cuisse de poulet', 'filet de poulet',
  'aiguillettes de poulet', 'coquelet', 'chapon', 'pintade',
  'poisson', 'poissons', 'saumon', 'thon', 'cabillaud', 'colin', 'merlu', 'dorade', 'daurade', 'bar',
  'loup de mer', 'truite', 'maquereau', 'sardine', 'sardines', 'sole', 'églefin', 'lieu noir', 'lieu jaune',
  'anchois', 'morue', 'hareng', 'haddock', 'surimi',
  'fruits de mer', 'crevette', 'crevettes', 'gambas', 'scampi', 'moule', 'moules', 'saint-jacques',
  'saint jacques', 'calamar', 'calamars', 'poulpe', 'seiche', 'crabe', 'langoustine', 'homard', 'écrevisse',
  'bouillon de volaille', 'bouillon de poule', 'bouillon de boeuf', 'fond de veau', 'fumet de poisson',
  'gélatine de porc', 'chair à saucisse', 'chair a saucisse', 'poitrine fumée', 'poitrine fumee',
  'escargot', 'escargots', 'grenouille', 'grenouilles', 'rognon', 'rognons', 'tripes', 'gésier', 'gésiers'
];

/**
 * Détecte si une recette est végétarienne d'après ses ingrédients, titre et description.
 */
export function isRecipeVegetarian(
  ingredients: { name: string }[] = [],
  title = '',
  description = ''
): boolean {
  const fullText = [
    title,
    description,
    ...ingredients.map((i) => i.name),
  ]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const keyword of NON_VEGETARIAN_KEYWORDS) {
    const cleanKw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const regex = new RegExp(`\\b${cleanKw}\\b`, 'i');
    if (regex.test(fullText)) {
      return false;
    }
  }

  return true;
}

export const RecipeAiService = {
  /**
   * Récupère la clé API Gemini : priorité à celle stockée par l'utilisateur,
   * sinon utilise la clé par défaut pré-configurée.
   */
  async getApiKey(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(GEMINI_API_KEY_STORAGE);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {}
    return ENV_GEMINI_API_KEY.trim();
  },

  /**
   * Sauvegarde une clé API personnalisée dans le stockage local
   */
  async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  },

  /**
   * Supprime la clé personnalisée (reviendra à la clé par défaut)
   */
  async clearApiKey(): Promise<void> {
    await AsyncStorage.removeItem(GEMINI_API_KEY_STORAGE);
  },

  /**
   * Vérifie réellement l'état et la disponibilité de l'IA (ping léger).
   * Retourne un statut détaillé avec la cause exacte en cas d'erreur.
   */
  async checkConnection(providedKey?: string): Promise<AiConnectionStatus> {
    const apiKey = providedKey || (await this.getApiKey());
    if (!apiKey) {
      return {
        ok: false,
        code: 'INVALID_KEY',
        message: 'Clé API non configurée',
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    try {
      // Timeout de 8 secondes pour détecter les pannes réseau sans bloquer l'UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          ok: true,
          code: 'OK',
          message: 'IA connectée & prête (Gemini 3.8 Flash)',
        };
      }

      const errText = await response.text();
      let serverMsg = '';
      try {
        const errJson = JSON.parse(errText);
        serverMsg = errJson?.error?.message || '';
      } catch {}

      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        serverMsg.toLowerCase().includes('api_key') ||
        serverMsg.toLowerCase().includes('api key')
      ) {
        return {
          ok: false,
          code: 'INVALID_KEY',
          message: 'Clé API non reconnue ou invalide',
        };
      }

      if (response.status === 404 || serverMsg.toLowerCase().includes('model')) {
        return {
          ok: false,
          code: 'INVALID_MODEL',
          message: 'Modèle Gemini 3.8 Flash indisponible',
        };
      }

      if (
        response.status === 429 ||
        serverMsg.toLowerCase().includes('quota') ||
        serverMsg.toLowerCase().includes('resource_exhausted')
      ) {
        return {
          ok: false,
          code: 'QUOTA_EXCEEDED',
          message: 'Limite de requêtes atteinte (quota dépassé)',
        };
      }

      return {
        ok: false,
        code: 'SERVER_ERROR',
        message: `Erreur serveur Google (${response.status} : ${serverMsg || 'indisponible'})`,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.name === 'AbortError' || msg.includes('timeout')) {
        return {
          ok: false,
          code: 'NO_INTERNET',
          message: 'Pas de connexion Internet (délai dépassé)',
        };
      }
      if (
        msg.includes('Network request failed') ||
        msg.includes('fetch failed') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('Failed to fetch')
      ) {
        return {
          ok: false,
          code: 'NO_INTERNET',
          message: 'Pas de connexion Internet',
        };
      }
      return {
        ok: false,
        code: 'UNKNOWN_ERROR',
        message: `Problème réseau : ${msg}`,
      };
    }
  },

  /**
   * Analyse une ou plusieurs images de recette (format libre : livre, coupure, manuscrit, fiche repas...).
   * via l'API Gemini 3.8 Flash.
   */
  async extractRecipeFromImages(
    images: { base64: string; mimeType?: string }[],
    providedKey?: string
  ): Promise<ExtractedRecipeData> {
    const apiKey = providedKey || (await this.getApiKey());

    if (!apiKey) {
      throw new Error(
        'Clé API Gemini manquante. Veuillez renseigner votre clé API dans les paramètres.'
      );
    }

    const systemPrompt = `Tu es un chef cuisinier expert et un assistant d'extraction de données culinaires universel.
On te transmet une ou plusieurs photos d'une recette de cuisine.
Cette recette peut provenir de N'IMPORTE QUELLE source :
- Page ou double-page d'un livre de cuisine
- Recette manuscrite (carnet de grand-mère)
- Coupure de magazine ou journal
- Fiche recette / box repas (Quitoque, HelloFresh, etc.)
- Capture d'écran de site web ou blog
- Emballage de produit alimentaire

S'il y a plusieurs photos, rassemble et combine intelligemment toutes les informations pour former UNE SEULE recette complète et cohérente.

Extrais ou déduis fidèlement la recette sous forme de JSON strict avec cette structure exacte :
{
  "title": "Nom précis et appétissant de la recette",
  "description": "Courte description, sous-titre ou accroche gourmande résumant le plat",
  "category": "Plat" | "Entrée" | "Dessert" | "Apéritif" | "Petit-déjeuner" | "Boisson",
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "prepTimeMinutes": nombre de minutes de préparation (estime de façon réaliste si non précisé),
  "cookTimeMinutes": nombre de minutes de cuisson (estime de façon réaliste si non précisé, ou 0 si sans cuisson),
  "servings": nombre de portions / personnes (si absent, mets 4 par défaut ; si un tableau multi-portions existe, choisis les quantités pour 2 ou 4 personnes et indique le chiffre ici),
  "isVegetarian": true | false (vrai si la recette ne contient ni viande, ni volaille, ni poisson, ni fruits de mer, ni charcuterie ; faux sinon),
  "ingredients": [
    {
      "name": "Nom de l'ingrédient",
      "quantity": "Quantité (ex: '200', '1/2', '2', ou vide si non précisé)",
      "unit": "Unité normalisée (ex: 'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousses', ou vide)"
    }
  ],
  "steps": [
    {
      "order": 1,
      "instruction": "Consigne claire, complète et détaillée de l'étape 1"
    }
  ],
  "userNote": "Astuce du chef, conseil de conservation, suggestion ou remarque présente sur la recette (optionnel)"
}

Règles universelles :
- Nettoie les noms d'ingrédients (en minuscules avec majuscule initiale, sans quantité dans le nom).
- Ne résume pas et ne tronque pas les étapes : garde toutes les instructions nécessaires pour réussir le plat en cuisine.
- Si la catégorie ou la difficulté ne sont pas mentionnées, détermine-les intelligemment d'après les ingrédients et la préparation.
- Détermine avec précision si la recette est végétarienne (sans chair animale) dans 'isVegetarian'.
- Réponds STRICTEMENT en JSON valide, sans texte additionnel ni balises markdown.`;

    // Prépare les parties images pour Gemini
    const contentsParts: any[] = images.map((img) => ({
      inline_data: {
        mime_type: img.mimeType || 'image/jpeg',
        data: img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
      },
    }));

    contentsParts.push({
      text: systemPrompt,
    });

    // Utilisation de gemini-3.8-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: contentsParts,
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Erreur API Gemini (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("L'IA n'a retourné aucune donnée pour cette image.");
    }

    // Nettoyage éventuel si markdown ```json ... ```
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson) as ExtractedRecipeData;
    parsed.isVegetarian = typeof parsed.isVegetarian === 'boolean'
      ? parsed.isVegetarian
      : isRecipeVegetarian(parsed.ingredients, parsed.title, parsed.description);
    return parsed;
  },

  /**
   * Analyse et structure une recette à partir de données textuelles ou HTML (ex: Marmiton, blog...)
   * via l'API Gemini 3.8 Flash.
   */
  async extractRecipeFromText(
    recipeContent: string,
    providedKey?: string
  ): Promise<ExtractedRecipeData> {
    const apiKey = providedKey || (await this.getApiKey());

    if (!apiKey) {
      throw new Error(
        'Clé API Gemini manquante. Veuillez renseigner votre clé API dans les paramètres.'
      );
    }

    const systemPrompt = `Tu es un chef cuisinier expert et un extracteur de données culinaires universel.
On te transmet le contenu textuel ou les données brutes d'une page de recette (ex: Marmiton).
Extrais fidèlement la recette sous forme de JSON strict avec cette structure exacte :
{
  "title": "Nom précis et appétissant de la recette",
  "description": "Courte description, sous-titre ou accroche gourmande résumant le plat",
  "category": "Plat" | "Entrée" | "Dessert" | "Apéritif" | "Petit-déjeuner" | "Boisson",
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "prepTimeMinutes": nombre de minutes de préparation (estime de façon réaliste si non précisé),
  "cookTimeMinutes": nombre de minutes de cuisson (estime de façon réaliste si non précisé, ou 0 si sans cuisson),
  "servings": nombre de personnes / portions (si absent, 4 par défaut),
  "isVegetarian": true | false (vrai si la recette ne contient ni viande, ni volaille, ni poisson, ni fruits de mer, ni charcuterie ; faux sinon),
  "ingredients": [
    {
      "name": "Nom de l'ingrédient nettoyé (sans quantité dans le nom)",
      "quantity": "Quantité (ex: '200', '1/2', '2', ou vide si non précisé)",
      "unit": "Unité normalisée (ex: 'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousses', ou vide)"
    }
  ],
  "steps": [
    {
      "order": 1,
      "instruction": "Consigne complète et détaillée de l'étape 1"
    }
  ],
  "userNote": "Astuce ou conseil utile présent dans la recette (optionnel)"
}

Règles impératives :
- Découpe chaque ingrédient proprement : quantité numérique ou fraction dans 'quantity', unité dans 'unit' (normalisée en minuscules : g, cl, etc.), nom propre dans 'name'.
- Ne tronque pas les étapes : garde les instructions complètes pour cuisiner le plat.
- Détermine la catégorie et la difficulté si elles ne sont pas explicitement données.
- Détermine avec précision si la recette est végétarienne (sans chair animale) dans 'isVegetarian'.
- Réponds STRICTEMENT en JSON valide, sans texte additionnel ni balises markdown.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nVoici le contenu de la recette à analyser :\n${recipeContent.slice(0, 15000)}`,
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Erreur API Gemini (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("L'IA n'a retourné aucune donnée pour ce texte.");
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson) as ExtractedRecipeData;
    parsed.isVegetarian = typeof parsed.isVegetarian === 'boolean'
      ? parsed.isVegetarian
      : isRecipeVegetarian(parsed.ingredients, parsed.title, parsed.description);
    return parsed;
  },

  /**
   * Analyse, structure et AUTOCOMPLÈTE une recette à partir d'un texte brut copié-collé
   * (message WhatsApp, notes personnelles en vrac, ébauche incomplète, recette de famille).
   * Spécialisé pour déduire intelligemment les informations manquantes (temps, portions, étapes développées).
   */
  async extractRecipeFromRawText(
    rawText: string,
    providedKey?: string
  ): Promise<ExtractedRecipeData> {
    const apiKey = providedKey || (await this.getApiKey());

    if (!apiKey) {
      throw new Error(
        'Clé API Gemini manquante. Veuillez renseigner votre clé API dans les paramètres.'
      );
    }

    const trimmedInput = rawText.trim();
    if (!trimmedInput) {
      throw new Error('Veuillez saisir ou coller le texte de votre recette.');
    }

    const systemPrompt = `Tu es un chef cuisinier renommé et un expert en extraction et structuration de données culinaires.
L'utilisateur te fournit du TEXTE BRUT représentant une recette ou une ébauche de recette.
Ce texte peut être :
- Un message informel (ex: WhatsApp, SMS, e-mail)
- Une note personnelle rapide, incomplète ou mal ordonnée
- Une liste d'ingrédients jetée pêle-mêle avec quelques mots d'instructions télégraphiques
- Un copier-coller depuis un blog, un article ou un réseau social
- Une recette de grand-mère avec des mesures approximatives

Ta mission est double :
1. Extraire fidèlement tous les éléments explicitement mentionnés dans le texte.
2. AUTOCOMPLÉTER INTELLIGEMMENT toutes les informations manquantes pour produire une recette complète, équilibrée et prête à cuisiner.

Règles impératives d'extraction et d'autocomplétion :
- "title" : Nom précis, appétissant et évocateur de la recette (déduis-le d'après les ingrédients et le plat si absent).
- "description" : Une ou deux phrases d'introduction gourmande qui décrivent le plat, ses saveurs ou sa texture.
- "category" : Classe obligatoirement dans une des catégories exactes : "Plat", "Entrée", "Dessert", "Apéritif", "Petit-déjeuner", "Boisson".
- "difficulty" : Évalue la difficulté réelle ("Facile", "Moyen", "Difficile").
- "prepTimeMinutes" : Temps de préparation en minutes. SI NON MENTIONNÉ, déduis et autocomplète un temps réaliste selon les gestes requis (ex: épluchage, découpe, repos).
- "cookTimeMinutes" : Temps de cuisson en minutes. SI NON MENTIONNÉ, déduis et autocomplète un temps réaliste (ou mets 0 si recette crue/sans cuisson).
- "servings" : Nombre de portions / personnes. SI NON MENTIONNÉ, mets 4 par défaut.
- "isVegetarian" : true ou false. Mets true SI ET SEULEMENT SI la recette ne contient AUCUNE chair animale (pas de boeuf, porc, poulet, dinde, canard, poisson, fruits de mer, lardons, charcuterie, bouillon de volaille/viande, gélatine de porc).
- "ingredients" : Découpe proprement chaque ingrédient dans le tableau :
  * "name" : nom de l'ingrédient nettoyé (ex: "Farine de blé", "Tomates cerises", "Beurre doux"), en minuscules avec majuscule initiale, SANS quantité ni unité dans le nom.
  * "quantity" : quantité numérique ou fraction (ex: '250', '2', '1/2'). SI AUCUNE QUANTITÉ N'EST FOURNIE dans le texte (ex: "un peu de beurre", "du sel", "des pâtes"), AUTOCOMPLÈTE une quantité réaliste et cohérente pour le nombre de portions indiqué.
  * "unit" : unité normalisée (ex: 'g', 'kg', 'ml', 'cl', 'l', 'c. à soupe', 'c. à café', 'pincée', 'gousses', 'tranches', ou vide si unitaire).
- "steps" : Étapes de préparation claires, chronologiques, complètes et pédagogiques :
  * Si le texte source ne contient que des indications partielles ou télégraphiques (ex: "mélanger et enfourner"), DÉVELOPPE et AUTOCOMPLÈTE les étapes avec les gestes professionnels précis (température du four, temps indicatifs, ordre d'incorporation des ingrédients) pour garantir le succès de la recette.
  * Chaque étape doit avoir un "order" croissant (1, 2, 3...) et une "instruction" bien rédigée en français.
- "userNote" : Ajoute un conseil de chef utile (accord mets-vin, astuce de conservation, variante possible ou secret de cuisson).

Réponds STRICTEMENT en JSON valide, sans texte d'accompagnement ni balises markdown additionnelles, avec cette structure :
{
  "title": "Nom de la recette",
  "description": "Courte description alléchante",
  "category": "Plat",
  "difficulty": "Facile",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 25,
  "servings": 4,
  "isVegetarian": false,
  "ingredients": [
    { "name": "Nom", "quantity": "Quantité", "unit": "Unité" }
  ],
  "steps": [
    { "order": 1, "instruction": "Consigne complète" }
  ],
  "userNote": "Conseil du chef"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\nVoici le texte brut fourni par l'utilisateur à analyser et autocompléter :\n${trimmedInput.slice(0, 15000)}`,
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Erreur API Gemini (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const rawAiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawAiText) {
      throw new Error("L'IA n'a retourné aucune donnée pour ce texte.");
    }

    let cleanJson = rawAiText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanJson) as ExtractedRecipeData;
    parsed.isVegetarian = typeof parsed.isVegetarian === 'boolean'
      ? parsed.isVegetarian
      : isRecipeVegetarian(parsed.ingredients, parsed.title, parsed.description);

    return parsed;
  },
};
