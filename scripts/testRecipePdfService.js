#!/usr/bin/env node

/**
 * Test unitaire RecipePdfService (Génération HTML A4, colonnes d'ingrédients, portions, QR code et sanitization)
 */
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_recipe_pdf');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/recipePdfService.ts src/services/recipeShareService.ts src/services/storageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/helpers.ts src/constants/units.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mocks pour l'environnement Node CLI
  require.cache[require.resolve('react-native')] = {
    exports: {
      Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
      Share: { share: async () => ({}) },
    },
  };

  const memoryStore = new Map();
  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: {
      default: {
        getItem: async (k) => memoryStore.get(k) || null,
        setItem: async (k, v) => { memoryStore.set(k, v); return null; },
        removeItem: async (k) => { memoryStore.delete(k); return null; },
        clear: async () => { memoryStore.clear(); return null; },
      },
    },
  };

  require.cache[require.resolve('expo-secure-store')] = {
    exports: {
      getItemAsync: async () => null,
      setItemAsync: async () => null,
      deleteItemAsync: async () => null,
    },
  };

  let printCallCount = 0;
  let printToFileCallCount = 0;
  let shareAsyncCallCount = 0;

  require.cache[require.resolve('expo-print')] = {
    exports: {
      printAsync: async (options) => {
        printCallCount++;
        return options;
      },
      printToFileAsync: async (options) => {
        printToFileCallCount++;
        return { uri: 'file:///tmp/recette_test.pdf', numberOfPages: 1 };
      },
    },
  };

  require.cache[require.resolve('expo-sharing')] = {
    exports: {
      isAvailableAsync: async () => true,
      shareAsync: async (uri, options) => {
        shareAsyncCallCount++;
        return true;
      },
    },
  };

  require.cache[require.resolve('expo-image-manipulator')] = {
    exports: {
      SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
      manipulateAsync: async (uri) => ({
        uri,
        base64: 'FAKE_BASE64_IMAGE_DATA',
        width: 800,
        height: 600,
      }),
    },
  };

  const { RecipePdfService } = require(path.join(tmpDir, 'services/recipePdfService.js'));

  try {
    const mockRecipe = {
      id: 'rec_pasta_carbonara',
      title: 'Spaghetti alla Carbonara <Authentique>',
      description: 'La véritable recette romaine sans crème fraîche & avec amour.',
      category: 'Plat',
      difficulty: 'Moyen',
      prepTimeMinutes: 15,
      cookTimeMinutes: 12,
      servings: 4,
      rating: 4.8,
      userNote: 'Ne jamais faire bouillir les jaunes d\'œufs ! Couper le feu avant d\'incorporer le mélange.',
      imageUrl: 'https://images.unsplash.com/photo-spaghetti-carbonara',
      isVegetarian: false,
      tags: ['italien', 'pâtes', 'rapide'],
      ingredients: [
        { id: 'i1', name: 'Spaghetti', quantity: '400', unit: 'g', canonicalId: 'spaghetti' },
        { id: 'i2', name: 'Guanciale ou Pancetta', quantity: '150', unit: 'g', canonicalId: 'guanciale' },
        { id: 'i3', name: 'Jaunes d\'œufs', quantity: '4', unit: 'pièces', canonicalId: 'oeuf' },
        { id: 'i4', name: 'Pecorino Romano', quantity: '60', unit: 'g', canonicalId: 'pecorino' },
        { id: 'i5', name: 'Poivre noir moulu', quantity: '', unit: '', isPantryStaple: true },
        { id: 'i6', name: 'Persil plat', quantity: '', unit: '', isOptional: true },
      ],
      steps: [
        { id: 's1', order: 1, instruction: 'Porter une grande casserole d\'eau salée à ébullition et plonger les spaghetti.' },
        { id: 's2', order: 2, instruction: 'Faire dorer le guanciale dans une poêle sans matière grasse jusqu\'à ce qu\'il soit croustillant.' },
        { id: 's3', order: 3, instruction: 'Mélanger les jaunes avec le pecorino râpé et beaucoup de poivre noir.' },
      ],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    console.log('--- TEST 1: Génération HTML A4 & structure générale ---');
    const html = await RecipePdfService.generateRecipeHtml(mockRecipe);
    assert(html.includes('<!DOCTYPE html>'), 'Doit générer un document HTML5 valide');
    assert(html.includes('@page {'), 'Doit contenir les règles CSS @page');
    assert(html.includes('size: A4 portrait;'), 'Doit être configuré en format A4 portrait');
    assert(html.includes('column-count: 2;'), 'Doit formater les ingrédients sur 2 colonnes');
    console.log('✓ Structure A4 et colonnes validées.');

    console.log('--- TEST 2: Échappement HTML (XSS prevention) ---');
    assert(html.includes('&lt;Authentique&gt;'), 'Le titre doit avoir ses balises HTML échappées');
    assert(!html.includes('<Authentique>'), 'Les balises brutes ne doivent pas être injectées');
    assert(html.includes('sans crème fraîche &amp; avec amour'), 'L\'esperluette doit être échappée');
    console.log('✓ Sécurité échappement HTML validée.');

    console.log('--- TEST 3: Recalcul des portions pour l\'impression ---');
    const htmlScaled = await RecipePdfService.generateRecipeHtml(mockRecipe, { servings: 8 });
    // Pour 4 convives : 400g spaghetti -> pour 8 convives : 800 g
    assert(htmlScaled.includes('800 g'), 'La quantité doit être doublée pour 8 convives');
    assert(htmlScaled.includes('300 g'), 'Guanciale 150g -> 300g');
    assert(htmlScaled.includes('8 pièces'), '4 jaunes -> 8 pièces');
    assert(htmlScaled.includes('8 pers.'), 'Le badge convives doit afficher 8 pers.');
    console.log('✓ Mise à l\'échelle dynamique des convives validée.');

    console.log('--- TEST 4: Note personnelle et lignes manuscrites ---');
    assert(html.includes('Ne jamais faire bouillir les jaunes'), 'La note personnelle doit être présente');
    assert(html.includes('<div class="handwritten-line"></div>'), 'Les lignes de notes manuscrites doivent être présentes');

    const htmlNoNotesLines = await RecipePdfService.generateRecipeHtml(mockRecipe, { includeNotesLines: false });
    assert(!htmlNoNotesLines.includes('<div class="handwritten-line"></div>'), 'Les balises de lignes manuscrites doivent être absentes quand désactivées');
    console.log('✓ Gestion des notes et lignes manuscrites validée.');

    console.log('--- TEST 5: QR code et photo ---');
    assert(html.includes('data:image/bmp;base64,'), 'Doit contenir le QR code monochrome Papilles');
    assert(html.includes('class="hero-photo"'), 'Doit contenir la photo si includePhoto=true');

    const htmlNoPhoto = await RecipePdfService.generateRecipeHtml(mockRecipe, { includePhoto: false });
    assert(!htmlNoPhoto.includes('class="hero-photo"'), 'La balise photo doit être absente quand includePhoto=false');

    const htmlNoQr = await RecipePdfService.generateRecipeHtml(mockRecipe, { includeQrCode: false });
    assert(!htmlNoQr.includes('class="footer-qr-img"'), 'Le QR code doit être absent quand includeQrCode=false');
    console.log('✓ Activation/désactivation photo et QR code validées.');

    console.log('--- TEST 6: Appels natifs printRecipe & exportPdf ---');
    await RecipePdfService.printRecipe(mockRecipe);
    assert.strictEqual(printCallCount, 1, 'printRecipe doit appeler Print.printAsync');

    const pdfUri = await RecipePdfService.exportPdf(mockRecipe);
    assert.strictEqual(printToFileCallCount, 1, 'exportPdf doit appeler Print.printToFileAsync');
    assert.strictEqual(shareAsyncCallCount, 1, 'exportPdf doit appeler Sharing.shareAsync');
    assert.strictEqual(pdfUri, 'file:///tmp/recette_test.pdf');
    console.log('✓ Intégration printAsync et printToFileAsync validée.');

    console.log('\n✅ Tous les tests RecipePdfService ont réussi avec succès !');
  } finally {
    // Nettoyage dossier temporaire
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Échec des tests RecipePdfService :', err);
  process.exit(1);
});
