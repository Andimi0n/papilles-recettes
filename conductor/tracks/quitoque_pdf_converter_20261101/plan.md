# Plan d'Implémentation : Pipeline de Conversion PDF Quitoque vers Pack ZIP Papilles

Ce plan détaille la réalisation technique étape par étape en Test-Driven Development (TDD) du convertisseur Python autonome situé dans `/home/gabriel/Documents/ProjetsDev/PhotoRecette/`.

---

## Phase 1 : Environnement, Modèles de Données & Schéma Papilles

Objectif : Initialiser l'environnement d'exécution Python, les dépendances et les modèles Pydantic strictement conformes aux types de recettes de Papilles.

- [ ] Task: Initialisation du projet et des dépendances
  - [ ] Créer `requirements.txt` (`pymupdf`, `pillow`, `google-genai`, `pydantic`, `pytest`, `python-dotenv`, `tqdm`)
  - [ ] Créer `.gitignore` (exclure `.cache/`, `*.zip`, `.env`, `__pycache__/`, `venv/`)
  - [ ] Créer `.env.example` avec `GEMINI_API_KEY=`
- [ ] Task: TDD - Modèles de données Papilles (Pydantic)
  - [ ] Écrire les tests unitaires `tests/test_models.py` validant la sérialisation JSON, les types et champs obligatoires
  - [ ] Implémenter `models.py` avec `Recipe`, `Ingredient`, `RecipeStep`, `Category`, `Difficulty`
  - [ ] Vérifier la stricte conformité avec `Recipe` de Papilles (`canonicalId`, `isPantryStaple`, `imageUrl: "photos/<id>.jpg"`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 2 : Ingestion PDF, Redressement & Appariement Recto/Verso

Objectif : Rasteriser les pages scannées (300 DPI), détecter et corriger automatiquement les orientations (notamment les fiches paysage scannées en A4 portrait), et apparier les pages en paires de recettes.

- [ ] Task: TDD - Découpage d'images & redressement d'orientation
  - [ ] Écrire les tests unitaires `tests/test_pdf_extractor.py` sur des pages échantillons (vérification résolution et dimensions)
  - [ ] Implémenter `pdf_extractor.py` utilisant PyMuPDF (`fitz`) pour rasteriser les pages PDF en images haute fidélité
  - [ ] Implémenter la détection et correction automatique d'orientation (gestion des rotations 90°, 180°, 270°)
- [ ] Task: TDD - Appariement et classification des fiches (Recto/Verso)
  - [ ] Écrire les tests unitaires `tests/test_page_matcher.py` (détection des fiches recettes vs pages éditoriales d'astuces)
  - [ ] Implémenter `page_matcher.py` regroupant les pages en paires cohérentes `(recto, verso)` et écartant les pages orphelines sans recette
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 3 : Extraction Multimodale Gemini & Checkpoints Résilients

Objectif : Extraire les recettes complètes et structurées via l'API Gemini Vision en envoyant conjointement Recto et Verso, avec reprise automatique sur cache local en cas de coupure.

- [ ] Task: TDD - Gestionnaire de cache et checkpoints sur disque
  - [ ] Écrire les tests unitaires `tests/test_cache_manager.py` (sauvegarde, reprise, intégrité du cache)
  - [ ] Implémenter `cache_manager.py` gérant le stockage des recettes extraites sous `.cache/recipes/<id>.json`
- [ ] Task: TDD - Client d'extraction Gemini Vision
  - [ ] Écrire les tests unitaires `tests/test_gemini_extractor.py` avec mocks de réponses multimodales
  - [ ] Concevoir le prompt d'extraction culinaire sobre et factuelle (interdiction des adjectifs pompeux)
  - [ ] Implémenter `gemini_extractor.py` utilisant le SDK `google-genai` avec schéma de sortie JSON forcé (`Recipe`)
  - [ ] Intégrer la gestion des erreurs réseau et le backoff exponentiel pour les quotas d'API
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 4 : Extraction et Optimisation des Photos de Couverture

Objectif : Extraire ou rogner l'image de plat depuis le Recto scanné et la compresser dans un format optimisé pour l'application mobile.

- [ ] Task: TDD - Traitement et compression d'images
  - [ ] Écrire les tests unitaires `tests/test_image_processor.py` (dimensions maximales 1200px, compression JPEG q=85, taille < 500 Ko)
  - [ ] Implémenter `image_processor.py` pour isoler la photo du plat du Recto et l'enregistrer sous `.cache/photos/<recipe_id>.jpg`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 5 : Packaging ZIP Papilles & Interface CLI

Objectif : Assembler l'archive ZIP finale conforme au chargeur Papilles et fournir un script CLI convivial doté d'une barre de progression.

- [ ] Task: TDD - Générateur de pack ZIP Papilles
  - [ ] Écrire les tests unitaires `tests/test_zip_packager.py` (vérification de `recipes.json`, arborescence `photos/`, absence de Zip Slip)
  - [ ] Implémenter `zip_packager.py` produisant `recettes_quitoque_pack.zip`
- [ ] Task: Orchestration CLI principale
  - [ ] Implémenter `convert_quitoque_to_papilles.py` avec options CLI (`--limit`, `--dry-run`, `--resume`, `--force`)
  - [ ] Ajouter la barre de progression `tqdm` et un tableau récapitulatif final (recettes extraites, photos générées, temps total)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
