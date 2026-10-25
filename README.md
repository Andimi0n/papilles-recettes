# 🍳 Papilles — Carnet de Recettes, Planificateur & Gestion de Stocks

Une application mobile moderne, soignée et intuitive pour gérer vos recettes, planifier vos menus de la semaine, suivre vos repas au quotidien et garder un œil sur les stocks de vos étagères et votre liste de courses.

---

## ✨ Fonctionnalités principales

### 1. 🎨 Multiples Directions Artistiques & Thèmes Dynamiques
- **Thème Clair — *Jardin Botanique & Slow Food*** : vert forêt persistant, céladon apaisant, brume d'amande.
- **Thème Sombre — *Table Nocturne & Sauge Céleste*** : ardoise obsidienne, émeraude culinaire lumineuse, sauge argentée et touches ambrées.
- **Thème Daltonien — *Fort Contraste & Accessibilité*** : contraste optimisé (Bleu & Orange) adapté aux handicaps visuels (safe CVD).
- Choix intuitif dans l'onglet **Paramètres** (mode Système auto, Jardin Botanique, Table Nocturne ou Daltonien) avec prévisualisation des palettes.

### 2. 📱 Navigation Fluide & Bandeau d'Accueil Repensé
- **Bandeau supérieur unifié** : identité visuelle complète avec le logo officiel de Papilles, titre soigné, description culinaire et accès direct aux actions clés sur un seul plan horizontal fluide :
  - **Marmiton** (importation web immédiate par URL)
  - **Scan & IA** (scanner photo, recto-verso et saisie texte)
  - **Ajouter** (création manuelle d'une recette)
- **Barre de navigation inférieure à 4 onglets** :
  - **Recettes** : carnet complet, recherche intelligente, filtres et widget du jour. Navigation entre les recettes simplifiées via **Système de Liens Intelligents** (un ingrédient correspondant à une recette cliquable renvoie directement vers celle-ci).
  - **Repas** : journal des repas du midi/soir et planification hebdomadaire.
  - **Courses & Étagères** : stocks du frigo/placard et liste de courses avec badge des articles restants.
  - **Paramètres** : ambiance visuelle, clé IA, portions par défaut persistantes, lexique canonique et sauvegarde.

### 2. 📅 Suivi des Repas Quotidien & Menu de la Semaine
- **Suivi des repas du jour** : saisie ultra-rapide en texte libre de ce que vous avez mangé le midi et le soir (restaurant, repas sur le pouce, restes ou petit plat maison).
- **Widget Accueil** : visualisez et complétez en 1 clic les repas d'aujourd'hui directement depuis l'écran d'accueil.
- **Journal chronologique** : historique complet de vos repas passés avec possibilité de modification à tout moment.
- **Menu de la semaine** : planifiez vos déjeuners et dîners du lundi au dimanche, visualisez vos menus d'un coup d'œil et exportez automatiquement les ingrédients nécessaires vers la liste de courses.

### 3. 🥫 Hub "Courses & Étagères" (Gestion des Stocks & Courses)
- **Mes étagères (Stock Frigo & Placard)** :
  - Suivi rapide et sans friction des ingrédients disponibles chez vous.
  - **Ajout rapide en 1 clic 100% raccord avec le lexique canonique dynamique** : suggestions basées sur les ingrédients fréquents (`usageCount`) et le drapeau 'pantryStaples', s'adaptant à l'utilisation.
  - **Saisie prédictive instantanée à la chaîne** : cliquer sur une suggestion d'autocomplétion ajoute immédiatement l'ingrédient au stock, efface le champ de recherche et maintient le focus pour enchaîner plusieurs ajouts sans friction.
  - **Classification automatique par rayons** (Primeur, Crémerie, Épicerie salée/sucrée, Boucherie...).
  - **Que cuisiner aujourd'hui ?** : calcul immédiat des recettes faisables avec votre inventaire actif.
  - Commandes verrouillées en haut d'écran pour une saisie fluide sans perte d'espace au défilement.
- **Liste de courses catégorisée & Agrégateur intelligent** :
  - Regroupement automatique selon le rayon officiel (`defaultAisle`) du lexique canonique.
  - **Fusion O(1) et addition arithmétique avec conversion métrique** : les articles identiques sont automatiquement fusionnés et additionnés (ex: `1 kg` + `250 g` = `1,25 kg`, `50 cl` + `1 L` = `1,5 L`).
  - **Gestion fine des fonds de placard** : exclus par défaut pour éviter d'inonder la liste ; si inclus volontairement, affichés sous leur nom seul sans micro-quantité.
  - **Exclusion stricte de l'eau** : l'ingrédient technique `Eau` n'est jamais ajouté aux courses.
  - Cocher/décocher les articles achetés.
  - **Passerelle intelligente** : bouton 1 tap *"Ajouter aux courses"* depuis les étagères, et *"Ranger dans mes étagères 🥫"* pour basculer vos courses achetées dans vos stocks.

### 4. 🍳 Cuisiner avec mon stock & Suggestions du Chef IA ("Anti-gaspillage")
- **Filtrage des recettes 100% faisables avec le stock** :
  - Calcule en temps réel (< 2ms, avec indexation O(1) et cache de normalisation) quelles recettes de votre carnet peuvent être cuisinées immédiatement avec vos aliments en stock (`stockMatcher.ts`).
  - Tolérance intelligente des fonds de placard (`isPantryStaple` : sel, poivre, eau, huiles usuelles, épices) et exclusion des ingrédients facultatifs (`isOptional`).
  - Puce d'accès direct `[En stock (X)]` dans le bandeau de filtres rétractable de l'accueil et bandeau d'état actif dans la liste.
- **Bouton couteau-fourchette repensé (Hub Stock & Anti-gaspillage)** :
  - Bouton interactif moderne à côté de la barre de recherche avec badge dynamique du nombre de recettes faisables ou puce active.
  - Ouvre instantanément une modale complète d'assistance culinaire (`StockCookModal`) sans gel de l'écran, affichant le bilan du carnet, le sélecteur d'ingrédients à valoriser et les options de création.
- **Inspiration Chef IA inédite en 2 étapes & Fallback multi-modèles (Anti-gaspillage)** :
  - **Processus en 2 étapes ludique et sans surcharge** :
    - *Étape 1* : Taper sur *"💡 Trouver 3 idées"* génère quasi instantanément 3 propositions originales avec titre appétissant, temps estimé et accroche culinaire valorisant vos restes.
    - *Étape 2* : Choisissez l'idée qui vous donne envie (*"Cuisiner cette recette →"*) pour obtenir la recette pas-à-pas détaillée avec dosages précis.
  - **Sélecteur de type de plat & Anti-redondance ciblée** : choisissez entre **Entrée**, **Plat** (par défaut) ou **Dessert**. L'anti-redondance cible spécifiquement les recettes déjà faisables avec votre stock pour ce type, éliminant tout doublon sans alourdir le traitement.
  - **Résilience absolue & Cascade de secours multi-modèles** : basculement automatique et invisible entre `gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.0-flash` et `gemini-1.5-flash` en cas de pic de charge (503/429) sur les serveurs Google.
  - **Sélection verticale des ingrédients par rayons** : ingrédients en stock regroupés par rayons (`Fruits & Légumes`, `Produits Frais`, `Épicerie`...) avec compteurs et raccourcis *"Tout cocher"* / *"Tout décocher"* par rayon.
  - Configuration du nombre de portions (synchronisé avec vos préférences), option 100% végétarienne et pré-remplissage direct du formulaire de recette.

### 5. 🏷️ Lexique Canonique & Architecture "Lexique-First"
- **Cascade inversée "Lexique-First"** : recherche exacte directe dans le lexique (noms canoniques et alias) **avant** tout élagage regex destructif. Les termes sensibles composés (*Crème fraîche*, *Légumes surgelés*, *Poudre d'amande*) sont résolus immédiatement sans altération.
- **Identifiant transversal `canonicalId`** : étendu à `Recipe.Ingredient`, `FridgeItem` et `ShoppingItem` pour des correspondances $O(1)$ à 0 faux positif (*Pomme* !== *Pomme de terre*, *Muscade* !== *Noix*).
- **Sécurité sanitaire renforcée des allergènes (Arbitrage 5)** : zéro faux positif sur les ingrédients répertoriés (*oignon blanc* ne déclenche pas sulfites), détection des racines sémantiques alimentaires sur les termes hors lexique (*sauce béchamel* ➔ *lait*), et indicateur ambré de précaution.
- **Élimination automatique des synonymes et contenants** : fini les doublons entre *"boîte de petits pois"* et *"petits pois"*, *"noix de muscade"* et *"muscade"*, ou *"carotte épluchée"* et *"carotte"*.
- **Garde-fous stricts dans le Gestionnaire de vocabulaire** : interdiction des doublons normalisés, protection des alias existants et rejet des termes génériques isolés (*rouge*, *blanc*, *sauce*...).
- **Respect absolu des instructions** : la normalisation s'applique **exclusivement aux ingrédients** ; les étapes et instructions de préparation restent 100% fidèles et intouchées.
- **Autocomplétion prédictive réactive** : composant de saisie avec liste déroulante suggérant les termes officiels sans altérer intempestivement le lexique.
- **Propagation réactive & Cascade automatique** : toute modification du vocabulaire (détachement, fusion, modification de rayon) est répercutée instantanément sur les recettes, stocks et courses sans action manuelle requise.
- **Gestionnaire de vocabulaire complet & Placard personnalisable** : accessible dans les Paramètres pour consulter les ingrédients canoniques, rechercher par rayon ou par filtre rapide `📦 Dans les placards`, définir d'un clic si un ingrédient est habituellement en placard, renommer, ajouter des alias, détacher des synonymes, fusionner des doublons ou réinitialiser.

### 6. 📖 Structure "Livre de Chef", Placard & Ajout Intelligent aux Courses
- **Organisation culinaire par sections (Zéro badge bruyant)** :
  - **Ingrédients principaux** : les denrées principales nécessaires au plat (sans descriptif parasite).
  - **Assaisonnements & condiments** : huiles, vinaigres, assaisonnements et épices usuelles réputées déjà à la maison (descriptif placé sous le titre).
  - **En finition & au goût** : herbes fraîches de dressage, graines, épices au goût ou touches facultatives (descriptif placé sous le titre).
- **Fenêtre de validation avant ajout aux courses ("Ne plus noyer la liste")** : au clic sur *"Ajouter à ma liste de courses"*, une modale intuitive s'ouvre organisée sous ces mêmes sections culinaires. Les ingrédients principaux sont **cochés par défaut** ; les assaisonnements/condiments et finitions sont **décochés par défaut** (il suffit d'un tap si vous en manquez).
- **Raccourcis rapides** : boutons *"Indispensables uniquement"*, *"Tout cocher"* et *"Tout décocher"* pour ajuster votre panier en un éclair.
- **Formulaire de recette optimisé (Création & Édition)** :
  - **Véritables colonnes Nom, Quantité, Unité** : en-têtes clairs et distincts au-dessus des lignes plutôt que des descriptifs encombrants répétés dans chaque champ.
  - **Tailles proportionnées intelligentes** : plus de largeur allouée au nom de l'ingrédient, espace préservé pour la quantité et champ unité resserré et centré.
  - **Menu de suggestions de vocabulaire élargi** : la fenêtre déroulante d'autocomplétion s'ouvre désormais en pleine largeur (jusqu'à 380px) et passe au-dessus des autres champs avec défilement fluide, garantissant une lisibilité parfaite des suggestions et du bouton de création d'ingrédient distinct.
  - **Puces d'organisation** : associez un ingrédient à `En placard` ou `En finition (au goût)` d'un simple clic lors de la création ou modification d'une recette.
- **Classification IA native (Gemini 3.8 Flash)** : les scans photo, textes bruts et créations de recettes par l'IA qualifient automatiquement et avec précision le statut de chaque ingrédient.

### 7. 📷 Scanner de Recettes par IA (Gemini BYOK) & Import Web
- **Scanner Photo & Texte (IA Multimodale)** :
  - Prenez en photo une recette de magazine ou de livre (ou choisissez depuis la galerie).
  - **Support multi-photos** : capturez le **Recto** (titre, visuel) et le **Verso** (ingrédients & étapes détaillées, idéal pour fiches HelloFresh / Quitoque).
  - Extraction automatique par Google Gemini (`gemini-3.8-flash`) : titre, portions, temps, ingrédients structurés et étapes.
  - Collez également du texte brut pour le transformer en fiche recette propre.
  - Modèle **BYOK (Bring Your Own Key)** : votre clé API Google AI Studio reste stockée localement de manière chiffrée.
- **Import Web Marmiton** : importez instantanément n'importe quelle recette Marmiton en collant son URL.

### 8. ⭐ Système de Notation & Filtre par Étoiles
- Notez vos recettes de 0.5 à 5.0 étoiles de façon épurée et immédiate (les étoiles et la note chiffrée suffisent, sans qualificatifs textuels superflus).
- Astuces secrètes et notes personnelles mémorisées sur chaque fiche recette.
- **Filtre par note minimale en fenêtre modale** : bouton dédié dans la barre d'outils secondaire (`Note` ou `≥ 4 ★` avec bouton `(x)` d'effacement rapide) ouvrant une fenêtre harmonisée avec la modale de tri, combinant un sélecteur interactif 5 étoiles et des choix rapides (Toutes les notes, ≥ 4.5, ≥ 4.0, ≥ 3.5, ≥ 3.0).

### 9. 🥗 Double Bandeau de Filtres Rétractable & Boutons Verticaux
- **Bandeau de marque & actions verticales** : l'identité Papilles avec son logo et ses actions rapides (*Marmiton*, *Scan & IA*, *Ajouter*) sont disposées de manière ordonnée à la verticale à droite, optimisant la largeur utile.
- **Double bandeau de filtres rétractable au scroll fluide** : la barre des catégories (*Tous, Plats, Desserts...*) et la barre des filtres secondaires (*Végé, Note minimale, Tri, Effacer*) s'effacent automatiquement lors du défilement vers le bas pour libérer l'espace d'affichage, et réapparaissent dès qu'on remonte. Moteur haute performance exécuté sur le thread natif (`useNativeDriver: true`) avec layout de liste fixe et seuils d'hystérésis calibrés (défilement lent stabilisé sans aucun ping-pong même avec le doigt posé sur l'écran).
- **Barre de recherche verrouillée** : la barre de recherche et le logo restent toujours accessibles en haut de l'écran.
- **Défilement naturel du widget quotidien** : le widget *"Ce que j'ai mangé aujourd'hui"* défile avec la liste de recettes.
- **Navigation parfaitement centrée** : intitulés des onglets (notamment *"Courses & Étagères"* sous l'icône de panier) centrés pour une lisibilité optimale.
- **Palette active dans les paramètres** : les pastilles de couleurs sont présentées sous le nom de l'ambiance active.

### 8. 👨‍🍳 Mode Session Cuisine Interactif
- Liste d'ingrédients et étapes avec cases à cocher pour suivre votre avancée pas à pas sans perdre le fil.
- Ajustement dynamique des proportions selon le nombre de convives souhaité (avec réglage des convives par défaut via un sélecteur +/- précis dans les paramètres).
- Partage clair et formaté de la recette via messagerie ou e-mail.
- Détection intelligente des ingrédients requis et affichage de leurs quantités ciblées directement sur chaque étape de cuisine !

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

### Tests & Vérification du code
```bash
# Lancement de toute la suite de tests automatisée
npm test

# Audit d'intégrité du lexique (135 ingrédients, 0 collision d'alias)
npm run validate:lexicon

# Tests stricts du moteur de stock & Lexique-First
npm run test:stock

# Tests de l'agrégateur de courses & conversions métriques
npm run test:shopping

# Tests de conformité des allergènes INCO & racines sémantiques
npm run test:allergens

# Tests de propagation en cascade du lexique (promotions, fusions, rayons)
npm run test:cascade

# Vérification stricte des types TypeScript (0 erreur requise)
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
