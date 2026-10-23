# GEMINI.md — Architecture & Development Guide

## 1. Project Overview & Purpose

**Papilles** (`papilles-recettes`) is an offline-first mobile application built with React Native and Expo (SDK 57) for managing, rating, scheduling, and cooking culinary recipes.

### Core Capabilities
- **Recipe Management (CRUD)**: Create, edit, and organize recipes with ingredients, scaled servings, preparation steps, tags, and photos.
- **Interactive Rating System**: 0.5 to 5.0 star rating system (stars only, without redundant verbal labels) with inline interactive star filtering and instant sorting.
- **Multimodal AI Recipe Scanner**: Extract recipes from camera captures, gallery photos (single/multi-photo recto & verso), or raw text using Google Gemini (`gemini-3.8-flash`) via a Bring-Your-Own-Key (BYOK) model.
- **Smart Fridge Search ("Mon Frigo")**: In-memory matching engine that scores and surfaces recipes matching on-hand ingredients.
- **Interactive Cooking Mode**: Step-by-step hands-free cooking assistant with checkboxes for ingredients and instructions.
- **Weekly Meal Planner & Daily Meal Tracking ("Suivi des repas")**:
  - Daily log of lunch & dinner with freeform text input (e.g. restaurant meals, takeout, leftovers, or home-cooked).
  - Quick home widget for one-tap daily logging.
  - Multi-day chronological history with editable past entries.
  - Weekly planner to schedule lunch and dinner across the week, view planned menus, and aggregate required ingredients.
- **Pantry Stock Management & Shopping List Hub ("Courses & Étagères")**:
  - Unified tab housing both **Mes étagères** (global pantry & fridge stock) and **Liste de courses**.
  - **Canonical Quick-Add & 1-Tap Suggestions**: Quick suggestions 100% aligned with the canonical vocabulary (`CANONICAL_QUICK_SUGGESTIONS` / `Œufs`, `Beurre`, `Lait`, `Farine`, `Pâtes`, `Riz`, `Huile d'olive`, `Tomate`, `Oignon`, `Ail`, `Carotte`, `Courgette`...) with automatic aisle assignment, deduplication (singular/plural aware), and dynamic surfacing of the user's most frequent ingredients.
  - **Fluid Predictive Shelf Ingestion**: Tapping an autocomplete suggestion in the locked top bar immediately adds the item to the shelves with its canonical name and aisle, clears the text input, and keeps focus for effortless chain-typing of ingredients.
  - Seamless transfer: 1-tap "Ajouter aux courses" from stock items, and "Ranger dans mes étagères 🥫" when purchasing or cleaning grocery list items.
  - Smart "Que cuisiner aujourd'hui ?" matching recipes directly from the user's active pantry inventory (scrollable to preserve screen space).
  - Pinned top controls: Locked "Ajouter un aliment" bar and "Ajout rapide en 1 clic" suggestion chips stay fixed at the top of the screen, while "Que cuisiner aujourd'hui ?" and categorized pantry items scroll smoothly beneath.
- **Smart Stock Recipe Suggestions & Doable Filter ("Cuisiner avec mon stock")**:
  - **100% Doable Recipes Filter**: High-performance matching engine (`stockMatcher.ts`) evaluating recipe feasibility against active on-hand pantry/fridge stock (`isDoable`). A recipe is doable when all non-optional ingredients are either in stock (matched via canonical IDs, exact names, stemming, aliases, and tokenized whole-word set matching) or are common pantry staples (`isPantryStaple` / salt, pepper, oil, water, basic spices).
  - **Sub-millisecond Performance & Indexing Engine**: Zero regex compilation overhead in matching loops, pre-indexed stock lookup (`canonicalIdMap`, `canonicalNameMap`, `normalizedNameMap`, `stemmedNameMap`, `wordsMap`), normalization caching (`NORMALIZATION_CACHE` in `ingredientNormalizer.ts`), and pre-calculated doable counts passed to `StockCookModal` eliminating any UI freeze or JS thread stalling.
  - **1-Tap Filter in Filter Bar & List Header**: Filter bar features a dedicated `En stock (X)` tool pill with live doable count, and an active banner in the list header to clear or toggle with 1 tap.
  - **Modernized 1-Tap Stock Button**: Dedicated 1-tap stock filter button (`cube-outline` / `cube`) next to the search bar featuring dynamic doable recipe count badges and active checkmark status, instantly toggling the doable recipes filter on/off without modal indirection.
  - **Chef IA Home Widget ("Inspirations du Chef IA")**: Scrollable culinary feed widget (`ChefAiWidget`) positioned right beneath the filter bar, displaying active stock counts, sample ingredient chips, and a 1-tap call-to-action opening the Chef IA flow in `StockCookModal`. (Legacy `TodayMealWidget` is preserved in codebase for immediate rollback if needed).
  - **Non-Redundant AI Recipe Generator with 2-Step Inspiration & Multi-Model Fallback (Solutions 1, 2 & 4)**:
    - **Step 1 ("3 Idées du Chef IA")**: Tapping "💡 Trouver 3 idées" sends an ultralight request (< 300 output tokens) returning 3 bespoke recipe suggestions (simple, sober title without pompous adjectives, factual 1-sentence pitch, estimated time, highlight stock ingredients) with 0 latency or risk of overload.
    - **Step 2 (Interactive Recipe Realization)**: The user browses the 3 proposals on interactive cards and taps "Cuisiner cette recette →" to generate the full recipe with scaled servings, exact ingredient amounts, and concise, quick-to-read steps (1-2 sentences per step, 4-6 steps max).
    - **Sober & Factual Prompts**: Banishment of extravagant restaurant marketing jargon ("crémeux", "affiné", "sublime", "délicieux" in titles) in favor of direct everyday cooking names (e.g. "Risotto aux champignons et parmesan"), factual descriptions, and concise instructions without culinary filler text.
    - **Targeted Meal Type & Doable Anti-Redundancy Filter (Solution 1)**: User selects between **Entrée**, **Plat** (default), or **Dessert**. The anti-redundancy constraint strictly isolates doable recipes from the user's active stock of that specific meal type, guaranteeing zero collision where it matters while keeping prompt payloads minimal.
    - **Multi-Model Cascade Fallback & Self-Healing JSON Repair (Solution 2)**:
      - Automatically cascades across `GEMINI_MODELS_CASCADE` (`gemini-3.8-flash`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`) with exponential retry backoff on HTTP 503/429/404, guaranteeing 100% uptime and resilience against server spikes on Google's free-tier endpoints.
      - **Resilient Truncation Auto-Repair & Cascade on Invalid JSON**: Double layer of defense against `Unexpected end of input` crashes: `repairTruncatedJsonString` dynamically balances unclosed quotes, purges dangling commas/keys, and auto-closes open JSON delimiters if a generation was cut off mid-stream. Furthermore, `fetchGeminiJsonWithFallbackAndRetry` verifies successful JSON parsing before exiting the cascade, seamlessly falling back to subsequent models if an upstream response was incomplete or corrupted.
      - **Expanded Token Ceilings**: Output token ceilings increased to 2048 (ideas) and 4096 (detailed recipes) eliminating token exhaustion.
  - **Ergonomic Category-Grouped Ingredient Selector & Inverted Hierarchy**:
    - Replaces unmanageable horizontal scrolling with structured vertical cards grouped by supermarket aisle (`ShoppingAisle`), aisle icons, selection counters `(X/Y)`, and 1-tap "Tout cocher" / "Tout décocher" per aisle.
    - **Inverted Ergonomic Flow**: Positioned primary high-level cooking parameters (Targeted Meal Type: Entrée/Plat/Dessert, Servings stepper, Vegetarian toggle, Anti-redundancy badge) directly at the top of the card for instant 1-tap access, immediately followed by the generation button ("💡 Trouver 3 idées de [type]"), and placing the ingredient checklist beneath for effortless immediate generation without scrolling.
  - **Foundation for Missing Ingredient Suggestions (Need 3)**: Engine tracks `missingIngredients` and `matchPercentage` for upcoming missing-item suggestions and 1-tap shopping list additions.
- **Strict Ingredient Vocabulary & Normalization Engine ("Lexique-First" Architecture)**:
  - **Inverted Resolution Cascade (Lexique-First)**: Direct O(1) lookup on `canonicalName` and aliases *before* any regex qualifier/container stripping. Fully preserves sensitive compound terms without mutilation (e.g., `"Crème fraîche"` resolves to `ing_canon_creme_fraiche`, `"Légumes surgelés"` to `ing_canon_legumes_surgeles`, `"Poudre d'amande"` to `ing_canon_poudre_d_amande`). Multi-word phrase stemming ensures plural compounds (`"oignons blancs"`) match cleanly.
  - **Transversal Model Integrity (`canonicalId`)**: The `canonicalId?: string` attribute is extended across `Recipe.Ingredient`, `FridgeItem`, and `ShoppingItem`. Guarantees sub-millisecond O(1) matching with zero false positives (`Pomme` !== `Pomme de terre`, `Muscade` !== `Noix`, `Oignon blanc` matches `Oignon`).
  - **Automated Data Migration**: Startup migration (`StorageService.migrateRecipesToCanonicalV1()`) automatically enriches pre-existing recipes in `AsyncStorage` with canonical IDs without data loss.
  - **Anti-Desynchronization Guardrail**: In `RecipeFormScreen`, manual edits to the `name` field automatically re-evaluate `normalizeIngredient()` and never retain stale or mismatched canonical IDs.
  - **Deliberate Synonym Promotion & Anti-Collision Engine**: Controlled promotion of aliases into distinct canonical items in `VocabularyManagerModal`. Strong collision prevention rejects reserved names, forbidden generic words, and cross-ingredient alias collisions.
  - **Automated Cascading Vocabulary Propagation (Observer Pattern)**: When an alias is promoted, merged, updated (e.g. aisle change), or deleted in `VocabularyService`, the changes are automatically propagated across all saved recipes (`@papilles_recipes_v4`), pantry/fridge stocks (`@papilles_fridge_items_v1`), and active shopping lists (`@papilles_shopping_list_v1`) via `StorageService.handleVocabularyCascade()`. Stale parent IDs are remapped to the newly detached canonical item, normalizer memory caches are instantly invalidated (`clearNormalizationCache()`), and the lexicon-first pipeline self-heals any obsolete foreign keys.
  - **Strict Anti-Conflict & Self-Healing Sanitizer**: Prevents cross-ingredient alias collisions. Under no circumstance can a parent canonical name (e.g. `"sucre"`) be detached or captured as a synonym of a derived or promoted ingredient (e.g. `"Sucre glace"`). Automatic background self-healing sanitizer on load purges any conflicting aliases across all canonical ingredients.
  - Hybrid AI & deterministic local pipeline: enhanced few-shot prompting in Gemini 3.8 Flash, followed by deterministic local parsing (`IngredientNormalizer`).
  - Applied strictly to ingredient names only; recipe steps (`steps`) remain 100% verbatim and untouched.
  - Instant autocomplete dropdown (`IngredientAutocompleteInput`) proposing normalized matches without intempestive background mutations.
  - Silent background learning of new ingredients and usage frequencies.
  - Full dedicated Vocabulary Manager in Settings (`VocabularyManagerModal`) allowing users to browse, search by aisle, rename, edit aliases, detach aliases into distinct ingredients with 1 tap, merge duplicates, and reset to defaults.
  - **Zero-Manual-Effort Normalization & Cascade**: All normalization and vocabulary synchronizations operate transparently in real time; legacy manual normalization button removed in favor of instant reactive cascade and automatic startup migration.
- **Pantry Staples & Optional Ingredients Engine ("Livre de Chef" & Sections culinaires)**:
  - Distinguishes essential ingredients from pantry staples (`isPantryStaple`: salt, pepper, common oils, vinegar, water, standard dry spices) and optional garnishes (`isOptional`: dressings, optional garnishes, "au goût").
  - **Livre de Chef Sub-sections (Zero-badge UI)**: Ingredients on recipe detail screen and shopping dialog are structured naturally into culinary sections: "Ingrédients principaux" (sans descriptif parasite), "Assaisonnements & condiments" (huiles, épices, vinaigres usuels) and "En finition & au goût" without noisy visual clutter. The descriptive subtitles/hints sit cleanly beneath their section titles.
  - **Multimodal AI Classification**: Gemini 3.8 Flash categorizes `isPantryStaple` and `isOptional` across photo scans, text extraction, and recipe generation.
  - **Deterministic Local Rules & Customization**: Rule-based detection in `IngredientNormalizer` with automatic extraction of optional cues (`(facultatif)`). Fully customizable in Settings via the Vocabulary Manager with a dedicated filter pill (`📦 Dans les placards`), 1-tap toggle on item cards (`En placard` / `+ Placard`), and toggle in the creation/edition dialog.
  - **Smart Shopping List Addition Dialog**: When tapping "Ajouter à ma liste de courses" in `RecipeDetailScreen`, opens an interactive modal structured in culinary sections pre-selecting only essential ingredients (pantry staples and optional items are unchecked by default to avoid flooding the grocery list), with quick filters ("Indispensables uniquement", "Tout cocher", "Tout décocher").
  - **Recipe Form Integration & Table Layout**:
    - **Colonnes structurées (Nom, Quantité, Unité)** : remplacement des descriptifs répétitifs dans les champs par de véritables en-têtes de colonnes alignés au pixel près.
    - **Proportions optimisées** : élargissement significatif du champ "Nom", conservation d'un espace confortable pour la "Quantité", et champ "Unité" resserré et centré pour un confort de saisie maximal sur mobile.
    - **Dongle de suggestions élargi ("Vocabulaire suggéré")** : menu flottant de l'`IngredientAutocompleteInput` élargi de manière responsive (jusqu'à 380px) et découplé de la largeur étroite du champ Nom, avec gestion du défilement interne et priorité d'élévation (`zIndex` et `elevation`) sur la carte active.
    - **Puces de sections** : puces compactes `En placard` et `En finition (au goût)` avec présélection automatique d'après le lexique canonique.
- **HomeScreen Top Section & Scroll-Reactive Collapsible Double Filter Bar**:
  - Pinned top section: Brand row with logo and vertically stacked quick action buttons (Marmiton, Scan & IA, Ajouter) on the right, alongside the persistent search bar.
  - Collapsible double filter bar: The double filter bar (categories pill bar + secondary tools: Végé toggle, Star Rating modal button, Sort, Reset) smoothly collapses and disappears when scrolling down, and reappears when scrolling up or returning to top.
  - Stabilized anti-jitter scroll engine: High-performance architecture running 100% on native UI thread (`useNativeDriver: true` with `translateY` and `opacity`) decoupled from FlatList layout. Keeps list container height strictly fixed (preventing VirtualizedList measurement thrashing and slow update warnings). Uses directional hysteresis accumulation (sustained 70px downward / -65px upward threshold) with micro-noise filtering (< 1.5px) and transition locks to eliminate layout oscillation loops ("descendre-remonter") during slow, precise scrolling with finger on screen.
  - The daily meal tracking widget ("Ce que j'ai mangé aujourd'hui") and results summary remain scrollable alongside the recipe cards.
  - Star Rating Filter Modal: Triggered from a compact toolbar pill (`Note` / `≥ 4 ★`), opening a dedicated dialog with an interactive 5-star rating preview and quick-choice presets (Toutes les notes, ≥ 4.5, ≥ 4.0, ≥ 3.5, ≥ 3.0) with checkmarks, matching the Sort modal UX.
  - Bottom Tab Bar: Centered labels across all tabs (notably "Courses & Étagères" beneath the basket icon).
- **Settings Visual Ambiance Swatches**:
  - Active color swatches are arranged cleanly in a row directly beneath the active palette name instead of squeezed to its right.
- **Culinary Preferences & Default Servings Stepper**:
  - User-configurable default servings managed via an intuitive `[-]` / `[+]` stepper in Settings (1 to 50 persons).
- **Allergens & Major Food Intolerances System ("Mes Allergies Alimentaires" & Arbitrage 5)**:
  - **14 Major Allergens (European INCO Regulation)**: Dedicated 1-tap quick buttons for Gluten, Crustacés, Œufs, Poissons, Arachides, Soja, Lait & Lactose, Fruits à coque, Céleri, Moutarde, Sésame, Sulfites, Lupin, Mollusques. Clicking a family automatically links and registers all associated canonical ingredients from the vocabulary into the user's allergen list, with live count badges and active checkmarks.
  - **Zero False Positives via Canonical IDs**: Because items are matched via their resolved `canonicalId`, `"oignon blanc"` will never match sulfites from `"vin blanc"`.
  - **Semantic Root Safety Nets on Uncatalogued Items**: Safety net dictionary (`INCO_FAMILY_KEY_ROOTS`) detecting major allergen roots on ingredients without canonical IDs (e.g. `"sauce béchamel maison"` triggers `lait`, `"coulis de noisette"` triggers `fruits_a_coque`).
  - **Visual Precaution Indicator**: When a recipe contains uncatalogued ingredients and the user has active allergies, a discrete amber warning advises manual verification.
  - **Fluid Predictive Manual Ingestion & Family Tagging**: Saisie libre via `IngredientAutocompleteInput` with intelligent suggestions from the canonical vocabulary.
  - **Interactive Classification Popup (`AllergenFamilyPickerModal`)**: Every manual addition or chip click triggers an interactive modal allowing the user to map the ingredient to one of the 14 locked major allergen families or classify it under "Autre" for unlisted specific allergies.
  - **Structured Grouped Display**: Allergens list is grouped by the 14 major allergen families plus a dedicated "Autres allergies spécifiques" section, with individual chip deletion, quick family clearing, and global reset.
- **Categorized Shopping List & Smart Aggregator (`shoppingAggregator.ts`)**:
  - **Single Source of Truth for Aisles**: Classifies items according to `defaultAisle` from the canonical lexicon.
  - **O(1) Fusion & Arithmetic Addition with Metric Conversions**: Automatically merges identical items by `canonicalId` and sums quantities with metric conversions (e.g. `1 kg` + `250 g` = `1,25 kg`, `50 cl` + `1 L` = `1,5 L`).
  - **Pantry Staple Rules**: Excluded by default when generating grocery lists; if included voluntarily, formatted with canonical name alone without micro-quantities (e.g. `Huile d'olive`, `Sel`).
  - **Strict Water Exclusion**: The technical ingredient `Eau` is strictly excluded from grocery lists.
- **Dual Artistic Directions & Dynamic Theming**:
  - Light: *Jardin Botanique & Slow Food* (forest evergreen, celadon, almond mist).
  - Dark: *Table Nocturne & Sauge Céleste* (obsidian slate, luminous culinary emerald, silver sage, honey amber).
  - Configurable directly in the Settings tab (auto-switch, light, dark).
- **100% Offline-First Architecture & BYOK**:
  - No backend server.
  - Data stored locally in `AsyncStorage`.
  - Sensitive API keys encrypted via `expo-secure-store`.
  - Built-in data backup (native JSON export/import via Share Sheet) and Marmiton demo recipe resets.

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Version / Notes |
| :--- | :--- | :--- |
| **Framework & Core** | React Native / Expo | Expo SDK `~57.0.30`, React Native `0.86.3`, React `19.2.3` |
| **Language** | TypeScript | `~6.0.3` (Strict mode enabled) |
| **Local Storage** | AsyncStorage | `@react-native-async-storage/async-storage` `2.2.0` |
| **Secure Storage** | Expo SecureStore | `expo-secure-store` `~57.0.4` (Key management for Gemini API) |
| **Media & Camera** | Expo Image Picker & Manipulator | `expo-image-picker` `~57.0.20`, `expo-image-manipulator` `~57.0.21` |
| **UI & Layout** | React Native Core + Safe Area | `react-native-safe-area-context` `~5.7.0`, `expo-status-bar` `~57.0.1` |
| **Icons** | Expo Vector Icons | `@expo/vector-icons` `^15.0.2` (Ionicons) |
| **AI Integration** | Google Generative Language API | Gemini `gemini-3.8-flash` via REST (`v1beta`), BYOK client-side |
| **Web Preview** | React Native Web | `react-native-web` `^0.21.4`, `@expo/metro-runtime` `~57.0.17` |
| **Tunneling** | Expo Ngrok | `@expo/ngrok` `^4.1.3` |

---

## 3. Architecture & Key Directories

The application uses an in-memory, state-driven screen navigator managed directly in `App.tsx` wrapped in `SafeAreaProvider` and `ThemeProvider`.

```
papilles-recettes/
├── App.tsx                     # Root component, screen router & bottom navigation
├── index.ts                    # Expo entry point (registerRootComponent)
├── app.json                    # Expo app configuration, permissions & metadata
├── package.json                # Dependencies, scripts & overrides
├── tsconfig.json               # TypeScript configuration
├── assets/                     # App icons, splash screens, and adaptive icons
├── scripts/
│   ├── fetch_top_100_marmiton.py # Python scraper for Marmiton recipes
│   ├── import_marmiton.js        # Node.js batch converter to initialRecipes.ts
│   ├── normalizeInitialRecipes.js # Batch normalizer script for seed recipes
│   └── testExtractRecipe.mjs     # Standalone CLI testing script for Gemini extraction
└── src/
    ├── types/                  # TypeScript interface definitions
    │   ├── recipe.ts           # Recipe, Ingredient, RecipeStep, Category, Difficulty, Filters
    │   ├── shopping.ts         # ShoppingItem, ShoppingAisle, AisleConfig
    │   ├── fridge.ts           # FridgeItem, FridgeAisleGroup
    │   ├── planner.ts          # PlannedMeal, WeeklyPlanMap, DayOfWeek, MealTime
    │   ├── mealLog.ts          # MealLogEntry, MealLogMap, DayMealLogSummary
    │   ├── vocabulary.ts       # CanonicalIngredient, NormalizationResult
    │   └── expo-secure-store.d.ts # Typings fallback for expo-secure-store
    ├── theme/                  # Theming and dynamic styling engine
    │   ├── colors.ts           # Botanique (Light) & Nocturne (Dark) palettes, createDynamicStyles
    │   └── ThemeContext.tsx    # ThemeProvider, useTheme hook, system/user preference sync
    ├── services/               # Core business logic & persistence
    │   ├── storageService.ts   # AsyncStorage & SecureStore wrapper, sanitization, export/import
    │   ├── recipeAiService.ts  # Gemini multimodal extraction & connectivity check
    │   ├── vocabularyService.ts # Canonical vocabulary persistence, CRUD, autocomplete index
    │   └── marmitonService.ts  # Marmiton web import parser
    ├── utils/                  # Algorithmic utilities & data helpers
    │   ├── aisleClassifier.ts  # Rule-based supermarket aisle classifier for ingredients
    │   ├── ingredientNormalizer.ts # Rule-based container/modifier stripper & fuzzy resolver
    │   ├── stockMatcher.ts     # Engine determining recipe feasibility & coverage against pantry/fridge stock
    │   ├── shoppingAggregator.ts # Ingredient summing and unit normalization for grocery lists
    │   ├── searchEngine.ts     # In-memory recipe search, fridge matching, and sorting
    │   └── helpers.ts          # ID generation, time formatting, share text, image utils
    ├── data/
    │   ├── initialRecipes.ts   # Bundled seed recipes with ingredients and instructions
    │   └── canonicalVocabulary.ts # Initial seed of ~350 canonical ingredients with aliases & aisles
    ├── components/             # Reusable modular UI components
    │   ├── RecipeCard.tsx      # Recipe card with badges, difficulty, and quick rating
    │   ├── StarRating.tsx      # 0.5–5.0 star interactive selector
    │   ├── SearchBar.tsx       # Text query input with stock hub action button
    │   ├── CategoryPills.tsx   # Category filter horizontal pill bar
    │   ├── IngredientChip.tsx  # Selectable ingredient badges
    │   ├── EmptyState.tsx      # Empty list placeholder view
    │   ├── FridgeStockView.tsx # "Mes étagères" pantry stock tracker, collapsible quick add & recipes
    │   ├── StockCookModal.tsx  # "Cuisiner avec mon stock" & non-redundant Chef AI suggestions
    │   ├── FridgeSearchModal.tsx # Deprecated wrapper around StockCookModal
    │   ├── CookingModeModal.tsx  # Step-by-step interactive cooking checklist
    │   ├── MealSlotPickerModal.tsx # Calendar slot picker (Lunch/Dinner)
    │   ├── ImportMarmitonModal.tsx # Marmiton import input dialog
    │   ├── QuickMealLogModal.tsx # Fast modal for freeform lunch/dinner entry
    │   ├── TodayMealWidget.tsx   # Home screen widget for today's lunch/dinner tracking (preserved)
    │   ├── ChefAiWidget.tsx      # Home screen feed widget for Chef AI inspiration & stock teaser
    │   ├── IngredientAutocompleteInput.tsx # Predictive dropdown input for canonical ingredients
    │   ├── AllergenFamilyPickerModal.tsx # Allergen family classification modal (14 INCO families + Autre)
    │   └── VocabularyManagerModal.tsx # Vocabulary management modal (CRUD, merge, aisles)
    └── screens/                # Main feature screens
        ├── HomeScreen.tsx      # Recipe feed, unified brand top bar (logo + Marmiton/Scan/Add), filters & search
        ├── RecipeDetailScreen.tsx # Recipe view, dynamic serving scaler, share, edit/delete
        ├── RecipeFormScreen.tsx   # Recipe creator & editor (manual or pre-filled from AI)
        ├── ScanRecipeScreen.tsx   # AI recipe scanner (Camera, Multi-photo, Paste Text)
        ├── MealPlannerScreen.tsx  # Weekly calendar meal scheduler & meal tracking journal
        ├── ShoppingListScreen.tsx # Unified Courses & Étagères screen with segmented switcher
        ├── SettingsScreen.tsx     # Full Settings page (theme, Gemini API key, servings, 1-click normalization, backup)
        └── SettingsModal.tsx      # Modal wrapper for backward compatibility
```

---

## 4. Build, Test, and Run Commands

### Development Server
```bash
# Start Metro bundler with automatic LAN IP detection & cache reset (Recommended)
npm start

# Start on LAN without forcing cache reset
npm run lan

# Start with tunnel mode (bypasses Wi-Fi isolation and restricted local networks)
npm run tunnel

# Standard LAN mode
npm run lan:wifi

# Web preview
npm run web
```

### Mobile Target Runners
```bash
# Android runner
npm run android

# iOS runner (macOS only)
npm run ios
```

### Quality, Formatting & Typechecks
```bash
# TypeScript typecheck (Must pass with 0 errors)
npx tsc --noEmit

# Expo project diagnostic
npx expo-doctor

# Dependency audit & fixes for Expo SDK compatibility
npx expo install --fix
```

### CLI Maintenance & Testing Scripts
```bash
# Full test suite (Lexicon audit, Stock matching, Shopping aggregator, Allergen safety)
npm test

# Audit static integrity of the canonical vocabulary (135 ingredients, 0 collision)
npm run validate:lexicon

# Unit tests for stock matching & Lexique-First resolution
npm run test:stock

# Unit tests for shopping aggregation, staples & metric conversions
npm run test:shopping

# Unit tests for allergen safety & semantic roots
npm run test:allergens

# Batch import Marmiton recipes into src/data/initialRecipes.ts
npm run import:marmiton

# Batch normalize all ingredients of seed recipes in src/data/initialRecipes.ts
npm run normalize:seed

# Standalone CLI test for Gemini recipe extraction on sample images
node scripts/testExtractRecipe.mjs <GEMINI_API_KEY>
```

---

## 5. Coding Conventions & Important Development Rules

### Expo SDK 57 / React 19 Standards
- **Never trust outdated training data**: APIs change across Expo SDKs. Always consult `https://docs.expo.dev/llms.txt` and Expo SDK 57 documentation.
- **Package Installation**: Always use `npx expo install <package>` (or `bunx expo install <package>` if using Bun) instead of bare `npm/yarn/bun add` to ensure SDK compatibility.
- **Continuous Native Generation**: Do not manually create or edit `android/` or `ios/` folders unless explicitly generating builds. Configure native permissions and behavior inside `app.json`.

### Dynamic Theming Pattern
- To support instant light/dark theme switching without component remounting:
  ```typescript
  import { createDynamicStyles } from '../theme/colors';

  const styles = createDynamicStyles((colors, shadows) => ({
    container: {
      backgroundColor: colors.background,
      ...shadows.card,
    },
    title: {
      color: colors.textPrimary,
    },
  }));
  ```
- In component bodies, consume colors and theme status via:
  ```typescript
  const { isDark, colors, shadows } = useTheme();
  ```

### Security & Offline Integrity (BYOK)
- **Zero Remote Storage**: The app does not transmit recipe data to external servers. All user data stays in local `AsyncStorage`.
- **API Key Storage**: Always store Gemini keys in `expo-secure-store` (falls back gracefully to memory/AsyncStorage in dev/web environments).
- **Data Sanitization**: All data loaded from storage or parsed from AI must pass through `sanitizeStoredRecipe()` and `sanitizeImageUrl()` in `storageService.ts` to defend against malicious URLs, DoS payloads, and malformed schemas.
- **Network Boundaries**: Outbound HTTP traffic is strictly limited to Google Generative Language API and Marmiton URL fetching. `usesCleartextTraffic: false` is enforced in `app.json`.

### Navigation Pattern
- Navigation is handled via the root state in `App.tsx` (`currentScreen: AppScreen`).
- Persistent bottom tab bar hosts 4 primary navigation tabs:
  1. **Recettes** (`'home'`)
  2. **Repas** (`'planner'`)
  3. **Courses & Étagères** (`'shopping'`)
  4. **Paramètres** (`'settings'`)
- When navigating between screens, pass state callbacks or update `currentScreen`.
- Detail screens maintain a return route (`returnScreenAfterDetail`) so users return seamlessly to either `HomeScreen`, `MealPlannerScreen`, `ShoppingListScreen` or `SettingsScreen`.

### Git Workflow & Documentation Discipline
- **Contrôle de version systématique (Git & GitHub)** :
  - Chaque nouvelle fonctionnalité, amélioration ou correction doit faire l'objet d'un commit dédié, atomique et explicite (respecter les conventions sémantiques, ex: `feat(...)`, `fix(...)`, `docs(...)`).
  - Pousser systématiquement chaque commit sur GitHub (`git push origin main`) pour garantir un historique propre, faciliter le suivi de version et permettre un retour arrière (*fallback / rollback*) rapide en cas de besoin.
- **Mise à jour systématique de la documentation** :
  - **`GEMINI.md`** : Mettre à jour après chaque nouvelle fonctionnalité (capacités du projet, arborescence des fichiers, services et conventions).
  - **`README.md`** : Mettre à jour pour refléter immédiatement les nouvelles fonctionnalités visibles, la structure et le mode d'emploi pour l'utilisateur.

### Verification Checklist Before Finishing Tasks
1. Run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
2. Ensure no non-standard dependencies were added without `npx expo install`.
3. Verify that both light (*Jardin Botanique*) and dark (*Table Nocturne*) color contrasts remain legible.
4. Keep user-facing strings in French.
5. Update `GEMINI.md` and `README.md` to document the implemented feature.
6. Commit changes with a descriptive message and push to GitHub (`git push origin main`).
