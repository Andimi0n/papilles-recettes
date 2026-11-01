/**
 * Test unitaire de validation pour RecipePackService
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const JSZip = require('jszip');

console.log('🧪 Lancement des tests de RecipePackService...');

const tempOutDir = path.join(__dirname, '../.tmp_test_recipe_pack');
if (!fs.existsSync(tempOutDir)) {
  fs.mkdirSync(tempOutDir, { recursive: true });
}

async function runTests() {
  try {
    execSync(`npx tsc src/services/recipePackService.ts --outDir "${tempOutDir}" --target ES2020 --module CommonJS --skipLibCheck --esModuleInterop --ignoreConfig`, {
      stdio: 'pipe',
    });

    const { RecipePackService } = require(path.join(tempOutDir, 'recipePackService.js'));

    // Test 1: Parsing d'un JSON brut valide (tableau ou objet avec recipes)
    console.log('\n--- Test 1 : Parsing de JSON direct ---');
    const validJsonArray = JSON.stringify([
      { id: 'rec_1', title: 'Tarte aux pommes', ingredients: [{ name: 'Pomme' }], steps: ['Cuire'] },
      { id: 'rec_2', title: 'Quiche Lorraine', ingredients: [{ name: 'Lardons' }], steps: ['Mélanger'] },
    ]);
    const res1 = await RecipePackService.parsePackFromJson(validJsonArray);
    assert.strictEqual(res1.recipes.length, 2, 'Doit extraire 2 recettes du tableau JSON');
    assert.strictEqual(res1.images.size, 0, 'Aucune image dans un JSON brut sans zip');
    console.log('✓ Parsing JSON tableau valide OK');

    const validJsonObject = JSON.stringify({
      recipes: [
        { id: 'rec_3', title: 'Salade de tomates', ingredients: [{ name: 'Tomate' }], steps: ['Couper'] },
      ],
    });
    const res2 = await RecipePackService.parsePackFromJson(validJsonObject);
    assert.strictEqual(res2.recipes.length, 1, 'Doit extraire 1 recette de { recipes: [...] }');
    console.log('✓ Parsing JSON objet avec clé recipes OK');

    // Test 2: Rejet des JSON invalides ou vides
    console.log('\n--- Test 2 : Rejet des JSON invalides ou sans recettes ---');
    await assert.rejects(
      async () => await RecipePackService.parsePackFromJson('ceci n est pas du json'),
      /invalide|erreur|JSON/i,
      'Doit lever une exception sur JSON mal formé'
    );
    await assert.rejects(
      async () => await RecipePackService.parsePackFromJson(JSON.stringify({ autre: 'champ' })),
      /aucune recette/i,
      'Doit lever une exception si aucune recette'
    );
    console.log('✓ Rejet des JSON invalides OK');

    // Test 3: Détection de Zip Slip
    console.log('\n--- Test 3 : Détection de vulnérabilité Zip Slip ---');
    const maliciousZip = new JSZip();
    maliciousZip.file('../malicious.txt', 'evil content');
    maliciousZip.file('recipes.json', validJsonArray);
    const maliciousZipBuffer = await maliciousZip.generateAsync({ type: 'nodebuffer' });

    await assert.rejects(
      async () => await RecipePackService.extractPackFromZipBuffer(maliciousZipBuffer),
      /Zip Slip|chemin non sécurisé|interdit/i,
      'Doit bloquer toute tentative de Zip Slip'
    );
    console.log('✓ Détection Zip Slip bloquée avec succès');

    // Test 4: Extraction d'un ZIP valide avec recettes et dossier photos/
    console.log('\n--- Test 4 : Extraction d un ZIP complet avec recettes et photos ---');
    const validZip = new JSZip();
    const mockRecipes = [
      { id: 'r1', title: 'Clafoutis cerises', imageUrl: 'photos/clafoutis.jpg', ingredients: [], steps: [] },
      { id: 'r2', title: 'Fondant chocolat', imageUrl: 'chocolat.png', ingredients: [], steps: [] },
      { id: 'r3', title: 'Pain perdu', ingredients: [], steps: [] }, // Image matchée par ID : photos/r3.jpg
    ];
    validZip.file('recipes.json', JSON.stringify(mockRecipes));
    validZip.folder('photos').file('clafoutis.jpg', Buffer.from('fake-clafoutis-img'));
    validZip.folder('photos').file('chocolat.png', Buffer.from('fake-chocolat-img'));
    validZip.folder('photos').file('r3.jpg', Buffer.from('fake-r3-img'));

    const validZipBuffer = await validZip.generateAsync({ type: 'nodebuffer' });
    const packResult = await RecipePackService.extractPackFromZipBuffer(validZipBuffer);

    assert.strictEqual(packResult.recipes.length, 3, 'Doit extraire 3 recettes du ZIP');
    assert.strictEqual(packResult.images.size, 3, 'Doit extraire 3 images du ZIP');

    const clafoutisImg = RecipePackService.findImageBytes(packResult.images, 'photos/clafoutis.jpg');
    assert.ok(clafoutisImg && clafoutisImg.fileName === 'clafoutis.jpg', 'Image clafoutis résolue');

    const chocolatImg = RecipePackService.findImageBytes(packResult.images, 'chocolat.png');
    assert.ok(chocolatImg && chocolatImg.fileName === 'chocolat.png', 'Image chocolat résolue par nom simple');

    const r3Img = RecipePackService.findImageBytes(packResult.images, 'r3');
    assert.ok(r3Img && r3Img.fileName === 'r3.jpg', 'Image r3 résolue par ID de recette sans extension');
    console.log('✓ Extraction ZIP complet avec photos et résolution findImageBytes OK');

    // Test 5: Traitement séquentiel par petits lots
    console.log('\n--- Test 5 : Traitement séquentiel et libération mémoire par lots ---');
    const largeZip = new JSZip();
    const batchRecipes = [];
    const photosFolder = largeZip.folder('photos');
    for (let i = 1; i <= 12; i++) {
      batchRecipes.push({ id: `batch_${i}`, title: `Recette ${i}`, imageUrl: `photos/img_${i}.jpg` });
      photosFolder.file(`img_${i}.jpg`, Buffer.alloc(100, i)); // 100 bytes chaque
    }
    largeZip.file('pack.json', JSON.stringify(batchRecipes));
    const largeZipBuffer = await largeZip.generateAsync({ type: 'nodebuffer' });

    let batchCount = 0;
    const batchResult = await RecipePackService.extractPackFromZipBuffer(largeZipBuffer, {
      batchSize: 4,
      onBatchProcessed: (processed, total) => {
        batchCount++;
      },
    });
    assert.strictEqual(batchResult.recipes.length, 12, 'Toutes les recettes extraites');
    assert.strictEqual(batchResult.images.size, 12, 'Toutes les images extraites');
    assert.ok(batchCount >= 3, 'Traitement bien découpé en plusieurs lots séquentiels');
    console.log(`✓ Traitement par lots de 4 vérifié (${batchCount} lots traités)`);

    console.log('\n🎉 TOUS LES TESTS DE RecipePackService SONT AU VERT !');
  } finally {
    try {
      fs.rmSync(tempOutDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runTests().catch((err) => {
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
});
