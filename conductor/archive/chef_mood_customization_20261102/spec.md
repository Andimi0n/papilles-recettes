# Specification: Personnalisation des Humeurs & Prompts du Chef IA

## 1. Overview
Permettre à l'utilisateur de personnaliser intégralement les "humeurs" du Chef IA depuis les Paramètres de l'application Papilles. L'utilisateur peut modifier les prompts associés aux humeurs existantes, créer de nouvelles humeurs sur-mesure (nom, icône, directives système et d'exécution), supprimer des humeurs indésirables ou réinitialiser le catalogue à son état d'origine. Les humeurs personnalisées sont persistées localement dans SQLite et dynamiquement consommées par le modal de génération d'idées et de recettes (`StockCookModal.tsx`) et le service IA (`recipeAiService.ts`).

---

## 2. User Stories
- **En tant qu'utilisateur cuisinier**, je souhaite modifier les consignes et la tonalité d'une humeur existante (ex: exiger des plats sans lactose ou des recettes au barbecue pour le mode "Réconfortant") afin que le Chef IA s'adapte précisément à mes préférences.
- **En tant qu'utilisateur créatif**, je souhaite ajouter mes propres humeurs culinaires (ex: "Batch Cooking Dimanche", "Cuisine Étudiante Éco", "Menu Gastronomique") avec leur icône et leurs prompts personnalisés.
- **En tant qu'utilisateur**, je souhaite épurer la liste des humeurs dans `StockCookModal` en supprimant celles que je n'utilise jamais.
- **En tant qu'utilisateur**, je souhaite pouvoir réinitialiser toutes les humeurs à leur état initial en un clic en cas d'erreur.

---

## 3. Functional Requirements

### 3.1 Persistance & Service Métier (`StorageService` & `DatabaseService`)
- **Stockage SQLite :** Persistance de la liste personnalisée sous la clé de configuration `chef_moods_v1` dans la table `settings`.
- **API `StorageService` :**
  - `getChefMoods(): Promise<ChefMoodOption[]>` : Récupère les humeurs configurées. Si aucune configuration personnalisée n'existe, retourne une copie de `CHEF_MOODS` (défauts d'usine).
  - `saveChefMood(mood: ChefMoodOption): Promise<ChefMoodOption[]>` : Crée ou met à jour une humeur dans la liste persistée.
  - `deleteChefMood(moodId: string): Promise<ChefMoodOption[]>` : Supprime une humeur. Refuse la suppression s'il ne reste qu'une seule humeur active (sécurité : minimum 1 humeur obligatoire).
  - `resetChefMoods(): Promise<ChefMoodOption[]>` : Supprime la personnalisation et réinitialise la liste aux 7 humeurs canoniques `CHEF_MOODS`.
- **Typage partagé :** L'interface `ChefMoodOption` (`id`, `label`, `icon`, `systemPersona`, `userDirective`, `recipeExecutionPrompt`) est exportée et documentée.

### 3.2 Interface Paramètres (`SettingsScreen.tsx`)
- **Section Accordéon dépliable :**
  - Intégration d'une nouvelle carte dédiée dans `SettingsScreen.tsx` : *"Humeurs & Personnalité du Chef IA"*.
  - En-tête cliquable avec icône étincelles/chef, sous-titre explicatif, badge indiquant le nombre d'humeurs actives, et chevron animé (déplié/replié).
  - Contenu déplié :
    - Liste des humeurs actuelles avec icône, libellé, extrait des consignes, et boutons d'action d'édition (icône crayon) et de suppression (icône corbeille avec confirmation).
    - Bouton principal *"Ajouter une humeur"* avec icône `add-circle-outline`.
    - Bouton secondaire *"Réinitialiser aux humeurs par défaut"* avec dialogue de confirmation natif.
- **Modal de Saisie / Édition d'Humeur (`ChefMoodEditModal.tsx`) :**
  - Formulaire modal propre et réactif :
    1. **Libellé :** Champ texte (ex: "Barbecue & Fumoir").
    2. **Icône :** Palette sélective d'icônes culinaires usuelles issues d'Ionicons (`sparkles`, `flash`, `flame`, `leaf`, `basket`, `wine`, `earth`, `restaurant`, `pizza`, `cafe`, `heart`, `ribbon`, etc.).
    3. **Philosophie & Identité (Étape 1 - Brainstorming) :** Zone multiligne pour `systemPersona` (qui est le chef et quelle est sa vision).
    4. **Directive Utilisateur (Étape 1 - Brainstorming) :** Champ pour `userDirective` (formulation de la demande des 3 idées).
    5. **Consignes de Rédaction (Étape 2 - Recette pas-à-pas) :** Zone multiligne pour `recipeExecutionPrompt` (règles de rédaction, temps, techniques, astuce du chef).
  - Validation : tous les champs doivent être renseignés ; retour haptique et fermeture avec mise à jour immédiate de l'accordéon.

### 3.3 Intégration dans `StockCookModal.tsx` & Moteur IA (`recipeAiService.ts`)
- **Chargement dynamique dans `StockCookModal.tsx` :**
  - Remplacement de l'itération statique sur `CHEF_MOODS` par la liste chargée via `StorageService.getChefMoods()`.
  - Si l'humeur mémorisée par défaut n'existe plus dans la liste, basculer automatiquement sur la première humeur active.
  - Transmission de la liste active des humeurs ou de l'objet `ChefMoodOption` sélectionné aux fonctions d'appel IA.
- **Résolution dans `recipeAiService.ts` :**
  - Adaptation de `generateRecipeIdeasFromStock()` et `generateFullRecipeFromIdea()` pour rechercher l'humeur parmi les humeurs passées en options ou via `StorageService`, avec repli de sécurité sur `CHEF_MOODS[0]` ("Quotidien") si ID non résolu.

---

## 4. Non-Functional Requirements & Invariants
- **100 % Offline-First :** Aucune dépendance réseau pour la sauvegarde ou la consultation des humeurs.
- **Thème & Ergonomie :** Support complet des thèmes Clair, Sombre et Contraste Élevé via `useTheme()`.
- **Validation & Typage :** Zéro régression TypeScript (`strict: true`), 0 erreur `expo lint`.

---

## 5. Acceptance Criteria
- [ ] Dans `SettingsScreen`, la section accordéon "Humeurs & Personnalité du Chef IA" se déplie et affiche les 7 humeurs initiales.
- [ ] L'utilisateur peut modifier le texte de n'importe quelle humeur (nom, icône, prompts) et la modification est immédiatement visible dans `StockCookModal`.
- [ ] L'utilisateur peut créer une nouvelle humeur avec succès et la retrouver dans la sélection horizontale de `StockCookModal`.
- [ ] L'utilisateur peut supprimer une humeur (sauf la dernière restante).
- [ ] Le bouton "Réinitialiser" restaure l'ensemble des 7 humeurs par défaut.
- [ ] La génération d'idées et de recettes complètes utilise fidèlement les prompts de l'humeur sélectionnée.
- [ ] La suite de tests automatisée valide le comportement CRUD et le comportement de repli.
