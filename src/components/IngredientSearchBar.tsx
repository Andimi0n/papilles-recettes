import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface IngredientSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
  placeholder?: string;
  currentTab: 'fridge' | 'shopping';
  currentMatchCount: number;
  crossMatchCount: number;
  onPressCrossUniverse?: () => void;
  autoFocus?: boolean;
}

export const IngredientSearchBar: React.FC<IngredientSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onClose,
  placeholder,
  currentTab,
  currentMatchCount,
  crossMatchCount,
  onPressCrossUniverse,
  autoFocus = true,
}) => {
  const { colors } = useTheme();

  const defaultPlaceholder =
    currentTab === 'fridge'
      ? 'Chercher dans mes étagères...'
      : 'Chercher dans mes courses...';

  const hasQuery = value.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Ligne principale de saisie */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={hasQuery ? colors.primary : colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || defaultPlaceholder}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={autoFocus}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={onClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Bouton pour fermer le mode recherche */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Fermer la recherche"
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>Fermer</Text>
        </TouchableOpacity>
      </View>

      {/* Ruban d'informations et pont croisé Étagères ↔ Courses */}
      {hasQuery && (
        <View style={styles.infoStrip}>
          {/* Compteur courant */}
          <View style={styles.matchCountBadge}>
            <Text style={styles.matchCountText}>
              {currentMatchCount === 0
                ? 'Aucun résultat'
                : `${currentMatchCount} trouvé${currentMatchCount > 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Pont cliquable vers l'autre univers */}
          {crossMatchCount > 0 && onPressCrossUniverse && (
            <TouchableOpacity
              style={styles.crossUniversePill}
              onPress={onPressCrossUniverse}
              activeOpacity={0.75}
            >
              <Ionicons
                name={currentTab === 'fridge' ? 'cart' : 'layers'}
                size={13}
                color={colors.primary}
              />
              <Text style={styles.crossUniverseText} numberOfLines={1}>
                {currentTab === 'fridge'
                  ? `Dans vos courses (${crossMatchCount})`
                  : `Dans vos étagères (${crossMatchCount})`}
              </Text>
              <Ionicons name="arrow-forward" size={12} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    ...shadows.small,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
    height: '100%',
  },
  clearBtn: {
    padding: 2,
    marginLeft: 4,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
    gap: 8,
  },
  matchCountBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  matchCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  crossUniversePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  crossUniverseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
}));
