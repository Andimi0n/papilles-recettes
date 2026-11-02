# Implementation Plan: Personnalisation des Humeurs & Prompts du Chef IA

## Phase 1: Persistance & Logique Métier des Humeurs du Chef (TDD)

- [x] Task: Écrire les tests unitaires pour la persistance et la gestion des humeurs du Chef (5cf9660)
  - [x] Créer le fichier de test `scripts/testChefMoods.js` et le script npm `test:chef-moods`
  - [x] Écrire les tests pour le chargement des humeurs par défaut (repli sur `CHEF_MOODS`)
  - [x] Écrire les tests pour l'ajout, la modification et la suppression d'une humeur
  - [x] Écrire le test d'interdiction de suppression de la dernière humeur restante
  - [x] Écrire le test de réinitialisation aux valeurs d'usine (`resetChefMoods`)
  - [x] Exécuter le test et vérifier son échec (Red Phase)
- [ ] Task: Implémenter la persistance dans DatabaseService et StorageService
  - [ ] Ajouter la constante de configuration `chef_moods_v1` dans `DatabaseService`
  - [ ] Implémenter `getChefMoods`, `saveChefMood`, `deleteChefMood` et `resetChefMoods` dans `StorageService`
  - [ ] Vérifier le passage au vert des tests unitaires (Green Phase)
- [ ] Task: Adapter `recipeAiService` pour la prise en charge des humeurs personnalisées
  - [ ] Permettre à `generateRecipeIdeasFromStock` et `generateFullRecipeFromIdea` d'utiliser les humeurs configurées
  - [ ] Garantir le repli de sécurité sur la première humeur par défaut en cas d'identifiant inconnu
  - [ ] Vérifier l'intégrité avec les tests existants de l'IA
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 2: Composant Formulaire & Édition (`ChefMoodEditModal`)

- [ ] Task: Créer le composant modal de création/édition d'humeur
  - [ ] Développer `src/components/ChefMoodEditModal.tsx` avec gestion des états d'édition et de création
  - [ ] Intégrer les champs obligatoires (libellé, persona Étape 1, directive Étape 1, consigne Étape 2)
  - [ ] Intégrer un sélecteur visuel d'icônes culinaires Ionicons
  - [ ] Styliser avec `createDynamicStyles` et `useTheme()` pour le support clair/sombre/contraste
  - [ ] Ajouter la validation des champs et le retour utilisateur
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 3: Section Accordéon & Gestion dans `SettingsScreen`

- [ ] Task: Intégrer la section accordéon dans `SettingsScreen.tsx`
  - [ ] Ajouter la carte dépliable "Humeurs & Personnalité du Chef IA" avec en-tête animé et badge de comptage
  - [ ] Afficher la liste des humeurs avec leurs icônes, libellés et boutons d'édition/suppression
  - [ ] Connecter le modal `ChefMoodEditModal` pour la création et la modification d'humeur
  - [ ] Ajouter le bouton de réinitialisation aux valeurs par défaut avec alerte de confirmation
  - [ ] Bloquer la suppression si une seule humeur subsiste
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 4: Intégration dans `StockCookModal` & Validation Globale

- [ ] Task: Dynamiser la sélection des humeurs dans `StockCookModal.tsx`
  - [ ] Remplacer la constante statique `CHEF_MOODS` par le chargement réactif des humeurs via `StorageService.getChefMoods()`
  - [ ] Gérer le repli de sélection si l'humeur active a été supprimée des paramètres
  - [ ] Passer la configuration dynamique aux fonctions du service IA
- [ ] Task: Validation globale et tests de non-régression
  - [ ] Exécuter `npm test` pour s'assurer que tous les tests unitaires passent
  - [ ] Exécuter `npx tsc --noEmit && npx expo lint` (zéro erreur tolérée)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
