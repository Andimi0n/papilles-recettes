# 🍳 Papilles — Carnet de Recettes de Cuisine

Une application mobile Android moderne, soignée et intuitive pour gérer, noter et cuisiner vos meilleures recettes, avec une recherche intelligente basée sur les ingrédients disponibles dans votre cuisine.

---

## ✨ Fonctionnalités principales

1. **🎨 Design Gourmand & Élégant**
   - Palette chaleureuse (terracotta, vert sauge, crème) et typographie soignée.
   - Cartes de recettes avec photos culinaires haute résolution, temps de préparation, portions et niveau de difficulté.

2. **⭐ Système de Notation Interactif**
   - Notez vos recettes de 1 à 5 étoiles directement depuis les cartes de la liste ou depuis la fiche détaillée.
   - Appréciation dynamique (*"Exceptionnel !"*, *"Très bon"*, *"À perfectionner"*).
   - Espace pour ajouter vos astuces secrètes et notes de chef.
   - Filtrez instantanément par note (ex: *4★ et +*) et triez vos recettes (*Meilleures notes en premier*).

3. **📷 Scanner une Recette par Photo (Reconnaissance IA Multimodale)**
   - Prenez en photo une recette (ou choisissez depuis la galerie) : l'IA analyse l'image et extrait automatiquement le titre, la description, les temps, le nombre de portions, tous les ingrédients (avec quantités et unités) ainsi que les étapes de préparation.
   - **Support multi-photos** : capturez le **Recto** (visuel & titre) et le **Verso** (tableau d'ingrédients & instructions, comme sur les fiches Quitoque / HelloFresh).
   - Pré-remplit directement le formulaire pour vérification et enregistrement instantané dans votre carnet.
   - Clé d'API Google Gemini configurable en 1 clic dans l'application ou en ligne de commande.

4. **🥗 Recherche Puissante par Ingrédients ("Mon Frigo")**
   - Sélecteur multi-ingrédients avec suggestions rapides (tomates, ail, poulet, parmesan, crème...).
   - Indique en un coup d'œil les ingrédients correspondants sur chaque recette.
   - Recherche textuelle instantanée (titre, description ou ingrédient).

4. **✍️ Création & Modification Complète (CRUD)**
   - Formulaire d'ajout/modification intuitif : titre, catégorie, difficulté, temps, portions.
   - Ajout d'ingrédients dynamiques avec quantités et unités.
   - Étapes de préparation numérotées et réorganisables.
   - Sélection de photo : depuis la galerie de votre smartphone ou parmi une sélection de visuels gourmands prédéfinis.

5. **👨‍🍳 Mode Session Cuisine Interactif**
   - Listes d'ingrédients et étapes avec cases à cocher : cochez au fur et à mesure pendant la préparation en cuisine ou pour préparer vos courses !
   - Partage facile de la recette (ingrédients, instructions et note) via les applications de messagerie.
   - Gestion des recettes favorites (cœur).

6. **💾 100% Hors-Ligne & Persistant**
   - Stockage local immédiat avec `AsyncStorage`.
   - Livrée avec 6 délicieuses recettes de démonstration pré-remplies (Risotto crémeux, Curry de poulet coco, Carbonara traditionnelle, Moelleux au chocolat...).

---

## 🚀 Comment lancer l'application sur votre téléphone Android

### Option 1 : Tester sur votre smartphone avec Expo Go (Recommandé)
1. Installez l'application gratuite **Expo Go** depuis le [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) sur votre téléphone Android.
2. Dans le terminal de ce projet, lancez :
   ```bash
   npm start
   ```
   *(Ce script utilise désormais le mode `--tunnel` qui contourne les pare-feu, l'isolation Wi-Fi et les bridges Docker).*
3. Scannez le **QR Code** qui s'affiche dans votre terminal avec l'application Expo Go.
4. L'application se télécharge et s'ouvre sur votre téléphone !

> 💡 *En cas d'utilisation purement en réseau local LAN : `npm run lan:wifi`*

### Option 2 : Tester sur votre navigateur web (Aperçu direct sur PC)
```bash
npm run web
```

---

## 🤖 Configuration de la Reconnaissance Photo (Clé API)

Pour que l'application analyse les photos de recettes :
1. Obtenez une clé d'API gratuite sur [Google AI Studio](https://aistudio.google.com/app/apikey) (gratuit, sans carte bancaire requise).
2. Deux façons d'utiliser la clé :
   - **Directement dans l'application mobile :** Cliquez sur le bouton "Scanner" puis sur l'icône de clé 🔑 en haut à droite pour coller votre clé. Elle est mémorisée sur votre appareil.
   - **Via le script de test en ligne de commande :**
     ```bash
     node scripts/testExtractRecipe.mjs <VOTRE_CLE_API_GEMINI>
     ```
     Le script teste automatiquement l'extraction sur les photos de fiches recettes de `PhotoRecette/` et affiche le résultat JSON complet !

---

## 📁 Structure du projet

```
papilles-recettes/
├── src/
│   ├── types/
│   │   └── recipe.ts             # Types TypeScript (Recipe, Ingredient, Step, etc.)
│   ├── theme/
│   │   └── colors.ts             # Palette de couleurs gourmande & ombres
│   ├── data/
│   │   └── initialRecipes.ts     # 6 recettes de démonstration complètes
│   ├── services/
│   │   └── storageService.ts     # Service de persistance locale (AsyncStorage)
│   ├── utils/
│   │   └── helpers.ts            # Calcul de correspondance ingrédients & formatage
│   ├── components/
│   │   ├── RecipeCard.tsx        # Carte recette avec badges, photo et notation rapide
│   │   ├── StarRating.tsx        # Composant étoiles interactif (1 à 5)
│   │   ├── SearchBar.tsx         # Barre de recherche avec raccourci Frigo
│   │   ├── CategoryPills.tsx     # Sélecteur horizontal de catégories
│   │   ├── IngredientChip.tsx    # Chips d'ingrédients sélectionnables/supprimables
│   │   ├── FridgeSearchModal.tsx # Modal dédié recherche par ingrédients
│   │   └── EmptyState.tsx        # Vue élégante si aucun résultat
│   └── screens/
│       ├── HomeScreen.tsx        # Écran d'accueil (recherche, filtres, tri)
│       ├── RecipeDetailScreen.tsx# Fiche recette (cuisine interactive, notation)
│       └── RecipeFormScreen.tsx  # Formulaire d'ajout / modification de recette
├── App.tsx                       # Composant racine & navigation
└── package.json
```
