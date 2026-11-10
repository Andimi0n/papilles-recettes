#!/usr/bin/env node

/**
 * Papilles - Tests unitaires de getFolderMosaicImages
 * Vérifie l'extraction des photos, le dimensionnement strict à 4 slots,
 * et le repli sur des placeholders (null) pour les dossiers incomplets ou vides.
 */

const path = require('path');
const assert = require('assert');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de getFolderMosaicImages (Mosaïque 2x2)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_folder_mosaic');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/folderMosaicHelper.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation TypeScript de folderMosaicHelper :', err.message);
    process.exit(1);
  }

  let helperModulePath = path.join(tmpDir, 'folderMosaicHelper.js');
  if (!fs.existsSync(helperModulePath)) {
    helperModulePath = path.join(tmpDir, 'utils/folderMosaicHelper.js');
  }
  const { getFolderMosaicImages } = require(helperModulePath);

  console.log('\n--- Test 1 : Liste vide, null ou undefined ---');
  assert.deepStrictEqual(
    getFolderMosaicImages([]),
    [null, null, null, null],
    'Une liste vide doit retourner 4 slots null'
  );
  assert.deepStrictEqual(
    getFolderMosaicImages(null),
    [null, null, null, null],
    'null doit retourner 4 slots null'
  );
  assert.deepStrictEqual(
    getFolderMosaicImages(undefined),
    [null, null, null, null],
    'undefined doit retourner 4 slots null'
  );
  console.log('✓ Cas liste vide / invalide validés');

  console.log('\n--- Test 2 : De 1 à 3 recettes avec photo (remplissage partiel) ---');
  const rec1 = [{ imageUrl: 'https://example.com/photo1.jpg' }];
  assert.deepStrictEqual(
    getFolderMosaicImages(rec1),
    ['https://example.com/photo1.jpg', null, null, null],
    '1 recette doit remplir le slot 0 et laisser les 3 autres à null'
  );

  const rec2 = [
    { imageUrl: 'https://example.com/p1.jpg' },
    { imageUrl: 'https://example.com/p2.jpg' },
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(rec2),
    ['https://example.com/p1.jpg', 'https://example.com/p2.jpg', null, null],
    '2 recettes doivent remplir 2 slots et laisser 2 slots null'
  );

  const rec3 = [
    { imageUrl: 'https://example.com/p1.jpg' },
    { imageUrl: 'https://example.com/p2.jpg' },
    { imageUrl: 'https://example.com/p3.jpg' },
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(rec3),
    ['https://example.com/p1.jpg', 'https://example.com/p2.jpg', 'https://example.com/p3.jpg', null],
    '3 recettes doivent remplir 3 slots et laisser 1 slot null'
  );
  console.log('✓ Remplissages partiels (1 à 3 recettes) validés');

  console.log('\n--- Test 3 : 4 recettes ou plus (mosaïque pleine) ---');
  const rec4 = [
    { imageUrl: 'https://example.com/p1.jpg' },
    { imageUrl: 'https://example.com/p2.jpg' },
    { imageUrl: 'https://example.com/p3.jpg' },
    { imageUrl: 'https://example.com/p4.jpg' },
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(rec4),
    ['https://example.com/p1.jpg', 'https://example.com/p2.jpg', 'https://example.com/p3.jpg', 'https://example.com/p4.jpg'],
    '4 recettes doivent saturer les 4 slots sans null'
  );

  const rec6 = [
    { imageUrl: 'https://example.com/p1.jpg' },
    { imageUrl: 'https://example.com/p2.jpg' },
    { imageUrl: 'https://example.com/p3.jpg' },
    { imageUrl: 'https://example.com/p4.jpg' },
    { imageUrl: 'https://example.com/p5.jpg' },
    { imageUrl: 'https://example.com/p6.jpg' },
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(rec6),
    ['https://example.com/p1.jpg', 'https://example.com/p2.jpg', 'https://example.com/p3.jpg', 'https://example.com/p4.jpg'],
    'Plus de 4 recettes doit être tronqué aux 4 premières photos'
  );
  console.log('✓ Mosaïque pleine et troncature à 4 validées');

  console.log('\n--- Test 4 : Filtrage des images vides ou recettes sans image ---');
  const recWithGaps = [
    { imageUrl: 'https://example.com/p1.jpg' },
    { imageUrl: '' },
    { imageUrl: null },
    { title: 'Sans image' },
    { imageUrl: '   ' },
    { imageUrl: 'https://example.com/p2.jpg' },
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(recWithGaps),
    ['https://example.com/p1.jpg', 'https://example.com/p2.jpg', null, null],
    'Les recettes sans image valide doivent être ignorées'
  );
  console.log('✓ Filtrage des images vides et non valides validé');

  console.log('\n--- Test 5 : Support de chaînes directes ou objets Recipe ---');
  const directStrings = [
    'https://example.com/str1.jpg',
    'https://example.com/str2.jpg',
  ];
  assert.deepStrictEqual(
    getFolderMosaicImages(directStrings),
    ['https://example.com/str1.jpg', 'https://example.com/str2.jpg', null, null],
    'Doit supporter directement un tableau de chaînes d\'URLs'
  );
  console.log('✓ Support chaînes directes validé');

  console.log('\n🎉 Tous les tests de getFolderMosaicImages ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec des tests getFolderMosaicImages :', err);
  process.exit(1);
});
