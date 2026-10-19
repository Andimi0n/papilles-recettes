#!/usr/bin/env node

/**
 * Papilles - Marmiton Bot Importer
 * Usage:
 *   node scripts/import_marmiton.js <marmiton_url>
 *   node scripts/import_marmiton.js --search "quiche lorraine" --count 2
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

async function fetchMarmitonHtml(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!resp.ok) {
    throw new Error(`Erreur HTTP Marmiton: ${resp.status}`);
  }

  return await resp.text();
}

function extractRecipePayload(html) {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch;

  while ((ldMatch = jsonLdRegex.exec(html)) !== null) {
    const jsonContent = ldMatch[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);
      const graph = parsed['@graph'] || (Array.isArray(parsed) ? parsed : [parsed]);
      for (const item of graph) {
        if (item && (item['@type'] === 'Recipe' || item['@type']?.includes?.('Recipe'))) {
          return JSON.stringify(item);
        }
      }
    } catch {}
  }

  const stripped = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped.slice(0, 12000);
}

function extractMarmitonImages(html) {
  const images = [];
  const seenIds = new Set();

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

  return images;
}

async function convertWithGeminiAI(payloadText) {
  const prompt = `Tu es un chef cuisinier expert et un extracteur de données culinaires.
Convertis cette recette Marmiton en JSON strict respectant cette structure exacte :
{
  "title": "Nom de la recette",
  "description": "Courte description gourmande",
  "category": "Plat" | "Entrée" | "Dessert" | "Apéritif" | "Petit-déjeuner" | "Boisson",
  "difficulty": "Facile" | "Moyen" | "Difficile",
  "prepTimeMinutes": nombre de minutes de préparation,
  "cookTimeMinutes": nombre de minutes de cuisson (ou 0),
  "servings": nombre de portions (ex: 4),
  "rating": 0,
  "imageUrl": "",
  "ingredients": [
    {
      "name": "Nom de l'ingrédient nettoyé",
      "quantity": "Quantité (ex: '250', '2', '1/2')",
      "unit": "Unité normalisée (ex: 'g', 'cl', 'c. à soupe', 'pincée', ou vide)"
    }
  ],
  "steps": [
    {
      "order": 1,
      "instruction": "Instruction complète de l'étape"
    }
  ],
  "userNote": "Remarque de l'auteur si expressément présente sur la page, sinon \"\""
}

Règles impératives :
- "rating": 0 (toujours 0 étoile).
- "imageUrl": "" (pas de photo).
- "userNote": Uniquement la note rédigée par l'auteur si présente sur la page, sinon laisse strictement "". Ne génère aucune note automatique.
- Découpe bien chaque ingrédient en quantité, unité et nom.
- Réponds UNIQUEMENT en JSON valide sans aucun markdown.

Voici le contenu de la recette :
${payloadText}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`;
  const aiResp = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    throw new Error(`Gemini API Error (${aiResp.status}): ${errText}`);
  }

  const aiData = await aiResp.json();
  const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  let cleanJson = rawText.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(cleanJson);
}

async function searchMarmiton(query, count = 3) {
  const searchUrl = `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(query)}`;
  const html = await fetchMarmitonHtml(searchUrl);

  const linkRegex = /<a[^>]+href=["'](\/recettes\/recette_[^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const results = [];
  const seen = new Set();

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const path = match[1];
    const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
    const fullUrl = `https://www.marmiton.org${path}`;

    if (!seen.has(fullUrl) && rawTitle.length > 3) {
      const lower = rawTitle.toLowerCase();
      if (!lower.startsWith('voir la recette') && !lower.startsWith('découvrir')) {
        seen.add(fullUrl);
        results.push({
          title: rawTitle.replace(/&amp;/g, '&').replace(/&#039;/g, "'"),
          url: fullUrl,
        });
      }
    }
    if (results.length >= count) break;
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🤖 Bot d'Importation Marmiton -> Papilles
Usage:
  node scripts/import_marmiton.js <url_marmiton>
  node scripts/import_marmiton.js --search "fondant chocolat" [--count 3]

Exemple:
  node scripts/import_marmiton.js "https://www.marmiton.org/recettes/recette_pate-a-crepes-des-plus-raffinees_49665.aspx"
`);
    process.exit(0);
  }

  let urls = [];

  if (args[0] === '--search') {
    const query = args[1];
    let count = 2;
    const countIdx = args.indexOf('--count');
    if (countIdx !== -1 && args[countIdx + 1]) {
      count = parseInt(args[countIdx + 1], 10) || 2;
    }

    console.log(`🔍 Recherche sur Marmiton : "${query}" (top ${count} recettes)...`);
    const found = await searchMarmiton(query, count);
    console.log(`✅ ${found.length} recettes trouvées.`);
    urls = found.map((f) => f.url);
  } else {
    urls = [args[0]];
  }

  const recipes = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Récupération de : ${url}`);
    try {
      const html = await fetchMarmitonHtml(url);
      const payload = extractRecipePayload(html);
      console.log('  ⚡ Structuration IA par Gemini 3.8 Flash...');
      const extracted = await convertWithGeminiAI(payload);

      const availableImages = extractMarmitonImages(html);
      const imageUrl = availableImages.length > 0 ? availableImages[0] : '';

      const now = new Date().toISOString();
      const id = `rec_marmiton_${Date.now()}_${i + 1}`;

      const recipe = {
        id,
        title: extracted.title,
        description: extracted.description || '',
        category: extracted.category || 'Plat',
        difficulty: extracted.difficulty || 'Facile',
        prepTimeMinutes: extracted.prepTimeMinutes || 15,
        cookTimeMinutes: extracted.cookTimeMinutes || 0,
        servings: extracted.servings || 4,
        rating: 0, // 0 étoile
        imageUrl, // Première photo Marmiton par défaut
        availableImages, // Photos candidates
        isFavorite: false,
        userNote: extracted.userNote ? extracted.userNote.trim() : '',
        createdAt: now,
        updatedAt: now,
        ingredients: (extracted.ingredients || []).map((ing, idx) => ({
          id: `ing_marm_${id}_${idx + 1}`,
          name: ing.name.trim(),
          quantity: ing.quantity || '',
          unit: ing.unit || '',
        })),
        steps: (extracted.steps || []).map((st, idx) => ({
          id: `stp_marm_${id}_${idx + 1}`,
          order: st.order || idx + 1,
          instruction: st.instruction.trim(),
        })),
      };

      recipes.push(recipe);
      console.log(`  🎉 Succès : "${recipe.title}" (${recipe.ingredients.length} ingrédients, ${recipe.steps.length} étapes, 0 étoile, sans photo)`);
    } catch (e) {
      console.error(`  ❌ Erreur sur ${url}:`, e.message);
    }
  }

  console.log('\n=======================================');
  console.log(`✨ ${recipes.length} recette(s) importée(s) avec succès !`);
  console.log('=======================================');
  console.log(JSON.stringify(recipes, null, 2));
}

main().catch(console.error);
