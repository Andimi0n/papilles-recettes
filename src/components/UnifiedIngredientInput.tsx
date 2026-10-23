import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  useWindowDimensions,
  ReturnKeyTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { AISLE_CONFIGS } from '../utils/aisleClassifier';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import {
  UnifiedIngredientService,
  ClosestCanonicalMatch,
} from '../services/unifiedIngredientService';
import { QualifyIngredientModal } from './QualifyIngredientModal';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';

export interface UnifiedIngredientInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectIngredient?: (
    item: CanonicalIngredient,
    extractedDetails?: { quantity?: string; unit?: string }
  ) => void;
  onKeepFreeText?: (
    name: string,
    extractedDetails?: { quantity?: string; unit?: string }
  ) => void;
  onAutoExtractedDetails?: (extracted: { quantity?: string; unit?: string }) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  context?: 'stock' | 'shopping' | 'recipe' | 'search';
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  dropdownStyle?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  clearOnSelect?: boolean;
  keepFocusOnSelect?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: ReturnKeyTypeOptions;
  showSearchIcon?: boolean;
}

export const UnifiedIngredientInput: React.FC<UnifiedIngredientInputProps> = ({
  value,
  onChangeText,
  onSelectIngredient,
  onKeepFreeText,
  onAutoExtractedDetails,
  placeholder = 'Ex: Farine, Oignon...',
  placeholderTextColor,
  context = 'stock',
  style,
  containerStyle,
  dropdownStyle,
  autoFocus = false,
  onFocus,
  onBlur,
  clearOnSelect = false,
  keepFocusOnSelect = false,
  onSubmitEditing,
  returnKeyType = 'done',
  showSearchIcon = false,
}) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<CanonicalIngredient[]>([]);
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');

  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  // Largeur responsive et confortable pour le dongle flottant
  const dropdownWidth = Math.min(380, Math.max(280, windowWidth - 44));

  // Extraction synchrone d'éventuels détails (quantité/unité) incorporés
  const extractedDetails = useMemo(() => {
    if (!value || value.trim().length === 0) return undefined;
    const res = normalizeIngredient({ name: value });
    if (res.quantity || res.unit) {
      return { quantity: res.quantity, unit: res.unit, cleanName: res.name };
    }
    return undefined;
  }, [value]);

  // Correspondances proches lorsque la saisie n'a pas de match direct
  const closestMatches = useMemo(() => {
    if (!isFocused || !value || value.trim().length < 2) return [];
    if (suggestions.some((s) => s.canonicalName.toLowerCase() === value.trim().toLowerCase())) {
      return [];
    }
    return UnifiedIngredientService.findClosestCanonicalMatches(value, 2);
  }, [value, isFocused, suggestions]);

  // Mise à jour instantanée des suggestions de vocabulaire
  useEffect(() => {
    if (!isFocused || !value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const trimmed = value.trim();
    // Éventuel nettoyage pour chercher l'ingrédient sous-jacent si quantité présente
    const cleanSearch = extractedDetails?.cleanName || trimmed;
    const matches = VocabularyService.search(cleanSearch, 5);
    setSuggestions(matches);
  }, [value, isFocused, extractedDetails]);

  // Sélection d'un ingrédient répertorié
  const handleSelectCanonical = (item: CanonicalIngredient) => {
    isSelectingRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (clearOnSelect) {
      onChangeText('');
    } else {
      onChangeText(item.canonicalName);
    }

    VocabularyService.incrementUsage(item.id).catch(() => {});
    setSuggestions([]);

    const details = extractedDetails
      ? { quantity: extractedDetails.quantity, unit: extractedDetails.unit }
      : undefined;

    if (onSelectIngredient) {
      onSelectIngredient(item, details);
    }

    if (keepFocusOnSelect) {
      setIsFocused(true);
      setTimeout(() => {
        inputRef.current?.focus();
        isSelectingRef.current = false;
      }, 50);
    } else {
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  };

  // Traitement d'un synonyme direct cliqué dans le dongle
  const handleAttachSynonymFromDropdown = async (match: ClosestCanonicalMatch) => {
    isSelectingRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    const currentVal = value.trim();
    const result = await UnifiedIngredientService.addAliasToCanonical(match.item.id, currentVal);

    if (result.success && result.updated) {
      handleSelectCanonical(result.updated);
    } else {
      // Si échec ou besoin de qualification approfondie, ouvre le modal
      openQualifyModal(currentVal);
    }
  };

  // Ouverture du modal de qualification stricte
  const openQualifyModal = (nameToQualify: string) => {
    isSelectingRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setPendingUnrecognizedName(nameToQualify);
    setIsQualifyModalVisible(true);
    setSuggestions([]);
  };

  // Conservation du libellé libre (Garder tel quel)
  const handleKeepFreeText = (nameToKeep: string) => {
    isSelectingRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    const formatted = nameToKeep.trim().charAt(0).toUpperCase() + nameToKeep.trim().slice(1);

    if (clearOnSelect) {
      onChangeText('');
    } else {
      onChangeText(formatted);
    }
    setSuggestions([]);

    const details = extractedDetails
      ? { quantity: extractedDetails.quantity, unit: extractedDetails.unit }
      : undefined;

    if (onKeepFreeText) {
      onKeepFreeText(formatted, details);
    } else if (onSelectIngredient) {
      // Fallback si onKeepFreeText n'est pas fourni : tente de résoudre via normaliseur
      const resolved = normalizeIngredient({ name: formatted });
      if (resolved.canonicalId) {
        const syncList = VocabularyService.getSyncList();
        const canon = syncList.find((c) => c.id === resolved.canonicalId);
        if (canon) {
          onSelectIngredient(canon, details);
        }
      }
    }

    if (keepFocusOnSelect) {
      setIsFocused(true);
      setTimeout(() => {
        inputRef.current?.focus();
        isSelectingRef.current = false;
      }, 50);
    } else {
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  };

  // Soumission au clavier (Touche Entrée / Valider / Done)
  const handleSubmitEditing = () => {
    const raw = value.trim();
    if (!raw) {
      onSubmitEditing?.();
      return;
    }

    // 1. Vérifier si l'ingrédient est déjà reconnu dans le lexique
    const resolution = UnifiedIngredientService.resolveRecognizedIngredient(raw);
    if (resolution.isRecognized && resolution.canonical) {
      handleSelectCanonical(resolution.canonical);
      return;
    }

    // 2. Si non reconnu, ouvrir le modal de qualification stricte (Passeport / Synonyme / Garder)
    openQualifyModal(raw);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      if (isSelectingRef.current) {
        return;
      }
      setIsFocused(false);
      setSuggestions([]);
      onBlur?.();

      // Notification des détails de quantité/unité extraits discrètement
      if (extractedDetails && onAutoExtractedDetails) {
        onAutoExtractedDetails({
          quantity: extractedDetails.quantity,
          unit: extractedDetails.unit,
        });
      }
    }, 200);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputWrapper}>
        {showSearchIcon && (
          <Ionicons name="search" size={17} color={colors.textMuted} style={styles.leadingIcon} />
        )}
        <TextInput
          ref={inputRef}
          style={[styles.input, showSearchIcon && { paddingLeft: 34 }, style]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          autoCapitalize="sentences"
          autoCorrect={false}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType={returnKeyType}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearIconBtn}
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dongle flottant de suggestions unifié */}
      {isFocused && (suggestions.length > 0 || value.trim().length >= 2) && (
        <View style={[styles.dropdownContainer, { width: dropdownWidth }, dropdownStyle]}>
          <View style={styles.dropdownHeader}>
            <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
            <Text style={styles.dropdownHeaderText}>Vocabulaire officiel</Text>
            {extractedDetails && (extractedDetails.quantity || extractedDetails.unit) && (
              <View style={styles.extractedBadge}>
                <Text style={styles.extractedBadgeText}>
                  Qté : {extractedDetails.quantity || ''} {extractedDetails.unit || ''}
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            {/* 1. Correspondances directes trouvées */}
            {suggestions.map((item) => {
              const aisleConfig = AISLE_CONFIGS[item.defaultAisle] || AISLE_CONFIGS['Autre'];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionRow}
                  onPress={() => handleSelectCanonical(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.aisleBadge, { backgroundColor: aisleConfig.bgColor }]}>
                    <Ionicons name={aisleConfig.iconName as any} size={12} color={aisleConfig.color} />
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.canonicalName}
                    </Text>
                    <Text style={styles.suggestionAisle} numberOfLines={1}>
                      {item.defaultAisle}
                      {item.isPantryStaple ? ' • 📦 Placard' : ''}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
                </TouchableOpacity>
              );
            })}

            {/* 2. Suggestions de synonymes proches si non répertorié */}
            {suggestions.length === 0 && closestMatches.length > 0 && (
              <View style={styles.closestSection}>
                <Text style={styles.closestHeaderTitle}>💡 Suggestion d'association :</Text>
                {closestMatches.map((cm) => (
                  <TouchableOpacity
                    key={cm.item.id}
                    style={styles.closestRow}
                    onPress={() => handleAttachSynonymFromDropdown(cm)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link-outline" size={14} color={colors.primary} />
                    <View style={styles.textColumn}>
                      <Text style={styles.closestName}>
                        Ajouter comme synonyme de « {cm.item.canonicalName} »
                      </Text>
                      <Text style={styles.closestSubtitle}>{cm.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 3. Action de qualification / création au lexique */}
            {value.trim().length >= 2 &&
              !suggestions.some(
                (s) => s.canonicalName.toLowerCase() === value.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  style={styles.qualifyActionRow}
                  onPress={() => openQualifyModal(value.trim())}
                  activeOpacity={0.7}
                >
                  <View style={styles.qualifyIconBadge}>
                    <Ionicons name="sparkles" size={13} color={colors.primary} />
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={styles.qualifyActionName} numberOfLines={1}>
                      Qualifier « {value.trim()} »...
                    </Text>
                    <Text style={styles.qualifyActionSubtitle} numberOfLines={1}>
                      Passeport complet (allergène, rayon, fond de placard)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.primary} />
                </TouchableOpacity>
              )}

            {/* 4. Action de repli hors lexique (Garder tel quel) */}
            {value.trim().length >= 2 &&
              !suggestions.some(
                (s) => s.canonicalName.toLowerCase() === value.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  style={styles.distinctSuggestionRow}
                  onPress={() => handleKeepFreeText(value.trim())}
                  activeOpacity={0.7}
                >
                  <View style={styles.distinctIconBadge}>
                    <Ionicons name="return-down-forward" size={13} color={colors.amber} />
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={styles.distinctSuggestionName} numberOfLines={1}>
                      Garder « {value.trim()} »
                    </Text>
                    <Text style={styles.distinctSuggestionSubtitle} numberOfLines={1}>
                      Conserver sans enregistrer au lexique
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
          </ScrollView>
        </View>
      )}

      {/* Modal de qualification stricte (Passeport Ingrédient) */}
      <QualifyIngredientModal
        visible={isQualifyModalVisible}
        rawName={pendingUnrecognizedName}
        context={context}
        onClose={() => {
          setIsQualifyModalVisible(false);
          isSelectingRef.current = false;
        }}
        onAttachAsSynonym={(canonical) => {
          handleSelectCanonical(canonical);
        }}
        onCreateCanonical={(created) => {
          handleSelectCanonical(created);
        }}
        onKeepFreeText={(name) => {
          handleKeepFreeText(name);
        }}
      />
    </View>
  );
};

const styles = createDynamicStyles((colors) => ({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  leadingIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
  },
  clearIconBtn: {
    position: 'absolute',
    right: 10,
    zIndex: 2,
    padding: 2,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '100%',
    marginTop: 4,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 4,
    zIndex: 9999,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  dropdownHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  extractedBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  extractedBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.primary,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  aisleBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textColumn: {
    flex: 1,
    marginRight: 6,
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  suggestionAisle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closestSection: {
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  closestHeaderTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  closestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  closestName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closestSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  qualifyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.primary + '08',
  },
  qualifyIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  qualifyActionName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  qualifyActionSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  distinctSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  distinctIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.amber + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  distinctSuggestionName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  distinctSuggestionSubtitle: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
  },
}));
