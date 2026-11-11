#!/usr/bin/env node

/**
 * Papilles - Tests unitaires du Pager Gestuel Filtré & Sélecteur Segmenté (Phase 4 Task 1) :
 * - Règle de swipe horizontal strict (|dx| > 25 && |dx| > |dy| * 2)
 * - Exclusion stricte de la zone du bandeau de filtres (FILTER_BAR_HEIGHT = 88)
 * - Directionnalité selon l'onglet actif (recipes <-> folders)
 * - Désactivation en mode sélection ou modal ouverte
 * - Calcul de destination sur release (flick vx ou distance > 35%)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('🧪 Lancement des tests de HomePagerHelper (Navigation Gestuelle & Sélecteur)...');

  const helperPath = path.join(__dirname, '../src/utils/homePagerHelper.ts');
  if (!fs.existsSync(helperPath)) {
    console.error('❌ Le fichier src/utils/homePagerHelper.ts n existe pas encore.');
    process.exit(1);
  }

  const tmpDir = path.join(__dirname, '../.tmp_test_home_pager');
  fs.rmSync(tmpDir, { recursive: true, force: true });

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/utils/homePagerHelper.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('❌ Échec de compilation TypeScript de homePagerHelper.ts :', err.message);
    process.exit(1);
  }

  const {
    shouldCaptureHomeTabSwipe,
    calculateHomeTabSwipeDestination,
  } = require(path.join(tmpDir, 'homePagerHelper.js'));

  // Test 1 : Seuil minimal dx > 25
  console.log('\n--- Test 1 : Seuil minimal dx > 25 ---');
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -20, dy: 0 },
      activeTab: 'recipes',
      locationY: 120,
    }),
    false,
    'Un swipe dx = -20 (<= 25) ne doit pas être capturé'
  );
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: 20, dy: 0 },
      activeTab: 'folders',
      locationY: 120,
    }),
    false,
    'Un swipe dx = 20 (<= 25) ne doit pas être capturé'
  );
  console.log('✓ Seuil minimal validé');

  // Test 2 : Ratio horizontal/vertical (|dx| > |dy| * 2)
  console.log('\n--- Test 2 : Ratio horizontal/vertical (|dx| > |dy| * 2) ---');
  // dx = -30, dy = 20 -> |dx| = 30 <= 20 * 2 (40) -> false
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -30, dy: 20 },
      activeTab: 'recipes',
      locationY: 120,
    }),
    false,
    'Un mouvement diagonal avec |dx| <= |dy| * 2 ne doit pas être capturé'
  );
  // dx = -50, dy = 20 -> |dx| = 50 > 20 * 2 (40) -> true
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -50, dy: 20 },
      activeTab: 'recipes',
      locationY: 120,
    }),
    true,
    'Un swipe horizontal franc (|dx| > |dy| * 2) doit être capturé'
  );
  console.log('✓ Ratio horizontal/vertical validé');

  // Test 3 : Exclusion stricte de la zone des filtres (FILTER_BAR_HEIGHT = 88)
  console.log('\n--- Test 3 : Exclusion stricte de la zone des filtres (FILTER_BAR_HEIGHT = 88) ---');
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 45, // Dans la zone de filtres [0, 88]
      filterBarHeight: 88,
    }),
    false,
    'Un geste démarrant dans la zone des filtres (locationY <= 88) ne doit JAMAIS être capturé'
  );
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 88, // Frontière
      filterBarHeight: 88,
    }),
    false,
    'Geste sur la frontière y = 88 exclu'
  );
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 89, // En-dessous
      filterBarHeight: 88,
    }),
    true,
    'Geste sous la zone des filtres (y > 88) doit être capturé'
  );
  console.log('✓ Exclusion de la zone des filtres validée');

  // Test 4 : Directionnalité selon l'onglet actif
  console.log('\n--- Test 4 : Directionnalité selon onglet actif ---');
  // Sur 'recipes' : swiper vers la droite (dx > 25) ne doit rien faire (déjà tout à gauche)
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: 60, dy: 0 },
      activeTab: 'recipes',
      locationY: 120,
    }),
    false,
    'Swiper vers la droite sur recipes ne doit pas être capturé'
  );
  // Sur 'folders' : swiper vers la gauche (dx < -25) ne doit rien faire (déjà tout à droite)
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'folders',
      locationY: 120,
    }),
    false,
    'Swiper vers la gauche sur folders ne doit pas être capturé'
  );
  // Sur 'folders' : swiper vers la droite (dx > 25) doit être capturé
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: 60, dy: 0 },
      activeTab: 'folders',
      locationY: 120,
    }),
    true,
    'Swiper vers la droite sur folders doit être capturé'
  );
  console.log('✓ Directionnalité validée');

  // Test 5 : Désactivation en mode sélection ou modal
  console.log('\n--- Test 5 : Gardes (mode sélection, modales & dossier actif) ---');
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 120,
      isSelectionMode: true,
    }),
    false,
    'Le swipe doit être désactivé si isSelectionMode = true'
  );
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 120,
      isModalOpen: true,
    }),
    false,
    'Le swipe doit être désactivé si une modal est ouverte'
  );
  assert.strictEqual(
    shouldCaptureHomeTabSwipe({
      gestureState: { dx: -60, dy: 0 },
      activeTab: 'recipes',
      locationY: 120,
      activeFolderId: 'folder_desserts',
    }),
    false,
    'Le swipe doit être désactivé si activeFolderId est défini'
  );
  console.log('✓ Gardes validées');

  // Test 6 : Calcul de la destination au relâchement
  console.log('\n--- Test 6 : Calcul de destination (distance > 35% ou flick vx) ---');
  const width = 400;
  // recipes -> flick gauche
  assert.strictEqual(
    calculateHomeTabSwipeDestination('recipes', -30, -0.4, width),
    'folders',
    'Flick gauche rapide doit basculer vers folders'
  );
  // recipes -> swipe lent mais > 35% (150px > 140px)
  assert.strictEqual(
    calculateHomeTabSwipeDestination('recipes', -150, -0.1, width),
    'folders',
    'Swipe > 35% doit basculer vers folders'
  );
  // recipes -> swipe court lent (dx = -50, vx = -0.1)
  assert.strictEqual(
    calculateHomeTabSwipeDestination('recipes', -50, -0.1, width),
    'recipes',
    'Swipe insuffisant doit rester sur recipes'
  );
  // folders -> flick droite
  assert.strictEqual(
    calculateHomeTabSwipeDestination('folders', 30, 0.4, width),
    'recipes',
    'Flick droite rapide doit basculer vers recipes'
  );
  // folders -> swipe lent > 35%
  assert.strictEqual(
    calculateHomeTabSwipeDestination('folders', 150, 0.1, width),
    'recipes',
    'Swipe > 35% doit basculer vers recipes'
  );
  // folders -> swipe court lent
  assert.strictEqual(
    calculateHomeTabSwipeDestination('folders', 50, 0.1, width),
    'folders',
    'Swipe insuffisant doit rester sur folders'
  );
  console.log('✓ Calculs de destination validés');

  // Nettoyage
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('\n🎉 Tous les tests de HomePagerHelper sont au vert !');
}

main().catch((err) => {
  console.error('❌ Erreur inattendue dans le test :', err);
  process.exit(1);
});
