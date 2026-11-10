#!/usr/bin/env node

/**
 * Papilles - Tests unitaires de FolderService et de la persistance des dossiers (modèle N-N)
 * Vérifie le CRUD des dossiers, la multi-appartenance N-N, le calcul de 'UNCATEGORIZED',
 * la règle d'or de préservation des recettes lors de la suppression de dossier,
 * et la réactivité des listeners.
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests de FolderService (Modèle N-N & Préservation)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_folders');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/folderService.ts src/services/databaseService.ts src/services/storageService.ts src/types/folder.ts src/types/recipe.ts src/types/shopping.ts src/types/fridge.ts src/types/planner.ts src/types/mealLog.ts src/types/vocabulary.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation TypeScript de FolderService :', err.message);
    process.exit(1);
  }

  // Mock AsyncStorage en mémoire
  const memoryStore = new Map();
  const AsyncStorageMock = {
    getItem: async (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: async (key, val) => {
      memoryStore.set(key, String(val));
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

  const compiledFolderPath = path.join(tmpDir, 'services/folderService.js');
  const compiledDbPath = path.join(tmpDir, 'services/databaseService.js');
  const compiledStoragePath = path.join(tmpDir, 'services/storageService.js');

  const { FolderService } = require(compiledFolderPath);
  const { DatabaseService } = require(compiledDbPath);
  const { StorageService } = require(compiledStoragePath);

  // Initialisation de quelques recettes de test dans DatabaseService
  const initialRecipes = [
    { id: 'rec_1', title: 'Tarte aux pommes', imageUrl: 'img1.jpg', category: 'Dessert' },
    { id: 'rec_2', title: 'Fondant chocolat', imageUrl: 'img2.jpg', category: 'Dessert' },
    { id: 'rec_3', title: 'Salade césar', imageUrl: 'img3.jpg', category: 'Plat' },
    { id: 'rec_4', title: 'Pâtes carbonara', imageUrl: 'img4.jpg', category: 'Plat' },
  ];
  await DatabaseService.saveAllRecipes(initialRecipes);

  console.log('\n--- Test 1 : CRUD de base des dossiers ---');
  let folderChangeCount = 0;
  const unsubscribe = StorageService.onFoldersChange(() => {
    folderChangeCount++;
  });

  const folder1 = await FolderService.createFolder('Desserts préférés', '🍰');
  assert(folder1.id, 'Le dossier doit posséder un identifiant');
  assert.strictEqual(folder1.name, 'Desserts préférés');
  assert.strictEqual(folder1.icon, '🍰');
  assert(folderChangeCount > 0, 'Le listener de changement doit être notifié à la création');

  const folder2 = await FolderService.createFolder('Express 15min', '⏱️');
  const allFolders = await FolderService.getAllFolders();
  assert.strictEqual(allFolders.length, 2, 'Il doit y avoir 2 dossiers créés');

  // Modification
  const updatedFolder1 = await FolderService.updateFolder(folder1.id, { name: 'Desserts du dimanche', icon: '🧁' });
  assert.strictEqual(updatedFolder1.name, 'Desserts du dimanche');
  assert.strictEqual(updatedFolder1.icon, '🧁');
  console.log('✓ CRUD de base des dossiers validé');

  console.log('\n--- Test 2 : Modèle N-N (Multi-appartenance de recettes) ---');
  // rec_1 est ajoutée dans folder1 et folder2
  await FolderService.addRecipesToFolders(['rec_1'], [folder1.id, folder2.id]);
  // rec_2 est ajoutée uniquement dans folder1
  await FolderService.addRecipesToFolders(['rec_2'], [folder1.id]);

  const f1RecipeIds = await FolderService.getRecipeIdsForFolder(folder1.id);
  assert.deepStrictEqual(f1RecipeIds.sort(), ['rec_1', 'rec_2'].sort(), 'Folder 1 doit contenir rec_1 et rec_2');

  const f2RecipeIds = await FolderService.getRecipeIdsForFolder(folder2.id);
  assert.deepStrictEqual(f2RecipeIds, ['rec_1'], 'Folder 2 doit contenir rec_1');

  const r1FolderIds = await FolderService.getFolderIdsForRecipe('rec_1');
  assert.deepStrictEqual(r1FolderIds.sort(), [folder1.id, folder2.id].sort(), 'rec_1 doit appartenir aux deux dossiers');
  console.log('✓ Multi-appartenance N-N validée');

  console.log('\n--- Test 3 : Remplacement (setRecipeFolders) et Retrait ---');
  // Remplacement pour rec_1 : déplacée uniquement vers folder2
  await FolderService.setRecipeFolders('rec_1', [folder2.id]);
  const r1FoldersAfterSet = await FolderService.getFolderIdsForRecipe('rec_1');
  assert.deepStrictEqual(r1FoldersAfterSet, [folder2.id], 'rec_1 ne doit plus appartenir qu à folder2');

  // Retrait de rec_1 de folder2
  await FolderService.removeRecipesFromFolder(['rec_1'], folder2.id);
  const r1FoldersAfterRemove = await FolderService.getFolderIdsForRecipe('rec_1');
  assert.strictEqual(r1FoldersAfterRemove.length, 0, 'rec_1 ne doit plus avoir de dossier');
  console.log('✓ Remplacement et retrait validés');

  console.log('\n--- Test 4 : Calcul automatique du dossier « Non classées » (UNCATEGORIZED) ---');
  // Actuellement, seul rec_2 est dans folder1. rec_1, rec_3, rec_4 n'ont pas de dossier.
  const uncategorizedIds = await FolderService.getUncategorizedRecipeIds();
  assert(uncategorizedIds.includes('rec_1'), 'rec_1 doit être non classée');
  assert(uncategorizedIds.includes('rec_3'), 'rec_3 doit être non classée');
  assert(uncategorizedIds.includes('rec_4'), 'rec_4 doit être non classée');
  assert(!uncategorizedIds.includes('rec_2'), 'rec_2 est classée dans folder1');

  // Résumé complet des dossiers (FolderSummaries)
  const summaries = await FolderService.getFolderSummaries();
  const uncatSummary = summaries.find((s) => s.id === 'UNCATEGORIZED');
  assert(uncatSummary, 'Le résumé UNCATEGORIZED doit exister');
  assert.strictEqual(uncatSummary.recipeCount, 3, 'Il doit y avoir 3 recettes non classées');
  console.log('✓ Dossier virtuel UNCATEGORIZED et résumés validés');

  console.log('\n--- Test 5 : Règle d or de préservation des recettes lors de la suppression de dossier ---');
  // Suppression de folder1 (qui contenait rec_2)
  await FolderService.deleteFolder(folder1.id);
  const foldersAfterDelete = await FolderService.getAllFolders();
  assert.strictEqual(foldersAfterDelete.find((f) => f.id === folder1.id), undefined, 'folder1 doit être supprimé');

  // Vérification que les recettes en base sont 100% intactes
  const allRecipesAfterDelete = await DatabaseService.getRecipes();
  assert.strictEqual(allRecipesAfterDelete.length, 4, 'Les 4 recettes doivent toujours exister intactes en base');
  const rec2 = allRecipesAfterDelete.find((r) => r.id === 'rec_2');
  assert(rec2, 'rec_2 doit toujours exister');

  // rec_2 est maintenant devenue non classée
  const uncategorizedAfterFolderDelete = await FolderService.getUncategorizedRecipeIds();
  assert(uncategorizedAfterFolderDelete.includes('rec_2'), 'rec_2 est désormais non classée');
  console.log('✓ Règle d or validée : 0 recette perdue lors de la suppression de dossier');

  unsubscribe();

  // Nettoyage dossier temporaire
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n🎉 Tous les tests de FolderService ont réussi avec succès !');
}

main().catch((err) => {
  console.error('\n❌ Échec du test :', err);
  process.exit(1);
});
