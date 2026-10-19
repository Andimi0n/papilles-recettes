import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

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
  const content = (
    <View
      style={[
        styles.chip,
        selected && styles.chipSelected,
        highlighted && styles.chipHighlighted,
      ]}
    >
      {highlighted && (
        <Ionicons name="checkmark-circle" size={14} color={Colors.secondary} style={styles.icon} />
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
            color={selected ? '#FFFFFF' : Colors.textSecondary}
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

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipHighlighted: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.secondary,
  },
  icon: {
    marginRight: 4,
  },
  labelText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  labelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  labelHighlighted: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  removeBtn: {
    marginLeft: 6,
  },
});
