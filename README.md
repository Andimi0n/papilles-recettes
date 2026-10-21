# 🍳 Papilles — Carnet de Recettes, Planificateur & Gestion de Stocks

Une application mobile moderne, soignée et intuitive pour gérer vos recettes, planifier vos menus de la semaine, suivre vos repas au quotidien et garder un œil sur les stocks de vos étagères et votre liste de courses.

---

## ✨ Fonctionnalités principales

### 1. 🎨 Double Direction Artistique & Thèmes Dynamiques
- **Thème Clair — *Jardin Botanique & Slow Food*** : vert forêt persistant, céladon apaisant, brume d'amande.
- **Thème Sombre — *Table Nocturne & Sauge Céleste*** : ardoise obsidienne, émeraude culinaire lumineuse, sauge argentée et touches ambrées.
- Choix intuitif dans l'onglet **Paramètres** (mode Système auto, Jardin Botanique ou Table Nocturne) avec prévisualisation des palettes.

### 2. 📱 Navigation Fluide & Bandeau d'Accueil Repensé
- **Bandeau supérieur unifié** : identité visuelle complète avec le logo officiel de Papilles, titre soigné, description culinaire et accès direct aux actions clés sur un seul plan horizontal fluide :
  - **Marmiton** (importation web immédiate par URL)
  - **Scan & IA** (scanner photo, recto-verso et saisie texte)
  - **Ajouter** (création manuelle d'une recette)
- **Barre de navigation inférieure à 4 onglets** :
  - **Recettes** : carnet complet, recherche intelligente, filtres et widget du jour.
  - **Repas** : journal des repas du midi/soir et planification hebdomadaire.
  - **Courses & Étagères** : stocks du frigo/placard et liste de courses avec badge des articles restants.
  - **Paramètres** : ambiance visuelle, clé IA, portions, lexique canonique et sauvegarde.

### 2. 📅 Suivi des Repas Quotidien & Menu de la Semaine
- **Suivi des repas du jour** : saisie ultra-rapide en texte libre de ce que vous avez mangé le midi et le soir (restaurant, repas sur le pouce, restes ou petit plat maison).
- **Widget Accueil** : visualisez et complétez en 1 clic les repas d'aujourd'hui directement depuis l'écran d'accueil.
- **Journal chronologique** : historique complet de vos repas passés avec possibilité de modification à tout moment.
- **Menu de la semaine** : planifiez vos déjeuners et dîners du lundi au dimanche, visualisez vos menus d'un coup d'œil et exportez automatiquement les ingrédients nécessaires vers la liste de courses.

### 3. 🥫 Hub "Courses & Étagères" (Gestion des Stocks & Courses)
- **Mes étagères (Stock Frigo & Placard)** :
  - Suivi rapide et sans friction des ingrédients disponibles chez vous.
  - **Ajout rapide en 1 clic** avec suggestions d'ingrédients essentiels (*Œufs, Beurre, Lait, Farine, Pâtes, Riz, Huile d'olive...*).
  - **Classification automatique par rayons** (Primeur, Crémerie, Épicerie salée/sucrée, Boucherie...).
  - **Que cuisiner aujourd'hui ?** : calcul immédiat des recettes faisables avec votre inventaire actif.
  - Commandes verrouillées en haut d'écran pour une saisie fluide sans perte d'espace au défilement.
- **Liste de courses catégorisée** :
  - Regroupement automatique par rayons de supermarché pour simplifier vos achats.
  - Cocher/décocher les articles achetés.
  - **Passerelle intelligente** : bouton 1 tap *"Ajouter aux courses"* depuis les étagères, et *"Ranger dans mes étagères 🥫"* pour basculer vos courses achetées dans vos stocks.

### 4. 🏷️ Lexique Canonique & Normalisation Stricte des Ingrédients
- **Élimination automatique des synonymes et contenants** : fini les doublons entre *"boîte de petits pois"* et *"petits pois"*, *"noix de muscade"* et *"muscade"*, ou *"carotte épluchée"* et *"carotte"*.
- **Création délibérée d'ingrédients distincts & détachement de synonymes** : si vous choisissez délibérément de saisir un terme qui était enregistré comme synonyme (ex: conserver *"Noix de muscade"* au lieu d'accepter *"Muscade"*), l'application détache automatiquement cet alias et ses variantes proches du parent et le promeut en ingrédient canonique à part entière avec ses propres synonymes.
- **Pipeline hybride intelligent** : guidage strict de l'IA (Gemini 3.8 Flash) en amont, couplé à un moteur de nettoyage déterministe local (`IngredientNormalizer`) qui résout instantanément vers le nom canonique officiel.
- **Respect absolu des instructions** : la normalisation s'applique **exclusivement aux ingrédients** ; les étapes et instructions de préparation restent 100% fidèles et intouchées.
- **Autocomplétion prédictive réactive** : composant de saisie avec liste déroulante suggérant les termes officiels et permettant de choisir en 1 clic de conserver un ingrédient distinct.
- **Harmonisation en 1 clic ("Normaliser tous les ingrédients")** : bouton disponible dans les Paramètres permettant d'analyser et de standardiser rétroactivement l'ensemble de vos recettes, listes de courses et étagères avec compte-rendu précis.
- **Gestionnaire de vocabulaire complet** : accessible dans les Paramètres pour consulter les ~350 ingrédients canoniques, rechercher par rayon, renommer, ajouter des alias personnalisés, détacher des synonymes en 1 clic, fusionner des doublons ou réinitialiser.

### 5. 📷 Scanner de Recettes par IA (Gemini BYOK) & Import Web
- **Scanner Photo & Texte (IA Multimodale)** :
  - Prenez en photo une recette de magazine ou de livre (ou choisissez depuis la galerie).
  - **Support multi-photos** : capturez le **Recto** (titre, visuel) et le **Verso** (ingrédients & étapes détaillées, idéal pour fiches HelloFresh / Quitoque).
  - Extraction automatique par Google Gemini (`gemini-3.8-flash`) : titre, portions, temps, ingrédients structurés et étapes.
  - Collez également du texte brut pour le transformer en fiche recette propre.
  - Modèle **BYOK (Bring Your Own Key)** : votre clé API Google AI Studio reste stockée localement de manière chiffrée.
- **Import Web Marmiton** : importez instantanément n'importe quelle recette Marmiton en collant son URL.

### 6. ⭐ Système de Notation & Filtre par Étoiles
- Notez vos recettes de 0.5 à 5.0 étoiles de façon épurée et immédiate (les étoiles et la note chiffrée suffisent, sans qualificatifs textuels superflus).
- Astuces secrètes et notes personnelles mémorisées sur chaque fiche recette.
- **Filtre par note interactif en 5 étoiles** : bandeau d'étoiles interactif directement intégré dans la barre d'outils supérieure, avec affichage de la valeur chiffrée (ex: `≥ 3.5`) et bouton d'effacement rapide.

### 7. 🥗 Double Bandeau de Filtres Rétractable & Boutons Verticaux
- **Bandeau de marque & actions verticales** : l'identité Papilles avec son logo et ses actions rapides (*Marmiton*, *Scan & IA*, *Ajouter*) sont disposées de manière ordonnée à la verticale à droite, optimisant la largeur utile.
- **Double bandeau de filtres rétractable au scroll** : la barre des catégories (*Tous, Plats, Desserts...*) et la barre des filtres secondaires (*Végé, Note interactive 5 étoiles, Tri, Effacer*) s'effacent automatiquement lors du défilement vers le bas pour libérer l'espace d'affichage, et réapparaissent instantanément dès qu'on remonte.
- **Barre de recherche verrouillée** : la barre de recherche et le logo restent toujours accessibles en haut de l'écran.
- **Défilement naturel du widget quotidien** : le widget *"Ce que j'ai mangé aujourd'hui"* défile avec la liste de recettes.
- **Navigation parfaitement centrée** : intitulés des onglets (notamment *"Courses & Étagères"* sous l'icône de panier) centrés pour une lisibilité optimale.
- **Palette active dans les paramètres** : les pastilles de couleurs sont présentées sous le nom de l'ambiance active.

### 8. 👨‍🍳 Mode Session Cuisine Interactif
- Liste d'ingrédients et étapes avec cases à cocher pour suivre votre avancée pas à pas sans perdre le fil.
- Ajustement dynamique des proportions selon le nombre de convives souhaité (avec réglage des convives par défaut via un sélecteur +/- précis dans les paramètres).
- Partage clair et formaté de la recette via messagerie ou e-mail.

### 9. 💾 100% Hors-Ligne, Sécurisé & Sauvegarde
- Aucune donnée transmise à des serveurs tiers : tout reste sur votre téléphone dans `AsyncStorage`.
- Clé d'API sécurisée avec `expo-secure-store`.
- **Sauvegarde & Restauration** : exportez toutes vos recettes et données au format JSON (via la feuille de partage de votre téléphone) et restaurez-les en un clic.
- Réinitialisation possible avec le catalogue de recettes Marmiton de démonstration.

---

## 🚀 Lancement & Développement

### Prérequis
- Node.js (v18+)
- Application mobile **Expo Go** (sur smartphone Android ou iOS)

### Démarrage
```bash
# Lancement avec Metro bundler (mode tunnel pour contourner l'isolation réseau/Wi-Fi)
npm start

# Mode local LAN direct
npm run lan:wifi

# Aperçu direct sur navigateur web
npm run web
```

### Vérification du code
```bash
# Vérification des types TypeScript
npx tsc --noEmit

# Diagnostic du projet Expo
npx expo-doctor
```

---

## 📁 Structure du Projet

```
papilles-recettes/
├── App.tsx                     # Navigation racine & gestion des onglets
├── index.ts                    # Point d'entrée Expo
├── app.json                    # Configuration de l'application & permissions
├── assets/                     # Icônes et écrans de démarrage
├── scripts/
│   ├── fetch_top_100_marmiton.py # Script de récupération des recettes Marmiton
│   ├── import_marmiton.js        # Convertisseur de recettes de test
│   └── testExtractRecipe.mjs     # Test CLI pour l'extraction IA Gemini
└── src/
    ├── types/                  # Modèles de données TypeScript
    │   ├── recipe.ts           # Types Recettes, Ingrédients, Étapes
    │   ├── shopping.ts         # Types Liste de courses & Rayons
    │   ├── fridge.ts           # Types Stocks ("Mes étagères") & Rayons
    │   ├── planner.ts          # Types Planning des repas de la semaine
    │   └── mealLog.ts          # Types Journal de suivi des repas quotidien
    ├── theme/                  # Moteur de styles dynamiques
    │   ├── colors.ts           # Palettes Jardin Botanique & Table Nocturne
    │   └── ThemeContext.tsx    # Fournisseur de thème & bascule d'apparence
    ├── services/               # Services métier & persistance
    │   ├── storageService.ts   # Persistance AsyncStorage, SecureStore & sauvegarde JSON
    │   ├── recipeAiService.ts  # Service d'extraction Gemini multimodale
    │   └── marmitonService.ts  # Analyseur et extracteur d'URL Marmiton
    ├── utils/                  # Utilitaires & algorithmes
    │   ├── aisleClassifier.ts  # Classification automatique par rayons de supermarché
    │   ├── shoppingAggregator.ts # Fusion et calcul des ingrédients pour les courses
    │   ├── searchEngine.ts     # Moteur de recherche et correspondance stocks/recettes
    │   └── helpers.ts          # Fonctions de formatage et calculs
    ├── data/
    │   └── initialRecipes.ts   # Recettes de démonstration initiales
    ├── components/             # Composants d'interface réutilisables
    │   ├── RecipeCard.tsx      # Carte de recette avec visuel, difficulté et note
    │   ├── StarRating.tsx      # Sélecteur d'étoiles interactif (0.5 à 5.0)
    │   ├── SearchBar.tsx       # Barre de recherche avec raccourcis
    │   ├── CategoryPills.tsx   # Filtre horizontal de catégories
    │   ├── IngredientChip.tsx  # Badges d'ingrédients interactifs
    │   ├── EmptyState.tsx      # Écran d'état vide
    │   ├── FridgeStockView.tsx # Vue "Mes étagères" avec saisie fixe et recettes compatibles
    │   ├── FridgeSearchModal.tsx # Modal de recherche par ingrédients disponibles
    │   ├── CookingModeModal.tsx  # Mode cuisine pas à pas avec cases à cocher
    │   ├── MealSlotPickerModal.tsx # Sélecteur de créneau pour le menu de la semaine
    │   ├── ImportMarmitonModal.tsx # Dialogue d'importation web Marmiton
    │   ├── QuickMealLogModal.tsx # Modal de saisie rapide du repas (midi / soir)
    │   └── TodayMealWidget.tsx   # Widget accueil pour le suivi des repas du jour
    └── screens/                # Écrans principaux
        ├── HomeScreen.tsx      # Flux de recettes, bandeau unifié et recherche intelligente
        ├── RecipeDetailScreen.tsx # Fiche recette, portions ajustables et partage
        ├── RecipeFormScreen.tsx   # Formulaire de création / édition de recette
        ├── ScanRecipeScreen.tsx   # Scanner IA (Photo, Recto/Verso, Texte libre)
        ├── MealPlannerScreen.tsx  # Menu de la semaine & journal de suivi des repas
        ├── ShoppingListScreen.tsx # Hub unifié Courses & Étagères
        ├── SettingsScreen.tsx     # Page dédiée Paramètres, IA, thèmes, normalisation & sauvegarde
        └── SettingsModal.tsx      # Wrapper modal pour rétro-compatibilité
```
