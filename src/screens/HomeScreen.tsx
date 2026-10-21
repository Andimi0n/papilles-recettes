import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Platform,
  Image,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category, SortOption } from '../types/recipe';
import { MealLogEntry } from '../types/mealLog';
import { MealTime } from '../types/planner';
import { StorageService } from '../services/storageService';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { RecipeCard } from '../components/RecipeCard';
import { StarRating } from '../components/StarRating';
import { SearchBar } from '../components/SearchBar';
import { CategoryPills } from '../components/CategoryPills';
import { EmptyState } from '../components/EmptyState';
import { FridgeSearchModal } from '../components/FridgeSearchModal';
import { ImportMarmitonModal } from '../components/ImportMarmitonModal';
import { TodayMealWidget } from '../components/TodayMealWidget';
import { QuickMealLogModal } from '../components/QuickMealLogModal';
import { normalizeString, getLocalDateString } from '../utils/helpers';
import { searchRecipes, RecipeSearchResult } from '../utils/searchEngine';

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
}) => {
  const { isDark, colors, themeId } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const flatListRef = useRef<FlatList<Recipe>>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [isFridgeModalVisible, setIsFridgeModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [isMarmitonModalVisible, setIsMarmitonModalVisible] = useState(false);
  const [isAiChoiceModalVisible, setIsAiChoiceModalVisible] = useState(false);

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

  useEffect(() => {
    loadTodayMeals();
  }, [loadTodayMeals]);

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

    // Catégories multiples (ex: Entrée + Plat)
    if (selectedCategories.length > 0 && !selectedCategories.includes('Tous')) {
      result = result.filter((r) => selectedCategories.includes(r.recipe.category));
    }

    // Note minimum (3+, 3.5+, 4+, 4.5+)
    if (minRatingFilter > 0) {
      result = result.filter((r) => r.recipe.rating >= minRatingFilter);
    }

    // Recherche par ingrédients sélectionnés (Le Frigo)
    if (selectedIngredients.length > 0) {
      const normSelected = selectedIngredients.map(normalizeString);
      result = result.filter((r) =>
        r.recipe.ingredients.some((ing) => {
          const normIng = normalizeString(ing.name);
          return normSelected.some((sel) => normIng.includes(sel) || sel.includes(normIng));
        })
      );
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
  }, [recipes, searchQuery, selectedCategories, selectedIngredients, minRatingFilter, onlyVegetarian, sortBy]);

  // Réinitialiser la page courante à 1 dès qu'un critère de recherche ou filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedIngredients, sortBy, minRatingFilter, onlyVegetarian]);

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

  // Helper pour trouver les ingrédients matchés pour chaque recette (recherche + frigo)
  const getMatchedIngredientsForRecipe = (recipe: Recipe): string[] => {
    const fromSearch = matchedIngredientsMap[recipe.id] || [];
    if (selectedIngredients.length === 0) return fromSearch;

    const normSelected = selectedIngredients.map(normalizeString);
    const fromFridge = recipe.ingredients
      .filter((ing) => {
        const norm = normalizeString(ing.name);
        return normSelected.some((sel) => norm.includes(sel) || sel.includes(norm));
      })
      .map((i) => i.name);

    const combined = new Set([...fromSearch, ...fromFridge]);
    return Array.from(combined);
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedIngredients([]);
    setMinRatingFilter(0);
    setOnlyVegetarian(false);
    setCurrentPage(1);
    forceShowFilterBar();
  };

  // En-tête de la liste défilante : "Ce que j'ai mangé aujourd'hui" (scrollable avec la liste), bandeau frigo et résumé des résultats
  const listHeaderElement = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        {/* Widget Suivi des Repas du Jour (défile avec les cartes de recettes) */}
        <TodayMealWidget
          todayLunch={todayMeals.lunch}
          todayDinner={todayMeals.dinner}
          onPressSlot={handleOpenMealSlot}
          onNavigateToJournal={onNavigateToJournal}
        />

        {/* Bandeau filtre Ingrédients / Frigo actif */}
        {selectedIngredients.length > 0 && (
          <View style={styles.fridgeActiveBanner}>
            <View style={styles.fridgeActiveLeft}>
              <Ionicons name="nutrition" size={16} color={colors.secondary} />
              <Text style={styles.fridgeActiveText} numberOfLines={1}>
                Dans votre frigo : {selectedIngredients.join(', ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedIngredients([])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Résumé des résultats & indicateur recherche intelligente */}
        <View style={styles.resultsCountRow}>
          <Text style={styles.resultsCountText}>
            {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
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
      filteredRecipes.length,
      safeCurrentPage,
      totalPages,
      searchQuery,
      colors,
      onNavigateToJournal,
    ]
  );

  // Pied de liste avec bouton Page suivante / précédente
  const listFooterElement = useMemo(() => {
    if (filteredRecipes.length === 0) return null;

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
      />
    ),
    [onSelectRecipe, onQuickRate, matchedIngredientsMap, selectedIngredients]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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

            {/* Actions rapides empilées à la verticale */}
            <View style={styles.topActionsCol}>
              {/* Marmiton */}
              <TouchableOpacity
                style={styles.marmitonBtn}
                onPress={() => setIsMarmitonModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="globe-outline" size={12} color={colors.primary} />
                <Text style={styles.marmitonBtnText}>Marmiton</Text>
              </TouchableOpacity>

              {/* Scan & IA */}
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setIsAiChoiceModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={styles.scanBtnText}>Scan & IA</Text>
              </TouchableOpacity>

              {/* Ajouter */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={onAddNewRecipe}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={15} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barre de Recherche & Bouton Frigo */}
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
            onOpenFridgeSearch={() => setIsFridgeModalVisible(true)}
            activeIngredientsCount={selectedIngredients.length}
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
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={false}
            renderItem={renderRecipeItem}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              selectedIngredients.length > 0 ? (
                <EmptyState
                  title="Aucune recette avec ces restes"
                  description={`Votre carnet ne contient pas de recette avec : ${selectedIngredients.join(', ')}.\nDemandez au Chef IA d'inventer une recette originale avec exactement ces ingrédients !`}
                  actionLabel="✨ Inventer avec le Chef IA"
                  onAction={() => setIsFridgeModalVisible(true)}
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

            {/* Bandeau 2 : Filtres secondaires (Végé, Note interactive 5 étoiles, Tri, Reset) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterToolbarScroll}
            >
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

              {/* Bouton Filtre Note (ouvre la modale pour choisir la note minimale) */}
              <TouchableOpacity
                style={[styles.toolPill, minRatingFilter > 0 && styles.ratingToolPillActive]}
                onPress={() => setIsRatingModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={minRatingFilter > 0 ? 'star' : 'star-outline'}
                  size={13}
                  color={minRatingFilter > 0 ? colors.amber : colors.textSecondary}
                />
                <Text style={[styles.toolPillText, minRatingFilter > 0 && styles.ratingToolPillTextActive]}>
                  {minRatingFilter > 0
                    ? `≥ ${minRatingFilter % 1 === 0 ? minRatingFilter : minRatingFilter.toFixed(1)} ★`
                    : 'Note'}
                </Text>
                {minRatingFilter > 0 ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setMinRatingFilter(0);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel="Effacer le filtre de note"
                  >
                    <Ionicons name="close-circle" size={13} color={colors.amber} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              {/* Modal de Tri (labels courts et instinctifs) */}
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

              {/* Bouton Effacer les filtres si au moins un filtre est actif */}
              {(minRatingFilter > 0 ||
                onlyVegetarian ||
                (selectedCategories.length > 0 && !selectedCategories.includes('Tous'))) && (
                <TouchableOpacity
                  style={styles.resetFilterPill}
                  onPress={handleResetAllFilters}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={13} color={colors.textSecondary} />
                  <Text style={styles.resetFilterPillText}>Effacer filtres</Text>
                </TouchableOpacity>
              )}
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

        {/* Modal Choix de la Note minimale (style harmonisé avec la modale de Tri) */}
        <Modal
          visible={isRatingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsRatingModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sortModalBox}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleWithIcon}>
                  <Ionicons name="star" size={20} color={colors.amber} />
                  <Text style={styles.sortModalTitle}>Filtrer par note</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsRatingModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Sélecteur d'étoiles interactif au centre avec feedback numérique */}
              <View style={styles.ratingModalInteractiveBox}>
                <StarRating
                  rating={minRatingFilter}
                  size={28}
                  interactive={true}
                  onRatingChange={(newVal) => setMinRatingFilter(newVal)}
                  showScore={false}
                  showClear={false}
                />
                <Text style={styles.ratingModalScoreText}>
                  {minRatingFilter > 0
                    ? `≥ ${minRatingFilter % 1 === 0 ? minRatingFilter : minRatingFilter.toFixed(1)} étoiles`
                    : 'Toutes les notes (aucun filtre)'}
                </Text>
              </View>

              {/* Options rapides pré-définies */}
              {[
                { value: 0, label: 'Toutes les notes' },
                { value: 4.5, label: '4,5 étoiles et plus' },
                { value: 4.0, label: '4,0 étoiles et plus' },
                { value: 3.5, label: '3,5 étoiles et plus' },
                { value: 3.0, label: '3,0 étoiles et plus' },
              ].map((option) => {
                const isSelected = minRatingFilter === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOptionRow,
                      isSelected && styles.sortOptionSelected,
                    ]}
                    onPress={() => {
                      setMinRatingFilter(option.value);
                      setIsRatingModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sortOptionLeft}>
                      {option.value > 0 ? (
                        <StarRating
                          rating={option.value}
                          size={14}
                          interactive={false}
                          showScore={false}
                          showClear={false}
                        />
                      ) : (
                        <Ionicons
                          name="apps-outline"
                          size={16}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      )}
                      <Text
                        style={[
                          styles.sortOptionText,
                          isSelected && styles.sortOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.closeSortModalBtn}
                onPress={() => setIsRatingModalVisible(false)}
              >
                <Text style={styles.closeSortModalText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Frigo / Recherche par Ingrédients */}
        <FridgeSearchModal
          visible={isFridgeModalVisible}
          recipes={recipes}
          selectedIngredients={selectedIngredients}
          onApply={(ingredients) => setSelectedIngredients(ingredients)}
          onGenerateRecipe={(recipe) => {
            setIsFridgeModalVisible(false);
            if (onImportRecipe) {
              onImportRecipe(recipe as Recipe);
            }
          }}
          onClose={() => setIsFridgeModalVisible(false)}
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

        {/* Modal Choix Assistant IA (Scan Photo ou Coller Texte) */}
        <Modal
          visible={isAiChoiceModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsAiChoiceModalVisible(false)}
        >
          <View style={styles.aiModalBackdrop}>
            <View style={styles.aiModalBox}>
              <View style={styles.aiModalHeader}>
                <View style={styles.aiModalTitleRow}>
                  <Ionicons name="sparkles" size={20} color={Colors.primary} />
                  <Text style={styles.aiModalTitle}>Ajouter avec l'IA</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAiChoiceModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.aiModalSubtitle}>
                Choisissez votre méthode d'importation assistée par IA :
              </Text>

              {/* Option 1: Scanner une photo */}
              <TouchableOpacity
                style={styles.aiOptionCard}
                onPress={() => {
                  setIsAiChoiceModalVisible(false);
                  onScanRecipe('photo');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.aiOptionIconCircle, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                </View>
                <View style={styles.aiOptionContent}>
                  <View style={styles.aiOptionTitleRow}>
                    <Text style={styles.aiOptionTitle}>Scanner une photo</Text>
                    <View style={styles.aiOptionTag}>
                      <Text style={styles.aiOptionTagText}>Photo</Text>
                    </View>
                  </View>
                  <Text style={styles.aiOptionDescription}>
                    Photographiez un livre de cuisine, une fiche repas ou vos carnets manuscrits.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Option 2: Coller du texte brut */}
              <TouchableOpacity
                style={styles.aiOptionCard}
                onPress={() => {
                  setIsAiChoiceModalVisible(false);
                  onScanRecipe('text');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.aiOptionIconCircle, { backgroundColor: Colors.secondaryLight }]}>
                  <Ionicons name="document-text" size={24} color={Colors.secondary} />
                </View>
                <View style={styles.aiOptionContent}>
                  <View style={styles.aiOptionTitleRow}>
                    <Text style={styles.aiOptionTitle}>Coller du texte brut</Text>
                    <View style={[styles.aiOptionTag, { backgroundColor: Colors.secondaryLight }]}>
                      <Text style={[styles.aiOptionTagText, { color: Colors.secondary }]}>Autocomplétion</Text>
                    </View>
                  </View>
                  <Text style={styles.aiOptionDescription}>
                    Collez des notes, un message WhatsApp ou une recette brute. L'IA déduit et complète les portions, temps et étapes.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aiModalCloseBtn}
                onPress={() => setIsAiChoiceModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.aiModalCloseBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  ratingToolPillActive: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber + '60',
  },
  ratingToolPillTextActive: {
    color: colors.amber,
    fontWeight: '700',
  },
  ratingModalInteractiveBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ratingModalScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
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
