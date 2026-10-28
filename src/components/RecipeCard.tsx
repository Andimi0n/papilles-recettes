import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, RecipeViewMode } from '../types/recipe';
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
  viewMode?: RecipeViewMode;
}

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onQuickRate,
  highlightedIngredients = [],
  hasAllergen = false,
  stockProgress,
  viewMode = 'detailed',
}) => {
  const { isDark, colors } = useTheme();
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  // 1. Mode Compact (liste horizontale épurée & rapide à parcourir)
  if (viewMode === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={styles.compactCard}
        accessibilityRole="button"
        accessibilityLabel={`Recette ${recipe.title}`}
      >
        {/* Vignette carrée gauche avec micro-indicateurs */}
        <View style={styles.compactThumbnailContainer}>
          {recipe.imageUrl && recipe.imageUrl.trim().length > 0 ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.compactPlaceholder}>
              <Ionicons name="restaurant-outline" size={24} color={Colors.primary + '55'} />
            </View>
          )}

          {/* Micro-pastille d'alerte en coin si végé ou allergène */}
          {hasAllergen ? (
            <View style={[styles.compactCornerBadge, { backgroundColor: colors.danger }]}>
              <Ionicons name="warning" size={9} color="#FFFFFF" />
            </View>
          ) : recipe.isVegetarian ? (
            <View style={[styles.compactCornerBadge, { backgroundColor: '#16A34A' }]}>
              <Ionicons name="leaf" size={9} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {/* Contenu central condensé */}
        <View style={styles.compactContent}>
          {/* Titre de la recette */}
          <Text style={styles.compactTitle} numberOfLines={1}>
            {recipe.title}
          </Text>

          {/* Ligne métadonnées : Catégorie • Temps • Étoiles */}
          <View style={styles.compactMetaRow}>
            <Text style={styles.compactCategoryText} numberOfLines={1}>
              {recipe.category}
            </Text>
            <Text style={styles.compactDot}>•</Text>
            <View style={styles.compactTimeRow}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.compactTimeText}>{formatDuration(totalTime)}</Text>
            </View>

            {(recipe.rating || 0) > 0 && (
              <>
                <Text style={styles.compactDot}>•</Text>
                <View style={styles.compactRatingRow}>
                  <Ionicons name="star" size={11} color={Colors.amber} />
                  <Text style={styles.compactRatingText}>
                    {recipe.rating % 1 === 0 ? recipe.rating : recipe.rating.toFixed(1)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Micro-badge Frigo en ligne */}
          {stockProgress && stockProgress.totalCount > 0 && (
            <View style={styles.compactStockRow}>
              <View
                style={[
                  styles.stockMicroBadge,
                  styles.stockMicroBadgeCompact,
                  stockProgress.percentage === 100
                    ? styles.stockMicroBadgeReady
                    : styles.stockMicroBadgeMissing,
                ]}
              >
                <Ionicons
                  name={stockProgress.percentage === 100 ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={11}
                  color={
                    stockProgress.percentage === 100
                      ? isDark ? '#4ADE80' : '#15803D'
                      : isDark ? '#FBBF24' : '#B45309'
                  }
                />
                <Text
                  style={[
                    styles.stockMicroBadgeText,
                    styles.stockMicroBadgeTextCompact,
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
            </View>
          )}
        </View>

        {/* Flèche de navigation à droite */}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.compactChevron} />
      </TouchableOpacity>
    );
  }

  // 2. Mode Grille (2 colonnes visuelles & équilibrées)
  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.gridCard}
        accessibilityRole="button"
        accessibilityLabel={`Recette ${recipe.title}`}
      >
        {/* Image panoramique réduite avec badges */}
        <View style={styles.gridImageContainer}>
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
              <Ionicons name="restaurant-outline" size={28} color={Colors.primary + '55'} />
            </View>
          )}

          {/* Badges d'alerte en superposition */}
          <View style={styles.gridTopBadgesRow}>
            {recipe.isVegetarian && (
              <View style={styles.gridMiniBadgeVege}>
                <Ionicons name="leaf" size={9} color="#FFFFFF" />
              </View>
            )}
            {hasAllergen && (
              <View style={[styles.gridMiniBadgeAllergen, { backgroundColor: colors.danger }]}>
                <Ionicons name="warning" size={9} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Note compacte */}
          {(recipe.rating || 0) > 0 && (
            <View style={styles.gridRatingBadge}>
              <Ionicons name="star" size={10} color={Colors.amber} />
              <Text style={styles.gridRatingText}>
                {recipe.rating % 1 === 0 ? recipe.rating : recipe.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Corps en grille : Catégorie, Titre 2 lignes, Temps & Micro-badge Frigo */}
        <View style={styles.gridBody}>
          <Text style={styles.gridCategoryText} numberOfLines={1}>
            {recipe.category}
          </Text>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {recipe.title}
          </Text>

          <View style={styles.gridMetaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.gridMetaText}>{formatDuration(totalTime)}</Text>
            </View>
          </View>

          {stockProgress && stockProgress.totalCount > 0 && (
            <View
              style={[
                styles.stockMicroBadge,
                styles.gridStockMicroBadge,
                stockProgress.percentage === 100
                  ? styles.stockMicroBadgeReady
                  : styles.stockMicroBadgeMissing,
              ]}
            >
              <Ionicons
                name={stockProgress.percentage === 100 ? 'checkmark-circle' : 'alert-circle-outline'}
                size={10}
                color={
                  stockProgress.percentage === 100
                    ? isDark ? '#4ADE80' : '#15803D'
                    : isDark ? '#FBBF24' : '#B45309'
                }
              />
              <Text
                style={[
                  styles.stockMicroBadgeText,
                  styles.gridStockMicroBadgeText,
                  stockProgress.percentage === 100
                    ? styles.stockMicroBadgeTextReady
                    : styles.stockMicroBadgeTextMissing,
                ]}
                numberOfLines={1}
              >
                {stockProgress.percentage === 100
                  ? '✓ Prêt'
                  : `${stockProgress.totalCount - stockProgress.matchedCount} manq.`}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // 3. Mode Détaillé (grandes cartes d'inspiration, par défaut)
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

        {/* 5 petites étoiles côte à côte transposées en bas à gauche */}
        {(recipe.rating || 0) > 0 && (
          <View style={styles.ratingBadge}>
            {[1, 2, 3, 4, 5].map((starIndex) => {
              const isFull = recipe.rating >= starIndex;
              const isHalf = !isFull && recipe.rating >= starIndex - 0.5;
              return (
                <Ionicons
                  key={starIndex}
                  name={isFull ? 'star' : isHalf ? 'star-half' : 'star-outline'}
                  size={11}
                  color={isFull || isHalf ? Colors.amber : 'rgba(255, 255, 255, 0.4)'}
                />
              );
            })}
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
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 2.5,
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

  // Styles Mode Compact
  compactCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  compactThumbnailContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  compactCornerBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 6,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 5,
  },
  compactCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.isDark ? colors.primary : colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactDot: {
    fontSize: 11,
    color: colors.textMuted,
  },
  compactTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  compactTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.amber,
  },
  compactStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockMicroBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockMicroBadgeTextCompact: {
    fontSize: 10,
  },
  compactChevron: {
    marginLeft: 8,
  },

  // Styles Mode Grille
  gridCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  gridImageContainer: {
    height: 115,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  gridTopBadgesRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    gap: 4,
  },
  gridMiniBadgeVege: {
    backgroundColor: '#16A34A',
    borderRadius: 6,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridMiniBadgeAllergen: {
    borderRadius: 6,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridRatingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  gridRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.amber,
  },
  gridBody: {
    padding: 10,
  },
  gridCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.isDark ? colors.primary : colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
    marginBottom: 6,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gridMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  gridStockMicroBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gridStockMicroBadgeText: {
    fontSize: 10,
  },
}));

export const RecipeCard = React.memo(RecipeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.viewMode === nextProps.viewMode &&
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
