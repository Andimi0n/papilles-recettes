import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SectionList,
  Alert,
  Modal,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle, ShoppingItem } from '../types/shopping';
import { Recipe } from '../types/recipe';
import { CanonicalIngredient } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS, ALL_AISLES, classifyIngredientAisle } from '../utils/aisleClassifier';
import { normalizeString } from '../utils/helpers';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { filterIngredientItems, countMatchingItems } from '../utils/ingredientSearchMatcher';
import { VocabularyService } from '../services/vocabularyService';
import { UnifiedIngredientInput } from './UnifiedIngredientInput';
import {
  UnifiedIngredientService,
} from '../services/unifiedIngredientService';
import { QualifyIngredientModal } from './QualifyIngredientModal';

interface FridgeStockViewProps {
  recipes: Recipe[];
  onSelectRecipe?: (recipe: Recipe) => void;
  onNavigateToShopping?: () => void;
  onItemCopiedToShopping?: (name: string) => void;
  onFridgeCountChange?: (count: number) => void;
  onNavigateToDoableRecipes?: () => void;
  searchQuery?: string;
  isSearchOpen?: boolean;
  onToggleSearch?: (open: boolean) => void;
  shoppingItems?: ShoppingItem[];
  onNavigateToShoppingWithSearch?: (query: string) => void;
}

export const FridgeStockView: React.FC<FridgeStockViewProps> = ({
  recipes,
  onSelectRecipe,
  onNavigateToShopping,
  onItemCopiedToShopping,
  onFridgeCountChange,
  onNavigateToDoableRecipes,
  searchQuery = '',
  isSearchOpen = false,
  onToggleSearch,
  shoppingItems = [],
  onNavigateToShoppingWithSearch,
}) => {
  const { isDark, colors } = useTheme();
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle | null>(null);
  const [isAislePickerVisible, setIsAislePickerVisible] = useState(false);
  const [justCopiedId, setJustCopiedId] = useState<string | null>(null);
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');
  const [canonicalVocabulary, setCanonicalVocabulary] = useState<CanonicalIngredient[]>(() =>
    VocabularyService.getSyncList()
  );

  // Snackbar d'annulation de suppression temporaire (4 secondes)
  const [deletedSnackbar, setDeletedSnackbar] = useState<{
    item: FridgeItem;
    index: number;
  } | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletedItemRef = useRef<{ item: FridgeItem; index: number } | null>(null);
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

  // Ajouts rapides rétractables au défilement (haute performance, 60fps via useNativeDriver)
  const [quickAddHeight, setQuickAddHeight] = useState(140);
  const [quickAddAnim] = useState(() => new Animated.Value(1));
  const isQuickAddVisibleRef = useRef(true);
  const [isQuickAddVisible, setIsQuickAddVisible] = useState(true);

  const isAnimatingRef = useRef(false);
  const prevScrollY = useRef(0);
  const scrollDeltaAcc = useRef(0);

  const showQuickAdd = useCallback(() => {
    if (!isQuickAddVisibleRef.current && !isAnimatingRef.current) {
      isQuickAddVisibleRef.current = true;
      setIsQuickAddVisible(true);
      isAnimatingRef.current = true;
      Animated.timing(quickAddAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
        scrollDeltaAcc.current = 0;
      });
    }
  }, [quickAddAnim]);

  const forceShowQuickAdd = useCallback(() => {
    isQuickAddVisibleRef.current = true;
    setIsQuickAddVisible(true);
    isAnimatingRef.current = false;
    quickAddAnim.stopAnimation();
    Animated.timing(quickAddAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      scrollDeltaAcc.current = 0;
    });
  }, [quickAddAnim]);

  const hideQuickAdd = useCallback(() => {
    if (isQuickAddVisibleRef.current && !isAnimatingRef.current) {
      isQuickAddVisibleRef.current = false;
      isAnimatingRef.current = true;
      Animated.timing(quickAddAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false;
        setIsQuickAddVisible(false);
        scrollDeltaAcc.current = 0;
      });
    }
  }, [quickAddAnim]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - prevScrollY.current;
      prevScrollY.current = currentY;

      // Tout en haut de la liste : toujours afficher et réinitialiser
      if (currentY <= 35) {
        scrollDeltaAcc.current = 0;
        if (!isQuickAddVisibleRef.current) {
          showQuickAdd();
        }
        return;
      }

      if (isAnimatingRef.current) {
        scrollDeltaAcc.current = 0;
        return;
      }

      if (Math.abs(diff) < 1.5) {
        return;
      }

      // Défilement vers le bas
      if (diff > 0) {
        if (scrollDeltaAcc.current < 0) {
          scrollDeltaAcc.current = 0;
        }
        scrollDeltaAcc.current += diff;

        if (scrollDeltaAcc.current > 70 && isQuickAddVisibleRef.current && currentY > 60) {
          hideQuickAdd();
        }
      }
      // Défilement vers le haut
      else if (diff < 0) {
        if (scrollDeltaAcc.current > 0) {
          scrollDeltaAcc.current = 0;
        }
        scrollDeltaAcc.current += diff;

        if (scrollDeltaAcc.current < -65 && !isQuickAddVisibleRef.current) {
          showQuickAdd();
        }
      }
    },
    [hideQuickAdd, showQuickAdd]
  );

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

  // Chargement et synchronisation du stock et du vocabulaire canonique
  useEffect(() => {
    loadStock();
    VocabularyService.getAll().then((vocab) => {
      setCanonicalVocabulary(vocab);
    });

    const unsubFridge = StorageService.onFridgeChange((updatedStock) => {
      setItems(updatedStock);
      if (onFridgeCountChange) {
        onFridgeCountChange(updatedStock.length);
      }
    });

    const unsubVocab = VocabularyService.onVocabularyCascade(async () => {
      await loadStock();
      const updatedVocab = await VocabularyService.getAll();
      setCanonicalVocabulary(updatedVocab);
    });

    return () => {
      unsubFridge();
      unsubVocab();
    };
  }, [loadStock, onFridgeCountChange]);

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
    filteredItems.forEach((item) => {
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
  const handlePressPlus = () => {
    handleAddItem();
  };

  const handleAddItem = async (nameToAdd?: string, aisleToAdd?: ShoppingAisle, canonicalIdToAdd?: string) => {
    forceShowQuickAdd();
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
      selectedAisle ||
      (resolvedCanonicalId
        ? canonicalVocabulary.find((c) => c.id === resolvedCanonicalId)?.defaultAisle
        : undefined) ||
      classifyIngredientAisle(name);

    try {
      const updated = await StorageService.addFridgeItem(name, resolvedAisle, resolvedCanonicalId);
      setItems(updated);
      VocabularyService.incrementUsage(resolvedCanonicalId || name).catch(() => {});
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
    const itemToDelete = items.find((it) => it.id === id);
    if (!itemToDelete) return;
    const itemIndex = items.findIndex((it) => it.id === id);

    // Si une suppression était déjà en attente dans le snackbar, on la persiste tout de suite
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      StorageService.removeFridgeItem(pendingDeletedItemRef.current.item.id).catch(() => {});
    }

    // Retrait optimiste de la liste affichée
    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    if (onFridgeCountChange) {
      onFridgeCountChange(updated.length);
    }
    pendingDeletedItemRef.current = { item: itemToDelete, index: itemIndex };
    setDeletedSnackbar({ item: itemToDelete, index: itemIndex });

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
      } catch (e) {
        console.error('Erreur suppression persistée fridgeItem:', e);
      }
      setDeletedSnackbar(null);
      pendingDeletedItemRef.current = null;
      snackbarTimerRef.current = null;
    }, 4000);
  };

  const handleUndoDelete = async () => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    const info = pendingDeletedItemRef.current || deletedSnackbar;
    if (!info) return;

    setItems((prev) => {
      const updated = [...prev];
      const insertIdx = Math.min(Math.max(0, info.index), updated.length);
      updated.splice(insertIdx, 0, info.item);
      StorageService.saveFridgeItems(updated).catch(() => {});
      if (onFridgeCountChange) {
        onFridgeCountChange(updated.length);
      }
      return updated;
    });

    setDeletedSnackbar(null);
    pendingDeletedItemRef.current = null;
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
      {/* En-tête Étagères avec titre, recherche et bouton vider */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Mes Étagères</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount === 0
              ? 'Aucun aliment en stock'
              : `${totalCount} aliment${totalCount > 1 ? 's' : ''} en stock`}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              isSearchOpen && styles.actionIconBtnActive,
              totalCount > 0 ? { marginRight: 8 } : null,
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
              size={19}
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
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contenu défilant : Bannière recettes + Liste des aliments */}
      <View style={styles.bodyWrapper}>
        {totalCount === 0 ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              !isSearching && { paddingTop: quickAddHeight + 8 },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
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
          </ScrollView>
        ) : (
          <SectionList
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              !isSearching && { paddingTop: quickAddHeight + 8 },
            ]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            sections={groupedByAisle.map(g => ({ title: g.aisle, data: g.items }))}
            keyExtractor={(item, index) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={15}
            windowSize={5}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          ListHeaderComponent={
            isSearching && searchQuery?.trim() ? (
              <View style={styles.searchSummaryStrip}>
                <Text style={styles.searchSummaryText}>
                  {filteredItems.length} aliment{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length > 1 ? 's' : ''} pour « {searchQuery.trim()} »
                </Text>
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
                  « {searchQuery.trim()} » n'est pas présent dans vos étagères.
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
          renderSectionHeader={({ section: { title, data } }) => {
            const aisle = title as ShoppingAisle;
            const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
            return (
              <View style={styles.aisleSection}>
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
          }}
          renderItem={({ item, index, section }) => {
            const isCopied = justCopiedId === item.id;
            const isLast = index === section.data.length - 1;
            const aisle = section.title as ShoppingAisle;
            const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
            return (
              <View style={index === 0 ? [styles.itemsCard, {borderBottomLeftRadius: isLast ? 14 : 0, borderBottomRightRadius: isLast ? 14 : 0}] : isLast ? [styles.itemsCard, {borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, elevation: 0, shadowOpacity: 0}] : [styles.itemsCard, {borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0}]}>
                <View
                  style={[
                    styles.itemRow,
                    !isLast && styles.itemRowBorder,
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
              </View>
            );
          }}
        />
      )}

        {/* Bloc d'ajouts rapides rétractable au défilement (masqué pendant la recherche) */}
        {!isSearching && (
          <Animated.View
            style={[
              styles.collapsibleQuickAddContainer,
              {
                transform: [
                  {
                    translateY: quickAddAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-quickAddHeight, 0],
                    }),
                  },
                ],
                opacity: quickAddAnim.interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, 0.2, 1],
                }),
              },
            ]}
            pointerEvents={isQuickAddVisible ? 'auto' : 'none'}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - quickAddHeight) > 2) {
                setQuickAddHeight(h);
              }
            }}
          >
            <View style={styles.quickAddCard}>
              <View style={styles.quickAddMainRow}>
                <UnifiedIngredientInput
                  containerStyle={{ flex: 1, zIndex: 1002, overflow: 'visible' }}
                  style={styles.nameInput}
                  placeholder="Ajouter un aliment (placards, frigo, épices...)"
                  placeholderTextColor={colors.textMuted}
                  value={newItemName}
                  onChangeText={(text) => {
                    setNewItemName(text);
                    forceShowQuickAdd();
                  }}
                  onFocus={() => forceShowQuickAdd()}
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

            {/* Ajout rapide (suggestions d'indispensables) */}
            {availableSuggestions.length > 0 && newItemName.trim().length === 0 && (
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
          </Animated.View>
        )}
      </View>

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

      {/* Modal de qualification stricte (Passeport Ingrédient) */}
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
              <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
              <Text style={styles.snackbarText} numberOfLines={1}>
                « {deletedSnackbar.item.name} » supprimé
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
  bodyWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  collapsibleQuickAddContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    zIndex: 1000,
    elevation: 6,
    paddingTop: 4,
    paddingBottom: 2,
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
  actionIconBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  quickAddCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 1000,
    ...shadows.small,
    elevation: 10,
    overflow: 'visible',
  },
  quickAddMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1001,
    overflow: 'visible',
  },
  nameInput: {
    height: 48,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
    zIndex: 1,
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  emptyDoableContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyDoableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDoableSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
