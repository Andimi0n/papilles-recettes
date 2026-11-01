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


## Phase 2 : Évolution du Service IA Gemini & Prompting Équilibré (TDD)

- [ ] Task: Mise à niveau du schéma de réponse et du typage RecipeIdea
  - [ ] Ajouter `isVegetarian?: boolean` à l'interface `RecipeIdea`
  - [ ] Mettre à jour `RECIPE_IDEAS_SCHEMA` dans `src/services/recipeAiService.ts` avec la propriété booléenne `isVegetarian`
- [ ] Task: Tests unitaires de RecipeAiService pour la nouvelle logique d'idées (Red Phase)
  - [ ] Tester la prise en compte distincte des ingrédients principaux vs optionnels dans le prompt généré
  - [ ] Tester la consigne d'idée végétarienne garantie et la règle d'arbitrage en présence d'ingrédient carné
  - [ ] Tester le mécanisme de mémoire des refus : injection FIFO des titres rejetés plafonnée à 15 éléments
  - [ ] Valider que les tests échouent comme attendu
- [ ] Task: Implémentation des nouvelles capacités de prompt dans RecipeAiService (Green Phase)
  - [ ] Adapter la méthode `suggestRecipeIdeasFromFridge` pour accepter `{ primaryIngredients, optionalIngredients, rejectedIdeaTitles }`
  - [ ] Formuler les directives système sobres et strictes
  - [ ] Vérifier le passage de l'ensemble des tests au vert
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 : Modale Dédiée des Prompts Favoris (ChefFavoritePromptsModal)

- [ ] Task: Conception et tests du composant ChefFavoritePromptsModal (Red/Green)
  - [ ] Créer le composant `src/components/ChefFavoritePromptsModal.tsx` et ses styles dynamiques
  - [ ] Intégrer l'affichage des prompts favoris avec badges et aperçu
  - [ ] Intégrer l'action d'enregistrement du prompt actif avec dialogue de saisie du titre
  - [ ] Intégrer la suppression d'un prompt favori
  - [ ] Connecter au `useTheme` et vérifier la conformité ergonomique
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 : Refonte Ergonomique de StockCookModal & Interaction Utilisateur

- [ ] Task: Nouvelle barre unique d'ingrédients & bouton à bascule Obligatoire/Optionnel
  - [ ] Remplacer la sélection globale par la barre unifiée connectée au catalogue canonique
  - [ ] Implémenter le toggle Obligatoire / Optionnel
  - [ ] Implémenter la logique de bascule sans doublon (déplacement d'une catégorie à l'autre si ré-ajouté)
  - [ ] Afficher les puces avec distinction visuelle claire et suppression instantanée en 1 tap
- [ ] Task: Intégration du bouton rapide « Tout mon stock en optionnel »
  - [ ] Ajouter le bouton sous la barre de saisie injectant l'intégralité du stock dans les optionnels
- [ ] Task: Connexion de la modale des prompts favoris
  - [ ] Ajouter l'icône marque-page dans le champ des préférences ouvrant `ChefFavoritePromptsModal`
  - [ ] Pré-remplir instantanément le champ au clic sur un favori
- [ ] Task: Gestion de la mémoire des refus et navigation réversible
  - [ ] Conserver l'état complet du formulaire lors du retour depuis l'écran des idées (« Modifier mes critères »)
  - [ ] Gérer le tableau FIFO des titres rejetés (max 15) lors du clic sur « Proposer 3 autres idées »
  - [ ] Réinitialiser l'historique des refus dès modification des ingrédients obligatoires ou de la catégorie
- [ ] Task: Affichage du badge « 🌿 Végétarien » sur les cartes de recettes proposées
  - [ ] Afficher le badge dans la vue des 3 idées pour toute recette identifiée `isVegetarian`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 : Validation Globale, Tests Métier & Non-Régression

- [ ] Task: Exécution de la suite complète de validation
  - [ ] Exécuter `npm test` pour s'assurer qu'aucun test existant n'est rompu
  - [ ] Valider le typage strict et le linting : `npx tsc --noEmit && npx expo lint`
  - [ ] Validation manuelle du cycle complet de génération d'idées avec Chef IA
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
