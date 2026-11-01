# Product Definition: Papilles

## 1. Vision & Objectif du Produit
**Papilles** est une application mobile moderne, intuitive et **100 % offline-first** dédiée à la gestion culinaire quotidienne :
- Centralisation et organisation de recettes personnelles et importées (web, photos recto-verso, texte brut).
- Gestion réactive des stocks de cuisine (placards, réfrigérateur, congélateur) sous l'espace « Mes étagères ».
- Génération d'une liste de courses intelligente avec agrégation métrique arithmétique O(1) et séparation des indispensables de placard.
- Planification fluide des menus hebdomadaires et suivi du journal des repas quotidiens.
- Moteur sémantique culinaire « Lexique-First » avec identification instantanée des 14 allergènes majeurs INCO.
- Assistance IA multimodale via Google Gemini (BYOK — Bring Your Own Key) pour l'anti-gaspillage (« Chef IA ») et la numérisation assistée.

## 2. Public Cible & Proposition de Valeur
- **Cible :** Cuisiniers du quotidien, familles et personnes soucieuses d'organiser leurs repas, de réduire le gaspillage alimentaire, de maîtriser leur budget courses et de gérer les contraintes alimentaires (allergies, intolérances, régimes).
- **Proposition de Valeur :**
  - **Souveraineté des données :** 100 % offline-first, persistance SQLite locale, aucune inscription obligatoire, aucun tracking ni serveur tiers.
  - **Fluidité & Vitesse :** Calculs de recettes faisables en direct (< 2 ms) grâce à une indexation optimisée et sans requêtes réseau superflues.
  - **Intelligence Pratique :** Pas de listes de courses polluées par des ingrédients de base (sel, eau, poivre), conversions métriques automatiques et suggestions de recettes selon ce qui reste réellement dans les placards.

## 3. Fonctionnalités Clés & Capacités

### 3.1 Carnet de Recettes & Expérience "Livre de Chef"
- Fiches recettes structurées en 3 sections culinaires claires :
  1. *Ingrédients principaux*
  2. *Assaisonnements & condiments* (fonds de placard)
  3. *En finition & au goût* (dressage, herbes, épices facultatives)
- Ajustement dynamique des portions (1 à 50 convives) avec recalcul instantané des quantités.
- Mode cuisine pas-à-pas en plein écran empêchant la mise en veille.
- Notation par étoiles (0.5 à 5.0).
- Système de filtres multi-critères : catégories, temps de préparation, notation, régimes, faisabilité immédiate avec le stock.
- Export et partage de recettes (PDF propre, lien de partage, QR code).

### 3.2 Hub "Courses & Étagères"
- **Mes Étagères (Stock Frigo & Placard) :**
  - Inventaire sans unité pour un matching rapide et sans friction.
  - Saisie prédictive instantanée en chaîne alignée sur le lexique canonique.
  - Organisation automatique par rayons (Primeur, Produits frais, Épicerie salée/sucrée...).
- **Liste de Courses Intelligente :**
  - Agrégation arithmétique O(1) avec conversion d'unités compatibles (ex: 250g + 1kg = 1.25kg).
  - Préservation des unités disparates sur des lignes séparées (ex: 3 carottes vs 500g de carottes).
  - Exclusion stricte de l'eau et masquage par défaut des indispensables de placard.
  - Passerelle bidirectionnelle : passage d'ingrédients manquants aux courses en 1 tap, et rangement des courses achetées dans les étagères.

### 3.3 Planificateur de Repas & Journal Quotidien
- Planning hebdomadaire des déjeuners et dîners (du lundi au dimanche).
- Ajout automatique des ingrédients du planning à la liste de courses.
- Journal quotidien de suivi des repas avec autocomplétion prédictive basée sur le carnet de recettes.
- Widget d'accueil pour consultation et validation rapide des repas du jour.

### 3.4 Architecture Sémantique "Lexique-First" & Sécurité Sanitaire
- Pipeline de résolution O(1) : lookup direct dans le catalogue canonique (~350 ingrédients avec alias) avant tout traitement regex destructif.
- Identifiant unique `canonicalId` partagé entre recettes, stock et liste de courses.
- Intégrité des recettes : la normalisation ne touche JAMAIS les étapes (`steps`) de préparation.
- Détection des 14 allergènes majeurs INCO (gluten, crustacés, œufs, poissons, arachides, soja, lait, fruits à coque, céleri, moutarde, sésame, sulfites, lupin, mollusques) par `canonicalId` + filet de sécurité sémantique.
- Gestionnaire de lexique intégré : ajout d'alias, fusion, détachement et cascade automatique des modifications.

### 3.5 IA Multimodale Google Gemini (BYOK) & Chef Anti-Gaspillage
- **Scanner de Recettes :** Numérisation de recettes depuis photos (support recto/verso pour fiches repas), texte brut ou import de lien web.
- **Chef IA Anti-Gaspillage en 2 étapes :**
  1. Génération rapide (< 300 tokens) de 3 propositions sobres basées sur les restes du stock.
  2. Génération complète pas-à-pas de l'idée sélectionnée avec pré-remplissage du carnet.
- **Résilience & Cascade multi-modèles :** `gemini-3.8-flash` -> `2.5-flash` -> `2.0-flash` -> `1.5-flash` avec backoff exponentiel et auto-réparation JSON.
- **Conformité éditoriale sobre :** Interdiction des adjectifs superflus ou pompeux.

## 4. Invariants & Exigences Non-Fonctionnelles
- **Offline-First & Local Storage :** SQLite local (`papilles.db`) avec WAL activé, persistance des photos locales dans `documentDirectory/recipe_photos/`.
- **Zéro fuite de données privées :** Clé API stockée de façon sécurisée (SecureStore), pas de backend distant propriétaire.
- **Performance :** Stock matching et recherche en temps réel sans blocage du thread JS principal (< 16ms / 60 FPS).
- **Accessibilité & Ergonomie :** Interface 100% en français, support des thèmes Jardin Botanique (Clair), Table Nocturne (Sombre) et Contraste Élevé.
