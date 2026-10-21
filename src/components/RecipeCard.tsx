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
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { StarRating } from './StarRating';
import { formatDuration } from '../utils/helpers';

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  onToggleFavorite?: () => void;
  onQuickRate?: (rating: number) => void;
  highlightedIngredients?: string[]; // ingredients matched by search
}

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  onPress,
  onQuickRate,
  highlightedIngredients = [],
}) => {
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
        </View>

        {/* Note / Star badge on top of image */}
        <View style={[styles.ratingBadge, recipe.rating === 0 && styles.ratingBadgeZero]}>
          <Ionicons
            name={recipe.rating > 0 ? "star" : "star-outline"}
            size={13}
            color={recipe.rating > 0 ? Colors.amber : Colors.textMuted}
          />
          <Text style={[styles.ratingBadgeText, recipe.rating === 0 && styles.ratingBadgeZeroText]}>
            {recipe.rating > 0 ? recipe.rating.toFixed(1) : 'Non notée'}
          </Text>
        </View>
      </View>

      {/* Card Body */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Description snippet */}
        <Text style={styles.description} numberOfLines={2}>
          {recipe.description}
        </Text>

        {/* Interactive Star Rating */}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingLabel}>Votre note :</Text>
          <StarRating
            rating={recipe.rating}
            size={18}
            interactive={true}
            onRatingChange={onQuickRate}
            showScore={recipe.rating > 0}
            showClear={recipe.rating > 0}
          />
        </View>

        {/* Matched Ingredients preview if any */}
        {highlightedIngredients.length > 0 && (
          <View style={styles.matchedSection}>
            <Text style={styles.matchedLabel}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.secondary} /> Contient :{' '}
              <Text style={styles.matchedText}>
                {highlightedIngredients.slice(0, 3).join(', ')}
                {highlightedIngredients.length > 3 ? ` (+${highlightedIngredients.length - 3})` : ''}
              </Text>
            </Text>
          </View>
        )}

        {/* Footer: Time, Servings, Difficulty */}
        <View style={styles.footer}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{formatDuration(totalTime)}</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{recipe.servings} pers.</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaItem}>
            <Ionicons name="speedometer-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{recipe.difficulty}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.medium,
  },
  imageContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    color: Colors.primaryDark,
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
  ratingBadgeZero: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  ratingBadgeZeroText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 23,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  matchedSection: {
    backgroundColor: Colors.secondaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  matchedLabel: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
  matchedText: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 5,
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
  },
}));

export const RecipeCard = React.memo(RecipeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.rating === nextProps.recipe.rating &&
    prevProps.recipe.title === nextProps.recipe.title &&
    prevProps.recipe.imageUrl === nextProps.recipe.imageUrl &&
    (prevProps.highlightedIngredients?.length || 0) === (nextProps.highlightedIngredients?.length || 0)
  );
});
