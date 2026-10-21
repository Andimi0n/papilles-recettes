import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface IngredientChipProps {
  label: string;
  selected?: boolean;
  highlighted?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  quantity?: string;
  unit?: string;
}

export const IngredientChip: React.FC<IngredientChipProps> = ({
  label,
  selected = false,
  highlighted = false,
  onPress,
  onRemove,
  quantity,
  unit,
}) => {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.chip,
        selected && styles.chipSelected,
        highlighted && styles.chipHighlighted,
      ]}
    >
      {highlighted && (
        <Ionicons name="checkmark-circle" size={14} color={colors.secondary} style={styles.icon} />
      )}
      <Text
        style={[
          styles.labelText,
          selected && styles.labelSelected,
          highlighted && styles.labelHighlighted,
        ]}
        numberOfLines={1}
      >
        {label}
        {quantity ? ` (${quantity}${unit ? ' ' + unit : ''})` : ''}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeBtn}
        >
          <Ionicons
            name="close-circle"
            size={16}
            color={selected ? '#FFFFFF' : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = createDynamicStyles((colors, shadows) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipHighlighted: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary,
  },
  icon: {
    marginRight: 4,
  },
  labelText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  labelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  labelHighlighted: {
    color: colors.secondary,
    fontWeight: '600',
  },
  removeBtn: {
    marginLeft: 6,
  },
}));
