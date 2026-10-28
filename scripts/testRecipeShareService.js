#!/usr/bin/env node

/**
 * Test unitaire RecipeShareService (Deep Link, QR Code BMP, Compression & Parsing)
 */
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_recipe_share');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/recipeShareService.ts src/services/storageService.ts src/services/vocabularyService.ts src/utils/ingredientNormalizer.ts src/utils/helpers.ts src/constants/units.ts src/data/canonicalVocabulary.ts src/data/initialRecipes.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mock pour react-native et AsyncStorage
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
    Share: {
      share: async () => ({ action: 'sharedAction', activityType: null }),
    },
  };
  require.cache[require.resolve('react-native')] = {
    exports: ReactNativeMock,
  };

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
    clear: async () => {
      memoryStore.clear();
      return null;
    },
  };

  require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
    exports: { default: AsyncStorageMock, ...AsyncStorageMock },
  };

  console.log('🧪 Démarrage des tests unitaires RecipeShareService...');

  const { RecipeShareService } = require(path.join(tmpDir, 'services/recipeShareService.js'));

  const sampleRecipe = {
    id: 'rec_initial_123',
    title: 'Tarte tatin maison',
    description: 'La vraie recette de la tarte tatin aux pommes caramélisées.',
    category: 'Dessert',
    difficulty: 'Moyen',
    prepTimeMinutes: 25,
    cookTimeMinutes: 40,
    servings: 6,
    rating: 4.8,
    userNote: 'Servir tiède avec de la crème fraîche.',
    imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2',
    isVegetarian: true,
    tags: ['dessert', 'pommes', 'automne'],
    ingredients: [
      { id: 'i1', name: 'Pomme', quantity: '1.5', unit: 'kg', canonicalId: 'pomme' },
      { id: 'i2', name: 'Beurre doux', quantity: '100', unit: 'g', canonicalId: 'beurre' },
      { id: 'i3', name: 'Sucre en poudre', quantity: '150', unit: 'g', canonicalId: 'sucre', isPantryStaple: true },
      { id: 'i4', name: 'Pâte feuilletée', quantity: '1', unit: 'rouleau' },
      { id: 'i5', name: 'Cannelle', quantity: '1', unit: 'pincée', isOptional: true }
    ],
    steps: [
      { id: 's1', order: 1, instruction: 'Éplucher les pommes et les couper en gros quartiers.' },
      { id: 's2', order: 2, instruction: 'Faire un caramel avec le sucre et le beurre dans un moule à tatin.' },
      { id: 's3', order: 3, instruction: 'Disposer les pommes bien serrées sur le caramel.' },
      { id: 's4', order: 4, instruction: 'Recouvrir avec la pâte feuilletée en rentrant les bords.' },
      { id: 's5', order: 5, instruction: 'Enfourner à 180°C pendant 40 minutes.' }
    ]
  };

  // 1. Test compression & pack
  const packed = RecipeShareService.packRecipe(sampleRecipe);
  assert.strictEqual(packed.t, 'Tarte tatin maison');
  assert.strictEqual(packed.i.length, 5);
  assert.strictEqual(packed.st.length, 5);
  console.log('  ✅ 1. packRecipe compacte fidèlement la recette');

  // 2. Test Deep Link creation
  const deepLink = RecipeShareService.createShareUrl(sampleRecipe);
  assert(deepLink.startsWith('papilles://import?r='));
  assert(deepLink.length < 1000, `Lien trop long: ${deepLink.length}`);
  console.log(`  ✅ 2. createShareUrl génère un deep link valide (${deepLink.length} caractères)`);

  // 3. Test decoding from deep link
  const decoded = RecipeShareService.decodeRecipe(deepLink);
  assert(decoded !== null, 'Le décodage ne doit pas être null');
  assert.strictEqual(decoded.title, 'Tarte tatin maison');
  assert.strictEqual(decoded.prepTimeMinutes, 25);
  assert.strictEqual(decoded.cookTimeMinutes, 40);
  assert.strictEqual(decoded.servings, 6);
  assert.strictEqual(decoded.ingredients.length, 5);
  assert.strictEqual(decoded.steps.length, 5);
  assert.notStrictEqual(decoded.id, sampleRecipe.id, 'Un nouvel ID unique doit être généré');
  assert(decoded.id.startsWith('rec_'), 'ID doit être un identifiant de recette');
  console.log('  ✅ 3. decodeRecipe restaure intégralement la recette depuis le lien');

  // 4. Test QR Code BMP generation
  const bmpUri = RecipeShareService.generateRecipeQrCodeBmp(sampleRecipe);
  assert(typeof bmpUri === 'string');
  assert(bmpUri.startsWith('data:image/bmp;base64,Qk'), 'Doit être un BMP valide en base64');
  console.log(`  ✅ 4. generateRecipeQrCodeBmp produit une data URI BMP 1-bit monochrome (${bmpUri.length} octets)`);

  // 5. Test resilience with invalid inputs
  assert.strictEqual(RecipeShareService.decodeRecipe(''), null);
  assert.strictEqual(RecipeShareService.decodeRecipe('papilles://import?r=invalid_garbage!'), null);
  assert.strictEqual(RecipeShareService.decodeRecipe('https://google.com'), null);
  console.log('  ✅ 5. Résilience aux entrées corrompues ou invalides');

  // 6. Test detection of share payload
  assert(RecipeShareService.isSharePayload('papilles://import?r=123'));
  assert(RecipeShareService.isSharePayload('papilles://recipe?data=456'));
  assert(!RecipeShareService.isSharePayload('bonjour'));
  console.log('  ✅ 6. isSharePayload identifie correctement les URLs Papilles');

  // 7. Test system sharing trigger
  const shared = await RecipeShareService.shareRecipeViaSystem(sampleRecipe);
  assert.strictEqual(shared, true);
  console.log('  ✅ 7. shareRecipeViaSystem déclenche le partage natif sans erreur');

  // 8. Test SEC-04: Rejet des URIs locales système file:// dans les recettes décodées
  const payloadWithLocalFile = JSON.stringify({
    title: 'Recette piégée',
    imageUrl: 'file:///etc/passwd',
    availableImages: ['file:///data/user/0/com.app/db', 'https://example.com/ok.jpg'],
    ingredients: [],
    steps: [],
  });
  const decodedMalicious = RecipeShareService.decodeRecipe(`papilles://import?r=${encodeURIComponent(payloadWithLocalFile)}`);
  assert(decodedMalicious !== null);
  assert.strictEqual(decodedMalicious.imageUrl, '', 'imageUrl file:// doit être vidé');
  assert.strictEqual(decodedMalicious.availableImages.length, 1);
  assert.strictEqual(decodedMalicious.availableImages[0], 'https://example.com/ok.jpg');
  console.log('  ✅ 8. SEC-04 : Neutralisation stricte des URIs file:// locales dans les imports');

  // Nettoyage dossier temporaire
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  console.log('🎉 Tous les tests unitaires RecipeShareService sont passés avec succès !\n');
}

main().catch((err) => {
  console.error('❌ Échec des tests RecipeShareService:', err);
  process.exit(1);
});
