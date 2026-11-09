import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

interface ChefAiWidgetProps {
  onOpenChefAi: () => void;
  onNavigateToStock?: () => void;
}

export const ChefAiWidget: React.FC<ChefAiWidgetProps> = ({
  onOpenChefAi,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onOpenChefAi}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Trouver 3 idées de recette avec le Chef IA"
    >
      {/* En-tête du widget : Logo, Titre & Description */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="sparkles" size={17} color={colors.secondary} />
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.headerTitle}>Inspirations du Chef IA</Text>
            <Text style={styles.headerDescription}>
              Des idées de recettes sur-mesure à partir de vos ingrédients
            </Text>
          </View>
        </View>
      </View>

      {/* Bouton d'action */}
      <View style={styles.actionBtn}>
        <Ionicons name="bulb-outline" size={16} color="#FACC15" />
        <Text style={styles.actionBtnText}>Trouver 3 idées de recette</Text>
        <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  cardContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  titleCol: {
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
