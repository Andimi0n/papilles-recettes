# 🍳 Papilles — Carnet de Recettes, Planificateur & Gestion de Stocks

Une application mobile moderne, soignée et intuitive pour gérer vos recettes, planifier vos menus de la semaine, suivre vos repas au quotidien et garder un œil sur les stocks de vos étagères et votre liste de courses.

Application **100 % offline-first**, sécurisée, sans création de compte obligatoire et respectueuse de votre vie privée.

---

## ✨ Fonctionnalités principales

### 1. 🎨 Double Direction Artistique & Thèmes Dynamiques
- **Thème Clair — *Jardin Botanique & Slow Food*** : vert forêt persistant, céladon apaisant, brume d'amande.
- **Thème Sombre — *Table Nocturne & Sauge Céleste*** : ardoise obsidienne, émeraude culinaire lumineuse, sauge argentée et touches ambrées.
- **Thème Contraste Élevé** : adapté à la lisibilité et au daltonisme (CVD-Safe).
- Choix ergonomique dans les **Paramètres** avec disposition verticale des thèmes et prévisualisation directe de la palette de couleurs à droite de chacun.

### 2. 📱 Navigation Fluide, Onboarding & Bandeau d'Accueil
- **Onboarding guidé** : écran de bienvenue au premier démarrage (`OnboardingScreen`) présentant les atouts clés de l'application et initialisant les réglages par défaut.
- **Bandeau supérieur unifié** : identité visuelle complète avec le logo officiel de Papilles, titre soigné, description culinaire et accès direct aux actions clés sur un seul plan horizontal fluide :
  - **Web** (importation immédiate par URL depuis n'importe quel site de cuisine).
  - **Scan & IA** (scanner photo instantané, recto-verso et saisie texte).
  - **Ajouter** (création manuelle d'une recette).
- **Barre de navigation inférieure à 4 onglets en mémoire** :
  - **Recettes** : carnet complet, recherche intelligente, double bandeau de filtres rétractable au scroll et widgets du jour.
  - **Repas** : journal des repas midi/soir et menu hebdomadaire.
  - **Courses & Étagères** : stocks du frigo/placard et liste de courses avec badge des articles restants.
  - **Paramètres** : ambiance visuelle, clé IA, portions, gestionnaire de lexique, humeurs du chef et sauvegardes.

### 3. 📅 Suivi des Repas Quotidien & Menu de la Semaine
- **Suivi des repas du jour** : saisie fluide avec autocomplétion intelligente prédictive depuis vos recettes enregistrées (scoring en direct par titre, ingrédients et catégorie) et recommandations en 1 clic.
- **Journal chronologique** : historique complet de vos repas passés avec possibilité de modification à tout moment.
- **Menu de la semaine** : planifiez vos déjeuners et dîners du lundi au dimanche (`MealPlannerScreen`), visualisez vos menus d'un coup d'œil et exportez automatiquement les ingrédients nécessaires vers la liste de courses.

### 4. 🥫 Hub "Courses & Étagères" (Gestion des Stocks & Courses)
- **Mes étagères (Stock Frigo & Placard)** :
  - Suivi rapide et sans friction des denrées disponibles chez vous.
  - **Ajout rapide en 1 clic 100% raccord avec le lexique canonique** : suggestions basées sur les noms canoniques réels (*Œufs, Beurre, Lait, Farine, Pâtes, Riz, Huile d'olive, Tomate, Oignon, Ail, Carotte, Courgette...*), avec masquage intelligent des articles déjà en stock et mise en avant de vos ingrédients fréquents.
  - **Saisie prédictive instantanée à la chaîne** : cliquer sur une suggestion d'autocomplétion ajoute immédiatement l'ingrédient au stock, efface le champ de recherche et maintient le focus pour enchaîner plusieurs ajouts sans friction.
  - **Classification automatique par rayons** (Primeur, Crémerie, Épicerie salée/sucrée, Boucherie...).
  - **Que cuisiner aujourd'hui ?** : calcul immédiat des recettes faisables avec votre inventaire actif.
- **Liste de courses catégorisée & Agrégateur intelligent** :
  - Regroupement automatique selon le rayon officiel (`defaultAisle`) du lexique canonique.
  - **Fusion $O(1)$ et addition arithmétique avec conversion métrique** : les articles identiques sont automatiquement fusionnés et additionnés (ex: `1 kg` + `250 g` = `1,25 kg`, `50 cl` + `1 L` = `1,5 L`).
  - **Gestion fine des fonds de placard** : exclus par défaut pour éviter d'inonder la liste ; si inclus volontairement, affichés sous leur nom seul sans micro-quantité.
  - **Exclusion stricte de l'eau** : l'ingrédient technique `Eau` n'est jamais ajouté aux courses.
  - **Mode Courses en Magasin plein écran (`InStoreShoppingModal`)** : interface dédiée pour cocher rapidement ses articles dans les rayons avec barre de progression et interface épurée.
  - **Passerelle intelligente & Protection des étagères** : bouton *"Ranger dans mes étagères 🥫"* pour basculer vos courses achetées dans vos stocks. Si la liste contient des articles non alimentaires ou non catalogués (produits d'entretien, essuie-tout), une modale propose automatiquement de les purger sans polluer l'inventaire culinaire.

### 5. 🍳 Cuisiner avec mon stock & Suggestions du Chef IA ("Anti-gaspillage")
- **Filtrage des recettes 100% faisables avec le stock** :
  - Calcule en temps réel (< 1 ms, avec indexation $O(1)$ et cache de normalisation) quelles recettes de votre carnet peuvent être cuisinées immédiatement avec vos aliments en stock (`stockMatcher.ts`).
  - Tolérance intelligente des fonds de placard (`isPantryStaple` : sel, poivre, eau, huiles usuelles, épices) et exclusion des ingrédients facultatifs (`isOptional`).
  - Puce d'accès direct `[En stock (X)]` dans le bandeau de filtres rétractable de l'accueil et bandeau d'état actif dans la liste.
- **Bouton interactif Hub Stock & Anti-gaspillage** :
  - Bouton interactif moderne à côté de la barre de recherche avec badge dynamique du nombre de recettes faisables.
  - Ouvre l'assistant culinaire Chef IA intégré dans l'écran d'ajout (`ScanRecipeScreen` en mode Chef, avec wrapper `StockCookModal`), affichant le bilan du carnet, le sélecteur d'ingrédients à valoriser et les options de création.
- **Inspiration Chef IA inédite en 2 étapes & Résilience multi-modèles** :
  - **Processus en 2 étapes ludique et sans surcharge** :
    - *Étape 1* : Taper sur *"💡 Trouver 3 idées"* génère quasi instantanément 3 propositions originales avec titre appétissant, temps estimé et accroche culinaire valorisant vos restes (< 300 tokens).
    - *Étape 2* : Choisissez l'idée qui vous donne envie (*"Cuisiner cette recette →"*) pour obtenir la recette pas-à-pas détaillée avec dosages précis.
  - **Personnalisation du Chef IA** : configurez son humeur culinaire (`ChefMoodEditModal` : réconfortant, équilibré, express, gastronomique) et enregistrez des prompts favoris (`ChefFavoritePromptsModal`).
  - **Résilience absolue & Cascade de secours multi-modèles** : basculement automatique et invisible entre `gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.0-flash` et `gemini-1.5-flash` en cas de pic de charge (503/429) sur les serveurs Google.
  - **Sélection verticale des ingrédients par rayons** : ingrédients en stock regroupés par rayons avec compteurs et raccourcis *"Tout cocher"* / *"Tout décocher"*.
  - Configuration du nombre de portions (synchronisé avec vos préférences), option 100% végétarienne et pré-remplissage direct du formulaire de recette.

### 6. 🏷️ Lexique Canonique (426 Ingrédients) & Architecture "Lexique-First"
- **Pipeline de normalisation à 3 niveaux** :
  1. *Lookup $O(1)$ exact* sur les noms canoniques et alias avant tout stripping regex destructif. Les termes sensibles composés (*Crème fraîche*, *Poudre d'amande*) sont résolus immédiatement sans altération ;
  2. *Élagage des labels de qualité* (AOP, AOC, bio) avec gardes anti-faux-amis et normalisation transparente des ligatures (`œ` → `oe`, `æ` → `ae`) ;
  3. *Découplage quantité/unité et métriques accolées* (`100g de`, `25 cl de`) pour isoler proprement le nom de l'ingrédient.
- **Identifiant transversal `canonicalId`** : partagé entre `Recipe.Ingredient`, `FridgeItem` et `ShoppingItem` pour des correspondances $O(1)$ à 0 faux positif (*Pomme* !== *Pomme de terre*, *Muscade* !== *Noix*).
- **Sécurité sanitaire renforcée des 14 allergènes INCO** : détection immédiate par `canonicalId` et filet de sécurité sémantique (`INCO_FAMILY_KEY_ROOTS`) sur les ingrédients hors lexique.
- **Démarrage instantané & Zéro ralentissement** : le lexique utilisateur est chargé avant l'assainissement des recettes ; le lexique de repli et ses index ne sont construits qu'une fois, et les ingrédients déjà résolus ne sont pas renormalisés.
- **Propagation réactive & Cascade automatique** : toute modification du vocabulaire (détachement, fusion, modification de rayon) est répercutée instantanément sur les recettes, stocks et courses sans action manuelle.
- **Gestionnaire de vocabulaire complet (`VocabularyManagerModal`)** : accessible dans les Paramètres pour consulter les 426 ingrédients canoniques, rechercher par rayon, qualifier un ingrédient inconnu (`QualifyIngredientModal`), gérer les indispensables de placard, renommer, ajouter des alias ou fusionner des doublons.

### 7. 📖 Structure "Livre de Chef", Fiches Recettes & Portions Dynamiques
- **Organisation culinaire par sections** :
  - **Ingrédients principaux** : les denrées maîtresses du plat.
  - **Assaisonnements & condiments** : huiles, vinaigres, assaisonnements réputés déjà disponibles en cuisine.
  - **En finition & au goût** : herbes fraîches, graines, épices au goût ou touches facultatives.
- **Ajustement dynamique des convives & régimes** : sélecteur interactif recalculant instantanément les proportions de tous les ingrédients, avec gestion des portions et option de filtrage végétarien par défaut configurables dans les Paramètres.
- **Liaisons entre recettes (`RecipeLinkPickerModal`)** : associez des recettes complémentaires entre elles (ex: lier une pâte brisée maison ou une sauce béchamel à votre plat principal) avec renvoi direct d'une fiche à l'autre.
- **Convertisseur d'unités culinaires intégré** : basculez d'un tap l'affichage des ingrédients entre unités originales, mesures de masse (`g`, `kg`) ou volumes métriques (`ml`, `cl`, `L`).
- **Ajout intelligent aux courses avec sélection granulaire** : les ingrédients principaux sont cochés par défaut ; les assaisonnements et finitions restent décochés par défaut.
- **Formulaire de recette optimisé (`RecipeFormScreen`)** :
  - Éditeur tabulaire clair Nom / Quantité / Unité (`IngredientTableEditor`).
  - Saisie unifiée assistée par autocomplétion canonique (`UnifiedIngredientInput`).
  - Puces d'organisation `En placard` et `En finition (au goût)`.
  - Éditeur d'étapes ordonnables et liens de recettes associées (`RecipeStepEditor`).

### 8. 📷 Scanner de Recettes par IA (Gemini BYOK) & Import Web
- **Prise de vue native et sécurisée anti-crash OOM (`CameraCaptureModal`)** :
  - Module caméra natif haute performance basé sur `expo-camera` avec prévisualisation plein écran, contrôle du flash, obturateur silencieux et inversion d'objectif.
  - Conçu pour prévenir les dépassements de mémoire (OOM) et les pertes d'état sur Android grâce au plugin `withLargeHeap` et à la suppression automatique des fichiers temporaires bruts du cache.
  - **Support multi-photos Recto / Verso** : idéal pour capturer le visuel et le titre d'un côté, et la liste d'ingrédients détaillée de l'autre (fiches Quitoque, HelloFresh, magazines).
  - Respect strict des exigences Google Play : aucune permission superflue `READ_MEDIA_IMAGES`.
- **Recadrage carré 1:1 & rotation interactive (`ImageCropper`)** :
  - Ajustement tactile fluide au format carré 1:1 pour une mise en page optimale des photos de recettes.
  - Bouton de rotation 90° et aperçu plein écran avant validation définitive.
- **Extraction multimodale IA (Google Gemini)** :
  - Extraction rapide et structurée du titre, temps de prépa/cuisson, portions, ingrédients qualifiés et étapes pas à pas.
  - Saisie de texte brut supportée pour convertir en 1 clic un message ou une note en recette propre.
  - Modèle **BYOK (Bring Your Own Key)** : votre clé API Google AI Studio est stockée localement de manière chiffrée avec `expo-secure-store`.
- **Import Web Universel & Marmiton (`webRecipeService`, `marmitonService`)** :
  - Importation instantanée par simple collage d'URL depuis Marmiton ou n'importe quel site culinaire.
  - Validation d'URL stricte avec protection anti-SSRF (rejet des IP locales et identifiants masqués).

### 9. 📤 Partage Hors-Ligne par QR Code & Impression PDF
- **Partage sans réseau par QR Code compact (`RecipeQrModal` & `QrScannerModal`)** :
  - Encodage ultra-compact sans perte de la recette via compression `lz-string` et rendu matriciel optimisé `toqr`.
  - Permet de transférer instantanément une recette complète d'un smartphone à un autre sans aucune connexion Internet ni serveur tiers.
  - Scanner de QR code intégré pour importer la recette partagée en une fraction de seconde.
- **Impression & Export PDF haute résolution (`RecipePrintModal` & `recipePdfService`)** :
  - Génération de fiches recettes élégantes au format A4 prêtes à imprimer ou à exporter en PDF via `expo-print` et `expo-sharing`.
  - Personnalisation avant export : choix du nombre de convives, inclusion/exclusion de la photo de couverture, ajout d'un QR code de partage et lignes lignées pour notes manuscrites.

### 10. ⭐ Notation, Filtres Avancés & Mode Cuisine Interactif
- **Système de notation épuré** : notez vos recettes de 0.5 à 5.0 étoiles de façon visuelle et mémorisez des notes secrètes.
- **Double bandeau de filtres rétractable au scroll** :
  - Catégories horizontales (*Tous, Plats, Desserts, Entrées...*).
  - Filtres secondaires : recettes végétariennes, note minimale, tri par date/temps/alphabétique.
  - Animation fluide exécutée à 60 fps sur le thread natif (`useNativeDriver: true`) avec seuils d'hystérésis calibrés.
- **Modale de filtres avancés (`AdvancedFiltersModal`)** : combinez temps de préparation maximum, difficulté, ingrédients spécifiques et compatibilité avec votre stock.
- **Mode Session Cuisine Interactif (`CookingModeModal`)** :
  - Vue plein écran sans distraction empêchant la mise en veille de l'appareil.
  - Ingrédients et étapes avec cases à cocher interactives pour suivre votre avancée pas à pas sans toucher l'écran avec les mains sales.

### 11. 💾 100% Hors-Ligne, Scalable (SQLite) & Photos Permanentes
- **Moteur SQLite natif (`expo-sqlite`)** : base de données relationnelle locale (`papilles.db` en mode WAL avec clés étrangères) assurant un stockage instantané et sans limite de taille arbitraire.
- **Sécurisation permanente des photos (`expo-file-system`)** : toutes les photos (prises avec la caméra ou choisies dans la galerie) sont copiées dans le stockage permanent sécurisé (`documentDirectory/recipe_photos/`), vous protégeant contre tout nettoyage de cache par l'OS.
- **Sauvegarde, Restauration & Import de Packs (JSON & ZIP)** :
  - Sauvegardez l'intégralité de votre carnet en JSON.
  - Importez des packs complets de recettes (.json ou archive .zip contenant un dossier photos/) avec fusion incrémentale intelligente sans écraser vos stocks ni vos courses, et rapport des ingrédients non catalogués avec accès direct au lexique.
- **Télémétrie locale et privée (`analyticsService`)** : journal d'actions utilisateur strictement local (AsyncStorage, rétention glissante 90 jours / 5000 logs max), zéro tracking externe.

---

## 🚀 Lancement & Développement

### Prérequis
- Node.js (v18+)
- Application mobile **Expo Go** ou build de développement sur smartphone Android / iOS

### Démarrage
```bash
# Lancement avec Metro bundler (mode LAN recommandé)
npm run lan

# Mode tunnel (contournement des réseaux d'entreprise ou isolations Wi-Fi)
npm run tunnel

# Aperçu direct sur navigateur web
npm run web

# Lancement ciblé Android / iOS
npm run android
npm run ios
```

### Tests & Vérification du code
La suite de tests automatisée comprend **36 suites de tests** exécutables directement en CLI Node.js sans simulateur :

```bash
# Lancement de toute la suite de tests automatisée
npm test

# Audit d'intégrité du lexique (426 ingrédients canoniques, 0 collision d'alias)
npm run validate:lexicon

# Tests du moteur de stock & Lexique-First
npm run test:stock

# Tests de l'agrégateur de courses & conversions métriques
npm run test:shopping

# Tests du transfert courses -> étagères et purge des non-alimentaires
npm run test:shopping-shelves

# Tests du normalisateur d'ingrédients à 3 niveaux
npm run test:normalizer

# Tests d'intégration et sécurité mémoire de la caméra
npm run test:camera

# Tests de conformité des allergènes INCO & racines sémantiques
npm run test:allergens

# Tests de propagation en cascade du lexique
npm run test:cascade

# Tests de la sécurisation permanente des photos de recettes
npm run test:images

# Tests d'extraction et de fusion de packs de recettes (JSON / ZIP)
npm run test:pack
npm run test:pack-merge

# Tests de l'export PDF et du partage QR code
npm run test:pdf
npm run test:share

# Tests de l'import universel web anti-SSRF
npm run test:web-recipe

# Vérification stricte des types TypeScript (0 erreur requise)
npx tsc --noEmit

# Linter de code Expo
npm run lint

# Diagnostic de santé du projet Expo
npx expo-doctor
```

---

## 📁 Structure du Projet

```
papilles-recettes/
├── App.tsx                           # Racine de navigation mémoire, tabs & onboarding
├── index.ts                          # Point d'entrée Expo
├── app.json                          # Configuration Expo & permissions natives
├── assets/                           # Icônes de l'application et splash screen
├── plugins/
│   └── withLargeHeap.js              # Plugin Expo Config (largeHeap Android anti-OOM)
├── scripts/                          # Scripts de tests unitaires CLI & maintenance
│   ├── validateCanonicalVocabulary.js# Audit d'intégrité du lexique canonique
│   ├── testStockMatcher.js           # Tests du moteur de stock
│   ├── testShoppingAggregator.js     # Tests de fusion des courses
│   ├── testShoppingToShelves.js      # Tests du rangement et purge non-alimentaire
│   ├── testIngredientNormalizer.js   # Tests du pipeline de normalisation
│   ├── testCameraIntegration.js      # Tests de gestion mémoire caméra
│   └── ...                           # (36 suites de tests au total)
└── src/
    ├── types/                        # Modèles de données TypeScript stricts
    │   ├── recipe.ts                 # Recettes, ingrédients, étapes, catégories
    │   ├── shopping.ts               # Articles de courses et rayons
    │   ├── fridge.ts                 # Articles d'étagères ("Mes étagères")
    │   ├── planner.ts                # Menus hebdomadaires et créneaux
    │   ├── mealLog.ts                # Journal de suivi quotidien des repas
    │   ├── vocabulary.ts             # Ingrédients canoniques et alias
    │   └── analytics.ts              # Événements de télémétrie locale
    ├── theme/                        # Moteur de styles dynamiques
    │   ├── colors.ts                 # Palettes Jardin Botanique, Table Nocturne & CVD
    │   └── ThemeContext.tsx          # Contexte de bascule d'apparence
    ├── constants/
    │   └── units.ts                  # Catalogue des unités culinaires et conversions
    ├── data/
    │   ├── canonicalVocabulary.ts    # Référentiel des 426 ingrédients canoniques
    │   └── initialRecipes.ts         # Recettes de démonstration initiales
    ├── services/                     # Logique métier & persistance
    │   ├── storageService.ts         # Coordinateur métier, cache mémoire & listeners
    │   ├── databaseService.ts        # Persistance relationnelle SQLite (papilles.db, WAL)
    │   ├── imageStorageService.ts    # Stockage permanent des photos (expo-file-system)
    │   ├── recipePackService.ts      # Extraction de packs JSON et archives ZIP
    │   ├── recipePdfService.ts       # Génération et export de fiches PDF (expo-print)
    │   ├── recipeShareService.ts     # Partage QR code compressé (toqr, lz-string)
    │   ├── vocabularyService.ts      # CRUD du lexique canonique & observateurs
    │   ├── unifiedIngredientService.ts# Résolution et suggestions d'ingrédients
    │   ├── recipeAiService.ts        # Extraction IA Gemini & cascade multi-modèles
    │   ├── marmitonService.ts        # Parsing spécialisé de recettes Marmiton
    │   ├── webRecipeService.ts       # Import web universel avec protection anti-SSRF
    │   └── analyticsService.ts       # Télémétrie locale offline (AsyncStorage)
    ├── utils/                        # Moteurs algorithmiques & helpers
    │   ├── ingredientNormalizer.ts   # Pipeline Lexique-First à 3 niveaux
    │   ├── stockMatcher.ts           # Correspondance stock/recettes (< 1 ms, O(1))
    │   ├── shoppingAggregator.ts     # Fusion, conversions métriques & purge
    │   ├── shoppingInputParser.ts    # Analyse syntaxique en langage naturel
    │   ├── allergenMatcher.ts        # Détection des 14 allergènes majeurs INCO
    │   ├── aisleClassifier.ts        # Classification automatique par rayons
    │   ├── searchEngine.ts           # Moteur de recherche multicritère
    │   ├── recipeLinkMatcher.ts      # Suggestions de liens entre recettes
    │   ├── unitConverter.ts          # Conversion masse / volume / cuillères
    │   ├── ingredientSearchMatcher.ts# Recherche optimisée d'ingrédients
    │   ├── sectionListLayoutHelper.ts# Optimisation layout SectionList (zéro lag)
    │   └── helpers.ts                # Scalaires de portions, durées et IDs
    ├── components/                   # Composants d'interface utilisateur
    │   ├── common/                   # UI générique & flux principal
    │   │   ├── CategoryPills.tsx     # Pilules horizontales de catégories
    │   │   ├── EmptyState.tsx        # Écran d'état vide réutilisable
    │   │   ├── RecipeCard.tsx        # Carte de recette dans le flux
    │   │   ├── SearchBar.tsx         # Barre de recherche avec filtres rapides
    │   │   ├── StarRating.tsx        # Notation par étoiles 0.5–5.0
    │   │   └── AdvancedFiltersModal.tsx # Modale de filtres multicritères
    │   ├── recipe-detail/            # Fiche recette & mode cuisine
    │   │   ├── CookingModeModal.tsx  # Mode cuisine pas à pas plein écran
    │   │   ├── RecipeIngredientsList.tsx
    │   │   ├── RecipeInstructionsList.tsx
    │   │   ├── RecipeLinkPickerModal.tsx # Liens de recettes associées
    │   │   └── RecipeServingsController.tsx
    │   ├── recipe-form/              # Formulaire de création & édition
    │   │   ├── IngredientTableEditor.tsx
    │   │   └── RecipeStepEditor.tsx
    │   ├── stock-shopping/           # Hub Courses & Étagères
    │   │   ├── EditShoppingItemModal.tsx # Édition manuelle d'un article de courses
    │   │   ├── FridgeStockView.tsx   # Vue principale "Mes étagères"
    │   │   ├── InStoreShoppingModal.tsx # Mode courses en magasin immersif
    │   │   ├── SwipeableShoppingItemRow.tsx # Ligne de courses swipeable
    │   │   ├── SwipeableStockItemRow.tsx # Ligne d'étagère swipeable
    │   │   └── TransferAnimationOverlay.tsx # Animation de transfert courses -> stock
    │   ├── lexicon-units/            # Saisie normalisée, unités & allergènes
    │   │   ├── AllergenFamilyPickerModal.tsx # Sélecteur d'allergènes INCO
    │   │   ├── IngredientSearchBar.tsx # Recherche rapide d'ingrédients
    │   │   ├── QualifyIngredientModal.tsx # Qualification d'ingrédient hors-lexique
    │   │   ├── UnifiedIngredientInput.tsx # Saisie assistée avec autocomplétion
    │   │   ├── UnitPickerModal.tsx   # Modale complète des unités culinaires
    │   │   ├── UnitQuickPicker.tsx   # Sélecteur rapide d'unités fréquentes
    │   │   └── VocabularyManagerModal.tsx # Gestionnaire complet du lexique
    │   ├── chef-ai/                  # Inspiration anti-gaspi & personnalisation IA
    │   │   ├── ChefFavoritePromptsModal.tsx # Prompts favoris du Chef IA
    │   │   ├── ChefMoodEditModal.tsx # Personnalisation de l'humeur du Chef
    │   │   └── StockCookModal.tsx    # Wrapper rétrocompatible Chef IA anti-gaspi
    │   ├── planner/                  # Planification hebdomadaire & journal de repas
    │   │   ├── MealCalendarModal.tsx # Calendrier interactif de planification
    │   │   ├── MealSlotPickerModal.tsx # Choix du créneau dans la semaine
    │   │   ├── PlanRecipeModal.tsx   # Planification depuis la fiche recette
    │   │   └── QuickMealLogModal.tsx # Saisie rapide d'un repas consommé
    │   └── import-share/             # Caméra, Web, PDF & QR Code hors-ligne
    │       ├── CameraCaptureModal.tsx # Capture photo native anti-crash OOM
    │       ├── ImportRecipeModal.tsx # Modale d'importation web universelle
    │       ├── QrScannerModal.tsx    # Scanner de QR code de recette
    │       ├── RecipePrintModal.tsx  # Modale de configuration d'impression PDF
    │       └── RecipeQrModal.tsx     # Affichage QR code hors-ligne
    └── screens/                      # Écrans principaux
        ├── OnboardingScreen.tsx      # Découverte initiale au premier lancement
        ├── HomeScreen.tsx            # Flux principal, bandeau et widgets
        ├── RecipeDetailScreen.tsx    # Fiche recette, portions et mode cuisine
        ├── RecipeFormScreen.tsx      # Création et modification de recettes
        ├── ScanRecipeScreen.tsx      # Hub unifié ajout/scan IA (Photo, Texte, Web, Chef)
        ├── MealPlannerScreen.tsx     # Menu de la semaine & journal de repas
        ├── ShoppingListScreen.tsx    # Hub unifié Courses & Étagères
        └── SettingsScreen.tsx        # Paramètres, IA, lexique & sauvegardes
```
