# Specification: Import et Fusion de Pack de Recettes (JSON & ZIP avec Photos)

## 1. Vue d'Ensemble (Overview)
Actuellement, la restauration JSON dans Papilles remplace les données existantes et ne supporte pas l'import de packs de recettes avec photos de couverture.
Cette fonctionnalité introduit un mode dédié « Importer un pack de recettes (Ajouter au carnet) » permettant d'importer et fusionner un lot de recettes sans écraser le stock, la liste de courses ni le journal des repas. Elle supporte à la fois :
1. Un fichier `.json` direct (ou texte JSON en secours) contenant un tableau `Recipe[]`.
2. Une archive `.zip` complète contenant le fichier `.json` et un dossier de photos (`photos/` ou `images/`) associées aux recettes.

## 2. Exigences Fonctionnelles (Functional Requirements)

### 2.1 Interface Utilisateur (SettingsScreen)
- **Point d'entrée dédié :** Section et action distincte « Importer un pack de recettes » bien différenciée de la restauration complète de sauvegarde.
- **Sélecteur de fichier natif :** Sélection de documents (`expo-document-picker`) filtrant `.json` et `.zip`.
- **Alternative de secours :** Modal permettant de coller directement du texte JSON brut.
- **Rapport d'importation valorisant (Point de vigilance 3) :** Boîte de dialogue finale récapitulant précisément :
  - *« X recette(s) ajoutée(s) »*
  - *« Y recette(s) mise(s) à jour »*
  - *« Z photo(s) de couverture liées avec succès »*

### 2.2 Traitement des Données & Déduplication (StorageService)
- **Assainissement strict :** Chaque recette importée passe par `sanitizeStoredRecipe()` et `sanitizeImageUrl()`.
- **Détection des doublons & Stratégie de fusion :**
  - Correspondance par titre normalisé (`normalizeString(recipe.title)`).
  - Si un doublon de titre est détecté : mise à jour des champs de la recette existante tout en conservant son identifiant `id` local pour préserver les liaisons (planning de repas, favoris).
  - Si la recette est inédite : attribution d'un nouvel identifiant unique (`generateUniqueId()`) pour éviter tout conflit d'ID, puis insertion dans le carnet.
- **Préservation intégrale des autres domaines :**
  - Le stock (« Mes étagères »), la liste de courses, les allergènes configurés et l'historique des repas restent strictement intouchés.

### 2.3 Gestion des Archives ZIP & Photos de Couverture
- **Structure d'archive acceptée :**
  - Un fichier `.json` (ex: `recipes.json` ou tout fichier `.json` racine) contenant la liste des recettes.
  - Un dossier `photos/` ou `images/` contenant les visuels.
- **Résolution & Correspondance des photos :**
  - Référence directe dans la recette via `imageUrl` (ex: `photos/tarte_pommes.jpg`, `tarte_pommes.jpg`) ou par convention d'ID / nom de fichier.
- **Format d'URI compatible React Native / Expo (Point de vigilance 2) :**
  - Chaque photo extraite est enregistrée via `ImageStorageService` dans `documentDirectory/recipe_photos/`.
  - Format d'URI garanti : préfixe propre `file:///...` sur mobile (compatible avec `<Image>` d'Expo Image et React Native) et gestion adaptée en environnement Web (URI base64 / blob / chemin relatif).

## 3. Exigences Non-Fonctionnelles & Points de Vigilance

### 3.1 Gestion de la Mémoire sur les gros ZIP (Point de vigilance 1)
- **Traitement séquentiel / par petits lots (3 à 5 images) :** Ne jamais charger ou écrire toutes les images du ZIP en parallèle avec `Promise.all`.
- **Nettoyage mémoire continu :** Libération immédiate des buffers en mémoire après écriture sur disque de chaque fichier pour ménager la RAM sur les téléphones d'entrée de gamme.

### 3.2 Robustesse & Sécurité
- **Protection Zip Slip :** Rejet strict de toute archive contenant des chemins relatifs malveillants (`../`).
- **Validation du schéma :** Vérification de la présence d'au moins une recette valide avant tout enregistrement.
- **Rollback / Isolation :** En cas d'archive ZIP corrompue, aucune écriture partielle n'altère le carnet existant.

## 4. Critères d'Acceptation (Acceptance Criteria)
1. L'utilisateur peut importer un fichier `.json` local : les recettes sont ajoutées ou mises à jour sans toucher aux stocks ni aux courses.
2. L'utilisateur peut importer un fichier `.zip` avec photos : les recettes sont créées/mises à jour et les photos sont extraites séquentiellement et associées proprement avec des URIs valides (`file:///...`).
3. La mémoire est préservée lors de l'extraction de gros fichiers ZIP grâce au traitement par petits lots.
4. Le dialogue de fin affiche le bilan complet (X ajoutées, Y mises à jour, Z photos liées).
5. La suite de tests unitaires valide l'assainissement, la déduplication et l'extraction sécurisée.
