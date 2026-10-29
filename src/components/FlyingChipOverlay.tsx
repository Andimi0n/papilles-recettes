import React, { useEffect, useState } from 'react';
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

const FlyingChipItem: React.FC<FlyingChipItemProps> = ({ chip, onComplete }) => {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.15),
      useNativeDriver: true,
    }).start(() => {
      chip.onArrival?.();
      onComplete(chip.id);
    });
  }, [chip, onComplete, progress]);

  // Trajectoire en parabole (arc ascendant)
  const midY = Math.min(chip.startY, chip.targetY) - 50;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [chip.startX - 45, chip.targetX - 45],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [chip.startY - 16, midY, chip.targetY - 16],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0.65, 1.08, 0.9, 0.35],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.chip,
        chip.color ? { backgroundColor: chip.color } : null,
        {
          transform: [{ translateX }, { translateY }, { scale }],
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
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: 150,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
