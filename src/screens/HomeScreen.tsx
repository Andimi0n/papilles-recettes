import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Image,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Recipe, Category, SortOption, Difficulty, TimeFilterMode } from '../types/recipe';
import { MealLogEntry } from '../types/mealLog';
import { MealTime } from '../types/planner';
import { FridgeItem } from '../types/fridge';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { CategoryPills } from '../components/CategoryPills';
import { EmptyState } from '../components/EmptyState';
import { StockCookModal } from '../components/StockCookModal';
import { AdvancedFiltersModal } from '../components/AdvancedFiltersModal';
import { ImportMarmitonModal } from '../components/ImportMarmitonModal';
import { ChefAiWidget } from '../components/ChefAiWidget';
import { TodayMealWidget } from '../components/TodayMealWidget';
import { QuickMealLogModal } from '../components/QuickMealLogModal';
import { normalizeString, getLocalDateString } from '../utils/helpers';
import {
  searchRecipes,
  RecipeSearchResult,
  recipeMatchesIngredients,
  recipeMatchesTime,
  recipeMatchesDifficulty,
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
}) => {
  const { isDark, colors, themeId } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const flatListRef = useRef<FlatList<Recipe>>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [targetTotalTime, setTargetTotalTime] = useState<number | null>(null);
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('max');
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [ingredientMatchMode, setIngredientMatchMode] = useState<'all' | 'any'>('all');
  const [isAdvancedFiltersModalVisible, setIsAdvancedFiltersModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [onlyDoableWithStock, setOnlyDoableWithStock] = useState(initialOnlyDoable);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (targetTotalTime !== null) count++;
    if (selectedDifficulties.length > 0) count++;
    if (selectedIngredients.length > 0) count++;
    return count;
  }, [targetTotalTime, selectedDifficulties.length, selectedIngredients.length]);

  useEffect(() => {
    if (initialOnlyDoable) {
      setOnlyDoableWithStock(true);
    }
  }, [initialOnlyDoable]);
  const [stockItems, setStockItems] = useState<FridgeItem[]>([]);
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isMarmitonModalVisible, setIsMarmitonModalVisible] = useState(false);

  // Double bandeau de filtres rétractable au défilement (haute performance, 60fps via useNativeDriver)
  const FILTER_BAR_HEIGHT = 88;
  const filterBarAnim = useRef(new Animated.Value(1)).current;
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
    loadTodayMeals();
    loadStockItems();
    loadAllergenSettings();
  }, [loadTodayMeals, loadStockItems, loadAllergenSettings]);

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

  // Réinitialiser la page courante à 1 dès qu'un critère de recherche ou filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategories,
    selectedIngredients,
    ingredientMatchMode,
    targetTotalTime,
    timeFilterMode,
    selectedDifficulties,
    sortBy,
    minRatingFilter,
    onlyVegetarian,
    onlyDoableWithStock,
    isAllergenFilterEnabled,
    userAllergens.length,
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
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      forceShowFilterBar();
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
                      {ingredientMatchMode === 'all' ? 'Avec (ET) : ' : 'Avec (OU) : '}
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
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTargetTotalTime(null);
                setTimeFilterMode('max');
                setSelectedDifficulties([]);
                setSelectedIngredients([]);
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
          <Text style={styles.resultsCountText}>
            {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
            {isAllergenFilterEnabled && hiddenByAllergensCount > 0
              ? ` • 🛡️ ${hiddenByAllergensCount} masquée${hiddenByAllergensCount > 1 ? 's' : ''}`
              : ''}
            {filteredRecipes.length > RECIPES_PER_PAGE && ` • Page ${safeCurrentPage}/${totalPages}`}
          </Text>

          {searchQuery.trim().length > 0 && (
            <View style={styles.smartBadge}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <Text style={styles.smartBadgeText}>Recherche intelligente</Text>
            </View>
          )}
        </View>
      </View>
    ),
    [
      todayMeals,
      selectedIngredients,
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
    ({ item }: { item: Recipe }) => (
      <RecipeCard
        recipe={item}
        onPress={() => onSelectRecipe(item)}
        onQuickRate={(rating) => onQuickRate(item.id, rating)}
        highlightedIngredients={getMatchedIngredientsForRecipe(item)}
        hasAllergen={recipeContainsAllergens(item, preparedAllergens)}
      />
    ),
    [onSelectRecipe, onQuickRate, matchedIngredientsMap, selectedIngredients, onlyDoableWithStock, doableRecipesMap, preparedAllergens]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* En-tête supérieur FIXE (reste en haut lors du défilement, NE perd jamais le focus pendant la frappe) */}
        <View style={styles.fixedTopHeader}>
          {/* Top Brand Bar : Identité culinaire avec logo à gauche & Actions verticales à droite */}
          <View style={styles.topBrandRow}>
            {/* Identité / Marque */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.brandLogo}
                resizeMode="cover"
              />
              <View style={styles.brandTitleCol}>
                <Text style={styles.brandTitle}>Papilles</Text>
                <Text style={styles.brandSubtitle} numberOfLines={1}>
                  Carnet & inspirations
                </Text>
              </View>
            </View>

            {/* Actions rapides empilées à la verticale : Marmiton, Scan, Ajouter */}
            <View style={styles.topActionsCol}>
              {/* Marmiton */}
              <TouchableOpacity
                style={styles.marmitonBtn}
                onPress={() => setIsMarmitonModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Importer depuis Marmiton"
              >
                <Ionicons name="globe-outline" size={12} color={colors.primary} />
                <Text style={styles.marmitonBtnText}>Marmiton</Text>
              </TouchableOpacity>

              {/* Scan */}
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => onScanRecipe('photo')}
                activeOpacity={0.8}
                accessibilityLabel="Scanner une photo de recette"
              >
                <Ionicons name="camera-outline" size={12} color={colors.primary} />
                <Text style={styles.scanBtnText}>Scan</Text>
              </TouchableOpacity>

              {/* Ajouter */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={onAddNewRecipe}
                activeOpacity={0.8}
                accessibilityLabel="Ajouter une recette"
              >
                <Ionicons name="add" size={15} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
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

        {/* Zone de contenu principale (FlatList + Double bandeau rétractable en superposition native) */}
        <View style={styles.contentArea}>
          {/* Liste des recettes avec virtualisation haute performance et layout stable */}
          <FlatList
            ref={flatListRef}
            data={paginatedRecipes}
            extraData={themeId}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={listHeaderElement}
            ListFooterComponent={listFooterElement}
            contentContainerStyle={[styles.listContent, { paddingTop: FILTER_BAR_HEIGHT + 6 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={6}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={false}
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

        {/* Modal Filtres Avancés (Temps total, Note minimale, Difficulté, Ingrédients) */}
        <AdvancedFiltersModal
          visible={isAdvancedFiltersModalVisible}
          onClose={() => setIsAdvancedFiltersModalVisible(false)}
          onApply={({
            targetTotalTime: newTargetTime,
            timeFilterMode: newTimeMode,
            difficulties: newDifficulties,
            selectedIngredients: newIngredients,
            ingredientMatchMode: newMatchMode,
            minRating: newMinRating,
          }) => {
            setTargetTotalTime(newTargetTime);
            setTimeFilterMode(newTimeMode);
            setSelectedDifficulties(newDifficulties);
            setSelectedIngredients(newIngredients);
            setIngredientMatchMode(newMatchMode);
            if (newMinRating !== undefined) setMinRatingFilter(newMinRating);
          }}
          onReset={() => {
            setTargetTotalTime(null);
            setTimeFilterMode('max');
            setSelectedDifficulties([]);
            setSelectedIngredients([]);
            setIngredientMatchMode('all');
            setMinRatingFilter(0);
          }}
          targetTotalTime={targetTotalTime}
          timeFilterMode={timeFilterMode}
          difficulties={selectedDifficulties}
          selectedIngredients={selectedIngredients}
          ingredientMatchMode={ingredientMatchMode}
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

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fixedTopHeader: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 4,
    zIndex: 10,
    elevation: 4,
  },
  collapsibleFilterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 5,
    elevation: 3,
    overflow: 'hidden',
  },
  listContent: {
    paddingBottom: 70,
  },
  listHeaderContainer: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 10,
  },
  brandTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  topActionsCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 4,
    minWidth: 106,
  },
  marmitonBtn: {
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  marmitonBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11.5,
  },
  scanBtn: {
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  scanBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11.5,
  },
  addBtn: {
    height: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
    ...shadows.small,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
  stockActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  stockActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  stockActiveText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  advancedFiltersActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  advancedFiltersActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  activePillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activePillChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearAdvancedText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 4,
  },
  fridgeActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.secondaryLight,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  fridgeActiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  fridgeActiveText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  filterToolbarScroll: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 8,
    alignItems: 'center',
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 30,
    gap: 5,
  },
  toolPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  vegeToolPillActive: {
    backgroundColor: colors.isDark ? '#143823' : '#DCFCE7',
    borderColor: colors.isDark ? '#2E7D52' : '#86EFAC',
  },
  stockToolPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  toolPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toolPillTextActive: {
    color: colors.primary,
  },
  vegeToolPillTextActive: {
    color: colors.isDark ? '#4ADE80' : '#15803D',
    fontWeight: '700',
  },
  stockToolPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sortToolPill: {
    marginLeft: 'auto',
  },
  resetFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 32,
    gap: 4,
  },
  resetFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  resultsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultsCountText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  smartBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sortModalBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sortOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  closeSortModalBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  closeSortModalText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  aiModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  aiModalBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 22,
    padding: 20,
    ...Shadows.large,
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  aiModalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  aiOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiOptionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiOptionContent: {
    flex: 1,
    marginRight: 6,
  },
  aiOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  aiOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  aiOptionTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiOptionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  aiOptionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  aiModalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  aiModalCloseBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  // Styles Pagination
  paginationContainer: {
    paddingVertical: 18,
    paddingHorizontal: 4,
    marginBottom: 40,
  },
  paginationInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paginationCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pagePill: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  paginationNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    ...Shadows.small,
  },
  pageBtnPrev: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageBtnNext: {
    backgroundColor: Colors.primary,
  },
  pageBtnNextFull: {
    flex: 1,
  },
  pageBtnTextPrev: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pageBtnTextNext: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paginationEndContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 40,
  },
  paginationEndText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
}));
