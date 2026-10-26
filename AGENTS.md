# AGENTS.md — Directives, Architecture & Règles Métier (Papilles)

**Papilles** (`papilles-recettes`) est une application mobile **100 % offline-first** (React Native `0.86` / Expo SDK `57` / React `19` / TypeScript strict `6.0`) de gestion de recettes, stock frigo/placards, liste de courses intelligente, suivi nutritionnel/allergènes et planification de repas, avec IA multimodale Gemini en mode BYOK.

---

## 🚨 1. RÈGLES CRITIQUES D'EXÉCUTION (À RESPECTER STRICTEMENT)

1. **CODE FIRST — ZÉRO « DOC-WASHING » :**
   - Toute fonctionnalité ou correction doit être **implémentée dans le code source (`src/`)**.
   - Ne modifiez **JAMAIS** `README.md` ou `AGENTS.md` à moins que le prompt ne le demande explicitement ou qu'un nouveau fichier/service majeur ne soit créé dans `src/`.
2. **ÉCONOMIE DE TOKENS & VITESSE :**
   - **Éditions chirurgicales :** Utilisez des patchs ciblés. Ne réécrivez jamais un fichier entier pour modifier quelques lignes.
   - **Réponses concises :** Pas de longs préambules ni de résumés narratifs. En fin de tâche, listez uniquement les fichiers modifiés et le statut des tests en 3 à 5 lignes maximum.
3. **GESTION DES DÉPENDANCES & NATIF :**
   - N'ajoutez aucune dépendance sans nécessité absolue. Si indispensable, utilisez **exclusivement** `npx expo install <package>`.
   - **Continuous Native Generation (CNG) :** Ne modifiez jamais les dossiers `android/` ou `ios/` manuellement ; toute configuration native passe par `app.json`.
4. **VALIDATION OBLIGATOIRE AVANT CLÔTURE :**
   - Avant de conclure une tâche ou de committer, exécutez systématiquement :
     ```bash
     npx tsc --noEmit && npx expo lint
     ```
   - Si vous touchez au lexique, au stock, aux courses ou aux allergènes, exécutez le test ciblé correspondant (voir Section 5).
   - **Attention :** Ne lancez **jamais** `npm start` ou `npx expo start` en tâche bloquante dans l'agent.

---

## 🏗️ 2. ARCHITECTURE & NAVIGATION (SANS EXPO ROUTER)

> ⚠️ **PAS D'EXPO ROUTER (`src/app/` n'existe pas).**
> La navigation est gérée par état mémoire dans `App.tsx` via `currentScreen` (`'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan'`) et `returnScreenAfterDetail` pour le retour contextuel.

### Cartographie de `src/` :
- **`App.tsx`** : Racine (`SafeAreaProvider` + `ThemeProvider`), routeur d'écrans en mémoire et barre d'onglets inférieure à 4 entrées (`Recettes`, `Repas`, `Courses & Étagères`, `Paramètres`).
- **`src/screens/`** :
  - `HomeScreen.tsx` : Flux de recettes, barre d'actions (Marmiton, Scan IA, Ajout), recherche, double barre de filtres rétractable au scroll (`useNativeDriver: true`), widgets `ChefAiWidget` / `TodayMealWidget`.
  - `RecipeDetailScreen.tsx` : Vue recette, ajustement dynamique des convives, sous-sections *Livre de Chef* (`Ingrédients principaux`, `Assaisonnements & condiments`, `En finition & au goût`), modale d'ajout aux courses, lancement du mode cuisine.
  - `RecipeFormScreen.tsx` : Création/édition (saisie en tableau Nom / Quantité / Unité, puces `En placard` et `En finition`).
  - `ScanRecipeScreen.tsx` : Extraction IA multimodale (caméra, photos recto/verso, texte brut).
  - `ShoppingListScreen.tsx` : Hub unifié **Courses & Étagères** (switch segmenté entre stock `FridgeStockView` et liste de courses).
  - `MealPlannerScreen.tsx` : Planning hebdomadaire (déjeuner/dîner) et journal de suivi quotidien.
  - `SettingsScreen.tsx` (et `SettingsModal.tsx`) : Thèmes visuels, clé API Gemini, convives par défaut (1–50), gestionnaire de lexique, allergies INCO, backup JSON.
- **`src/services/`** (Logique métier & Persistance) :
  - `storageService.ts` : Wrapper `AsyncStorage` (`@papilles_recipes_v4`, `@papilles_fridge_items_v1`, `@papilles_shopping_list_v1`) et `expo-secure-store` (clé API Gemini). Inclut `sanitizeStoredRecipe()`, `sanitizeImageUrl()`, `migrateRecipesToCanonicalV1()` et la cascade `handleVocabularyCascade()`.
  - `vocabularyService.ts` : CRUD du lexique canonique, gestion des alias, rayons (`defaultAisle`), promotion de synonymes et propagation automatique (Observer pattern).
  - `unifiedIngredientService.ts` : Résolution unifiée d'ingrédients et suggestion de synonymes.
  - `recipeAiService.ts` : Appels REST Gemini (`v1beta`) avec cascade multi-modèles (`GEMINI_MODELS_CASCADE`: `gemini-3.8-flash` → `2.5-flash` → `2.0-flash` → `1.5-flash`), backoff exponentiel et auto-réparation JSON (`repairTruncatedJsonString`).
  - `marmitonService.ts` : Import et parsing de recettes web Marmiton.
- **`src/utils/`** (Moteurs algorithmiques) :
  - `ingredientNormalizer.ts` : Pipeline **Lexique-First** (lookup O(1) sur `canonicalName` et alias *avant* tout stripping regex), cache `NORMALIZATION_CACHE` (`clearNormalizationCache()`).
  - `stockMatcher.ts` : Calcul haute performance (< 1 ms, Maps pré-indexées, zéro regex dans les boucles) des recettes réalisables (`isDoable`) et `missingIngredients`.
  - `shoppingAggregator.ts` : Fusion O(1) par `canonicalId`, conversions métriques (`g`/`kg`, `ml`/`cl`/`L`), exclusion stricte de l'eau (`Eau`), gestion des indispensables de placard (`isPantryStaple`) et export (`formatShoppingListForShare`).
  - `shoppingInputParser.ts` : Parsing en langage naturel pour la liste de courses (`"1kg carottes"`, `"2 paquets de kinder"`, fractions Unicode `½`), supportant à la fois les items canoniques et les produits hors-lexique/ménagers.
  - `allergenMatcher.ts` (et `aisleClassifier.ts`, `searchEngine.ts`, `helpers.ts`) : Détection des 14 allergènes majeurs INCO par `canonicalId` + filet de sécurité sémantique (`INCO_FAMILY_KEY_ROOTS`) sur les ingrédients non catalogués.
- **`src/components/`** : `RecipeCard.tsx`, `StarRating.tsx` (0.5–5.0 sans label texte), `SearchBar.tsx`, `CategoryPills.tsx`, `IngredientChip.tsx`, `FridgeStockView.tsx`, `StockCookModal.tsx` (Chef IA en 2 étapes : 3 idées sobres < 300 tokens puis génération complète), `CookingModeModal.tsx`, `IngredientAutocompleteInput.tsx`, `UnitQuickPicker.tsx`, `UnitPickerModal.tsx`, `AllergenFamilyPickerModal.tsx`, `VocabularyManagerModal.tsx`, `MealSlotPickerModal.tsx`, `QuickMealLogModal.tsx`, `ImportMarmitonModal.tsx`, `ChefAiWidget.tsx`, `TodayMealWidget.tsx`, `EmptyState.tsx`.
- **`src/constants/` & `src/data/`** :
  - `constants/units.ts` : Catalogue standardisé des unités culinaires (5 catégories) et ` formatQuantityWithUnit`.
  - `data/canonicalVocabulary.ts` (~350 ingrédients canoniques) & `data/initialRecipes.ts` (recettes par défaut).
- **`src/types/`** : `recipe.ts`, `shopping.ts`, `fridge.ts`, `planner.ts`, `mealLog.ts`, `vocabulary.ts`.

---

## 🧠 3. INVARIANTS MÉTIER À NE JAMAIS CASSER

1. **Architecture "Lexique-First" & `canonicalId` :**
   - `Recipe.Ingredient`, `FridgeItem` et `ShoppingItem` partagent `canonicalId?: string`.
   - Ne appliquez la normalisation qu'aux **noms d'ingrédients** (les étapes `steps` des recettes restent 100 % intactes).
   - Dans `RecipeFormScreen`, toute modification manuelle du nom d'un ingrédient doit réévaluer `normalizeIngredient()` pour éviter un `canonicalId` obsolète.
   - Toute modification du lexique dans `VocabularyService` doit déclencher `StorageService.handleVocabularyCascade()` et `clearNormalizationCache()`.
2. **Règles d'Unités & Stock :**
   - **Stock ("Mes étagères") :** Strictement **sans unités** pour garantir un matching ultra-rapide.
   - **Liste de courses :** Additionne les unités identiques ou métriquement compatibles (`500g` + `1kg` = `1.5kg`), mais conserve sur des lignes distinctes les unités disparates (`300g de carottes` vs `2 carottes`).
   - **Placard (`isPantryStaple`) & Eau :** `Eau` est toujours exclue des courses. Les ingrédients `isPantryStaple` (sel, poivre, huile, épices de base) et `isOptional` sont décochés par défaut lors de l'ajout d'une recette aux courses, et ignorés comme bloquants dans `stockMatcher.ts`.
3. **Prompts IA Gemini sobres :**
   - Dans `recipeAiService.ts` et `StockCookModal.tsx`, les titres et descriptions générés par l'IA doivent rester factuels et quotidiens (interdiction des adjectifs pompeux type *"sublime"*, *"divin"*, *"crémeux"* dans les titres).
4. **Sécurité & Offline-First :**
   - Aucune donnée utilisateur n'est envoyée sur un serveur tiers (hors appels directs Gemini API et fetch Marmiton).
   - Toujours passer les données chargées ou générées par IA via `sanitizeStoredRecipe()` et `sanitizeImageUrl()`.

---

## 🎨 4. SYSTÈME DE THÈME & CONVENTIONS UI

- **Langue UI :** Toutes les chaînes visibles par l'utilisateur doivent être en **français**.
- **Thèmes dynamiques (`src/theme/colors.ts` & `ThemeContext.tsx`) :**
  - Supporte *Jardin Botanique* (Clair), *Table Nocturne* (Sombre) et *Contraste Élevé*.
  - N'utilisez jamais de couleurs en dur. Utilisez systématiquement `useTheme()` et `createDynamicStyles` :
    ```tsx
    import { createDynamicStyles } from '../theme/colors';
    import { useTheme } from '../theme/ThemeContext';

    // Dans le composant :
    const { colors, isDark, shadows, themeMode, setThemeMode } = useTheme();

    // Pour les feuilles de style :
    const styles = createDynamicStyles((colors, shadows) => ({
      container: { backgroundColor: colors.background, ...shadows.card },
      title: { color: colors.textPrimary },
    }));
    ```

---

## 🛠️ 5. COMMANDES DE VÉRIFICATION & TESTS UNITAIRES

```bash
# 1. Vérification obligatoire avant fin de tâche (0 erreur tolérée)
npx tsc --noEmit && npx expo lint

# 2. Suite complète de tests métier (rapide, en CLI Node)
npm test

# 3. Tests ciblés par sous-système (à lancer selon les fichiers modifiés)
npm run validate:lexicon   # Audit d'intégrité du vocabulaire canonique (0 collision)
npm run test:stock         # Tests unitaires stockMatcher & résolution Lexique-First
npm run test:shopping      # Tests unitaires shoppingAggregator, conversions & placard
npm run test:allergens     # Tests unitaires sécurité allergènes INCO & racines sémantiques

# 4. Utilitaires de maintenance (si pertinent)
npx expo-doctor            # Diagnostic santé Expo
npx expo install --fix     # Alignement des dépendances sur le SDK Expo