import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface FlyingChipData {
  id: string;
  name: string;
  iconName: 'cart' | 'layers';
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color?: string;
  onArrival?: () => void;
}

interface FlyingChipItemProps {
  chip: FlyingChipData;
  onComplete: (id: string) => void;
}

const STEPS = 20;

const FlyingChipItem: React.FC<FlyingChipItemProps> = ({ chip, onComplete }) => {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: true,
    }).start(() => {
      chip.onArrival?.();
      onComplete(chip.id);
    });
  }, [chip, onComplete, progress]);

  // Calcul mathématique d'une trajectoire parabolique fluide (courbe de Bézier quadratique)
  const { inputRange, outputRangeX, outputRangeY, maxTilt } = useMemo(() => {
    const p0x = chip.startX - 50;
    const p0y = chip.startY - 16;
    const p2x = chip.targetX - 50;
    const p2y = chip.targetY - 16;

    const dy = Math.abs(p0y - p2y);
    const arcPeak = Math.max(70, dy * 0.28);
    const p1y = Math.min(p0y, p2y) - arcPeak;

    const dx = p2x - p0x;
    const midX = (p0x + p2x) / 2;
    const bowDirection = dx > 0 ? -25 : 25;
    const p1x = midX + bowDirection;

    const inRange: number[] = [];
    const outX: number[] = [];
    const outY: number[] = [];

    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      inRange.push(t);
      const oneMinusT = 1 - t;
      // B(t) = (1 - t)^2 * P0 + 2 * (1 - t) * t * P1 + t^2 * P2
      const bx = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * t * p1x + t * t * p2x;
      const by = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * t * p1y + t * t * p2y;
      outX.push(bx);
      outY.push(by);
    }

    return {
      inputRange: inRange,
      outputRangeX: outX,
      outputRangeY: outY,
      maxTilt: dx < 0 ? -12 : 12,
    };
  }, [chip.startX, chip.startY, chip.targetX, chip.targetY]);

  const translateX = progress.interpolate({
    inputRange,
    outputRange: outputRangeX,
  });

  const translateY = progress.interpolate({
    inputRange,
    outputRange: outputRangeY,
  });

  const rotate = progress.interpolate({
    inputRange: [0, 0.22, 0.7, 1],
    outputRange: ['0deg', `${maxTilt}deg`, `${Math.round(maxTilt * 0.35)}deg`, '0deg'],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.15, 0.5, 0.85, 1],
    outputRange: [0.45, 1.14, 1.0, 0.82, 0.22],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.06, 0.88, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.chip,
        chip.color ? { backgroundColor: chip.color } : null,
        {
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
          opacity,
        },
      ]}
    >
      <Ionicons
        name={chip.iconName === 'cart' ? 'cart' : 'layers'}
        size={14}
        color="#FFFFFF"
      />
      <Text style={styles.chipText} numberOfLines={1}>
        {chip.name}
      </Text>
    </Animated.View>
  );
};

interface FlyingChipOverlayProps {
  chips: FlyingChipData[];
  onRemoveChip: (id: string) => void;
}

export const FlyingChipOverlay: React.FC<FlyingChipOverlayProps> = ({
  chips,
  onRemoveChip,
}) => {
  if (chips.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {chips.map((chip) => (
        <FlyingChipItem
          key={chip.id}
          chip={chip}
          onComplete={onRemoveChip}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 99,
  },
  chip: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    maxWidth: 160,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
