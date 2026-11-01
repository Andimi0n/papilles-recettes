/**
 * Test unitaire de validation pour ImageStorageService
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Lancement des tests de ImageStorageService...');

// Compilation TypeScript temporaire
const tempOutDir = path.join(__dirname, '../.tmp_test_image_storage');
if (!fs.existsSync(tempOutDir)) {
  fs.mkdirSync(tempOutDir, { recursive: true });
}

try {
  execSync(`npx tsc src/services/imageStorageService.ts --outDir "${tempOutDir}" --target ES2020 --module CommonJS --skipLibCheck --esModuleInterop --ignoreConfig`, {
    stdio: 'inherit',
  });

  const { ImageStorageService } = require(path.join(tempOutDir, 'imageStorageService.js'));

  // Test 1: URLs distantes et inline préservées
  console.log('\n--- Test 1 : Préservation des URLs distantes et inline ---');
  const webUrl = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800';
  ImageStorageService.persistImageLocally(webUrl).then(async (res) => {
    assert.strictEqual(res, webUrl, 'Les URLs web doivent être inchangées');
    console.log('✓ URL https:// préservée');

    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const resData = await ImageStorageService.persistImageLocally(dataUri);
    assert.strictEqual(resData, dataUri, 'Les data:image/ doivent être inchangées');
    console.log('✓ URL data:image/ préservée');

    const emptyRes = await ImageStorageService.persistImageLocally('');
    assert.strictEqual(emptyRes, '', 'Les chaînes vides doivent renvoyer chaîne vide');
    console.log('✓ Chaîne vide traitée correctement');

    const nullRes = await ImageStorageService.persistImageLocally(null);
    assert.strictEqual(nullRes, '', 'Null doit renvoyer chaîne vide');
    console.log('✓ Null traité correctement');

    // Test 2: Détection de la permanence
    console.log('\n--- Test 2 : Détection de photos permanentes (isPermanent) ---');
    assert.strictEqual(ImageStorageService.isPermanent('file:///data/user/0/com.papilles/files/recipe_photos/rec_photo_123.jpg'), true);
    assert.strictEqual(ImageStorageService.isPermanent('file:///data/user/0/com.papilles/cache/ImagePicker/xyz.jpg'), false);
    assert.strictEqual(ImageStorageService.isPermanent('https://example.com/photo.jpg'), false);
    assert.strictEqual(ImageStorageService.isPermanent(null), false);
    console.log('✓ isPermanent() distingue parfaitement les chemins permanents et temporaires');

    // Test 3: Idempotence si déjà permanent
    console.log('\n--- Test 3 : Idempotence de persistImageLocally ---');
    const alreadyPermanent = 'file:///data/user/0/com.papilles/files/recipe_photos/rec_photo_999.jpg';
    const resPermanent = await ImageStorageService.persistImageLocally(alreadyPermanent);
    assert.strictEqual(resPermanent, alreadyPermanent, 'Une photo déjà permanente ne doit pas être dupliquée');
    console.log('✓ Photo déjà permanente renvoyée directement sans copie');

    // Test 4: Sécurité de cleanupRecipePhoto
    console.log('\n--- Test 4 : Sécurité de cleanupRecipePhoto ---');
    // Ne doit pas lancer d'exception sur les photos hors de notre dossier
    await ImageStorageService.cleanupRecipePhoto('file:///data/user/0/gallery/DCIM/camera.jpg');
    await ImageStorageService.cleanupRecipePhoto('https://images.unsplash.com/photo');
    await ImageStorageService.cleanupRecipePhoto(null);
    console.log('✓ cleanupRecipePhoto ignore en toute sécurité les fichiers non gérés');

    console.log('\n🎉 TOUS LES TESTS DE IMAGE STORAGE SERVICE SONT PASSÉS AVEC SUCCÈS !');
  }).catch((err) => {
    console.error('❌ Échec des tests:', err);
    process.exit(1);
  });
} finally {
  // Nettoyage après test différé ou synchrone
  setTimeout(() => {
    if (fs.existsSync(tempOutDir)) {
      fs.rmSync(tempOutDir, { recursive: true, force: true });
    }
  }, 1000);
}
