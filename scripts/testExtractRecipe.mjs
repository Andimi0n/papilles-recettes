import fs from 'fs';
import path from 'path';

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const photo1Path = process.argv[3] || '/home/gabriel/Documents/ProjetsDev/PhotoRecette/WhatsApp Image 2026-10-18 at 11.01.02 (1).jpeg';
const photo2Path = process.argv[4] || '/home/gabriel/Documents/ProjetsDev/PhotoRecette/WhatsApp Image 2026-10-18 at 11.01.02.jpeg';

console.log(`\n📸 Analyse de la recette :`);
console.log(`- Image 1 (Recto) : ${photo1Path}`);
if (photo2Path && fs.existsSync(photo2Path)) {
  console.log(`- Image 2 (Verso) : ${photo2Path}`);
}

const img1Base64 = fs.readFileSync(photo1Path).toString('base64');
const parts = [
  {
    inline_data: {
      mime_type: 'image/jpeg',
      data: img1Base64,
    },
  },
];

if (photo2Path && fs.existsSync(photo2Path)) {
  const img2Base64 = fs.readFileSync(photo2Path).toString('base64');
  parts.push({
    inline_data: {
      mime_type: 'image/jpeg',
      data: img2Base64,
    },
  });
}

const systemPrompt = `Tu es un chef cuisinier expert et un assistant d'extraction de données.
On te fournit une ou plusieurs photos d'une fiche recette ou livre de cuisine (par exemple : recto avec le visuel/titre et verso avec le tableau d'ingrédients et les étapes de préparation).

Extrais fidèlement la recette sous forme de JSON strict respectant la structure suivante :
{
  "title": "Nom précis de la recette",
  "description": "Courte description ou sous-titre",
  "category": "Plat",
  "difficulty": "Facile",
  "prepTimeMinutes": 30,
  "cookTimeMinutes": 20,
  "servings": 2,
  "ingredients": [
    {
      "name": "Nom ingrédient",
      "quantity": "200",
      "unit": "g"
    }
  ],
  "steps": [
    {
      "order": 1,
      "instruction": "Texte clair de l'étape"
    }
  ],
  "userNote": "Note humaine présente sur la photo si écrite, sinon \"\""
}

Règles :
- RÈGLE STRICTE SUR 'userNote' : Ne génère, n'invente et ne déduis JAMAIS de conseil de chef. Recopie uniquement une note humaine si expressément écrite sur la photo, sinon laisse strictement "".
- Si la fiche présente plusieurs colonnes de portions (ex: 2p, 3p, 4p, 5p), choisis par défaut les quantités pour 2 personnes ou 4 personnes et renseigne "servings".
- Ne résume pas les étapes, conserve les consignes détaillées pour réussir le plat.
- Réponds UNIQUEMENT en JSON valide.`;

parts.push({ text: systemPrompt });

async function run() {
  console.log(`\n⏳ Envoi de la requête à l'API Gemini 3.8 Flash...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ Erreur API (${response.status}):`, errorBody);
    return;
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\n✅ Résultat extrait avec succès !');
  console.log('--------------------------------------------------');
  const parsed = JSON.parse(text);
  console.log(JSON.stringify(parsed, null, 2));
  console.log('--------------------------------------------------');
}

run().catch(console.error);
