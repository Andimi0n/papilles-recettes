# Plan d'Implémentation — Track Optimisation des Performances (Papilles)

## Phase 1 : Quick Wins — Cache Persistance, Algorithmes & Virtualisation FlashList
- [x] Task: Écrire les tests unitaires pour la clé d'évaluation stock (stockMatcher) et la mise à jour en place du cache recettes (StorageService) [8ca8a1e]
- [x] Task: Corriger la clé d'invalidation dans stockMatcher.ts (recalcul garanti lors de l'édition d'une recette) [a1e325d]
- [x] Task: Implémenter la mise à jour in-memory dans StorageService.saveRecipe() et éliminer le double reload dans App.tsx [f7373b8]
- [x] Task: Configurer estimatedItemSize sur FlashList (HomeScreen.tsx) et découpler l'état isFilterBarVisible pour fluidifier le scroll [3bf2529]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [a23c853]

## Phase 2 : Optimisation Mémoire, Photos HD & Isolation de Saisie
- [x] Task: Écrire les tests unitaires pour la compression/redimensionnement des photos dans ImageStorageService [cb0fe33]
- [x] Task: Implémenter le redimensionnement automatique (max 1200px) et compression JPEG (0.8) dans ImageStorageService.persistImageLocally [eec9169]
- [x] Task: Isoler la barre de saisie de FridgeStockView.tsx pour éliminer les re-rendus de la SectionList à chaque frappe clavier [77ea48c]
- [x] Task: Raccorder expo-splash-screen (preventAutoHideAsync / hideAsync) dans App.tsx pour supprimer le clignotement de chargement au démarrage [029e32f]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [e2b201d]

## Phase 3 : Isolation de Rendu React 19 & Requêtes SQLite Deltas
- [x] Task: Écrire les tests unitaires pour les écritures ciblées / deltas dans DatabaseService [43b27c1]
- [~] Task: Optimiser saveShoppingItems et saveFridgeItems dans DatabaseService.ts pour éviter les DELETE ALL systématiques
- [ ] Task: Mémoïser les 4 conteneurs d'onglets (HomeScreen, MealPlannerScreen, ShoppingListScreen, SettingsScreen) dans App.tsx pour stopper la réconciliation d'onglets masqués
- [ ] Task: Exécuter la validation globale de santé (npx tsc, expo lint, npm test complet)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
