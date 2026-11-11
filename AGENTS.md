# AGENTS.md — Directives, Architecture & Règles Métier (Papilles)

**Papilles** (`papilles-recettes`) est une application mobile **100 % offline-first** (React Native `0.88` / Expo SDK `58` / React `19.3` / TypeScript strict `6.0`) de gestion de recettes, stock frigo/placards, liste de courses intelligente, suivi nutritionnel/allergènes et planification de repas, avec IA multimodale Gemini en mode BYOK.

---

## 🚨 1. RÈGLES CRITIQUES D'EXÉCUTION (À RESPECTER STRICTEMENT)

1. **CODE FIRST & SYNCHRONISATION DOCUMENTAIRE CIBLÉE :**
   - Toute fonctionnalité ou correction doit être **implémentée dans le code source (`src/`)**.
   - **Mise à jour de `README.md` et `AGENTS.md` :** autorisée et requise **uniquement** lorsqu'une fonctionnalité a été **implémentée, modifiée ou supprimée** (ou si un nouveau service/fichier structurel est introduit dans `src/`). Interdite pour les petites tâches (corrections de bugs mineurs, ajustements cosmétiques, micro-refactoring).
2. **COMMITS ATOMIQUES SYSTÉMATIQUES :**
   - Chaque commit Git doit être **strictement atomique** (une seule responsabilité logique, autonome, auto-contenu et validé par les tests).
   - Ne mélangez jamais plusieurs évolutions indépendantes, du refactoring cosmétique et des corrections de bugs dans un même commit.
   - Privilégiez des messages de commit explicites et conventionnels (ex: `feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, `test(...)`).
3. **NAVIGATION AST, ÉCONOMIE DE TOKENS & VITESSE :**
   - **Outils de recherche rapides obligatoires (`fd`/`fdfind`, `rg`, `ast-grep`) :** N'utilisez jamais `find`, `grep` ou `cat` sur des fichiers entiers pour explorer le code. Utilisez exclusivement :
     - **`fdfind`** (ou `fd`) pour localiser des fichiers (ex: `fdfind -e ts -e tsx Stock src/`).
     - **`rg`** (`ripgrep`) pour rechercher du texte ou des imports rapidement (ex: `rg -n "handleVocabularyCascade" src/`).
     - **`ast-grep`** (`sg`) pour cibler la structure syntaxique TypeScript/TSX (fonctions, hooks, props, interfaces) sans lire tout le fichier (ex: `sg -p 'const { $$$ } = useTheme()' -l tsx src/`).
   - **Respect strict de `.geminiignore` :** Ne lisez **jamais** les fichiers de seed massifs (`src/data/initialRecipes.ts`, `package-lock.json`) sauf instruction explicite. Pour connaître la structure des données, lisez uniquement `src/types/`.
   - **Éditions chirurgicales :** Utilisez des patchs ciblés. Ne réécrivez jamais un fichier entier pour modifier quelques lignes.
   - **Réponses concises :** Pas de longs préambules ni de résumés narratifs. En fin de tâche, listez uniquement les fichiers modifiés et le statut des tests en 3 à 5 lignes maximum.
4. **GESTION DES DÉPENDANCES & NATIF :**
   - N'ajoutez aucune dépendance sans nécessité absolue. Si indispensable, utilisez **exclusivement** `npx expo install <package>`.
   - **Continuous Native Generation (CNG) :** Ne modifiez jamais les dossiers `android/` ou `ios/` manuellement ; toute configuration native passe par `app.json` et les plugins Expo (`plugins/withLargeHeap.js`).
5. **VALIDATION OBLIGATOIRE AVANT CLÔTURE :**
   - Avant de conclure une tâche ou de committer, exécutez systématiquement :
     ```bash
     npx tsc --noEmit && npx expo lint
     ```
   - Si vous touchez au lexique, au stock, aux courses, aux photos ou aux allergènes, exécutez le test ciblé correspondant (voir Section 5).
   - **Attention :** Ne lancez **jamais** `npm start` ou `npx expo start` en tâche bloquante dans l'agent.
6. **RÈGLE D'OR DE PRÉSERVATION DES DONNÉES PERSONNELLES :**
   - La règle d'or est de **ne jamais détruire de données personnelles silencieusement**.
   - Si ce que vous êtes en train d'implémenter semble entraîner une telle suppression (ex: écrasement d'une recette existante lors d'un import, réinitialisation de stock, purge d'ingrédients personnalisés), faites-le savoir explicitement à l'utilisateur et demandez-lui confirmation avant de continuer.

---

## 🏗️ 2. ARCHITECTURE & NAVIGATION (SANS EXPO ROUTER)

> ⚠️ **PAS D'EXPO ROUTER (`src/app/` n'existe pas).**
> La navigation est gérée par état mémoire dans `App.tsx` via `currentScreen` (`'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan'`) et `returnScreenAfterDetail` pour le retour contextuel.
> Au premier lancement, l'onboarding initial est présenté via `OnboardingScreen.tsx` (`StorageService.hasCompletedOnboarding()`).

### Cartographie exhaustive de `src/` :

#### `App.tsx` & Écrans (`src/screens/`) :
- **`App.tsx`** : Racine (`SafeAreaProvider` + `ThemeProvider`), routeur d'écrans en mémoire, gestion de l'onboarding et barre d'onglets inférieure à 4 entrées (`Recettes`, `Repas`, `Courses & Étagères`, `Paramètres`).
- **`OnboardingScreen.tsx`** : Parcours d'accueil en 3 étapes au premier démarrage : découverte guidée, configuration optionnelle des allergies (14 familles INCO et aliments spécifiques avec option Passer) et clé IA Gemini BYOK.
- **`HomeScreen.tsx`** (`HomeScreen.styles.ts`) : Flux de recettes, sélecteur segmenté `Recettes` / `Dossiers` avec pager gestuel filtré, mode sélection multiple par appui long avec pilule flottante (`FloatingSelectionBar`), bandeau d'en-tête contextuel de dossier (`activeFolderId`) avec bouton d'ajout de recettes (`+`) ouvrant `RecipePickerModal` et modification, barre d'actions (Marmiton/Web, Scan IA, Ajout manuel, Chef IA), recherche textuelle, double bandeau de filtres rétractable au scroll (`useNativeDriver: true`).
- **`RecipeDetailScreen.tsx`** (`RecipeDetailScreen.styles.ts`) : Fiche recette complète, ajustement dynamique des portions, sous-sections *Livre de Chef*, conversion d'unités métriques, mode cuisine pas à pas, indicateurs verticaux et affordance de swipe pour retrait direct du stock (si en stock), envoi intelligent aux courses ou qualification lexique (`RecipeIngredientsList`, `SwipeableRecipeIngredientRow`), puces des dossiers assignés et action rapide `+ Dossier` (`FolderAssignmentBottomSheet`), menu unifié de partage et export (`RecipeShareModal` avec message enrichi, QR code hors-ligne, fiche PDF/impression via `RecipePrintModal` et copie presse-papier des ingrédients avec portions adaptées), liaisons de recettes associées et ajout intelligent aux courses.
- **`RecipeFormScreen.tsx`** (`RecipeFormScreen.styles.ts`) : Création/édition (tableau Nom / Quantité / Unité via `IngredientTableEditor`, liaisons entre recettes, étapes ordonnables avec `RecipeStepEditor`, puces `En placard` et `En finition`).
- **`ScanRecipeScreen.tsx`** : Hub unifié d'ajout et d'extraction IA à 4 onglets : Scan photo caméra/galerie (`CameraCaptureModal`), Saisie texte libre, Import par URL web, et Chef IA complet intégré (format repas, envies/humeur, sélection tactile 3 états des étagères ou inspiration libre sans ingrédient imposé et génération d'idées/recettes).
- **`ShoppingListScreen.tsx`** (`ShoppingListScreen.styles.ts`) : Hub unifié **Courses & Étagères** (switch segmenté entre stock `FridgeStockView` et liste de courses catégorisée par rayon), mode magasin plein écran `InStoreShoppingModal`, passerelle de rangement et proposition de purge des articles non alimentaires.
- **`MealPlannerScreen.tsx`** (`MealPlannerScreen.styles.ts`) : Planning hebdomadaire (déjeuner/dîner du lundi au dimanche) et journal de suivi quotidien avec autocomplétion intelligente.
- **`SettingsScreen.tsx`** (`SettingsScreen.styles.ts`) : Thèmes visuels, clé Gemini BYOK (`expo-secure-store`), convives par défaut (1–50), filtre végétarien par défaut, gestionnaire de lexique canonique, personnalisation du Chef IA (prompts favoris, humeurs), export/import de packs JSON/ZIP avec photos, statistiques locales.

#### Logique métier & Persistance (`src/services/`) :
- **`storageService.ts`** : Wrapper métier central et coordinateur de persistance. Gère le cache mémoire `memoryCache`, les listeners réactifs, `sanitizeStoredRecipe()`, `sanitizeImageUrl()`, la cascade du lexique `handleVocabularyCascade()`, l'onboarding, l'import dédoublé de packs de recettes (`mergeRecipePack` : skip des doublons stricts par titre et hash d'étapes sans écrasement de données personnelles), et délègue à `DatabaseService` et `ImageStorageService`.
- **`databaseService.ts`** : Couche de persistance relationnelle SQLite native (`papilles.db` avec mode WAL et PRAGMA foreign_keys). Tables indexées : `recipes`, `folders`, `recipe_folders`, `fridge_items`, `shopping_items`, `weekly_plan`, `meal_logs`, `user_allergens`, `settings`. Supporte le fallback transparent en mémoire pour l'environnement de test CLI Node.js.
- **`folderService.ts`** : Service de gestion des dossiers personnalisés, liaisons N-N (`recipe_folders`), calcul dynamique du dossier virtuel « Non classées » (`UNCATEGORIZED`), assignation unitaire ou groupée additive, résumés de dossiers avec mosaïque (`getFolderSummaries`), et synchronisation réactive avec `StorageService`.
- **`imageStorageService.ts`** : Gestionnaire de persistance permanente des photos de recettes via `expo-file-system`. Déplace les images locales du cache temporaire de l'OS vers le dossier permanent sécurisé `documentDirectory/recipe_photos/`, prévient les fuites de cache et nettoie les photos orphelines.
- **`recipePackService.ts`** : Extraction et analyse séquentielle par petits lots (protection Zip Slip) de packs de recettes JSON et archives ZIP avec photos de couverture.
- **`recipePdfService.ts`** : Génération de fiches recettes PDF haute résolution prêtes à imprimer ou partager (`expo-print`, `expo-sharing`) avec photo, QR code optionnel et réglage des portions.
- **`recipeShareService.ts`** : Partage et importation offline de recettes de smartphone à smartphone via QR codes compacts compressés (`lz-string`, `toqr`) ou partage texte standard.
- **`timerNotificationService.ts`** : Gestionnaire des minuteurs de cuisson avec notifications système locales (`expo-notifications`), calcul d'horodatage absolu (`targetTimestamp`), resynchronisation instantanée au retour en avant-plan (`AppState`), canal Android haute priorité (`cooking_timers`), vibration et carillon.
- **`vocabularyService.ts`** : CRUD du lexique canonique, gestion des alias, rayons (`defaultAisle`), promotion de synonymes et propagation automatique (Observer pattern). Les accesseurs synchrones `getSyncList()` / `getSyncMap*()` renvoient un lexique de repli mémorisé à identité stable.
- **`unifiedIngredientService.ts`** : Résolution unifiée d'ingrédients, découplage nom/quantité/unité et suggestions de synonymes.
- **`recipeAiService.ts`** : Appels REST Gemini (`v1beta`) avec découverte dynamique via `GET /models` et cascade multi-modèles (`GEMINI_MODELS_CASCADE` : 2e meilleur modèle en tête ex: `gemini-3.7-flash` en mode réfléchi et pour les scans, et meilleur Flash-Lite ex: `gemini-3.5-flash-lite` en mode rapide), sélection du modèle par humeur/mood (`ideasModelSpeed` et `recipeModelSpeed` : 'fast' ou 'thoughtful'), backoff exponentiel, prompts sobres et auto-réparation JSON (`repairTruncatedJsonString`).
- **`marmitonService.ts`** : Importation et parsing spécialisé de recettes web Marmiton par URL.
- **`webRecipeService.ts`** : Importation universelle de recettes depuis n'importe quel site web (validation stricte anti-SSRF, scraping HTML et extraction IA structurée).
- **`analyticsService.ts`** : Télémétrie locale offline et confidentielle (AsyncStorage, rétention glissante de 90 jours / 5 000 événements max, sans serveur externe).

#### Moteurs algorithmiques (`src/utils/`) :
- **`ingredientNormalizer.ts`** : Pipeline **Lexique-First** à 3 niveaux :
  1. Lookup $O(1)$ exact sur noms canoniques et alias *avant* tout élagage regex destructif ;
  2. Élagage des labels de qualité (AOP, AOC, bio) avec gardes anti-faux-amis et normalisation des ligatures (`œ` → `oe`, `æ` → `ae`) ;
  3. Extraction des métriques accolées (`100g de`, `25 cl de`) et dissociation nom/quantité/unité. Cache `NORMALIZATION_CACHE` (`clearNormalizationCache()`) indexé sur le nom seul.
- **`stockMatcher.ts`** : Calcul haute performance (< 1 ms, Maps pré-indexées, zéro regex dans les boucles) des recettes réalisables (`isDoable`) et des ingrédients manquants (`missingIngredients`).
- **`shoppingAggregator.ts`** : Fusion $O(1)$ par `canonicalId`, conversions métriques (`g`/`kg`, `ml`/`cl`/`L`), exclusion stricte de l'eau (`Eau`), gestion des indispensables de placard (`isPantryStaple`) et isolation des articles non alimentaires avec proposition de purge lors du transfert vers les étagères.
- **`shoppingInputParser.ts`** : Parsing en langage naturel pour la liste de courses (`"1kg carottes"`, `"2 paquets de riz"`, fractions Unicode `½`), gérant les ingrédients catalogués et les produits ménagers/hors-lexique.
- **`allergenMatcher.ts`** : Détection des 14 allergènes majeurs INCO par `canonicalId` + filet de sécurité sémantique (`INCO_FAMILY_KEY_ROOTS`) sur les ingrédients non catalogués.
- **`aisleClassifier.ts`** : Classification automatique par rayons de supermarché (`Fruits & Légumes`, `Produits Frais`, `Épicerie`...).
- **`searchEngine.ts`** : Moteur de recherche multicritère (titre, tags, ingrédients, filtres de temps/difficulté/végé/notes).
- **`recipeLinkMatcher.ts`** : Détection et suggestion intelligente de recettes complémentaires (liens entre un plat et sa sauce ou pâte de base).
- **`unitConverter.ts`** : Moteur de conversion d'unités de mesure culinaires (masse `g`/`kg`, volume métrique `ml`/`cl`/`L`, cuillères).
- **`ingredientSearchMatcher.ts`** : Moteur de recherche et de scoring prédictif pour la saisie d'ingrédients.
- **`sectionListLayoutHelper.ts`** : Calcul haute performance d'offsets pour la virtualisation `SectionList` sans lag de mesure Yoga.
- **`folderMosaicHelper.ts`** : Helper pur garantissant 4 slots d'images (`(string | null)[]`) pour le rendu de mosaïque 2x2 des dossiers (`FolderMosaic`).
- **`helpers.ts`** : Fonctions d'assainissement, calcul de portions (`scaleQuantity`), formatage de durées et identifiants uniques.

#### Composants réutilisables (`src/components/`) :
- **`common/` (UI générique & flux principal)** : `CategoryPills.tsx`, `EmptyState.tsx`, `RecipeCard.tsx` (mode sélection multiple, bordure 2px, pastille et animation élastique), `RecipePickerModal.tsx` (sélecteur modal unifié de recettes pour le planning de repas et l'intérieur des dossiers, avec recherche, filtres par catégorie, détection des doublons et gestion des portions), `SearchBar.tsx`, `StarRating.tsx` (0.5–5.0 sans label parasite), `AdvancedFiltersModal.tsx`.
- **`folders/` (Gestion de dossiers & sélection multiple)** : `FolderCard.tsx`, `FolderMosaic.tsx`, `FoldersGridView.tsx`, `CreateEditFolderModal.tsx`, `DeleteFolderConfirmModal.tsx`, `FolderAssignmentBottomSheet.tsx`, `FloatingSelectionBar.tsx`.
- **`recipe-detail/` (Fiche recette & mode cuisine)** : `RecipeIngredientsList.tsx`, `SwipeableRecipeIngredientRow.tsx`, `RecipeInstructionsList.tsx`, `RecipeServingsController.tsx`, `CookingModeModal.tsx`, `RecipeLinkPickerModal.tsx`.
- **`recipe-form/` (Création & édition de recette)** : `IngredientTableEditor.tsx`, `RecipeStepEditor.tsx`.
- **`stock-shopping/` (Hub Courses & Étagères)** : `FridgeStockView.tsx`, `SwipeableStockItemRow.tsx`, `SwipeableShoppingItemRow.tsx`, `EditShoppingItemModal.tsx`, `InStoreShoppingModal.tsx`, `TransferAnimationOverlay.tsx`.
- **`lexicon-units/` (Saisie normalisée, unités & allergènes INCO)** : `UnifiedIngredientInput.tsx`, `IngredientSearchBar.tsx`, `UnitQuickPicker.tsx`, `UnitPickerModal.tsx`, `VocabularyManagerModal.tsx`, `QualifyIngredientModal.tsx`, `AllergenFamilyPickerModal.tsx`.
- **`chef-ai/` (Inspiration anti-gaspi & personnalisation IA)** : `StockCookModal.tsx` (wrapper de rétrocompatibilité réexportant les types et encapsulant `ScanRecipeScreen` en mode Chef), `ChefMoodEditModal.tsx`, `ChefFavoritePromptsModal.tsx`.
- **`planner/` (Planification hebdomadaire & suivi de repas)** : `MealCalendarModal.tsx`, `MealSlotPickerModal.tsx` (réexporte `RecipePickerModal` pour rétrocompatibilité), `PlanRecipeModal.tsx`, `QuickMealLogModal.tsx`.
- **`import-share/` (Caméra, Web, PDF & QR Code hors-ligne)** : `CameraCaptureModal.tsx` (capture photo native `expo-camera` sécurisée anti-crash OOM, obturateur silencieux `shutterSound: false`, rotation et aperçu), `ImageCropper.tsx` (recadrage tactile interactif PanResponder au format carré 1:1 avec rotation et compression `expo-image-manipulator`), `ImportRecipeModal.tsx` (importation web unifiée), `RecipeShareModal.tsx` (feuille de partage unifiée à 3 actions), `RecipePrintModal.tsx` (export PDF), `RecipeQrModal.tsx` (QR code offline), `QrScannerModal.tsx` (scanner QR).

#### Données, Constantes, Types & Configuration :
- **`src/constants/units.ts`** : Catalogue standardisé des unités culinaires (5 catégories) et `formatQuantityWithUnit`.
- **`src/data/canonicalVocabulary.ts`** : Référentiel de **426 ingrédients canoniques** avec rayons, statuts placard et allergènes INCO.
- **`src/data/initialRecipes.ts`** : Recettes de démonstration initiales (**ignoré par défaut** via `.geminiignore`).
- **`src/types/`** : `recipe.ts`, `folder.ts`, `shopping.ts`, `fridge.ts`, `planner.ts`, `mealLog.ts`, `vocabulary.ts`, `analytics.ts`.
- **`plugins/withLargeHeap.js`** : Plugin de configuration Expo injectant `android:largeHeap="true"` pour immuniser l'application contre les dépassements de mémoire lors de la manipulation d'images haute définition.

---

## 🧠 3. INVARIANTS MÉTIER À NE JAMAIS CASSER

1. **Architecture "Lexique-First" & `canonicalId` :**
   - `Recipe.Ingredient`, `FridgeItem` et `ShoppingItem` partagent `canonicalId?: string`.
   - N'appliquez la normalisation qu'aux **noms d'ingrédients** (les étapes `steps` des recettes restent 100 % intactes).
   - Dans `RecipeFormScreen`, toute modification manuelle du nom d'un ingrédient doit réévaluer `normalizeIngredient()` pour éviter un `canonicalId` obsolète.
   - Toute modification du lexique dans `VocabularyService` doit déclencher `StorageService.handleVocabularyCascade()` et `clearNormalizationCache()`.
   - La normalisation sépare strictement la quantité/unité du nom de l'ingrédient et extrait les préfixes métriques accolés (`100g de carottes` ➔ nom `carotte`, qté `100`, unité `g`).
2. **Règles d'Unités, Stock & Courses :**
   - **Stock ("Mes étagères") :** Strictement **sans unités** pour garantir un matching ultra-rapide.
   - **Liste de courses :** Additionne les unités identiques ou métriquement compatibles (`500g` + `1kg` = `1.5kg`), mais conserve sur des lignes distinctes les unités disparates (`300g de carottes` vs `2 carottes`).
   - **Placard (`isPantryStaple`) & Eau :** `Eau` est toujours exclue des courses. Les ingrédients `isPantryStaple` (sel, poivre, huile, épices de base) et `isOptional` sont décochés par défaut lors de l'ajout d'une recette aux courses, et ignorés comme bloquants dans `stockMatcher.ts`.
   - **Passerelle "Ranger dans mes étagères" :** Les articles alimentaires sont ajoutés au stock dédupliqué. Pour les articles non reconnus ou non alimentaires (ex: essuie-tout, savon), une modale propose explicitement de les purger pour ne pas polluer l'inventaire culinaire.
3. **Capture Caméra, Gestion Mémoire & Google Play :**
   - La capture photo s'effectue via `CameraCaptureModal.tsx` avec `expo-camera`.
   - Le bruit de l'obturateur photo (`shutterSound`) est désactivé (`shutterSound: false`) pour une capture silencieuse et discrète.
   - Tout fichier photo temporaire brut issu de la caméra doit être immédiatement supprimé du cache OS après redimensionnement (`ImageManipulator`) pour éviter l'épuisement du disque et les crashs OOM.
   - `plugins/withLargeHeap.js` active `largeHeap` sur Android.
   - La permission `READ_MEDIA_IMAGES` ne doit **jamais** être réintroduite dans `app.json` (exigence stricte de conformité Google Play).
4. **Prompts IA Gemini sobres & Sécurité Réseau :**
   - Dans `recipeAiService.ts`, `ScanRecipeScreen.tsx` et `StockCookModal.tsx`, les titres et descriptions générés par l'IA doivent rester factuels et quotidiens (interdiction des adjectifs pompeux type *"sublime"*, *"divin"*, *"crémeux"* dans les titres).
   - Découverte dynamique des modèles et cascade de résilience : le modèle utilisé dépend du mood configuré pour chaque étape (Étape 1 : 3 idées, Étape 2 : fiche complète). Deux modes disponibles : Rapide (meilleur modèle Flash-Lite, ex: `gemini-3.5-flash-lite`) et Réfléchi (2e meilleur modèle Flash standard, ex: `gemini-3.7-flash`). Par défaut d'usine, tous les moods sont en mode rapide pour la recette complète, et pour les 3 idées seul le chef gastronomique/créatif est en mode réfléchi. Ces deux modes sont entièrement personnalisables par l'utilisateur pour chaque humeur dans les Paramètres.
   - Dans `webRecipeService.ts`, validation d'URL stricte avec rejet des IP privées/locales et identifiants embarqués (protection anti-SSRF).
5. **Sécurité, Persistance & Offline-First :**
   - **SQLite (`papilles.db`) :** Les recettes et collections sont persistées en tables individuelles indexées, sans limitation de taille arbitraire.
   - **Persistance des Photos :** Les photos locales (galerie, caméra) sont systématiquement migrées et stockées dans `documentDirectory/recipe_photos/` via `ImageStorageService` pour immuniser l'app contre les nettoyages de cache de l'appareil.
   - **Import de packs de recettes (`mergeRecipePack`) :** Ne jamais écraser de recettes existantes. Détection de doublons stricts par titre normalisé et hash d'étapes (`computeRecipeStepsHash`). Les doublons stricts sont ignorés (`skippedCount`), tandis que les recettes ayant le même titre mais des étapes différentes sont ajoutées avec leur propre identifiant unique.
   - Aucune donnée utilisateur n'est envoyée sur un serveur tiers (hors appels directs Gemini API et scraping web consenti).
   - Toujours passer les données chargées ou générées par IA via `sanitizeStoredRecipe()` et `sanitizeImageUrl()`.
6. **Performance du démarrage (thread JS bloquant) :**
   - SQLite est appelé en API synchrone : `StorageService.getRecipes()` → `rows.map(sanitizeStoredRecipe)` s'exécute d'un bloc, sans rendre la main. Tout coût par ingrédient y est multiplié par le nombre total d'ingrédients.
   - Ne jamais reconstruire le lexique (`getInitialCanonicalVocabulary()`) ni un index dérivé à chaque appel : l'identité du tableau renvoyé par `getSyncList()` doit rester stable pour que `getVocabLookupIndex()` reste en cache.
   - `getRecipes()` attend `VocabularyService.getAll()` avant d'assainir ; `sanitizeStoredRecipe()` saute `normalizeIngredient()` pour les ingrédients déjà résolus (`canonicalId`, `isPantryStaple` et `isOptional` définis).
   - Le log `⚡ [Papilles Startup] N recettes assainies en Xms` mesure ce coût sur l'appareil.
7. **Système de Dossiers, Sélection Multiple & Règle d'or de Préservation :**
   - **Modèle N-N** : Tables `folders` (`id`, `name`, `icon`) et `recipe_folders` (`recipe_id`, `folder_id`, `added_at`) avec index SQLite.
   - **RÈGLE D'OR ABSOLUE** : La suppression d'un dossier ne supprime JAMAIS de recettes de la base. Seules les liaisons `recipe_folders` et la ligne du dossier dans `folders` sont effacées. Les recettes redeviennent immédiatement « Non classées » si elles n'ont plus d'autre dossier.
   - **Dossier virtuel « Non classées » (`UNCATEGORIZED`)** : calculé dynamiquement (recettes sans aucune liaison dans `recipe_folders`), non modifiable et non supprimable.
   - **Mode sélection multiple** : activé par appui long sur `RecipeCard` (sans vibration haptique parasite), persistant au fil des filtres/recherches, avec barre flottante `FloatingSelectionBar` dotée de l'action rapide « Tout sélectionner / Tout désélectionner », rangement groupé additif via `FolderAssignmentBottomSheet` et confirmation par Snackbar temporaire (4s).
   - **Bandeau de dossier ouvert & Ajout de recettes** : le bouton d'action contextuel principal est un bouton `+` ouvrant `RecipePickerModal` en mode continu (`closeOnSelect={false}` avec bouton « Terminer » et badge « Dans le dossier »), affichage du compte local sans pagination globale, accompagné du bouton de modification du dossier (nom et icône).
   - **Fiche recette (`RecipeDetailScreen`)** : puces des dossiers d'appartenance cliquables et bouton rapide `+ Dossier` ouvrant directement `FolderAssignmentBottomSheet`.
   - **Hiérarchie BackHandler Android** : Quitter le mode sélection -> Fermer le dossier ouvert vers la grille -> Sortir de l'écran.

---

## 🎨 4. SYSTÈME DE THÈME & CONVENTIONS UI

- **Langue UI :** Toutes les chaînes visibles par l'utilisateur doivent être en **français**.
- **Thèmes dynamiques (`src/theme/colors.ts` & `ThemeContext.tsx`) :**
  - Supporte *Jardin Botanique* (Clair), *Table Nocturne* (Sombre) et *Contraste Élevé* (CVD-Safe).
  - N'utilisez jamais de couleurs en dur. Utilisez systématiquement `useTheme()` et `createDynamicStyles` :
    ```tsx
    import { createDynamicStyles } from '../theme/colors';
    import { useTheme } from '../theme/ThemeContext';

    // Dans le composant :
    const { colors, isDark, shadows, themeMode, setThemeMode } = useTheme();

    // Pour les feuilles de style :
    const styles = createDynamicStyles((colors, shadows) => ({
      container: { backgroundColor: colors.background, ...shadows.card },
      title: { color: colors.textPrimary },
    }));
    ```

---

## 🛠️ 5. EXPLORATION DU CODE, VÉRIFICATION & TESTS UNITAIRES

```bash
# 0. Exploration chirurgicale du code (À privilégier avant d'ouvrir un fichier)
fdfind -e ts -e tsx <motif> src/                     # Trouver un fichier instantanément (fdfind sous Linux)
rg -n "<symbole_ou_texte>" src/                      # Chercher les occurrences exactes avec numéros de lignes
sg -p 'export function $FUNC($$$)' -l ts src/        # Lister les signatures de fonctions via AST (ast-grep)
sg -p 'interface $NAME {$$$ }' -l ts src/types/     # Inspecter les interfaces TypeScript via AST

# 1. Vérification obligatoire avant fin de tâche (0 erreur tolérée)
npx tsc --noEmit && npx expo lint

# 2. Suite complète de tests métier (37 suites exécutées en CLI Node)
npm test

# 3. Tests ciblés par sous-système (à lancer selon les fichiers modifiés)
npm run validate:lexicon       # Audit d'intégrité du vocabulaire canonique (426 ingrédients, 0 collision)
npm run test:stock             # Tests unitaires stockMatcher & résolution Lexique-First
npm run test:shopping          # Tests unitaires shoppingAggregator, conversions & placard
npm run test:shopping-shelves  # Tests du transfert courses -> étagères et purge non-alimentaire
npm run test:allergens         # Tests unitaires sécurité allergènes INCO & racines sémantiques
npm run test:cascade           # Tests de propagation en cascade des modifications de lexique
npm run test:normalizer        # Tests du normalisateur d'ingrédients à 3 niveaux
npm run test:timer             # Tests des minuteurs, notifications d'arrière-plan et horodatage
npm run test:camera            # Tests d'intégration et sécurité mémoire de la caméra
npm run test:images            # Tests unitaires persistance et isolation ImageStorageService
npm run test:pack              # Tests unitaires extraction JSON/ZIP RecipePackService
npm run test:pack-merge        # Tests unitaires fusion incrémentale et déduplication StorageService
npm run test:pdf               # Tests du service d'impression et export PDF
npm run test:share             # Tests du partage et encodage/décodage QR code compact
npm run test:recipe-stock-bar # Tests de la barre de stock / statut d'ingrédient
npm run test:recipe-swipe     # Tests du swipe d'ingrédients vers courses / qualification
npm run test:web-recipe        # Tests du scraping web et validation d'URL anti-SSRF
npm run test:folders           # Tests unitaires CRUD et modèle N-N FolderService
npm run test:folders-mosaic    # Tests unitaires helper mosaïque 2x2
npm run test:folders-components # Tests des composants FolderCard et modales
npm run test:folders-grid      # Tests de la grille FlashList des dossiers et tuile non classées
npm run test:folder-interior   # Tests du filtrage intérieur de dossier et bandeau contextuel
npm run test:recipe-card-selection # Tests de la sélection visuelle sur RecipeCard
npm run test:floating-bar      # Tests de la barre flottante de sélection contextuelle
npm run test:folder-assignment # Tests de la Bottom Sheet de rangement additif / unitaire
npm run test:home-pager        # Tests du switcher segmenté et pager gestuel filtré
npm run test:folder-cycle      # Tests d'intégration du cycle complet et règle d'or
npm run test:recipe-picker     # Tests de RecipePickerModal unifié (dossiers & planning)

# 4. Utilitaires de maintenance (si pertinent)
npx expo-doctor                # Diagnostic santé Expo
npx expo install --fix         # Alignement des dépendances sur le SDK Expo
```
