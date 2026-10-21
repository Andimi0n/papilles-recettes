import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category } from '../types/recipe';
import { DayOfWeek, MealTime, PlannedMeal } from '../types/planner';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { normalizeString } from '../utils/helpers';

interface MealSlotPickerModalProps {
  visible: boolean;
  day: DayOfWeek | null;
  mealTime: MealTime | null;
  recipes: Recipe[];
  currentMeal?: PlannedMeal;
  onSelectRecipe: (recipe: Recipe, servings: number) => void;
  onSelectCustomMeal: (title: string, servings: number) => void;
  onRemoveMeal: () => void;
  onClose: () => void;
}

const CATEGORIES: Category[] = ['Tous', 'Plat', 'Entrée', 'Dessert', 'Apéritif'];

export const MealSlotPickerModal: React.FC<MealSlotPickerModalProps> = ({
  visible,
  day,
  mealTime,
  recipes,
  currentMeal,
  onSelectRecipe,
  onSelectCustomMeal,
  onRemoveMeal,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'custom'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Tous');
  const [customTitle, setCustomTitle] = useState('');
  const [servings, setServings] = useState<number>(currentMeal?.servings || 4);

  // Synchronise les portions si un repas est déjà présent
  React.useEffect(() => {
    if (visible) {
      setServings(currentMeal?.servings || 4);
      setCustomTitle(currentMeal?.customNote || '');
      setSearchQuery('');
      setSelectedCategory('Tous');
      setActiveTab('recipes');
    }
  }, [visible, currentMeal]);

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
    onSelectCustomMeal(trimmed, servings);
    onClose();
  };

  const dayLabel = day || 'Jour';
  const timeLabel = mealTime === 'lunch' ? 'Midi ☀️' : 'Soir 🌙';

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
          <View>
            <Text style={styles.headerTitle}>{`${dayLabel} • ${timeLabel}`}</Text>
            <Text style={styles.headerSubtitle}>
              {currentMeal ? 'Modifier le plat prévu' : 'Choisir un plat'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stepper de portions pour ce créneau */}
        <View style={styles.servingsBar}>
          <Text style={styles.servingsBarLabel}>Nombre de convives pour ce repas :</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setServings((prev) => Math.max(1, prev - 1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="remove" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.stepValueBox}>
              <Ionicons name="people" size={14} color={Colors.primary} />
              <Text style={styles.stepValueText}>{servings} pers.</Text>
            </View>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => setServings((prev) => prev + 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Onglets : Mes Recettes vs Repas Libre / Restes */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'recipes' && styles.tabBtnActive]}
            onPress={() => setActiveTab('recipes')}
          >
            <Ionicons
              name="book-outline"
              size={16}
              color={activeTab === 'recipes' ? Colors.primary : Colors.textSecondary}
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
            onPress={() => setActiveTab('custom')}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={activeTab === 'custom' ? Colors.primary : Colors.textSecondary}
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

        {activeTab === 'recipes' ? (
          <View style={{ flex: 1 }}>
            {/* Barre de recherche */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une recette ou un ingrédient..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recipeItemCard}
                  onPress={() => {
                    onSelectRecipe(item, servings);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.recipeThumb} />
                  ) : (
                    <View style={styles.recipeThumbPlaceholder}>
                      <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
                    </View>
                  )}
                  <View style={styles.recipeItemInfo}>
                    <Text style={styles.recipeItemTitle} numberOfLines={1}>
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
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>
                    Aucune recette ne correspond à votre recherche.
                  </Text>
                </View>
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
              placeholderTextColor={Colors.textMuted}
              value={customTitle}
              onChangeText={setCustomTitle}
              autoFocus
            />

            <View style={styles.quickIdeas}>
              <Text style={styles.quickIdeasLabel}>Idées rapides :</Text>
              <View style={styles.ideasWrap}>
                {['Restes du réfrigérateur', 'Restaurant', 'Pique-nique', 'Pizza maison', 'Salade composée'].map(
                  (idea) => (
                    <TouchableOpacity
                      key={idea}
                      style={styles.ideaPill}
                      onPress={() => setCustomTitle(idea)}
                    >
                      <Text style={styles.ideaPillText}>{idea}</Text>
                    </TouchableOpacity>
                  )
                )}
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
        {currentMeal && (
          <View style={styles.footerRemove}>
            <TouchableOpacity
              style={styles.removeMealBtn}
              onPress={() => {
                onRemoveMeal();
                onClose();
              }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.cardBackground,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  servingsBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 3,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
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
    color: Colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
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
    backgroundColor: Colors.surfaceAlt,
  },
  tabBtnActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.small,
  },
  recipeThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  recipeThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
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
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  recipeItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recipeItemCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  recipeItemTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recipeItemIngCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  customContainer: {
    padding: 20,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  customInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  quickIdeas: {
    marginBottom: 24,
  },
  quickIdeasLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  ideasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ideaPill: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ideaPillText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  customSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    ...Shadows.small,
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
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.cardBackground,
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
    color: Colors.danger,
  },
}));
