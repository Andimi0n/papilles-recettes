import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle } from '../types/shopping';
import { Recipe } from '../types/recipe';
import { StorageService } from '../services/storageService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { searchRecipes, RecipeSearchResult } from '../utils/searchEngine';
import { normalizeString } from '../utils/helpers';

interface FridgeStockViewProps {
  recipes: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onNavigateToShopping?: () => void;
  onItemCopiedToShopping?: (name: string) => void;
  onFridgeCountChange?: (count: number) => void;
}

const POPULAR_PANTRY_SUGGESTIONS = [
  'Œufs',
  'Beurre',
  'Lait',
  'Farine',
  'Pâtes',
  'Riz',
  'Huile d\'olive',
  'Crème fraîche',
  'Fromage râpé',
  'Tomates',
  'Oignons',
  'Ail',
  'Carottes',
  'Courgettes',
  'Poulet',
  'Thon en boîte',
  'Sel & Poivre',
  'Sucre',
  'Moutarde',
  'Chocolat',
];

export const FridgeStockView: React.FC<FridgeStockViewProps> = ({
  recipes,
  onSelectRecipe,
  onNavigateToShopping,
  onItemCopiedToShopping,
  onFridgeCountChange,
}) => {
  const { isDark, colors } = useTheme();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle | null>(null);
  const [isAislePickerVisible, setIsAislePickerVisible] = useState(false);
  const [isMatchingModalVisible, setIsMatchingModalVisible] = useState(false);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);

  // Chargement du stock des étagères
  const loadStock = useCallback(async () => {
    try {
      const data = await StorageService.getFridgeItems();
      setItems(data);
      if (onFridgeCountChange) {
        onFridgeCountChange(data.length);
      }
    } catch (e) {
      console.error('Erreur chargement étagères:', e);
    } finally {
      setIsLoading(false);
    }
  }, [onFridgeCountChange]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Groupement des aliments par rayon
  const groupedByAisle = useMemo(() => {
    const map = new Map<ShoppingAisle, FridgeItem[]>();
    items.forEach((item) => {
      const aisle = item.aisle || 'Autre';
      const existing = map.get(aisle) || [];
      existing.push(item);
      map.set(aisle, existing);
    });

    const result: { aisle: ShoppingAisle; items: FridgeItem[] }[] = [];
    ALL_AISLES.forEach((aisle) => {
      const aisleItems = map.get(aisle);
      if (aisleItems && aisleItems.length > 0) {
        result.push({ aisle, items: aisleItems });
      }
    });

    const otherItems = map.get('Autre');
    if (otherItems && otherItems.length > 0 && !result.some((r) => r.aisle === 'Autre')) {
      result.push({ aisle: 'Autre', items: otherItems });
    }

    return result;
  }, [items]);

  // Ingrédients présents dans les étagères
  const stockIngredientNames = useMemo(() => {
    return items.map((i) => i.name.trim());
  }, [items]);

  // Recettes correspondantes aux ingrédients en stock
  const matchingRecipes: RecipeSearchResult[] = useMemo(() => {
    if (stockIngredientNames.length === 0 || recipes.length === 0) {
      return [];
    }
    const query = stockIngredientNames.join(' ');
    const results = searchRecipes(recipes, query);
    return results.filter((res) => res.matchedIngredients && res.matchedIngredients.length > 0);
  }, [recipes, stockIngredientNames]);

  // Suggestions rapides d'indispensables non encore ajoutés
  const availableSuggestions = useMemo(() => {
    const existingNorm = new Set(items.map((i) => normalizeString(i.name)));
    return POPULAR_PANTRY_SUGGESTIONS.filter((sug) => !existingNorm.has(normalizeString(sug)));
  }, [items]);

  // Actions utilisateur
  const handleAddItem = async (nameToAdd?: string) => {
    const name = (nameToAdd || newItemName).trim();
    if (!name) return;

    try {
      const updated = await StorageService.addFridgeItem(name, selectedAisle || undefined);
      setItems(updated);
      if (onFridgeCountChange) {
        onFridgeCountChange(updated.length);
      }
      setNewItemName('');
      setSelectedAisle(null);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet aliment à vos étagères.");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const updated = await StorageService.removeFridgeItem(id);
      setItems(updated);
      if (onFridgeCountChange) {
        onFridgeCountChange(updated.length);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible de supprimer l'aliment.");
    }
  };

  const handleClearStock = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Vider mes étagères',
      'Êtes-vous sûr de vouloir supprimer tous les aliments de vos étagères ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            const updated = await StorageService.clearFridge();
            setItems(updated);
            if (onFridgeCountChange) {
              onFridgeCountChange(0);
            }
          },
        },
      ]
    );
  };

  const handleCopyToShopping = async (item: FridgeItem) => {
    try {
      await StorageService.copyFridgeItemToShopping(item);
      setJustCopiedId(item.id);
      setTimeout(() => setJustCopiedId(null), 2000);
      if (onItemCopiedToShopping) {
        onItemCopiedToShopping(item.name);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article à la liste de courses.");
    }
  };

  const totalCount = items.length;

  return (
    <View style={styles.container}>
      {/* En-tête Étagères avec titre et bouton vider */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Mes Étagères</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount === 0
              ? 'Aucun aliment en stock'
              : `${totalCount} aliment${totalCount > 1 ? 's' : ''} en stock`}
          </Text>
        </View>

        {totalCount > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleClearStock}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Vider les étagères"
            >
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bloc Ajouter un aliment vérouillé en haut */}
      <View style={styles.quickAddCard}>
        <View style={styles.quickAddMainRow}>
          <TextInput
            style={styles.nameInput}
            placeholder="Ajouter un aliment (placards, frigo, épices...)"
            placeholderTextColor={colors.textMuted}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={() => handleAddItem()}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[
              styles.addButton,
              !newItemName.trim() && styles.addButtonDisabled,
            ]}
            onPress={() => handleAddItem()}
            disabled={!newItemName.trim()}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Sélection facultative du rayon */}
        <View style={styles.quickAddDetailsRow}>
          <TouchableOpacity
            style={styles.aislePickerBtn}
            onPress={() => setIsAislePickerVisible(true)}
          >
            <Ionicons
              name={selectedAisle ? (AISLE_CONFIGS[selectedAisle].iconName as any) : 'funnel-outline'}
              size={13}
              color={selectedAisle ? AISLE_CONFIGS[selectedAisle].color : colors.textSecondary}
            />
            <Text
              style={[
                styles.aislePickerBtnText,
                selectedAisle ? { color: AISLE_CONFIGS[selectedAisle].color } : null,
              ]}
              numberOfLines={1}
            >
              {selectedAisle || 'Rayon : détection auto'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ajout rapide (suggestions d'indispensables) vérouillé sous le bloc d'ajout */}
      {availableSuggestions.length > 0 && (
        <View style={styles.pinnedSuggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Ajout rapide en 1 clic :</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {availableSuggestions.slice(0, 12).map((sug) => (
              <TouchableOpacity
                key={sug}
                style={styles.suggestionChip}
                onPress={() => handleAddItem(sug)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={14} color={colors.primary} />
                <Text style={styles.suggestionChipText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Contenu défilant : Bannière recettes + Liste des aliments */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bannière "Que cuisiner aujourd'hui ?" au-dessus des ingrédients, défile avec le contenu */}
        {totalCount > 0 && (
          <TouchableOpacity
            style={styles.smartCookBanner}
            onPress={() => {
              if (matchingRecipes.length > 0) {
                setIsMatchingModalVisible(true);
              }
            }}
            activeOpacity={matchingRecipes.length > 0 ? 0.8 : 1}
          >
            <View style={styles.smartCookLeft}>
              <View style={styles.smartCookIconBox}>
                <Ionicons name="restaurant" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.smartCookTextCol}>
                <Text style={styles.smartCookTitle}>Que cuisiner aujourd'hui ?</Text>
                <Text style={styles.smartCookSubtitle}>
                  {matchingRecipes.length > 0
                    ? `${matchingRecipes.length} recette${matchingRecipes.length > 1 ? 's' : ''} correspondent à votre stock`
                    : 'Ajoutez encore quelques ingrédients pour voir des idées'}
                </Text>
              </View>
            </View>

            {matchingRecipes.length > 0 && (
              <View style={styles.smartCookBtn}>
                <Text style={styles.smartCookBtnText}>Voir</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* État vide si aucune étagère remplie */}
        {totalCount === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="layers-outline" size={46} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Vos étagères sont vides</Text>
            <Text style={styles.emptySubtitle}>
              Ajoutez ce que vous avez sous la main (placards, frigo, épices...) ci-dessus pour
              savoir toujours ce qu'il vous reste et trouver des idées de recettes sans gaspiller.
            </Text>
          </View>
        ) : (
          /* Liste ordonnée par rayon de supermarché */
          groupedByAisle.map(({ aisle, items: aisleItems }) => {
            const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
            return (
              <View key={aisle} style={styles.aisleSection}>
                {/* En-tête du rayon */}
                <View style={styles.aisleHeaderRow}>
                  <View
                    style={[
                      styles.aisleIconBox,
                      { backgroundColor: isDark ? cfg.color + '26' : cfg.bgColor },
                    ]}
                  >
                    <Ionicons name={cfg.iconName as any} size={15} color={cfg.color} />
                  </View>
                  <Text style={[styles.aisleTitle, { color: cfg.color }]}>{aisle}</Text>
                  <View style={styles.aisleCountBadge}>
                    <Text style={styles.aisleCountText}>{aisleItems.length}</Text>
                  </View>
                </View>

                {/* Liste des aliments du rayon */}
                <View style={styles.itemsCard}>
                  {aisleItems.map((item, index) => {
                    const isCopied = justCopiedId === item.id;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          index < aisleItems.length - 1 && styles.itemRowBorder,
                        ]}
                      >
                        <View style={styles.bulletPoint}>
                          <Ionicons name="ellipse" size={8} color={cfg.color} />
                        </View>

                        <View style={styles.itemTextContainer}>
                          <Text style={styles.itemName}>{item.name}</Text>
                        </View>

                        {/* Bouton d'action : Ajouter à la liste de courses */}
                        <TouchableOpacity
                          style={[
                            styles.copyToShoppingBtn,
                            isCopied && styles.copyToShoppingBtnSuccess,
                          ]}
                          onPress={() => handleCopyToShopping(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel="Ajouter à la liste de courses"
                        >
                          <Ionicons
                            name={isCopied ? 'checkmark' : 'cart-outline'}
                            size={16}
                            color={isCopied ? '#FFFFFF' : colors.primary}
                          />
                          <Text
                            style={[
                              styles.copyToShoppingText,
                              isCopied && styles.copyToShoppingTextSuccess,
                            ]}
                          >
                            {isCopied ? 'Ajouté' : 'Courses'}
                          </Text>
                        </TouchableOpacity>

                        {/* Bouton supprimer */}
                        <TouchableOpacity
                          style={styles.deleteItemBtn}
                          onPress={() => handleDeleteItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Supprimer de mes étagères"
                        >
                          <Ionicons name="close" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal des recettes réalisables avec votre stock */}
      <Modal
        visible={isMatchingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsMatchingModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Recettes avec vos étagères</Text>
              <Text style={styles.modalSubtitle}>
                {matchingRecipes.length} recette{matchingRecipes.length > 1 ? 's' : ''} réalisable
                {matchingRecipes.length > 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseIconBtn}
              onPress={() => setIsMatchingModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.matchingListScroll} showsVerticalScrollIndicator={false}>
            {matchingRecipes.map(({ recipe, matchedIngredients }) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.matchingRecipeCard}
                onPress={() => {
                  setIsMatchingModalVisible(false);
                  if (onSelectRecipe) {
                    onSelectRecipe(recipe);
                  }
                }}
                activeOpacity={0.85}
              >
                {recipe.imageUrl ? (
                  <Image source={{ uri: recipe.imageUrl }} style={styles.matchingRecipeImage} />
                ) : (
                  <View style={styles.matchingRecipePlaceholder}>
                    <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
                  </View>
                )}

                <View style={styles.matchingRecipeInfo}>
                  <Text style={styles.matchingRecipeTitle} numberOfLines={1}>
                    {recipe.title}
                  </Text>
                  <View style={styles.matchingMetaRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.matchingMetaText}>
                      {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                    </Text>
                    <Text style={styles.matchingMetaText}>•</Text>
                    <Text style={styles.matchingMetaText}>{recipe.category}</Text>
                  </View>

                  {/* Badges des ingrédients qui correspondent */}
                  {matchedIngredients && matchedIngredients.length > 0 && (
                    <View style={styles.matchedChipsRow}>
                      <Text style={styles.matchedChipsLabel}>En stock :</Text>
                      {matchedIngredients.slice(0, 3).map((ingName) => (
                        <View key={ingName} style={styles.matchedChip}>
                          <Text style={styles.matchedChipText} numberOfLines={1}>
                            {ingName}
                          </Text>
                        </View>
                      ))}
                      {matchedIngredients.length > 3 && (
                        <Text style={styles.matchedExtraCount}>
                          +{matchedIngredients.length - 3}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de sélection de rayon */}
      <Modal
        visible={isAislePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAislePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsAislePickerVisible(false)}
        >
          <View style={styles.aisleModalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.aisleModalTitle}>Choisir un rayon</Text>
            <Text style={styles.aisleModalSubtitle}>
              Catégorisez cet ingrédient pour mieux organiser vos étagères :
            </Text>

            <TouchableOpacity
              style={[
                styles.aisleModalOption,
                selectedAisle === null && styles.aisleModalOptionSelected,
              ]}
              onPress={() => {
                setSelectedAisle(null);
                setIsAislePickerVisible(false);
              }}
            >
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <Text style={styles.aisleModalOptionText}>Détection automatique intelligente</Text>
              {selectedAisle === null && (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {ALL_AISLES.map((aisle) => {
                const cfg = AISLE_CONFIGS[aisle];
                const isSel = selectedAisle === aisle;
                return (
                  <TouchableOpacity
                    key={aisle}
                    style={[
                      styles.aisleModalOption,
                      isSel && styles.aisleModalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedAisle(aisle);
                      setIsAislePickerVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.aisleIconBoxSmall,
                        { backgroundColor: isDark ? cfg.color + '26' : cfg.bgColor },
                      ]}
                    >
                      <Ionicons name={cfg.iconName as any} size={14} color={cfg.color} />
                    </View>
                    <Text style={styles.aisleModalOptionText}>{aisle}</Text>
                    {isSel && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsAislePickerVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  quickAddCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  quickAddMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  quickAddDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  aislePickerBtn: {
    height: 30,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aislePickerBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pinnedSuggestionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  suggestionsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  smartCookBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    ...shadows.small,
  },
  smartCookLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  smartCookIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartCookTextCol: {
    flex: 1,
  },
  smartCookTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  smartCookSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  smartCookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginLeft: 8,
  },
  smartCookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  aisleSection: {
    marginBottom: 14,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  aisleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleIconBoxSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  aisleCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aisleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...shadows.small,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bulletPoint: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  copyToShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  copyToShoppingBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  copyToShoppingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  copyToShoppingTextSuccess: {
    color: '#FFFFFF',
  },
  deleteItemBtn: {
    padding: 6,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseIconBtn: {
    padding: 4,
  },
  matchingListScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  matchingRecipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  matchingRecipeImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  matchingRecipePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchingRecipeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  matchingRecipeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  matchingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  matchingMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  matchedChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  matchedChipsLabel: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '700',
  },
  matchedChip: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  matchedChipText: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '600',
  },
  matchedExtraCount: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  aisleModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  aisleModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  aisleModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  aisleModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 4,
  },
  aisleModalOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  aisleModalOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
}));
