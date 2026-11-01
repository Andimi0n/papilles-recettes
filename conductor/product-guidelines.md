# Product Guidelines: Papilles

## 1. Identité Vocale & Ton Rédactionnel
- **Langue de l'interface :** 100 % Français (textes de l'interface, étiquettes, boutons, modales, messages de confirmation et d'erreur).
- **Ton culinaire sobre & factuel :**
  - Chaleureux, clair et bienveillant, orienté vers la simplicité du quotidien.
  - **Interdiction formelle des tournures pompeuses ou lyriques :** Proscrire les adjectifs promotionnels et dithyrambiques (*« sublime »*, *« divin »*, *« explosion de saveurs »*, *« crémeux à souhait »*) dans les descriptions et générations de l'IA.
  - Descriptions d'étapes directes, à l'impératif ou à l'infinitif cohérent, axées sur le geste culinaire.

## 2. Principes de Design & Thèmes Visuels
- **Système de thèmes dynamiques :**
  - *Jardin Botanique (Clair)* : Vert forêt persistant, céladon apaisant, brume d'amande.
  - *Table Nocturne (Sombre)* : Ardoise obsidienne, émeraude culinaire lumineuse, sauge argentée.
  - *Contraste Élevé* : Conçu pour l'accessibilité visuelle et le daltonisme (CVD-Safe).
- **Règle absolue de style :** Aucune couleur en dur dans le code (`#hex`, `rgba` direct). Utilisation systématique de `useTheme()` et du pattern `createDynamicStyles((colors, shadows) => ({ ... }))`.
- **Hiérarchie visuelle épurée :**
  - Système de notation épuré par étoiles (0.5 à 5.0) sans qualificatifs textuels redondants.
  - Organisation "Livre de Chef" en 3 sections visuelles distinctes sans pollution de badges intrusifs :
    1. *Ingrédients principaux*
    2. *Assaisonnements & condiments*
    3. *En finition & au goût*

## 3. Ergonomie & Expérience Utilisateur (UX)
- **Saisie ultra-fluide & prédictive :**
  - Champ de saisie d'ingrédients à autocomplétion plein écran avec sélection en un tap.
  - Enchaînement sans friction dans « Mes étagères » : chaque ajout valide et maintient le focus pour permettre une saisie en chaîne rapide de l'inventaire.
- **Stock sans unité :**
  - « Mes étagères » gère des présences d'ingrédients bruts (sans unités de mesure) pour garantir un calcul de faisabilité instantané (< 2 ms) et sans charge cognitive pour l'utilisateur.
- **Ne pas noyer la liste de courses :**
  - Lors de l'ajout d'une recette aux courses, seuls les *ingrédients principaux* sont cochés par défaut. Les assaisonnements (sel, poivre, huile) et finitions facultatives restent décochés pour éviter la saturation inutile de la liste.
  - Exclusion automatique et inconditionnelle de l'ingrédient technique `Eau`.
- **Mode Cuisine dédié :**
  - Vue plein écran haute lisibilité des étapes pas-à-pas avec maintien de l'écran allumé pendant la préparation.

## 4. Sécurité Sanitaire & Transparence
- **Vigilance Allergènes INCO :** Affichage clair et immédiat des 14 familles d'allergènes majeurs. En cas de détection par racine sémantique sur un ingrédient non canonique, affichage d'un indicateur de précaution ambré.
- **Transparence IA & BYOK :** L'utilisateur est toujours maître de sa clé API Gemini ; les appels de génération sont explicites (actions déclenchées volontairement par l'utilisateur).
