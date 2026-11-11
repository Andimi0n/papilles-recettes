import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category } from '../../types/recipe';
import { DayOfWeek, MealTime, PlannedMeal } from '../../types/planner';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { normalizeString } from '../../utils/helpers';

export interface RecipePickerModalProps {
  visible: boolean;
  recipes: Recipe[];
  onClose: () => void;

  // En-tête personnalisé (dossiers ou usage générique)
  title?: string;
  subtitle?: string;

  // Créneau planning (planning des repas)
  day?: DayOfWeek | string | null;
  mealTime?: MealTime | null;
  isPassed?: boolean;
  currentMeal?: PlannedMeal;

  // Callbacks
  onSelectRecipe: (recipe: Recipe, servings: number) => void;
  onSelectCustomMeal?: (title: string, servings: number) => void;
  onRemoveMeal?: () => void;

  // Options d'affichage et de comportement
  showServings?: boolean;
  closeOnSelect?: boolean;
  alreadyAddedRecipeIds?: string[] | Set<string>;
}

const CATEGORIES: Category[] = ['Tous', 'Plat', 'Entrée', 'Dessert', 'Apéritif'];

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  visible,
  recipes,
  onClose,
  title,
  subtitle,
  day,
  mealTime,
  isPassed = false,
  currentMeal,
  onSelectRecipe,
  onSelectCustomMeal,
  onRemoveMeal,
  showServings,
  closeOnSelect = true,
  alreadyAddedRecipeIds,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'recipes' | 'custom'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
  const [customTitle, setCustomTitle] = useState('');
  const [servings, setServings] = useState<number>(currentMeal?.servings || 4);

  // Synchronise les portions et le formulaire dès l'ouverture du modal pendant le render
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible && !prevVisible) {
    setPrevVisible(true);
    setServings(currentMeal?.servings || 4);
    setCustomTitle(currentMeal?.customNote || '');
    setSearchQuery('');
    setSelectedCategory('Tous');
    setActiveTab('recipes');
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  const alreadyAddedSet = useMemo(() => {
    if (!alreadyAddedRecipeIds) return null;
    return alreadyAddedRecipeIds instanceof Set
      ? alreadyAddedRecipeIds
      : new Set(alreadyAddedRecipeIds);
  }, [alreadyAddedRecipeIds]);

  const filteredRecipes = useMemo(() => {
    const query = normalizeString(searchQuery);
    return recipes.filter((r) => {
      if (selectedCategory !== 'Tous' && r.category !== selectedCategory) {
        return false;
      }
      if (query) {
        const titleMatch = normalizeString(r.title).includes(query);
        const ingMatch = r.ingredients.some((i) =>
          normalizeString(i.name).includes(query)
        );
        return titleMatch || ingMatch;
      }
      return true;
    });
  }, [recipes, searchQuery, selectedCategory]);

  const handleCustomSubmit = () => {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    onSelectCustomMeal?.(trimmed, servings);
    onClose();
  };

  const dayLabel = day || 'Jour';
  const timeLabel = mealTime === 'lunch' ? 'Midi ☀️' : 'Soir 🌙';

  const headerTitle =
    title ?? (day || mealTime ? `${dayLabel} • ${timeLabel}` : 'Choisir une recette');
  const headerSubtitle =
    subtitle !== undefined
      ? subtitle
      : isPassed
      ? 'Créneau déjà passé • Choix forcé'
      : currentMeal
      ? 'Modifier le plat prévu'
      : 'Choisir un plat';

  const shouldShowServings =
    showServings ?? Boolean(day || mealTime || currentMeal || onSelectCustomMeal);
  const hasCustomTab = Boolean(onSelectCustomMeal);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Barre supérieure de fermeture */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {Boolean(headerSubtitle) && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {headerSubtitle}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stepper de portions pour ce créneau (si activé) */}
        {shouldShowServings && (
          <View style={styles.servingsBar}>
            <Text style={styles.servingsBarLabel}>Nombre de convives pour ce repas :</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Diminuer le nombre de convives"
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.stepValueBox}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={styles.stepValueText}>{servings} pers.</Text>
              </View>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setServings((prev) => prev + 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Augmenter le nombre de convives"
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Onglets : Mes Recettes vs Repas Libre / Restes (uniquement si saisie libre activée) */}
        {hasCustomTab && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'recipes' && styles.tabBtnActive]}
              onPress={() => setActiveTab('recipes')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="book-outline"
                size={16}
                color={activeTab === 'recipes' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'recipes' && styles.tabBtnTextActive,
                ]}
              >
                Mes Recettes ({recipes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'custom' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('custom');
                if (!customTitle.trim() && searchQuery.trim()) {
                  setCustomTitle(searchQuery.trim());
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={activeTab === 'custom' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'custom' && styles.tabBtnTextActive,
                ]}
              >
                Repas libre / Restes
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'recipes' ? (
          <View style={styles.recipesContent}>
            {/* Barre de recherche */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une recette ou un ingrédient..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Effacer la recherche"
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtres de catégorie */}
            <View style={styles.categoryScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => {
                  const isSel = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catPill, isSel && styles.catPillActive]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.catPillText, isSel && styles.catPillTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Liste des recettes disponibles */}
            <FlatList
              data={filteredRecipes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.recipeListContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isAlreadyAdded = Boolean(alreadyAddedSet?.has(item.id));
                return (
                  <TouchableOpacity
                    style={[
                      styles.recipeItemCard,
                      isAlreadyAdded && styles.recipeItemCardAlreadyAdded,
                    ]}
                    onPress={() => {
                      if (isAlreadyAdded) return;
                      onSelectRecipe(item, servings);
                      if (closeOnSelect) {
                        onClose();
                      }
                    }}
                    disabled={isAlreadyAdded}
                    activeOpacity={0.7}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={[styles.recipeThumb, isAlreadyAdded && styles.fadedThumb]}
                        contentFit="cover"
                        cachePolicy="disk"
                        transition={150}
                      />
                    ) : (
                      <View
                        style={[
                          styles.recipeThumbPlaceholder,
                          isAlreadyAdded && styles.fadedThumb,
                        ]}
                      >
                        <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.recipeItemInfo}>
                      <Text
                        style={[
                          styles.recipeItemTitle,
                          isAlreadyAdded && styles.recipeItemTitleAlreadyAdded,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.recipeItemMeta}>
                        <Text style={styles.recipeItemCategory}>{item.category}</Text>
                        <Text style={styles.recipeItemTime}>
                          • {item.prepTimeMinutes + item.cookTimeMinutes} min
                        </Text>
                        <Text style={styles.recipeItemIngCount}>
                          • {item.ingredients.length} ingr.
                        </Text>
                      </View>
                    </View>
                    {isAlreadyAdded ? (
                      <View style={styles.alreadyAddedBadge}>
                        <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                        <Text style={styles.alreadyAddedText}>Dans le dossier</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Ionicons name="restaurant-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptySearchText}>
                    {searchQuery.trim()
                      ? `Aucune recette trouvée pour « ${searchQuery.trim()} »`
                      : 'Aucune recette dans cette catégorie.'}
                  </Text>
                  {hasCustomTab && onSelectCustomMeal && searchQuery.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.emptyAddCustomBtn}
                      onPress={() => {
                        onSelectCustomMeal(searchQuery.trim(), servings);
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.emptyAddCustomBtnText}>
                        Planifier « {searchQuery.trim()} » comme repas libre
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListFooterComponent={
                hasCustomTab &&
                onSelectCustomMeal &&
                searchQuery.trim().length > 0 &&
                filteredRecipes.length > 0 ? (
                  <TouchableOpacity
                    style={styles.footerCustomPromptBtn}
                    onPress={() => {
                      onSelectCustomMeal(searchQuery.trim(), servings);
                      onClose();
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={styles.footerCustomPromptText}>
                      Planifier « {searchQuery.trim()} » comme repas libre
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : undefined
              }
            />
          </View>
        ) : (
          /* Onglet Repas libre / Restes */
          <View style={styles.customContainer}>
            <Text style={styles.customLabel}>Titre ou note pour ce repas :</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Ex: Restes de la veille, Restaurant italien, Pizza..."
              placeholderTextColor={colors.textMuted}
              value={customTitle}
              onChangeText={setCustomTitle}
              autoFocus
            />

            <View style={styles.quickIdeas}>
              <Text style={styles.quickIdeasLabel}>Idées rapides :</Text>
              <View style={styles.ideasWrap}>
                {[
                  'Restes du réfrigérateur',
                  'Restaurant',
                  'Pique-nique',
                  'Pizza maison',
                  'Salade composée',
                ].map((idea) => (
                  <TouchableOpacity
                    key={idea}
                    style={styles.ideaPill}
                    onPress={() => setCustomTitle(idea)}
                  >
                    <Text style={styles.ideaPillText}>{idea}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.customSubmitBtn,
                !customTitle.trim() && styles.customSubmitBtnDisabled,
              ]}
              onPress={handleCustomSubmit}
              disabled={!customTitle.trim()}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.customSubmitBtnText}>Valider ce repas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bouton pour retirer le repas si présent */}
        {Boolean(currentMeal && onRemoveMeal) && (
          <View style={styles.footerRemove}>
            <TouchableOpacity
              style={styles.removeMealBtn}
              onPress={() => {
                onRemoveMeal?.();
                onClose();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.removeMealBtnText}>Retirer ce repas du planning</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  recipesContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  servingsBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    ...shadows.card,
  },
  stepValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  stepValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  recipeListContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  recipeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  recipeItemCardAlreadyAdded: {
    opacity: 0.65,
    backgroundColor: colors.backgroundSecondary,
  },
  recipeThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  fadedThumb: {
    opacity: 0.7,
  },
  recipeThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipeItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  recipeItemTitleAlreadyAdded: {
    color: colors.textSecondary,
  },
  recipeItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeItemCategory: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  recipeItemTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recipeItemIngCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  alreadyAddedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  alreadyAddedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptySearchText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyAddCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    ...shadows.card,
  },
  emptyAddCustomBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerCustomPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  footerCustomPromptText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  customContainer: {
    padding: 20,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  quickIdeas: {
    marginBottom: 24,
  },
  quickIdeasLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  ideasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ideaPill: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ideaPillText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  customSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    ...shadows.card,
  },
  customSubmitBtnDisabled: {
    opacity: 0.5,
  },
  customSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRemove: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  removeMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  removeMealBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
}));
