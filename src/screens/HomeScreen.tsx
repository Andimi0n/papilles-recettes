import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Recipe, Category, SortOption, Difficulty, TimeFilterMode, RecipeViewMode } from '../types/recipe';
import { MealLogEntry } from '../types/mealLog';
import { MealTime } from '../types/planner';
import { FridgeItem } from '../types/fridge';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { Colors } from '../theme/colors';
import { styles } from './HomeScreen.styles';
import { useTheme } from '../theme/ThemeContext';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { CategoryPills } from '../components/CategoryPills';
import { EmptyState } from '../components/EmptyState';
import { StockCookModal } from '../components/StockCookModal';
import { AdvancedFiltersModal } from '../components/AdvancedFiltersModal';
import { ImportMarmitonModal } from '../components/ImportMarmitonModal';
import { ChefAiWidget } from '../components/ChefAiWidget';
import { QuickMealLogModal } from '../components/QuickMealLogModal';
import { normalizeString, getLocalDateString } from '../utils/helpers';
import {
  searchRecipes,
  RecipeSearchResult,
  recipeMatchesIngredients,
  recipeMatchesTime,
  recipeMatchesDifficulty,
  recipeMatchesTags,
} from '../utils/searchEngine';
import { evaluateRecipesWithStock, RecipeStockEvaluation } from '../utils/stockMatcher';
import { prepareUserAllergens, recipeContainsAllergens } from '../utils/allergenMatcher';

const RECIPES_PER_PAGE = 20;

const CATEGORIES: Category[] = [
  'Tous',
  'Entrée',
  'Plat',
  'Dessert',
  'Apéritif',
  'Petit-déjeuner',
  'Boisson',
];

interface HomeScreenProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onAddNewRecipe: () => void;
  onScanRecipe: (initialMode?: 'photo' | 'text') => void;
  onImportRecipe?: (recipe: Recipe) => void;
  onToggleFavorite?: (id: string) => void;
  onQuickRate: (id: string, rating: number) => void;
  onOpenSettings?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToStock?: () => void;
  initialOnlyDoable?: boolean;
  isActive?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recipes,
  onSelectRecipe,
  onAddNewRecipe,
  onScanRecipe,
  onImportRecipe,
  onQuickRate,
  onOpenSettings,
  onNavigateToJournal,
  onNavigateToStock,
  initialOnlyDoable = false,
  isActive = true,
}) => {
  const { isDark, colors, themeId } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const flashListRef = useRef<FlashListRef<Recipe>>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [targetTotalTime, setTargetTotalTime] = useState<number | null>(null);
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('max');
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [ingredientMatchMode, setIngredientMatchMode] = useState<'all' | 'any'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'all' | 'any'>('any');
  const [isAdvancedFiltersModalVisible, setIsAdvancedFiltersModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [onlyDoableWithStock, setOnlyDoableWithStock] = useState(initialOnlyDoable);
  const [viewMode, setViewMode] = useState<RecipeViewMode>('detailed');

  useEffect(() => {
    StorageService.getRecipeViewMode().then((saved) => {
      if (saved) setViewMode(saved);
    });
  }, []);

  const handleChangeViewMode = useCallback((mode: RecipeViewMode) => {
    setViewMode(mode);
    StorageService.saveRecipeViewMode(mode);
  }, []);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (targetTotalTime !== null) count++;
    if (selectedDifficulties.length > 0) count++;
    if (selectedIngredients.length > 0) count++;
    if (selectedTags.length > 0) count++;
    if (minRatingFilter > 0) count++;
    return count;
  }, [targetTotalTime, selectedDifficulties.length, selectedIngredients.length, selectedTags.length, minRatingFilter]);

  const [prevInitialOnlyDoable, setPrevInitialOnlyDoable] = useState(initialOnlyDoable);
  if (prevInitialOnlyDoable !== initialOnlyDoable) {
    setPrevInitialOnlyDoable(initialOnlyDoable);
    if (initialOnlyDoable) {
      setOnlyDoableWithStock(true);
      setCurrentPage(1);
    }
  }
  const [stockItems, setStockItems] = useState<FridgeItem[]>([]);
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isMarmitonModalVisible, setIsMarmitonModalVisible] = useState(false);
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);

  // Double bandeau de filtres rétractable au défilement (haute performance, 60fps via useNativeDriver)
  const FILTER_BAR_HEIGHT = 88;
  const [filterBarAnim] = useState(() => new Animated.Value(1));
  const isFilterBarVisibleRef = useRef(true);
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(true);

  const isAnimatingRef = useRef(false);
  const prevScrollY = useRef(0);
  const scrollDeltaAcc = useRef(0);

  const showFilterBar = useCallback(() => {
    if (!isFilterBarVisibleRef.current && !isAnimatingRef.current) {
      isFilterBarVisibleRef.current = true;
      setIsFilterBarVisible(true);
      isAnimatingRef.current = true;
      Animated.timing(filterBarAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
        scrollDeltaAcc.current = 0;
      });
    }
  }, [filterBarAnim]);

  const forceShowFilterBar = useCallback(() => {
    isFilterBarVisibleRef.current = true;
    setIsFilterBarVisible(true);
    isAnimatingRef.current = false;
    filterBarAnim.stopAnimation();
    Animated.timing(filterBarAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      scrollDeltaAcc.current = 0;
    });
  }, [filterBarAnim]);

  const hideFilterBar = useCallback(() => {
    if (isFilterBarVisibleRef.current && !isAnimatingRef.current) {
      isFilterBarVisibleRef.current = false;
      isAnimatingRef.current = true;
      Animated.timing(filterBarAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
        setIsFilterBarVisible(false);
        scrollDeltaAcc.current = 0;
      });
    }
  }, [filterBarAnim]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - prevScrollY.current;
      prevScrollY.current = currentY;

      // Tout en haut de la liste (zone d'en-tête ou rebond élastique) : toujours afficher et réinitialiser
      if (currentY <= 35) {
        scrollDeltaAcc.current = 0;
        if (!isFilterBarVisibleRef.current) {
          showFilterBar();
        }
        return;
      }

      // Si une animation est en cours, ignorer les événements pour laisser l'animation native se dérouler
      if (isAnimatingRef.current) {
        scrollDeltaAcc.current = 0;
        return;
      }

      // Ignorer les micro-bruits de capteur tactile (< 1.5px) lorsque le doigt reste posé sur l'écran
      if (Math.abs(diff) < 1.5) {
        return;
      }

      // Accumulation directionnelle avec hystérésis élevée
      // Défilement vers le bas (diff > 0)
      if (diff > 0) {
        if (scrollDeltaAcc.current < 0) {
          scrollDeltaAcc.current = 0;
        }
        scrollDeltaAcc.current += diff;

        // Défilement continu vers le bas d'au moins 70px pour masquer le bandeau
        if (scrollDeltaAcc.current > 70 && isFilterBarVisibleRef.current && currentY > 60) {
          hideFilterBar();
        }
      }
      // Défilement vers le haut (diff < 0)
      else if (diff < 0) {
        if (scrollDeltaAcc.current > 0) {
          scrollDeltaAcc.current = 0;
        }
        scrollDeltaAcc.current += diff;

        // Défilement continu délibéré vers le haut d'au moins 65px pour réafficher le bandeau
        if (scrollDeltaAcc.current < -65 && !isFilterBarVisibleRef.current) {
          showFilterBar();
        }
      }
    },
    [hideFilterBar, showFilterBar]
  );

  // État du suivi des repas du jour (midi et soir)
  const [todayMeals, setTodayMeals] = useState<{ lunch?: MealLogEntry; dinner?: MealLogEntry }>({});
  const [quickLogModal, setQuickLogModal] = useState<{
    visible: boolean;
    date: string;
    mealTime: MealTime;
    entry?: MealLogEntry | null;
  }>({
    visible: false,
    date: getLocalDateString(),
    mealTime: 'lunch',
    entry: null,
  });

  const loadTodayMeals = useCallback(async () => {
    try {
      const data = await StorageService.getTodayMeals();
      setTodayMeals(data);
    } catch (e) {
      console.error('Erreur chargement repas du jour:', e);
    }
  }, []);

  const loadStockItems = useCallback(async () => {
    try {
      const items = await StorageService.getFridgeItems();
      setStockItems(items);
    } catch (e) {
      console.error('Erreur chargement stock étagères:', e);
    }
  }, []);

  // État des allergènes et filtrage automatique
  const [userAllergens, setUserAllergens] = useState<UserAllergenItem[]>([]);
  const [isAllergenFilterEnabled, setIsAllergenFilterEnabled] = useState(true);

  const loadAllergenSettings = useCallback(async () => {
    try {
      const [allergens, filterEnabled] = await Promise.all([
        StorageService.getUserAllergens(),
        StorageService.getAllergenFilterEnabled(),
      ]);
      setUserAllergens(allergens);
      setIsAllergenFilterEnabled(filterEnabled);
    } catch (e) {
      console.error('Erreur chargement allergènes sur HomeScreen:', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialHomeScreenData = async () => {
      try {
        const [meals, items, allergens, filterEnabled] = await Promise.all([
          StorageService.getTodayMeals(),
          StorageService.getFridgeItems(),
          StorageService.getUserAllergens(),
          StorageService.getAllergenFilterEnabled(),
        ]);
        if (isMounted) {
          setTodayMeals(meals);
          setStockItems(items);
          setUserAllergens(allergens);
          setIsAllergenFilterEnabled(filterEnabled);
        }
      } catch (e) {
        console.error('Erreur chargement initial HomeScreen:', e);
      }
    };
    fetchInitialHomeScreenData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Rafraîchissement réactif lorsque l'écran redevient actif (Keep-Alive onglets persistants)
  useEffect(() => {
    if (isActive) {
      void (async () => {
        await loadTodayMeals();
        await loadAllergenSettings();
        await loadStockItems();
      })();
    }
  }, [isActive, loadTodayMeals, loadAllergenSettings, loadStockItems]);

  // Synchronisation en direct avec les modifications de stock (étagères/frigo)
  useEffect(() => {
    const unsubFridge = StorageService.onFridgeChange((updatedFridge) => {
      setStockItems(updatedFridge);
    });
    return () => {
      unsubFridge();
    };
  }, []);

  // Indexation optimisée des allergènes pour filtrage O(1)
  const preparedAllergens = useMemo(
    () => prepareUserAllergens(userAllergens),
    [userAllergens]
  );

  const hiddenByAllergensCount = useMemo(() => {
    if (!isAllergenFilterEnabled || userAllergens.length === 0) return 0;
    return recipes.filter((r) => recipeContainsAllergens(r, preparedAllergens)).length;
  }, [recipes, isAllergenFilterEnabled, userAllergens.length, preparedAllergens]);

  // Évaluation des recettes faisables avec le stock
  const { doableRecipesMap, doableCount } = useMemo(() => {
    if (stockItems.length === 0 || recipes.length === 0) {
      return { doableRecipesMap: new Map<string, RecipeStockEvaluation>(), doableCount: 0 };
    }
    const map = evaluateRecipesWithStock(recipes, stockItems, {
      assumePantryStaplesAvailable: true,
    });
    let count = 0;
    map.forEach((ev) => {
      if (ev.isDoable) count++;
    });
    return { doableRecipesMap: map, doableCount: count };
  }, [recipes, stockItems]);

  const handleToggleDoableFilter = () => {
    setCurrentPage(1);
    if (onlyDoableWithStock) {
      setOnlyDoableWithStock(false);
      return;
    }
    if (stockItems.length === 0) {
      Alert.alert(
        'Étagères vides',
        "Vous n'avez aucun aliment enregistré dans vos étagères. Remplissez votre stock pour filtrer vos recettes !",
        [
          { text: 'Annuler', style: 'cancel' },
          ...(onNavigateToStock
            ? [{ text: 'Remplir mes étagères 🥫', onPress: onNavigateToStock }]
            : []),
        ]
      );
      return;
    }
    if (doableCount === 0) {
      Alert.alert(
        'Aucune recette prête',
        "Aucune recette de votre carnet ne peut être cuisinée à 100% avec vos aliments actuels. Voulez-vous demander au Chef IA d'inventer une recette inédite avec votre stock ?",
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Inspirer le Chef IA ✨',
            onPress: () => {
              loadStockItems();
              setIsStockModalVisible(true);
            },
          },
        ]
      );
      return;
    }
    setOnlyDoableWithStock(true);
  };

  const handleOpenMealSlot = (slot: MealTime) => {
    const today = getLocalDateString();
    setQuickLogModal({
      visible: true,
      date: today,
      mealTime: slot,
      entry: slot === 'lunch' ? todayMeals.lunch : todayMeals.dinner,
    });
  };

  const handleSaveQuickMeal = async (
    title: string,
    recipeId?: string,
    recipeImageUrl?: string,
    note?: string
  ) => {
    try {
      await StorageService.setMealLog(quickLogModal.date, quickLogModal.mealTime, {
        title,
        recipeId,
        recipeImageUrl,
        note,
      });
      await loadTodayMeals();
    } catch (e) {
      console.error('Erreur enregistrement repas rapide:', e);
    }
  };

  const handleDeleteQuickMeal = async () => {
    try {
      await StorageService.setMealLog(quickLogModal.date, quickLogModal.mealTime, null);
      await loadTodayMeals();
    } catch (e) {
      console.error('Erreur suppression repas rapide:', e);
    }
  };

  // Category counts
  const recipeCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { Tous: recipes.length };
    recipes.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [recipes]);

  // Handler pour la sélection multi-catégorie (Entrée + Plat, etc.)
  const handleToggleCategory = (cat: Category) => {
    setCurrentPage(1);
    if (cat === 'Tous') {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories((prev) => {
      const active = prev.filter((c) => c !== 'Tous');
      if (active.includes(cat)) {
        return active.filter((c) => c !== cat);
      } else {
        return [...active, cat];
      }
    });
  };

  // Filtering & Sorting avec moteur de recherche intelligent (multi-ingrédients, fuzzy & synonymes)
  const { filteredRecipes, matchedIngredientsMap } = useMemo(() => {
    let searchResults: RecipeSearchResult[] = [];
    const isSearching = searchQuery.trim().length > 0;

    if (isSearching) {
      searchResults = searchRecipes(recipes, searchQuery);
    } else {
      searchResults = recipes.map((r) => ({
        recipe: r,
        score: 1,
        matchedTokensCount: 0,
        totalTokensCount: 0,
        matchedIngredients: [],
      }));
    }

    const ingMap: Record<string, string[]> = {};
    searchResults.forEach((res) => {
      ingMap[res.recipe.id] = res.matchedIngredients;
    });

    let result = searchResults;

    // Végétarien uniquement
    if (onlyVegetarian) {
      result = result.filter((r) => r.recipe.isVegetarian);
    }

    // Filtrer pour n'avoir que les recettes faisables avec ce que j'ai en stock (Besoin 1)
    if (onlyDoableWithStock) {
      result = result.filter((r) => doableRecipesMap.get(r.recipe.id)?.isDoable);
    }

    // Catégories multiples (ex: Entrée + Plat)
    if (selectedCategories.length > 0 && !selectedCategories.includes('Tous')) {
      result = result.filter((r) => selectedCategories.includes(r.recipe.category));
    }

    // Note minimum (3+, 3.5+, 4+, 4.5+)
    if (minRatingFilter > 0) {
      result = result.filter((r) => r.recipe.rating >= minRatingFilter);
    }

    // Recherche par ingrédients sélectionnés (Filtres avancés)
    if (selectedIngredients.length > 0) {
      result = result.filter((r) =>
        recipeMatchesIngredients(r.recipe, selectedIngredients, ingredientMatchMode)
      );
    }

    // Temps total (préparation + cuisson : rapide ≤ ou mijoté ≥)
    if (targetTotalTime !== null) {
      result = result.filter((r) => recipeMatchesTime(r.recipe, targetTotalTime, timeFilterMode));
    }

    // Niveau de difficulté
    if (selectedDifficulties.length > 0) {
      result = result.filter((r) => recipeMatchesDifficulty(r.recipe, selectedDifficulties));
    }

    // Tags personnalisés (Filtres avancés)
    if (selectedTags.length > 0) {
      result = result.filter((r) =>
        recipeMatchesTags(r.recipe, selectedTags, tagMatchMode)
      );
    }

    // Filtrage automatique des recettes contenant des allergènes personnels (activé par défaut)
    if (isAllergenFilterEnabled && userAllergens.length > 0) {
      result = result.filter((r) => !recipeContainsAllergens(r.recipe, preparedAllergens));
    }

    // Tri
    result.sort((a, b) => {
      // En cours de recherche textuelle, les résultats les plus pertinents (score élevé) sont mis en avant
      if (isSearching) {
        if (sortBy === 'rating_desc') {
          // Si les notes sont différentes, respecter la note, sinon départager par score de recherche
          if (b.recipe.rating !== a.recipe.rating) {
            return b.recipe.rating - a.recipe.rating;
          }
          return b.score - a.score;
        }
        if (sortBy === 'recent') {
          return b.score - a.score;
        }
      }

      switch (sortBy) {
        case 'rating_desc':
          return b.recipe.rating - a.recipe.rating;
        case 'rating_asc':
          return a.recipe.rating - b.recipe.rating;
        case 'prep_time':
          return (a.recipe.prepTimeMinutes + a.recipe.cookTimeMinutes) - (b.recipe.prepTimeMinutes + b.recipe.cookTimeMinutes);
        case 'title':
          return a.recipe.title.localeCompare(b.recipe.title, 'fr');
        case 'recent':
        default:
          return new Date(b.recipe.createdAt).getTime() - new Date(a.recipe.createdAt).getTime();
      }
    });

    return {
      filteredRecipes: result.map((r) => r.recipe),
      matchedIngredientsMap: ingMap,
    };
  }, [
    recipes,
    searchQuery,
    selectedCategories,
    selectedIngredients,
    ingredientMatchMode,
    selectedTags,
    tagMatchMode,
    targetTotalTime,
    timeFilterMode,
    selectedDifficulties,
    minRatingFilter,
    onlyVegetarian,
    onlyDoableWithStock,
    isAllergenFilterEnabled,
    userAllergens.length,
    preparedAllergens,
    doableRecipesMap,
    sortBy,
  ]);

  // Pagination (20 recettes par page pour une fluidité maximale)
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecipes = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * RECIPES_PER_PAGE;
    return filteredRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
  }, [filteredRecipes, safeCurrentPage]);

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      forceShowFilterBar();
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      forceShowFilterBar();
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Helper pour trouver les ingrédients matchés pour chaque recette (recherche + frigo + stock)
  const getMatchedIngredientsForRecipe = (recipe: Recipe): string[] => {
    const fromSearch = matchedIngredientsMap[recipe.id] || [];
    const fromDoable = onlyDoableWithStock
      ? (doableRecipesMap.get(recipe.id)?.matchedIngredients || [])
          .filter((m) => m.matchedBy === 'stock')
          .map((m) => m.ingredient.name)
      : [];

    if (selectedIngredients.length === 0 && fromDoable.length === 0) return fromSearch;

    const normSelected = selectedIngredients.map(normalizeString);
    const fromFridge = recipe.ingredients
      .filter((ing) => {
        const norm = normalizeString(ing.name);
        return normSelected.some((sel) => norm.includes(sel) || sel.includes(norm));
      })
      .map((i) => i.name);

    const combined = new Set([...fromSearch, ...fromFridge, ...fromDoable]);
    return Array.from(combined);
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedIngredients([]);
    setSelectedTags([]);
    setTagMatchMode('any');
    setTargetTotalTime(null);
    setTimeFilterMode('max');
    setSelectedDifficulties([]);
    setIngredientMatchMode('all');
    setMinRatingFilter(0);
    setOnlyVegetarian(false);
    setOnlyDoableWithStock(false);
    setCurrentPage(1);
    forceShowFilterBar();
  };

  // En-tête de la liste défilante : Dongle Chef IA (scrollable avec la liste), bandeau frigo et résumé des résultats
  const listHeaderElement = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        {/* Widget Inspirations Chef IA (défile avec les cartes de recettes) */}
        <ChefAiWidget
          stockCount={stockItems.length}
          stockItems={stockItems}
          doableCount={doableCount}
          onOpenChefAi={() => {
            loadStockItems().catch(() => {});
            setIsStockModalVisible(true);
          }}
          onNavigateToStock={onNavigateToStock}
        />

        {/* Bandeau filtre Stock actif (recettes 100% faisables) */}
        {onlyDoableWithStock && (
          <View style={styles.stockActiveBanner}>
            <View style={styles.stockActiveLeft}>
              <MaterialCommunityIcons name="fridge" size={17} color={colors.primary} />
              <Text style={styles.stockActiveText} numberOfLines={1}>
                {doableCount > 1
                  ? `${doableCount} recettes prêtes avec votre stock`
                  : `${doableCount} recette prête avec votre stock`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setOnlyDoableWithStock(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Désactiver le filtre de stock"
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bandeau filtres avancés actifs (Temps, Note, Difficulté, Ingrédients) */}
        {(targetTotalTime !== null ||
          selectedDifficulties.length > 0 ||
          selectedIngredients.length > 0 ||
          minRatingFilter > 0) && (
          <View style={styles.advancedFiltersActiveBanner}>
            <View style={styles.advancedFiltersActiveLeft}>
              <Ionicons name="options" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activePillsScroll}
              >
                {targetTotalTime !== null && (
                  <View style={styles.activePillChip}>
                    <Ionicons
                      name={timeFilterMode === 'min' ? 'flame-outline' : 'time-outline'}
                      size={12}
                      color={colors.primary}
                    />
                    <Text style={styles.activePillChipText}>
                      {timeFilterMode === 'min' ? `≥ ${targetTotalTime} min (mijoté)` : `≤ ${targetTotalTime} min`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTargetTotalTime(null)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {minRatingFilter > 0 && (
                  <View style={styles.activePillChip}>
                    <Ionicons name="star" size={12} color={colors.amber} />
                    <Text style={styles.activePillChipText}>
                      {`≥ ${minRatingFilter % 1 === 0 ? minRatingFilter : minRatingFilter.toFixed(1)} ★`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setMinRatingFilter(0)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedDifficulties.length > 0 && (
                  <View style={styles.activePillChip}>
                    <Ionicons name="bar-chart-outline" size={12} color={colors.primary} />
                    <Text style={styles.activePillChipText}>
                      {selectedDifficulties.join(', ')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedDifficulties([])}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedIngredients.length > 0 && (
                  <View style={styles.activePillChip}>
                    <Ionicons name="nutrition-outline" size={12} color={colors.secondary} />
                    <Text style={styles.activePillChipText}>
                      {ingredientMatchMode === 'all' ? 'Avec (tous) : ' : 'Avec (au choix) : '}
                      {selectedIngredients.join(', ')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedIngredients([])}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedTags.length > 0 && (
                  <View style={styles.activePillChip}>
                    <Ionicons name="pricetag-outline" size={12} color={colors.primary} />
                    <Text style={styles.activePillChipText}>
                      {tagMatchMode === 'all' ? 'Tags (tous) : ' : 'Tags (au choix) : '}
                      {selectedTags.join(', ')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTags([])}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTargetTotalTime(null);
                setTimeFilterMode('max');
                setSelectedDifficulties([]);
                setSelectedIngredients([]);
                setSelectedTags([]);
                setMinRatingFilter(0);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Réinitialiser les filtres avancés"
            >
              <Text style={styles.clearAdvancedText}>Effacer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Résumé des résultats & indicateur recherche intelligente */}
        <View style={styles.resultsCountRow}>
          <View style={styles.resultsCountLeft}>
            <Text style={styles.resultsCountText}>
              {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
              {isAllergenFilterEnabled && hiddenByAllergensCount > 0
                ? ` • 🛡️ ${hiddenByAllergensCount} masquée${hiddenByAllergensCount > 1 ? 's' : ''}`
                : ''}
              {filteredRecipes.length > RECIPES_PER_PAGE && ` • Page ${safeCurrentPage}/${totalPages}`}
            </Text>

            {searchQuery.trim().length > 0 && (
              <View style={styles.smartBadge}>
                <Ionicons name="sparkles" size={11} color={colors.primary} />
                <Text style={styles.smartBadgeText}>Recherche intelligente</Text>
              </View>
            )}
          </View>

          {/* Switcher de mode d'affichage des recettes : Détaillé, Compact, Grille */}
          <View style={styles.viewModeSwitcher}>
            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'detailed' && styles.viewModeBtnActive,
              ]}
              onPress={() => handleChangeViewMode('detailed')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Affichage grandes cartes détaillées"
            >
              <Ionicons
                name={viewMode === 'detailed' ? 'albums' : 'albums-outline'}
                size={16}
                color={viewMode === 'detailed' ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'compact' && styles.viewModeBtnActive,
              ]}
              onPress={() => handleChangeViewMode('compact')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Affichage liste compacte"
            >
              <Ionicons
                name={viewMode === 'compact' ? 'list' : 'list-outline'}
                size={17}
                color={viewMode === 'compact' ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.viewModeBtn,
                viewMode === 'grid' && styles.viewModeBtnActive,
              ]}
              onPress={() => handleChangeViewMode('grid')}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Affichage en grille 2 colonnes"
            >
              <Ionicons
                name={viewMode === 'grid' ? 'grid' : 'grid-outline'}
                size={15}
                color={viewMode === 'grid' ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [
      todayMeals,
      selectedIngredients,
      ingredientMatchMode,
      selectedTags,
      tagMatchMode,
      targetTotalTime,
      timeFilterMode,
      selectedDifficulties,
      ingredientMatchMode,
      onlyDoableWithStock,
      doableCount,
      filteredRecipes.length,
      isAllergenFilterEnabled,
      hiddenByAllergensCount,
      safeCurrentPage,
      totalPages,
      searchQuery,
      colors,
      viewMode,
      handleChangeViewMode,
      onNavigateToJournal,
    ]
  );

  // Pied de liste avec bouton Page suivante / précédente
  const listFooterElement = useMemo(() => {
    if (filteredRecipes.length === 0) return undefined;

    if (totalPages <= 1) {
      return (
        <View style={styles.paginationEndContainer}>
          <Text style={styles.paginationEndText}>
            Fin des {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.paginationContainer}>
        {/* Résumé de pagination */}
        <View style={styles.paginationInfoBox}>
          <Text style={styles.paginationCountText}>
            Recettes {(safeCurrentPage - 1) * RECIPES_PER_PAGE + 1} à{' '}
            {Math.min(safeCurrentPage * RECIPES_PER_PAGE, filteredRecipes.length)} sur{' '}
            {filteredRecipes.length}
          </Text>
          <View style={styles.pagePill}>
            <Text style={styles.pagePillText}>
              Page {safeCurrentPage} / {totalPages}
            </Text>
          </View>
        </View>

        {/* Boutons d'action : Page suivante (mise en avant) et Page précédente */}
        <View style={styles.paginationNavRow}>
          {safeCurrentPage > 1 && (
            <TouchableOpacity
              style={[styles.pageBtn, styles.pageBtnPrev]}
              onPress={handlePrevPage}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
              <Text style={styles.pageBtnTextPrev}>Page précédente</Text>
            </TouchableOpacity>
          )}

          {safeCurrentPage < totalPages && (
            <TouchableOpacity
              style={[
                styles.pageBtn,
                styles.pageBtnNext,
                safeCurrentPage === 1 && styles.pageBtnNextFull,
              ]}
              onPress={handleNextPage}
              activeOpacity={0.8}
            >
              <Text style={styles.pageBtnTextNext}>Page suivante</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [themeId, isDark, colors, filteredRecipes.length, totalPages, safeCurrentPage]);

  // Rendu mémoïsé de chaque carte recette
  const renderRecipeItem = useCallback(
    ({ item }: { item: Recipe }) => {
      const stockEval = doableRecipesMap.get(item.id);
      const stockProgress =
        stockItems.length > 0 && stockEval && stockEval.totalEssentialCount > 0
          ? {
              matchedCount: stockEval.matchedEssentialCount,
              totalCount: stockEval.totalEssentialCount,
              percentage: stockEval.matchPercentage,
            }
          : undefined;

      return (
        <RecipeCard
          recipe={item}
          viewMode={viewMode}
          onPress={() => onSelectRecipe(item)}
          onQuickRate={(rating) => onQuickRate(item.id, rating)}
          highlightedIngredients={getMatchedIngredientsForRecipe(item)}
          hasAllergen={recipeContainsAllergens(item, preparedAllergens)}
          stockProgress={stockProgress}
        />
      );
    },
    [
      onSelectRecipe,
      onQuickRate,
      matchedIngredientsMap,
      selectedIngredients,
      onlyDoableWithStock,
      doableRecipesMap,
      preparedAllergens,
      stockItems.length,
      viewMode,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* En-tête supérieur FIXE (reste en haut lors du défilement, NE perd jamais le focus pendant la frappe) */}
        <View style={styles.fixedTopHeader}>
          {/* Top Brand Bar : Identité culinaire avec logo à gauche & Bouton Ajouter proéminent à droite */}
          <View style={styles.topBrandRow}>
            {/* Identité / Marque (Titre seul épuré) */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="cover"
              />
              <View style={styles.brandTitleCol}>
                <Text style={styles.brandTitle}>Papilles</Text>
              </View>
            </View>

            {/* Bouton proéminent + ouvrant le menu fluide à 3 choix */}
            <TouchableOpacity
              style={styles.prominentAddBtn}
              onPress={() => setIsAddMenuVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ajouter une recette"
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Barre de Recherche & Bouton Filtres Avancés (Famille 2) */}
          <SearchBar
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              forceShowFilterBar();
            }}
            placeholder="Rechercher ingrédients, plats, synonymes..."
            onClear={() => {
              setSearchQuery('');
              forceShowFilterBar();
            }}
            onOpenAdvancedFilters={() => setIsAdvancedFiltersModalVisible(true)}
            activeFiltersCount={activeAdvancedFiltersCount}
          />
        </View>

        {/* Zone de contenu principale (FlashList + Double bandeau rétractable en superposition native) */}
        <View style={styles.contentArea}>
          {/* Liste des recettes avec virtualisation FlashList haute performance et layout dynamique */}
          <FlashList
            key={viewMode === 'grid' ? 'recipes-grid-2' : `recipes-${viewMode}-1`}
            ref={flashListRef}
            data={paginatedRecipes}
            extraData={`${themeId}_${viewMode}`}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            ListHeaderComponent={listHeaderElement}
            ListFooterComponent={listFooterElement}
            contentContainerStyle={[
              styles.listContent,
              viewMode === 'grid' ? styles.listContentGrid : undefined,
              { paddingTop: FILTER_BAR_HEIGHT + 6 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={renderRecipeItem}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              onlyDoableWithStock ? (
                <EmptyState
                  title="Aucune recette 100% en stock"
                  description="Aucune recette de votre carnet ne correspond exactement aux ingrédients actuellement enregistrés dans vos étagères."
                  actionLabel="✨ Inventer avec le Chef IA"
                  onAction={() => {
                    loadStockItems();
                    setIsStockModalVisible(true);
                  }}
                />
              ) : selectedIngredients.length > 0 ? (
                <EmptyState
                  title="Aucune recette avec ces restes"
                  description={`Votre carnet ne contient pas de recette avec : ${selectedIngredients.join(', ')}.\nDemandez au Chef IA d'inventer une recette originale avec exactement ces ingrédients !`}
                  actionLabel="✨ Inventer avec le Chef IA"
                  onAction={() => {
                    loadStockItems();
                    setIsStockModalVisible(true);
                  }}
                />
              ) : (
                <EmptyState
                  title="Aucune recette trouvée"
                  description="Essayez de modifier vos critères de recherche ou ajoutez votre propre recette !"
                  actionLabel="Réinitialiser les filtres"
                  onAction={handleResetAllFilters}
                />
              )
            }
          />

          {/* Double bandeau de filtres rétractable natif (disparaît au défilement vers le bas, réapparaît vers le haut) */}
          <Animated.View
            style={[
              styles.collapsibleFilterContainer,
              {
                transform: [
                  {
                    translateY: filterBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-FILTER_BAR_HEIGHT, 0],
                    }),
                  },
                ],
                opacity: filterBarAnim.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, 0.2, 1],
                }),
              },
            ]}
            pointerEvents={isFilterBarVisible ? 'auto' : 'none'}
          >
            {/* Bandeau 1 : Catégories (Tous, Entrées, Plats, Desserts...) */}
            <CategoryPills
              categories={CATEGORIES}
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              recipeCountByCategory={recipeCountByCategory}
            />

            {/* Bandeau 2 : Filtres rapides 1-clic & Tri */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterToolbarScroll}
            >
              {/* Sélecteur de Tri */}
              <TouchableOpacity
                style={[styles.toolPill, styles.sortToolPill]}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-vertical" size={13} color={colors.textSecondary} />
                <Text style={styles.toolPillText}>
                  Tri : {sortBy === 'rating_desc'
                    ? 'Note'
                    : sortBy === 'prep_time'
                    ? 'Temps'
                    : sortBy === 'title'
                    ? 'A-Z'
                    : 'Date'}
                </Text>
                <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Mon Stock Toggle Pill (Recettes 100% faisables) */}
              <TouchableOpacity
                style={[styles.toolPill, onlyDoableWithStock && styles.stockToolPillActive]}
                onPress={handleToggleDoableFilter}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={onlyDoableWithStock ? 'restaurant' : 'restaurant-outline'}
                  size={13}
                  color={onlyDoableWithStock ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.toolPillText, onlyDoableWithStock && styles.stockToolPillTextActive]}>
                  {doableCount > 0 ? `En stock (${doableCount})` : 'En stock'}
                </Text>
              </TouchableOpacity>

              {/* Végétarien Toggle Pill */}
              <TouchableOpacity
                style={[styles.toolPill, onlyVegetarian && styles.vegeToolPillActive]}
                onPress={() => setOnlyVegetarian(!onlyVegetarian)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="leaf"
                  size={13}
                  color={onlyVegetarian ? (isDark ? '#4ADE80' : '#15803D') : colors.textSecondary}
                />
                <Text style={[styles.toolPillText, onlyVegetarian && styles.vegeToolPillTextActive]}>
                  Végé
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>

        {/* Modal Menu d'Ajout Fluide à 3 Choix */}
        <Modal
          visible={isAddMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsAddMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsAddMenuVisible(false)}
          >
            <View style={styles.addMenuBox} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.addMenuTitle}>Ajouter une recette</Text>
                <TouchableOpacity
                  onPress={() => setIsAddMenuVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Choix 1 : Texte brut */}
              <TouchableOpacity
                style={styles.addMenuOption}
                onPress={() => {
                  setIsAddMenuVisible(false);
                  onAddNewRecipe();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.addMenuIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="create-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.addMenuTextCol}>
                  <Text style={styles.addMenuOptionTitle}>Texte brut</Text>
                  <Text style={styles.addMenuOptionSubtitle}>
                    Saisie manuelle ou IA
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Choix 2 : Scanner */}
              <TouchableOpacity
                style={styles.addMenuOption}
                onPress={() => {
                  setIsAddMenuVisible(false);
                  onScanRecipe('photo');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.addMenuIconBox, { backgroundColor: colors.secondaryLight }]}>
                  <Ionicons name="camera-outline" size={22} color={colors.secondary} />
                </View>
                <View style={styles.addMenuTextCol}>
                  <Text style={styles.addMenuOptionTitle}>Scanner</Text>
                  <Text style={styles.addMenuOptionSubtitle}>
                    Photo d’un livre ou carnet
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Choix 3 : Coller un lien web */}
              <TouchableOpacity
                style={styles.addMenuOption}
                onPress={() => {
                  setIsAddMenuVisible(false);
                  setIsMarmitonModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.addMenuIconBox, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="globe-outline" size={22} color={colors.textPrimary} />
                </View>
                <View style={styles.addMenuTextCol}>
                  <Text style={styles.addMenuOptionTitle}>Coller un lien web</Text>
                  <Text style={styles.addMenuOptionSubtitle}>
                    Marmiton, 750g, blogs...
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Tri (labels concis et instinctifs) */}
        <Modal
          visible={isFilterModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sortModalBox}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.sortModalTitle}>Trier les recettes</Text>
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {[
                { id: 'rating_desc', label: 'Note', icon: 'star' },
                { id: 'prep_time', label: 'Temps de préparation', icon: 'time-outline' },
                { id: 'recent', label: "Date d'ajout", icon: 'calendar-outline' },
                { id: 'title', label: 'A - Z', icon: 'text-outline' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.sortOptionRow,
                    sortBy === option.id && styles.sortOptionSelected,
                  ]}
                  onPress={() => {
                    setSortBy(option.id as SortOption);
                    setIsFilterModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sortOptionLeft}>
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={sortBy === option.id ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === option.id && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {sortBy === option.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.closeSortModalBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={styles.closeSortModalText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Filtres Avancés (Temps total, Note minimale, Difficulté, Ingrédients, Tags) */}
        <AdvancedFiltersModal
          visible={isAdvancedFiltersModalVisible}
          onClose={() => setIsAdvancedFiltersModalVisible(false)}
          onApply={({
            targetTotalTime: newTargetTime,
            timeFilterMode: newTimeMode,
            difficulties: newDifficulties,
            selectedIngredients: newIngredients,
            ingredientMatchMode: newMatchMode,
            selectedTags: newTags,
            tagMatchMode: newTagMatchMode,
            minRating: newMinRating,
            onlyVegetarian: newOnlyVegetarian,
            onlyDoableWithStock: newOnlyDoableWithStock,
          }) => {
            setCurrentPage(1);
            setTargetTotalTime(newTargetTime);
            setTimeFilterMode(newTimeMode);
            setSelectedDifficulties(newDifficulties);
            setSelectedIngredients(newIngredients);
            setIngredientMatchMode(newMatchMode);
            if (newTags !== undefined) setSelectedTags(newTags);
            if (newTagMatchMode !== undefined) setTagMatchMode(newTagMatchMode);
            if (newMinRating !== undefined) setMinRatingFilter(newMinRating);
            if (newOnlyVegetarian !== undefined) setOnlyVegetarian(newOnlyVegetarian);
            if (newOnlyDoableWithStock !== undefined) setOnlyDoableWithStock(newOnlyDoableWithStock);
          }}
          onReset={() => {
            setCurrentPage(1);
            setTargetTotalTime(null);
            setTimeFilterMode('max');
            setSelectedDifficulties([]);
            setSelectedIngredients([]);
            setIngredientMatchMode('all');
            setSelectedTags([]);
            setTagMatchMode('any');
            setMinRatingFilter(0);
          }}
          targetTotalTime={targetTotalTime}
          timeFilterMode={timeFilterMode}
          difficulties={selectedDifficulties}
          selectedIngredients={selectedIngredients}
          ingredientMatchMode={ingredientMatchMode}
          selectedTags={selectedTags}
          tagMatchMode={tagMatchMode}
          minRating={minRatingFilter}
          onlyVegetarian={onlyVegetarian}
          onlyDoableWithStock={onlyDoableWithStock}
          recipes={recipes}
          doableRecipesMap={doableRecipesMap}
          selectedCategories={selectedCategories}
          searchQuery={searchQuery}
        />

        {/* Modal Cuisiner avec mon stock & suggestions Chef IA */}
        <StockCookModal
          visible={isStockModalVisible}
          recipes={recipes}
          stockItems={stockItems}
          doableCount={doableCount}
          isDoableFilterActive={onlyDoableWithStock}
          onApplyDoableFilter={(active) => setOnlyDoableWithStock(active)}
          onRecipeGenerated={(recipe) => {
            setIsStockModalVisible(false);
            if (onImportRecipe) {
              onImportRecipe(recipe as Recipe);
            }
          }}
          onNavigateToStock={onNavigateToStock}
          onClose={() => setIsStockModalVisible(false)}
        />

        {/* Modal Bot Import Marmiton */}
        <ImportMarmitonModal
          visible={isMarmitonModalVisible}
          onClose={() => setIsMarmitonModalVisible(false)}
          onRecipeImported={(importedRecipe) => {
            setIsMarmitonModalVisible(false);
            if (onImportRecipe) {
              onImportRecipe(importedRecipe);
            }
          }}
        />

        {/* Modal Saisie Rapide Libre pour le suivi des repas du jour */}
        <QuickMealLogModal
          visible={quickLogModal.visible}
          date={quickLogModal.date}
          mealTime={quickLogModal.mealTime}
          currentEntry={quickLogModal.entry}
          recipes={recipes}
          onSave={handleSaveQuickMeal}
          onDelete={quickLogModal.entry ? handleDeleteQuickMeal : undefined}
          onClose={() =>
            setQuickLogModal((prev) => ({ ...prev, visible: false, entry: null }))
          }
        />
      </View>
    </SafeAreaView>
  );
};

