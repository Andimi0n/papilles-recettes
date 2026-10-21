import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getRatingLabel } from '../utils/helpers';

interface StarRatingProps {
  rating: number; // 0 à 5 (par pas de 0.5)
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showScore?: boolean;
  showLabel?: boolean;
  showClear?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  showScore = false,
  showLabel = false,
  showClear = false,
}) => {
  const { colors, isDark } = useTheme();
  // Arrondit au demi-point le plus proche (ex: 0.5, 1.0, 1.5, 2.0...)
  const currentRating = Math.max(0, Math.min(maxStars, Math.round((rating || 0) * 2) / 2));

  /**
   * Clic sur la moitié GAUCHE d'une étoile (ex: étoile 1 -> 0.5, étoile 4 -> 3.5)
   */
  const handleLeftPress = (starIndex: number) => {
    if (!onRatingChange) return;
    const targetHalf = starIndex - 0.5;

    // Si on est déjà exactement sur cette demi-étoile :
    // - pour l'étoile 1 (0.5), un second clic réinitialise à 0
    // - pour les autres (ex: 3.5), un second clic bascule sur l'étoile pleine (4.0)
    if (currentRating === targetHalf) {
      if (targetHalf === 0.5) {
        onRatingChange(0);
      } else {
        onRatingChange(starIndex);
      }
    } else {
      onRatingChange(targetHalf);
    }
  };

  /**
   * Clic sur la moitié DROITE d'une étoile (ex: étoile 1 -> 1.0, étoile 4 -> 4.0)
   */
  const handleRightPress = (starIndex: number) => {
    if (!onRatingChange) return;
    // Si l'étoile est déjà pleine, tapoter à nouveau dessus la bascule en demi-étoile (ex: 4 -> 3.5, 1 -> 0.5)
    if (currentRating === starIndex) {
      onRatingChange(starIndex - 0.5);
    } else {
      onRatingChange(starIndex);
    }
  };

  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const isFull = currentRating >= i;
    const isHalf = !isFull && currentRating >= i - 0.5;

    const iconName = isFull ? 'star' : isHalf ? 'star-half' : 'star-outline';
    const iconColor = isFull || isHalf ? colors.amber : (isDark ? '#4A5B52' : colors.border);

    const starElement = (
      <Ionicons
        name={iconName}
        size={size}
        color={iconColor}
        style={styles.starIcon}
      />
    );

    if (interactive && onRatingChange) {
      stars.push(
        <View
          key={`star_container_${i}`}
          style={[styles.starContainer, { width: size + 4, height: size + 6 }]}
        >
          {starElement}
          {/* Zone tactile moitié gauche (0.5, 1.5, 2.5...) */}
          <TouchableOpacity
            style={styles.halfTouchLeft}
            activeOpacity={0.6}
            onPress={() => handleLeftPress(i)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 0 }}
            accessibilityLabel={`${i - 0.5} étoiles`}
          />
          {/* Zone tactile moitié droite (1.0, 2.0, 3.0...) */}
          <TouchableOpacity
            style={styles.halfTouchRight}
            activeOpacity={0.6}
            onPress={() => handleRightPress(i)}
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 4 }}
            accessibilityLabel={`${i} étoiles`}
          />
        </View>
      );
    } else {
      stars.push(
        <View key={`star_${i}`} style={{ width: size + 2, alignItems: 'center' }}>
          {starElement}
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{stars}</View>

      {showScore && (
        <Text style={[styles.scoreText, { fontSize: Math.max(12, size * 0.65) }]}>
          {currentRating > 0 ? currentRating.toFixed(1) : '-'}
        </Text>
      )}

      {showLabel && (
        <Text style={styles.labelText}>
          {getRatingLabel(currentRating)}
        </Text>
      )}

      {showClear && interactive && currentRating > 0 && onRatingChange && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => onRatingChange(0)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Effacer la note"
        >
          <Ionicons name="close-circle-outline" size={Math.max(16, size * 0.7)} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  starIcon: {
    pointerEvents: 'none',
  },
  halfTouchLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 2,
  },
  halfTouchRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 2,
  },
  scoreText: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.amber,
    marginLeft: 8,
  },
  clearBtn: {
    marginLeft: 6,
    padding: 2,
  },
}));
