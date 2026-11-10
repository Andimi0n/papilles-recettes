# Spécification Fonctionnelle & Technique : Système de Dossiers & Sélection Multiple

## 1. Vue d'Ensemble (Overview)
Cette fonctionnalité dote Papilles d'un système complet d'organisation par **Dossiers de recettes** (multi-appartenance N-N), accessible via un swipe gestuel horizontal depuis l'accueil ou par onglet dédié.

Elle introduit également un **mode de sélection multiple par appui long** sur les recettes, fluide et persistant au fil des recherches/filtres, avec pilule flottante contextuelle et Bottom Sheet de rangement/dérangement groupé.

---

## 2. Exigences Fonctionnelles (Functional Requirements)

### 2.1 Modèle de Données & Persistance SQLite
- **Table `folders`** :
  - `id` (TEXT PRIMARY KEY) : Identifiant unique (`folder_${timestamp}_${nanoid}`)
  - `name` (TEXT NOT NULL) : Nom du dossier
  - `icon` (TEXT NOT NULL) : Emoji personnalisé (ex: 📁, 🍰, 🥗, ⏱️, 🍝)
  - `created_at` (INTEGER NOT NULL)
  - `updated_at` (INTEGER NOT NULL)
- **Table de liaison `recipe_folders` (Modèle N-N)** :
  - `recipe_id` (TEXT NOT NULL, FOREIGN KEY REFERENCES recipes(id) ON DELETE CASCADE)
  - `folder_id` (TEXT NOT NULL, FOREIGN KEY REFERENCES folders(id) ON DELETE CASCADE)
  - `added_at` (INTEGER NOT NULL)
  - `PRIMARY KEY (recipe_id, folder_id)`
  - Index SQLite sur `folder_id` et `recipe_id`.
- **Dossier virtuel « Non classées »** :
  - Identifiant symbolique `'UNCATEGORIZED'`.
  - Calculé dynamiquement en base : recettes sans aucune liaison dans `recipe_folders`.
- **Règle d'or de préservation** :
  - Supprimer un dossier supprime uniquement le dossier et ses entrées dans `recipe_folders`. Aucune recette n'est jamais supprimée de la table `recipes`.
- **Réactivité & Cache mémoire** :
  - `StorageService` gère un cache mémoire synchronisé et des listeners d'événements pour notifier l'accueil (`HomeScreen`), les compteurs des dossiers et `activeFolderId` dès qu'une modification intervient.

### 2.2 Navigation Gestuelle & Pager Horizontal
- **Bascule Recettes <-> Grille des Dossiers** :
  - Sélecteur segmenté en tête d'accueil (`Recettes` / `Dossiers`).
  - Geste de swipe horizontal avec seuil strict :
    - Déclenchement uniquement si `Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy) * 2`.
    - Aucune capture de geste horizontal dans la zone du bandeau de filtres (`FILTER_BAR_HEIGHT = 88`) afin de ne jamais parasiter le scroll vertical des recettes ou le défilement horizontal des pilules de catégories.
- **Support Android BackHandler** :
  - Si le mode sélection est actif : l'appui sur le bouton physique Retour quitte le mode sélection et vide `selectedRecipeIds`.
  - Si un dossier est actuellement ouvert (`activeFolderId !== null`) : l'appui Retour revient à la grille des dossiers (`activeFolderId = null`).
  - L'application ne se ferme que si l'utilisateur est à la racine de l'accueil hors sélection.

### 2.3 Vue Grille des Dossiers & Vue Intérieure de Dossier
- **Grille des Dossiers (FlashList 2 colonnes)** :
  - Affichage des cartes de dossiers (`FolderCard`) avec mosaïque 2x2 des 4 premières photos, nom, emoji et compteur (ex: `12 recettes`).
  - Helper pur `getFolderMosaicImages(recipes)` garantissant toujours 4 slots `(string | null)[]`.
  - Carte spéciale automatique « Non classées » avec son compteur dédié.
  - Carte/Action « + Nouveau dossier » ouvrant la modale de création (Nom + Sélecteur d'emoji).
- **Ouverture d'un dossier sans duplication d'écran (`activeFolderId`)** :
  - Le clic sur un dossier ne crée pas de nouvel écran dans `App.tsx` : il définit simplement `activeFolderId: string | 'UNCATEGORIZED' | null` dans `HomeScreen`.
  - **Réutilisation à 100 %** de la `FlashList` de recettes, du moteur de recherche `SearchBar`, des `CategoryPills`, du filtre « En stock » et du mode sélection.
  - **Bandeau d'en-tête contextuel** :
    - `[ ← Tous les dossiers | 🍰 Desserts du dimanche (12) | ✏️ Modifier / 🗑️ Supprimer ]`.
  - Bouton retour `← Tous les dossiers` pour réinitialiser `activeFolderId` à `null`.

### 2.4 Mode Sélection Multiple & Rangement Groupé
- **Activation par Appui Long (`onLongPress`)** sur une `RecipeCard` :
  - **AUCUN retour haptique** (vibration désactivée).
  - Animation élastique sur la carte pressée (`scale: 0.97` ➔ `1.0`).
  - Bordure de `2px` en `colors.primary`.
  - Pastille cochée (✓) sur la carte sélectionnée.
  - Pastille vide et discrète (cercle fin) sur toutes les autres cartes.
- **Comportement en mode sélection** :
  - Le tap simple (`onPress`) sur une carte ne l'ouvre plus : il bascule son état dans `selectedRecipeIds: Set<string>`.
  - **Persistance de l'état** : `selectedRecipeIds` est conservé pendant la navigation, la pagination, la frappe dans la `SearchBar` et le filtrage par catégories.
- **Pilule Flottante (Floating Action Bar)** :
  - Positionnée au-dessus de la barre d'onglets.
  - Depuis la vue principale : `[ ✕  X sélectionnée(s)  |  📁 Ranger dans... ]`.
  - Depuis l'intérieur d'un dossier (`activeFolderId !== null`) : `[ ✕  X sélectionnée(s)  |  📤 Retirer du dossier  |  📁 Autre dossier... ]`.
  - Clic sur `✕` : vide la sélection et désactive le mode.
- **Bottom Sheet « Ranger dans... »** :
  - Liste tous les dossiers existants avec possibilité d'en créer un nouveau à la volée.
  - **Cas 1 recette sélectionnée** : Les dossiers auxquels la recette appartient déjà sont pré-cochés. Décocher un dossier retire la recette de ce dossier.
  - **Cas N recettes sélectionnées** : Fonctionne en mode additif (`INSERT OR IGNORE`) vers les dossiers cochés sans écraser leurs autres dossiers existants.
  - Validation instantanée et mise à jour dynamique des compteurs.

---

## 3. Critères d'Acceptation (Acceptance Criteria)
1. **Intégrité & Données SQLite** :
   - Migration SQLite transparente : création de `folders` et `recipe_folders` sans perturber les données existantes.
   - Suppression sécurisée de dossiers : 0 recette perdue.
   - Support N-N additif pour N recettes et gestion bidirectionnelle pour 1 recette.
2. **Ergonomie Gestuelle & BackHandler** :
   - Gestes de swipe strictement filtrés (`dx > 25 && Math.abs(dx) > Math.abs(dy) * 2`), zone de filtre (`FILTER_BAR_HEIGHT = 88`) exclue.
   - BackHandler Android gère la hiérarchie : Quitter sélection ➔ Quitter dossier ➔ Quitter écran.
   - Zéro vibration haptique.
3. **Fluidité & Réutilisation** :
   - Réutilisation du flux de recettes pour l'intérieur d'un dossier via `activeFolderId`.
   - Mosaïque 2x2 performante avec placeholders en cas de photos manquantes.
   - Persistance de `selectedRecipeIds` lors des recherches textuelles et filtres.
4. **Qualité & Tests** :
   - Tests unitaires complets sur la couche de données (`scripts/testFolderService.js`) et helper de mosaïque (`scripts/testFolderMosaic.js`).
   - `npx tsc --noEmit` et `npx expo lint` : 0 erreur.

---

## 4. Hors Périmètre (Out of Scope)
- Sous-dossiers imbriqués (hiérarchie infinie de dossiers dans des dossiers).
- Partage réseau ou synchronisation cloud de dossiers (l'app reste strictement offline-first).
