import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getRatingLabel } from '../utils/helpers';

interface StarRatingProps {
  rating: number; // 0 to 5
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showScore?: boolean;
  showLabel?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  showScore = false,
  showLabel = false,
}) => {
  const stars = [];

  for (let i = 1; i <= maxStars; i++) {
    const isFull = rating >= i;
    const isHalf = !isFull && rating >= i - 0.5;

    const iconName = isFull ? 'star' : isHalf ? 'star-half' : 'star-outline';
    const iconColor = isFull || isHalf ? Colors.amber : Colors.border;

    const starElement = (
      <Ionicons
        key={`star_${i}`}
        name={iconName}
        size={size}
        color={iconColor}
        style={styles.starIcon}
      />
    );

    if (interactive && onRatingChange) {
      stars.push(
        <TouchableOpacity
          key={`star_btn_${i}`}
          activeOpacity={0.7}
          onPress={() => onRatingChange(i)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          {starElement}
        </TouchableOpacity>
      );
    } else {
      stars.push(starElement);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{stars}</View>
      {showScore && (
        <Text style={[styles.scoreText, { fontSize: Math.max(12, size * 0.75) }]}>
          {rating > 0 ? rating.toFixed(1) : '-'}
        </Text>
      )}
      {showLabel && (
        <Text style={styles.labelText}>
          {getRatingLabel(rating)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  scoreText: {
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.amber,
    marginLeft: 8,
  },
});
