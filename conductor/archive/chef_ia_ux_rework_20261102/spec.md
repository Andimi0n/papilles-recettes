# Specification: Refonte UI/UX des Inspirations du Chef IA & Sélection Tactile du Stock

## 1. Contexte & Objectifs

Le module **Chef IA Anti-Gaspillage** permet de générer des idées de recettes adaptées aux ingrédients disponibles dans la cuisine de l'utilisateur. Malgré de solides fondations algorithmiques, le parcours utilisateur actuel souffre de frictions ergonomiques majeures :
- **Effet « page blanche » paradoxal :** À l'ouverture de `StockCookModal`, aucun ingrédient n'est sélectionné, le CTA principal est grisé et l'utilisateur doit ressaisir manuellement au clavier ce qu'il a déjà dans ses étagères.
- **Rupture de flux sur le typage des ingrédients :** L'obligation de choisir l'onglet « Obligatoire » ou « Optionnel » avant d'ajouter un ingrédient brise la spontanéité de l'action.
- **Dissonance sémantique et double casquette :** Le widget d'accueil promet des « Inspirations du Chef IA », mais ouvre un panneau hybride tentant à la fois de filtrer le carnet existant et d'appeler l'IA, causant un encombrement vertical excessif.
- **Empilement visuel et props orphelines :** `ChefAiWidget` reçoit `doableCount` et `stockItems` sans les exploiter, et le bandeau vert de stock sur `HomeScreen` crée une redondance visuelle inutile.
- **Blocage sur la clé API :** Absence de lien direct vers Google AI Studio dans la modale de saisie de clé API.
- **Risque d'écrasement dans le formulaire :** Dans `RecipeFormScreen`, le sélecteur `[Texte brut (IA)] | [À la main]` reste visible sur les recettes générées (`rec_ai_stock_`), permettant à l'utilisateur d'effacer accidentellement la recette.

Cette refonte vise à transformer le Chef IA en une expérience sobre, fluide, tactile et centrée sur la **reconnaissance visuelle plutôt que le rappel mnésique**.

---

## 2. Exigences Fonctionnelles (Functional Requirements)

### 2.1. Protection du formulaire de recette (`RecipeFormScreen`)
- **Masquage strict du sélecteur de mode de création :**
  - Si une recette est en cours d'édition OU possède des données préchargées (`hasPreloadedData` = `initialRecipe` avec titre ou ingrédients non vides, incluant les identifiants préfixés `rec_ai_stock_` et `extracted_`), le sélecteur d'onglets `[Texte brut (IA)] | [À la main]` ne doit **jamais** être affiché.
  - Le mode actif est forcé sur `'manual'` pour éviter toute perte accidentelle de données si l'utilisateur clique sur la zone supérieure.

### 2.2. Valorisation de `ChefAiWidget` & Nettoyage de `HomeScreen`
- **Exploitation active des props `stockItems` et `doableCount` dans `ChefAiWidget` :**
  - Affichage dynamique d'un aperçu des ingrédients phares en stock (ex: *« Avec : carottes, œufs, parmesan... »*).
  - Formulation contextuelle adaptative : valoriser à la fois la faisabilité immédiate et l'inspiration IA (ex: *« 4 recettes prêtes ou inventez du sur-mesure »*).
- **Suppression du bandeau de stock inutile sur `HomeScreen` :**
  - Suppression complète du bandeau vert redondant `stockActiveBanner` (*« X recettes prêtes avec votre stock »*). Le filtre reste visible via les puces de filtres actives standards, supprimant tout empilement visuel disgracieux.

### 2.3. Sélection tactile directe du Stock dans `StockCookModal`
- **Pré-sélection intégrale par défaut (Zéro page blanche) :**
  - À l'ouverture de la modale, **tous les ingrédients du stock sont automatiquement pré-sélectionnés en mode « Optionnel »**.
  - Le CTA principal *« Trouver 3 idées de recettes »* est immédiatement actif et cliquable en 1 tap dès l'arrivée.
- **Cycle d'interaction tactile à 3 états :**
  - **État initial (Optionnel) :** Puce subtilement colorée (fond de frigo / complément).
  - **1 tap sur Optionnel ➔ Passe en ⭐ Indispensable :** Puce mise en avant (`colors.primary`), icône étoile, et **épinglage automatique en tête de liste** pour une lecture immédiate des ingrédients phares du repas.
  - **1 tap sur ⭐ Indispensable ➔ Passe en Inactif / Exclu :** Puce grisée avec contour discret, exclue de la requête Chef IA.
  - **1 tap sur Inactif ➔ Revient en Optionnel.**
- **Affichage progressif & gestion des stocks volumineux (50+ articles) :**
  - Affichage par défaut limité à 2-3 lignes de puces avec défilement vertical interne fluide et bouton d'expansion/réduction *« Voir tout mon stock (X) »*.
  - Les ingrédients passés en ⭐ Indispensable restent toujours visibles et épinglés en première ligne.
  - Action rapide d'en-tête : bouton bascule discret *« Tout inclure »* / *« Tout exclure »*.
- **Saisie unifiée fluide :**
  - La barre de recherche autocomplétée permet de trouver instantanément un aliment en stock ou d'ajouter un ingrédient hors-stock.
  - Tout ingrédient ajouté depuis la recherche est immédiatement inséré avec possibilité de suppression en 1 tap via croix dédiée.

### 2.4. Découplage sémantique & Clarté du rôle
- **Recentrage exclusif sur le Chef IA :**
  - Titre de la modale harmonisé : **« Inspirations du Chef IA »** (Sous-titre : *« Création sur-mesure & anti-gaspillage »*).
  - Suppression pure et simple de la carte **Section 2 (« Dans votre carnet »)** qui alourdissait inutilement la modale.
- **Passerelle anti-doublon interactive :**
  - Le bandeau informatif anti-doublon existant (`doableFilterInfoBox`) devient interactif si `doableRecipesForCurrentType.length > 0` :
    *« X plats faisables dans votre carnet seront évités • Voir › »*.
  - Un clic sur ce lien active le filtre de stock sur `HomeScreen` et referme la modale en douceur pour l'utilisateur qui préfère finalement cuisiner une recette existante.

### 2.5. Issue rapide pour la Clé API Gemini
- **Modale Clé API enrichie :**
  - Bouton CTA principal : *« Obtenir ma clé gratuite (Google AI Studio) »* ouvrant directement `https://aistudio.google.com/app/apikey` dans le navigateur externe via `Linking.openURL`.
  - Bouton rapide *« Coller »* depuis le presse-papier pour un confort tactile maximal.
  - Instructions sobres en 2 étapes lisibles en 5 secondes.

---

## 3. Exigences Non-Fonctionnelles & Ergonomie

- **Sobriété et Design System Papilles :**
  - Respect scrupuleux des 3 thèmes : Clair (*Jardin Botanique*), Sombre (*Table Nocturne*) et *Contraste Élevé*.
  - Aucune couleur en dur ; utilisation stricte de `useTheme()` et `createDynamicStyles`.
  - Ton culinaire sobre, factuel et chaleureux (zéro superlatif pompeux).
- **Performance & Réactivité (60 FPS) :**
  - Mémorisation (`useMemo`, `useCallback`) des calculs de filtres et d'épinglage des puces pour un rendu instantané, même avec plus de 60 articles en étagères.
  - Défilement tactile fluide sans blocage du thread JS.
- **Résilience & Offline-First :**
  - Les interactions de sélection ne dépendent d'aucun réseau.
  - La clé API reste strictement conservée dans le stockage sécurisé local (`SecureStore` / SQLite settings).

---

## 4. Critères d'Acceptation

- [ ] Dans `RecipeFormScreen`, le sélecteur `[Texte brut (IA)] | [À la main]` est invisible si la recette provient du Chef IA (`rec_ai_stock_`) ou contient des données préremplies.
- [ ] `ChefAiWidget` affiche un aperçu dynamique textuel des ingrédients en stock et exploite `doableCount` et `stockItems`.
- [ ] Sur `HomeScreen`, le bandeau `stockActiveBanner` est supprimé, évitant toute redondance visuelle avec le widget.
- [ ] `StockCookModal` s'intitule « Inspirations du Chef IA » et ne contient plus la Section 2 du carnet.
- [ ] Le bandeau anti-doublon permet de basculer vers les recettes faisables du carnet en 1 clic si désiré.
- [ ] À l'ouverture de `StockCookModal`, tout le stock est pré-sélectionné en Optionnel et le CTA de génération est immédiatement actif.
- [ ] Le cycle tactile (Optionnel ➔ ⭐ Indispensable avec épinglage en tête ➔ Inactif ➔ Optionnel) fonctionne sans friction.
- [ ] Les stocks volumineux disposent d'un défilement interne ou d'un bouton d'expansion limitant l'encombrement à 2-3 lignes par défaut.
- [ ] La modale de clé API propose le lien direct d'ouverture du navigateur vers Google AI Studio et un bouton Coller.
- [ ] Validation stricte : `npx tsc --noEmit && npx expo lint` avec 0 erreur et tous les tests unitaires passants (`npm test`).

---

## 5. Hors Périmètre (Out of Scope)

- Modification de la structure de persistance SQLite (`recipes`, `fridge_items`).
- Modification des prompts Gemini ou du schéma JSON d'idées de recettes (déjà stabilisés).
