import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';
import { VocabularyService } from '../services/vocabularyService';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { normalizeString } from '../utils/helpers';

interface VocabularyManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const VocabularyManagerModal: React.FC<VocabularyManagerModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const [items, setItems] = useState<CanonicalIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<string>('Tous');

  // État du modal d'édition / création
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CanonicalIngredient | null>(null);
  const [formName, setFormName] = useState('');
  const [formAisle, setFormAisle] = useState<ShoppingAisle>('Épicerie & Condiments');
  const [formAliases, setFormAliases] = useState('');
  const [formIsPantryStaple, setFormIsPantryStaple] = useState(false);

  // État du modal de fusion
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<CanonicalIngredient | null>(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const all = await VocabularyService.getAll();
      setItems(all);
    } catch (e) {
      console.error('Erreur chargement lexique:', e);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Filtrage des ingrédients
  const filteredItems = useMemo(() => {
    const q = normalizeString(searchQuery);
    return items.filter((item) => {
      let matchAisle = false;
      if (selectedAisle === 'Tous') {
        matchAisle = true;
      } else if (selectedAisle === '📦 Dans les placards') {
        matchAisle = Boolean(item.isPantryStaple);
      } else {
        matchAisle = item.defaultAisle === selectedAisle;
      }
      if (!matchAisle) return false;

      if (!q) return true;

      if (item.normalizedName.includes(q)) return true;
      if (item.canonicalName.toLowerCase().includes(q)) return true;
      return item.aliases.some((a) => a.includes(q));
    });
  }, [items, searchQuery, selectedAisle]);

  // Actions CRUD
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormAisle('Épicerie & Condiments');
    setFormAliases('');
    setFormIsPantryStaple(false);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: CanonicalIngredient) => {
    setEditingItem(item);
    setFormName(item.canonicalName);
    setFormAisle(item.defaultAisle);
    setFormAliases(item.aliases.filter((a) => a !== item.normalizedName).join(', '));
    setFormIsPantryStaple(Boolean(item.isPantryStaple));
    setIsEditModalOpen(true);
  };

  const handleToggleStaple = async (item: CanonicalIngredient) => {
    try {
      await VocabularyService.togglePantryStaple(item.id);
      await loadData();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier cet ingrédient.');
    }
  };

  const handleSaveItem = async () => {
    const cleanName = formName.trim();
    if (!cleanName) {
      Alert.alert('Nom requis', 'Veuillez saisir le nom de l\'ingrédient.');
      return;
    }

    const aliasesArray = formAliases
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingItem) {
        await VocabularyService.update(editingItem.id, {
          canonicalName: cleanName,
          defaultAisle: formAisle,
          aliases: aliasesArray,
          isPantryStaple: formIsPantryStaple,
        });
      } else {
        await VocabularyService.add({
          canonicalName: cleanName,
          defaultAisle: formAisle,
          aliases: aliasesArray,
          isCustom: true,
          isPantryStaple: formIsPantryStaple,
        });
      }

      await loadData();
      setIsEditModalOpen(false);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible d\'enregistrer cet ingrédient.');
    }
  };

  const handleDeleteItem = (item: CanonicalIngredient) => {
    Alert.alert(
      'Supprimer l\'ingrédient',
      `Êtes-vous sûr de vouloir supprimer "${item.canonicalName}" du lexique ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyService.delete(item.id);
              await loadData();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'ingrédient.');
            }
          },
        },
      ]
    );
  };

  const handlePromoteAlias = (alias: string, parent: CanonicalIngredient) => {
    Alert.alert(
      'Créer un ingrédient distinct',
      `Souhaitez-vous détacher "${alias}" de "${parent.canonicalName}" et l'enregistrer comme ingrédient canonique à part entière avec ses propres synonymes ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Détacher & Créer',
          onPress: async () => {
            try {
              await VocabularyService.promoteAliasToCanonical(alias, parent.defaultAisle);
              await loadData();
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de détacher ce synonyme.');
            }
          },
        },
      ]
    );
  };

  const handleOpenMerge = (source: CanonicalIngredient) => {
    setMergeSource(source);
    setMergeTargetSearch('');
    setIsMergeModalOpen(true);
  };

  const handleConfirmMerge = async (target: CanonicalIngredient) => {
    if (!mergeSource) return;

    Alert.alert(
      'Confirmer la fusion',
      `Fusionner "${mergeSource.canonicalName}" dans "${target.canonicalName}" ? Les synonymes seront transférés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Fusionner',
          onPress: async () => {
            try {
              await VocabularyService.merge(mergeSource.id, target.id);
              await loadData();
              setIsMergeModalOpen(false);
              setMergeSource(null);
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Échec de la fusion.');
            }
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Réinitialiser le lexique',
      'Cette action rechargera les ~350 ingrédients canoniques d\'origine. Vos modifications personnalisées seront écrasées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyService.resetToDefaults();
              await loadData();
              Alert.alert('Succès', 'Le lexique d\'ingrédients a été réinitialisé.');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de réinitialiser le lexique.');
            }
          },
        },
      ]
    );
  };

  const mergeCandidates = useMemo(() => {
    if (!mergeSource) return [];
    const q = normalizeString(mergeTargetSearch);
    return items.filter(
      (i) => i.id !== mergeSource.id && (!q || i.normalizedName.includes(q))
    ).slice(0, 10);
  }, [items, mergeSource, mergeTargetSearch]);

  const aisleOptions = ['Tous', '📦 Dans les placards', ...ALL_AISLES];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>Lexique des Ingrédients</Text>
              <Text style={styles.headerSubtitle}>
                {items.length} termes canoniques • Strictement normalisés
              </Text>
            </View>

            <TouchableOpacity onPress={handleOpenAdd} style={styles.addBtn} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un ingrédient ou synonyme..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtres par Rayon */}
          <View style={styles.aisleFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aisleScroll}>
              {aisleOptions.map((aisle) => {
                const isSelected = selectedAisle === aisle;
                return (
                  <TouchableOpacity
                    key={aisle}
                    style={[styles.aislePill, isSelected && styles.aislePillActive]}
                    onPress={() => setSelectedAisle(aisle)}
                  >
                    <Text style={[styles.aislePillText, isSelected && styles.aislePillTextActive]}>
                      {aisle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Liste des ingrédients canoniques */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            renderItem={({ item }) => {
              const aisleConfig = AISLE_CONFIGS[item.defaultAisle] || AISLE_CONFIGS['Autre'];
              const displayedAliases = item.aliases.filter((a) => a !== item.normalizedName);

              return (
                <View style={styles.itemCard}>
                  <View style={styles.itemHeaderRow}>
                    <View style={[styles.aisleIconBox, { backgroundColor: aisleConfig.bgColor }]}>
                      <Ionicons name={aisleConfig.iconName as any} size={14} color={aisleConfig.color} />
                    </View>

                    <View style={styles.itemTitleCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.itemCanonicalName}>{item.canonicalName}</Text>
                        {item.isCustom && (
                          <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Perso</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.stapleToggleBadge,
                            item.isPantryStaple && styles.stapleToggleBadgeActive,
                          ]}
                          onPress={() => handleToggleStaple(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="archive-outline"
                            size={10}
                            color={item.isPantryStaple ? colors.primary : colors.textMuted}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.stapleToggleBadgeText,
                              item.isPantryStaple && styles.stapleToggleBadgeTextActive,
                            ]}
                          >
                            {item.isPantryStaple ? 'En placard' : '+ Placard'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.itemAisleName}>{item.defaultAisle}</Text>
                    </View>

                    {/* Boutons d'action */}
                    <View style={styles.itemActionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenMerge(item)}
                        accessibilityLabel="Fusionner"
                      >
                        <Ionicons name="git-merge-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenEdit(item)}
                        accessibilityLabel="Modifier"
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteItem(item)}
                        accessibilityLabel="Supprimer"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Liste des alias / synonymes */}
                  {displayedAliases.length > 0 && (
                    <View style={styles.aliasContainer}>
                      <Text style={styles.aliasLabel}>Synonymes reconnus :</Text>
                      <View style={styles.aliasTagsRow}>
                        {displayedAliases.slice(0, 4).map((alias) => (
                          <TouchableOpacity
                            key={alias}
                            style={styles.aliasTag}
                            onPress={() => handlePromoteAlias(alias, item)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.aliasTagText}>{alias}</Text>
                            <Ionicons name="sparkles-outline" size={10} color={colors.primary} style={{ marginLeft: 3 }} />
                          </TouchableOpacity>
                        ))}
                        {displayedAliases.length > 4 && (
                          <TouchableOpacity
                            style={styles.aliasMoreTag}
                            onPress={() => handleOpenEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.aliasMoreText}>+{displayedAliases.length - 4}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="nutrition-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aucun ingrédient correspondant</Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footerContainer}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetDefaults}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.danger} />
                  <Text style={styles.resetBtnText}>Réinitialiser le lexique aux valeurs d'usine</Text>
                </TouchableOpacity>
              </View>
            }
          />

          {/* MODAL D'AJOUT / MODIFICATION D'UN INGRÉDIENT */}
          <Modal
            visible={isEditModalOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setIsEditModalOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editDialogCard}>
                <Text style={styles.dialogTitle}>
                  {editingItem ? 'Modifier l\'ingrédient' : 'Ajouter un ingrédient'}
                </Text>

                <Text style={styles.fieldLabel}>Nom canonique (officiel)</Text>
                <TextInput
                  style={styles.dialogInput}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Ex: Petits pois, Carotte, Muscade"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="sentences"
                />

                <Text style={styles.fieldLabel}>Rayon de supermarché</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dialogAisleRow}>
                  {ALL_AISLES.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[
                        styles.dialogAislePill,
                        formAisle === a && styles.dialogAislePillActive,
                      ]}
                      onPress={() => setFormAisle(a)}
                    >
                      <Text
                        style={[
                          styles.dialogAislePillText,
                          formAisle === a && styles.dialogAislePillTextActive,
                        ]}
                      >
                        {a}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.fieldLabel}>Synonymes & Alias (séparés par une virgule)</Text>
                <TextInput
                  style={[styles.dialogInput, { height: 60 }]}
                  value={formAliases}
                  onChangeText={setFormAliases}
                  placeholder="Ex: petit pois, pois, boite de petits pois"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                {/* Option Dans les placards */}
                <TouchableOpacity
                  style={[
                    styles.dialogToggleRow,
                    formIsPantryStaple && styles.dialogToggleRowActive,
                  ]}
                  onPress={() => setFormIsPantryStaple(!formIsPantryStaple)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dialogToggleLeft}>
                    <Text style={styles.dialogToggleTitle}>📦 Ingrédient de placard / Assaisonnement</Text>
                    <Text style={styles.dialogToggleSubtitle}>
                      Considéré présent par défaut en cuisine (sel, poivre, huiles, épices). Placé dans la section "Dans vos placards" des recettes.
                    </Text>
                  </View>
                  <View style={[styles.switchCircle, formIsPantryStaple && styles.switchCircleActive]}>
                    {formIsPantryStaple && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

                <View style={styles.dialogBtnRow}>
                  <TouchableOpacity
                    style={styles.dialogCancelBtn}
                    onPress={() => setIsEditModalOpen(false)}
                  >
                    <Text style={styles.dialogCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dialogConfirmBtn} onPress={handleSaveItem}>
                    <Text style={styles.dialogConfirmText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* MODAL DE FUSION DE DEUX INGRÉDIENTS */}
          <Modal
            visible={isMergeModalOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setIsMergeModalOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.editDialogCard}>
                <Text style={styles.dialogTitle}>Fusionner un ingrédient</Text>
                <Text style={styles.dialogSubtitle}>
                  Fusionner "{mergeSource?.canonicalName}" dans un autre ingrédient cible.
                </Text>

                <TextInput
                  style={styles.dialogInput}
                  placeholder="Rechercher l'ingrédient cible..."
                  placeholderTextColor={colors.textMuted}
                  value={mergeTargetSearch}
                  onChangeText={setMergeTargetSearch}
                />

                <ScrollView style={{ maxHeight: 180, marginVertical: 8 }}>
                  {mergeCandidates.map((cand) => (
                    <TouchableOpacity
                      key={cand.id}
                      style={styles.mergeCandidateRow}
                      onPress={() => handleConfirmMerge(cand)}
                    >
                      <Text style={styles.mergeCandidateName}>{cand.canonicalName}</Text>
                      <Text style={styles.mergeCandidateAisle}>{cand.defaultAisle}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.dialogCancelBtn, { marginTop: 10 }]}
                  onPress={() => setIsMergeModalOpen(false)}
                >
                  <Text style={styles.dialogCancelText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 14,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  aisleFilterContainer: {
    marginBottom: 6,
  },
  aisleScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  aislePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aislePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  aislePillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  aislePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  itemCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aisleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTitleCol: {
    flex: 1,
  },
  itemCanonicalName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  stapleToggleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  stapleToggleBadgeActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  stapleToggleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stapleToggleBadgeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  itemAisleName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  aliasContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
  },
  aliasLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  aliasTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aliasTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
  aliasTagText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  aliasMoreTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  aliasMoreText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.danger + '10',
  },
  resetBtnText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editDialogCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dialogSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  dialogInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  dialogAisleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dialogAislePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 6,
  },
  dialogAislePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dialogAislePillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dialogAislePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dialogToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
    marginTop: 12,
  },
  dialogToggleRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  dialogToggleLeft: {
    flex: 1,
    marginRight: 10,
  },
  dialogToggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dialogToggleSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  switchCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  dialogCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dialogConfirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogConfirmText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mergeCandidateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  mergeCandidateName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mergeCandidateAisle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
}));
