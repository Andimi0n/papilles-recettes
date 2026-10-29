import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface FlyingItem {
  id: string;
  itemName: string;
  target: 'fridge' | 'shopping';
  startX: number;
  startY: number;
}

interface TransferAnimationOverlayProps {
  items: FlyingItem[];
  targetPositions: {
    fridge: { x: number; y: number };
    shopping: { x: number; y: number };
  };
  onItemArrived: (id: string, target: 'fridge' | 'shopping') => void;
}

interface SingleFlyingCapsuleProps {
  item: FlyingItem;
  targetPos: { x: number; y: number };
  onComplete: () => void;
  primaryColor: string;
}

const SingleFlyingCapsule: React.FC<SingleFlyingCapsuleProps> = React.memo(
  ({ item, targetPos, onComplete, primaryColor }) => {
    const insets = useSafeAreaInsets();
    const animProgress = useRef(new Animated.Value(0)).current;

    // Normalisation de startY par rapport à SafeArea
    const startYAdjusted = Math.max(70, item.startY - insets.top);
    const startX = item.startX;
    const targetX = targetPos.x;
    const targetY = targetPos.y;

    useEffect(() => {
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, [animProgress, onComplete]);

    // Trajectoire en arc parabolique
    // A mi-parcours (0.45), Y s'élève plus haut que la ligne directe pour créer une cloche naturelle
    const translateY = animProgress.interpolate({
      inputRange: [0, 0.45, 1],
      outputRange: [
        startYAdjusted,
        startYAdjusted - (startYAdjusted - targetY) * 0.7 - 24,
        targetY,
      ],
      extrapolate: 'clamp',
    });

    const translateX = animProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [startX, targetX],
      extrapolate: 'clamp',
    });

    // Échelle : pop à l'apparition (1.12), maintien, puis absorption (0.35) dans l'onglet
    const scale = animProgress.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0.85, 1.12, 0.95, 0.35],
      extrapolate: 'clamp',
    });

    // Opacité : fade-in très vif puis fade-out rapide sur l'impact final
    const opacity = animProgress.interpolate({
      inputRange: [0, 0.1, 0.88, 1],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });

    // Légère inclinaison dynamique dans le sens du vol
    const rotate = animProgress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange:
        item.target === 'shopping'
          ? ['0deg', '8deg', '0deg']
          : ['0deg', '-8deg', '0deg'],
      extrapolate: 'clamp',
    });

    const isToShopping = item.target === 'shopping';
    const bgColor = isToShopping ? '#16A34A' : primaryColor;

    // Nom tronqué pour préserver une pilule compacte et élégante
    const displayName =
      item.itemName.length > 18
        ? `${item.itemName.slice(0, 17)}…`
        : item.itemName;

    return (
      <Animated.View
        style={[
          styles.flyingCapsule,
          {
            backgroundColor: bgColor,
            opacity,
            transform: [
              { translateX },
              { translateY },
              { scale },
              { rotate },
            ],
          },
        ]}
      >
        <Ionicons
          name={isToShopping ? 'cart' : 'layers'}
          size={13}
          color="#FFFFFF"
        />
        <Text style={styles.flyingText} numberOfLines={1}>
          +1 {displayName}
        </Text>
      </Animated.View>
    );
  }
);

SingleFlyingCapsule.displayName = 'SingleFlyingCapsule';

export const TransferAnimationOverlay: React.FC<TransferAnimationOverlayProps> = React.memo(
  ({ items, targetPositions, onItemArrived }) => {
    const { colors } = useTheme();

    if (!items || items.length === 0) return null;

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {items.map((it) => (
          <SingleFlyingCapsule
            key={it.id}
            item={it}
            targetPos={targetPositions[it.target]}
            onComplete={() => onItemArrived(it.id, it.target)}
            primaryColor={colors.primary}
          />
        ))}
      </View>
    );
  }
);

TransferAnimationOverlay.displayName = 'TransferAnimationOverlay';

const styles = StyleSheet.create({
  flyingCapsule: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
    // Décalage pour centrer la pilule sur (translateX, translateY)
    marginLeft: -50,
    marginTop: -16,
  },
  flyingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
