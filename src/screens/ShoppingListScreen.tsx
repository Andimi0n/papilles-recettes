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
import { filterIngredientItems, countMatchingItems } from '../utils/ingredientSearchMatcher';
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

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  onNavigateToRecipes,
  onNavigateToPlanner,
  initialTab = 'shopping',
  isActive = true,
}) => {
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'shopping' | 'fridge'>(initialTab);
  const [items, setItems] = useState<ShoppingItem[]>(() => StorageService.getSyncShoppingList() || []);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>(() => StorageService.getSyncFridgeItems() || []);
  const [fridgeCount, setFridgeCount] = useState<number>(() => (StorageService.getSyncFridgeItems() || []).length);

  // Recherche ergonomique unifiée Étagères ↔ Courses
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isInStoreModeVisible, setIsInStoreModeVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);

  // Synchronise si initialTab change depuis l'extérieur (Pattern React 19)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }

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
      setItems(data);
    } catch (e) {
      console.error('Erreur chargement liste courses:', e);
    }
  }, []);

  // Chargement des aliments du frigo pour les étagères et le comptage croisé
  const loadFridgeItems = useCallback(async () => {
    try {
      const data = await StorageService.getFridgeItems();
      setFridgeItems(data);
      setFridgeCount(data.length);
    } catch (e) {
      console.error('Erreur chargement aliments étagères:', e);
    }
  }, []);

  const handleFridgeCountChange = useCallback((count: number) => {
    setFridgeCount(count);
  }, []);

  useEffect(() => {
    void (async () => {
      await loadShoppingList();
      await loadFridgeItems();
    })();

    const unsubShopping = StorageService.onShoppingListChange((updatedList) => {
      setItems(updatedList);
    });

    const unsubFridge = StorageService.onFridgeChange((updatedFridge) => {
      setFridgeItems(updatedFridge);
      setFridgeCount(updatedFridge.length);
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

  // Animation d'amorce (hint) : ne cibler que le premier article présent à chaque arrivée sur l'onglet courses (Pattern React 19)
  const isShoppingTab = activeTab === 'shopping';
  const [shoppingTabSnapshot, setShoppingTabSnapshot] = useState(isShoppingTab);
  const [hasCapturedShoppingHint, setHasCapturedShoppingHint] = useState(false);
  const [shoppingHintTargetId, setShoppingHintTargetId] = useState<string | null>(null);

  if (isShoppingTab !== shoppingTabSnapshot) {
    setShoppingTabSnapshot(isShoppingTab);
    if (!isShoppingTab) {
      setHasCapturedShoppingHint(false);
      setShoppingHintTargetId(null);
    }
  }

  if (isShoppingTab && !hasCapturedShoppingHint && groupedSections[0]?.items[0]?.id) {
    setHasCapturedShoppingHint(true);
    setShoppingHintTargetId(groupedSections[0].items[0].id);
  }
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
    const itemIndex = items.findIndex((it) => it.id === id);
    const itemToDelete = targetItem || (itemIndex !== -1 ? items[itemIndex] : undefined);

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
      useNativeDriver: false,
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
  }, [items, snackbarAnim, snackbarFadeAnim]);

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
      const shouldAnimateHint = shoppingHintTargetId !== null && item.id === shoppingHintTargetId;

      return (
        <SwipeableShoppingItemRow
          isFirst={isFirst}
          isLast={isLast}
          shouldAnimateHint={shouldAnimateHint}
          onMoveToShelves={() => handleMoveToShelves(item)}
          onLongPress={() => handleOpenEditModal(item)}
        >
          <View
            style={[
              styles.itemRow,
              !isLast && styles.itemRowBorder,
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
              onLongPress={() => handleOpenEditModal(item)}
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
              style={styles.deleteItemBtn}
              onPress={() => handleDeleteItem(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Supprimer de la liste"
            >
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </SwipeableShoppingItemRow>
      );
    },
    [shoppingHintTargetId, colors, handleMoveToShelves, handleOpenEditModal, handleToggleItem, handleDeleteItem]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={{ flex: 1 }}>
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
            setActiveTab(activeTab === 'fridge' ? 'shopping' : 'fridge');
          }}
        />
      )}

      {/* VUE 1 : DANS MES ÉTAGÈRES */}
      <View
        style={[
          styles.tabContentContainer,
          activeTab !== 'fridge' && styles.tabContentHidden,
        ]}
        pointerEvents={activeTab === 'fridge' ? 'auto' : 'none'}
      >
        <FridgeStockView
          onNavigateToShopping={() => setActiveTab('shopping')}
          onItemCopiedToShopping={() => {
            loadShoppingList();
          }}
          onFridgeCountChange={handleFridgeCountChange}
          searchQuery={searchQuery}
          isSearchOpen={isSearchActive}
          onToggleSearch={(open) => setIsSearchActive(open)}
          shoppingItems={items}
          onNavigateToShoppingWithSearch={(q) => {
            setActiveTab('shopping');
            setIsSearchActive(true);
            setSearchQuery(q);
          }}
          initialItems={fridgeItems}
          isActiveTab={activeTab === 'fridge'}
        />
      </View>

      {/* VUE 2 : LISTE DE COURSES */}
      <View
        style={[
          styles.tabContentContainer,
          activeTab !== 'shopping' && styles.tabContentHidden,
        ]}
        pointerEvents={activeTab === 'shopping' ? 'auto' : 'none'}
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
                  initialNumToRender={15}
                  maxToRenderPerBatch={10}
                  windowSize={5}
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
                            onPress={() => setActiveTab('fridge')}
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



      {/* Mode Course en magasin (ultra-épuré, zoomé avec checklist & lien étagères) */}
      <InStoreShoppingModal
        visible={isInStoreModeVisible}
        items={items}
        fridgeItems={fridgeItems}
        onClose={() => setIsInStoreModeVisible(false)}
        onItemsChange={(updated) => setItems(updated)}
        onStockUpdated={(newCount) => setFridgeCount(newCount)}
      />

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
                  width: snackbarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>
      )}

        {/* Modal d'édition d'article (appui long) */}
        <EditShoppingItemModal
          visible={isEditModalVisible}
          item={editingItem}
          onClose={() => {
            setIsEditModalVisible(false);
            setEditingItem(null);
          }}
          onSave={handleSaveEditedItem}
        />
      </View>
    </SafeAreaView>
  );
};

