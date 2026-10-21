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
  - Fast, frictionless tracking of on-hand ingredients with 1-tap popular suggestions (`Œufs`, `Beurre`, `Lait`, `Farine`, `Pâtes`, `Riz`, `Huile d'olive`...) and automatic supermarket aisle classification.
  - Seamless transfer: 1-tap "Ajouter aux courses" from stock items, and "Ranger dans mes étagères 🥫" when purchasing or cleaning grocery list items.
  - Smart "Que cuisiner aujourd'hui ?" matching recipes directly from the user's active pantry inventory (scrollable to preserve screen space).
  - Pinned top controls: Locked "Ajouter un aliment" bar and "Ajout rapide en 1 clic" suggestion chips stay fixed at the top of the screen, while "Que cuisiner aujourd'hui ?" and categorized pantry items scroll smoothly beneath.
- **Smart Stock Recipe Suggestions & Doable Filter ("Cuisiner avec mon stock")**:
  - **100% Doable Recipes Filter**: High-performance matching engine (`stockMatcher.ts`) evaluating recipe feasibility against active on-hand pantry/fridge stock (`isDoable`). A recipe is doable when all non-optional ingredients are either in stock (matched via canonical IDs, exact names, stemming, aliases, and whole-word matching) or are common pantry staples (`isPantryStaple` / salt, pepper, oil, water, basic spices).
  - **1-Tap Filter in Filter Bar & List Header**: Filter bar features a dedicated `En stock (X)` tool pill with live doable count, and an active banner in the list header to clear or toggle with 1 tap.
  - **Modernized Stock Action Hub**: Completely replaces legacy fork-knife button next to the search bar with an interactive culinary hub button featuring dynamic doable recipe count badges, active checkmark status, and opening `StockCookModal`.
  - **Non-Redundant AI Recipe Generator**: Gemini 3.8 Flash invents bespoke gourmet anti-waste creations tailored to selected on-hand items, receiving the user's complete catalog of existing recipe titles (`existingRecipeTitles`) with strict anti-redundancy rules to guarantee 100% novel suggestions.
  - **Foundation for Missing Ingredient Suggestions (Need 3)**: Engine tracks `missingIngredients` and `matchPercentage` for upcoming missing-item suggestions and 1-tap shopping list additions.
- **Strict Ingredient Vocabulary & Normalization Engine ("Lexique Canonique")**:
  - Eliminates synonyms and noisy prefixes/qualifiers across all entry points: maps `"boîte de petits pois"` -> `"Petits pois"`, `"noix de muscade"` -> `"Muscade"`, `"carottes épluchées"` -> `"Carotte"`.
  - **Deliberate Synonym Promotion & Anti-Collision Engine**: If a user explicitly chooses or types a synonym (e.g. keeps `"Noix de muscade"` instead of accepting `"Muscade"`, or creates `"Sucre glace"` independently from `"Sucre"`), the engine safely detaches this synonym and its distinct variants from the parent ingredient and promotes it into a full-fledged independent canonical ingredient with its own aliases and aisle.
  - **Strict Anti-Conflict & Self-Healing Sanitizer**: Prevents cross-ingredient alias collisions. Under no circumstance can a parent canonical name (e.g. `"sucre"`) be detached or captured as a synonym of a derived or promoted ingredient (e.g. `"Sucre glace"`). Automatic background self-healing sanitizer on load purges any conflicting aliases across all canonical ingredients.
  - Hybrid AI & deterministic local pipeline: enhanced few-shot prompting in Gemini 3.8 Flash, followed by deterministic local parsing (`IngredientNormalizer`).
  - Applied strictly to ingredient names only; recipe steps (`steps`) remain 100% verbatim and untouched.
  - Instant autocomplete dropdown (`IngredientAutocompleteInput`) proposing normalized matches as well as a 1-tap option to keep and create deliberate synonyms as distinct ingredients.
  - Silent background learning of new ingredients and usage frequencies.
  - Full dedicated Vocabulary Manager in Settings (`VocabularyManagerModal`) allowing users to browse, search by aisle, rename, edit aliases, detach aliases into distinct ingredients with 1 tap, merge duplicates, and reset to defaults.
  - **1-Click Global Normalization**: Dedicated on-demand button in Settings ("Normaliser tous les ingrédients") allowing users to retrofit and standardize all saved recipes, grocery list items, and shelf ingredients at any time.
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
- **Categorized Shopping List**: Auto-generates items from recipes or meal plans, auto-classifying ingredients into supermarket aisles.
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
    │   ├── TodayMealWidget.tsx   # Home screen widget for today's lunch/dinner tracking
    │   ├── IngredientAutocompleteInput.tsx # Predictive dropdown input for canonical ingredients
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
