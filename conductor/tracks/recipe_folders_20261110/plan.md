# Plan d'Implémentation : Système de Dossiers & Sélection Multiple

## Phase 1 : Modèle de Données & Couche Service SQLite (TDD)
- [x] Task: Schéma SQLite & Types TypeScript
  - [x] Définir les types `Folder`, `FolderSummary`, `RecipeFolder` dans `src/types/folder.ts`
  - [x] Ajouter les migrations SQLite dans `src/services/databaseService.ts` (tables `folders` et `recipe_folders`, index et cascades) avec support du fallback mémoire pour les tests
- [x] Task: Tests Unitaires Red Phase (`scripts/testFolderService.js`)
  - [x] Écrire la suite de tests CLI Node pour le CRUD des dossiers, les liaisons N-N, le calcul de `'UNCATEGORIZED'` et la suppression sécurisée sans perte de recettes
  - [x] Ajouter le script `"test:folders": "node scripts/testFolderService.js"` dans `package.json`
- [x] Task: Implémentation du Service (`folderService.ts` & intégration réactive `storageService.ts`)
  - [x] Implémenter les méthodes CRUD et les associations multi-recettes (additif pour N recettes, toggle pour 1 recette)
  - [x] Intégrer un cache mémoire synchronisé et un système de listeners réactifs dans `storageService.ts` pour notifier instantanément les composants (`HomeScreen`, compteurs de `FolderCard`, `activeFolderId`) lors de toute modification
  - [x] Valider le passage de tous les tests au vert (`npm run test:folders`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 : Composants UI Fondamentaux (FolderCard, Mosaïque 2x2 & Modales)
- [x] Task: Helper Pur & Tests Mosaïque (489275a)
  - [x] Implémenter la fonction pure `getFolderMosaicImages(recipes): (string | null)[]` garantissant toujours un tableau de 4 slots
  - [x] Créer `scripts/testFolderMosaic.js` et ajouter `"test:folders-mosaic": "node scripts/testFolderMosaic.js"` dans `package.json`
- [ ] Task: Composants `FolderMosaic` & `FolderCard`
  - [ ] Créer `src/components/folders/FolderMosaic.tsx` (rendu mosaïque 2x2 basé sur les 4 slots)
  - [ ] Créer `src/components/folders/FolderCard.tsx` (mosaïque, titre, emoji, compteur, carte spéciale « Non classées »)
- [ ] Task: Modales de Gestion de Dossiers
  - [ ] Créer `CreateEditFolderModal.tsx` (création/renommage avec sélecteur d'emojis culinaires)
  - [ ] Créer la confirmation de suppression sécurisée rappelant la préservation des recettes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 : Mode Sélection Multiple & Rangement Groupé
- [ ] Task: Mise à jour de `RecipeCard.tsx` pour le Mode Sélection
  - [ ] Ajouter les props `isSelectionMode`, `isSelected`, `onLongPress` et adapter `onPress` (déviation vers la sélection au lieu d'ouvrir la recette)
  - [ ] Appliquer la bordure `colors.primary` (2px), la pastille cochée (`✓`) / cercle vide discret et l'animation de rebond élastique (`scale: 0.97` ➔ `1.0`) sans retour haptique
- [ ] Task: Pilule Flottante (`FloatingSelectionBar.tsx`) & État Persistant dans `HomeScreen`
  - [ ] Créer la barre flottante au-dessus de la barre d'onglets (`[ ✕  X sélectionnée(s)  |  📁 Ranger dans... ]` ou `[ 📤 Retirer du dossier  |  📁 Autre dossier... ]` selon `activeFolderId`)
  - [ ] Gérer l'état `selectedRecipeIds: Set<string>` dans `HomeScreen` persistant lors de la recherche et du filtrage
  - [ ] Intercepter le `BackHandler` Android pour quitter le mode sélection en priorité
- [ ] Task: Bottom Sheet de Rangement (`FolderAssignmentBottomSheet.tsx`)
  - [ ] Liste des dossiers avec état pré-coché (si 1 recette) ou mode additif (si N recettes)
  - [ ] Possibilité de créer un nouveau dossier directement dans la Bottom Sheet
  - [ ] Enregistrement SQLite réactif et notification visuelle
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 : Navigation Gestuelle, Vue Grille & Vue Intérieure de Dossier
- [ ] Task: Sélecteur Segmenté & Pager Gestuel Filtré
  - [ ] Ajouter les onglets `Recettes` / `Dossiers` en en-tête d'accueil
  - [ ] Gérer le swipe horizontal strict (`dx > 25 && Math.abs(dx) > Math.abs(dy) * 2`) en excluant la zone des filtres (`FILTER_BAR_HEIGHT = 88`)
- [ ] Task: Vue Grille des Dossiers (`FoldersGridView.tsx`)
  - [ ] Intégrer `FlashList` (`numColumns: 2`), tuile « Non classées » et action « + Nouveau dossier »
- [ ] Task: Navigation Intérieure de Dossier (`activeFolderId`) & Actions Contextuelles
  - [ ] Filtrer la liste de recettes existante selon `activeFolderId` (réutilisation complète de la FlashList et de la SearchBar)
  - [ ] Afficher le bandeau d'en-tête contextuel `[ ← Tous les dossiers | Nom (compteur) | ✏️ / 🗑️ ]`
  - [ ] Intercepter le `BackHandler` Android pour fermer le dossier et revenir à la grille
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 : Tests d'Intégration, Documentation & Validation Finale
- [ ] Task: Tests d'Intégration Finaux
  - [ ] Tester le cycle complet de bout en bout (Création dossier ➔ Sélection multiple ➔ Rangement ➔ Filtrage intérieur ➔ Retrait ➔ Suppression dossier)
  - [ ] Vérifier formellement la règle d'or (aucune suppression silencieuse de recettes)
- [ ] Task: Mise à Jour Documentaire
  - [ ] Mettre à jour la cartographie et les fonctionnalités dans `README.md` et `AGENTS.md`
- [ ] Task: Validation Qualité Finale & Santé du Projet
  - [ ] Exécuter `npx tsc --noEmit && npx expo lint` (0 erreur requise)
  - [ ] Exécuter la suite complète `npm test`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
