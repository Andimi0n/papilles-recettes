# Specification: Rework du système de suggestions d'idées de recettes par chef IA

## 1. Contexte & Objectifs
Le module **Chef IA Anti-Gaspillage** (`StockCookModal.tsx` & `RecipeAiService.ts`) propose actuellement 3 idées de recettes à partir d'une simple sélection globale. Cette refonte vise à apporter une ergonomie précise, épurée et intuitive :
- **Saisie unifiée fluide :** Une barre de recherche unique avec bouton à bascule **« Obligatoire » / « Optionnel »**.
- **Gestion intelligente des puces :** Suppression en 1 tap et déplacement automatique sans doublon si ajouté sous l'autre mode.
- **Action rapide de stock :** Bouton pour verser l'intégralité du stock en ingrédients optionnels en 1 clic.
- **Gestionnaire de prompts favoris :** Modale dédiée avec seeds d'exemples (« 100% sans cuisson au four », « Sauce légère sans crème ni beurre », « Enfants bienvenus (saveurs douces) »), ajout, sélection en 1 tap, suppression et persistance JSON dans `settings` (`chef_favorite_prompts`).
- **Garantie d'une idée végétarienne & typage strict :** Obligation pour l'IA de proposer au moins 1 idée végétarienne (sauf si viandes/poissons obligatoires spécifiés), avec champ typé `isVegetarian: boolean` dans le schéma JSON Gemini (`RECIPE_IDEAS_SCHEMA`) et badge 🌿 dans l'UI.
- **Réversibilité sans perte :** Bouton retour depuis les idées vers le formulaire conservant fidèlement toutes les saisies.
- **Mémoire des refus anti-redondance :** Injection FIFO des 15 derniers titres rejetés avec vidage automatique lors de modifications des critères principaux.

---

## 2. Spécifications Détaillées

### 2.1. Saisie Unifiée & Gestion Obligatoire / Optionnel
- **Barre de recherche :** Recherche autocomplétée sur tout le catalogue canonique (`canonicalVocabulary`), sans badge ni priorisation artificielle du stock.
- **Bouton à bascule (Toggle / Switch) :** Deux positions : `Obligatoire` (ingrédient star indispensable) et `Optionnel` (ingrédient d'appoint ou fond de frigo).
- **Règle de déplacement sans doublon :** Si un ingrédient est déjà présent dans une liste et sélectionné via l'autre mode, il est automatiquement retiré de la première et inséré dans la seconde.
- **Affichage des puces :** Deux groupes clairs avec styles visuels distincts (`colors.primary` pour Obligatoire, teinte plus douce pour Optionnel). Un simple tap sur une puce la retire immédiatement de la sélection.
- **Action rapide « Tout mon stock en optionnel » :** Visible sous la zone d'ajout, injecte tous les éléments du stock dans la liste optionnelle en évitant les doublons avec les obligatoires déjà présents.
- **État initial :** Listes vides à l'ouverture de la modale pour laisser l'utilisateur composer librement.

### 2.2. Modale des Prompts Favoris & Persistance
- **Modale dédiée `ChefFavoritePromptsModal` :**
  - Accès via icône marque-page à côté du champ texte des préférences.
  - Seeds initiaux si vide :
    - « 100 % sans cuisson au four »
    - « Sauce légère sans crème ni beurre »
    - « Enfants bienvenus (saveurs douces) »
  - Clic sur un prompt : injecte le texte dans les préférences et ferme la modale.
  - Enregistrement : bouton « Enregistrer le prompt actuel » avec saisie d'un titre.
  - Suppression : suppression unitaire d'un prompt enregistré.
  - **Stockage :** Persistance via `StorageService` dans la table existante `settings` (clé `chef_favorite_prompts`) sous forme de tableau JSON `{ id: string, title: string, promptText: string, createdAt: string }[]`.

### 2.3. Garantie Végétarienne & Schéma Gemini
- **Règle d'arbitrage :** L'obligation d'avoir au moins 1 idée 100 % végétarienne s'applique dès lors qu'aucun ingrédient carné/poisson n'est imposé dans la liste « Obligatoire » et qu'aucune demande carnée explicite n'est faite dans le champ de prompt.
- **Schéma d'idées Gemini (`RECIPE_IDEAS_SCHEMA`) :**
  - Ajout du champ `isVegetarian: { type: 'BOOLEAN', description: 'Vrai si la recette ne contient ni viande, ni volaille, ni poisson, ni fruit de mer' }`.
- **Rendu UI :** Badge `🌿 Végétarien` affiché sur les cartes de recettes correspondantes selon `idea.isVegetarian`.

### 2.4. Réversibilité du Formulaire
- Bouton retour explicite « Modifier mes critères » sur l'écran des 3 idées (`aiFlowStep === 'ideas'`).
- La navigation rétablit l'étape de configuration (`aiFlowStep === 'config'`) avec conservation exacte des états : ingrédients obligatoires, optionnels, préférences, portions, mood et catégorie.

### 2.5. Mémoire des Refus & Anti-Redondance
- **Plafond FIFO (15 titres max) :** Lors du clic sur « Proposer 3 autres idées », les 3 titres actuels sont ajoutés à une liste de titres rejetés (plafonnée à 15 titres).
- **Prompt Système :** Injection des titres rejetés échappés via `escapeUntrustedDelimiters` dans une section d'interdiction formelle de reproduction ou déclinaison.
- **Invalidation contextuelle :** Réinitialisation automatique de la liste noire dès que l'utilisateur modifie ses ingrédients obligatoires ou change de type de plat (Entrée / Plat / Dessert).

---

## 3. Exigences Non-Fonctionnelles & Ergonomie
- **Design System Papilles :** Épuré, ergonomique, respect des thèmes Clair / Sombre / Contraste Élevé via `useTheme()`.
- **Réactivité :** Autocomplétion et interactions tactiles immédiates (< 16 ms).
- **Offline-First & Sécurité :** Prompts favoris stockés localement, neutralisation des délimiteurs de prompt pour éviter les injections.

---

## 4. Critères d'Acceptation
- [ ] La saisie par barre unique et toggle Obligatoire/Optionnel permet d'affecter les ingrédients sans doublon.
- [ ] Un tap sur une puce la supprime instantanément.
- [ ] Le bouton « Tout mon stock en optionnel » peuple la liste optionnelle en 1 tap.
- [ ] Les prompts favoris sont utilisables, modifiables et persistés dans `settings` avec leurs graines par défaut.
- [ ] Le schéma Gemini retourne `isVegetarian` et l'UI affiche le badge 🌿.
- [ ] Le retour arrière préserve la totalité du formulaire.
- [ ] Les régénérations mémorisent jusqu'à 15 titres rejetés et les excluent du prompt Gemini.
- [ ] `npx tsc --noEmit && npx expo lint` : 0 erreur.
- [ ] Tests unitaires métier validés (`npm test`).

---

## 5. Hors Périmètre (Out of Scope)
- Modification du modèle de données de recettes sauvegardées (`Recipe`).
- Génération d'images par IA pour les 3 idées.
- Partage en ligne des prompts favoris (l'application reste 100 % offline-first).
