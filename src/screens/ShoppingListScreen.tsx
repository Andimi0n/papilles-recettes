import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  SectionList,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { FridgeItem } from '../types/fridge';
import { CanonicalIngredient } from '../types/vocabulary';
import { Recipe } from '../types/recipe';
import { StorageService } from '../services/storageService';
import { VocabularyService } from '../services/vocabularyService';
import {
  UnifiedIngredientService,
} from '../services/unifiedIngredientService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { groupItemsByAisle, formatShoppingListForShare } from '../utils/shoppingAggregator';
import { normalizeString } from '../utils/helpers';
import { filterIngredientItems, countMatchingItems } from '../utils/ingredientSearchMatcher';
import { FridgeStockView } from '../components/FridgeStockView';
import { IngredientSearchBar } from '../components/IngredientSearchBar';
import { InStoreShoppingModal } from '../components/InStoreShoppingModal';
import { UnifiedIngredientInput } from '../components/UnifiedIngredientInput';
import { UnitQuickPicker } from '../components/UnitQuickPicker';
import { UnitPickerModal } from '../components/UnitPickerModal';
import { formatQuantityWithUnit, isStandardUnit, normalizeUnit } from '../constants/units';

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
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const [fridgeCount, setFridgeCount] = useState<number>(0);

  // Recherche ergonomique unifiée Étagères ↔ Courses
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isInStoreModeVisible, setIsInStoreModeVisible] = useState(false);

  // Synchronise si initialTab change depuis l'extérieur
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Formulaire d'ajout rapide courses (saisie libre intelligente)
  const [newItemText, setNewItemText] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle | null>(null);
  const [isAislePickerVisible, setIsAislePickerVisible] = useState(false);
  const [isUnitModalVisible, setIsUnitModalVisible] = useState(false);

  // Section des articles cochés repliée/dépliée
  const [showCompleted, setShowCompleted] = useState(false);

  // Snackbar d'annulation de suppression temporaire (4 secondes)
  const [deletedSnackbar, setDeletedSnackbar] = useState<{
    item: ShoppingItem;
    index: number;
  } | null>(null);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletedItemRef = useRef<{ item: ShoppingItem; index: number } | null>(null);
  const [snackbarAnim] = useState(() => new Animated.Value(1));

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
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    loadShoppingList();
    loadFridgeItems();

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

  // Statistiques et filtrage
  const totalCount = items.length;
  const completedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items]);
  const activeItems = useMemo(() => items.filter((i) => !i.isChecked), [items]);
  const completedItems = useMemo(
    () => [...items.filter((i) => i.isChecked)].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [items]
  );

  const isSearching = Boolean(isSearchActive || (searchQuery && searchQuery.trim().length > 0));

  const filteredActiveItems = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return activeItems;
    return filterIngredientItems(activeItems, searchQuery);
  }, [activeItems, searchQuery]);

  const filteredCompletedItems = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return completedItems;
    return filterIngredientItems(completedItems, searchQuery);
  }, [completedItems, searchQuery]);

  const totalFilteredCount = filteredActiveItems.length + filteredCompletedItems.length;

  // Groupement par rayon des articles actifs (filtrés si recherche)
  const groupedActive = useMemo(() => groupItemsByAisle(filteredActiveItems), [filteredActiveItems]);

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
    const itemToDelete = items.find((it) => it.id === id);
    if (!itemToDelete) return;
    const itemIndex = items.findIndex((it) => it.id === id);

    // Si une suppression était déjà en attente dans le snackbar, on la persiste tout de suite
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
      snackbarTimerRef.current = null;
    }
    if (pendingDeletedItemRef.current) {
      StorageService.deleteShoppingItem(pendingDeletedItemRef.current.item.id).catch(() => {});
    }

    // Retrait optimiste de la liste affichée
    setItems((prev) => prev.filter((it) => it.id !== id));
    pendingDeletedItemRef.current = { item: itemToDelete, index: itemIndex };
    setDeletedSnackbar({ item: itemToDelete, index: itemIndex });

    // Animation de la jauge sur 4 secondes (4000ms)
    snackbarAnim.setValue(1);
    Animated.timing(snackbarAnim, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: false,
    }).start();

    // Délai de 4 secondes avant confirmation définitive
    snackbarTimerRef.current = setTimeout(async () => {
      try {
        await StorageService.deleteShoppingItem(id);
      } catch (e) {
        console.error('Erreur suppression persistée shoppingItem:', e);
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
      StorageService.saveShoppingList(updated).catch(() => {});
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
      const updated = await StorageService.addFreeformShoppingItem(trimmed, selectedAisle);
      setItems(updated);
      setNewItemText('');
      setSelectedAisle(null);
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
      const updated = await StorageService.addFreeformShoppingItem(textToAdd, selectedAisle || ing.defaultAisle);
      setItems(updated);
      setNewItemText('');
      setSelectedAisle(null);
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

  const handleQuickUnitPress = (unitId: string) => {
    if (!unitId) return;
    const trimmed = newItemText.trim();
    if (!trimmed) {
      setNewItemText(`1${unitId} `);
      return;
    }

    if (/^[0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?$/i.test(trimmed)) {
      setNewItemText(`${trimmed}${unitId} `);
      return;
    }

    if (!/^[0-9]/.test(trimmed)) {
      setNewItemText(`1${unitId} ${trimmed}`);
      return;
    }

    const match = trimmed.match(/^([0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?)\s+(.*)$/);
    if (match) {
      setNewItemText(`${match[1]}${unitId} ${match[2]}`);
      return;
    }

    setNewItemText(`${trimmed} ${unitId} `);
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
          searchQuery={searchQuery}
          isSearchOpen={isSearchActive}
          onToggleSearch={(open) => setIsSearchActive(open)}
          shoppingItems={items}
          onNavigateToShoppingWithSearch={(q) => {
            setActiveTab('shopping');
            setIsSearchActive(true);
            setSearchQuery(q);
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
              {totalCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.actionIconBtn,
                    { backgroundColor: colors.secondaryLight, borderColor: colors.secondary + '40' },
                  ]}
                  onPress={() => setIsInStoreModeVisible(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Lancer le mode course"
                >
                  <Ionicons name="cart" size={19} color={colors.secondary} />
                </TouchableOpacity>
              )}

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
                  size={19}
                  color={isSearchActive ? colors.primary : colors.textPrimary}
                />
              </TouchableOpacity>

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

          {/* Barre de progression si articles présents (masquée pendant la recherche) */}
          {!isSearching && totalCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressPercent}%</Text>
            </View>
          )}

          {/* Barre d'ajout rapide vérouillée en haut (masquée pendant la recherche) */}
          {!isSearching && (
            <View style={styles.quickAddCard}>
              <View style={styles.quickAddMainRow}>
                <UnifiedIngredientInput
                  containerStyle={{ flex: 1, zIndex: 99 }}
                  style={styles.nameInput}
                  placeholder="Ex: 1kg carottes, 6 œufs, Coca-cola, lessive..."
                  placeholderTextColor={colors.textMuted}
                  value={newItemText}
                  onChangeText={setNewItemText}
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
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Options d'appoint : Rayon forcé & Puces d'unités 1-tap */}
              <View style={styles.quickOptionsRow}>
                <TouchableOpacity
                  style={[
                    styles.aislePickerBtn,
                    selectedAisle ? { borderColor: AISLE_CONFIGS[selectedAisle].color } : null,
                  ]}
                  onPress={() => setIsAislePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      selectedAisle
                        ? (AISLE_CONFIGS[selectedAisle].iconName as any)
                        : 'funnel-outline'
                    }
                    size={12}
                    color={selectedAisle ? AISLE_CONFIGS[selectedAisle].color : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.aislePickerBtnText,
                      selectedAisle ? { color: AISLE_CONFIGS[selectedAisle].color, fontWeight: '700' } : null,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedAisle || 'Rayon auto'}
                  </Text>
                  <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.unitPickerFlexContainer}>
                  <UnitQuickPicker
                    value={''}
                    onChangeUnit={(unitId) => handleQuickUnitPress(unitId)}
                    onOpenFullPicker={() => setIsUnitModalVisible(true)}
                    compact
                  />
                </View>
              </View>
            </View>
          )}

          {/* Ajout rapide en 1 clic vérouillé sous le bloc d'ajout (masqué pendant la recherche) */}
          {!isSearching && availableSuggestions.length > 0 && (
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

          {/* Barre de partage rapide direct (masquée pendant la recherche) */}
          {!isSearching && totalCount > 0 && (
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

          {/* Accès rapide au Mode Course en magasin (ultra-épuré & zoomé) */}
          {totalCount > 0 && !isSearching && (
            <TouchableOpacity
              style={styles.inStoreBanner}
              onPress={() => setIsInStoreModeVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.inStoreBannerLeft}>
                <View style={styles.inStoreBannerIconBox}>
                  <Ionicons name="cart" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.inStoreBannerTextCol}>
                  <Text style={styles.inStoreBannerTitle}>Mode Course en Magasin</Text>
                  <Text style={styles.inStoreBannerSubtitle}>
                    Vue zoomée avec checklist & liaison étagères pour vos achats
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.secondary} />
            </TouchableOpacity>
          )}

          {/* Contenu principal : liste par rayons */}
          {totalCount === 0 ? (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
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
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              sections={groupedActive.map(g => ({ title: g.aisle, data: g.items }))}
              keyExtractor={(item, index) => item.id}
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={5}
              ListHeaderComponent={
                isSearching && searchQuery?.trim() ? (
                  <View style={styles.searchSummaryStrip}>
                    <Text style={styles.searchSummaryText}>
                      {totalFilteredCount} article{totalFilteredCount > 1 ? 's' : ''} trouvé{totalFilteredCount > 1 ? 's' : ''}
                      {filteredCompletedItems.length > 0 ? ` (dont ${filteredCompletedItems.length} déjà coché${filteredCompletedItems.length > 1 ? 's' : ''})` : ''} pour « {searchQuery.trim()} »
                    </Text>
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
              renderSectionHeader={({ section: { title, data } }) => {
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
              }}
              renderItem={({ item, index, section }) => {
                const isLast = index === section.data.length - 1;
                return (
                  <View style={index === 0 ? [styles.itemsCard, {borderBottomLeftRadius: isLast ? 14 : 0, borderBottomRightRadius: isLast ? 14 : 0}] : isLast ? [styles.itemsCard, {borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0, elevation: 0, shadowOpacity: 0}] : [styles.itemsCard, {borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0}]}>
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
                              {formatQuantityWithUnit(item.quantity, item.unit)}
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
                  </View>
                );
              }}
              ListFooterComponent={
                filteredCompletedItems.length > 0 ? (
                  <View style={styles.completedSection}>
                    <TouchableOpacity
                      style={styles.completedHeader}
                      onPress={() => setShowCompleted((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.completedHeaderLeft}>
                        <Ionicons name="checkmark-done" size={17} color={colors.secondary} />
                        <Text style={styles.completedHeaderText}>
                          Articles déjà pris ({filteredCompletedItems.length})
                        </Text>
                      </View>
                      <Ionicons
                        name={showCompleted || isSearching ? 'chevron-up' : 'chevron-down'}
                        size={17}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {(showCompleted || isSearching) && (
                      <View style={styles.itemsCard}>
                        {filteredCompletedItems.map((item, index) => (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              index < filteredCompletedItems.length - 1 && styles.itemRowBorder,
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
                                  {formatQuantityWithUnit(item.quantity, item.unit)}
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
                ) : undefined
              }
            />
          )}
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

      {/* Modal de sélection d'unités complètes */}
      <UnitPickerModal
        visible={isUnitModalVisible}
        currentUnit={''}
        onSelectUnit={(u) => handleQuickUnitPress(u)}
        onClose={() => setIsUnitModalVisible(false)}
        title="Ajouter une unité"
      />

      {/* Mode Course en magasin (ultra-épuré, zoomé avec checklist & lien étagères) */}
      <InStoreShoppingModal
        visible={isInStoreModeVisible}
        items={items}
        fridgeItems={fridgeItems}
        onClose={() => setIsInStoreModeVisible(false)}
        onItemsChange={(updated) => setItems(updated)}
        onStockUpdated={(newCount) => setFridgeCount(newCount)}
      />

      {/* Barre Snackbar temporaire (4 secondes) pour annuler une suppression dans Courses */}
      {deletedSnackbar && (
        <View style={styles.snackbarContainer}>
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
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
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
  actionIconBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  inStoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    ...shadows.small,
  },
  inStoreBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inStoreBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inStoreBannerTextCol: {
    flex: 1,
  },
  inStoreBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inStoreBannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
  quickOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  aislePickerBtn: {
    height: 30,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aislePickerBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  unitPickerFlexContainer: {
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
    zIndex: 1,
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
    paddingVertical: 36,
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
