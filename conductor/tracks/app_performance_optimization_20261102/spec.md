# Specification — Track Optimisation des Performances (Papilles)

## 1. Overview & Context
Cette track implémente l'ensemble des optimisations architecturales et logicielles définies lors de l'audit de performance (`performance_review_papilles.md`).
L'objectif est d'atteindre une fluidité constante (60/120 FPS), de réduire l'empreinte mémoire et stockage de 85 % sur les photos, de supprimer les réconciliations React 19 inutiles en tâche de fond sur les onglets masqués, et de fiabiliser les I/O et caches de persistance (SQLite WAL & Memory Cache).

---

## 2. Functional & Technical Requirements

### 2.1 Rendu React 19 & Isolation d'Onglets (`App.tsx`)
- Mémoïser les composants principaux d'écrans (`HomeScreen`, `MealPlannerScreen`, `ShoppingListScreen`, `SettingsScreen`) via `React.memo` avec comparateurs ciblés ou découplage d'état.
- Empêcher les re-rendus des écrans inactifs lorsque l'utilisateur navigue ou interagit sur un autre onglet.
- Supprimer les appels redondants à `reloadRecipes()` dans `App.tsx` qui suivent immédiatement un `StorageService.saveRecipe()`.

### 2.2 Listes & Virtualisation (`HomeScreen.tsx` & `FridgeStockView.tsx`)
- Configurer la prop `estimatedItemSize` sur la `FlashList` de `HomeScreen.tsx` en fonction du `viewMode` actif (290 pour `detailed`, 210 pour `grid`, 78 pour `compact`).
- Découpler l'état React `isFilterBarVisible` du cycle de rendu de défilement pour laisser l'animation de translation s'exécuter 100 % sur le thread natif (`useNativeDriver: true`).
- Extraire la barre de saisie de texte dans `FridgeStockView.tsx` pour isoler son état local et ne plus re-rendre toute la `SectionList` à chaque lettre tapée.

### 2.3 Persistance & I/O SQLite (`StorageService.ts` & `DatabaseService.ts`)
- Mettre à jour `memoryCache.recipes` in-memory directement dans `StorageService.saveRecipe()` (remplacement ou insertion en tête) sans détruire le cache ni recharger toute la base SQLite.
- Refactoriser `saveShoppingItems` et `saveFridgeItems` dans `DatabaseService.ts` pour privilégier les opérations par delta ou upsert ciblées au lieu du schéma destructif `DELETE FROM ...` suivi d'une boucle synchrone d'`INSERT`.

### 2.4 Compression & Mémoire des Photos (`ImageStorageService.ts`)
- Intégrer un redimensionnement (largeur/hauteur max 1200 px) et une compression JPEG qualité 0.8 via `expo-image-manipulator` (`manipulateAsync`) dans `ImageStorageService.persistImageLocally()`.
- Garantir que toutes les photos capturées via caméra ou sélectionnées depuis la galerie soient stockées de manière allégée (~200-300 Ko au lieu de 5-15 Mo) avant copie dans `documentDirectory/recipe_photos/`.

### 2.5 Algorithmes & Cache Métier (`stockMatcher.ts`)
- Remplacer l'empreinte fragile `recipes.length + '_' + (recipes[0]?.updatedAt || '')` dans `evaluateRecipesWithStock()` par un mécanisme fiable (versionnage global du carnet ou horodatage max de mise à jour) pour garantir l'invalidation du cache d'évaluation dès qu'une recette quelconque est modifiée.

### 2.6 Démarrage de l'Application & TTI (`App.tsx`)
- Raccorder `expo-splash-screen` (`SplashScreen.preventAutoHideAsync()` et `SplashScreen.hideAsync()`) pour éliminer le clignotement blanc/sombre du spinner de chargement et garantir une transition fluide à froid.

---

## 3. Acceptance Criteria
- 0 erreur TypeScript (`npx tsc --noEmit`).
- 0 warning / 0 erreur ESLint (`EXPO_NO_TELEMETRY=1 npx expo lint`).
- 100 % de réussite de la suite de tests (`npm test`).
- Nouveaux tests unitaires automatisés validant la compression de photos, la mise à jour in-memory du cache et l'invalidation fiable de `stockMatcher`.
- Développement réalisé et vérifié sur la branche dédiée `perf/app-optimization`.

---

## 4. Out of Scope
- Remplacement du moteur de recherche par SQLite FTS5 (réservé pour une track ultérieure de migration SQL plein texte).
- Ajout de nouvelles dépendances natives externes (respect strict de la politique sans dépendance superflue).
