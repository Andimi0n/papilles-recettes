#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_web_recipe');

  try {
    execSync(
      `npx tsc src/services/webRecipeService.ts src/services/recipeAiService.ts src/services/storageService.ts src/utils/helpers.ts src/utils/ingredientNormalizer.ts src/utils/shoppingInputParser.ts src/constants/units.ts src/types/recipe.ts src/types/shopping.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock React Native et AsyncStorage avant require
  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => memoryStore.get(key) || null,
    setItem: async (key, val) => {
      memoryStore.set(key, val);
      return null;
    },
    removeItem: async (key) => {
      memoryStore.delete(key);
      return null;
    },
  };
  AsyncStorageMock.default = AsyncStorageMock;

  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id === '@react-native-async-storage/async-storage') return AsyncStorageMock;
    if (id === 'expo-secure-store') return {};
    return originalRequire.apply(this, arguments);
  };

  const {
    WebRecipeService,
    validateWebRecipeUrl,
    decodeHtmlEntities,
    parseIsoDuration,
    parseHumanDuration,
    parseDuration,
    extractServings,
    normalizeRecipeCategory,
    extractInstructions,
    extractJsonLdRecipes,
    selectBestRecipeNode,
    parseRecipeJsonLd,
    extractWebImages,
    cleanRecipeTitle,
  } = require(path.join(tmpDir, 'services/webRecipeService.js'));

  console.log('🧪 Lancement des tests de validation de WebRecipeService (Universal JSON-LD Parser)...');

  // ==========================================
  // Test 1 : Validation d'URL & Sécurité SSRF
  // ==========================================
  console.log('\n--- Test 1 : Validation d\'URL & Sécurité SSRF ---');
  
  // URLs légitimes de sites de cuisine mondiaux
  const validUrls = [
    'https://www.cuisineaz.com/recettes/fondant-au-chocolat-rapide-123.aspx',
    'https://www.750g.com/tarte-aux-pommes-r1234.htm',
    'https://jow.fr/recipes/pates-au-pesto-456',
    'https://www.chefclub.tv/fr/recettes/original/gratin-de-pates/',
    'https://www.bbcgoodfood.com/recipes/classic-banana-bread',
    'https://www.papillesetpupilles.fr/2023/10/crepes-faciles.html',
    'https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/',
    'https://www.marmiton.org/recettes/recette_quiche-lorraine_12345.aspx',
    'http://mon-blog-de-cuisine.fr/ma-recette'
  ];

  for (const u of validUrls) {
    const parsed = validateWebRecipeUrl(u);
    assert.strictEqual(parsed.protocol.startsWith('http'), true);
  }
  console.log('✓ Validation réussie pour 9 plateformes culinaires majeures (HTTPS/HTTP)');

  // Rejet des URLs malveillantes / SSRF
  const invalidUrls = [
    'ftp://evil.com/recipe',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://admin:password@cuisineaz.com/recette',
    'https://example.com:8443/recette', // port non standard
    'http://localhost/secret',
    'http://127.0.0.1:80/admin',
    'http://10.0.0.5/internal',
    'http://192.168.1.1/router',
    'http://172.16.0.1/docker',
    'http://169.254.169.254/latest/meta-data',
    'http://mon-serveur.local/recette'
  ];

  for (const bad of invalidUrls) {
    assert.throws(
      () => validateWebRecipeUrl(bad),
      `Devrait rejeter l'URL non autorisée : ${bad}`
    );
  }
  console.log('✓ Rejet strict des protocoles non autorisés, ports anormaux et adresses locales/privées (SSRF)');

  // ==========================================
  // Test 2 : Décodage HTML & Entités complexes
  // ==========================================
  console.log('\n--- Test 2 : Décodage HTML & Entités ---');
  assert.strictEqual(
    decodeHtmlEntities('&eacute;t&eacute; &amp; hiver &#039; &quot;pomme&quot; &#8217;l&#8217;huile&#8217; &frac12; litre'),
    "été & hiver ' \"pomme\" 'l'huile' ½ litre"
  );
  assert.strictEqual(
    decodeHtmlEntities('<span>200</span>&nbsp;<strong>g</strong> de chocolat noir &#x27;extra&#x27;'),
    "200 g de chocolat noir 'extra'"
  );
  assert.strictEqual(
    decodeHtmlEntities('&amp;eacute;'), // Double encodage
    'é'
  );
  console.log('✓ Décodage correct des entités HTML courantes, numériques, hexadécimales et double-encodées');

  // ==========================================
  // Test 3 : Parsing des Durées (ISO 8601 & Langage naturel)
  // ==========================================
  console.log('\n--- Test 3 : Parsing des Durées ---');
  assert.strictEqual(parseIsoDuration('PT15M'), 15);
  assert.strictEqual(parseIsoDuration('PT1H30M'), 90);
  assert.strictEqual(parseIsoDuration('PT2H'), 120);
  assert.strictEqual(parseIsoDuration('P0DT0H45M'), 45);
  assert.strictEqual(parseIsoDuration('PT1.5H'), 90);
  assert.strictEqual(parseIsoDuration('PT90S'), 2);

  assert.strictEqual(parseHumanDuration('1h30'), 90);
  assert.strictEqual(parseHumanDuration('1 h 30 min'), 90);
  assert.strictEqual(parseHumanDuration('25 min'), 25);
  assert.strictEqual(parseHumanDuration('45 minutes'), 45);
  assert.strictEqual(parseHumanDuration('2 heures'), 120);
  assert.strictEqual(parseHumanDuration('2 heures 15'), 135);

  assert.strictEqual(parseDuration('PT45M'), 45);
  assert.strictEqual(parseDuration('35 min'), 35);
  assert.strictEqual(parseDuration(20), 20);
  console.log('✓ Parsing exact des durées ISO 8601 et formulations en langage naturel');

  // ==========================================
  // Test 4 : Extraction des Portions / Convives
  // ==========================================
  console.log('\n--- Test 4 : Extraction des Portions / Convives ---');
  assert.strictEqual(extractServings(4), 4);
  assert.strictEqual(extractServings('6 personnes'), 6);
  assert.strictEqual(extractServings('Pour 8 convives'), 8);
  assert.strictEqual(extractServings('4 à 6 personnes'), 4); // Fourchette : prend la borne basse sûre
  assert.strictEqual(extractServings('Serves 8-10'), 8);
  assert.strictEqual(extractServings(['6 parts', '6']), 6);
  assert.strictEqual(extractServings('', 4), 4); // Fallback
  assert.strictEqual(extractServings(undefined, 2), 2);
  console.log('✓ Extraction précise des portions (nombres, fourchettes, formats internationaux)');

  // ==========================================
  // Test 5 : Catégorisation des Recettes
  // ==========================================
  console.log('\n--- Test 5 : Catégorisation Intelligente ---');
  assert.strictEqual(normalizeRecipeCategory('Dessert', 'Gâteau au chocolat'), 'Dessert');
  assert.strictEqual(normalizeRecipeCategory('', 'Tarte tatin aux pommes'), 'Dessert');
  assert.strictEqual(normalizeRecipeCategory('', 'Velouté de potimarron'), 'Entrée');
  assert.strictEqual(normalizeRecipeCategory('Starters', 'Salade César'), 'Entrée');
  assert.strictEqual(normalizeRecipeCategory('', 'Guacamole et chips apéritif'), 'Apéritif');
  assert.strictEqual(normalizeRecipeCategory('', 'Smoothie mangue passion'), 'Boisson');
  assert.strictEqual(normalizeRecipeCategory('', 'Pancakes du dimanche brunch'), 'Petit-déjeuner');
  assert.strictEqual(normalizeRecipeCategory('Plat principal', 'Boeuf bourguignon traditionnel'), 'Plat');
  assert.strictEqual(normalizeRecipeCategory('', 'Risotto aux cèpes'), 'Plat');
  console.log('✓ Normalisation sémantique fiable vers les catégories Papilles');

  // ==========================================
  // Test 6 : Instructions & Aplatissement
  // ==========================================
  console.log('\n--- Test 6 : Instructions & Aplatissement ---');
  const rawInstructions = [
    'Étape 1 : Préchauffer le four à 180°C.',
    {
      '@type': 'HowToSection',
      name: 'Pour la pâte',
      itemListElement: [
        { '@type': 'HowToStep', text: 'Mélanger la farine et le beurre.' },
        { '@type': 'HowToStep', text: 'Ajouter l\'eau et former une boule.' }
      ]
    },
    {
      '@type': 'HowToStep',
      name: 'Cuisson',
      text: 'Enfourner pendant 30 minutes.'
    },
    'N\'hésitez pas à laisser un commentaire !' // Doit être filtré
  ];

  const instructions = extractInstructions(rawInstructions);
  assert.deepStrictEqual(instructions, [
    'Préchauffer le four à 180°C.',
    'Mélanger la farine et le beurre.',
    'Ajouter l\'eau et former une boule.',
    'Enfourner pendant 30 minutes.'
  ]);
  console.log('✓ Aplatissement fluide des HowToSection, HowToStep et nettoyage des phrases publicitaires');

  // ==========================================
  // Test 7 : CuisineAZ (JSON-LD Standard)
  // ==========================================
  console.log('\n--- Test 7 : Simulation Fiche CuisineAZ ---');
  const cuisineAzHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recette Fondant au chocolat rapide - Cuisine AZ</title>
        <meta property="og:image" content="https://images.cuisineaz.com/fondant-og.jpg" />
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Fondant au chocolat rapide - Cuisine AZ",
          "description": "Un succulent fondant au chocolat très facile et rapide à faire.",
          "image": "https://images.cuisineaz.com/recettes/fondant.jpg",
          "recipeYield": "6 personnes",
          "prepTime": "PT15M",
          "cookTime": "PT20M",
          "recipeCategory": "Dessert",
          "recipeIngredient": [
            "200 g de chocolat noir",
            "100 g de beurre doux",
            "3 oeufs",
            "80 g de sucre",
            "50 g de farine"
          ],
          "recipeInstructions": [
            { "@type": "HowToStep", "name": "Étape 1", "text": "Préchauffez votre four à 180°C (thermostat 6)." },
            { "@type": "HowToStep", "name": "Étape 2", "text": "Faites fondre le chocolat avec le beurre au bain-marie." },
            { "@type": "HowToStep", "name": "Étape 3", "text": "Incorporez les oeufs battus avec le sucre et la farine." },
            { "@type": "HowToStep", "name": "Étape 4", "text": "Versez dans un moule et enfournez pour 20 minutes." }
          ]
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const cazRecipes = extractJsonLdRecipes(cuisineAzHtml);
  assert.strictEqual(cazRecipes.length, 1);
  const cazRecipe = parseRecipeJsonLd(
    cazRecipes[0],
    cuisineAzHtml,
    'https://www.cuisineaz.com/recettes/fondant-au-chocolat-rapide-123.aspx'
  );

  assert.strictEqual(cazRecipe.title, 'Fondant au chocolat rapide');
  assert.strictEqual(cazRecipe.servings, 6);
  assert.strictEqual(cazRecipe.category, 'Dessert');
  assert.strictEqual(cazRecipe.prepTimeMinutes, 15);
  assert.strictEqual(cazRecipe.cookTimeMinutes, 20);
  assert.strictEqual(cazRecipe.ingredients.length, 5);
  assert.strictEqual(cazRecipe.steps.length, 4);
  assert.strictEqual(cazRecipe.imageUrl, 'https://images.cuisineaz.com/recettes/fondant.jpg');
  assert.strictEqual(cazRecipe.sourceSite, 'cuisineaz.com');
  // Vérification de la résolution Lexique-First
  const chocoIng = cazRecipe.ingredients.find(i => i.name.toLowerCase().includes('chocolat'));
  assert.strictEqual(chocoIng.quantity, '200');
  assert.strictEqual(chocoIng.unit, 'g');
  console.log('✓ Recette CuisineAZ extraite, normalisée et résolue Lexique-First avec succès');

  // ==========================================
  // Test 8 : 750g (Format @graph)
  // ==========================================
  console.log('\n--- Test 8 : Simulation Fiche 750g (@graph) ---');
  const septCentCinquanteHtml = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": "https://www.750g.com/tarte-aux-pommes"
            },
            {
              "@type": "Recipe",
              "name": "Tarte aux pommes grand-mère",
              "image": ["https://static.750g.com/tarte-grandmere.jpg"],
              "recipeYield": 6,
              "totalTime": "PT45M",
              "cookTime": "PT30M",
              "recipeCategory": "Dessert",
              "recipeIngredient": [
                "1 pâte brisée",
                "4 pommes",
                "2 sachets de sucre vanillé"
              ],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Dérouler la pâte dans un moule." },
                { "@type": "HowToStep", "text": "Couper les pommes en fines lamelles et les disposer." },
                { "@type": "HowToStep", "text": "Saupoudrer de sucre vanillé et enfourner." }
              ]
            }
          ]
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const sccRecipes = extractJsonLdRecipes(septCentCinquanteHtml);
  assert.strictEqual(sccRecipes.length, 1);
  const sccRecipe = parseRecipeJsonLd(
    sccRecipes[0],
    septCentCinquanteHtml,
    'https://www.750g.com/tarte-aux-pommes-r1234.htm'
  );

  assert.strictEqual(sccRecipe.title, 'Tarte aux pommes grand-mère');
  assert.strictEqual(sccRecipe.servings, 6);
  assert.strictEqual(sccRecipe.cookTimeMinutes, 30);
  assert.strictEqual(sccRecipe.prepTimeMinutes, 15); // Déduit : totalTime (45) - cookTime (30)
  assert.strictEqual(sccRecipe.steps.length, 3);
  console.log('✓ Recette 750g en @graph extraite avec déduction correcte du temps de préparation');

  // ==========================================
  // Test 9 : Jow (ImageObject & instructions string)
  // ==========================================
  console.log('\n--- Test 9 : Simulation Fiche Jow ---');
  const jowHtml = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "Recipe",
          "name": "Pâtes au pesto et burrata",
          "recipeYield": 2,
          "prepTime": "PT10M",
          "cookTime": "PT12M",
          "image": {
            "@type": "ImageObject",
            "url": "https://media.jow.fr/pates-burrata.jpg"
          },
          "recipeIngredient": [
            "200g de pâtes",
            "3 c. à soupe de pesto",
            "1 burrata"
          ],
          "recipeInstructions": [
            "Faites cuire les pâtes dans l'eau bouillante salée.",
            "Égouttez les pâtes et mélangez avec le pesto.",
            "Déposez la burrata par-dessus et servez !"
          ]
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const jowRecipes = extractJsonLdRecipes(jowHtml);
  assert.strictEqual(jowRecipes.length, 1);
  const jowRecipe = parseRecipeJsonLd(
    jowRecipes[0],
    jowHtml,
    'https://jow.fr/recipes/pates-au-pesto-456'
  );

  assert.strictEqual(jowRecipe.title, 'Pâtes au pesto et burrata');
  assert.strictEqual(jowRecipe.servings, 2);
  assert.strictEqual(jowRecipe.imageUrl, 'https://media.jow.fr/pates-burrata.jpg');
  assert.strictEqual(jowRecipe.steps.length, 3);
  assert.strictEqual(jowRecipe.steps[0].instruction, "Faites cuire les pâtes dans l'eau bouillante salée.");
  console.log('✓ Recette Jow avec ImageObject et instructions textuelles extraite parfaitement');

  // ==========================================
  // Test 10 : BBC Good Food & Blogs WordPress (Format anglophone & WP Recipe Maker)
  // ==========================================
  console.log('\n--- Test 10 : Simulation BBC Good Food & WordPress ---');
  const bbcHtml = `
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Recipe",
              "name": "Classic Banana Bread | BBC Good Food",
              "recipeYield": "Serves 8-10",
              "prepTime": "PT15M",
              "cookTime": "PT50M",
              "image": "https://images.immediate.co.uk/banana-bread.jpg",
              "recipeIngredient": [
                "140g butter",
                "140g caster sugar",
                "2 eggs",
                "140g flour",
                "2 bananas"
              ],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Heat oven to 180C and grease loaf tin." },
                { "@type": "HowToStep", "text": "Cream butter and sugar together until light." },
                { "@type": "HowToStep", "text": "Bake for 50 mins until golden." }
              ]
            }
          ]
        }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const bbcRecipes = extractJsonLdRecipes(bbcHtml);
  const bbcRecipe = parseRecipeJsonLd(
    bbcRecipes[0],
    bbcHtml,
    'https://www.bbcgoodfood.com/recipes/classic-banana-bread'
  );

  assert.strictEqual(bbcRecipe.title, 'Classic Banana Bread');
  assert.strictEqual(bbcRecipe.servings, 8); // Serves 8-10 -> 8
  assert.strictEqual(bbcRecipe.category, 'Dessert');
  assert.strictEqual(bbcRecipe.steps.length, 3);
  console.log('✓ Recette BBC Good Food en format anglophone extraite avec succès');

  // ==========================================
  // Test 11 : Marmiton & Galerie Photos Haute Résolution
  // ==========================================
  console.log('\n--- Test 11 : Rétrocompatibilité Marmiton & Photos ---');
  const marmitonHtml = `
    <html>
      <head>
        <meta property="og:image" content="https://assets.afcdn.com/recipe/20210101/99999_w1024h768c1.jpg" />
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Quiche Lorraine Traditionnelle - Marmiton",
          "recipeYield": "4 personnes",
          "prepTime": "PT20M",
          "cookTime": "PT35M",
          "recipeIngredient": [
            "1 pâte brisée",
            "200g de lardons",
            "3 oeufs",
            "20cl de crème fraîche"
          ],
          "recipeInstructions": [
            { "@type": "HowToStep", "text": "Étaler la pâte dans un moule à tarte." },
            { "@type": "HowToStep", "text": "Faire dorer les lardons à sec." },
            { "@type": "HowToStep", "text": "Battre les oeufs avec la crème." },
            { "@type": "HowToStep", "text": "Enfourner pour 35 min." }
          ]
        }
        </script>
      </head>
      <body>
        <img src="https://assets.afcdn.com/recipe/20220202/88888_w100h100.jpg" />
      </body>
    </html>
  `;

  const marmitonRecipes = extractJsonLdRecipes(marmitonHtml);
  const marmitonParsed = parseRecipeJsonLd(
    marmitonRecipes[0],
    marmitonHtml,
    'https://www.marmiton.org/recettes/recette_quiche-lorraine_12345.aspx'
  );

  assert.strictEqual(marmitonParsed.title, 'Quiche Lorraine Traditionnelle');
  assert.strictEqual(marmitonParsed.servings, 4);
  assert.strictEqual(marmitonParsed.category, 'Entrée'); // Quiche -> Entrée
  assert.strictEqual(marmitonParsed.imageUrl, 'https://assets.afcdn.com/recipe/20210101/99999_w1024h768c1.jpg');
  // Vérification de la conversion AFCDN haute résolution
  assert.strictEqual(
    marmitonParsed.availableImages.includes('https://assets.afcdn.com/recipe/20220202/88888_w1024h768c1.jpg'),
    true
  );
  console.log('✓ Recette Marmiton extraite avec images haute résolution dédoublonnées');

  console.log('\n🎉 TOUS LES TESTS DE WEBRECIPESERVICE (UNIVERSAL JSON-LD) ONT RÉUSSI (0 ERREUR) !');
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  try {
    fs.rmSync(path.join(__dirname, '../.tmp_test_web_recipe'), { recursive: true, force: true });
  } catch {}
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
});
