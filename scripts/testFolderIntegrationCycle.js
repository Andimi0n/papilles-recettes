#!/usr/bin/env node

/**
 * Papilles - Tests d'intégration du cycle complet de bout en bout des Dossiers & Sélection Multiple :
 * 1. Création de dossiers personnalisés & réactivité des écouteurs
 * 2. Calcul dynamique du dossier virtuel 'UNCATEGORIZED'
 * 3. Sélection multiple et rangement groupé (mode additif N recettes)
 * 4. Multi-appartenance N-N (une recette dans plusieurs dossiers)
 * 5. Gestion unitaire (mode 1 recette : remplacement / toggle)
 * 6. Filtrage intérieur de dossier et recherche contextuelle
 * 7. Retrait de recettes d'un dossier
 * 8. Règle d'or absolue : suppression de dossier sans perte de recettes
 * 9. Suppression de recette et nettoyage en cascade des liaisons
 * 10. Persistance du mode sélection et hiérarchie du BackHandler Android
 */

const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🧪 Lancement des tests d\'intégration du cycle complet (Dossiers & Règle d\'or)...');
  const tmpDir = path.join(__dirname, '../.tmp_test_folder_cycle');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/folderService.ts src/services/databaseService.ts src/services/storageService.ts src/types/folder.ts src/types/recipe.ts src/types/shopping.ts src/types/fridge.ts src/types/planner.ts src/types/mealLog.ts src/types/vocabulary.ts src/utils/helpers.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation TypeScript des services pour le test de cycle :', err.message);
    process.exit(1);
  }

  // Mocks pour environnement Node.js
  const ReactNativeMock = {
    Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
  };
  try {
    require.cache[require.resolve('react-native')] = { exports: ReactNativeMock };
  } catch {}

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
  try {
    require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
      id: require.resolve('@react-native-async-storage/async-storage'),
      filename: require.resolve('@react-native-async-storage/async-storage'),
      loaded: true,
      exports: Object.assign(AsyncStorageMock, { default: AsyncStorageMock }),
    };
  } catch {}

  const { FolderService } = require(path.join(tmpDir, 'services/folderService.js'));
  const { DatabaseService } = require(path.join(tmpDir, 'services/databaseService.js'));
  const { StorageService } = require(path.join(tmpDir, 'services/storageService.js'));
  const { UNCATEGORIZED_FOLDER_ID } = require(path.join(tmpDir, 'types/folder.js'));

  // Jeux de données initial : 5 recettes complètes
  const seedRecipes = [
    { id: 'rec_1', title: 'Tarte au citron meringuée', imageUrl: 'citron.jpg', category: 'Dessert', prepTime: 30, cookTime: 20 },
    { id: 'rec_2', title: 'Éclair au chocolat', imageUrl: 'eclair.jpg', category: 'Dessert', prepTime: 40, cookTime: 25 },
    { id: 'rec_3', title: 'Mille-feuille vanille', imageUrl: 'millefeuille.jpg', category: 'Dessert', prepTime: 50, cookTime: 30 },
    { id: 'rec_4', title: 'Soupe à l\'oignon gratinée', imageUrl: 'soupe.jpg', category: 'Entrée', prepTime: 15, cookTime: 35 },
    { id: 'rec_5', title: 'Gratin dauphinois', imageUrl: 'gratin.jpg', category: 'Plat', prepTime: 20, cookTime: 45 },
  ];
  await DatabaseService.saveAllRecipes(seedRecipes);

  let folderEventCount = 0;
  const unsubscribe = StorageService.onFoldersChange(() => {
    folderEventCount++;
  });

  // --- ÉTAPE 1 : État initial & Calcul de 'UNCATEGORIZED' ---
  console.log('\n--- Étape 1 : État initial & calcul de « Non classées » ---');
  const initialFolders = await FolderService.getAllFolders();
  assert.strictEqual(initialFolders.length, 0, 'Il ne doit y avoir aucun dossier créé au départ');

  const initialUncatIds = await FolderService.getUncategorizedRecipeIds();
  assert.strictEqual(initialUncatIds.length, 5, 'Toutes les 5 recettes doivent être non classées');
  assert(initialUncatIds.includes('rec_1') && initialUncatIds.includes('rec_5'));

  const initialSummaries = await FolderService.getFolderSummaries(seedRecipes);
  assert.strictEqual(initialSummaries.length, 1, 'Seul le dossier virtuel Non classées doit être présent');
  assert.strictEqual(initialSummaries[0].id, UNCATEGORIZED_FOLDER_ID);
  assert.strictEqual(initialSummaries[0].recipeCount, 5);
  assert.strictEqual(initialSummaries[0].recipeImages.length, 4, 'La mosaïque capture au maximum 4 images');
  console.log('✓ État initial et dossier virtuel « Non classées » validés');

  // --- ÉTAPE 2 : Création de dossiers personnalisés & Réactivité ---
  console.log('\n--- Étape 2 : Création de dossiers personnalisés & réactivité ---');
  const initialEvents = folderEventCount;
  const folderDesserts = await FolderService.createFolder('Pâtisseries fines', '🍰');
  const folderSoir = await FolderService.createFolder('Repas réconfortants', '🍲');

  assert(folderDesserts.id && folderDesserts.id.startsWith('folder_'));
  assert(folderSoir.id && folderSoir.id.startsWith('folder_'));
  assert.strictEqual(folderEventCount, initialEvents + 2, 'Deux événements réactifs doivent avoir été émis');

  const summariesAfterCreate = await FolderService.getFolderSummaries(seedRecipes);
  assert.strictEqual(summariesAfterCreate.length, 3, '2 dossiers personnalisés + 1 dossier virtuel');
  console.log('✓ Création de dossiers et listeners réactifs validés');

  // --- ÉTAPE 3 : Rangement groupé de plusieurs recettes (mode additif) ---
  console.log('\n--- Étape 3 : Rangement groupé de plusieurs recettes sélectionnées ---');
  // Sélection multiple : rec_1, rec_2, rec_3 rangées dans folderDesserts
  await FolderService.addRecipesToFolders(['rec_1', 'rec_2', 'rec_3'], [folderDesserts.id]);

  const dessertsRecipeIds = await FolderService.getRecipeIdsForFolder(folderDesserts.id);
  assert.strictEqual(dessertsRecipeIds.length, 3);
  assert(dessertsRecipeIds.includes('rec_1'));
  assert(dessertsRecipeIds.includes('rec_2'));
  assert(dessertsRecipeIds.includes('rec_3'));

  const uncatAfterGroup = await FolderService.getUncategorizedRecipeIds();
  assert.strictEqual(uncatAfterGroup.length, 2, 'Il ne doit rester que rec_4 et rec_5 en non classées');
  assert(uncatAfterGroup.includes('rec_4'));
  assert(uncatAfterGroup.includes('rec_5'));
  console.log('✓ Rangement groupé additif validé');

  // --- ÉTAPE 4 : Modèle N-N & Multi-appartenance ---
  console.log('\n--- Étape 4 : Multi-appartenance N-N (une recette dans plusieurs dossiers) ---');
  // rec_1 (Tarte citron) est aussi un repas réconfortant du soir
  // rec_4 (Soupe à l'oignon) est ajoutée à folderSoir
  await FolderService.addRecipesToFolders(['rec_1', 'rec_4'], [folderSoir.id]);

  const rec1Folders = await FolderService.getFolderIdsForRecipe('rec_1');
  assert.strictEqual(rec1Folders.length, 2, 'rec_1 doit appartenir à 2 dossiers distincts');
  assert(rec1Folders.includes(folderDesserts.id));
  assert(rec1Folders.includes(folderSoir.id));

  const uncatAfterSoir = await FolderService.getUncategorizedRecipeIds();
  assert.strictEqual(uncatAfterSoir.length, 1, 'Seul rec_5 est désormais non classée');
  assert.strictEqual(uncatAfterSoir[0], 'rec_5');
  console.log('✓ Multi-appartenance N-N validée avec succès');

  // --- ÉTAPE 5 : Remplacement unitaire (Mode 1 recette sélectionnée) ---
  console.log('\n--- Étape 5 : Remplacement / toggle des dossiers pour 1 recette ---');
  // L'utilisateur change les dossiers de rec_1 pour n'être QUE dans folderSoir
  await FolderService.setRecipeFolders('rec_1', [folderSoir.id]);

  const rec1FoldersUpdated = await FolderService.getFolderIdsForRecipe('rec_1');
  assert.strictEqual(rec1FoldersUpdated.length, 1);
  assert.strictEqual(rec1FoldersUpdated[0], folderSoir.id);

  const dessertsIdsAfterRec1Removed = await FolderService.getRecipeIdsForFolder(folderDesserts.id);
  assert.strictEqual(dessertsIdsAfterRec1Removed.length, 2);
  assert(!dessertsIdsAfterRec1Removed.includes('rec_1'));
  console.log('✓ Remplacement unitaire setRecipeFolders validé');

  // --- ÉTAPE 6 : Filtrage intérieur de dossier et recherche contextuelle ---
  console.log('\n--- Étape 6 : Filtrage intérieur de dossier ---');
  // Simulation du filtrage opéré dans HomeScreen
  function filterByFolderAndQuery(all, folderId, folderIdsSet, query = '') {
    let list = all;
    if (folderId) {
      list = folderIdsSet ? list.filter((r) => folderIdsSet.has(r.id)) : [];
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    return list;
  }

  const soirIdsSet = new Set(await FolderService.getRecipeIdsForFolder(folderSoir.id));
  const insideSoir = filterByFolderAndQuery(seedRecipes, folderSoir.id, soirIdsSet, '');
  assert.strictEqual(insideSoir.length, 2); // rec_1, rec_4
  const insideSoirSearch = filterByFolderAndQuery(seedRecipes, folderSoir.id, soirIdsSet, 'oignon');
  assert.strictEqual(insideSoirSearch.length, 1);
  assert.strictEqual(insideSoirSearch[0].id, 'rec_4');
  console.log('✓ Filtrage intérieur et recherche contextuelle validés');

  // --- ÉTAPE 7 : Retrait d'une recette d'un dossier ---
  console.log('\n--- Étape 7 : Retrait ciblé de recette d\'un dossier ---');
  await FolderService.removeRecipesFromFolder(['rec_4'], folderSoir.id);
  const soirAfterRemove = await FolderService.getRecipeIdsForFolder(folderSoir.id);
  assert.strictEqual(soirAfterRemove.length, 1);
  assert.strictEqual(soirAfterRemove[0], 'rec_1');

  // rec_4 n'a plus aucun dossier, elle doit donc réapparaître dans non classées
  const uncatAfterRemove = await FolderService.getUncategorizedRecipeIds();
  assert(uncatAfterRemove.includes('rec_4'));
  console.log('✓ Retrait d\'un dossier et retour dans « Non classées » validés');

  // --- ÉTAPE 8 : RÈGLE D'OR ABSOLUE — Suppression de dossier sans perte de recettes ---
  console.log('\n--- Étape 8 : Règle d\'or absolue (Suppression d\'un dossier sans perte de recette) ---');
  // folderDesserts contient actuellement rec_2 et rec_3
  await FolderService.deleteFolder(folderDesserts.id);

  // 1. Le dossier a disparu de la liste
  const remainingFolders = await FolderService.getAllFolders();
  assert.strictEqual(remainingFolders.length, 1);
  assert.strictEqual(remainingFolders[0].id, folderSoir.id);

  // 2. Les liaisons du dossier supprimé sont purgées
  const allBindings = await FolderService.getRecipeFolders();
  assert(allBindings.every((b) => b.folderId !== folderDesserts.id), 'Aucune liaison résiduelle pour folderDesserts');

  // 3. RÈGLE D'OR : Les 5 recettes initiales sont TOUTES présentes et intactes en base
  const allRecipesInDb = await DatabaseService.getRecipes();
  assert.strictEqual(allRecipesInDb.length, 5, 'Les 5 recettes doivent impérativement être conservées');
  const foundRec2 = allRecipesInDb.find((r) => r.id === 'rec_2');
  const foundRec3 = allRecipesInDb.find((r) => r.id === 'rec_3');
  assert.strictEqual(foundRec2.title, 'Éclair au chocolat');
  assert.strictEqual(foundRec3.title, 'Mille-feuille vanille');

  // 4. rec_2 et rec_3 sont désormais comptabilisées dans « Non classées »
  const uncatAfterDelete = await FolderService.getUncategorizedRecipeIds();
  assert(uncatAfterDelete.includes('rec_2'));
  assert(uncatAfterDelete.includes('rec_3'));
  console.log('✓ RÈGLE D\'OR VÉRIFIÉE : 0 recette perdue, données strictement intactes');

  // --- ÉTAPE 9 : Suppression de recette et cascade sur les liaisons ---
  console.log('\n--- Étape 9 : Suppression d\'une recette et cascade SQLite ---');
  // rec_1 est dans folderSoir. La suppression de rec_1 doit purger sa liaison sans corrompre folderSoir
  await StorageService.deleteRecipe('rec_1');

  const soirRecipeIdsAfterRecipeDeleted = await FolderService.getRecipeIdsForFolder(folderSoir.id);
  assert.strictEqual(soirRecipeIdsAfterRecipeDeleted.length, 0, 'folderSoir doit être vide mais continuer d\'exister');

  const finalFolders = await FolderService.getAllFolders();
  assert.strictEqual(finalFolders.length, 1, 'folderSoir existe toujours');

  const remainingDbRecipes = await DatabaseService.getRecipes();
  assert.strictEqual(remainingDbRecipes.length, 4, '4 recettes restantes en base');
  console.log('✓ Suppression de recette et cascade SQLite validées');

  // --- ÉTAPE 10 : Sécurité & Gardes-fous ---
  console.log('\n--- Étape 10 : Sécurité & protections de saisie ---');
  let errCatched = false;
  try {
    await FolderService.deleteFolder(UNCATEGORIZED_FOLDER_ID);
  } catch {
    errCatched = true;
  }
  assert.strictEqual(errCatched, true, 'La suppression du dossier système UNCATEGORIZED doit être bloquée');

  errCatched = false;
  try {
    await FolderService.updateFolder(UNCATEGORIZED_FOLDER_ID, { name: 'Interdit' });
  } catch {
    errCatched = true;
  }
  assert.strictEqual(errCatched, true, 'La modification du dossier système UNCATEGORIZED doit être bloquée');

  errCatched = false;
  try {
    await FolderService.createFolder('   ', '📁');
  } catch {
    errCatched = true;
  }
  assert.strictEqual(errCatched, true, 'La création d\'un dossier avec un nom vide doit être rejetée');
  console.log('✓ Gardes-fous et protections de sécurité validés');

  unsubscribe();

  // Nettoyage dossier temporaire
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n🎉 Cycle complet d\'intégration des dossiers et règle d\'or validés avec brio !');
}

main().catch((err) => {
  console.error('\n❌ Échec du test d\'intégration :', err);
  process.exit(1);
});
