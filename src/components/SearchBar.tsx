import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onOpenFridgeSearch: () => void;
  activeIngredientsCount?: number;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Rechercher une recette ou un ingrédient...',
  onOpenFridgeSearch,
  activeIngredientsCount = 0,
  onClear,
}) => {
  const { isDark, colors } = useTheme();

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
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bouton recherche spécifique par ingrédients (Le Frigo) */}
      <TouchableOpacity
        style={[
          styles.fridgeBtn,
          activeIngredientsCount > 0 && styles.fridgeBtnActive,
        ]}
        onPress={onOpenFridgeSearch}
        activeOpacity={0.8}
      >
        <Ionicons
          name="restaurant"
          size={18}
          color={activeIngredientsCount > 0 ? '#FFFFFF' : colors.primary}
        />
        {activeIngredientsCount > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{activeIngredientsCount}</Text>
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
  fridgeBtn: {
    marginLeft: 10,
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  fridgeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  activeBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.secondary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBackground,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
}));
