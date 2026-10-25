import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  QUICK_PICK_UNITS,
  findStandardUnit,
  normalizeUnit,
} from '../constants/units';

export interface UnitQuickPickerProps {
  value?: string;
  onChangeUnit: (unit: string) => void;
  onOpenFullPicker?: () => void;
  quickUnits?: string[];
  style?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const UnitQuickPicker: React.FC<UnitQuickPickerProps> = ({
  value = '',
  onChangeUnit,
  onOpenFullPicker,
  quickUnits = QUICK_PICK_UNITS,
  style,
  chipStyle,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const normalizedValue = normalizeUnit(value);

  const handleChipPress = (unitId: string) => {
    // Si l'unité est déjà sélectionnée, un clic supplémentaire la désélectionne (toggle)
    if (normalizedValue === unitId || value.trim().toLowerCase() === unitId.toLowerCase()) {
      onChangeUnit('');
    } else {
      onChangeUnit(unitId);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, style]}
      keyboardShouldPersistTaps="handled"
    >
      {quickUnits.map((id) => {
        const def = findStandardUnit(id);
        const label = def?.shortLabel || id;
        const isSelected = normalizedValue === id || value.trim().toLowerCase() === id.toLowerCase();

        return (
          <TouchableOpacity
            key={id}
            style={[
              styles.chip,
              compact && styles.chipCompact,
              {
                backgroundColor: isSelected
                  ? colors.primary
                  : isDark
                  ? '#212B26'
                  : '#F0F5F2',
                borderColor: isSelected ? colors.primary : colors.borderMedium,
              },
              chipStyle,
            ]}
            onPress={() => handleChipPress(id)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityLabel={`Unité ${label}`}
          >
            <Text
              style={[
                styles.chipText,
                compact && styles.chipTextCompact,
                {
                  color: isSelected ? '#FFFFFF' : colors.textPrimary,
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Bouton d'ouverture du sélecteur complet */}
      {onOpenFullPicker && (
        <TouchableOpacity
          style={[
            styles.chip,
            styles.moreChip,
            compact && styles.chipCompact,
            {
              backgroundColor: isDark ? '#1C2621' : '#E8EFEA',
              borderColor: colors.borderMedium,
            },
            chipStyle,
          ]}
          onPress={onOpenFullPicker}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityLabel="Ouvrir toutes les unités"
        >
          <Ionicons
            name="options-outline"
            size={compact ? 13 : 15}
            color={colors.primary}
            style={styles.moreIcon}
          />
          <Text
            style={[
              styles.chipText,
              compact && styles.chipTextCompact,
              { color: colors.primary, fontWeight: '700' },
            ]}
          >
            Autres
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 12,
  },
  chipTextCompact: {
    fontSize: 11,
  },
  moreChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreIcon: {
    marginRight: 4,
  },
});
