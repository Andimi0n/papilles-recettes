# Spécification Technique : Pipeline de Conversion PDF Quitoque vers Pack ZIP Papilles

## 1. Contexte & Objectif

Le dossier `/home/gabriel/Documents/ProjetsDev/PhotoRecette/` contient 9 fichiers PDF représentant 175 pages numérisées (scans A4 à 300 DPI réalisés avec NAPS2, sans couche texte vectorielle) :
- **Fiches Paysage :** `Quitoque-FichesPaysage01.pdf` à `04.pdf` (44 pages)
- **Fiches Portrait :** `Quitoque-FichesPortrait01.pdf` à `05.pdf` (131 pages)

L'objectif est de disposer d'un outil CLI Python autonome (`convert_quitoque_to_papilles.py`), localisé directement dans ce dossier, capable de :
1. Analyser et extraire les pages scannées des fiches recettes Quitoque.
2. Détecter et apparier les pages (Recto = photo du plat, temps, convives, ingrédients ; Verso = étapes détaillées).
3. Extraire avec précision les données structurées des recettes via l'API Vision Multimodale de Gemini (Google GenAI) conformément au format `Recipe` de Papilles.
4. Extraire, recadrer et optimiser la photo du plat pour chaque recette dans un sous-dossier `photos/`.
5. Générer une archive ZIP standardisée `recettes_quitoque_pack.zip` immédiatement importable dans Papilles via la fonction *« Importer un pack de recettes (Ajouter au carnet) »*.

---

## 2. Architecture & Pipeline de Données

```
+-------------------------------------------------------------------------+
|                  Fichiers PDF (/PhotoRecette/*.pdf)                     |
+-------------------------------------------------------------------------+
                                    |
                                    v [Étape 1 : Ingestion & Extraction]
+-------------------------------------------------------------------------+
|               Extraction & Redressement d'Orientation                   |
| - Découpage des pages en images JPEG/PNG 300 DPI via PyMuPDF / Pillow   |
| - Détection de l'orientation (0°, 90°, 180°, 270°) et rotation          |
| - Détection et filtrage des pages éditoriales (astuces, pub, etc.)     |
+-------------------------------------------------------------------------+
                                    |
                                    v [Étape 2 : Appariement Recto/Verso]
+-------------------------------------------------------------------------+
|                 Structuration des Paires de Pages                       |
| - Paires standards : Page N (Recto) + Page N+1 (Verso)                  |
| - Attribution d'un identifiant unique (ex: rec_quitoque_001)            |
+-------------------------------------------------------------------------+
                                    |
                                    v [Étape 3 : Vision IA & Résolution]
+-------------------------------------------------------------------------+
|                Analyse Multimodale Gemini (JSON Schema)                 |
| - Modèle : gemini-2.5-flash / gemini-1.5-flash                          |
| - Prompt culinaire sobre & extraction stricte :                         |
|   * Titre factuel, portions, temps prep/cuisson, catégorie              |
|   * Ingrédients décomposés (quantité, unité, ingrédient de placard)     |
|   * Étapes numérotées                                                   |
| - Système de checkpoint / cache disque local (.cache/recipes/*.json)    |
+-------------------------------------------------------------------------+
                                    |
                                    v [Étape 4 : Traitement des Photos]
+-------------------------------------------------------------------------+
|                   Extraction de la Photo de Couverture                  |
| - Extraction de la zone visuelle du plat (Recto)                        |
| - Redimensionnement (max 1200px) et compression JPEG (q=85)             |
| - Sauvegarde sous : photos/<recipe_id>.jpg                              |
+-------------------------------------------------------------------------+
                                    |
                                    v [Étape 5 : Assemblage & Validation]
+-------------------------------------------------------------------------+
|              Génération du Pack ZIP (Standard Papilles)                 |
| - Fichier racine : recipes.json (Array[Recipe])                         |
| - Dossier photos : photos/*.jpg                                         |
| - Validation de l'archive (absence de Zip Slip, chemins relatifs)       |
| - Rapport d'exécution en CLI                                            |
+-------------------------------------------------------------------------+
```

---

## 3. Exigences Fonctionnelles Détaillées

### 3.1. Gestion de la clé API Gemini
- Le script lit la clé via la variable d'environnement `GEMINI_API_KEY` ou un fichier local `.env`.
- Si absente, il invite l'utilisateur à la saisir interactivement en début de traitement.

### 3.2. Extraction et Prétraitement d'Images
- Utilisation de `PyMuPDF` (`fitz`) ou `pdf2image` / `pdfimages` pour rasteriser chaque page en mémoire ou dans `.cache/raw_pages/`.
- Détection d'orientation : gestion automatique des scans inversés ou orientés à 90° (cas des fiches paysage scannées en A4 portrait).
- Filtrage des pages parasites : identification des pages ne contenant pas de recette (pages d'astuces générales de cuisine Quitoque, techniques de découpe sans recette, etc.).

### 3.3. Appariement et Analyse Multimodale (Gemini)
- Envoi simultané des deux faces (Recto + Verso) à l'API Gemini Vision dans une seule requête par recette afin de minimiser le nombre de tokens et de requêtes.
- Définition d'un schéma de réponse strict (`response_mime_type="application/json"` ou `response_schema`) correspondant au modèle de données TypeScript de Papilles :

```typescript
{
  id: string;              // "rec_quitoque_<hash/slug>"
  title: string;           // Ex: "Wok de poulet, gingembre et carottes"
  description: string;     // Ex: "Un plat complet parfumé au gingembre frais."
  category: "Plat" | "Entrée" | "Dessert";
  difficulty: "Facile" | "Moyen" | "Difficile";
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;        // Généralement 2 ou 4 selon la fiche
  ingredients: [
    {
      id: string;          // "ing_1"
      name: string;        // Ex: "carottes"
      quantity?: string;   // Ex: "3" ou "300"
      unit?: string;       // Ex: "pièces" ou "g"
      isPantryStaple?: boolean; // true pour sel, poivre, huile d'olive, farine basique
      isOptional?: boolean;
    }
  ];
  steps: [
    {
      id: string;          // "step_1"
      order: number;       // 1, 2, 3...
      instruction: string; // Ex: "Épluchez et coupez les carottes en rondelles..."
    }
  ];
  rating: number;          // Valeur par défaut : 4.5
  imageUrl: string;        // "photos/rec_quitoque_<slug>.jpg"
  sourceSite: "Quitoque";
  createdAt: string;       // Date ISO
  updatedAt: string;       // Date ISO
}
```

### 3.4. Robustesse, Tolérance aux Pannes & Checkpoints
- Le traitement des 175 pages représente environ 80 à 85 recettes.
- **Cache local idempotent :** chaque recette extraite par l'API est immédiatement enregistrée dans `.cache/recipes/<id>.json`.
- En cas d'interruption (panne de courant, coupure internet, dépassement de quota d'API), la relance du script reprend instantanément là où elle s'est arrêtée sans réappeler l'API pour les recettes déjà extraites.
- Gestion du rate limiting avec backoff exponentiel automatique.

### 3.5. Extraction et Sauvegarde des Photos
- Les fiches Quitoque intègrent la photo culinaire sur le Recto.
- Le script extrait l'illustration principale ou recadre la zone haute du Recto, la compresse en JPEG 85% à une résolution optimisée pour mobile (largeur maximale 1200px) et l'enregistre dans `.cache/photos/<id>.jpg`.
- Le lien dans la recette est systématiquement relatif : `imageUrl: "photos/<id>.jpg"`.

### 3.6. Génération de l'Archive ZIP Finale
- Le script compile l'ensemble des recettes dans un fichier `recipes.json` unique.
- Il compresse le fichier `recipes.json` et le dossier `photos/` dans `recettes_quitoque_pack.zip`.
- Le format de l'archive est 100 % conforme aux exigences de `RecipePackService` de Papilles (testé et validé sur mobile).

---

## 4. Exigences Non-Fonctionnelles & Performance

- **Autonomie complète :** Le script fonctionne indépendamment de l'application mobile React Native. Il ne requiert aucun serveur ni base de données distante.
- **Environnement d'exécution :** Python 3.10+ avec un fichier `requirements.txt` minimaliste (`google-genai`, `pymupdf`, `pillow`, `pydantic`).
- **Gestion mémoire :** Traitement séquentiel ou par lots de 2 recettes pour maintenir l'empreinte RAM sous les 500 Mo même sur des scans 300 DPI lourds.
- **Intégrité culinaire :** Zéro invention ou omission d'ingrédients ou d'étapes. Préservation fidèle des temps de préparation et de cuisson indiqués sur les fiches.

---

## 5. Critères d'Acceptation

1. [ ] Exécution sans erreur sur l'ensemble des 9 PDF de `PhotoRecette`.
2. [ ] Génération de l'archive `recettes_quitoque_pack.zip`.
3. [ ] L'archive contient `recipes.json` et toutes les photos sous `photos/*.jpg`.
4. [ ] Toutes les recettes respectent le schéma TypeScript strict de Papilles (`title`, `servings`, `ingredients`, `steps`, `imageUrl`).
5. [ ] Importation réussie du ZIP dans Papilles sans aucun crash ni rejet de validation, avec affichage des photos de couverture locales.

---

## 6. Périmètre Exclu (Out of Scope)

- Modification du code source de l'application mobile Papilles (`src/`).
- Interface graphique lourde (le script est un outil CLI simple avec barre de progression `tqdm`).
- Déploiement cloud ou SaaS (outil purement local pour le poste développeur).
