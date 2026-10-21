# GEMINI.md — Architecture & Development Guide

## 1. Project Overview & Purpose

**Papilles** (`papilles-recettes`) is an offline-first mobile application built with React Native and Expo (SDK 57) for managing, rating, scheduling, and cooking culinary recipes.

### Core Capabilities
- **Recipe Management (CRUD)**: Create, edit, and organize recipes with ingredients, scaled servings, preparation steps, tags, and photos.
- **Interactive Rating System**: 0.5 to 5.0 star rating system with qualitative feedback labels and quick filtering/sorting.
- **Multimodal AI Recipe Scanner**: Extract recipes from camera captures, gallery photos (single/multi-photo recto & verso), or raw text using Google Gemini (`gemini-3.8-flash`) via a Bring-Your-Own-Key (BYOK) model.
- **Smart Fridge Search ("Mon Frigo")**: In-memory matching engine that scores and surfaces recipes matching on-hand ingredients.
- **Interactive Cooking Mode**: Step-by-step hands-free cooking assistant with checkboxes for ingredients and instructions.
- **Weekly Meal Planner**: Schedule lunch and dinner across the week, view planned menus, and aggregate required ingredients.
- **Categorized Shopping List**: Auto-generates items from recipes or meal plans, auto-classifying ingredients into supermarket aisles.
- **Dual Artistic Directions & Dynamic Theming**:
  - Light: *Jardin Botanique & Slow Food* (forest evergreen, celadon, almond mist).
  - Dark: *Table Nocturne & Sauge Céleste* (obsidian slate, luminous culinary emerald, silver sage, honey amber).
  - Supports system auto-switch, discrete one-tap header toggle, and manual setting.
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
│   └── testExtractRecipe.mjs     # Standalone CLI testing script for Gemini extraction
└── src/
    ├── types/                  # TypeScript interface definitions
    │   ├── recipe.ts           # Recipe, Ingredient, RecipeStep, Category, Difficulty, Filters
    │   ├── shopping.ts         # ShoppingItem, ShoppingAisle, AisleConfig
    │   ├── planner.ts          # PlannedMeal, WeeklyPlanMap, DayOfWeek, MealTime
    │   └── expo-secure-store.d.ts # Typings fallback for expo-secure-store
    ├── theme/                  # Theming and dynamic styling engine
    │   ├── colors.ts           # Botanique (Light) & Nocturne (Dark) palettes, createDynamicStyles
    │   └── ThemeContext.tsx    # ThemeProvider, useTheme hook, system/user preference sync
    ├── services/               # Core business logic & persistence
    │   ├── storageService.ts   # AsyncStorage & SecureStore wrapper, sanitization, export/import
    │   ├── recipeAiService.ts  # Gemini multimodal extraction & connectivity check
    │   └── marmitonService.ts  # Marmiton web import parser
    ├── utils/                  # Algorithmic utilities & data helpers
    │   ├── aisleClassifier.ts  # Rule-based supermarket aisle classifier for ingredients
    │   ├── shoppingAggregator.ts # Ingredient summing and unit normalization for grocery lists
    │   ├── searchEngine.ts     # In-memory recipe search, fridge matching, and sorting
    │   └── helpers.ts          # ID generation, time formatting, share text, image utils
    ├── data/
    │   └── initialRecipes.ts   # Bundled seed recipes with ingredients and instructions
    ├── components/             # Reusable modular UI components
    │   ├── RecipeCard.tsx      # Recipe card with badges, difficulty, and quick rating
    │   ├── StarRating.tsx      # 0.5–5.0 star interactive selector
    │   ├── SearchBar.tsx       # Text query input with fridge search shortcut
    │   ├── CategoryPills.tsx   # Category filter horizontal pill bar
    │   ├── IngredientChip.tsx  # Selectable ingredient badges
    │   ├── EmptyState.tsx      # Empty list placeholder view
    │   ├── FridgeSearchModal.tsx # "Mon Frigo" ingredient multi-selector modal
    │   ├── CookingModeModal.tsx  # Step-by-step interactive cooking checklist
    │   ├── MealSlotPickerModal.tsx # Calendar slot picker (Lunch/Dinner)
    │   └── ImportMarmitonModal.tsx # Marmiton import input dialog
    └── screens/                # Main feature screens
        ├── HomeScreen.tsx      # Recipe feed, filters, search, quick theme toggle, settings button
        ├── RecipeDetailScreen.tsx # Recipe view, dynamic serving scaler, share, edit/delete
        ├── RecipeFormScreen.tsx   # Recipe creator & editor (manual or pre-filled from AI)
        ├── ScanRecipeScreen.tsx   # AI recipe scanner (Camera, Multi-photo, Paste Text)
        ├── MealPlannerScreen.tsx  # Weekly calendar meal scheduler
        ├── ShoppingListScreen.tsx # Aisle-categorized grocery checklist
        └── SettingsModal.tsx      # API key manager, live ping check, theme picker, data backup
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
- Navigation is currently handled via the root state in `App.tsx` (`currentScreen: AppScreen`).
- When navigating between screens, pass state callbacks or update `currentScreen`.
- Detail screens maintain a return route (`returnScreenAfterDetail`) so users return seamlessly to either `HomeScreen` or `MealPlannerScreen`.

### Verification Checklist Before Finishing Tasks
1. Run `npx tsc --noEmit` and ensure 0 TypeScript compilation errors.
2. Ensure no non-standard dependencies were added without `npx expo install`.
3. Verify that both light (*Jardin Botanique*) and dark (*Table Nocturne*) color contrasts remain legible.
4. Keep user-facing strings in French.
