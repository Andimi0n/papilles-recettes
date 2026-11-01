# Technology Stack: Papilles

## 1. Runtime & Frameworks
- **Mobile Framework :** React Native 0.88.0 (Architecture moderne Expo CNG)
- **Application Tooling :** Expo SDK ~58.0.21 (Managed workflow, Continuous Native Generation)
- **UI Library :** React 19.3.0 (`react-native-safe-area-context` ~5.10.1)
- **Langage & Typage :** TypeScript ~6.0.3 en mode strict (`strict: true`)
- **Navigation :** Routeur mémoire dans `App.tsx` (`currentScreen` : `'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan'`) avec gestion du retour contextuel (`returnScreenAfterDetail`). Pas d'Expo Router.

## 2. Persistance & Stockage Local
- **Base de données relationnelle :** SQLite via `expo-sqlite` ~58.0.15 (`papilles.db`, mode WAL activé, PRAGMA foreign_keys)
- **Stockage sécurisé :** `expo-secure-store` ~58.0.2 (chiffrement local de la clé API Gemini en mode BYOK)
- **Gestionnaire de fichiers permanent :** `expo-file-system` ~58.0.13 (stockage isolé des photos de recettes sous `documentDirectory/recipe_photos/`)
- **Compression & Partage :** `lz-string` (compression des données recettes pour partage QR code / liens)

## 3. Composants UI & Médias
- **Listes haute performance :** `@shopify/flash-list` 2.3.2 (pour les listes de recettes et catalogues d'ingrédients)
- **Gestion des images & Caméra :** `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `expo-camera`
- **Sélecteur de documents :** `expo-document-picker` ~58.0.0 (sélection de fichiers locaux `.json` et archives `.zip`)
- **Décompression & Extraction :** `jszip` ^3.10.1 (extraction mémoire par lots avec protection Zip Slip)
- **Typographie & Icônes :** `expo-font`, `@expo/vector-icons`
- **Impression & Export :** `expo-print`, `expo-sharing`, `toqr`

## 4. IA & Services Externes
- **Modèle LLM Multimodal :** Google Gemini REST API (`v1beta`) en mode BYOK (Bring Your Own Key)
  - Cascade multi-modèles avec repli automatique en cas de charge : `gemini-3.8-flash` -> `gemini-2.5-flash` -> `gemini-2.0-flash` -> `gemini-1.5-flash`
  - Backoff exponentiel et auto-réparation JSON (`repairTruncatedJsonString`)
- **Import de Recettes Web :** Parseur web générique (extraction et structuration de recettes en ligne)

## 5. Qualité de Code, Linting & Tests
- **Linter :** ESLint 9 (Flat Config) avec `eslint-config-expo` ~58.0.4
- **Vérification de types :** TypeScript Compiler (`npx tsc --noEmit`)
- **Suite de tests unitaires & d'intégration :**
  - Exécution en CLI Node.js (`npm test`)
  - Tests ciblés par domaine métier :
    - `validate:lexicon` (audit d'intégrité du lexique canonique)
    - `test:stock` (moteur de matching et faisabilité de recettes)
    - `test:shopping` (agrégation métrique O(1))
    - `test:allergens` (sécurité sanitaire des 14 allergènes INCO)
    - `test:images` (isolation et persistance locale des photos)
    - `test:chef-prompts` (persistance des prompts favoris Chef IA)
    - `test:ai-prompt` (génération équilibrée d'idées, arbitrage végétarien et mémoire des refus)
    - `test:cascade`, `test:unified-input`, `test:unit-converter`
