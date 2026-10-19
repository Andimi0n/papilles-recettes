import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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
import { StorageService } from '../services/storageService';
import { Colors, Shadows } from '../theme/colors';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { groupItemsByAisle, formatShoppingListForShare } from '../utils/shoppingAggregator';

interface ShoppingListScreenProps {
  onNavigateToRecipes?: () => void;
  onNavigateToPlanner?: () => void;
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  onNavigateToRecipes,
  onNavigateToPlanner,
}) => {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulaire d'ajout rapide
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle | null>(null);
  const [isAislePickerVisible, setIsAislePickerVisible] = useState(false);

  // Section des articles cochés repliée/dépliée
  const [showCompleted, setShowCompleted] = useState(false);

  // Chargement de la liste
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

  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  // Statistiques
  const totalCount = items.length;
  const completedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items]);
  const activeItems = useMemo(() => items.filter((i) => !i.isChecked), [items]);
  const completedItems = useMemo(() => items.filter((i) => i.isChecked), [items]);

  // Groupement par rayon des articles actifs
  const groupedActive = useMemo(() => groupItemsByAisle(activeItems), [activeItems]);

  // Actions utilisateur
  const handleToggleItem = async (id: string) => {
    // Mise à jour optimiste immédiate
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

  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    try {
      const updated = await StorageService.addCustomShoppingItem(
        trimmedName,
        newItemQuantity.trim() || undefined,
        newItemUnit.trim() || undefined,
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

  const handleClearCompleted = () => {
    if (completedCount === 0) return;
    Alert.alert(
      'Nettoyer les courses',
      `Supprimer définitivement les ${completedCount} article(s) coché(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
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
        // Fallback vers le partage natif si WhatsApp n'est pas installé
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
      {/* En-tête principal */}
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
            <Ionicons name="share-social-outline" size={21} color={Colors.textPrimary} />
          </TouchableOpacity>

          {completedCount > 0 && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleClearCompleted}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Nettoyer les articles cochés"
            >
              <Ionicons name="sparkles-outline" size={20} color={Colors.secondary} />
            </TouchableOpacity>
          )}

          {totalCount > 0 && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleClearAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Vider toute la liste"
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
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

      {/* Quick Add Bar */}
      <View style={styles.quickAddCard}>
        <View style={styles.quickAddMainRow}>
          <TextInput
            style={styles.nameInput}
            placeholder="Ajouter un article (ex: Pommes, Lait...)"
            placeholderTextColor={Colors.textMuted}
            value={newItemName}
            onChangeText={setNewItemName}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[
              styles.addButton,
              !newItemName.trim() && styles.addButtonDisabled,
            ]}
            onPress={handleAddItem}
            disabled={!newItemName.trim()}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Détails complémentaires : Quantité & Unité & Rayon */}
        <View style={styles.quickAddDetailsRow}>
          <TextInput
            style={styles.qtyInput}
            placeholder="Qté (ex: 2, 500)"
            placeholderTextColor={Colors.textMuted}
            value={newItemQuantity}
            onChangeText={setNewItemQuantity}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.unitInput}
            placeholder="Unité (g, ml, pièces)"
            placeholderTextColor={Colors.textMuted}
            value={newItemUnit}
            onChangeText={setNewItemUnit}
          />
          <TouchableOpacity
            style={styles.aislePickerBtn}
            onPress={() => setIsAislePickerVisible(true)}
          >
            <Ionicons
              name={selectedAisle ? AISLE_CONFIGS[selectedAisle].iconName as any : 'funnel-outline'}
              size={14}
              color={selectedAisle ? AISLE_CONFIGS[selectedAisle].color : Colors.textSecondary}
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
            <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de partage direct rapide (WhatsApp, SMS, etc.) */}
      {totalCount > 0 && (
        <View style={styles.shareStrip}>
          <Text style={styles.shareStripLabel}>Partager la liste :</Text>
          <TouchableOpacity
            style={[styles.sharePill, { backgroundColor: '#E7FCE9' }]}
            onPress={handleShareWhatsApp}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#16A34A" />
            <Text style={[styles.sharePillText, { color: '#16A34A' }]}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sharePill, { backgroundColor: '#EFF6FF' }]}
            onPress={handleShareSMS}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbox-ellipses-outline" size={15} color="#2563EB" />
            <Text style={[styles.sharePillText, { color: '#2563EB' }]}>SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sharePill, { backgroundColor: Colors.surfaceAlt }]}
            onPress={handleNativeShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={15} color={Colors.textSecondary} />
            <Text style={[styles.sharePillText, { color: Colors.textSecondary }]}>Autre</Text>
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
              <Ionicons name="cart-outline" size={48} color={Colors.primary} />
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
                  onPress={onNavigateToRecipes}
                  activeOpacity={0.85}
                >
                  <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyActionBtnText}>Voir mes recettes</Text>
                </TouchableOpacity>
              )}

              {onNavigateToPlanner && (
                <TouchableOpacity
                  style={[styles.emptyActionBtn, styles.emptyActionBtnSecondary]}
                  onPress={onNavigateToPlanner}
                  activeOpacity={0.85}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <Text style={styles.emptyActionBtnSecondaryText}>Menu semaine</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <>
            {/* Rayons contenant des articles actifs */}
            {groupedActive.map(({ aisle, items: aisleItems }) => {
              const cfg = AISLE_CONFIGS[aisle];
              return (
                <View key={aisle} style={styles.aisleSection}>
                  {/* Titre du rayon avec badge et icône */}
                  <View style={styles.aisleHeaderRow}>
                    <View style={[styles.aisleIconBox, { backgroundColor: cfg.bgColor }]}>
                      <Ionicons name={cfg.iconName as any} size={16} color={cfg.color} />
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
                            size={24}
                            color={item.isChecked ? Colors.secondary : Colors.border}
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
                          <Ionicons name="close" size={18} color={Colors.textMuted} />
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
                    <Ionicons name="checkmark-done" size={18} color={Colors.secondary} />
                    <Text style={styles.completedHeaderText}>
                      Articles déjà pris ({completedItems.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showCompleted ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textSecondary}
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
                            size={24}
                            color={Colors.secondary}
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

                        <TouchableOpacity
                          style={styles.deleteItemBtn}
                          onPress={() => handleDeleteItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={17} color={Colors.danger} />
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
              <Ionicons name="sparkles-outline" size={20} color={Colors.primary} />
              <Text style={styles.aisleModalOptionText}>Détection automatique intelligente</Text>
              {selectedAisle === null && (
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
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
                    <View style={[styles.aisleIconBox, { backgroundColor: cfg.bgColor }]}>
                      <Ionicons name={cfg.iconName as any} size={16} color={cfg.color} />
                    </View>
                    <Text style={styles.aisleModalOptionText}>{aisle}</Text>
                    {isSel && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 10,
  },
  progressBarTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
    minWidth: 32,
    textAlign: 'right',
  },
  quickAddCard: {
    backgroundColor: Colors.cardBackground,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  quickAddMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  unitInput: {
    flex: 1.2,
    height: 34,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  aislePickerBtn: {
    flex: 1.5,
    height: 34,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  aislePickerBtnText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  shareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  shareStripLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  aisleSection: {
    marginBottom: 16,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  aisleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aisleTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  aisleCountBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aisleCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  itemsCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.small,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    color: Colors.textPrimary,
  },
  itemNameChecked: {
    color: Colors.textMuted,
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  itemQuantityChecked: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  itemOrigin: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteItemBtn: {
    padding: 6,
  },
  completedSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.surfaceAlt,
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
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...Shadows.small,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyActionBtnSecondary: {
    backgroundColor: Colors.primaryLight,
  },
  emptyActionBtnSecondaryText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.primaryLight,
  },
  aisleModalOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
