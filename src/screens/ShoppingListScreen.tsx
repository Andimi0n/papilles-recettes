import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  Platform,
  ScrollView,
  SectionList,
  Modal,
  Animated,
  PanResponder,
  PanResponderGestureState,
  useWindowDimensions,
  LayoutChangeEvent,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { FridgeItem } from '../types/fridge';
import { CanonicalIngredient } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { VocabularyService } from '../services/vocabularyService';
import {
  UnifiedIngredientService,
} from '../services/unifiedIngredientService';
import { styles } from './ShoppingListScreen.styles';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS } from '../utils/aisleClassifier';
import { groupItemsByAisle, formatShoppingListForShare } from '../utils/shoppingAggregator';
import { normalizeString } from '../utils/helpers';
import { filterIngredientItems, countMatchingItems, areShoppingListsEqual, areFridgeListsEqual } from '../utils/ingredientSearchMatcher';
import { createSectionListGetItemLayout } from '../utils/sectionListLayoutHelper';
import { FridgeStockView } from '../components/FridgeStockView';
import { IngredientSearchBar } from '../components/IngredientSearchBar';
import { InStoreShoppingModal } from '../components/InStoreShoppingModal';
import { UnifiedIngredientInput } from '../components/UnifiedIngredientInput';
import { SwipeableShoppingItemRow } from '../components/SwipeableShoppingItemRow';
import { EditShoppingItemModal } from '../components/EditShoppingItemModal';
import { formatQuantityWithUnit, isStandardUnit, normalizeUnit } from '../constants/units';

interface ShoppingListScreenProps {
  onNavigateToRecipes?: (options?: { onlyDoable?: boolean }) => void;
  onNavigateToPlanner?: () => void;
  initialTab?: 'shopping' | 'fridge';
  isActive?: boolean;
}

interface ShoppingListItemRowProps {
  item: ShoppingItem;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToShelves: (item: ShoppingItem) => void;
  onLongPress: (item: ShoppingItem) => void;
  secondaryColor: string;
  borderColor: string;
  textMutedColor: string;
}

const ShoppingListItemRow = React.memo<ShoppingListItemRowProps>(
  ({
    item,
    isFirst,
    isLast,
    onToggle,
    onDelete,
    onMoveToShelves,
    onLongPress,
    secondaryColor,
    borderColor,
    textMutedColor,
  }) => {
    const handleMove = useCallback(() => onMoveToShelves(item), [onMoveToShelves, item]);
    const handleEdit = useCallback(() => onLongPress(item), [onLongPress, item]);
    const handleToggle = useCallback(() => onToggle(item.id), [onToggle, item.id]);
    const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);

    return (
      <SwipeableShoppingItemRow
        isFirst={isFirst}
        isLast={isLast}
        onMoveToShelves={handleMove}
        onLongPress={handleEdit}
      >
        <View style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
          <TouchableOpacity
            style={styles.checkboxBtn}
            onPress={handleToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
              size={23}
              color={item.isChecked ? secondaryColor : borderColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.itemTextContainer}
            onPress={handleToggle}
            onLongPress={handleEdit}
            delayLongPress={350}
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

            {(item.quantity || item.unit) && (
              <View style={styles.itemMetaRow}>
                <Text
                  style={[
                    styles.itemQuantity,
                    item.isChecked && styles.itemQuantityChecked,
                  ]}
                >
                  {formatQuantityWithUnit(item.quantity, item.unit)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteItemBtn,
              item.isChecked && styles.deleteItemBtnChecked,
            ]}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
            accessibilityLabel="Supprimer de la liste"
          >
            <Ionicons name="close" size={13} color={textMutedColor} />
          </TouchableOpacity>
        </View>
      </SwipeableShoppingItemRow>
    );
  }
);

ShoppingListItemRow.displayName = 'ShoppingListItemRow';

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  onNavigateToRecipes,
  onNavigateToPlanner,
  initialTab = 'shopping',
  isActive = true,
}) => {
  const { isDark, colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'shopping' | 'fridge'>(initialTab);

  // Position horizontale du Pager (0 = étagères, -screenWidth = courses)
  const [pageTranslateX] = useState(
    () => new Animated.Value(initialTab === 'fridge' ? 0 : -screenWidth)
  );

  const [items, setItems] = useState<ShoppingItem[]>(() => StorageService.getSyncShoppingList() || []);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(() => StorageService.getSyncFridgeItems() || []);
  const [fridgeCount, setFridgeCount] = useState<number>(() => (StorageService.getSyncFridgeItems() || []).length);

  // Recherche ergonomique unifiée Étagères ↔ Courses
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isInStoreModeVisible, setIsInStoreModeVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  // Mesure dynamique exacte du premier onglet pour positionner et dimensionner la pastille verte
  const [tabLayout, setTabLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>(() => ({
    x: 3,
    y: 3,
    width: Math.max(0, (screenWidth - 40) / 2),
    height: 32,
  }));

  const onFirstTabLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setTabLayout((prev) => {
        if (
          Math.abs(prev.x - x) < 0.5 &&
          Math.abs(prev.y - y) < 0.5 &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { x, y, width, height };
      });
    }
  }, []);

  // Synchronise si initialTab change depuis l'extérieur (Pattern React 19)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
      pageTranslateX.setValue(initialTab === 'fridge' ? 0 : -screenWidth);
    }
  }

  // Recalage de la translation si la largeur d'écran change
  useEffect(() => {
    if (activeTab === 'shopping') {
      pageTranslateX.setValue(-screenWidth);
    } else {
      pageTranslateX.setValue(0);
    }
  }, [screenWidth, activeTab, pageTranslateX]);

  // Interpolation de la position de la pilule indicatrice active (0 -> tabLayout.width)
  const indicatorTranslateX = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [tabLayout.width, 0],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth, tabLayout.width]);

  // Interpolations d'opacité croisée pour les libellés et icônes des onglets
  const fridgeActiveOpacity = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth]);

  const shoppingActiveOpacity = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth]);

  // Basculement d'onglet fluide et synchronisé (spring physique)
  const switchTab = useCallback(
    (target: 'fridge' | 'shopping', animated = true) => {
      if (activeTab === target) return;
      Keyboard.dismiss();
      const targetX = target === 'fridge' ? 0 : -screenWidth;

      if (!animated) {
        pageTranslateX.setValue(targetX);
        setActiveTab(target);
        return;
      }

      Animated.spring(pageTranslateX, {
        toValue: targetX,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }).start(() => {
        setActiveTab(target);
      });
    },
    [activeTab, screenWidth, pageTranslateX]
  );

  // Formulaire d'ajout rapide courses (saisie libre intelligente)
  const [newItemText, setNewItemText] = useState('');

  // Édition d'un article par appui long
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Snackbar d'annulation de suppression ou basculement temporaire (4 secondes)
  interface DeletedSnackbarInfo {
    item: ShoppingItem;
    index: number;
    action?: 'delete' | 'transfer';
    previousFridgeItems?: FridgeItem[];
  }

  const [deletedSnackbar, setDeletedSnackbar] = useState<DeletedSnackbarInfo | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletedItemRef = useRef<DeletedSnackbarInfo | null>(null);
  const [snackbarAnim] = useState(() => new Animated.Value(1));
  const [snackbarFadeAnim] = useState(() => new Animated.Value(0));
  const [bulkBarAnim] = useState(() => new Animated.Value(0));

  // Nettoyage au démontage pour persister toute suppression en attente
  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      if (pendingDeletedItemRef.current) {
        StorageService.deleteShoppingItem(pendingDeletedItemRef.current.item.id).catch(() => {});
      }
    };
  }, []);

  // Suggestions d'articles rapides indispensables pour les courses (alignées dynamiquement sur le lexique)
  const availableSuggestions: CanonicalIngredient[] = useMemo(() => {
    const dynamicSuggestions = UnifiedIngredientService.getSyncDynamicQuickSuggestions();
    const existingNorm = new Set(
      items.filter((i) => !i.isChecked).map((i) => normalizeString(i.name))
    );
    const syncList = VocabularyService.getSyncList();
    const vocabMap = new Map<string, CanonicalIngredient>();
    syncList.forEach((ing) => vocabMap.set(ing.normalizedName, ing));

    const suggestions: CanonicalIngredient[] = [];
    const addedIds = new Set<string>();

    for (const name of dynamicSuggestions) {
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
      setItems((prev) => (areShoppingListsEqual(prev, data) ? prev : data));
    } catch (e) {
      console.error('Erreur chargement liste courses:', e);
    }
  }, []);

  // Chargement des aliments du frigo pour les étagères et le comptage croisé
  const loadFridgeItems = useCallback(async () => {
    try {
      const data = await StorageService.getFridgeItems();
      setFridgeItems((prev) => (areFridgeListsEqual(prev, data) ? prev : data));
      setFridgeCount((prev) => (prev === data.length ? prev : data.length));
    } catch (e) {
      console.error('Erreur chargement aliments étagères:', e);
    }
  }, []);

  const handleFridgeCountChange = useCallback((count: number) => {
    setFridgeCount((prev) => (prev === count ? prev : count));
  }, []);

  const handleNavigateToShopping = useCallback(() => {
    switchTab('shopping');
  }, [switchTab]);

  const handleItemCopiedToShopping = useCallback(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  const handleToggleSearch = useCallback((open: boolean) => {
    setIsSearchActive(open);
  }, []);

  const handleNavigateToShoppingWithSearch = useCallback(
    (q: string) => {
      setIsSearchActive(true);
      setSearchQuery(q);
      switchTab('shopping');
    },
    [switchTab]
  );

  useEffect(() => {
    void (async () => {
      await loadShoppingList();
      await loadFridgeItems();
    })();

    const unsubShopping = StorageService.onShoppingListChange((updatedList) => {
      setItems((prev) => (areShoppingListsEqual(prev, updatedList) ? prev : updatedList));
    });

    const unsubFridge = StorageService.onFridgeChange((updatedFridge) => {
      setFridgeItems((prev) => (areFridgeListsEqual(prev, updatedFridge) ? prev : updatedFridge));
      setFridgeCount((prev) => (prev === updatedFridge.length ? prev : updatedFridge.length));
    });

    const unsubVocab = VocabularyService.onVocabularyCascade(async () => {
      await loadShoppingList();
      await loadFridgeItems();
    });

    return () => {
      unsubShopping();
      unsubFridge();
      unsubVocab();
    };
  }, [loadShoppingList, loadFridgeItems]);

  // Rechargement des courses et du frigo lorsque l'onglet redevient actif
  useEffect(() => {
    if (isActive) {
      void (async () => {
        await loadShoppingList();
        await loadFridgeItems();
      })();
    }
  }, [isActive, loadShoppingList, loadFridgeItems]);

  // Statistiques et filtrage
  const totalCount = items.length;
  const completedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items]);
  const activeItems = useMemo(() => items.filter((i) => !i.isChecked), [items]);
  const hasCompletedItems = completedCount > 0;

  // Animation d'apparition/disparition fluide de la barre flottante de rangement
  useEffect(() => {
    Animated.spring(bulkBarAnim, {
      toValue: hasCompletedItems ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();
  }, [hasCompletedItems, bulkBarAnim]);

  const isSearching = Boolean(isSearchActive || (searchQuery && searchQuery.trim().length > 0));

  // Filtrage des articles (tous les articles restent dans leur rayon respectif)
  const filteredItems = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return items;
    return filterIngredientItems(items, searchQuery);
  }, [items, searchQuery]);

  const totalFilteredCount = filteredItems.length;

  // Groupement par rayon de TOUS les articles (les articles cochés restent à leur place dans le rayon)
  const groupedSections = useMemo(() => groupItemsByAisle(filteredItems), [filteredItems]);

  const sections = useMemo(
    () => groupedSections.map((g) => ({ title: g.aisle, data: g.items })),
    [groupedSections]
  );
  const keyExtractor = useCallback((item: ShoppingItem) => item.id, []);

  // Nombre de correspondances croisées dans les étagères
  const fridgeCrossCount = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return 0;
    return countMatchingItems(fridgeItems, searchQuery);
  }, [fridgeItems, searchQuery]);

  // Action rapide : ajouter un article directement depuis l'écran de recherche vide
  const handleAddDirectSearchItem = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    try {
      const updated = await StorageService.addFreeformShoppingItem(trimmed, null);
      setItems(updated);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  // Actions utilisateur sur les courses
  const handleToggleItem = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isChecked: !it.isChecked } : it))
    );
    try {
      await StorageService.toggleShoppingItem(id);
    } catch (_e) {
      loadShoppingList();
    }
  }, [loadShoppingList]);

  const handleDeleteItem = useCallback(async (
    id: string,
    action: 'delete' | 'transfer' = 'delete',
    previousFridgeItems?: FridgeItem[],
    targetItem?: ShoppingItem
  ) => {
    const currentItems = itemsRef.current;
    const itemIndex = currentItems.findIndex((it) => it.id === id);
    const itemToDelete = targetItem || (itemIndex !== -1 ? currentItems[itemIndex] : undefined);

    setItems((prev) => prev.filter((it) => it.id !== id));

    if (!itemToDelete) return;

    // Si une suppression était déjà en attente dans le snackbar, on la persiste tout de suite
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      StorageService.deleteShoppingItem(pendingDeletedItemRef.current.item.id).catch(() => {});
    }

    const snackbarInfo: DeletedSnackbarInfo = {
      item: itemToDelete,
      index: itemIndex !== -1 ? itemIndex : 0,
      action,
      previousFridgeItems,
    };
    pendingDeletedItemRef.current = snackbarInfo;
    setDeletedSnackbar(snackbarInfo);

    // Animation de la jauge sur 4 secondes (4000ms) et entrée fluide
    snackbarAnim.setValue(1);
    snackbarFadeAnim.setValue(0);
    Animated.timing(snackbarFadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    Animated.timing(snackbarAnim, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: true,
    }).start();

    // Délai de 4 secondes avant confirmation définitive
    snackbarTimerRef.current = setTimeout(async () => {
      try {
        await StorageService.deleteShoppingItem(id);
      } catch (err) {
        console.error('Erreur suppression persistée shoppingItem:', err);
      }
      setDeletedSnackbar(null);
      pendingDeletedItemRef.current = null;
      snackbarTimerRef.current = null;
    }, 4000);
  }, [snackbarAnim, snackbarFadeAnim]);

  const handleUndoDelete = async () => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    const info = pendingDeletedItemRef.current || deletedSnackbar;
    if (!info) return;

    setDeletedSnackbar(null);
    pendingDeletedItemRef.current = null;

    // 1. Si l'action était un basculement vers les étagères, rétablir la liste des étagères antérieure
    if (info.action === 'transfer' && info.previousFridgeItems) {
      try {
        await StorageService.saveFridgeItems(info.previousFridgeItems);
        setFridgeCount(info.previousFridgeItems.length);
      } catch (e) {
        console.error('Erreur annulation transfert étagères:', e);
      }
    }

    // 2. Restaurer l'article dans la liste de courses
    try {
      const current = await StorageService.getShoppingList();
      let updated: ShoppingItem[];
      if (!current.some((it) => it.id === info.item.id)) {
        updated = [...current];
        const insertIdx = Math.min(Math.max(0, info.index), updated.length);
        updated.splice(insertIdx, 0, info.item);
        const saved = await StorageService.saveShoppingList(updated);
        updated = saved;
      } else {
        updated = current;
      }
      setItems(updated);
    } catch (e) {
      console.error('Erreur restauration shopping item:', e);
    }
  };

  const handleDismissSnackbar = async () => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      try {
        await StorageService.deleteShoppingItem(pendingDeletedItemRef.current.item.id);
      } catch (e) {}
      pendingDeletedItemRef.current = null;
    }
    setDeletedSnackbar(null);
  };

  const handleAddItem = async () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;

    try {
      const updated = await StorageService.addFreeformShoppingItem(trimmed);
      setItems(updated);
      setNewItemText('');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  const handleAddQuickSuggestion = async (ing: CanonicalIngredient) => {
    try {
      const trimmed = newItemText.trim();
      let textToAdd = ing.canonicalName;
      if (trimmed) {
        const match = trimmed.match(/^([0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?)\s*([a-zA-ZÀ-ÿ\.]*)$/);
        if (match) {
          textToAdd = `${trimmed} ${ing.canonicalName}`;
        }
      }
      const updated = await StorageService.addFreeformShoppingItem(textToAdd, ing.defaultAisle);
      setItems(updated);
      setNewItemText('');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  const handleSelectDropdownSuggestion = (ing: CanonicalIngredient) => {
    const trimmed = newItemText.trim();
    const match = trimmed.match(/^([0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?(?:\s*(?:-|–|à|a)\s*[0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?)?)\s*([a-zA-ZÀ-ÿ\.]*)\s*/);
    if (match && match[1]) {
      const qty = match[1];
      const u = isStandardUnit(match[2]) ? normalizeUnit(match[2]) : '';
      const prefix = [qty, u].filter(Boolean).join(' ');
      setNewItemText(`${prefix} ${ing.canonicalName} `);
    } else {
      setNewItemText(`${ing.canonicalName} `);
    }
  };

  // Déplacer un article individuel vers les étagères (swipe vers la gauche)
  const handleMoveToShelves = useCallback(async (item: ShoppingItem) => {
    try {
      const prevFridgeItems = await StorageService.getFridgeItems();
      const updatedFridge = await StorageService.addFridgeItem(item.name, item.aisle, item.canonicalId);
      setFridgeCount(updatedFridge.length);
      await handleDeleteItem(item.id, 'transfer', prevFridgeItems, item);
    } catch (_e) {
      Alert.alert('Erreur', "Impossible de basculer l'article dans vos étagères.");
    }
  }, [handleDeleteItem]);

  // Passer tous les ingrédients cochés/grisés dans mes étagères
  const handleBulkMoveCompletedToShelves = async () => {
    if (completedCount === 0) return;
    try {
      const res = await StorageService.moveCheckedShoppingItemsToFridge();
      setItems(res.shoppingList);
      setFridgeCount(res.fridgeItems.length);
      Alert.alert(
        'Rangement terminé !',
        `${res.movedCount} article${res.movedCount > 1 ? 's ont été rangés' : ' a été rangé'} dans vos étagères.`
      );
    } catch (e) {
      Alert.alert('Erreur', "Impossible de ranger les articles dans vos étagères.");
    }
  };

  // Édition d'un article par appui long
  const handleOpenEditModal = useCallback((item: ShoppingItem) => {
    setEditingItem(item);
    setIsEditModalVisible(true);
  }, []);

  const handleSaveEditedItem = async (updatedItem: ShoppingItem) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    try {
      await StorageService.updateShoppingItem(updatedItem);
    } catch (e) {
      loadShoppingList();
      Alert.alert('Erreur', "Impossible d'enregistrer les modifications.");
    }
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
        title: 'Liste de courses',
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
  const hasSuggestions = availableSuggestions.length > 0 && !isSearching;

  const renderSectionHeader = useCallback(
    ({ section: { title, data } }: { section: { title: string; data: ShoppingItem[] } }) => {
      const aisle = title as ShoppingAisle;
      const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
      return (
        <View style={[styles.aisleSection, { marginTop: 14 }]}>
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
              <Text style={styles.aisleCountText}>{data.length}</Text>
            </View>
          </View>
        </View>
      );
    },
    [isDark]
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: ShoppingItem; index: number; section: { title: string; data: ShoppingItem[] } }) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;

      return (
        <ShoppingListItemRow
          item={item}
          isFirst={isFirst}
          isLast={isLast}
          onToggle={handleToggleItem}
          onDelete={handleDeleteItem}
          onMoveToShelves={handleMoveToShelves}
          onLongPress={handleOpenEditModal}
          secondaryColor={colors.secondary}
          borderColor={colors.border}
          textMutedColor={colors.textMuted}
        />
      );
    },
    [handleToggleItem, handleDeleteItem, handleMoveToShelves, handleOpenEditModal, colors.secondary, colors.border, colors.textMuted]
  );

  const getItemLayout = useMemo(() => {
    return createSectionListGetItemLayout<ShoppingItem>({
      getItemHeight: (item) => (item.quantity || item.recipeTitle ? 58 : 46),
      getSectionHeaderHeight: () => 46,
      getSectionFooterHeight: () => 0,
    });
  }, []);

  // Swipe tactile fluide et continu (type Pager / Launcher Android)
  const screenSwipePanResponder = useMemo(() => {
    const shouldCapture = (gestureState: PanResponderGestureState) => {
      if (isInStoreModeVisible || isShareModalVisible || isEditModalVisible) {
        return false;
      }

      const isHorizontal =
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      if (!isHorizontal) return false;

      // Sur mes étagères : swipe vers la gauche (dx < -15)
      if (activeTab === 'fridge' && gestureState.dx < -15) {
        return true;
      }

      // Sur liste de courses : swipe vers la droite (dx > 15)
      if (activeTab === 'shopping' && gestureState.dx > 15) {
        return true;
      }

      return false;
    };

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => shouldCapture(gestureState),
      onMoveShouldSetPanResponder: (_, gestureState) => shouldCapture(gestureState),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
        pageTranslateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const base = activeTab === 'fridge' ? 0 : -screenWidth;
        let newX = base + gestureState.dx;

        // Amorti élastique doux aux limites extérieures
        if (newX > 0) {
          newX = newX * 0.15;
        } else if (newX < -screenWidth) {
          const over = newX + screenWidth;
          newX = -screenWidth + over * 0.15;
        }

        pageTranslateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        let shouldSwitch = false;

        if (activeTab === 'fridge') {
          // Vers la gauche : seuil de 35% de la largeur d'écran ou flick vif
          shouldSwitch =
            gestureState.dx < -screenWidth * 0.35 ||
            (gestureState.dx < -25 && gestureState.vx < -0.35);
        } else {
          // Vers la droite : seuil de 35% de la largeur d'écran ou flick vif
          shouldSwitch =
            gestureState.dx > screenWidth * 0.35 ||
            (gestureState.dx > 25 && gestureState.vx > 0.35);
        }

        const destinationTab = shouldSwitch
          ? (activeTab === 'fridge' ? 'shopping' : 'fridge')
          : activeTab;

        const targetX = destinationTab === 'fridge' ? 0 : -screenWidth;

        Animated.spring(pageTranslateX, {
          toValue: targetX,
          velocity: gestureState.vx,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }).start(() => {
          setActiveTab(destinationTab);
        });
      },
      onPanResponderTerminate: () => {
        const targetX = activeTab === 'fridge' ? 0 : -screenWidth;
        Animated.spring(pageTranslateX, {
          toValue: targetX,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }).start(() => {
          setActiveTab(activeTab);
        });
      },
    });
  }, [
    activeTab,
    isInStoreModeVisible,
    isShareModalVisible,
    isEditModalVisible,
    screenWidth,
    pageTranslateX,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={{ flex: 1, overflow: 'hidden' }} {...screenSwipePanResponder.panHandlers}>
        {/* Switcher d'onglets au sommet : Mes étagères vs Liste de courses */}
        <View style={styles.tabSwitcherWrapper}>
          <View style={styles.tabSwitcherContainer}>
            {/* Pilule verte animée continue (glisse 1:1 sous le doigt) */}
            <Animated.View
              style={[
                styles.tabSwitcherPill,
                {
                  left: tabLayout.x,
                  top: tabLayout.y,
                  width: tabLayout.width,
                  height: tabLayout.height,
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
            />

            {/* Onglet 1 : Mes étagères */}
            <TouchableOpacity
              style={styles.tabSwitcherBtn}
              onLayout={onFirstTabLayout}
              onPress={() => switchTab('fridge')}
              activeOpacity={0.8}
              accessibilityLabel="Afficher mes étagères"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'fridge' }}
            >
              {/* Couche au repos (couleurs secondaires) */}
              <View style={styles.tabSwitcherBtnInner}>
                <Ionicons name="layers-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.tabSwitcherText}>Mes étagères</Text>
                {fridgeCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{fridgeCount}</Text>
                  </View>
                )}
              </View>

              {/* Couche active avec fondu enchaîné continu */}
              <Animated.View
                style={[
                  styles.tabSwitcherBtnInner,
                  styles.tabSwitcherBtnOverlay,
                  { opacity: fridgeActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="layers" size={15} color="#FFFFFF" />
                <Text style={[styles.tabSwitcherText, styles.tabSwitcherTextActive]}>
                  Mes étagères
                </Text>
                {fridgeCount > 0 && (
                  <View style={[styles.tabBadge, styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, styles.tabBadgeTextActive]}>
                      {fridgeCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Onglet 2 : Liste de courses */}
            <TouchableOpacity
              style={styles.tabSwitcherBtn}
              onPress={() => switchTab('shopping')}
              activeOpacity={0.8}
              accessibilityLabel="Afficher la liste de courses"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'shopping' }}
            >
              {/* Couche au repos */}
              <View style={styles.tabSwitcherBtnInner}>
                <Ionicons name="cart-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.tabSwitcherText}>Liste de courses</Text>
                {activeItems.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{activeItems.length}</Text>
                  </View>
                )}
              </View>

              {/* Couche active avec fondu enchaîné continu */}
              <Animated.View
                style={[
                  styles.tabSwitcherBtnInner,
                  styles.tabSwitcherBtnOverlay,
                  { opacity: shoppingActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="cart" size={15} color="#FFFFFF" />
                <Text style={[styles.tabSwitcherText, styles.tabSwitcherTextActive]}>
                  Liste de courses
                </Text>
                {activeItems.length > 0 && (
                  <View style={[styles.tabBadge, styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, styles.tabBadgeTextActive]}>
                      {activeItems.length}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche ergonomique (commune aux deux univers) */}
        {isSearchActive && (
          <IngredientSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
            onClose={() => {
              setIsSearchActive(false);
              setSearchQuery('');
            }}
            currentTab={activeTab}
            currentMatchCount={
              activeTab === 'fridge'
                ? countMatchingItems(fridgeItems, searchQuery)
                : totalFilteredCount
            }
            crossMatchCount={
              activeTab === 'fridge'
                ? totalFilteredCount
                : fridgeCrossCount
            }
            onPressCrossUniverse={() => {
              switchTab(activeTab === 'fridge' ? 'shopping' : 'fridge');
            }}
          />
        )}

        {/* Pager interactif continu plein écran */}
        <Animated.View
          style={[
            styles.pagerTrack,
            {
              width: screenWidth * 2,
              transform: [{ translateX: pageTranslateX }],
            },
          ]}
        >
          {/* VUE 1 : DANS MES ÉTAGÈRES */}
          <View
            style={[styles.pagerPage, { width: screenWidth }]}
            aria-hidden={activeTab !== 'fridge'}
          >
            <FridgeStockView
              onNavigateToShopping={handleNavigateToShopping}
              onItemCopiedToShopping={handleItemCopiedToShopping}
              onFridgeCountChange={handleFridgeCountChange}
              searchQuery={searchQuery}
              isSearchOpen={isSearchActive}
              onToggleSearch={handleToggleSearch}
              shoppingItems={items}
              onNavigateToShoppingWithSearch={handleNavigateToShoppingWithSearch}
              initialItems={fridgeItems}
              isActiveTab={activeTab === 'fridge'}
            />
          </View>

          {/* VUE 2 : LISTE DE COURSES */}
          <View
            style={[styles.pagerPage, { width: screenWidth }]}
            aria-hidden={activeTab !== 'shopping'}
          >
            <View style={styles.shoppingListWrapper}>
          {/* Barre compacte d'actions et de statut (gain de hauteur P1) */}
          <View style={styles.compactSubHeader}>
            <View style={styles.compactStatusRow}>
              <Text style={styles.compactStatusText} numberOfLines={1}>
                {totalCount === 0
                  ? 'Aucun article'
                  : `${completedCount}/${totalCount} coché${completedCount > 1 ? 's' : ''}`}
              </Text>

              {!isSearching && totalCount > 0 && (
                <View style={styles.compactMiniProgressWrap}>
                  <View style={styles.compactMiniProgressTrack}>
                    <View style={[styles.compactMiniProgressFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <Text style={styles.compactMiniProgressPercent}>{progressPercent}%</Text>
                </View>
              )}
            </View>

            {/* Boutons d'action supérieurs compacts */}
            <View style={styles.compactActionsRow}>
              <TouchableOpacity
                style={[
                  styles.actionIconBtn,
                  isSearchActive && styles.actionIconBtnActive,
                ]}
                onPress={() => setIsSearchActive((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Rechercher dans les courses"
              >
                <Ionicons
                  name={isSearchActive ? 'search' : 'search-outline'}
                  size={17}
                  color={isSearchActive ? colors.primary : colors.textPrimary}
                />
              </TouchableOpacity>

              {/* Mode Course en magasin (discret et ergonomique dans l'en-tête) */}
              {totalCount > 0 && (
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.inStoreHeaderBtn]}
                  onPress={() => setIsInStoreModeVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Lancer le mode course en magasin"
                >
                  <Ionicons name="cart-outline" size={17} color={colors.secondary} />
                  {activeItems.length > 0 && (
                    <View style={styles.inStoreBadgeDot} />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => setIsShareModalVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Partager la liste"
              >
                <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
              </TouchableOpacity>

              {totalCount > 0 && (
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleClearAll}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Vider toute la liste"
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.bodyWrapper}>
            {/* Barre d'ajout fixe au sommet (ne disparaît jamais au scroll) */}
            {!isSearching && (
              <View style={styles.fixedQuickAddContainer}>
                <View style={styles.quickAddCard}>
                  <View style={styles.quickAddMainRow}>
                    <UnifiedIngredientInput
                      containerStyle={{ flex: 1, zIndex: 99 }}
                      style={styles.nameInput}
                      placeholder="Ex: 1kg carottes, 6 œufs, Coca-cola, lessive..."
                      placeholderTextColor={colors.textMuted}
                      value={newItemText}
                      onChangeText={(text) => setNewItemText(text)}
                      context="shopping"
                      clearOnSelect={false}
                      keepFocusOnSelect
                      returnKeyType="done"
                      onSubmitEditing={() => handleAddItem()}
                      onSelectIngredient={(ing) => {
                        handleSelectDropdownSuggestion(ing);
                      }}
                    />

                    <TouchableOpacity
                      style={[
                        styles.addButton,
                        !newItemText.trim() && styles.addButtonDisabled,
                      ]}
                      onPress={() => handleAddItem()}
                      disabled={!newItemText.trim()}
                      accessibilityLabel="Ajouter à la liste de courses"
                    >
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Zone de contenu principale (SectionList + Suggestions en en-tête) */}
            <View style={styles.contentArea}>
              {totalCount === 0 ? (
                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {hasSuggestions && !isSearching && (
                    <View style={styles.pinnedSuggestionsContainer}>
                      <Text style={styles.suggestionsTitle}>Ajout rapide en 1 clic :</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.suggestionsScroll}
                      >
                        {availableSuggestions.slice(0, 15).map((sug) => (
                          <TouchableOpacity
                            key={sug.id}
                            style={styles.suggestionChip}
                            onPress={() => handleAddQuickSuggestion(sug)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={13} color={colors.primary} />
                            <Text style={styles.suggestionChipText}>{sug.canonicalName}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

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
                </ScrollView>
              ) : (
                <SectionList
                  style={styles.scrollArea}
                  contentContainerStyle={[
                    styles.scrollContent,
                    completedCount > 0 ? { paddingBottom: 104 } : undefined,
                  ]}
                  showsVerticalScrollIndicator={false}
                  stickySectionHeadersEnabled={false}
                  keyboardShouldPersistTaps="handled"
                  sections={sections}
                  keyExtractor={keyExtractor}
                  getItemLayout={getItemLayout}
                  initialNumToRender={15}
                  maxToRenderPerBatch={8}
                  updateCellsBatchingPeriod={50}
                  windowSize={7}
                  removeClippedSubviews={Platform.OS === 'android'}
                  ListHeaderComponent={
                    isSearching && searchQuery?.trim() ? (
                      <View style={styles.searchSummaryStrip}>
                        <Text style={styles.searchSummaryText}>
                          {totalFilteredCount} article{totalFilteredCount > 1 ? 's' : ''} trouvé{totalFilteredCount > 1 ? 's' : ''} pour « {searchQuery.trim()} »
                        </Text>
                      </View>
                    ) : hasSuggestions ? (
                      <View style={styles.pinnedSuggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Ajout rapide en 1 clic :</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          keyboardShouldPersistTaps="handled"
                          contentContainerStyle={styles.suggestionsScroll}
                        >
                          {availableSuggestions.slice(0, 15).map((sug) => (
                            <TouchableOpacity
                              key={sug.id}
                              style={styles.suggestionChip}
                              onPress={() => handleAddQuickSuggestion(sug)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add" size={13} color={colors.primary} />
                              <Text style={styles.suggestionChipText}>{sug.canonicalName}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ) : undefined
                  }
                  ListEmptyComponent={
                    isSearching && searchQuery?.trim() && totalFilteredCount === 0 ? (
                      <View style={styles.emptySearchContainer}>
                        <View style={styles.emptyIconCircle}>
                          <Ionicons name="search-outline" size={38} color={colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Article introuvable</Text>
                        <Text style={styles.emptySubtitle}>
                          « {searchQuery.trim()} » n’est pas dans votre liste de courses.
                        </Text>

                        <TouchableOpacity
                          style={styles.searchAddBtn}
                          onPress={() => handleAddDirectSearchItem(searchQuery.trim())}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.searchAddBtnText}>
                            Ajouter « {searchQuery.trim()} » aux courses
                          </Text>
                        </TouchableOpacity>

                        {fridgeCrossCount > 0 && (
                          <TouchableOpacity
                            style={styles.searchCrossBtn}
                            onPress={() => switchTab('fridge')}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="layers-outline" size={17} color={colors.primary} />
                            <Text style={styles.searchCrossBtnText}>
                              Voir dans mes étagères ({fridgeCrossCount} aliment{fridgeCrossCount > 1 ? 's' : ''})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : undefined
                  }
                  renderSectionHeader={renderSectionHeader}
                  renderItem={renderItem}
                />
              )}

              {/* Barre contextuelle flottante : Ranger les articles cochés dans mes étagères */}
              <Animated.View
                style={[
                  styles.floatingBulkBarContainer,
                  {
                    opacity: bulkBarAnim,
                    transform: [
                      {
                        translateY: bulkBarAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [24, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={hasCompletedItems ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  style={styles.floatingBulkBarBtn}
                  onPress={handleBulkMoveCompletedToShelves}
                  activeOpacity={0.85}
                  accessibilityLabel={`Ranger ${completedCount} article${completedCount > 1 ? 's cochés' : ' coché'} dans mes étagères`}
                  accessibilityRole="button"
                >
                  <View style={styles.floatingBulkBarLeft}>
                    <View style={styles.floatingBulkBarIconBox}>
                      <Ionicons name="layers" size={17} color="#FFFFFF" />
                    </View>
                    <Text style={styles.floatingBulkBarBtnText} numberOfLines={1}>
                      Ranger dans mes étagères
                    </Text>
                    <View style={styles.floatingBulkBarCountBadge}>
                      <Text style={styles.floatingBulkBarCountText}>{completedCount}</Text>
                    </View>
                  </View>
                  <View style={styles.floatingBulkBarArrowBox}>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>



      {/* Mode Course en magasin (ultra-épuré, zoomé avec checklist & lien étagères) */}
      {isInStoreModeVisible && (
        <InStoreShoppingModal
          visible={isInStoreModeVisible}
          items={items}
          fridgeItems={fridgeItems}
          onClose={() => setIsInStoreModeVisible(false)}
          onItemsChange={(updated) => setItems(updated)}
          onStockUpdated={(newCount) => setFridgeCount(newCount)}
        />
      )}

      {/* Modal dédiée de regroupement des formats de partage */}
      <Modal
        visible={isShareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.shareModalOverlay}
          activeOpacity={1}
          onPress={() => setIsShareModalVisible(false)}
        >
          <View style={styles.shareModalCard}>
            <View style={styles.shareModalHeader}>
              <View style={styles.shareModalIconCircle}>
                <Ionicons name="share-social" size={22} color={colors.primary} />
              </View>
              <View style={styles.shareModalTitleCol}>
                <Text style={styles.shareModalTitle}>Partager la liste</Text>
                <Text style={styles.shareModalSubtitle}>
                  {totalCount === 0
                    ? 'Aucun article dans la liste'
                    : `${activeItems.length} article${activeItems.length > 1 ? 's' : ''} à acheter`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsShareModalVisible(false)}
                style={styles.shareModalCloseIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.shareModalOptionsList}>
              <TouchableOpacity
                style={styles.shareOptionRow}
                onPress={() => {
                  setIsShareModalVisible(false);
                  handleShareWhatsApp();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.shareOptionIconBox, { backgroundColor: isDark ? '#143823' : '#E7FCE9' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
                </View>
                <View style={styles.shareOptionTextCol}>
                  <Text style={styles.shareOptionTitle}>WhatsApp</Text>
                  <Text style={styles.shareOptionDesc}>Envoyer directement dans une discussion</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOptionRow}
                onPress={() => {
                  setIsShareModalVisible(false);
                  handleShareSMS();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.shareOptionIconBox, { backgroundColor: isDark ? '#162A45' : '#EFF6FF' }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={22} color="#2563EB" />
                </View>
                <View style={styles.shareOptionTextCol}>
                  <Text style={styles.shareOptionTitle}>SMS / Message</Text>
                  <Text style={styles.shareOptionDesc}>Message texte prêt à envoyer</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOptionRow}
                onPress={() => {
                  setIsShareModalVisible(false);
                  handleNativeShare();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.shareOptionIconBox, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                </View>
                <View style={styles.shareOptionTextCol}>
                  <Text style={styles.shareOptionTitle}>Autres applications</Text>
                  <Text style={styles.shareOptionDesc}>Mail, Notes, Presse-papiers...</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Barre Snackbar temporaire (4 secondes) pour annuler une suppression ou basculement dans Courses */}
      {deletedSnackbar && (
        <Animated.View
          style={[
            styles.snackbarContainer,
            completedCount > 0 && activeTab === 'shopping' ? { bottom: 78 } : undefined,
            {
              opacity: snackbarFadeAnim,
              transform: [
                {
                  translateY: snackbarFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.snackbarContent}>
            <View style={styles.snackbarLeft}>
              <Ionicons
                name={deletedSnackbar.action === 'transfer' ? 'layers-outline' : 'trash-outline'}
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.snackbarText} numberOfLines={1}>
                {deletedSnackbar.action === 'transfer'
                  ? `« ${deletedSnackbar.item.name} » basculé dans mes étagères`
                  : `« ${deletedSnackbar.item.name} » supprimé`}
              </Text>
            </View>

            <View style={styles.snackbarActions}>
              <TouchableOpacity
                style={styles.snackbarUndoBtn}
                onPress={handleUndoDelete}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Annuler l'action"
              >
                <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
                <Text style={styles.snackbarUndoText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.snackbarCloseBtn}
                onPress={handleDismissSnackbar}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Fermer la notification"
              >
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Jauge de progression temporelle de 4 secondes */}
          <View style={styles.snackbarTrack}>
            <Animated.View
              style={[
                styles.snackbarBar,
                {
                  transform: [{ scaleX: snackbarAnim }],
                },
              ]}
            />
          </View>
        </Animated.View>
      )}

        {/* Modal d'édition d'article (appui long) */}
        {isEditModalVisible && (
          <EditShoppingItemModal
            visible={isEditModalVisible}
            item={editingItem}
            onClose={() => {
              setIsEditModalVisible(false);
              setEditingItem(null);
            }}
            onSave={handleSaveEditedItem}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

