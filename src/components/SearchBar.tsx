import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onToggleStockFilter?: () => void;
  onOpenStockHub?: () => void;
  onOpenFridgeSearch?: () => void; // Compatibilité ascendante
  isStockFilterActive?: boolean;
  stockCount?: number;
  doableRecipesCount?: number;
  activeIngredientsCount?: number; // Compatibilité ascendante
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Rechercher une recette ou un ingrédient...',
  onToggleStockFilter,
  onOpenStockHub,
  onOpenFridgeSearch,
  isStockFilterActive = false,
  stockCount = 0,
  doableRecipesCount = 0,
  activeIngredientsCount = 0,
  onClear,
}) => {
  const { isDark, colors } = useTheme();

  const handleOpenStock = () => {
    if (onToggleStockFilter) {
      onToggleStockFilter();
    } else if (onOpenStockHub) {
      onOpenStockHub();
    } else if (onOpenFridgeSearch) {
      onOpenFridgeSearch();
    }
  };

  const isActive = isStockFilterActive || activeIngredientsCount > 0;
  // Priorité d'affichage du badge :
  // 1. Si le filtre est actif : icône checkmark
  // 2. Sinon, si des recettes sont faisables immédiatement avec le stock : nombre de recettes faisables
  // 3. Sinon, si des ingrédients sont en stock : petit point ou count d'ingrédients
  const displayBadgeCount =
    doableRecipesCount > 0
      ? doableRecipesCount
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

      {/* Bouton 1-Tap Stock / Filtrer recettes en stock */}
      <TouchableOpacity
        style={[
          styles.stockHubBtn,
          isActive && styles.stockHubBtnActive,
        ]}
        onPress={handleOpenStock}
        activeOpacity={0.75}
        accessibilityLabel="Filtrer les recettes réalisables avec mon stock"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name={isActive ? 'fridge' : 'fridge-outline'}
          size={22}
          color={isActive ? '#FFFFFF' : colors.primary}
        />

        {isActive ? (
          <View style={styles.activeFilterBadge}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        ) : displayBadgeCount > 0 ? (
          <View style={styles.doableBadge}>
            <Text style={styles.doableBadgeText}>
              {displayBadgeCount > 99 ? '99+' : displayBadgeCount}
            </Text>
          </View>
        ) : stockCount > 0 ? (
          <View style={styles.stockDotBadge} />
        ) : null}
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
  stockHubBtn: {
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
  stockHubBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  activeFilterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.secondary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  doableBadge: {
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
  doableBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stockDotBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.cardBackground,
  },
}));
