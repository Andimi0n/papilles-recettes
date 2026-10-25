# AGENTS.md — Directives & Architecture pour les Agents d'IA (Jules, etc.)

This is an Expo / React Native mobile application for recipe management, pantry inventory, shopping lists, and meal planning.

---

## 🚨 RÈGLES CRITIQUES D'EXÉCUTION (À RESPECTER STRICTEMENT)

1. **CODE FIRST — INTERDICTION DE « DOC-WASHING » :**
   - **Ne JAMAIS considérer une tâche terminée en modifiant uniquement `README.md`, `GEMINI.md` ou des commentaires.**
   - Toute fonctionnalité demandée doit être **implémentée concrètement dans le code source** (`src/screens/`, `src/components/`, `src/services/`, `src/theme/`, etc.).
   - Ne modifiez `README.md` ou `GEMINI.md` **que si le prompt le demande explicitement**.

2. **VÉRIFICATION OBLIGATOIRE DU CODE :**
   - Avant de committer ou de clore une tâche, vous DEVEZ obligatoirement exécuter et valider :
     ```bash
     npx tsc --noEmit
     npx expo lint
     ```
   - Le code doit compiler sans la moindre erreur TypeScript.

3. **AUCUNE DÉPENDANCE NATIVE INUTILE :**
   - N'installez jamais de nouvelle dépendance arbitraire sans raison impérieuse. Si nécessaire, utilisez toujours `npx expo install <package>`.

---

## 🏗️ Architecture & Navigation Réelle du Projet

> ⚠️ **ATTENTION : Le projet N'UTILISE PAS Expo Router.**
> Il n'y a **aucun dossier `src/app/`**. La navigation est gérée par état mémoire directement dans `App.tsx` (`currentScreen`: `'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan'`).

### Organisation des dossiers (`src/`) :
- **`App.tsx`** : Racine de l'application, switch d'écrans (`currentScreen`), barre d'onglets inférieure (`bottomNav`).
- **`src/screens/`** :
  - `HomeScreen.tsx` : Liste des recettes, barre de recherche, filtres (catégories, végétarien, note, stock).
  - `RecipeDetailScreen.tsx` : Fiche détaillée d'une recette, ajustement des convives, lancement du mode cuisine.
  - `RecipeFormScreen.tsx` : Création et modification de recette.
  - `ScanRecipeScreen.tsx` : Scanner photo/texte IA via Gemini.
  - `ShoppingListScreen.tsx` : Gestion combinée du stock ("Mes étagères" via `FridgeStockView`) et de la liste de courses.
  - `MealPlannerScreen.tsx` : Planning des repas de la semaine et suivi quotidien.
  - `SettingsScreen.tsx` : Thèmes visuels, clé API Gemini, convives par défaut, gestionnaire de lexique, sauvegarde.
- **`src/components/`** : Composants réutilisables, modales :
  - `CookingModeModal.tsx` : Assistant pas-à-pas de cuisine hands-free.
  - `FridgeStockView.tsx` : Vue du stock frigo/placard dans l'onglet Courses & Étagères.
  - `IngredientAutocompleteInput.tsx` : Saisie prédictive d'ingrédients branchée sur le lexique canonique.
  - `UnitPickerModal.tsx` & `UnitQuickPicker.tsx` : Gestion et sélection rapide des unités de mesure.
  - `StarRating.tsx`, `ConfirmModal.tsx`, etc.
- **`src/theme/`** :
  - `colors.ts` : Palettes de couleurs (`BotaniqueColors`, `NocturneColors`, etc.) et typographies.
  - `ThemeContext.tsx` : `ThemeProvider`, hook `useTheme()` fournissant `colors`, `isDark`, `themeMode`, `setThemeMode`.
- **`src/services/`** :
  - `storageService.ts` : Persistance locale `AsyncStorage` (recettes, stock, courses, convives par défaut, etc.).
  - `vocabularyService.ts` : Gestion du lexique d'ingrédients canoniques, alias, rayons et propagation en cascade.
  - `recipeAiService.ts` : Appels à l'API Google Gemini pour la génération et le scan de recettes.
- **`src/utils/`** :
  - `shoppingAggregator.ts` : Agrégation des courses, regroupement par rayon et formatage d'export (`formatShoppingListForShare`).
  - `ingredientNormalizer.ts` : Normalisation, lemmatisation et matching d'ingrédients.
  - `stockMatcher.ts` : Moteur de calcul des recettes faisables avec le stock.
  - `allergenMatcher.ts` : Détection des allergènes alimentaires.
- **`src/types/`** : Interfaces TypeScript (`recipe.ts`, `shopping.ts`, `vocabulary.ts`, `planner.ts`, etc.).

---

## 🛠️ Commandes Utiles

```bash
# Vérification TypeScript (obligatoire avant toute fin de tâche)
npx tsc --noEmit

# Vérification du linter
npx expo lint

# Lancement local (dev)
npx expo start
```

---

## 🎨 Système de Thème

Le thème est injecté via le hook `useTheme()` dans `src/theme/ThemeContext.tsx` :
```tsx
const { colors, isDark, themeMode, setThemeMode } = useTheme();
```
Toutes les vues doivent utiliser `colors.<propriété>` pour garantir un affichage parfait quel que soit le thème actif.
