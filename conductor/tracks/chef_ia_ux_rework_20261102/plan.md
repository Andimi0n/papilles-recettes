# Implementation Plan: Refonte UI/UX des Inspirations du Chef IA & Sélection Tactile du Stock

## Phase 1: Protection du Formulaire de Recette (`RecipeFormScreen`)
*Sécurisation de l'affichage pour les recettes issues du Chef IA (`rec_ai_stock_`) ou contenant des données préchargées afin d'éviter tout écrasement accidentel.*

- [x] Task: Tests unitaires de la protection des données préchargées (TDD - Red Phase) [af03b62]
  - [x] Écrire les tests vérifiant le masquage strict du sélecteur d'onglets `[Texte brut (IA)] | [À la main]` lorsque `initialRecipe.id` commence par `rec_ai_stock_` ou quand `hasPreloadedData` est vrai
  - [x] Vérifier l'échec initial des tests (Red)
- [x] Task: Implémentation de la protection anti-écrasement dans `RecipeFormScreen.tsx` (Green Phase) [af03b62]
  - [x] Ajuster la condition d'affichage du sélecteur de mode de création (L764) pour masquer les onglets dès que des données sont préchargées ou qu'il s'agit d'une recette IA
  - [x] Forcer `creationMode` sur `'manual'` pour préserver l'intégrité de la recette
  - [x] Valider le passage au vert des tests (Green)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 2: Valorisation de `ChefAiWidget` & Nettoyage de `HomeScreen`
*Suppression du bandeau vert redondant et valorisation des données d'étagères dans la carte du Chef IA.*

- [x] Task: Tests unitaires du widget Chef IA et de l'en-tête d'accueil (TDD - Red Phase) [e6033e6]
  - [x] Rédiger les tests validant l'affichage dynamique de l'aperçu du stock et l'absence de bandeau redondant sur l'écran d'accueil
  - [x] Vérifier l'échec initial des tests (Red)
- [x] Task: Suppression du bandeau de stock et enrichissement de `ChefAiWidget` (Green Phase) [e6033e6]
  - [x] Supprimer le bandeau `stockActiveBanner` dans `src/screens/HomeScreen.tsx`
  - [x] Exploiter activement `stockItems` et `doableCount` dans `src/components/ChefAiWidget.tsx` : aperçu dynamique textuel des ingrédients disponibles et libellé contextuel adaptatif
  - [x] Valider le passage au vert des tests (Green)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 3: Sélection Tactile Directe du Stock (`StockCookModal`)
*Suppression de l'effet page blanche, cycle tactile à 3 états et gestion fluide des stocks volumineux.*

- [x] Task: Tests unitaires du moteur de sélection d'ingrédients (TDD - Red Phase) [df98cd2]
  - [x] Créer les tests validant le cycle d'états tactile (Optionnel ➔ ⭐ Indispensable ➔ Inactif ➔ Optionnel)
  - [x] Valider l'épinglage prioritaire des ingrédients ⭐ Indispensables en tête de liste
  - [x] Valider la pré-sélection intégrale du stock en Optionnel à l'ouverture (CTA actif immédiatement)
  - [x] Vérifier l'échec initial des tests (Red)
- [x] Task: Implémentation des puces tactiles et de l'affichage progressif dans `StockCookModal.tsx` (Green Phase) [df98cd2]
  - [x] Initialiser `optionalIngredients` avec l'ensemble du stock à l'ouverture de la modale
  - [x] Remplacer la gestion actuelle par des puces interactives à 3 états (visuel différencié, étoile sur les indispensables)
  - [x] Mettre en place le défilement interne plafonné à 2-3 lignes avec bouton d'expansion/réduction *« Voir tout mon stock (X) »*
  - [x] Ajouter l'action d'en-tête *« Tout inclure »* / *« Tout exclure »*
  - [x] Valider le passage au vert des tests (Green)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 4: Découplage Sémantique, Issue Clé API & Finitions UI (`StockCookModal`)
*Recentrage exclusif sur l'Inspiration IA, passerelle anti-doublon cliquable et issue rapide pour la clé API.*

- [ ] Task: Tests unitaires du découplage et de la passerelle anti-doublon (TDD - Red Phase)
  - [ ] Écrire les tests vérifiant le déclenchement du filtre de stock de l'écran d'accueil via le bandeau anti-doublon
  - [ ] Vérifier l'absence de régression lors du lancement de la génération sans la Section 2
  - [ ] Vérifier l'échec initial des tests (Red)
- [ ] Task: Refonte de la modale `StockCookModal.tsx` (Green Phase)
  - [ ] Harmoniser le titre : *« Inspirations du Chef IA »* (Sous-titre : *« Création sur-mesure & anti-gaspillage »*)
  - [ ] Supprimer définitivement le bloc Section 2 *« Dans votre carnet »*
  - [ ] Rendre le bandeau informatif anti-doublon interactif (*« X recettes prêtes dans votre carnet seront évitées • Voir › »*)
  - [ ] Enrichir la modale de clé API Gemini : bouton direct d'ouverture du navigateur vers Google AI Studio et bouton « Coller »
  - [ ] Valider le passage au vert des tests (Green)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 5: Validation Globale du Système & Intégration Finale
*Audit d'intégrité TypeScript, linting, tests de non-régression et cohérence thématique.*

- [ ] Task: Validation de la suite de tests et conformité statique
  - [ ] Exécuter `npx tsc --noEmit` et `npx expo lint` (0 erreur requise)
  - [ ] Exécuter l'intégralité de la suite de tests (`npm test`)
- [ ] Task: Revue d'accessibilité et cohérence des thèmes
  - [ ] Vérifier le rendu sur les 3 thèmes (Jardin Botanique, Table Nocturne, Contraste Élevé)
  - [ ] Vérifier les contrastes visuels des 3 états de puces et des boutons d'action
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
