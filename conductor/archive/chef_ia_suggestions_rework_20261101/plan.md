# Implementation Plan: Rework du système de suggestions d'idées de recettes par chef IA

## Phase 1 : Typage & Persistance des Prompts Favoris (TDD) [checkpoint: d34fd61]

- [x] Task: Définition des types et interfaces pour les Prompts Favoris (2b68d57)
  - [x] Définir l'interface `ChefFavoritePrompt` (`id`, `title`, `promptText`, `createdAt`) dans `src/types/`
- [x] Task: Tests unitaires de persistance dans StorageService (Red Phase) (1ef30d3)
  - [x] Créer le fichier de test unitaire pour la gestion des prompts favoris
  - [x] Tester le chargement des 3 seeds par défaut lorsque le stockage est vide
  - [x] Tester l'ajout, la persistance dans `settings` sous la clé `chef_favorite_prompts`, et la suppression unitaire
  - [x] Valider que les tests échouent comme attendu
- [x] Task: Implémentation de la gestion des prompts favoris dans StorageService (Green Phase) (d34fd61)
  - [x] Implémenter `getChefFavoritePrompts()`, `saveChefFavoritePrompt()` et `deleteChefFavoritePrompt()` dans `src/services/storageService.ts`
  - [x] Vérifier le passage de l'ensemble des tests au vert
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (d34fd61)


## Phase 2 : Évolution du Service IA Gemini & Prompting Équilibré (TDD) [checkpoint: 875cc47]

- [x] Task: Mise à niveau du schéma de réponse et du typage RecipeIdea (667c3f7)
  - [x] Ajouter `isVegetarian?: boolean` à l'interface `RecipeIdea`
  - [x] Mettre à jour `RECIPE_IDEAS_SCHEMA` dans `src/services/recipeAiService.ts` avec la propriété booléenne `isVegetarian`
- [x] Task: Tests unitaires de RecipeAiService pour la nouvelle logique d'idées (Red Phase) (0d0c969)
  - [x] Tester la prise en compte distincte des ingrédients principaux vs optionnels dans le prompt généré
  - [x] Tester la consigne d'idée végétarienne garantie et la règle d'arbitrage en présence d'ingrédient carné
  - [x] Tester le mécanisme de mémoire des refus : injection FIFO des titres rejetés plafonnée à 15 éléments
  - [x] Valider que les tests échouent comme attendu
- [x] Task: Implémentation des nouvelles capacités de prompt dans RecipeAiService (Green Phase) (875cc47)
  - [x] Adapter la méthode `suggestRecipeIdeasFromFridge` pour accepter `{ primaryIngredients, optionalIngredients, rejectedIdeaTitles }`
  - [x] Formuler les directives système sobres et strictes
  - [x] Vérifier le passage de l'ensemble des tests au vert
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (875cc47)


## Phase 3 : Modale Dédiée des Prompts Favoris (ChefFavoritePromptsModal) [checkpoint: cc648d8]

- [x] Task: Conception et tests du composant ChefFavoritePromptsModal (Red/Green) (cc648d8)
  - [x] Créer le composant `src/components/ChefFavoritePromptsModal.tsx` et ses styles dynamiques
  - [x] Intégrer l'affichage des prompts favoris avec badges et aperçu
  - [x] Intégrer l'action d'enregistrement du prompt actif avec dialogue de saisie du titre
  - [x] Intégrer la suppression d'un prompt favori
  - [x] Connecter au `useTheme` et vérifier la conformité ergonomique
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (cc648d8)


## Phase 4 : Refonte Ergonomique de StockCookModal & Interaction Utilisateur [checkpoint: f168aa2]

- [x] Task: Nouvelle barre unique d'ingrédients & bouton à bascule Obligatoire/Optionnel (cf075ca)
  - [x] Remplacer la sélection globale par la barre unifiée connectée au catalogue canonique
  - [x] Implémenter le toggle Obligatoire / Optionnel
  - [x] Implémenter la logique de bascule sans doublon (déplacement d'une catégorie à l'autre si ré-ajouté)
  - [x] Afficher les puces avec distinction visuelle claire et suppression instantanée en 1 tap
- [x] Task: Intégration du bouton rapide « Tout mon stock en optionnel » (cf075ca)
  - [x] Ajouter le bouton sous la barre de saisie injectant l'intégralité du stock dans les optionnels
- [x] Task: Connexion de la modale des prompts favoris (cf075ca)
  - [x] Ajouter l'icône marque-page dans le champ des préférences ouvrant `ChefFavoritePromptsModal`
  - [x] Pré-remplir instantanément le champ au clic sur un favori
- [x] Task: Gestion de la mémoire des refus et navigation réversible (cf075ca)
  - [x] Conserver l'état complet du formulaire lors du retour depuis l'écran des idées (« Modifier mes critères »)
  - [x] Gérer le tableau FIFO des titres rejetés (max 15) lors du clic sur « Proposer 3 autres idées »
  - [x] Réinitialiser l'historique des refus dès modification des ingrédients obligatoires ou de la catégorie
- [x] Task: Affichage du badge « 🌿 Végétarien » sur les cartes de recettes proposées (cf075ca)
  - [x] Afficher le badge dans la vue des 3 idées pour toute recette identifiée `isVegetarian`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (f168aa2)


## Phase 5 : Validation Globale, Tests Métier & Non-Régression [checkpoint: d1abc42]

- [x] Task: Exécution de la suite complète de validation
  - [x] Exécuter `npm test` pour s'assurer qu'aucun test existant n'est rompu
  - [x] Valider le typage strict et le linting : `npx tsc --noEmit && npx expo lint`
  - [x] Validation manuelle du cycle complet de génération d'idées avec Chef IA
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (d1abc42)
