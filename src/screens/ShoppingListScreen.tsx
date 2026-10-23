import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Linking,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { CanonicalIngredient } from '../types/vocabulary';
import { Recipe } from '../types/recipe';
import { StorageService } from '../services/storageService';
import { VocabularyService } from '../services/vocabularyService';
import {
  UnifiedIngredientService,
  CANONICAL_QUICK_SUGGESTIONS,
} from '../services/unifiedIngredientService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { groupItemsByAisle, formatShoppingListForShare } from '../utils/shoppingAggregator';
import { normalizeString } from '../utils/helpers';
import { FridgeStockView } from '../components/FridgeStockView';
import { UnifiedIngredientInput } from '../components/UnifiedIngredientInput';
import { QualifyIngredientModal } from '../components/QualifyIngredientModal';

interface ShoppingListScreenProps {
  onNavigateToRecipes?: (options?: { onlyDoable?: boolean }) => void;
  onNavigateToPlanner?: () => void;
  initialTab?: 'shopping' | 'fridge';
  recipes?: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  onNavigateToRecipes,
  onNavigateToPlanner,
  initialTab = 'shopping',
  recipes = [],
  onSelectRecipe,
}) => {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'shopping' | 'fridge'>(initialTab);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fridgeCount, setFridgeCount] = useState<number>(0);

  // Synchronise si initialTab change depuis l'extérieur
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Formulaire d'ajout rapide courses
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle | null>(null);
  const [isAislePickerVisible, setIsAislePickerVisible] = useState(false);
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');

  // Section des articles cochés repliée/dépliée
  const [showCompleted, setShowCompleted] = useState(false);

  // Suggestions d'articles rapides indispensables pour les courses (alignées sur le lexique)
  const availableSuggestions: CanonicalIngredient[] = useMemo(() => {
    const existingNorm = new Set(
      items.filter((i) => !i.isChecked).map((i) => normalizeString(i.name))
    );
    const syncList = VocabularyService.getSyncList();
    const vocabMap = new Map<string, CanonicalIngredient>();
    syncList.forEach((ing) => vocabMap.set(ing.normalizedName, ing));

    const suggestions: CanonicalIngredient[] = [];
    const addedIds = new Set<string>();

    for (const name of CANONICAL_QUICK_SUGGESTIONS) {
      const norm = normalizeString(name);
      if (existingNorm.has(norm)) continue;
      const ing = vocabMap.get(norm);
      if (ing && !addedIds.has(ing.id)) {
        addedIds.add(ing.id);
        suggestions.push(ing);
      }
    }

    return suggestions;
  }, [items]);

  // Chargement de la liste de courses
  const loadShoppingList = useCallback(async () => {
    try {
      const data = await StorageService.getShoppingList();
      setItems(data);
    } catch (e) {
      console.error('Erreur chargement liste courses:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement du nombre d'aliments du frigo pour le badge
  const loadFridgeCount = useCallback(async () => {
    try {
      const fridgeItems = await StorageService.getFridgeItems();
      setFridgeCount(fridgeItems.length);
    } catch (e) {
      console.error('Erreur chargement compteur frigo:', e);
    }
  }, []);

  useEffect(() => {
    loadShoppingList();
    loadFridgeCount();
  }, [loadShoppingList, loadFridgeCount]);

  // Statistiques
  const totalCount = items.length;
  const completedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items]);
  const activeItems = useMemo(() => items.filter((i) => !i.isChecked), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.isChecked), [items]);

  // Groupement par rayon des articles actifs
  const groupedActive = useMemo(() => groupItemsByAisle(activeItems), [activeItems]);

  // Actions utilisateur sur les courses
  const handleToggleItem = async (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isChecked: !it.isChecked } : it))
    );
    try {
      await StorageService.toggleShoppingItem(id);
    } catch (e) {
      loadShoppingList();
    }
  };

  const handleDeleteItem = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await StorageService.deleteShoppingItem(id);
    } catch (e) {
      loadShoppingList();
    }
  };

  const handleAddItemWithCanonical = async (
    ing: CanonicalIngredient,
    extractedDetails?: { quantity?: string; unit?: string }
  ) => {
    const qty = newItemQuantity.trim() || extractedDetails?.quantity || undefined;
    const unit = newItemUnit.trim() || extractedDetails?.unit || undefined;
    const aisle = selectedAisle || ing.defaultAisle;

    try {
      const updated = await StorageService.addCustomShoppingItem(
        ing.canonicalName,
        qty,
        unit,
        aisle,
        ing.id
      );
      setItems(updated);
      VocabularyService.incrementUsage(ing.id).catch(() => {});
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setSelectedAisle(null);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  const handleAddItemDirect = async (
    rawName: string,
    extractedDetails?: { quantity?: string; unit?: string }
  ) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const qty = newItemQuantity.trim() || extractedDetails?.quantity || undefined;
    const unit = newItemUnit.trim() || extractedDetails?.unit || undefined;

    try {
      const updated = await StorageService.addCustomShoppingItem(
        trimmed,
        qty,
        unit,
        selectedAisle || undefined
      );
      setItems(updated);
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setSelectedAisle(null);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    // Vérifier si reconnu
    const resolution = UnifiedIngredientService.resolveRecognizedIngredient(trimmedName);
    if (resolution.isRecognized && resolution.canonical) {
      return handleAddItemWithCanonical(resolution.canonical, {
        quantity: resolution.extractedQuantity,
        unit: resolution.extractedUnit,
      });
    }

    // Si non reconnu, ouvre le modal de qualification stricte
    setPendingUnrecognizedName(trimmedName);
    setIsQualifyModalVisible(true);
  };

  // Déplacer un article individuel vers les étagères
  const handleMoveToShelves = async (item: ShoppingItem) => {
    try {
      const res = await StorageService.moveShoppingItemToFridge(item.id);
      setItems(res.shoppingList);
      setFridgeCount(res.fridgeItems.length);
      Alert.alert('Rangé !', `"${item.name}" a été ajouté à vos étagères.`);
    } catch (e) {
      Alert.alert('Erreur', "Impossible de déplacer l'article dans vos étagères.");
    }
  };

  // Nettoyage des articles cochés avec proposition intelligente de les ranger dans les étagères
  const handleClearCompleted = () => {
    if (completedCount === 0) return;
    Alert.alert(
      'Articles achetés',
      `Que souhaitez-vous faire des ${completedCount} article(s) coché(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ranger dans mes étagères 🥫',
          style: 'default',
          onPress: async () => {
            const completedNames = completedItems.map((i) => i.name);
            await StorageService.addMultipleFridgeItems(completedNames);
            const updated = await StorageService.clearCompletedShoppingItems();
            setItems(updated);
            setFridgeCount((prev) => prev + completedNames.length);
            Alert.alert(
              'Étagères approvisionnées !',
              `${completedNames.length} aliment(s) ajouté(s) à vos étagères.`
            );
          },
        },
        {
          text: 'Supprimer uniquement',
          style: 'destructive',
          onPress: async () => {
            const updated = await StorageService.clearCompletedShoppingItems();
            setItems(updated);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (totalCount === 0) return;
    Alert.alert(
      'Vider toute la liste',
      'Êtes-vous sûr de vouloir supprimer tous les articles de votre liste de courses ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: async () => {
            const updated = await StorageService.clearAllShoppingItems();
            setItems(updated);
          },
        },
      ]
    );
  };

  // Partage
  const handleNativeShare = async () => {
    if (totalCount === 0) {
      Alert.alert('Liste vide', 'Ajoutez des articles avant de partager votre liste.');
      return;
    }
    const message = formatShoppingListForShare(items);
    try {
      await Share.share({
        title: 'Ma Liste de Courses Papilles',
        message,
      });
    } catch (e) {
      console.error('Erreur partage:', e);
    }
  };

  const handleShareWhatsApp = async () => {
    if (totalCount === 0) {
      Alert.alert('Liste vide', 'Ajoutez des articles avant de partager votre liste.');
      return;
    }
    const message = formatShoppingListForShare(items);
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        handleNativeShare();
      }
    } catch (e) {
      handleNativeShare();
    }
  };

  const handleShareSMS = async () => {
    if (totalCount === 0) {
      Alert.alert('Liste vide', 'Ajoutez des articles avant de partager votre liste.');
      return;
    }
    const message = formatShoppingListForShare(items);
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${separator}body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      handleNativeShare();
    }
  };

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Switcher d'onglets au sommet : Mes étagères vs Liste de courses */}
      <View style={styles.tabSwitcherWrapper}>
        <View style={styles.tabSwitcherContainer}>
          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeTab === 'fridge' && styles.tabSwitcherBtnActive,
            ]}
            onPress={() => setActiveTab('fridge')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'fridge' ? 'layers' : 'layers-outline'}
              size={15}
              color={activeTab === 'fridge' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabSwitcherText,
                activeTab === 'fridge' && styles.tabSwitcherTextActive,
              ]}
            >
              Mes étagères
            </Text>
            {fridgeCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'fridge' && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'fridge' && styles.tabBadgeTextActive,
                  ]}
                >
                  {fridgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeTab === 'shopping' && styles.tabSwitcherBtnActive,
            ]}
            onPress={() => setActiveTab('shopping')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'shopping' ? 'cart' : 'cart-outline'}
              size={15}
              color={activeTab === 'shopping' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabSwitcherText,
                activeTab === 'shopping' && styles.tabSwitcherTextActive,
              ]}
            >
              Liste de courses
            </Text>
            {activeItems.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'shopping' && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'shopping' && styles.tabBadgeTextActive,
                  ]}
                >
                  {activeItems.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* VUE 1 : DANS MON FRIGO */}
      {activeTab === 'fridge' ? (
        <FridgeStockView
          recipes={recipes}
          onSelectRecipe={onSelectRecipe}
          onNavigateToShopping={() => setActiveTab('shopping')}
          onItemCopiedToShopping={() => {
            loadShoppingList();
          }}
          onFridgeCountChange={(count) => setFridgeCount(count)}
          onNavigateToDoableRecipes={() => {
            if (onNavigateToRecipes) {
              onNavigateToRecipes({ onlyDoable: true });
            }
          }}
        />
      ) : (
        /* VUE 2 : LISTE DE COURSES */
        <View style={styles.shoppingListWrapper}>
          {/* En-tête de la liste de courses */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>Liste de Courses</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount === 0
                  ? 'Aucun article'
                  : `${completedCount} sur ${totalCount} article${totalCount > 1 ? 's' : ''} coché${completedCount > 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Boutons d'action supérieurs */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={handleNativeShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Partager la liste"
              >
                <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              {completedCount > 0 && (
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleClearCompleted}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Ranger ou vider les articles cochés"
                >
                  <Ionicons name="sparkles-outline" size={19} color={colors.secondary} />
                </TouchableOpacity>
              )}

              {totalCount > 0 && (
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleClearAll}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Vider toute la liste"
                >
                  <Ionicons name="trash-outline" size={19} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Barre de progression si articles présents */}
          {totalCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}%</Text>
            </View>
          )}

          {/* Barre d'ajout rapide vérouillée en haut */}
          <View style={styles.quickAddCard}>
            <View style={styles.quickAddMainRow}>
              <UnifiedIngredientInput
                containerStyle={{ flex: 1, marginRight: 8, zIndex: 99 }}
                style={[styles.nameInput, { width: '100%', marginRight: 0 }]}
                placeholder="Ajouter un article (ex: Pommes, Lait...)"
                placeholderTextColor={colors.textMuted}
                value={newItemName}
                onChangeText={setNewItemName}
                context="shopping"
                clearOnSelect
                keepFocusOnSelect
                returnKeyType="done"
                onSubmitEditing={() => handleAddItem()}
                onSelectIngredient={(ing, details) => {
                  handleAddItemWithCanonical(ing, details);
                }}
                onKeepFreeText={(freeName, details) => {
                  handleAddItemDirect(freeName, details);
                }}
                onAutoExtractedDetails={(extracted) => {
                  if (extracted.quantity && !newItemQuantity) {
                    setNewItemQuantity(extracted.quantity);
                  }
                  if (extracted.unit && !newItemUnit) {
                    setNewItemUnit(extracted.unit);
                  }
                }}
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

            {/* Détails complémentaires : Quantité & Unité & Rayon */}
            <View style={styles.quickAddDetailsRow}>
              <TextInput
                style={styles.qtyInput}
                placeholder="Qté (ex: 2)"
                placeholderTextColor={colors.textMuted}
                value={newItemQuantity}
                onChangeText={setNewItemQuantity}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.unitInput}
                placeholder="Unité (g, ml, pcs)"
                placeholderTextColor={colors.textMuted}
                value={newItemUnit}
                onChangeText={setNewItemUnit}
              />
              <TouchableOpacity
                style={styles.aislePickerBtn}
                onPress={() => setIsAislePickerVisible(true)}
              >
                <Ionicons
                  name={
                    selectedAisle
                      ? (AISLE_CONFIGS[selectedAisle].iconName as any)
                      : 'funnel-outline'
                  }
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
                  {selectedAisle || 'Rayon auto'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ajout rapide en 1 clic vérouillé sous le bloc d'ajout */}
          {availableSuggestions.length > 0 && (
            <View style={styles.pinnedSuggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Ajout rapide en 1 clic :</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {availableSuggestions.slice(0, 15).map((sug) => (
                  <TouchableOpacity
                    key={sug.id}
                    style={styles.suggestionChip}
                    onPress={() => handleAddItemWithCanonical(sug)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={styles.suggestionChipText}>{sug.canonicalName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Barre de partage rapide direct */}
          {totalCount > 0 && (
            <View style={styles.shareStrip}>
              <Text style={styles.shareStripLabel}>Partager :</Text>
              <TouchableOpacity
                style={[
                  styles.sharePill,
                  { backgroundColor: isDark ? '#143823' : '#E7FCE9' },
                ]}
                onPress={handleShareWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={14} color="#16A34A" />
                <Text style={[styles.sharePillText, { color: '#16A34A' }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sharePill,
                  { backgroundColor: isDark ? '#162A45' : '#EFF6FF' },
                ]}
                onPress={handleShareSMS}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbox-ellipses-outline" size={14} color="#2563EB" />
                <Text style={[styles.sharePillText, { color: '#2563EB' }]}>SMS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sharePill, { backgroundColor: colors.surfaceAlt }]}
                onPress={handleNativeShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.sharePillText, { color: colors.textSecondary }]}>Autre</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Contenu principal : liste par rayons */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {totalCount === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="cart-outline" size={46} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Votre panier est vide</Text>
                <Text style={styles.emptySubtitle}>
                  Ajoutez des articles avec la barre ci-dessus ou en 1 clic depuis vos recettes
                  et le planning de la semaine !
                </Text>

                <View style={styles.emptyButtonsRow}>
                  {onNavigateToRecipes && (
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={() => onNavigateToRecipes()}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="book-outline" size={17} color="#FFFFFF" />
                      <Text style={styles.emptyActionBtnText}>Voir mes recettes</Text>
                    </TouchableOpacity>
                  )}

                  {onNavigateToPlanner && (
                    <TouchableOpacity
                      style={[styles.emptyActionBtn, styles.emptyActionBtnSecondary]}
                      onPress={() => onNavigateToPlanner()}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                      <Text style={styles.emptyActionBtnSecondaryText}>Planning</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <>
                {/* Rayons contenant des articles actifs */}
                {groupedActive.map(({ aisle, items: aisleItems }) => {
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
                        <Text style={[styles.aisleTitle, { color: cfg.color }]}>
                          {aisle}
                        </Text>
                        <View style={styles.aisleCountBadge}>
                          <Text style={styles.aisleCountText}>{aisleItems.length}</Text>
                        </View>
                      </View>

                      {/* Lignes d'articles du rayon */}
                      <View style={styles.itemsCard}>
                        {aisleItems.map((item, index) => (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              index < aisleItems.length - 1 && styles.itemRowBorder,
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.checkboxBtn}
                              onPress={() => handleToggleItem(item.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                                size={23}
                                color={item.isChecked ? colors.secondary : colors.border}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.itemTextContainer}
                              onPress={() => handleToggleItem(item.id)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.itemName,
                                  item.isChecked && styles.itemNameChecked,
                                ]}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>

                              <View style={styles.itemMetaRow}>
                                {(item.quantity || item.unit) && (
                                  <Text style={styles.itemQuantity}>
                                    {[item.quantity, item.unit].filter(Boolean).join(' ')}
                                  </Text>
                                )}
                                {item.recipeTitle && (
                                  <Text style={styles.itemOrigin} numberOfLines={1}>
                                    • {item.recipeTitle}
                                    {item.servings ? ` (${item.servings} p.)` : ''}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteItemBtn}
                              onPress={() => handleDeleteItem(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}

                {/* Section repliable des articles déjà achetés */}
                {completedItems.length > 0 && (
                  <View style={styles.completedSection}>
                    <TouchableOpacity
                      style={styles.completedHeader}
                      onPress={() => setShowCompleted((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.completedHeaderLeft}>
                        <Ionicons name="checkmark-done" size={17} color={colors.secondary} />
                        <Text style={styles.completedHeaderText}>
                          Articles déjà pris ({completedItems.length})
                        </Text>
                      </View>
                      <Ionicons
                        name={showCompleted ? 'chevron-up' : 'chevron-down'}
                        size={17}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {showCompleted && (
                      <View style={styles.itemsCard}>
                        {completedItems.map((item, index) => (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              index < completedItems.length - 1 && styles.itemRowBorder,
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.checkboxBtn}
                              onPress={() => handleToggleItem(item.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={23}
                                color={colors.secondary}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.itemTextContainer}
                              onPress={() => handleToggleItem(item.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.itemName, styles.itemNameChecked]}>
                                {item.name}
                              </Text>
                              {(item.quantity || item.unit) && (
                                <Text style={styles.itemQuantityChecked}>
                                  {[item.quantity, item.unit].filter(Boolean).join(' ')}
                                </Text>
                              )}
                            </TouchableOpacity>

                            {/* Action rapide : ranger dans les étagères */}
                            <TouchableOpacity
                              style={styles.moveToFridgeBtn}
                              onPress={() => handleMoveToShelves(item)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              accessibilityLabel="Ranger dans mes étagères"
                            >
                              <Ionicons name="layers-outline" size={15} color={colors.primary} />
                              <Text style={styles.moveToFridgeText}>Étagères</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteItemBtn}
                              onPress={() => handleDeleteItem(item.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={17} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Modal de sélection de rayon supermarché */}
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
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Choisir un rayon de supermarché</Text>
            <Text style={styles.modalSubtitle}>
              Laissez en détection automatique ou forcez un rayon spécifique :
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
                      <Ionicons name={cfg.iconName as any} size={15} color={cfg.color} />
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

      {/* Modal de qualification stricte (Passeport Ingrédient) */}
      <QualifyIngredientModal
        visible={isQualifyModalVisible}
        rawName={pendingUnrecognizedName}
        context="shopping"
        onClose={() => setIsQualifyModalVisible(false)}
        onAttachAsSynonym={(canonical) => {
          handleAddItemWithCanonical(canonical);
        }}
        onCreateCanonical={(created) => {
          handleAddItemWithCanonical(created);
        }}
        onKeepFreeText={(freeName) => {
          handleAddItemDirect(freeName);
        }}
      />
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabSwitcherWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabSwitcherBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  tabSwitcherText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabSwitcherTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  shoppingListWrapper: {
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
    gap: 8,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
    minWidth: 32,
    textAlign: 'right',
  },
  quickAddCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
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
    gap: 8,
    marginTop: 8,
  },
  qtyInput: {
    flex: 1,
    height: 34,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.textPrimary,
  },
  unitInput: {
    flex: 1.2,
    height: 34,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.textPrimary,
  },
  aislePickerBtn: {
    flex: 1.5,
    height: 34,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  aislePickerBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  shareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
  },
  shareStripLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 2,
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  sharePillText: {
    fontSize: 11,
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
  checkboxBtn: {
    paddingRight: 10,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemNameChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  itemQuantityChecked: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemOrigin: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  moveToFridgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  moveToFridgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteItemBtn: {
    padding: 6,
  },
  completedSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    marginBottom: 8,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
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
    marginBottom: 22,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    ...shadows.small,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyActionBtnSecondary: {
    backgroundColor: colors.primaryLight,
  },
  emptyActionBtnSecondaryText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
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
