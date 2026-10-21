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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category, SortOption } from '../types/recipe';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { RecipeCard } from '../components/RecipeCard';
import { StarRating } from '../components/StarRating';
import { SearchBar } from '../components/SearchBar';
import { CategoryPills } from '../components/CategoryPills';
import { EmptyState } from '../components/EmptyState';
import { FridgeSearchModal } from '../components/FridgeSearchModal';
import { ImportMarmitonModal } from '../components/ImportMarmitonModal';
import { normalizeString } from '../utils/helpers';
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recipes,
  onSelectRecipe,
  onAddNewRecipe,
  onScanRecipe,
  onImportRecipe,
  onQuickRate,
  onOpenSettings,
}) => {
  const { isDark, toggleTheme } = useTheme();
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
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) {
      setCurrentPage((prev) => prev - 1);
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
  };

  // En-tête de la liste (filtres, catégories, résultats) - mémorisé pour éviter tout re-render intempestif
  const listHeaderElement = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        {/* Bandeau filtre Ingrédients / Frigo actif */}
        {selectedIngredients.length > 0 && (
          <View style={styles.fridgeActiveBanner}>
            <View style={styles.fridgeActiveLeft}>
              <Ionicons name="nutrition" size={16} color={Colors.secondary} />
              <Text style={styles.fridgeActiveText} numberOfLines={1}>
                Dans votre frigo : {selectedIngredients.join(', ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedIngredients([])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Catégories Pills (Multi-sélection activable / désactivable en 1 tap) */}
        <CategoryPills
          categories={CATEGORIES}
          selectedCategories={selectedCategories}
          onToggleCategory={handleToggleCategory}
          recipeCountByCategory={recipeCountByCategory}
        />

        {/* Barre d'outils secondaire scrollable horizontalement (Végé, Note, Tri, Reset) */}
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
              color={onlyVegetarian ? '#15803D' : Colors.textSecondary}
            />
            <Text style={[styles.toolPillText, onlyVegetarian && styles.vegeToolPillTextActive]}>
              Végé
            </Text>
          </TouchableOpacity>

          {/* Filtre Note minimale (0.5★+, 1★+, 2★+, etc.) */}
          <TouchableOpacity
            style={[styles.toolPill, minRatingFilter > 0 && styles.toolPillActive]}
            onPress={() => setIsRatingModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={minRatingFilter > 0 ? 'star' : 'star-outline'}
              size={13}
              color={minRatingFilter > 0 ? Colors.amber : Colors.textSecondary}
            />
            <Text style={[styles.toolPillText, minRatingFilter > 0 && styles.toolPillTextActive]}>
              {minRatingFilter > 0
                ? minRatingFilter === 0.5
                  ? 'Notées (0.5★+)'
                  : `${minRatingFilter}★ et +`
                : 'Toutes notes'}
            </Text>
            {minRatingFilter > 0 ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setMinRatingFilter(0);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.pillClearBtn}
                accessibilityLabel="Réinitialiser le filtre de note"
              >
                <Ionicons name="close-circle" size={13} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <Ionicons
                name="chevron-down"
                size={11}
                color={Colors.textMuted}
              />
            )}
          </TouchableOpacity>

          {/* Modal de Tri (labels courts et instinctifs) */}
          <TouchableOpacity
            style={[styles.toolPill, styles.sortToolPill]}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={13} color={Colors.textSecondary} />
            <Text style={styles.toolPillText}>
              Tri : {sortBy === 'rating_desc'
                ? 'Note'
                : sortBy === 'prep_time'
                ? 'Temps'
                : sortBy === 'title'
                ? 'A-Z'
                : 'Date'}
            </Text>
            <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
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
              <Ionicons name="close-circle" size={13} color={Colors.textSecondary} />
              <Text style={styles.resetFilterPillText}>Effacer filtres</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Résumé des résultats & indicateur recherche intelligente */}
        <View style={styles.resultsCountRow}>
          <Text style={styles.resultsCountText}>
            {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
            {filteredRecipes.length > RECIPES_PER_PAGE && ` • Page ${safeCurrentPage}/${totalPages}`}
          </Text>

          {searchQuery.trim().length > 0 && (
            <View style={styles.smartBadge}>
              <Ionicons name="sparkles" size={12} color={Colors.primary} />
              <Text style={styles.smartBadgeText}>Recherche intelligente</Text>
            </View>
          )}
        </View>
      </View>
    ),
    [
      selectedIngredients,
      selectedCategories,
      recipeCountByCategory,
      onlyVegetarian,
      minRatingFilter,
      sortBy,
      filteredRecipes.length,
      searchQuery,
      safeCurrentPage,
      totalPages,
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
  }, [filteredRecipes.length, totalPages, safeCurrentPage]);

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
          {/* Top Brand Bar avec Marmiton et Scan & IA empilés pour ne jamais être tronqués */}
          <View style={styles.topBrandRow}>
            <View style={styles.brandTitleCol}>
              <View style={styles.logoRow}>
                <Text style={styles.logoTitle}>Papilles</Text>
                <View style={styles.chefHatBadge}>
                  <Ionicons name="restaurant" size={13} color={Colors.primary} />
                </View>

                {/* Bouton discret bascule Thème (Jardin Botanique / Table Nocturne) */}
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={toggleTheme}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  accessibilityLabel="Changer de thème"
                >
                  <Ionicons
                    name={isDark ? 'sunny' : 'moon'}
                    size={15}
                    color={isDark ? Colors.amber : Colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Bouton discret Paramètres */}
                {onOpenSettings && (
                  <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={onOpenSettings}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel="Ouvrir les paramètres"
                  >
                    <Ionicons name="settings-outline" size={15} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.logoSubtitle}>Votre carnet de cuisine inspiré</Text>
            </View>

            <View style={styles.topActionsRow}>
              {/* Colonne empilée : Marmiton en haut, Scan & IA en dessous */}
              <View style={styles.stackedButtonsCol}>
                <TouchableOpacity
                  style={styles.marmitonTopBtn}
                  onPress={() => setIsMarmitonModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="globe-outline" size={12} color={Colors.primary} />
                  <Text style={styles.marmitonTopBtnText}>Marmiton</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scanTopBtn}
                  onPress={() => setIsAiChoiceModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={12} color={Colors.primary} />
                  <Text style={styles.scanTopBtnText}>Scan & IA</Text>
                </TouchableOpacity>
              </View>

              {/* Bouton Ajouter sur toute la hauteur */}
              <TouchableOpacity
                style={styles.addTopBtn}
                onPress={onAddNewRecipe}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addTopBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barre de Recherche & Bouton Frigo */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher ingrédients, plats, synonymes..."
            onClear={() => setSearchQuery('')}
            onOpenFridgeSearch={() => setIsFridgeModalVisible(true)}
            activeIngredientsCount={selectedIngredients.length}
          />
        </View>

        {/* Liste des recettes avec pagination (20 par page) et virtualisation haute performance */}
        <FlatList
          ref={flatListRef}
          data={paginatedRecipes}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeaderElement}
          ListFooterComponent={listFooterElement}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          renderItem={renderRecipeItem}
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
                      color={sortBy === option.id ? Colors.primary : Colors.textSecondary}
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
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
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

        {/* Modal Filtre par Note minimale */}
        <Modal
          visible={isRatingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsRatingModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sortModalBox}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sortModalTitle}>Filtrer par note</Text>
                  <Text style={styles.ratingModalSubtitle}>
                    {minRatingFilter > 0
                      ? minRatingFilter === 0.5
                        ? 'Afficher les recettes notées (au moins 0.5★)'
                        : `Recettes avec au moins ${minRatingFilter}★`
                      : 'Toutes les recettes (sans filtre)'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsRatingModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Sélecteur d'étoiles interactif direct */}
              <View style={styles.ratingFilterInteractiveCard}>
                <Text style={styles.ratingFilterInteractiveTitle}>
                  Touchez les étoiles pour choisir la note minimale :
                </Text>
                <View style={styles.ratingFilterStarsContainer}>
                  <StarRating
                    rating={minRatingFilter}
                    size={32}
                    interactive={true}
                    showScore={true}
                    showClear={minRatingFilter > 0}
                    onRatingChange={(newVal) => setMinRatingFilter(newVal)}
                  />
                </View>
                <Text style={styles.ratingFilterInteractiveHint}>
                  Astuce : touchez la gauche d'une étoile pour 0.5★ ou tapotez 2 fois.
                </Text>
              </View>

              {/* Options prédéfinies rapides */}
              <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                {[
                  { min: 0, label: 'Toutes les notes', subtitle: 'Tout afficher, y compris non notées', icon: 'star-outline' },
                  { min: 0.5, label: 'Notées uniquement (0.5★ et +)', subtitle: 'Toutes les recettes avec avis (remplace les favoris)', icon: 'star-half' },
                  { min: 1, label: '1★ et +', icon: 'star' },
                  { min: 2, label: '2★ et +', icon: 'star' },
                  { min: 3, label: '3★ et +', subtitle: 'Bonnes recettes', icon: 'star' },
                  { min: 3.5, label: '3.5★ et +', subtitle: 'Très bonnes recettes', icon: 'star-half' },
                  { min: 4, label: '4★ et +', subtitle: 'Excellentes recettes', icon: 'star' },
                  { min: 4.5, label: '4.5★ et +', subtitle: 'Recettes remarquables', icon: 'star' },
                  { min: 5, label: '5★ (Coups de cœur)', subtitle: 'La perfection culinaire', icon: 'star' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.min}
                    style={[
                      styles.sortOptionRow,
                      minRatingFilter === opt.min && styles.sortOptionSelected,
                    ]}
                    onPress={() => {
                      setMinRatingFilter(opt.min);
                      setIsRatingModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sortOptionLeft}>
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={minRatingFilter === opt.min ? Colors.amber : Colors.textSecondary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sortOptionText,
                            minRatingFilter === opt.min && styles.sortOptionTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text style={styles.ratingOptionSubtitle}>{opt.subtitle}</Text>
                        ) : null}
                      </View>
                    </View>
                    {minRatingFilter === opt.min && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.ratingModalActions}>
                {minRatingFilter > 0 ? (
                  <TouchableOpacity
                    style={styles.ratingResetBtn}
                    onPress={() => {
                      setMinRatingFilter(0);
                      setIsRatingModalVisible(false);
                    }}
                  >
                    <Text style={styles.ratingResetBtnText}>Réinitialiser</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.ratingApplyBtn, minRatingFilter === 0 && { width: '100%' }]}
                  onPress={() => setIsRatingModalVisible(false)}
                >
                  <Text style={styles.ratingApplyBtnText}>Fermer</Text>
                </TouchableOpacity>
              </View>
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
      </View>
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  headerIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  fixedTopHeader: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
    paddingBottom: 4,
    zIndex: 10,
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
    paddingTop: 10,
    paddingBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  chefHatBadge: {
    backgroundColor: Colors.primaryLight,
    padding: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  logoSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  brandTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stackedButtonsCol: {
    flexDirection: 'column',
    gap: 4,
  },
  marmitonTopBtn: {
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  marmitonTopBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  scanTopBtn: {
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  scanTopBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  addTopBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 52,
    gap: 4,
    ...Shadows.small,
  },
  addTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  toolPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  vegeToolPillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toolPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toolPillTextActive: {
    color: Colors.primary,
  },
  vegeToolPillTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  sortToolPill: {
    marginLeft: 'auto',
  },
  resetFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  resetFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Shadows.large,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.primaryLight,
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  closeSortModalBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  closeSortModalText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  ratingModalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingFilterInteractiveCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  ratingFilterInteractiveTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ratingFilterStarsContainer: {
    paddingVertical: 4,
  },
  ratingFilterInteractiveHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ratingOptionSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  ratingModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  ratingResetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  ratingResetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  ratingApplyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  ratingApplyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillClearBtn: {
    marginLeft: 4,
    padding: 2,
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
