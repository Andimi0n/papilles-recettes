#!/usr/bin/env node

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🔄 Compilation temporaire des modules TypeScript pour test...');
  const tmpDir = path.join(__dirname, '../.tmp_test_marmiton');

  try {
    execSync(
      `npx tsc src/services/marmitonService.ts src/services/recipeAiService.ts src/utils/helpers.ts src/utils/ingredientNormalizer.ts src/types/recipe.ts src/services/vocabularyService.ts src/data/canonicalVocabulary.ts src/types/vocabulary.ts src/utils/searchEngine.ts src/utils/aisleClassifier.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Simple mock for React Native before requiring MarmitonService
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (id === 'react-native') return { Platform: { OS: 'web' } };
    if (id === '@react-native-async-storage/async-storage') return {};
    return originalRequire.apply(this, arguments);
  };

  const { MarmitonService } = require(path.join(tmpDir, 'services/marmitonService.js'));

  console.log('🧪 Lancement des tests de MarmitonService.extractMarmitonImages...');

  // 1. Image principale OpenGraph (og:image)
  const htmlOg = `
    <html>
      <head>
        <meta property="og:image" content="https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg" />
      </head>
    </html>
  `;
  const resOg = MarmitonService.extractMarmitonImages(htmlOg);
  assert.deepStrictEqual(resOg, ['https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg']);
  console.log('✓ Extraction OG Image');

  // 2. Balise og:image avec format alternatif et autres attributs
  const htmlOgAlt = `
    <meta content="https://assets.afcdn.com/recipe/20220202/67890_w1024h768c1.jpg" property="og:image" />
  `;
  const resOgAlt = MarmitonService.extractMarmitonImages(htmlOgAlt);
  assert.deepStrictEqual(resOgAlt, ['https://assets.afcdn.com/recipe/20220202/67890_w1024h768c1.jpg']);
  console.log('✓ Extraction OG Image (format alternatif)');

  // 3. Galerie de photos de la recette (class recipe-main-photo)
  const htmlGallery = `
    <div>
      <img src="https://assets.afcdn.com/recipe/20230303/11111_w1024h768c1.jpg" class="recipe-main-photo img-fluid" alt="Photo">
      <img data-src="https://assets.afcdn.com/recipe/20230303/22222_w1024h768c1.jpg" class="recipe-main-photo" alt="Photo 2">
      <img src="https://assets.afcdn.com/recipe/20230303/22222_w1024h768c1.jpg" class="recipe-main-photo">
    </div>
  `;
  const resGallery = MarmitonService.extractMarmitonImages(htmlGallery);
  assert.deepStrictEqual(resGallery, [
    'https://assets.afcdn.com/recipe/20230303/11111_w1024h768c1.jpg',
    'https://assets.afcdn.com/recipe/20230303/22222_w1024h768c1.jpg'
  ]);
  console.log('✓ Extraction Images de galerie (recipe-main-photo)');

  // 4. Schéma JSON-LD (Recipe)
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": "Tarte aux pommes",
    "image": [
      "https://assets.afcdn.com/recipe/20240404/33333_w1024h768c1.jpg",
      "https://assets.afcdn.com/recipe/20240404/44444_w1024h768c1.jpg"
    ]
  };
  const htmlJsonLd = `
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
    </script>
  `;
  const resJsonLd = MarmitonService.extractMarmitonImages(htmlJsonLd);
  assert.deepStrictEqual(resJsonLd, [
    'https://assets.afcdn.com/recipe/20240404/33333_w1024h768c1.jpg',
    'https://assets.afcdn.com/recipe/20240404/44444_w1024h768c1.jpg'
  ]);
  console.log('✓ Extraction Images JSON-LD (Recipe)');

  // 5. Cas combinés avec dédoublonnage (seenIds)
  const htmlCombined = `
    <html>
      <head>
        <meta property="og:image" content="https://assets.afcdn.com/recipe/20250505/55555_w1024h768c1.jpg" />
      </head>
      <body>
        <img src="https://assets.afcdn.com/recipe/20250505/55555_w200h200c1.jpg" class="recipe-main-photo">
        <script type="application/ld+json">
          {
            "@type": "Recipe",
            "image": "https://assets.afcdn.com/recipe/20250505/55555_w500h500c1.jpg"
          }
        </script>
        <img src="https://assets.afcdn.com/recipe/20250505/66666_w1024h768c1.jpg" class="recipe-main-photo">
      </body>
    </html>
  `;
  const resCombined = MarmitonService.extractMarmitonImages(htmlCombined);
  assert.deepStrictEqual(resCombined, [
    'https://assets.afcdn.com/recipe/20250505/55555_w1024h768c1.jpg',
    'https://assets.afcdn.com/recipe/20250505/66666_w1024h768c1.jpg'
  ]);
  console.log('✓ Extraction Combinée et dédoublonnage');

  console.log('\n🎉 TOUS LES TESTS DE MARMITON SERVICE ONT RÉUSSI (0 ERREUR) !');
}

main()
  .catch((err) => {
    console.error('\n❌ ERREUR CRITIQUE DANS LES TESTS MARMITON :', err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Nettoyage garanti
    try {
      const fs = require('fs');
      const tmpDir = path.join(__dirname, '../.tmp_test_marmiton');
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });
