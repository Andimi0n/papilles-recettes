import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { FridgeItem } from '../types/fridge';
import { StorageService } from '../services/storageService';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { formatQuantityWithUnit } from '../constants/units';
import { normalizeString } from '../utils/helpers';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface InStoreShoppingModalProps {
  visible: boolean;
  items: ShoppingItem[];
  fridgeItems: FridgeItem[];
  onClose: () => void;
  onItemsChange: (updated: ShoppingItem[]) => void;
  onStockUpdated?: (updatedFridgeCount: number) => void;
}

export const InStoreShoppingModal: React.FC<InStoreShoppingModalProps> = ({
  visible,
  items,
  fridgeItems,
  onClose,
  onItemsChange,
  onStockUpdated,
}) => {
  const { colors, isDark } = useTheme();
  const [hideChecked, setHideChecked] = useState(false);
  const [quickItemText, setQuickItemText] = useState('');

  // Indexation du stock pour détection O(1) de présence dans les étagères
  const stockCanonicalSet = useMemo(() => {
    return new Set(fridgeItems.map((f) => f.canonicalId).filter(Boolean));
  }, [fridgeItems]);

  const stockNameSet = useMemo(() => {
    return new Set(fridgeItems.map((f) => normalizeString(f.name)));
  }, [fridgeItems]);

  const isItemInStock = (item: ShoppingItem): boolean => {
    if (item.canonicalId && stockCanonicalSet.has(item.canonicalId)) {
      return true;
    }
    return stockNameSet.has(normalizeString(item.name));
  };

  const totalCount = items.length;
  const completedItems = useMemo(() => items.filter((i) => i.isChecked), [items]);
  const completedCount = completedItems.length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtrage selon la bascule "Masquer les pris"
  const visibleItems = useMemo(() => {
    if (hideChecked) {
      return items.filter((i) => !i.isChecked);
    }
    return items;
  }, [items, hideChecked]);

  // Groupement par rayon, trié alphabétiquement par nom
  const sections = useMemo(() => {
    const grouped: Record<ShoppingAisle, ShoppingItem[]> = {
      'Fruits & Légumes': [],
      'Boucherie & Poissonnerie': [],
      'Produits Frais & Crèmerie': [],
      'Boulangerie & Pâtisserie': [],
      'Épicerie & Condiments': [],
      'Surgelés': [],
      'Boissons': [],
      'Autre': [],
    };

    visibleItems.forEach((item) => {
      const aisle = item.aisle || 'Autre';
      if (!grouped[aisle]) {
        grouped[aisle] = [];
      }
      grouped[aisle].push(item);
    });

    return ALL_AISLES.filter((a) => grouped[a] && grouped[a].length > 0).map((a) => ({
      title: a,
      data: grouped[a].sort((x, y) => x.name.localeCompare(y.name, 'fr', { sensitivity: 'base' })),
    }));
  }, [visibleItems]);

  // Cocher / décocher un article
  const handleToggle = async (id: string) => {
    const updated = items.map((it) => (it.id === id ? { ...it, isChecked: !it.isChecked } : it));
    onItemsChange(updated);
    try {
      await StorageService.toggleShoppingItem(id);
    } catch {
      // Tolérance offline
    }
  };

  // Ajout rapide direct depuis le mode course
  const handleQuickAdd = async () => {
    const trimmed = quickItemText.trim();
    if (!trimmed) return;
    try {
      const updated = await StorageService.addFreeformShoppingItem(trimmed, null);
      onItemsChange(updated);
      setQuickItemText('');
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter cet article.");
    }
  };

  // Ranger les articles cochés dans les étagères
  const handleStorePurchasesInShelves = async () => {
    if (completedCount === 0) return;

    try {
      const namesToStore = completedItems.map((i) => i.name);
      const updatedFridge = await StorageService.addMultipleFridgeItems(namesToStore);
      const updatedList = await StorageService.clearCompletedShoppingItems();

      onItemsChange(updatedList);
      if (onStockUpdated) {
        onStockUpdated(updatedFridge.length);
      }

      Alert.alert(
        'Achats rangés ! 🥫',
        `${namesToStore.length} article${namesToStore.length > 1 ? 's' : ''} ajouté${namesToStore.length > 1 ? 's' : ''} à vos étagères.`
      );

      if (updatedList.length === 0) {
        onClose();
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de ranger vos articles dans les étagères.');
    }
  };

  // Quitter avec proposition intelligente de rangement
  const handleRequestClose = () => {
    if (completedCount > 0) {
      Alert.alert(
        'Ranger vos achats ?',
        `Vous avez coché ${completedCount} article${completedCount > 1 ? 's' : ''}. Souhaitez-vous les ranger dans vos étagères ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Quitter sans ranger',
            style: 'destructive',
            onPress: onClose,
          },
          {
            text: 'Ranger dans mes étagères 🥫',
            style: 'default',
            onPress: async () => {
              await handleStorePurchasesInShelves();
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* En-tête épuré et contrasté */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleRequestClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Quitter le mode course"
          >
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleCenter}>
            <Text style={styles.headerTitle}>Mode Course</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount} sur {totalCount} pris • {remainingCount} restant{remainingCount > 1 ? 's' : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.filterPillBtn,
              hideChecked && styles.filterPillBtnActive,
            ]}
            onPress={() => setHideChecked((prev) => !prev)}
            activeOpacity={0.75}
            accessibilityLabel="Masquer les articles pris"
          >
            <Ionicons
              name={hideChecked ? 'eye-off' : 'eye-outline'}
              size={16}
              color={hideChecked ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Barre de progression fine et nette */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Checklist géante zoomée */}
        {totalCount === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-done-circle" size={56} color={colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Panier terminé !</Text>
            <Text style={styles.emptySubtitle}>
              Tous vos articles de courses ont été cochés ou votre liste est vide.
            </Text>
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.finishBtnText}>Revenir à la liste</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            style={styles.listArea}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: completedCount > 0 ? 150 : 95 },
            ]}
            sections={sections}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            keyboardShouldPersistTaps="handled"
            renderSectionHeader={({ section: { title, data } }) => {
              const aisle = title as ShoppingAisle;
              const cfg = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
              const remainingInSection = data.filter((i) => !i.isChecked).length;

              return (
                <View style={styles.aisleHeaderRow}>
                  <View
                    style={[
                      styles.aisleIconBox,
                      { backgroundColor: isDark ? cfg.color + '26' : cfg.bgColor },
                    ]}
                  >
                    <Ionicons name={cfg.iconName as any} size={18} color={cfg.color} />
                  </View>
                  <Text style={[styles.aisleTitle, { color: cfg.color }]}>{aisle}</Text>
                  <View style={styles.aisleBadge}>
                    <Text style={styles.aisleBadgeText}>
                      {remainingInSection > 0 ? `${remainingInSection} restant${remainingInSection > 1 ? 's' : ''}` : 'Terminé ✓'}
                    </Text>
                  </View>
                </View>
              );
            }}
            renderItem={({ item, index, section }) => {
              const inStock = isItemInStock(item);
              const isLast = index === section.data.length - 1;

              return (
                <TouchableOpacity
                  style={[
                    styles.itemCard,
                    item.isChecked && styles.itemCardChecked,
                    !isLast && styles.itemCardBorder,
                  ]}
                  onPress={() => handleToggle(item.id)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.isChecked }}
                >
                  {/* Très grande case à cocher tactile pour le pouce */}
                  <View style={styles.checkboxContainer}>
                    <Ionicons
                      name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={32}
                      color={item.isChecked ? colors.secondary : colors.border}
                    />
                  </View>

                  {/* Nom zoomé et métadonnées */}
                  <View style={styles.itemTextCol}>
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
                        <View style={styles.qtyBadge}>
                          <Text
                            style={[
                              styles.qtyBadgeText,
                              item.isChecked && styles.qtyBadgeTextChecked,
                            ]}
                          >
                            {formatQuantityWithUnit(item.quantity, item.unit)}
                          </Text>
                        </View>
                      )}

                      {/* Indicateur rassurant : déjà présent dans le stock à la maison */}
                      {inStock && (
                        <View style={styles.inStockBadge}>
                          <Ionicons name="layers" size={11} color={colors.secondary} />
                          <Text style={styles.inStockBadgeText}>Déjà en stock</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Barre fixe en bas : ajout rapide compact et rangement des achats */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomBarWrapper}
        >
          <View style={styles.bottomBar}>
            {completedCount > 0 && (
              <TouchableOpacity
                style={styles.storePurchasesBtn}
                onPress={handleStorePurchasesInShelves}
                activeOpacity={0.85}
              >
                <Ionicons name="layers" size={18} color="#FFFFFF" />
                <Text style={styles.storePurchasesBtnText}>
                  Ranger dans mes étagères ({completedCount})
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                value={quickItemText}
                onChangeText={setQuickItemText}
                placeholder="Ajouter un article oublié..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleQuickAdd}
              />
              <TouchableOpacity
                style={[
                  styles.quickAddBtn,
                  !quickItemText.trim() && styles.quickAddBtnDisabled,
                ]}
                onPress={handleQuickAdd}
                disabled={!quickItemText.trim()}
                activeOpacity={0.8}
                accessibilityLabel="Ajouter l'article"
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  filterPillBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillBtnActive: {
    backgroundColor: colors.primary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    gap: 8,
  },
  aisleIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  aisleBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aisleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 64,
    ...shadows.small,
  },
  itemCardChecked: {
    backgroundColor: colors.surfaceAlt + '80',
    borderColor: colors.borderLight,
    opacity: 0.65,
  },
  itemCardBorder: {
    //
  },
  checkboxContainer: {
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
  },
  itemNameChecked: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  qtyBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  qtyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  qtyBadgeTextChecked: {
    color: colors.textMuted,
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inStockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  recipeTitleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  finishBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    ...shadows.small,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
    ...shadows.card,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickAddInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  quickAddBtnDisabled: {
    opacity: 0.45,
  },
  storePurchasesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingVertical: 11,
    borderRadius: 12,
    ...shadows.small,
  },
  storePurchasesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
}));
