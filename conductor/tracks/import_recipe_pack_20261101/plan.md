# Implementation Plan: Import et Fusion de Pack de Recettes (JSON & ZIP avec Photos)

Ce plan structure la réalisation technique en 4 phases progressives selon la méthodologie TDD et les règles opérationnelles du projet.

## Phase 1 : Dépendances & Service d'Extraction de Pack (ZIP & JSON)

- [x] Task: Installer et configurer les dépendances requises (`expo-document-picker`, `jszip`) [4b5feb6]
  - [x] Installer `expo-document-picker` via `npx expo install` et `jszip` (+ `@types/jszip`)
  - [x] Valider la compilation TypeScript et l'alignement Expo SDK 58
- [x] Task: Écrire les tests unitaires pour le parsing et l'extraction de pack (Red Phase) [1bb2278]
  - [x] Créer `scripts/testRecipePackService.js` testant le décodage JSON, la détection Zip Slip, la lecture séquentielle et la gestion des erreurs
  - [x] Confirmer l'échec initial des tests
- [x] Task: Implémenter le service d'extraction de pack `RecipePackService` (Green Phase) [2a4c6ca]
  - [x] Créer `src/services/recipePackService.ts` avec traitement séquentiel par petits lots (3 à 5 images) pour préserver la mémoire (Point de vigilance 1)
  - [x] Assurer la sécurisation contre les attaques Zip Slip et l'extraction des buffers images
  - [x] Confirmer le passage au vert des tests unitaires
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 : Logique Métier de Fusion & Persistance (`StorageService`)

- [ ] Task: Écrire les tests unitaires de la fusion incrémentale de recettes (Red Phase)
  - [ ] Ajouter dans la suite de tests les scénarios de déduplication par titre normalisé, mise à jour des existantes et génération d'identifiants uniques pour les recettes inédites
  - [ ] Confirmer l'échec initial des tests
- [ ] Task: Implémenter la méthode `mergeRecipePack()` dans `StorageService` (Green Phase)
  - [ ] Ajouter `mergeRecipePack()` dans `src/services/storageService.ts` avec assainissement via `sanitizeStoredRecipe()`
  - [ ] Garantir l'isolation totale : zéro altération du stock, des courses ou de l'historique des repas
  - [ ] Assurer la persistance locale des photos via `ImageStorageService` avec format d'URI propre (`file:///...` sur mobile) (Point de vigilance 2)
  - [ ] Retourner le bilan détaillé `{ addedCount, updatedCount, photosCount }`
  - [ ] Confirmer le passage au vert de tous les tests unitaires
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 : Interface Utilisateur & Intégration (`SettingsScreen`)

- [ ] Task: Intégrer l'option d'import de pack dans `SettingsScreen.tsx`
  - [ ] Ajouter le bouton dédié « Importer un pack de recettes (.json, .zip) » dans la section Sauvegarde
  - [ ] Câbler le sélecteur de documents (`expo-document-picker`) avec filtre `.json` et `.zip`
  - [ ] Conserver l'option de secours par collage de texte JSON
  - [ ] Afficher un indicateur d'activité/progression pendant le traitement des gros fichiers
  - [ ] Afficher la boîte de dialogue récapitulative UX valorisante (Point de vigilance 3)
  - [ ] Déclencher le rechargement réactif du carnet (`onRecipesReloadNeeded`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 : Validation Globale & Non-Régression

- [ ] Task: Exécution de la suite complète de contrôle qualité
  - [ ] Exécuter la suite complète de tests de non-régression (`npm test`)
  - [ ] Exécuter le typage strict et le linter (`npx tsc --noEmit && npx expo lint`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
