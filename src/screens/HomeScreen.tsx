import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  BackHandler,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category, SortOption, Difficulty, TimeFilterMode, RecipeViewMode } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { FolderService } from '../services/folderService';
import { FloatingSelectionBar, FolderAssignmentBottomSheet } from '../components/folders';
import { styles } from './HomeScreen.styles';
import { useTheme } from '../theme/ThemeContext';
import { RecipeCard, RecipeStockProgress } from '../components/common/RecipeCard';
import { SearchBar } from '../components/common/SearchBar';
import { CategoryPills } from '../components/common/CategoryPills';
import { EmptyState } from '../components/common/EmptyState';
import { StockCookModal } from '../components/chef-ai/StockCookModal';
import { AdvancedFiltersModal } from '../components/common/AdvancedFiltersModal';
import { PageJumpModal } from '../components/common/PageJumpModal';
import { AddRecipeMode } from './ScanRecipeScreen';
import {
  searchRecipes,
  RecipeSearchResult,
  recipeMatchesIngredients,
  recipeMatchesTime,
  recipeMatchesDifficulty,
  recipeMatchesTags,
  compareRecipes,
} from '../utils/searchEngine';
import { evaluateRecipesWithStock, RecipeStockEvaluation } from '../utils/stockMatcher';
import { prepareUserAllergens, recipeContainsAllergens } from '../utils/allergenMatcher';

const RECIPES_PER_PAGE = 20;

const CATEGORIES: Category[] = [
  'Entrée',
  'Plat',
  'Dessert',
  'Apéritif',
  'Boisson',
];

interface HomeScreenProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onAddNewRecipe: () => void;
  onScanRecipe: (initialMode?: AddRecipeMode) => void;
  onImportRecipe?: (recipe: Recipe, source?: 'stock_ai' | 'scan') => void;
  onToggleFavorite?: (id: string) => void;
  onOpenSettings?: () => void;
  onNavigateToStock?: () => void;
  initialOnlyDoable?: boolean;
  initialViewMode?: RecipeViewMode;
  initialStockItems?: FridgeItem[];
  isActive?: boolean;
  reopenStockModal?: boolean;
  onStockModalReopened?: () => void;
  activeFolderId?: string | null;
}

const HomeScreenComponent: React.FC<HomeScreenProps> = ({
  recipes,
  onSelectRecipe,
  onAddNewRecipe,
  onScanRecipe,
  onImportRecipe,
  onOpenSettings,
  onNavigateToStock,
  initialOnlyDoable = false,
  initialViewMode = 'detailed',
  initialStockItems = [],
  isActive = true,
  reopenStockModal = false,
  onStockModalReopened,
  activeFolderId = null,
}) => {
  const { isDark, colors, themeId } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const flashListRef = useRef<FlashListRef<Recipe>>(null);

  // État de sélection multiple persistant au fil des filtres et recherches
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [isFolderAssignmentOpen, setIsFolderAssignmentOpen] = useState(false);
  const isSelectionMode = selectedRecipeIds.size > 0;

  // Interception du BackHandler Android pour quitter le mode sélection en priorité
  useEffect(() => {
    const onBackPress = () => {
      if (selectedRecipeIds.size > 0) {
        setSelectedRecipeIds(new Set());
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedRecipeIds.size]);

  const handleToggleSelectRecipe = useCallback((id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleLongPressRecipe = useCallback((id: string) => {
    setSelectedRecipeIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedRecipeIds(new Set());
  }, []);

  const handleRemoveSelectedFromFolder = useCallback(async () => {
    if (!activeFolderId || activeFolderId === 'UNCATEGORIZED' || selectedRecipeIds.size === 0) return;
    try {
      await FolderService.removeRecipesFromFolder(Array.from(selectedRecipeIds), activeFolderId);
      setSelectedRecipeIds(new Set());
    } catch (err) {
      console.error('Erreur lors du retrait du dossier :', err);
    }
  }, [activeFolderId, selectedRecipeIds]);

  // Debounce fluide sur la recherche pour ne jamais bloquer le thread UI à la frappe
  useEffect(() => {
    const delay = searchQuery.trim().length === 0 ? 0 : 220;
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery.trim().length > 0) {
        setCurrentPage(1);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [targetTotalTime, setTargetTotalTime] = useState<number | null>(null);
  const [timeFilterMode, setTimeFilterMode] = useState<TimeFilterMode>('max');
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [ingredientMatchMode, setIngredientMatchMode] = useState<'all' | 'any'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMatchMode, setTagMatchMode] = useState<'all' | 'any'>('any');
  const [isAdvancedFiltersModalVisible, setIsAdvancedFiltersModalVisible] = useState(false);
  const [isPageJumpModalVisible, setIsPageJumpModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [defaultVegetarianFilter, setDefaultVegetarianFilter] = useState(false);
  const [onlyDoableWithStock, setOnlyDoableWithStock] = useState(initialOnlyDoable);
  const [viewMode, setViewMode] = useState<RecipeViewMode>(initialViewMode);
  const [prevInitialViewMode, setPrevInitialViewMode] = useState(initialViewMode);
  if (prevInitialViewMode !== initialViewMode) {
    setPrevInitialViewMode(initialViewMode);
    setViewMode(initialViewMode);
  }

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
  const [stockItems, setStockItems] = useState<FridgeItem[]>(initialStockItems);
  const [prevInitialStockItems, setPrevInitialStockItems] = useState(initialStockItems);
  if (prevInitialStockItems !== initialStockItems) {
    setPrevInitialStockItems(initialStockItems);
    if (initialStockItems && initialStockItems.length > 0) {
      setStockItems(initialStockItems);
    }
  }
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);
  const [preserveStockSession, setPreserveStockSession] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);

  const [prevReopenStockModal, setPrevReopenStockModal] = useState(reopenStockModal);
  if (prevReopenStockModal !== reopenStockModal) {
    setPrevReopenStockModal(reopenStockModal);
    if (reopenStockModal) {
      setPreserveStockSession(true);
      setIsStockModalVisible(true);
    }
  }

  // Double bandeau de filtres rétractable au défilement (haute performance, 60fps via useNativeDriver)
  const FILTER_BAR_HEIGHT = 88;
  const [filterBarAnim] = useState(() => new Animated.Value(1));
  const isFilterBarVisibleRef = useRef(true);
  const isAnimatingRef = useRef(false);
  const prevScrollY = useRef(0);
  const scrollDeltaAcc = useRef(0);

  const showFilterBar = useCallback(() => {
    if (!isFilterBarVisibleRef.current && !isAnimatingRef.current) {
      isFilterBarVisibleRef.current = true;
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

  const loadStockItems = useCallback(async () => {
    try {
      const items = await StorageService.getFridgeItems();
      setStockItems(items);
    } catch (e) {
      console.error('Erreur chargement stock étagères:', e);
    }
  }, []);

  const openFreshStockModal = useCallback(() => {
    if (onScanRecipe) {
      onScanRecipe('chef');
    } else {
      loadStockItems().catch(() => {});
      setPreserveStockSession(false);
      setIsStockModalVisible(true);
    }
  }, [onScanRecipe, loadStockItems]);

  useEffect(() => {
    if (reopenStockModal) {
      onStockModalReopened?.();
    }
  }, [reopenStockModal, onStockModalReopened]);

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

  const isFirstMountRef = useRef(true);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialHomeScreenData = async () => {
      try {
        const [items, allergens, filterEnabled, defaultVege] = await Promise.all([
          StorageService.getFridgeItems(),
          StorageService.getUserAllergens(),
          StorageService.getAllergenFilterEnabled(),
          StorageService.getDefaultVegetarianFilter(),
        ]);
        if (isMounted) {
          setStockItems(items);
          setUserAllergens(allergens);
          setIsAllergenFilterEnabled(filterEnabled);
          setDefaultVegetarianFilter(defaultVege);
          if (defaultVege) {
            setOnlyVegetarian(true);
          }
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
  // Ignoré lors du premier montage pour éviter un double appel SQLite concurrent au démarrage
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (isActive) {
      void (async () => {
        await loadAllergenSettings();
        await loadStockItems();
        const defaultVege = await StorageService.getDefaultVegetarianFilter();
        setDefaultVegetarianFilter((prev) => {
          if (prev !== defaultVege) {
            setOnlyVegetarian(defaultVege);
          }
          return defaultVege;
        });
      })();
    }
  }, [isActive, loadAllergenSettings, loadStockItems]);

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

  // Set optimisé des IDs de recettes contenant des allergènes de l'utilisateur (évaluation unique en amont)
  const recipesWithAllergensSet = useMemo(() => {
    const set = new Set<string>();
    if (preparedAllergens.items.length === 0) return set;
    recipes.forEach((r) => {
      if (recipeContainsAllergens(r, preparedAllergens)) {
        set.add(r.id);
      }
    });
    return set;
  }, [recipes, preparedAllergens]);

  const hiddenByAllergensCount = useMemo(() => {
    if (!isAllergenFilterEnabled || userAllergens.length === 0) return 0;
    return recipesWithAllergensSet.size;
  }, [isAllergenFilterEnabled, userAllergens.length, recipesWithAllergensSet]);

  // Évaluation des recettes faisables avec le stock
  const { doableRecipesMap, doableCount } = useMemo(() => {
    if (recipes.length === 0) {
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

  // Cache mémoïsé O(1) de la progression de stock par recette (évite d'allouer de nouveaux objets à chaque render)
  const stockProgressMap = useMemo(() => {
    const map = new Map<string, RecipeStockProgress>();
    if (stockItems.length === 0) return map;
    doableRecipesMap.forEach((stockEval, recipeId) => {
      if (stockEval.totalEssentialCount > 0) {
        map.set(recipeId, {
          matchedCount: stockEval.matchedEssentialCount,
          totalCount: stockEval.totalEssentialCount,
          percentage: stockEval.matchPercentage,
        });
      }
    });
    return map;
  }, [stockItems.length, doableRecipesMap]);

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
              openFreshStockModal();
            },
          },
        ]
      );
      return;
    }
    setOnlyDoableWithStock(true);
  };


  // Handler pour la sélection multi-catégorie (Entrée + Plat, etc.)
  const handleToggleCategory = (cat: Category) => {
    setCurrentPage(1);
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  // 1. Filtrage par tous les critères actifs hors catégorie (moteur de recherche, stock, allergènes, etc.)
  const { baseFilteredResults, isSearching } = useMemo(() => {
    let searchResults: RecipeSearchResult[] = [];
    const searching = debouncedSearchQuery.trim().length > 0;

    if (searching) {
      searchResults = searchRecipes(recipes, debouncedSearchQuery);
    } else {
      searchResults = recipes.map((r) => ({
        recipe: r,
        score: 1,
        matchedTokensCount: 0,
        totalTokensCount: 0,
        matchedIngredients: [],
      }));
    }

    let result = searchResults;

    // Végétarien uniquement
    if (onlyVegetarian) {
      result = result.filter((r) => r.recipe.isVegetarian);
    }

    // Filtrer pour n'avoir que les recettes faisables avec ce que j'ai en stock (Besoin 1)
    if (onlyDoableWithStock) {
      result = result.filter((r) => doableRecipesMap.get(r.recipe.id)?.isDoable);
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

    // Filtrage automatique des recettes contenant des allergènes personnels (lookup O(1) précalculé)
    if (isAllergenFilterEnabled && userAllergens.length > 0) {
      result = result.filter((r) => !recipesWithAllergensSet.has(r.recipe.id));
    }

    return {
      baseFilteredResults: result,
      isSearching: searching,
    };
  }, [
    recipes,
    debouncedSearchQuery,
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
    recipesWithAllergensSet,
    doableRecipesMap,
  ]);

  // Category counts synchronisés avec les filtres actifs (stock, recherche, diététique, etc.)
  const recipeCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    baseFilteredResults.forEach((r) => {
      counts[r.recipe.category] = (counts[r.recipe.category] || 0) + 1;
    });
    return counts;
  }, [baseFilteredResults]);

  // 2. Application du filtre de catégorie sélectionnée et tri final
  const filteredRecipes = useMemo(() => {
    let result = baseFilteredResults;

    // Catégories multiples (ex: Entrée + Plat)
    if (selectedCategories.length > 0) {
      result = result.filter((r) => selectedCategories.includes(r.recipe.category));
    }

    // Tri (copie superficielle pour ne pas altérer baseFilteredResults)
    const sorted = [...result];
    sorted.sort((a, b) => {
      // En cours de recherche textuelle, si le tri récent (défaut) est actif, privilégier la pertinence textuelle
      if (isSearching && sortBy === 'recent' && b.score !== a.score) {
        return b.score - a.score;
      }

      return compareRecipes(a.recipe, b.recipe, sortBy, doableRecipesMap);
    });

    return sorted.map((r) => r.recipe);
  }, [baseFilteredResults, selectedCategories, isSearching, sortBy, doableRecipesMap]);

  // Pagination (20 recettes par page pour une fluidité maximale)
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / RECIPES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecipes = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * RECIPES_PER_PAGE;
    return filteredRecipes.slice(startIndex, startIndex + RECIPES_PER_PAGE);
  }, [filteredRecipes, safeCurrentPage]);

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.max(1, Math.min(page, totalPages));
      if (target !== safeCurrentPage) {
        setCurrentPage(target);
        forceShowFilterBar();
        flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    },
    [totalPages, safeCurrentPage, forceShowFilterBar]
  );

  const handleNextPage = useCallback(() => {
    if (safeCurrentPage < totalPages) {
      goToPage(safeCurrentPage + 1);
    }
  }, [safeCurrentPage, totalPages, goToPage]);

  const handlePrevPage = useCallback(() => {
    if (safeCurrentPage > 1) {
      goToPage(safeCurrentPage - 1);
    }
  }, [safeCurrentPage, goToPage]);

  const handleFirstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const handleLastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSelectedCategories([]);
    setSelectedIngredients([]);
    setSelectedTags([]);
    setTagMatchMode('any');
    setTargetTotalTime(null);
    setTimeFilterMode('max');
    setSelectedDifficulties([]);
    setIngredientMatchMode('all');
    setMinRatingFilter(0);
    setOnlyVegetarian(defaultVegetarianFilter);
    setOnlyDoableWithStock(false);
    setCurrentPage(1);
    forceShowFilterBar();
  };

  // En-tête de la liste défilante : bandeau filtres actifs et résumé des résultats
  const listHeaderElement = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        {/* Bandeau filtres avancés actifs (Temps, Note, Difficulté, Ingrédients, Tags) */}
        {(targetTotalTime !== null ||
          selectedDifficulties.length > 0 ||
          selectedIngredients.length > 0 ||
          selectedTags.length > 0 ||
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
              {filteredRecipes.length > RECIPES_PER_PAGE && `\npage ${safeCurrentPage}/${totalPages}`}
            </Text>

            {debouncedSearchQuery.trim().length > 0 && (
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
      selectedIngredients,
      ingredientMatchMode,
      selectedTags,
      targetTotalTime,
      timeFilterMode,
      selectedDifficulties,
      minRatingFilter,
      filteredRecipes.length,
      isAllergenFilterEnabled,
      hiddenByAllergensCount,
      safeCurrentPage,
      totalPages,
      debouncedSearchQuery,
      colors,
      viewMode,
      handleChangeViewMode,
    ]
  );

  // Pied de liste avec navigation complète : début, précédente, sélection directe, suivante, fin
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
        {/* Résumé de pagination & bouton sélecteur de page */}
        <View style={styles.paginationInfoBox}>
          <Text style={styles.paginationCountText}>
            Recettes {(safeCurrentPage - 1) * RECIPES_PER_PAGE + 1} à{' '}
            {Math.min(safeCurrentPage * RECIPES_PER_PAGE, filteredRecipes.length)} sur{' '}
            {filteredRecipes.length}
          </Text>
          <TouchableOpacity
            style={styles.pagePill}
            onPress={() => setIsPageJumpModalVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Choisir une page"
          >
            <Text style={styles.pagePillText}>
              Page {safeCurrentPage} / {totalPages}
            </Text>
            <Ionicons name="swap-vertical" size={13} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Barre de numéros de pages scrollable pour accès direct immédiat */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pageNumbersScroll}
          contentContainerStyle={styles.pageNumbersContent}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const isCurrent = pageNum === safeCurrentPage;
            return (
              <TouchableOpacity
                key={pageNum}
                style={[
                  styles.pageNumberPill,
                  isCurrent && styles.pageNumberPillActive,
                ]}
                onPress={() => goToPage(pageNum)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pageNumberPillText,
                    isCurrent && styles.pageNumberPillTextActive,
                  ]}
                >
                  {pageNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Boutons d'action : Tout au début, Page précédente, Page suivante, Tout à la fin */}
        <View style={styles.paginationNavRow}>
          {/* Bouton première page (<<) */}
          <TouchableOpacity
            style={[styles.pageIconBtn, safeCurrentPage === 1 && styles.pageIconBtnDisabled]}
            onPress={handleFirstPage}
            disabled={safeCurrentPage === 1}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Première page"
          >
            <Ionicons
              name="play-skip-back-outline"
              size={18}
              color={safeCurrentPage === 1 ? colors.textMuted : colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Bouton page précédente (<) */}
          <TouchableOpacity
            style={[
              styles.pageBtn,
              styles.pageBtnPrev,
              safeCurrentPage === 1 && styles.pageBtnDisabled,
            ]}
            onPress={handlePrevPage}
            disabled={safeCurrentPage === 1}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Page précédente"
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={safeCurrentPage === 1 ? colors.textMuted : colors.textPrimary}
            />
            <Text
              style={[
                styles.pageBtnTextPrev,
                safeCurrentPage === 1 && { color: colors.textMuted },
              ]}
            >
              Précédente
            </Text>
          </TouchableOpacity>

          {/* Bouton page suivante (>) */}
          <TouchableOpacity
            style={[
              styles.pageBtn,
              styles.pageBtnNext,
              safeCurrentPage === totalPages && styles.pageBtnDisabled,
            ]}
            onPress={handleNextPage}
            disabled={safeCurrentPage === totalPages}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Page suivante"
          >
            <Text style={styles.pageBtnTextNext}>Suivante</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Bouton dernière page (>>) */}
          <TouchableOpacity
            style={[styles.pageIconBtn, safeCurrentPage === totalPages && styles.pageIconBtnDisabled]}
            onPress={handleLastPage}
            disabled={safeCurrentPage === totalPages}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Dernière page"
          >
            <Ionicons
              name="play-skip-forward-outline"
              size={18}
              color={safeCurrentPage === totalPages ? colors.textMuted : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    colors,
    filteredRecipes.length,
    totalPages,
    safeCurrentPage,
    goToPage,
    handleFirstPage,
    handlePrevPage,
    handleNextPage,
    handleLastPage,
  ]);

  // Rendu mémoïsé de chaque carte recette (accès direct O(1) sans allocations de tableaux ou recalculs)
  const renderRecipeItem = useCallback(
    ({ item }: { item: Recipe }) => {
      const isSelected = selectedRecipeIds.has(item.id);
      return (
        <RecipeCard
          recipe={item}
          viewMode={viewMode}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onPress={() => {
            if (isSelectionMode) {
              handleToggleSelectRecipe(item.id);
            } else {
              onSelectRecipe(item);
            }
          }}
          onLongPress={() => handleLongPressRecipe(item.id)}
          hasAllergen={recipesWithAllergensSet.has(item.id)}
          stockProgress={stockProgressMap.get(item.id)}
        />
      );
    },
    [
      onSelectRecipe,
      recipesWithAllergensSet,
      stockProgressMap,
      viewMode,
      isSelectionMode,
      selectedRecipeIds,
      handleToggleSelectRecipe,
      handleLongPressRecipe,
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
                contentFit="cover"
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
              if (!text.trim()) {
                setDebouncedSearchQuery('');
                setCurrentPage(1);
              }
              forceShowFilterBar();
            }}
            placeholder="Rechercher ingrédients, plats, synonymes..."
            onClear={() => {
              setSearchQuery('');
              setDebouncedSearchQuery('');
              setCurrentPage(1);
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
            extraData={`${themeId}_${viewMode}_${selectedRecipeIds.size}_${isSelectionMode}`}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            getItemType={() => viewMode}
            ListHeaderComponent={listHeaderElement}
            ListFooterComponent={listFooterElement}
            contentContainerStyle={[
              styles.listContent,
              viewMode === 'grid' ? styles.listContentGrid : undefined,
              {
                paddingTop: FILTER_BAR_HEIGHT + 6,
                paddingBottom: isSelectionMode ? 88 : 24,
              },
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
                  onAction={openFreshStockModal}
                />
              ) : selectedIngredients.length > 0 ? (
                <EmptyState
                  title="Aucune recette avec ces restes"
                  description={`Votre carnet ne contient pas de recette avec : ${selectedIngredients.join(', ')}.\nDemandez au Chef IA d'inventer une recette originale avec exactement ces ingrédients !`}
                  actionLabel="✨ Inventer avec le Chef IA"
                  onAction={openFreshStockModal}
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
                    : sortBy === 'stock'
                    ? 'Stock'
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
        {isAddMenuVisible && (
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
                    onScanRecipe('text');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.addMenuIconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.addMenuTextCol}>
                    <Text style={styles.addMenuOptionTitle}>Texte brut</Text>
                    <Text style={styles.addMenuOptionSubtitle}>
                      Coller des notes ou du texte
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

                {/* Choix 3 : Web */}
                <TouchableOpacity
                  style={styles.addMenuOption}
                  onPress={() => {
                    setIsAddMenuVisible(false);
                    onScanRecipe('url');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.addMenuIconBox, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="globe-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.addMenuTextCol}>
                    <Text style={styles.addMenuOptionTitle}>Web</Text>
                    <Text style={styles.addMenuOptionSubtitle}>
                      Marmiton, 750g, blogs...
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Choix 4 : Chef IA */}
                <TouchableOpacity
                  style={styles.addMenuOption}
                  onPress={() => {
                    setIsAddMenuVisible(false);
                    openFreshStockModal();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.addMenuIconBox, { backgroundColor: colors.secondaryLight }]}>
                    <Ionicons name="sparkles" size={22} color={colors.secondary} />
                  </View>
                  <View style={styles.addMenuTextCol}>
                    <Text style={styles.addMenuOptionTitle}>Chef IA</Text>
                    <Text style={styles.addMenuOptionSubtitle}>
                      3 idées de recettes
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Modal de Tri (labels concis et instinctifs) */}
        {isFilterModalVisible && (
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
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {[
                  { id: 'rating_desc', label: 'Note', icon: 'star' },
                  { id: 'stock', label: 'Ingrédients en stock', icon: 'restaurant-outline' },
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
        )}

        {/* Modal Filtres Avancés (Temps total, Note minimale, Difficulté, Ingrédients, Tags) */}
        {isAdvancedFiltersModalVisible && (
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
            searchQuery={debouncedSearchQuery}
          />
        )}

        {/* Modal Cuisiner avec mon stock & suggestions Chef IA */}
        <StockCookModal
          visible={isStockModalVisible}
          preserveSession={preserveStockSession}
          recipes={recipes}
          stockItems={stockItems}
          doableCount={doableCount}
          isDoableFilterActive={onlyDoableWithStock}
          onApplyDoableFilter={(active) => setOnlyDoableWithStock(active)}
          onRecipeGenerated={(recipe) => {
            setPreserveStockSession(true);
            setIsStockModalVisible(false);
            if (onImportRecipe) {
              onImportRecipe(recipe as Recipe, 'stock_ai');
            }
          }}
          onNavigateToStock={onNavigateToStock}
          onClose={() => {
            setPreserveStockSession(false);
            setIsStockModalVisible(false);
          }}
        />

        {/* Modal Aller à la page */}
        <PageJumpModal
          visible={isPageJumpModalVisible}
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalRecipes={filteredRecipes.length}
          onSelectPage={goToPage}
          onClose={() => setIsPageJumpModalVisible(false)}
        />

        {/* Barre flottante d'actions de sélection multiple */}
        <FloatingSelectionBar
          selectedCount={selectedRecipeIds.size}
          onClearSelection={handleClearSelection}
          onAssignToFolder={() => setIsFolderAssignmentOpen(true)}
          onRemoveFromFolder={
            activeFolderId && activeFolderId !== 'UNCATEGORIZED'
              ? handleRemoveSelectedFromFolder
              : undefined
          }
          activeFolderId={activeFolderId}
          bottomInset={0}
        />

        {/* Bottom Sheet de rangement dans les dossiers */}
        <FolderAssignmentBottomSheet
          visible={isFolderAssignmentOpen}
          recipeIds={Array.from(selectedRecipeIds)}
          onClose={() => setIsFolderAssignmentOpen(false)}
          onSuccess={(_msg) => {
            setSelectedRecipeIds(new Set());
          }}
        />
      </View>
    </SafeAreaView>
  );
};

HomeScreenComponent.displayName = 'HomeScreen';
export const HomeScreen = React.memo(HomeScreenComponent);

