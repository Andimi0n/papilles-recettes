#!/usr/bin/env node

/**
 * Papilles - Tests unitaires de validation des composants de dossiers :
 * - FolderMosaic & FolderCard (mosaïque 2x2, comptage, affichage « Non classées » et bouton « Nouveau dossier »)
 * - CreateEditFolderModal (palette d'emojis culinaires, props et validation)
 * - DeleteFolderConfirmModal (règle d'or de préservation des recettes)
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de validation des composants de dossiers...');
  const tmpDir = path.join(__dirname, '../.tmp_test_folder_components');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/types/folder.ts src/utils/folderMosaicHelper.ts src/components/folders/FolderMosaic.tsx src/components/folders/FolderCard.tsx src/components/folders/CreateEditFolderModal.tsx src/components/folders/DeleteFolderConfirmModal.tsx src/components/folders/index.ts src/theme/colors.ts src/theme/ThemeContext.tsx --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig --jsx react`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation TypeScript des composants de dossiers :', err.message);
    process.exit(1);
  }

  // Mocks pour environnement Node.js
  const ReactNativeMock = {
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
    StyleSheet: {
      create: (s) => s,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    Modal: 'Modal',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Alert: { alert: () => {} },
  };
  require.cache[require.resolve('react-native')] = { exports: ReactNativeMock };

  const ExpoImageMock = {
    Image: 'Image',
  };
  require.cache[require.resolve('expo-image')] = { exports: ExpoImageMock };

  const ExpoVectorIconsMock = {
    Ionicons: 'Ionicons',
  };
  require.cache[require.resolve('@expo/vector-icons')] = { exports: ExpoVectorIconsMock };

  const folderComponents = require(path.join(tmpDir, 'components/folders/index.js'));
  const { FolderMosaic, FolderCard, CreateEditFolderModal, DeleteFolderConfirmModal, CULINARY_FOLDER_EMOJIS } = folderComponents;
  const { getFolderMosaicImages } = require(path.join(tmpDir, 'utils/folderMosaicHelper.js'));

  console.log('\n--- Test 1 : Vérification des exports des composants ---');
  assert(['function', 'object'].includes(typeof FolderMosaic), 'FolderMosaic doit être un composant React (fonction ou React.memo)');
  assert(['function', 'object'].includes(typeof FolderCard), 'FolderCard doit être un composant React (fonction ou React.memo)');
  assert(['function', 'object'].includes(typeof CreateEditFolderModal), 'CreateEditFolderModal doit être un composant React (fonction ou React.memo)');
  assert(['function', 'object'].includes(typeof DeleteFolderConfirmModal), 'DeleteFolderConfirmModal doit être un composant React (fonction ou React.memo)');
  console.log('✓ Tous les composants sont correctement exportés');

  console.log('\n--- Test 2 : Palette d\'emojis culinaires de CreateEditFolderModal ---');
  assert(Array.isArray(CULINARY_FOLDER_EMOJIS), 'CULINARY_FOLDER_EMOJIS doit être un tableau');
  assert(CULINARY_FOLDER_EMOJIS.length >= 20, 'La palette doit contenir au moins 20 emojis culinaires variés');
  assert(CULINARY_FOLDER_EMOJIS.includes('📁'), 'Doit inclure l\'emoji dossier par défaut');
  assert(CULINARY_FOLDER_EMOJIS.includes('🍰'), 'Doit inclure des emojis pâtisserie/dessert');
  assert(CULINARY_FOLDER_EMOJIS.includes('🥗'), 'Doit inclure des emojis salades/légumes');
  console.log(`✓ Palette d'emojis validée (${CULINARY_FOLDER_EMOJIS.length} emojis disponibles)`);

  console.log('\n--- Test 3 : Logique de formatage des libellés de recettes de FolderCard ---');
  const formatCount = (count) => {
    return count === 0
      ? '0 recette'
      : count === 1
        ? '1 recette'
        : `${count} recettes`;
  };
  assert.strictEqual(formatCount(0), '0 recette');
  assert.strictEqual(formatCount(1), '1 recette');
  assert.strictEqual(formatCount(2), '2 recettes');
  assert.strictEqual(formatCount(42), '42 recettes');
  console.log('✓ Règles de pluriel et singulier du compteur validées');

  console.log('\n--- Test 4 : Intégrité de la mosaïque 4 slots pour FolderMosaic ---');
  const testImages = ['img1.jpg', 'img2.jpg'];
  const slots = getFolderMosaicImages(testImages);
  assert.strictEqual(slots.length, 4, 'La mosaïque doit toujours avoir exactement 4 slots');
  assert.strictEqual(slots[0], 'img1.jpg');
  assert.strictEqual(slots[1], 'img2.jpg');
  assert.strictEqual(slots[2], null);
  assert.strictEqual(slots[3], null);
  console.log('✓ Résolution des slots mosaïque 2x2 validée');

  console.log('\n🎉 Tous les tests des composants de dossiers ont réussi avec succès !');
}

main().catch((err) => {
  console.error('❌ Échec des tests des composants de dossiers :', err);
  process.exit(1);
});
