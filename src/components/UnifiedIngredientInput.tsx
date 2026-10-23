import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  useWindowDimensions,
  ReturnKeyTypeOptions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { AISLE_CONFIGS } from '../utils/aisleClassifier';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import {
  UnifiedIngredientService,
  DropdownSuggestionItem,
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
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<DropdownSuggestionItem[]>([]);
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');

  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  // Largeur responsive et confortable pour le menu déroulant
  const dropdownWidth = Math.min(380, Math.max(280, windowWidth - 36));

  // Extraction synchrone d'éventuels détails (quantité/unité) incorporés
  const extractedDetails = useMemo(() => {
    if (!value || value.trim().length === 0) return undefined;
    const res = normalizeIngredient({ name: value });
    if (res.quantity || res.unit) {
      return { quantity: res.quantity, unit: res.unit, cleanName: res.name };
    }
    return undefined;
  }, [value]);

  // Mise à jour instantanée des suggestions qualitatives (directes + phonétiques + orthographe)
  useEffect(() => {
    if (!isFocused || !value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const trimmed = value.trim();
    const cleanSearch = extractedDetails?.cleanName || trimmed;
    const matches = UnifiedIngredientService.getQualitativeDropdownSuggestions(cleanSearch, 6);
    setSuggestions(matches);
  }, [value, isFocused, extractedDetails]);

  // Sélection d'un ingrédient répertorié depuis la liste
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
    setIsFocused(false);

    const details = extractedDetails
      ? { quantity: extractedDetails.quantity, unit: extractedDetails.unit }
      : undefined;

    if (onSelectIngredient) {
      onSelectIngredient(item, details);
    }

    // Sortie immédiate de la barre de recherche (blur + fermeture clavier)
    inputRef.current?.blur();
    try {
      Keyboard.dismiss();
    } catch (_) {}

    setTimeout(() => {
      isSelectingRef.current = false;
      setIsFocused(false);
    }, 100);
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

  // Soumission au clavier (Touche Entrée / Valider / Done)
  // IMPOSSIBILITÉ de valider une entrée brute hors lexique :
  // - Si reconnu : valide l'ingrédient officiel
  // - Si non reconnu : ouvre obligatoirement le modal de qualification
  const handleSubmitEditing = () => {
    const raw = value.trim();
    if (!raw) {
      onSubmitEditing?.();
      return;
    }

    // 1. Vérifier si l'ingrédient est déjà reconnu dans le lexique (O(1))
    const resolution = UnifiedIngredientService.resolveRecognizedIngredient(raw);
    if (resolution.isRecognized && resolution.canonical) {
      handleSelectCanonical(resolution.canonical);
      return;
    }

    // 2. Si non reconnu, impossible de valider à l'aveugle : ouvre le modal de qualification stricte
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
          style={[styles.input, showSearchIcon && { paddingLeft: 38 }, style]}
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
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Menu déroulant de suggestions qualitatives */}
      {isFocused && (suggestions.length > 0 || value.trim().length >= 2) && (
        <View style={[styles.dropdownContainer, { width: dropdownWidth }, dropdownStyle]}>
          <View style={styles.dropdownHeader}>
            <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
            <Text style={styles.dropdownHeaderText}>Suggestions du lexique</Text>
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
            {/* 1. Correspondances directes et qualitatives (phonétiques / orthographe) */}
            {suggestions.map(({ item, isFuzzySuggestion, suggestionLabel }) => {
              const aisleConfig = AISLE_CONFIGS[item.defaultAisle] || AISLE_CONFIGS['Autre'];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.suggestionRow, isFuzzySuggestion && styles.fuzzySuggestionRow]}
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
                      {isFuzzySuggestion && suggestionLabel
                        ? `💡 ${suggestionLabel} • ${item.defaultAisle}`
                        : `${item.defaultAisle}${item.isPantryStaple ? ' • 📦 Placard' : ''}`}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              );
            })}

            {/* 2. Action unique d'ajout au lexique si l'élément n'est pas un match exact */}
            {value.trim().length >= 2 &&
              !suggestions.some(
                (s) => !s.isFuzzySuggestion && s.item.canonicalName.toLowerCase() === value.trim().toLowerCase()
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
                      « {value.trim()} » n'est pas dans la liste ?
                    </Text>
                    <Text style={styles.qualifyActionSubtitle} numberOfLines={1}>
                      L'ajouter ou l'associer au lexique officiel...
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.primary} />
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
      />
    </View>
  );
};

const styles = createDynamicStyles((colors) => ({
  container: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
    minHeight: 46,
  },
  input: {
    height: 46,
    minHeight: 46,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: 'center',
  },
  leadingIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  clearIconBtn: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
    padding: 4,
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
    maxHeight: 250,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  fuzzySuggestionRow: {
    backgroundColor: colors.primary + '08',
  },
  aisleBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  suggestionAisle: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  qualifyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.primary + '0A',
  },
  qualifyIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  qualifyActionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  qualifyActionSubtitle: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
}));
