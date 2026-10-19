import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category, SortOption } from '../types/recipe';
import { Colors, Shadows } from '../theme/colors';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { CategoryPills } from '../components/CategoryPills';
import { EmptyState } from '../components/EmptyState';
import { FridgeSearchModal } from '../components/FridgeSearchModal';
import { ImportMarmitonModal } from '../components/ImportMarmitonModal';
import { normalizeString } from '../utils/helpers';
import { searchRecipes, RecipeSearchResult } from '../utils/searchEngine';

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
  onScanRecipe: () => void;
  onImportRecipe?: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onQuickRate: (id: string, rating: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recipes,
  onSelectRecipe,
  onAddNewRecipe,
  onScanRecipe,
  onImportRecipe,
  onToggleFavorite,
  onQuickRate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('rating_desc');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyVegetarian, setOnlyVegetarian] = useState(false);
  const [isFridgeModalVisible, setIsFridgeModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isMarmitonModalVisible, setIsMarmitonModalVisible] = useState(false);

  // Category counts
  const recipeCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { Tous: recipes.length };
    recipes.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return counts;
  }, [recipes]);

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

    // Favoris uniquement
    if (onlyFavorites) {
      result = result.filter((r) => r.recipe.isFavorite);
    }

    // Végétarien uniquement
    if (onlyVegetarian) {
      result = result.filter((r) => r.recipe.isVegetarian);
    }

    // Catégorie
    if (selectedCategory !== 'Tous') {
      result = result.filter((r) => r.recipe.category === selectedCategory);
    }

    // Note minimum
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
  }, [recipes, searchQuery, selectedCategory, selectedIngredients, minRatingFilter, onlyFavorites, onlyVegetarian, sortBy]);

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
    setSelectedCategory('Tous');
    setSelectedIngredients([]);
    setMinRatingFilter(0);
    setOnlyFavorites(false);
    setOnlyVegetarian(false);
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

        {/* Catégories Pills */}
        <CategoryPills
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          recipeCountByCategory={recipeCountByCategory}
        />

        {/* Barre d'outils secondaire : Tri, Filtre note, Favoris */}
        <View style={styles.filterToolbar}>
          {/* Favoris Toggle Pill */}
          <TouchableOpacity
            style={[styles.toolPill, onlyFavorites && styles.toolPillActive]}
            onPress={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Ionicons
              name={onlyFavorites ? 'heart' : 'heart-outline'}
              size={14}
              color={onlyFavorites ? Colors.heart : Colors.textSecondary}
            />
            <Text style={[styles.toolPillText, onlyFavorites && styles.toolPillTextActive]}>
              Favoris
            </Text>
          </TouchableOpacity>

          {/* Végétarien Toggle Pill */}
          <TouchableOpacity
            style={[styles.toolPill, onlyVegetarian && styles.vegeToolPillActive]}
            onPress={() => setOnlyVegetarian(!onlyVegetarian)}
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

          {/* Note minimale (ex: 4★ et +) */}
          <TouchableOpacity
            style={[styles.toolPill, minRatingFilter > 0 && styles.toolPillActive]}
            onPress={() => setMinRatingFilter(minRatingFilter === 4 ? 0 : 4)}
          >
            <Ionicons
              name="star"
              size={14}
              color={minRatingFilter > 0 ? Colors.amber : Colors.textSecondary}
            />
            <Text style={[styles.toolPillText, minRatingFilter > 0 && styles.toolPillTextActive]}>
              {minRatingFilter > 0 ? '4★ et +' : 'Toutes notes'}
            </Text>
          </TouchableOpacity>

          {/* Modal de Tri */}
          <TouchableOpacity
            style={[styles.toolPill, styles.sortToolPill]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Ionicons name="swap-vertical" size={14} color={Colors.textSecondary} />
            <Text style={styles.toolPillText}>
              {sortBy === 'rating_desc'
                ? 'Mieux notées'
                : sortBy === 'prep_time'
                ? 'Plus rapides'
                : sortBy === 'title'
                ? 'A-Z'
                : 'Récentes'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Résumé des résultats & indicateur recherche intelligente */}
        <View style={styles.resultsCountRow}>
          <Text style={styles.resultsCountText}>
            {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
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
      selectedCategory,
      recipeCountByCategory,
      onlyFavorites,
      onlyVegetarian,
      minRatingFilter,
      sortBy,
      filteredRecipes.length,
      searchQuery,
    ]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* En-tête supérieur FIXE (reste en haut lors du défilement, NE perd jamais le focus pendant la frappe) */}
        <View style={styles.fixedTopHeader}>
          {/* Top Brand Bar */}
          <View style={styles.topBrandRow}>
            <View>
              <View style={styles.logoRow}>
                <Text style={styles.logoTitle}>Papilles</Text>
                <View style={styles.chefHatBadge}>
                  <Ionicons name="restaurant" size={13} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.logoSubtitle}>Votre carnet de cuisine inspiré</Text>
            </View>

            <View style={styles.topActionsRow}>
              <TouchableOpacity
                style={styles.marmitonTopBtn}
                onPress={() => setIsMarmitonModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="globe-outline" size={15} color={Colors.primary} />
                <Text style={styles.marmitonTopBtnText}>Marmiton</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanTopBtn}
                onPress={onScanRecipe}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={15} color={Colors.primary} />
                <Text style={styles.scanTopBtnText}>Scanner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addTopBtn}
                onPress={onAddNewRecipe}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
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

        {/* Liste des recettes avec filtres déroulants */}
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeaderElement}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => onSelectRecipe(item)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onQuickRate={(rating) => onQuickRate(item.id, rating)}
              highlightedIngredients={getMatchedIngredientsForRecipe(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="Aucune recette trouvée"
              description="Essayez de modifier vos critères de recherche ou ajoutez votre propre recette !"
              actionLabel="Réinitialiser les filtres"
              onAction={handleResetAllFilters}
            />
          }
        />

        {/* Modal de Tri */}
        <Modal
          visible={isFilterModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsFilterModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sortModalBox}>
              <Text style={styles.sortModalTitle}>Trier les recettes</Text>

              {[
                { id: 'rating_desc', label: '⭐ Les mieux notées en premier' },
                { id: 'prep_time', label: '⏱️ Les plus rapides à préparer' },
                { id: 'recent', label: '🆕 Les plus récemment ajoutées' },
                { id: 'title', label: '🔤 Ordre alphabétique (A-Z)' },
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
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.id && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
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

        {/* Modal Frigo / Recherche par Ingrédients */}
        <FridgeSearchModal
          visible={isFridgeModalVisible}
          recipes={recipes}
          selectedIngredients={selectedIngredients}
          onApply={(ingredients) => setSelectedIngredients(ingredients)}
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  fixedTopHeader: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '60',
    paddingBottom: 4,
    zIndex: 10,
  },
  listContent: {
    paddingBottom: 40,
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marmitonTopBtn: {
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  marmitonTopBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  scanTopBtn: {
    backgroundColor: Colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  scanTopBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  addTopBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
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
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
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
  sortModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
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
});
