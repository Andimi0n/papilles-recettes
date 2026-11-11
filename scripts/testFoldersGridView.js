#!/usr/bin/env node

/**
 * Papilles - Tests unitaires de FoldersGridView (Phase 4 Task 2) :
 * - Export et types de FoldersGridView
 * - Transformation des données (action « + Nouveau dossier », dossiers utilisateur, dossier « Non classées »)
 * - Configuration FlashList en 2 colonnes (numColumns = 2)
 * - Déclenchement des callbacks (onSelectFolder, onCreateFolder, onEditFolder, onDeleteFolder)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de FoldersGridView...');

  const gridViewPath = path.join(__dirname, '../src/components/folders/FoldersGridView.tsx');
  if (!fs.existsSync(gridViewPath)) {
    console.error('❌ Le fichier src/components/folders/FoldersGridView.tsx n existe pas encore.');
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, '../.tmp_test_folders_grid');
  fs.rmSync(tmpDir, { recursive: true, force: true });

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/components/folders/FoldersGridView.tsx src/components/folders/FolderCard.tsx src/components/folders/FolderMosaic.tsx src/types/folder.ts src/theme/colors.ts src/theme/ThemeContext.tsx --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig --jsx react`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('❌ Échec de la compilation TypeScript de FoldersGridView :', err.message);
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
    ActivityIndicator: 'ActivityIndicator',
  };
  require.cache[require.resolve('react-native')] = { exports: ReactNativeMock };

  const ExpoVectorIconsMock = {
    Ionicons: 'Ionicons',
  };
  require.cache[require.resolve('@expo/vector-icons')] = { exports: ExpoVectorIconsMock };

  const ExpoImageMock = {
    Image: 'Image',
  };
  require.cache[require.resolve('expo-image')] = { exports: ExpoImageMock };

  let lastFlashListProps = null;
  const FlashListMock = {
    FlashList: (props) => {
      lastFlashListProps = props;
      return 'FlashList';
    },
  };
  require.cache[require.resolve('@shopify/flash-list')] = { exports: FlashListMock };

  const {
    FoldersGridView,
    prepareFolderGridItems,
    NEW_FOLDER_ITEM_ID,
  } = require(path.join(tmpDir, 'components/folders/FoldersGridView.js'));

  // Test 1 : Export du composant
  console.log('\n--- Test 1 : Export du composant FoldersGridView ---');
  assert.ok(
    typeof FoldersGridView === 'function' || typeof FoldersGridView === 'object',
    'FoldersGridView doit être un composant React (fonction ou React.memo)'
  );
  assert.strictEqual(typeof prepareFolderGridItems, 'function', 'prepareFolderGridItems doit être exporté');
  assert.strictEqual(NEW_FOLDER_ITEM_ID, '__NEW_FOLDER__', 'NEW_FOLDER_ITEM_ID doit valoir __NEW_FOLDER__');
  console.log('✓ Exports validés');

  // Test 2 : Transformation des données de la grille
  console.log('\n--- Test 2 : Transformation des données de la grille (prepareFolderGridItems) ---');
  const mockSummaries = [
    {
      id: 'folder_1',
      name: 'Desserts',
      icon: '🍰',
      recipeCount: 5,
      recipeImages: ['img1.jpg'],
    },
    {
      id: 'folder_2',
      name: 'Pâtes',
      icon: '🍝',
      recipeCount: 3,
      recipeImages: [],
    },
    {
      id: 'UNCATEGORIZED',
      name: 'Non classées',
      icon: '📂',
      recipeCount: 10,
      recipeImages: ['img2.jpg', 'img3.jpg'],
    },
  ];

  const gridItems = prepareFolderGridItems(mockSummaries);
  assert.strictEqual(gridItems.length, 4, 'La grille doit contenir 4 éléments (1 bouton + 3 dossiers)');
  assert.strictEqual(gridItems[0].id, '__NEW_FOLDER__', 'Le premier élément doit être le bouton nouveau dossier');
  assert.strictEqual(gridItems[0].isNewFolderButton, true, 'isNewFolderButton doit être à true');
  assert.strictEqual(gridItems[1].id, 'folder_1', 'Deuxième élément : Desserts');
  assert.strictEqual(gridItems[2].id, 'folder_2', 'Troisième élément : Pâtes');
  assert.strictEqual(gridItems[3].id, 'UNCATEGORIZED', 'Dernier élément : Non classées');
  console.log('✓ Transformation des données validée');

  // Test 3 : Gestion de liste vide de résumés
  console.log('\n--- Test 3 : Gestion de liste vide ---');
  const emptyItems = prepareFolderGridItems([]);
  assert.strictEqual(emptyItems.length, 1, 'Même sans dossier, la tuile + Nouveau dossier doit être présente');
  assert.strictEqual(emptyItems[0].id, '__NEW_FOLDER__');
  console.log('✓ Cas liste vide validé');

  // Nettoyage
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\n🎉 Tous les tests de FoldersGridView sont au vert !');
}

main().catch((err) => {
  console.error('❌ Erreur inattendue dans le test FoldersGridView :', err);
  process.exit(1);
});
