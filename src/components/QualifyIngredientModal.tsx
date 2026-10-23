import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient, AllergenFamily, ALLERGEN_FAMILIES } from '../types/vocabulary';
import { ShoppingAisle } from '../types/shopping';
import { AISLE_CONFIGS } from '../utils/aisleClassifier';
import { VocabularyService } from '../services/vocabularyService';
import {
  UnifiedIngredientService,
  ClosestCanonicalMatch,
} from '../services/unifiedIngredientService';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';

export interface QualifyIngredientModalProps {
  visible: boolean;
  rawName: string;
  context?: 'stock' | 'shopping' | 'recipe' | 'search';
  onClose: () => void;
  onAttachAsSynonym: (canonical: CanonicalIngredient, aliasAdded: string) => void;
  onCreateCanonical: (newIngredient: CanonicalIngredient) => void;
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
  onCreateCanonical,
}) => {
  const { colors, isDark } = useTheme();

  // État local du formulaire de création
  const [canonicalNameInput, setCanonicalNameInput] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<ShoppingAisle>('Épicerie & Condiments');
  const [selectedAllergen, setSelectedAllergen] = useState<AllergenFamily | null>(null);
  const [isPantryStaple, setIsPantryStaple] = useState(false);
  const [extraAliasesInput, setExtraAliasesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recherche libre d'un ingrédient parent existant pour association de synonyme
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [isParentSearchOpen, setIsParentSearchOpen] = useState(false);

  // Recherche des correspondances les plus proches
  const closestMatches: ClosestCanonicalMatch[] = useMemo(() => {
    if (!visible || !rawName || rawName.trim().length < 2) return [];
    return UnifiedIngredientService.findClosestCanonicalMatches(rawName, 4);
  }, [visible, rawName]);

  // Résultats de la recherche manuelle d'ingrédient parent
  const parentSearchResults: CanonicalIngredient[] = useMemo(() => {
    if (!parentSearchQuery || parentSearchQuery.trim().length < 2) return [];
    return VocabularyService.search(parentSearchQuery.trim(), 4);
  }, [parentSearchQuery]);

  // Initialisation dès que le modal s'ouvre avec un nouveau nom
  useEffect(() => {
    if (visible && rawName) {
      const clean = rawName.trim();
      const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
      setCanonicalNameInput(formatted);

      const defaults = UnifiedIngredientService.getSuggestedDefaults(clean);
      setSelectedAisle(defaults.suggestedAisle);
      setSelectedAllergen(defaults.suggestedAllergen);
      setIsPantryStaple(defaults.suggestedIsPantryStaple);
      setExtraAliasesInput('');
      setErrorMessage(null);
      setIsSubmitting(false);
      setParentSearchQuery('');
      setIsParentSearchOpen(false);
    }
  }, [visible, rawName]);

  // Action : Associer comme synonyme à un ingrédient donné
  const handleSelectSynonym = async (targetIngredient: CanonicalIngredient) => {
    setIsSubmitting(true);
    const result = await UnifiedIngredientService.addAliasToCanonical(targetIngredient.id, rawName);
    setIsSubmitting(false);

    if (result.success && result.updated) {
      onAttachAsSynonym(result.updated, rawName.trim());
      onClose();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible d\'ajouter ce synonyme.');
    }
  };

  // Action : Créer un nouvel ingrédient canonique
  const handleCreateNew = async () => {
    const rawAliases = extraAliasesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await UnifiedIngredientService.registerNewCanonicalIngredient({
      canonicalName: canonicalNameInput,
      defaultAisle: selectedAisle,
      allergen: selectedAllergen,
      isPantryStaple,
      aliases: rawAliases,
    });

    setIsSubmitting(false);

    if (result.success && result.ingredient) {
      onCreateCanonical(result.ingredient);
      onClose();
    } else {
      setErrorMessage(result.error || 'Impossible d\'enregistrer cet ingrédient.');
    }
  };

  const detectedAllergen = useMemo(() => {
    if (!rawName) return null;
    return UnifiedIngredientService.getSuggestedDefaults(rawName).suggestedAllergen;
  }, [rawName]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} activeOpacity={1} />
        </View>

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>Qualifier l'ingrédient</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  « {rawName} » n'est pas encore au lexique
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* SECTION 1 : SUGGESTIONS ET RECHERCHE DE SYNONYMES */}
            <View style={styles.synonymsSection}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="link-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  Associer « {rawName} » comme synonyme
                </Text>
              </View>

              {closestMatches.length > 0 && (
                <>
                  <Text style={styles.sectionExplanation}>
                    Suggestions d'aliments proches trouvées dans le lexique :
                  </Text>
                  <View style={styles.matchesList}>
                    {closestMatches.map((match) => {
                      const aisleConfig = AISLE_CONFIGS[match.item.defaultAisle] || AISLE_CONFIGS['Autre'];
                      return (
                        <View key={match.item.id} style={styles.matchCard}>
                          <View style={styles.matchCardHeader}>
                            <View style={[styles.aisleBadge, { backgroundColor: aisleConfig.bgColor }]}>
                              <Ionicons name={aisleConfig.iconName as any} size={13} color={aisleConfig.color} />
                            </View>
                            <View style={styles.matchTextColumn}>
                              <Text style={styles.matchItemName}>{match.item.canonicalName}</Text>
                              <Text style={styles.matchItemReason}>
                                {match.label} ({match.item.defaultAisle})
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.matchActionBtn}
                            onPress={() => handleSelectSynonym(match.item)}
                            disabled={isSubmitting}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add-circle" size={16} color={colors.primary} />
                            <Text style={styles.matchActionBtnText}>
                              Associer comme synonyme de « {match.item.canonicalName} »
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Barre de recherche manuelle d'un aliment existant */}
              <View style={styles.manualSearchContainer}>
                <Text style={styles.manualSearchPrompt}>
                  {closestMatches.length > 0
                    ? 'Ou rechercher un autre aliment du lexique auquel l\'associer :'
                    : 'Rechercher l\'ingrédient officiel auquel rattacher ce synonyme :'}
                </Text>
                <View style={styles.manualSearchInputWrapper}>
                  <Ionicons name="search" size={15} color={colors.textMuted} style={styles.manualSearchIcon} />
                  <TextInput
                    style={styles.manualSearchInput}
                    placeholder="Ex: Veau, Oignon, Riz..."
                    placeholderTextColor={colors.textMuted}
                    value={parentSearchQuery}
                    onChangeText={setParentSearchQuery}
                    autoCapitalize="sentences"
                  />
                  {parentSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setParentSearchQuery('')} style={styles.manualSearchClear}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {parentSearchResults.length > 0 && (
                  <View style={styles.parentSearchResultsList}>
                    {parentSearchResults.map((parent) => {
                      const aisleConfig = AISLE_CONFIGS[parent.defaultAisle] || AISLE_CONFIGS['Autre'];
                      return (
                        <TouchableOpacity
                          key={parent.id}
                          style={styles.parentSearchItem}
                          onPress={() => handleSelectSynonym(parent)}
                          disabled={isSubmitting}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.aisleBadge, { backgroundColor: aisleConfig.bgColor }]}>
                            <Ionicons name={aisleConfig.iconName as any} size={12} color={aisleConfig.color} />
                          </View>
                          <View style={styles.matchTextColumn}>
                            <Text style={styles.parentSearchName}>{parent.canonicalName}</Text>
                            <Text style={styles.parentSearchAisle}>{parent.defaultAisle}</Text>
                          </View>
                          <View style={styles.parentSearchAction}>
                            <Ionicons name="add-circle" size={16} color={colors.primary} />
                            <Text style={styles.parentSearchActionText}>Associer</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* SECTION 2 : CRÉATION D'UN NOUVEL INGRÉDIENT (PASSEPORT) */}
            <View style={styles.passportSection}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  Ou créer « {rawName} » comme nouvel ingrédient :
                </Text>
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorBoxText}>{errorMessage}</Text>
                </View>
              )}

              {/* 1. Nom canonique standardisé */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Nom officiel canonique (singulier standardisé) :</Text>
                <TextInput
                  style={styles.textInput}
                  value={canonicalNameInput}
                  onChangeText={setCanonicalNameInput}
                  placeholder="Ex: Topinambour, Sumac..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="sentences"
                />
              </View>

              {/* 2. Rayon de supermarché */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Rayon de supermarché :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aislesScroll}>
                  {ALL_AISLES.map((aisle) => {
                    const isSelected = selectedAisle === aisle;
                    const config = AISLE_CONFIGS[aisle];
                    return (
                      <TouchableOpacity
                        key={aisle}
                        style={[
                          styles.aisleChip,
                          isSelected && { backgroundColor: config.bgColor, borderColor: config.color, borderWidth: 1.5 },
                        ]}
                        onPress={() => setSelectedAisle(aisle)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={config.iconName as any}
                          size={14}
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
              </View>

              {/* 3. Déclaration d'allergène obligatoire (Sécurité Sanitaire) */}
              <View style={styles.formGroup}>
                <View style={styles.allergenHeaderRow}>
                  <Text style={styles.fieldLabel}>Déclaration d'allergène (obligatoire) :</Text>
                  {detectedAllergen && (
                    <View style={styles.hintBadge}>
                      <Ionicons name="sparkles" size={11} color={colors.primary} />
                      <Text style={styles.hintBadgeText}>Suggestion détectée</Text>
                    </View>
                  )}
                </View>

                {/* Choix 1 : Aucun allergène */}
                <TouchableOpacity
                  style={[
                    styles.noAllergenBtn,
                    selectedAllergen === null && styles.noAllergenBtnSelected,
                  ]}
                  onPress={() => setSelectedAllergen(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={selectedAllergen === null ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={selectedAllergen === null ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.noAllergenBtnText,
                      selectedAllergen === null && styles.noAllergenBtnTextSelected,
                    ]}
                  >
                    Aucun allergène majeur (produit sûr)
                  </Text>
                </TouchableOpacity>

                {/* Choix 2 : Les 14 familles d'allergènes INCO */}
                <Text style={styles.subFieldLabel}>Ou sélectionner la famille d'allergène concernée :</Text>
                <View style={styles.allergenWrap}>
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
                        onPress={() => setSelectedAllergen(family.id)}
                        activeOpacity={0.7}
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

              {/* 4. Fond de placard */}
              <View style={styles.stapleRow}>
                <View style={styles.stapleTextGroup}>
                  <View style={styles.stapleTitleRow}>
                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                    <Text style={styles.stapleTitle}>Ingrédient toujours en réserve</Text>
                  </View>
                  <Text style={styles.stapleSubtitle}>
                    Fond de placard exclu par défaut de la liste de courses (sel, poivre, huiles, épices usuelles).
                  </Text>
                </View>
                <Switch
                  value={isPantryStaple}
                  onValueChange={setIsPantryStaple}
                  trackColor={{ false: colors.borderLight, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* 5. Synonymes additionnels (optionnels) */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Synonymes additionnels (facultatif, séparés par virgules) :</Text>
                <TextInput
                  style={styles.textInput}
                  value={extraAliasesInput}
                  onChangeText={setExtraAliasesInput}
                  placeholder="Ex: patate douce blanche, kumara"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Bouton de validation de la création */}
              <TouchableOpacity
                style={[styles.createBtn, isSubmitting && styles.createBtnDisabled]}
                onPress={handleCreateNew}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                <Text style={styles.createBtnText}>Enregistrer dans mon lexique</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
    paddingBottom: 24,
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  synonymsSection: {
    backgroundColor: colors.primary + '0A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionExplanation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  matchesList: {
    gap: 10,
  },
  matchCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aisleBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  matchTextColumn: {
    flex: 1,
  },
  matchItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  matchItemReason: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  matchActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '14',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  matchActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  passportSection: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.danger + '15',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.danger + '35',
  },
  errorBoxText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subFieldLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
  },
  aislesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  aisleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aisleChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  allergenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hintBadgeText: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '600',
  },
  noAllergenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noAllergenBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  noAllergenBtnText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  noAllergenBtnTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  allergenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
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
    fontSize: 12,
  },
  allergenName: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  allergenNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  stapleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  stapleTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  stapleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stapleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stapleSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualSearchContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  manualSearchPrompt: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  manualSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  manualSearchIcon: {
    marginRight: 6,
  },
  manualSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  manualSearchClear: {
    padding: 2,
  },
  parentSearchResultsList: {
    marginTop: 6,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  parentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    marginTop: 1,
  },
  parentSearchAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary + '14',
  },
  parentSearchActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
}));
