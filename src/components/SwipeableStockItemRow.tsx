import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';

interface SwipeableStockItemRowProps {
  children: React.ReactNode;
  onMoveToShopping: () => void;
  isFirst: boolean;
  isLast: boolean;
  shouldAnimateHint?: boolean;
  hintTrigger?: number;
}

export const SwipeableStockItemRow: React.FC<SwipeableStockItemRowProps> = ({
  children,
  onMoveToShopping,
  isFirst,
  isLast,
  shouldAnimateHint = false,
  hintTrigger = 0,
}) => {
  const [translateX] = useState(() => new Animated.Value(0));
  const [isTriggered, setIsTriggered] = useState(false);
  const hasAnimatedRef = useRef(false);

  // Petite animation d'amorce vers la droite quand on arrive sur l'écran (jouée 1 seule fois par arrivée)
  useEffect(() => {
    if (shouldAnimateHint && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 65,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.delay(220),
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [shouldAnimateHint, hintTrigger, translateX]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (isTriggered) return false;
        return (
          gestureState.dx > 12 &&
          gestureState.dx > Math.abs(gestureState.dy) * 1.5
        );
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isTriggered) return false;
        return (
          gestureState.dx > 12 &&
          gestureState.dx > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTriggered) return;
        if (gestureState.dx > 0) {
          // Amorti élastique progressif au-delà de 120px
          const offset =
            gestureState.dx > 120
              ? 120 + (gestureState.dx - 120) * 0.4
              : gestureState.dx;
          translateX.setValue(offset);
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isTriggered) return;

        // Seuil de basculement vers les courses
        const isSwipedEnough =
          gestureState.dx > 75 ||
          (gestureState.vx > 0.4 && gestureState.dx > 30);

        if (isSwipedEnough) {
          setIsTriggered(true);
          Animated.timing(translateX, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onMoveToShopping();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isTriggered) {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [translateX, isTriggered, onMoveToShopping]);

  return (
    <View
      style={[
        styles.swipeRowContainer,
        isFirst && isLast && { borderRadius: 14 },
        isFirst && !isLast && {
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        },
        !isFirst && !isLast && {
          borderRadius: 0,
          borderTopWidth: 0,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        !isFirst && isLast && {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      ]}
    >
      {/* Fond d'action vert révélé par le swipe vers la droite */}
      <View style={styles.swipeHiddenActionWrap}>
        <View style={styles.swipeContentBox}>
          <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Vers les courses</Text>
        </View>
      </View>

      {/* Rangée de premier plan qui glisse */}
      <Animated.View
        style={[styles.swipeForeground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  swipeRowContainer: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  swipeHiddenActionWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#16A34A',
    paddingLeft: 18,
  },
  swipeContentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
