import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FridgeItem } from '../types/fridge';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface ChefAiWidgetProps {
  stockCount: number;
  stockItems?: FridgeItem[];
  doableCount?: number;
  onOpenChefAi: () => void;
  onNavigateToStock?: () => void;
}

export function formatStockPreview(stockItems?: { name: string }[], maxItems = 3): string {
  if (!stockItems || stockItems.length === 0) return '';
  const validNames = stockItems
    .map((item) => (item.name ? item.name.toLowerCase().trim() : ''))
    .filter(Boolean);
  if (validNames.length === 0) return '';
  const preview = validNames.slice(0, maxItems).join(', ');
  return validNames.length > maxItems ? `Avec : ${preview}...` : `Avec : ${preview}`;
}

export function getChefAiSubtitle(stockCount: number, doableCount = 0): string {
  if (stockCount === 0) {
    return 'Sur-mesure avec ce que vous avez';
  }
  if (doableCount > 0) {
    return doableCount > 1
      ? `${doableCount} recettes prêtes ou inventez du sur-mesure`
      : `1 recette prête ou inventez du sur-mesure`;
  }
  return 'Inventions sur-mesure anti-gaspillage';
}

export const ChefAiWidget: React.FC<ChefAiWidgetProps> = ({
  stockCount,
  stockItems,
  doableCount = 0,
  onOpenChefAi,
  onNavigateToStock,
}) => {
  const { colors } = useTheme();

  const handlePressCard = () => {
    if (stockCount === 0 && onNavigateToStock) {
      onNavigateToStock();
    } else {
      onOpenChefAi();
    }
  };

  const previewText = formatStockPreview(stockItems, 3);
  const subtitle = getChefAiSubtitle(stockCount, doableCount);

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={handlePressCard}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Demander des idées au Chef IA à partir de vos ingrédients en stock"
    >
      {/* En-tête du widget */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondary + '20' }]}>
            <Ionicons name="sparkles" size={17} color={colors.secondary} />
          </View>
          <View style={styles.titleCol}>
            <Text style={styles.headerTitle}>Inspirations du Chef IA</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Badge stock */}
        {stockCount > 0 ? (
          <View style={styles.stockBadge}>
            <MaterialCommunityIcons name="fridge-outline" size={13} color={colors.primary} />
            <Text style={styles.stockBadgeText}>
              {stockCount} en stock
            </Text>
          </View>
        ) : (
          <View style={[styles.stockBadge, styles.stockBadgeEmpty]}>
            <MaterialCommunityIcons name="fridge-off-outline" size={13} color={colors.textMuted} />
            <Text style={styles.stockBadgeEmptyText}>Étagères vides</Text>
          </View>
        )}
      </View>

      {/* Contenu : Aperçu des ingrédients & Bouton d'action épuré */}
      {stockCount > 0 ? (
        <View style={styles.contentBody}>
          {previewText ? (
            <View style={styles.previewRow}>
              <MaterialCommunityIcons name="shaker-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.previewText} numberOfLines={1}>
                {previewText}
              </Text>
            </View>
          ) : null}
          <View style={styles.actionBtn}>
            <Ionicons name="bulb-outline" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Trouver 3 idées de recettes</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Renseignez vos ingrédients dans l’onglet Étagères pour inspirer le Chef IA !
          </Text>
          <View style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
            <Ionicons name="add-circle-outline" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Remplir mes étagères 🥫</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  cardContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  stockBadgeEmpty: {
    backgroundColor: colors.borderLight,
    borderColor: colors.border,
  },
  stockBadgeEmptyText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  contentBody: {
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  previewText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
}));
