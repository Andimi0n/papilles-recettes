import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear: () => void;
  onOpenAdvancedFilters?: () => void;
  activeFiltersCount?: number;
  // Compatibilité ascendante
  onToggleStockFilter?: () => void;
  onOpenStockHub?: () => void;
  onOpenFridgeSearch?: () => void;
  isStockFilterActive?: boolean;
  stockCount?: number;
  doableRecipesCount?: number;
  activeIngredientsCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Rechercher une recette ou un ingrédient...',
  onClear,
  onOpenAdvancedFilters,
  activeFiltersCount = 0,
  onToggleStockFilter,
  onOpenStockHub,
  onOpenFridgeSearch,
  isStockFilterActive = false,
  activeIngredientsCount = 0,
}) => {
  const { isDark, colors } = useTheme();

  const handlePressFilters = () => {
    if (onOpenAdvancedFilters) {
      onOpenAdvancedFilters();
    } else if (onToggleStockFilter) {
      onToggleStockFilter();
    } else if (onOpenStockHub) {
      onOpenStockHub();
    } else if (onOpenFridgeSearch) {
      onOpenFridgeSearch();
    }
  };

  const hasActiveFilters =
    activeFiltersCount > 0 || isStockFilterActive || activeIngredientsCount > 0;
  const badgeCount =
    activeFiltersCount > 0
      ? activeFiltersCount
      : activeIngredientsCount > 0
      ? activeIngredientsCount
      : 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
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

      {/* Bouton Filtres Avancés */}
      <TouchableOpacity
        style={[
          styles.filterBtn,
          hasActiveFilters && styles.filterBtnActive,
        ]}
        onPress={handlePressFilters}
        activeOpacity={0.75}
        accessibilityLabel="Filtres avancés"
        accessibilityRole="button"
      >
        <Ionicons
          name={hasActiveFilters ? 'options' : 'options-outline'}
          size={21}
          color={hasActiveFilters ? '#FFFFFF' : colors.primary}
        />

        {hasActiveFilters && badgeCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    marginLeft: 10,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: colors.primary + '33',
    ...shadows.card,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.secondary,
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
}));
