import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { ConversionMode } from '../../utils/unitConverter';
import { styles } from '../../screens/RecipeDetailScreen.styles';

export interface RecipeServingsControllerProps {
  currentServings: number;
  originalServings: number;
  onServingsChange: (servings: number) => void;
  globalConversionMode: ConversionMode;
  onCycleGlobalConversion: () => void;
}

export const RecipeServingsController: React.FC<RecipeServingsControllerProps> = ({
  currentServings,
  originalServings,
  onServingsChange,
  globalConversionMode,
  onCycleGlobalConversion,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.techBarRow}>
      <View style={styles.servingsSelector}>
        <TouchableOpacity
          onPress={() => onServingsChange(Math.max(1, currentServings - 1))}
          style={styles.servingsStepBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Diminuer le nombre de portions"
        >
          <Ionicons name="remove" size={14} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.servingsCountBox}>
          <Ionicons name="people" size={12} color={colors.primary} style={styles.servingsIcon} />
          <Text style={styles.servingsCountText}>{currentServings} pers.</Text>
        </View>

        <TouchableOpacity
          onPress={() => onServingsChange(currentServings + 1)}
          style={styles.servingsStepBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          accessibilityLabel="Augmenter le nombre de portions"
        >
          <Ionicons name="add" size={14} color={colors.primary} />
        </TouchableOpacity>

        {currentServings !== originalServings && (
          <TouchableOpacity
            onPress={() => onServingsChange(originalServings)}
            style={styles.resetServingsBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Réinitialiser les portions d'origine"
          >
            <Ionicons name="refresh" size={12} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bouton cyclique de conversion d'unités (Base -> En g -> En vol.) */}
      <TouchableOpacity
        style={[
          styles.conversionCycleBtn,
          globalConversionMode !== 'original' && styles.conversionCycleBtnActive,
        ]}
        onPress={onCycleGlobalConversion}
        activeOpacity={0.7}
        accessibilityLabel="Changer les unités d’ingrédients"
      >
        <Ionicons
          name={
            globalConversionMode === 'mass'
              ? 'scale-outline'
              : globalConversionMode === 'volume'
              ? 'water-outline'
              : 'swap-horizontal'
          }
          size={12}
          color={globalConversionMode !== 'original' ? '#FFFFFF' : colors.primary}
          style={{ marginRight: 4 }}
        />
        <Text
          style={[
            styles.conversionCycleBtnText,
            globalConversionMode !== 'original' && styles.conversionCycleBtnTextActive,
          ]}
        >
          {globalConversionMode === 'mass'
            ? 'En g'
            : globalConversionMode === 'volume'
            ? 'En vol.'
            : 'Base'}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={10}
          color={globalConversionMode !== 'original' ? '#FFFFFF' : colors.textMuted}
          style={{ marginLeft: 3 }}
        />
      </TouchableOpacity>
    </View>
  );
};
