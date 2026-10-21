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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { AISLE_CONFIGS } from '../utils/aisleClassifier';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';

interface IngredientAutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectIngredient?: (item: CanonicalIngredient) => void;
  onAutoExtractedDetails?: (extracted: { quantity?: string; unit?: string }) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  dropdownStyle?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const IngredientAutocompleteInput: React.FC<IngredientAutocompleteInputProps> = ({
  value,
  onChangeText,
  onSelectIngredient,
  onAutoExtractedDetails,
  placeholder = "Ex: Farine",
  placeholderTextColor,
  style,
  containerStyle,
  dropdownStyle,
  autoFocus = false,
  onFocus,
  onBlur,
}) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<CanonicalIngredient[]>([]);

  // Calcul d'une largeur généreuse pour le dongle / menu flottant de suggestions
  // Évite d'être contraint à la largeur étroite du champ nom
  const dropdownWidth = Math.min(380, Math.max(280, windowWidth - 44));

  // Mise à jour synchrone et sans délai des suggestions
  useEffect(() => {
    if (!isFocused || !value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const matches = VocabularyService.search(value.trim(), 5);
    setSuggestions(matches);
  }, [value, isFocused]);

  const handleSelect = (item: CanonicalIngredient) => {
    onChangeText(item.canonicalName);
    VocabularyService.incrementUsage(item.id).catch(() => {});
    setSuggestions([]);
    if (onSelectIngredient) {
      onSelectIngredient(item);
    }
  };

  const handleSelectDistinct = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    onChangeText(formatted);
    setSuggestions([]);
    try {
      const created = await VocabularyService.promoteAliasToCanonical(formatted);
      if (onSelectIngredient) {
        onSelectIngredient(created);
      }
    } catch (e) {
      console.error('Erreur promotion alias canonique:', e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // Petit délai pour permettre au tap sur une suggestion d'être enregistré
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
      onBlur?.();

      // Si l'utilisateur a tapé une chaîne avec contenants incorporés (ex: "1 boîte de petits pois"),
      // on extrait discrètement la quantité et le contenant, sans forcer un remplacement de synonyme délibéré.
      if (value && value.trim().length > 0) {
        const result = normalizeIngredient({ name: value });
        // Si la normalisation a extrait un contenant/quantité (ex: boîte de...), on applique
        if (result.quantity || result.unit) {
          if (onAutoExtractedDetails) {
            onAutoExtractedDetails({
              quantity: result.quantity,
              unit: result.unit,
            });
          }
          if (result.name && result.name !== value.trim()) {
            onChangeText(result.name);
          }
          if (result.canonicalId) {
            VocabularyService.incrementUsage(result.canonicalId).catch(() => {});
          }
        }
      }
    }, 200);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.textMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        autoCapitalize="sentences"
        autoCorrect={false}
      />

      {isFocused && suggestions.length > 0 && (
        <View style={[styles.dropdownContainer, { width: dropdownWidth }, dropdownStyle]}>
          <View style={styles.dropdownHeader}>
            <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
            <Text style={styles.dropdownHeaderText}>Vocabulaire suggéré</Text>
          </View>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((item) => {
              const aisleConfig = AISLE_CONFIGS[item.defaultAisle] || AISLE_CONFIGS['Autre'];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionRow}
                  onPress={() => handleSelect(item)}
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
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              );
            })}

            {value.trim().length >= 2 &&
              !suggestions.some(
                (s) => s.canonicalName.toLowerCase() === value.trim().toLowerCase()
              ) && (
                <TouchableOpacity
                  style={styles.distinctSuggestionRow}
                  onPress={() => handleSelectDistinct(value.trim())}
                  activeOpacity={0.7}
                >
                  <View style={styles.distinctIconBadge}>
                    <Ionicons name="sparkles" size={13} color={colors.amber} />
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={styles.distinctSuggestionName} numberOfLines={1}>
                      Garder "{value.trim()}" (ingrédient distinct)
                    </Text>
                    <Text style={styles.distinctSuggestionSubtitle} numberOfLines={1}>
                      Créer à part entière sans fusionner
                    </Text>
                  </View>
                  <Ionicons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = createDynamicStyles((colors) => ({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    // Styles de base de l'input
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '100%',
    marginTop: 4,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 4,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  dropdownHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  distinctSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceAlt,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  distinctIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.amber + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  distinctSuggestionName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  distinctSuggestionSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
}));
