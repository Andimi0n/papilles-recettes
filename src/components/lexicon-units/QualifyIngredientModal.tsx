import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient, AllergenFamily, ALLERGEN_FAMILIES } from '../../types/vocabulary';
import { ShoppingAisle } from '../../types/shopping';
import { AISLE_CONFIGS } from '../../utils/aisleClassifier';
import { normalizeString } from '../../utils/helpers';
import { VocabularyService } from '../../services/vocabularyService';
import { StorageService } from '../../services/storageService';
import {
  UnifiedIngredientService,
  ClosestCanonicalMatch,
} from '../../services/unifiedIngredientService';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';

export interface QualifyIngredientModalProps {
  visible: boolean;
  rawName: string;
  context?: 'stock' | 'shopping' | 'recipe' | 'search';
  onClose: () => void;
  onAttachAsSynonym?: (canonical: CanonicalIngredient, aliasAdded: string) => void;
  onSelectCanonical?: (canonical: CanonicalIngredient, meta: { wasAddedAsAlias: boolean; rawName: string }) => void;
  onCreateCanonical: (newIngredient: CanonicalIngredient) => void;
  queueProgress?: { current: number; total: number };
  cancelButtonText?: string;
}

const ALL_AISLES: ShoppingAisle[] = [
  'Fruits & Légumes',
  'Boucherie & Poissonnerie',
  'Produits Frais & Crèmerie',
  'Épicerie & Condiments',
  'Boulangerie & Pâtisserie',
  'Surgelés',
  'Boissons',
  'Autre',
];

export const QualifyIngredientModal: React.FC<QualifyIngredientModalProps> = ({
  visible,
  rawName,
  context = 'stock',
  onClose,
  onAttachAsSynonym,
  onSelectCanonical,
  onCreateCanonical,
  queueProgress,
  cancelButtonText,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  // État local du formulaire de création
  const [canonicalNameInput, setCanonicalNameInput] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle>('Épicerie & Condiments');
  const [selectedAllergen, setSelectedAllergen] = useState<AllergenFamily | null>(null);
  const [isPantryStaple, setIsPantryStaple] = useState(false);
  const [isUserAllergic, setIsUserAllergic] = useState(false);
  const [isAllergenFamilyExpanded, setIsAllergenFamilyExpanded] = useState(false);
  const [extraAliasesInput, setExtraAliasesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recherche libre d'un ingrédient parent existant
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [isParentSearchOpen, setIsParentSearchOpen] = useState(false);

  // Recherche des correspondances les plus proches
  const closestMatches: ClosestCanonicalMatch[] = useMemo(() => {
    if (!visible || !rawName || rawName.trim().length < 2) return [];
    return UnifiedIngredientService.findClosestCanonicalMatches(rawName, 3);
  }, [visible, rawName]);

  // Résultats de la recherche manuelle d'ingrédient parent
  const parentSearchResults: CanonicalIngredient[] = useMemo(() => {
    if (!parentSearchQuery || parentSearchQuery.trim().length < 2) return [];
    return VocabularyService.search(parentSearchQuery.trim(), 4);
  }, [parentSearchQuery]);

  // Initialisation lors de l'ouverture du modal pendant le render
  const [lastInitKey, setLastInitKey] = useState<string>('');
  const currentInitKey = visible && rawName ? `${rawName}_${queueProgress?.current || 0}` : '';
  if (currentInitKey && currentInitKey !== lastInitKey) {
    setLastInitKey(currentInitKey);
    const clean = rawName.trim();
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    setCanonicalNameInput(formatted);

    const defaults = UnifiedIngredientService.getSuggestedDefaults(clean);
    setSelectedAisle(defaults.suggestedAisle);
    setSelectedAllergen(defaults.suggestedAllergen);
    setIsPantryStaple(defaults.suggestedIsPantryStaple);
    setIsUserAllergic(false);
    setIsAllergenFamilyExpanded(false);
    setExtraAliasesInput('');
    setErrorMessage(null);
    setIsSubmitting(false);
    setParentSearchQuery('');
    setIsParentSearchOpen(false);
  } else if (!visible && lastInitKey) {
    setLastInitKey('');
  }

  // Action 1 : Associer à un ingrédient existant
  const handleSelectTargetIngredient = async (targetIngredient: CanonicalIngredient) => {
    setIsSubmitting(true);
    let wasAddedAsAlias = false;
    let targetToReturn = targetIngredient;

    try {
      const result = await UnifiedIngredientService.addAliasToCanonical(targetIngredient.id, rawName);
      if (result.success && result.updated) {
        wasAddedAsAlias = true;
        targetToReturn = result.updated;
      }
    } catch {
      wasAddedAsAlias = false;
    } finally {
      setIsSubmitting(false);
    }

    if (onSelectCanonical) {
      onSelectCanonical(targetToReturn, { wasAddedAsAlias, rawName: rawName.trim() });
    } else if (onAttachAsSynonym) {
      onAttachAsSynonym(targetToReturn, rawName.trim());
    }
  };

  // Détection si le terme est déjà synonyme d'un parent
  const parentWithAlias = useMemo(() => {
    if (!visible) return null;
    const nameToTest = (canonicalNameInput.trim() || rawName.trim()).toLowerCase();
    if (nameToTest.length < 2) return null;
    const norm = normalizeString(nameToTest);
    const list = VocabularyService.getSyncList();
    return (
      list.find(
        (i) => i.normalizedName !== norm && i.aliases && i.aliases.includes(norm)
      ) || null
    );
  }, [visible, canonicalNameInput, rawName]);

  // Action 2 : Promouvoir un synonyme existant
  const handlePromoteExistingAlias = async () => {
    if (!parentWithAlias) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const cleanName = canonicalNameInput.trim() || rawName.trim();
      const promoted = await VocabularyService.promoteAliasToCanonical(
        cleanName,
        selectedAisle || parentWithAlias.defaultAisle,
        undefined,
        isPantryStaple
      );
      if (selectedAllergen) {
        await VocabularyService.updateAllergenFamily(promoted.id, selectedAllergen);
      }
      await UnifiedIngredientService.linkUnrecognizedItemsToNewCanonical(promoted);
      onCreateCanonical(promoted);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de détacher ce synonyme.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 3 : Créer un nouvel ingrédient canonique
  const handleCreateNew = async () => {
    const rawAliases = extraAliasesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const trimmedRaw = rawName.trim();
    const effectiveCanonicalName = canonicalNameInput.trim() || trimmedRaw;
    if (
      trimmedRaw.length > 0 &&
      trimmedRaw.toLowerCase() !== effectiveCanonicalName.toLowerCase() &&
      !rawAliases.some((a) => a.toLowerCase() === trimmedRaw.toLowerCase())
    ) {
      rawAliases.unshift(trimmedRaw);
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await UnifiedIngredientService.registerNewCanonicalIngredient({
      canonicalName: effectiveCanonicalName,
      defaultAisle: selectedAisle,
      allergen: selectedAllergen,
      isPantryStaple,
      aliases: rawAliases,
      allowPromoteAlias: true,
    });

    setIsSubmitting(false);

    if (result.success && result.ingredient) {
      if (isUserAllergic) {
        await StorageService.addUserAllergen({
          name: result.ingredient.canonicalName,
          canonicalId: result.ingredient.id,
          allergenFamily: selectedAllergen || null,
        });
      }
      onCreateCanonical(result.ingredient);
    } else {
      setErrorMessage(result.error || "Impossible d'enregistrer cet ingrédient.");
    }
  };

  const detectedAllergen = useMemo(() => {
    if (!rawName) return null;
    return UnifiedIngredientService.getSuggestedDefaults(rawName).suggestedAllergen;
  }, [rawName]);

  const activeAllergenInfo = useMemo(
    () => ALLERGEN_FAMILIES.find((f) => f.id === selectedAllergen),
    [selectedAllergen]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} activeOpacity={1} />
        </View>

        <View style={[styles.modalCard, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          {/* EN-TÊTE COMPACT AVEC LE MOT BRUT MIS EN ÉVIDENCE */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="help-buoy-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    « {rawName} »
                  </Text>
                  {queueProgress && queueProgress.total > 1 && (
                    <View style={styles.queueBadge}>
                      <Text style={styles.queueBadgeText}>
                        {queueProgress.current} / {queueProgress.total}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.headerSubtitle}>
                  Associez-le à un aliment existant ou créez-le en 1 clic
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* CAS SPÉCIAL : DÉJÀ SYNONYME -> PROMOTION EN 1 CLIC */}
            {parentWithAlias && (
              <TouchableOpacity
                style={styles.promoteBanner}
                onPress={handlePromoteExistingAlias}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <View style={styles.promoteIconBadge}>
                  <Ionicons name="arrow-up-circle" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoteBannerTitle}>
                    Synonyme de « {parentWithAlias.canonicalName} »
                  </Text>
                  <Text style={styles.promoteBannerSubtitle}>
                    Toucher pour détacher et promouvoir en ingrédient à part entière
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {/* OPTION A : ASSOCIER À UN INGRÉDIENT EXISTANT (1-TAP) */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Option 1</Text>
                </View>
                <Text style={styles.sectionTitle}>Associer à un ingrédient existant</Text>
              </View>

              {closestMatches.length > 0 && (
                <View style={styles.compactMatchesList}>
                  {closestMatches.map((match) => {
                    const aisleConfig =
                      AISLE_CONFIGS[match.item.defaultAisle] || AISLE_CONFIGS['Autre'];
                    return (
                      <TouchableOpacity
                        key={match.item.id}
                        style={styles.compactMatchRow}
                        onPress={() => handleSelectTargetIngredient(match.item)}
                        disabled={isSubmitting}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.aisleBadge, { backgroundColor: aisleConfig.bgColor }]}>
                          <Ionicons
                            name={aisleConfig.iconName as any}
                            size={14}
                            color={aisleConfig.color}
                          />
                        </View>
                        <View style={styles.matchTextColumn}>
                          <Text style={styles.matchItemName} numberOfLines={1}>
                            {match.item.canonicalName}
                          </Text>
                          <Text style={styles.matchItemReason} numberOfLines={1}>
                            {match.item.defaultAisle} • {match.label}
                          </Text>
                        </View>
                        <View style={styles.quickSelectPill}>
                          <Ionicons name="link" size={13} color={colors.primary} />
                          <Text style={styles.quickSelectPillText}>Associer</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Recherche manuelle repliée par défaut si on a déjà des suggestions */}
              {!isParentSearchOpen && closestMatches.length > 0 ? (
                <TouchableOpacity
                  style={styles.openSearchLink}
                  onPress={() => setIsParentSearchOpen(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search-outline" size={14} color={colors.primary} />
                  <Text style={styles.openSearchLinkText}>
                    Chercher un autre aliment dans le lexique...
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.manualSearchBox}>
                  <View style={styles.manualSearchInputWrapper}>
                    <Ionicons
                      name="search"
                      size={15}
                      color={colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.manualSearchInput}
                      placeholder="Rechercher un aliment existant (ex: Oignon, Riz)..."
                      placeholderTextColor={colors.textMuted}
                      value={parentSearchQuery}
                      onChangeText={setParentSearchQuery}
                      autoCapitalize="sentences"
                      autoFocus={isParentSearchOpen}
                    />
                    {parentSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setParentSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {parentSearchResults.length > 0 && (
                    <View style={styles.parentSearchResultsList}>
                      {parentSearchResults.map((parent) => {
                        const aisleConfig =
                          AISLE_CONFIGS[parent.defaultAisle] || AISLE_CONFIGS['Autre'];
                        return (
                          <TouchableOpacity
                            key={parent.id}
                            style={styles.parentSearchItem}
                            onPress={() => handleSelectTargetIngredient(parent)}
                            disabled={isSubmitting}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[styles.aisleBadge, { backgroundColor: aisleConfig.bgColor }]}
                            >
                              <Ionicons
                                name={aisleConfig.iconName as any}
                                size={12}
                                color={aisleConfig.color}
                              />
                            </View>
                            <View style={styles.matchTextColumn}>
                              <Text style={styles.parentSearchName}>{parent.canonicalName}</Text>
                              <Text style={styles.parentSearchAisle}>{parent.defaultAisle}</Text>
                            </View>
                            <View style={styles.quickSelectPill}>
                              <Text style={styles.quickSelectPillText}>Associer</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* OPTION B : CRÉER COMME NOUVEL INGRÉDIENT (COMPACT) */}
            <View style={styles.passportSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.stepBadge, styles.stepBadgeSecondary]}>
                  <Text style={styles.stepBadgeText}>Option 2</Text>
                </View>
                <Text style={styles.sectionTitle}>Ou créer un nouvel ingrédient</Text>
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errorBoxText}>{errorMessage}</Text>
                </View>
              )}

              {/* Nom canonique */}
              <View style={styles.inlineInputRow}>
                <Text style={styles.inlineLabel}>Nom :</Text>
                <TextInput
                  style={styles.compactTextInput}
                  value={canonicalNameInput}
                  onChangeText={setCanonicalNameInput}
                  placeholder="Nom au singulier..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="sentences"
                />
              </View>

              {/* Rayon (1 ligne scrollable) */}
              <Text style={styles.fieldLabel}>Rayon :</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.aislesScroll}
              >
                {ALL_AISLES.map((aisle) => {
                  const isSelected = selectedAisle === aisle;
                  const config = AISLE_CONFIGS[aisle];
                  return (
                    <TouchableOpacity
                      key={aisle}
                      style={[
                        styles.aisleChip,
                        isSelected && {
                          backgroundColor: config.bgColor,
                          borderColor: config.color,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => setSelectedAisle(aisle)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={config.iconName as any}
                        size={13}
                        color={isSelected ? config.color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.aisleChipText,
                          isSelected && { color: config.color, fontWeight: '700' },
                        ]}
                      >
                        {aisle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* PUCES D'OPTIONS RAPIDES SUR UNE SEULE LIGNE (Remplace les gros blocs Switch) */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Options rapides :</Text>
              <View style={styles.quickTogglesRow}>
                {/* 1. Fond de placard */}
                <TouchableOpacity
                  style={[
                    styles.togglePill,
                    isPantryStaple && {
                      backgroundColor: colors.primary + '18',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setIsPantryStaple(!isPantryStaple)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isPantryStaple ? 'checkbox' : 'cube-outline'}
                    size={14}
                    color={isPantryStaple ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.togglePillText,
                      isPantryStaple && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    En placard
                  </Text>
                </TouchableOpacity>

                {/* 2. Allergie personnelle */}
                <TouchableOpacity
                  style={[
                    styles.togglePill,
                    isUserAllergic && {
                      backgroundColor: colors.danger + '18',
                      borderColor: colors.danger,
                    },
                  ]}
                  onPress={() => setIsUserAllergic(!isUserAllergic)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isUserAllergic ? 'warning' : 'shield-outline'}
                    size={14}
                    color={isUserAllergic ? colors.danger : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.togglePillText,
                      isUserAllergic && { color: colors.danger, fontWeight: '700' },
                    ]}
                  >
                    Allergique
                  </Text>
                </TouchableOpacity>

                {/* 3. Famille INCO */}
                <TouchableOpacity
                  style={[
                    styles.togglePill,
                    (selectedAllergen || detectedAllergen) && {
                      borderColor: colors.amber || '#D97706',
                      backgroundColor: colors.amberLight || '#FEF3C7',
                    },
                  ]}
                  onPress={() => setIsAllergenFamilyExpanded(!isAllergenFamilyExpanded)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.togglePillText}>
                    {activeAllergenInfo
                      ? `${activeAllergenInfo.emoji} ${activeAllergenInfo.name}`
                      : 'Allergène INCO ▾'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Synonymes additionnels (toujours visibles) */}
              <View style={[styles.inlineInputRow, { marginTop: 10, marginBottom: 2 }]}>
                <Text style={styles.inlineLabel}>Synonymes :</Text>
                <TextInput
                  style={styles.compactTextInput}
                  value={extraAliasesInput}
                  onChangeText={setExtraAliasesInput}
                  placeholder="séparés par virgules"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Accordéon Famille d'allergènes INCO (déplié à la demande) */}
              {isAllergenFamilyExpanded && (
                <View style={styles.expandedBox}>
                  <View style={styles.allergenWrap}>
                    <TouchableOpacity
                      style={[
                        styles.allergenChip,
                        selectedAllergen === null && styles.allergenChipSelected,
                      ]}
                      onPress={() => setSelectedAllergen(null)}
                    >
                      <Text
                        style={[
                          styles.allergenName,
                          selectedAllergen === null && styles.allergenNameSelected,
                        ]}
                      >
                        ✓ Aucun allergène
                      </Text>
                    </TouchableOpacity>
                    {ALLERGEN_FAMILIES.map((family) => {
                      const isSelected = selectedAllergen === family.id;
                      const isSuggested = detectedAllergen === family.id;
                      return (
                        <TouchableOpacity
                          key={family.id}
                          style={[
                            styles.allergenChip,
                            isSelected && styles.allergenChipSelected,
                            !isSelected && isSuggested && styles.allergenChipSuggested,
                          ]}
                          onPress={() => setSelectedAllergen(isSelected ? null : family.id)}
                        >
                          <Text style={styles.allergenEmoji}>{family.emoji}</Text>
                          <Text
                            style={[
                              styles.allergenName,
                              isSelected && styles.allergenNameSelected,
                            ]}
                          >
                            {family.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* STICKY FOOTER : TOUJOURS VISIBLE EN UN COUP D'ŒIL SANS SCROLLER */}
          <View style={styles.stickyFooter}>
            <TouchableOpacity
              style={styles.cancelFooterBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>
                {cancelButtonText || (context === 'shopping' ? 'Ignorer' : 'Annuler')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createFooterBtn, isSubmitting && styles.createBtnDisabled]}
              onPress={handleCreateNew}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.createBtnText} numberOfLines={1}>
                Créer « {canonicalNameInput.trim() || rawName.trim()} »
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors) => ({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...Platform.select({
      web: { position: 'fixed' as any },
      default: { position: 'absolute' },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  queueBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  queueBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  promoteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  promoteIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoteBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  promoteBannerSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  sectionBlock: {
    backgroundColor: colors.primary + '08',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '22',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeSecondary: {
    backgroundColor: colors.textSecondary,
  },
  stepBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  compactMatchesList: {
    gap: 6,
  },
  compactMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aisleBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  matchTextColumn: {
    flex: 1,
    marginRight: 8,
  },
  matchItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  matchItemReason: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  quickSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '16',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  quickSelectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  openSearchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    paddingBottom: 2,
  },
  openSearchLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  manualSearchBox: {
    marginTop: 6,
  },
  manualSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 36,
  },
  manualSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  parentSearchResultsList: {
    marginTop: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  parentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  parentSearchName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  parentSearchAisle: {
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  passportSection: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger + '15',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorBoxText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inlineLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  compactTextInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  aislesScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  aisleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aisleChipText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  quickTogglesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  togglePillText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  expandedBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  allergenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  allergenChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  allergenChipSuggested: {
    borderColor: colors.primary + '60',
    backgroundColor: colors.primary + '08',
  },
  allergenEmoji: {
    fontSize: 11.5,
  },
  allergenName: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  allergenNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  cancelFooterBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  createFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
