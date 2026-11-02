# Implementation Plan: Personnalisation des Humeurs & Prompts du Chef IA

## Phase 1: Persistance & Logique Métier des Humeurs du Chef (TDD) [checkpoint: 5c83550]

- [x] Task: Écrire les tests unitaires pour la persistance et la gestion des humeurs du Chef (5cf9660)
  - [x] Créer le fichier de test `scripts/testChefMoods.js` et le script npm `test:chef-moods`
  - [x] Écrire les tests pour le chargement des humeurs par défaut (repli sur `CHEF_MOODS`)
  - [x] Écrire les tests pour l'ajout, la modification et la suppression d'une humeur
  - [x] Écrire le test d'interdiction de suppression de la dernière humeur restante
  - [x] Écrire le test de réinitialisation aux valeurs d'usine (`resetChefMoods`)
  - [x] Exécuter le test et vérifier son échec (Red Phase)
- [x] Task: Implémenter la persistance dans DatabaseService et StorageService (7288a29)
  - [x] Ajouter la constante de configuration `chef_moods_v1` dans `DatabaseService` / `StorageService`
  - [x] Implémenter `getChefMoods`, `saveChefMood`, `deleteChefMood` et `resetChefMoods` dans `StorageService`
  - [x] Vérifier le passage au vert des tests unitaires (Green Phase)
- [x] Task: Adapter `recipeAiService` pour la prise en charge des humeurs personnalisées (5c83550)
  - [x] Permettre à `generateRecipeIdeasFromStock` et `generateFullRecipeFromIdea` d'utiliser les humeurs configurées
  - [x] Garantir le repli de sécurité sur la première humeur par défaut en cas d'identifiant inconnu
  - [x] Vérifier l'intégrité avec les tests existants de l'IA
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (5c83550)

---

## Phase 2: Composant Formulaire & Édition (`ChefMoodEditModal`) [checkpoint: d43853a]

- [x] Task: Créer le composant modal de création/édition d'humeur (d43853a)
  - [x] Développer `src/components/ChefMoodEditModal.tsx` avec gestion des états d'édition et de création
  - [x] Intégrer les champs obligatoires (libellé, persona Étape 1, directive Étape 1, consigne Étape 2)
  - [x] Intégrer un sélecteur visuel d'icônes culinaires Ionicons
  - [x] Styliser avec `createDynamicStyles` et `useTheme()` pour le support clair/sombre/contraste
  - [x] Ajouter la validation des champs et le retour utilisateur
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (d43853a)

---

## Phase 3: Section Accordéon & Gestion dans `SettingsScreen` [checkpoint: 62b3af3]

- [x] Task: Intégrer la section accordéon dans `SettingsScreen.tsx` (d38955d)
  - [x] Ajouter la carte dépliable "Humeurs & Personnalité du Chef IA" avec en-tête animé et badge de comptage
  - [x] Afficher la liste des humeurs avec leurs icônes, libellés et boutons d'édition/suppression
  - [x] Connecter le modal `ChefMoodEditModal` pour la création et la modification d'humeur
  - [x] Ajouter le bouton de réinitialisation aux valeurs par défaut avec alerte de confirmation
  - [x] Bloquer la suppression si une seule humeur subsiste
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (62b3af3)

---

## Phase 4: Intégration dans `StockCookModal` & Validation Globale [checkpoint: 911d237]

- [x] Task: Dynamiser la sélection des humeurs dans `StockCookModal.tsx` (911d237)
  - [x] Remplacer la constante statique `CHEF_MOODS` par le chargement réactif des humeurs via `StorageService.getChefMoods()`
  - [x] Gérer le repli de sélection si l'humeur active a été supprimée des paramètres
  - [x] Passer la configuration dynamique aux fonctions du service IA
- [x] Task: Validation globale et tests de non-régression (911d237)
  - [x] Exécuter `npm test` pour s'assurer que tous les tests unitaires passent
  - [x] Exécuter `npx tsc --noEmit && npx expo lint` (zéro erreur tolérée)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (911d237)
