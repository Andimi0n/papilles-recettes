import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { Colors, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { formatDuration } from '../utils/helpers';

export interface RecipeStockProgress {
  matchedCount: number;
  totalCount: number;
  percentage: number;
}

export interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onToggleFavorite?: () => void;
  onQuickRate?: (rating: number) => void;
  highlightedIngredients?: string[]; // ingredients matched by search
  hasAllergen?: boolean;
  stockProgress?: RecipeStockProgress;
}

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onQuickRate,
  highlightedIngredients = [],
  hasAllergen = false,
  stockProgress,
}) => {
  const { isDark, colors } = useTheme();
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
    >
      {/* Image & Badges */}
      <View style={styles.imageContainer}>
        {recipe.imageUrl && recipe.imageUrl.trim().length > 0 ? (
          <>
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay} />
          </>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="restaurant-outline" size={40} color={Colors.primary + '55'} />
          </View>
        )}

        {/* Category & Vegetarian Badges */}
        <View style={styles.topBadgesRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{recipe.category}</Text>
          </View>
          {recipe.isVegetarian && (
            <View style={styles.vegeBadge}>
              <Ionicons name="leaf" size={11} color="#FFFFFF" />
              <Text style={styles.vegeBadgeText}>Végé</Text>
            </View>
          )}
          {hasAllergen && (
            <View style={[styles.allergenCardBadge, { backgroundColor: colors.danger }]}>
              <Ionicons name="warning" size={11} color="#FFFFFF" />
              <Text style={styles.allergenCardBadgeText}>Allergène</Text>
            </View>
          )}
        </View>

        {/* Note / Star badge on top of image (discret si notée) */}
        {recipe.rating > 0 && (
          <View style={styles.ratingBadge}>
            <Ionicons
              name="star"
              size={12}
              color={Colors.amber}
            />
            <Text style={styles.ratingBadgeText}>
              {recipe.rating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Card Body épuré : Titre + Temps + micro-badge Frigo */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        <View style={styles.metaRow}>
          {/* Temps de préparation */}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formatDuration(totalTime)}</Text>
          </View>

          {/* Micro-badge Frigo clair */}
          {stockProgress && stockProgress.totalCount > 0 && (
            <View
              style={[
                styles.stockMicroBadge,
                stockProgress.percentage === 100
                  ? styles.stockMicroBadgeReady
                  : styles.stockMicroBadgeMissing,
              ]}
            >
              <Ionicons
                name={stockProgress.percentage === 100 ? "checkmark-circle" : "alert-circle-outline"}
                size={12}
                color={
                  stockProgress.percentage === 100
                    ? (isDark ? '#4ADE80' : '#15803D')
                    : (isDark ? '#FBBF24' : '#B45309')
                }
              />
              <Text
                style={[
                  styles.stockMicroBadgeText,
                  stockProgress.percentage === 100
                    ? styles.stockMicroBadgeTextReady
                    : styles.stockMicroBadgeTextMissing,
                ]}
              >
                {stockProgress.percentage === 100
                  ? '✓ Frigo prêt'
                  : `${stockProgress.totalCount - stockProgress.matchedCount} manquant${stockProgress.totalCount - stockProgress.matchedCount > 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.medium,
  },
  imageContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: colors.isDark ? 'rgba(24, 31, 28, 0.90)' : 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: colors.isDark ? 1 : 0,
    borderColor: colors.border,
  },
  vegeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allergenCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allergenCardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vegeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.isDark ? colors.primary : colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stockMicroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stockMicroBadgeReady: {
    backgroundColor: colors.isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(22, 163, 74, 0.12)',
  },
  stockMicroBadgeMissing: {
    backgroundColor: colors.isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(245, 158, 11, 0.12)',
  },
  stockMicroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockMicroBadgeTextReady: {
    color: colors.isDark ? '#4ADE80' : '#15803D',
  },
  stockMicroBadgeTextMissing: {
    color: colors.isDark ? '#FBBF24' : '#B45309',
  },
}));

export const RecipeCard = React.memo(RecipeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.rating === nextProps.recipe.rating &&
    prevProps.recipe.title === nextProps.recipe.title &&
    prevProps.recipe.imageUrl === nextProps.recipe.imageUrl &&
    (prevProps.highlightedIngredients?.length || 0) === (nextProps.highlightedIngredients?.length || 0) &&
    prevProps.hasAllergen === nextProps.hasAllergen &&
    prevProps.stockProgress?.matchedCount === nextProps.stockProgress?.matchedCount &&
    prevProps.stockProgress?.totalCount === nextProps.stockProgress?.totalCount &&
    prevProps.stockProgress?.percentage === nextProps.stockProgress?.percentage
  );
});
