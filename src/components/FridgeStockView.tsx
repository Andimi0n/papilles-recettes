import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SectionList,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle, ShoppingItem } from '../types/shopping';
import { CanonicalIngredient } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS, ALL_AISLES, classifyIngredientAisle } from '../utils/aisleClassifier';
import { normalizeString } from '../utils/helpers';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { filterIngredientItems, countMatchingItems, areFridgeListsEqual } from '../utils/ingredientSearchMatcher';
import { VocabularyService } from '../services/vocabularyService';
import { UnifiedIngredientInput } from './UnifiedIngredientInput';
import {
  UnifiedIngredientService,
} from '../services/unifiedIngredientService';
import { QualifyIngredientModal } from './QualifyIngredientModal';
import { SwipeableStockItemRow } from './SwipeableStockItemRow';

interface FridgeStockViewProps {
  onNavigateToShopping?: () => void;
  onItemCopiedToShopping?: (name: string) => void;
  onFridgeCountChange?: (count: number) => void;
  searchQuery?: string;
  isSearchOpen?: boolean;
  onToggleSearch?: (open: boolean) => void;
  shoppingItems?: ShoppingItem[];
  onNavigateToShoppingWithSearch?: (query: string) => void;
  initialItems?: FridgeItem[];
  isActiveTab?: boolean;
}

interface StockListItemRowProps {
  item: FridgeItem;
  isFirst: boolean;
  isLast: boolean;
  indicatorColor: string;
  onMoveToShopping: (item: FridgeItem) => void;
  onDelete: (id: string) => void;
  textMutedColor: string;
}

const StockListItemRow = React.memo<StockListItemRowProps>(
  ({ item, isFirst, isLast, indicatorColor, onMoveToShopping, onDelete, textMutedColor }) => {
    const handleMove = useCallback(() => onMoveToShopping(item), [onMoveToShopping, item]);
    const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);

    return (
      <SwipeableStockItemRow
        isFirst={isFirst}
        isLast={isLast}
        indicatorColor={indicatorColor}
        onMoveToShopping={handleMove}
      >
        <View style={[styles.itemRow, !isLast && styles.itemRowBorder]}>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteItemBtn}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
            accessibilityLabel="Supprimer de mes étagères"
          >
            <Ionicons name="close" size={13} color={textMutedColor} />
          </TouchableOpacity>
        </View>
      </SwipeableStockItemRow>
    );
  }
);

StockListItemRow.displayName = 'StockListItemRow';

const FridgeStockViewComponent: React.FC<FridgeStockViewProps> = ({
  onNavigateToShopping,
  onItemCopiedToShopping,
  onFridgeCountChange,
  searchQuery = '',
  isSearchOpen = false,
  onToggleSearch,
  shoppingItems = [],
  onNavigateToShoppingWithSearch,
  initialItems,
  isActiveTab = true,
}) => {
  const { isDark, colors } = useTheme();
  const [items, setItems] = useState<FridgeItem[]>(() => {
    if (initialItems && initialItems.length > 0) return initialItems;
    return StorageService.getSyncFridgeItems() || [];
  });

  // Synchronisation si initialItems change depuis le parent
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems && prevInitialItems !== initialItems) {
    setPrevInitialItems(initialItems);
    if (!areFridgeListsEqual(items, initialItems)) {
      setItems(initialItems);
    }
  }

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [newItemName, setNewItemName] = useState('');
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');
  const [canonicalVocabulary, setCanonicalVocabulary] = useState<CanonicalIngredient[]>(() =>
    VocabularyService.getSyncList()
  );

  const onFridgeCountChangeRef = useRef(onFridgeCountChange);
  useEffect(() => {
    onFridgeCountChangeRef.current = onFridgeCountChange;
  }, [onFridgeCountChange]);

  // Snackbar d'annulation de suppression ou basculement temporaire (4 secondes)
  interface DeletedSnackbarInfo {
    item: FridgeItem;
    index: number;
    action?: 'delete' | 'transfer';
    previousShoppingList?: ShoppingItem[];
  }

  const [deletedSnackbar, setDeletedSnackbar] = useState<DeletedSnackbarInfo | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletedItemRef = useRef<DeletedSnackbarInfo | null>(null);
  const [snackbarAnim] = useState(() => new Animated.Value(1));
  const [snackbarFadeAnim] = useState(() => new Animated.Value(0));

  // Nettoyage au démontage pour persister toute suppression en attente
  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      if (pendingDeletedItemRef.current) {
        StorageService.removeFridgeItem(pendingDeletedItemRef.current.item.id).catch(() => {});
      }
    };
  }, []);

  // Chargement du stock des étagères
  const loadStock = useCallback(async () => {
    try {
      const data = await StorageService.getFridgeItems();
      setItems((prev) => (areFridgeListsEqual(prev, data) ? prev : data));
      onFridgeCountChangeRef.current?.(data.length);
    } catch (e) {
      console.error('Erreur chargement étagères:', e);
    }
  }, []);

  // Chargement et synchronisation du stock et du vocabulaire canonique
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      try {
        const [loadedStock, vocab] = await Promise.all([
          StorageService.getFridgeItems(),
          VocabularyService.getAll(),
        ]);
        if (isMounted) {
          setItems((prev) => (areFridgeListsEqual(prev, loadedStock) ? prev : loadedStock));
          setCanonicalVocabulary(vocab);
          onFridgeCountChangeRef.current?.(loadedStock.length);
        }
      } catch (e) {
        console.error('Erreur chargement stock FridgeStockView:', e);
      }
    };
    initData();

    const unsubFridge = StorageService.onFridgeChange((updatedStock) => {
      setItems((prev) => (areFridgeListsEqual(prev, updatedStock) ? prev : updatedStock));
      onFridgeCountChangeRef.current?.(updatedStock.length);
    });

    const unsubVocab = VocabularyService.onVocabularyCascade(async () => {
      await loadStock();
      const updatedVocab = await VocabularyService.getAll();
      if (isMounted) {
        setCanonicalVocabulary(updatedVocab);
      }
    });

    return () => {
      isMounted = false;
      unsubFridge();
      unsubVocab();
    };
  }, [loadStock]);

  // Aliments filtrés selon la recherche
  const filteredItems = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return items;
    }
    return filterIngredientItems(items, searchQuery);
  }, [items, searchQuery]);

  // Nombre de correspondances croisées dans la liste de courses
  const shoppingCrossCount = useMemo(() => {
    if (!shoppingItems || !searchQuery || !searchQuery.trim()) return 0;
    return countMatchingItems(shoppingItems, searchQuery);
  }, [shoppingItems, searchQuery]);

  const isSearching = Boolean(isSearchOpen || (searchQuery && searchQuery.trim().length > 0));

  // Groupement des aliments par rayon (sur les éléments filtrés, triés par ordre alphabétique)
  const groupedByAisle = useMemo(() => {
    const map = new Map<ShoppingAisle, FridgeItem[]>();
    const seenIds = new Set<string>();
    filteredItems.forEach((item) => {
      if (!item || !item.id || seenIds.has(item.id)) return;
      seenIds.add(item.id);
      const aisle = item.aisle || 'Autre';
      const existing = map.get(aisle) || [];
      existing.push(item);
      map.set(aisle, existing);
    });

    const result: { aisle: ShoppingAisle; items: FridgeItem[] }[] = [];
    ALL_AISLES.forEach((aisle) => {
      const aisleItems = map.get(aisle);
      if (aisleItems && aisleItems.length > 0) {
        aisleItems.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        result.push({ aisle, items: aisleItems });
      }
    });

    const otherItems = map.get('Autre');
    if (otherItems && otherItems.length > 0 && !result.some((r) => r.aisle === 'Autre')) {
      otherItems.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      result.push({ aisle: 'Autre', items: otherItems });
    }

    return result;
  }, [filteredItems]);

  // Suggestions rapides d'indispensables non encore ajoutés au stock (100% raccord avec le lexique canonique dynamique)
  const availableSuggestions: CanonicalIngredient[] = useMemo(() => {
    const dynamicSuggestions = UnifiedIngredientService.getSyncDynamicQuickSuggestions();

    const existingNorm = new Set(items.map((i) => normalizeString(i.name)));

    const isAlreadyInStock = (norm: string) => {
      if (existingNorm.has(norm)) return true;
      if (norm.endsWith('s') && existingNorm.has(norm.slice(0, -1))) return true;
      if (!norm.endsWith('s') && existingNorm.has(`${norm}s`)) return true;
      return false;
    };

    const vocabMap = new Map<string, CanonicalIngredient>();
    canonicalVocabulary.forEach((ing) => {
      vocabMap.set(ing.normalizedName, ing);
    });

    const suggestions: CanonicalIngredient[] = [];
    const addedIds = new Set<string>();

    // 1. Suggestions dynamiques (prioritaires sur l'usage)
    for (const name of dynamicSuggestions) {
      const norm = normalizeString(name);
      if (isAlreadyInStock(norm)) continue;

      const ing = vocabMap.get(norm);
      if (ing && !addedIds.has(ing.id)) {
        addedIds.add(ing.id);
        suggestions.push(ing);
      }
    }

    // 2. Ingrédients fréquents ou personnalisés de l'utilisateur non inclus
    const frequentItems = [...canonicalVocabulary]
      .filter((ing) => (ing.usageCount > 1 || ing.isCustom) && !addedIds.has(ing.id))
      .sort((a, b) => b.usageCount - a.usageCount);

    for (const freq of frequentItems) {
      if (!isAlreadyInStock(freq.normalizedName) && !addedIds.has(freq.id)) {
        addedIds.add(freq.id);
        suggestions.push(freq);
      }
    }

    return suggestions;
  }, [items, canonicalVocabulary]);

  // Actions utilisateur
  const handleAddItem = async (nameToAdd?: string, aisleToAdd?: ShoppingAisle, canonicalIdToAdd?: string) => {
    const raw = (nameToAdd || newItemName).trim();
    if (!raw) return;

    // Si aucun ID canonique n'est fourni, on vérifie via le service unifié
    if (!canonicalIdToAdd) {
      const resolution = UnifiedIngredientService.resolveRecognizedIngredient(raw);
      if (resolution.isRecognized && resolution.canonical) {
        return handleAddItem(resolution.canonical.canonicalName, resolution.canonical.defaultAisle, resolution.canonical.id);
      } else {
        setPendingUnrecognizedName(raw);
        setIsQualifyModalVisible(true);
        return;
      }
    }

    // Normalisation de l'ingrédient
    const normalized = normalizeIngredient({ name: raw, canonicalId: canonicalIdToAdd });
    const resolvedCanonicalId = canonicalIdToAdd || normalized.canonicalId;
    const name = normalized.name || (raw.charAt(0).toUpperCase() + raw.slice(1));
    const resolvedAisle =
      aisleToAdd ||
      (resolvedCanonicalId
        ? canonicalVocabulary.find((c) => c.id === resolvedCanonicalId)?.defaultAisle
        : undefined) ||
      classifyIngredientAisle(name);

    try {
      const updated = await StorageService.addFridgeItem(name, resolvedAisle, resolvedCanonicalId);
      setItems(updated);
      VocabularyService.incrementUsage(resolvedCanonicalId || name).catch(() => {});
      onFridgeCountChangeRef.current?.(updated.length);
      setNewItemName('');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet aliment à vos étagères.");
    }
  };

  const handleDeleteItem = useCallback(async (
    id: string,
    action: 'delete' | 'transfer' = 'delete',
    previousShoppingList?: ShoppingItem[],
    targetItem?: FridgeItem
  ) => {
    const currentItems = itemsRef.current;
    const itemIndex = currentItems.findIndex((it) => it.id === id);
    const itemToDelete = targetItem || (itemIndex !== -1 ? currentItems[itemIndex] : undefined);

    setItems((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      onFridgeCountChangeRef.current?.(updated.length);
      return updated;
    });

    if (!itemToDelete) return;

    // Si une suppression était déjà en attente dans le snackbar, on la persiste tout de suite
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      StorageService.removeFridgeItem(pendingDeletedItemRef.current.item.id).catch(() => {});
    }

    const snackbarInfo: DeletedSnackbarInfo = {
      item: itemToDelete,
      index: itemIndex,
      action,
      previousShoppingList,
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
        await StorageService.removeFridgeItem(id);
      } catch (err) {
        console.error('Erreur suppression persistée fridgeItem:', err);
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

    // 1. Si l'action était un basculement vers les courses, rétablir la liste de courses antérieure
    if (info.action === 'transfer' && info.previousShoppingList) {
      try {
        await StorageService.saveShoppingList(info.previousShoppingList);
        onItemCopiedToShopping?.(info.item.name);
      } catch (e) {
        console.error('Erreur annulation transfert courses:', e);
      }
    }

    // 2. Restaurer l'aliment dans les étagères
    try {
      const current = await StorageService.getFridgeItems();
      let updated: FridgeItem[];
      if (!current.some((it) => it.id === info.item.id)) {
        updated = [...current];
        const insertIdx = Math.min(Math.max(0, info.index), updated.length);
        updated.splice(insertIdx, 0, info.item);
        const saved = await StorageService.saveFridgeItems(updated);
        updated = saved;
      } else {
        updated = current;
      }
      setItems(updated);
      onFridgeCountChangeRef.current?.(updated.length);
    } catch (e) {
      console.error('Erreur restauration fridge item:', e);
    }
  };

  const handleDismissSnackbar = async () => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      try {
        await StorageService.removeFridgeItem(pendingDeletedItemRef.current.item.id);
      } catch (e) {}
      pendingDeletedItemRef.current = null;
    }
    setDeletedSnackbar(null);
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
            onFridgeCountChangeRef.current?.(0);
          },
        },
      ]
    );
  };

  const handleCopyToShopping = useCallback(async (item: FridgeItem) => {
    try {
      await StorageService.copyFridgeItemToShopping(item);
      if (onItemCopiedToShopping) {
        onItemCopiedToShopping(item.name);
      }
    } catch (_e) {
      Alert.alert('Erreur', "Impossible d'ajouter cet article à la liste de courses.");
    }
  }, [onItemCopiedToShopping]);

  const handleEmptyItem = useCallback(async (item: FridgeItem) => {
    try {
      const prevShoppingList = await StorageService.getShoppingList();
      await handleCopyToShopping(item);
      await handleDeleteItem(item.id, 'transfer', prevShoppingList, item);
    } catch (_e) {
      Alert.alert('Erreur', "Impossible de basculer l'aliment dans la liste de courses.");
    }
  }, [handleCopyToShopping, handleDeleteItem]);

  const totalCount = items.length;
  const hasSuggestions = availableSuggestions.length > 0 && !isSearching;

  const sections = useMemo(() => {
    return groupedByAisle.map((g) => ({ title: g.aisle, data: g.items }));
  }, [groupedByAisle]);

  const keyExtractor = useCallback((item: FridgeItem) => item.id, []);

  const firstSectionTitle = sections[0]?.title;
  const renderSectionHeader = useCallback(
    ({ section: { title, data } }: { section: { title: string; data: FridgeItem[] } }) => {
      const aisle = title as ShoppingAisle;
      const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
      const isFirstSection = firstSectionTitle === title;
      return (
        <View style={[styles.aisleSection, isFirstSection ? styles.aisleSectionFirst : styles.aisleSectionNext]}>
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
              <Text style={styles.aisleCountText}>{data.length}</Text>
            </View>
          </View>
        </View>
      );
    },
    [isDark, firstSectionTitle]
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: FridgeItem; index: number; section: { title: string; data: FridgeItem[] } }) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      const aisle = section.title as ShoppingAisle;
      const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];

      return (
        <StockListItemRow
          item={item}
          isFirst={isFirst}
          isLast={isLast}
          indicatorColor={cfg.color}
          onMoveToShopping={handleEmptyItem}
          onDelete={handleDeleteItem}
          textMutedColor={colors.textMuted}
        />
      );
    },
    [handleEmptyItem, handleDeleteItem, colors.textMuted]
  );

  return (
    <View style={styles.container}>
      {/* Barre compacte d'actions et de statut Étagères (gain de hauteur P1) */}
      <View style={styles.compactSubHeader}>
        <View style={styles.compactStatusRow}>
          <Text style={styles.compactStatusText} numberOfLines={1}>
            {totalCount === 0
              ? 'Aucun aliment en stock'
              : `${totalCount} aliment${totalCount > 1 ? 's' : ''} en stock`}
          </Text>
        </View>

        <View style={styles.compactActionsRow}>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              isSearchOpen && styles.actionIconBtnActive,
            ]}
            onPress={() => {
              if (onToggleSearch) {
                onToggleSearch(!isSearchOpen);
              }
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Rechercher dans mes étagères"
          >
            <Ionicons
              name={isSearchOpen ? 'search' : 'search-outline'}
              size={17}
              color={isSearchOpen ? colors.primary : colors.textPrimary}
            />
          </TouchableOpacity>

          {totalCount > 0 && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleClearStock}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Vider les étagères"
            >
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contenu défilant : Liste des aliments */}
      <View style={styles.bodyWrapper}>
        {/* Barre d'ajout fixe au sommet (ne disparaît jamais au scroll) */}
        {!isSearching && (
          <View style={styles.fixedQuickAddContainer}>
            <View style={styles.quickAddCard}>
              <View style={styles.quickAddMainRow}>
                <UnifiedIngredientInput
                  containerStyle={{ flex: 1, zIndex: 1002, overflow: 'visible' }}
                  style={styles.nameInput}
                  placeholder="Ajouter un aliment (placards, frigo, épices...)"
                  placeholderTextColor={colors.textMuted}
                  value={newItemName}
                  onChangeText={(text) => setNewItemName(text)}
                  clearOnSelect
                  keepFocusOnSelect
                  returnKeyType="done"
                  context="stock"
                  onRequestQualify={(name) => {
                    setPendingUnrecognizedName(name);
                    setIsQualifyModalVisible(true);
                  }}
                  onSubmitEditing={() => handleAddItem()}
                  onSelectIngredient={(ing) => {
                    handleAddItem(ing.canonicalName, ing.defaultAisle, ing.id);
                  }}
                />

                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !newItemName.trim() && styles.addButtonDisabled,
                  ]}
                  onPress={() => handleAddItem()}
                  disabled={!newItemName.trim()}
                  accessibilityLabel="Ajouter à mes étagères"
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
                        onPress={() => handleAddItem(sug.canonicalName, sug.defaultAisle, sug.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={14} color={colors.primary} />
                        <Text style={styles.suggestionChipText}>{sug.canonicalName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="layers-outline" size={46} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Vos étagères sont vides</Text>
                <Text style={styles.emptySubtitle}>
                  Ajoutez ce que vous avez sous la main (placards, frigo, épices...) ci-dessus pour
                  savoir toujours ce qu&apos;il vous reste et trouver des idées de recettes sans gaspiller.
                </Text>
              </View>
            </ScrollView>
          ) : (
            <SectionList
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
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
                      {filteredItems.length} aliment{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length > 1 ? 's' : ''} pour « {searchQuery.trim()} »
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
                          onPress={() => handleAddItem(sug.canonicalName, sug.defaultAisle, sug.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle" size={14} color={colors.primary} />
                          <Text style={styles.suggestionChipText}>{sug.canonicalName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : undefined
              }
              ListEmptyComponent={
                isSearching && searchQuery?.trim() ? (
                  <View style={styles.emptySearchContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="search-outline" size={38} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Aliment introuvable</Text>
                    <Text style={styles.emptySubtitle}>
                      « {searchQuery.trim()} » n&apos;est pas présent dans vos étagères.
                    </Text>

                    <TouchableOpacity
                      style={styles.searchAddBtn}
                      onPress={() => handleAddItem(searchQuery.trim())}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.searchAddBtnText}>
                        Ajouter « {searchQuery.trim()} » à mes étagères
                      </Text>
                    </TouchableOpacity>

                    {shoppingCrossCount > 0 && onNavigateToShoppingWithSearch && (
                      <TouchableOpacity
                        style={styles.searchCrossBtn}
                        onPress={() => onNavigateToShoppingWithSearch(searchQuery.trim())}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="cart-outline" size={17} color={colors.primary} />
                        <Text style={styles.searchCrossBtnText}>
                          Voir dans mes courses ({shoppingCrossCount} article{shoppingCrossCount > 1 ? 's' : ''})
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
        </View>
      </View>



      {/* Modal de qualification stricte (Passeport Ingrédient) */}
      {isQualifyModalVisible && (
        <QualifyIngredientModal
          visible={isQualifyModalVisible}
          rawName={pendingUnrecognizedName}
          context="stock"
          onClose={() => setIsQualifyModalVisible(false)}
          onSelectCanonical={(canonical) => {
            handleAddItem(canonical.canonicalName, canonical.defaultAisle, canonical.id);
            setIsQualifyModalVisible(false);
            setPendingUnrecognizedName('');
            setNewItemName('');
          }}
          onAttachAsSynonym={(canonical) => {
            handleAddItem(canonical.canonicalName, canonical.defaultAisle, canonical.id);
            setIsQualifyModalVisible(false);
            setPendingUnrecognizedName('');
            setNewItemName('');
          }}
          onCreateCanonical={(created) => {
            handleAddItem(created.canonicalName, created.defaultAisle, created.id);
            setIsQualifyModalVisible(false);
            setPendingUnrecognizedName('');
            setNewItemName('');
          }}
        />
      )}

      {/* Barre Snackbar temporaire (4 secondes) pour annuler une suppression dans Étagères */}
      {deletedSnackbar && (
        <Animated.View
          style={[
            styles.snackbarContainer,
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
                name={deletedSnackbar.action === 'transfer' ? 'cart-outline' : 'trash-outline'}
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.snackbarText} numberOfLines={1}>
                {deletedSnackbar.action === 'transfer'
                  ? `« ${deletedSnackbar.item.name} » basculé dans les courses`
                  : `« ${deletedSnackbar.item.name} » supprimé`}
              </Text>
            </View>

            <View style={styles.snackbarActions}>
              <TouchableOpacity
                style={styles.snackbarUndoBtn}
                onPress={handleUndoDelete}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Annuler la suppression"
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
    </View>
  );
};

function areFridgeStockViewPropsEqual(
  prevProps: FridgeStockViewProps,
  nextProps: FridgeStockViewProps
): boolean {
  if (prevProps.isActiveTab !== nextProps.isActiveTab) return false;
  if (prevProps.isSearchOpen !== nextProps.isSearchOpen) return false;
  if (prevProps.searchQuery !== nextProps.searchQuery) return false;

  // Si une recherche est active, vérifier si le comptage croisé depuis les courses a changé
  const nextQuery = nextProps.searchQuery?.trim();
  if (nextQuery) {
    const prevCross = prevProps.shoppingItems ? countMatchingItems(prevProps.shoppingItems, prevProps.searchQuery || '') : 0;
    const nextCross = nextProps.shoppingItems ? countMatchingItems(nextProps.shoppingItems, nextQuery) : 0;
    if (prevCross !== nextCross) return false;
  }

  if (prevProps.onNavigateToShopping !== nextProps.onNavigateToShopping) return false;
  if (prevProps.onItemCopiedToShopping !== nextProps.onItemCopiedToShopping) return false;
  if (prevProps.onFridgeCountChange !== nextProps.onFridgeCountChange) return false;
  if (prevProps.onToggleSearch !== nextProps.onToggleSearch) return false;
  if (prevProps.onNavigateToShoppingWithSearch !== nextProps.onNavigateToShoppingWithSearch) return false;

  if (!areFridgeListsEqual(prevProps.initialItems, nextProps.initialItems)) {
    return false;
  }

  return true;
}

export const FridgeStockView = React.memo(FridgeStockViewComponent, areFridgeStockViewPropsEqual);
FridgeStockView.displayName = 'FridgeStockView';

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
  },
  compactSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    minHeight: 40,
  },
  compactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  compactStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  compactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bodyWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  fixedQuickAddContainer: {
    backgroundColor: colors.background,
    zIndex: 1000,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  actionIconBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickAddCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 1000,
    overflow: 'visible',
  },
  quickAddMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1001,
    overflow: 'visible',
  },
  nameInput: {
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  pinnedSuggestionsContainer: {
    paddingTop: 8,
    paddingBottom: 6,
    marginBottom: 2,
    zIndex: 1,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
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
  searchSummaryStrip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignSelf: 'flex-start',
  },
  searchSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  searchAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 12,
    ...shadows.small,
  },
  searchAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchCrossBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  searchCrossBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  aisleSection: {
    marginBottom: 8,
  },
  aisleSectionFirst: {
    marginTop: 6,
  },
  aisleSectionNext: {
    marginTop: 22,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aisleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  aisleCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    includeFontPadding: false,
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
    paddingLeft: 30,
    paddingRight: 14,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteItemBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.55,
  },

  snackbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.isDark ? '#26332C' : '#1C2621',
    borderRadius: 14,
    overflow: 'hidden',
    zIndex: 9999,
    ...shadows.medium,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  snackbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  snackbarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  snackbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  snackbarUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  snackbarUndoText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  snackbarCloseBtn: {
    padding: 3,
  },
  snackbarTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  snackbarBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
}));
