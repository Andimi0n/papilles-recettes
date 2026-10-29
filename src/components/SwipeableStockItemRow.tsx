import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Platform,
  Vibration,
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

  // Micro-retour haptique au franchissement du seuil (75px)
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(12);
      } catch {
        // Fallback sans effet si vibration non supportée
      }
    }
  }, []);

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

  // Interpolations dynamiques pour le retour visuel et l'affordance (P5)
  const affordanceOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 8, 25],
      outputRange: [1, 0.4, 0],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 25, 75],
      outputRange: [0.2, 0.6, 1],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionScale = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 35, 75, 120],
      outputRange: [0.85, 0.95, 1.06, 1.15],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionTranslateX = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 75, 150],
      outputRange: [-16, 0, 16],
      extrapolate: 'clamp',
    });
  }, [translateX]);

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
        const state = gestureState as typeof gestureState & { _hapticFired?: boolean };
        if (gestureState.dx > 0) {
          // Amorti élastique progressif au-delà de 120px
          const offset =
            gestureState.dx > 120
              ? 120 + (gestureState.dx - 120) * 0.4
              : gestureState.dx;
          translateX.setValue(offset);

          // Détection du passage de seuil (75px) avec retour haptique
          const isPastThreshold = gestureState.dx >= 75;
          if (isPastThreshold && !state._hapticFired) {
            state._hapticFired = true;
            triggerHaptic();
          } else if (!isPastThreshold && state._hapticFired) {
            state._hapticFired = false;
          }
        } else {
          translateX.setValue(0);
          state._hapticFired = false;
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
  }, [translateX, isTriggered, onMoveToShopping, triggerHaptic]);

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
        <Animated.View
          style={[
            styles.swipeContentBox,
            {
              opacity: actionOpacity,
              transform: [
                { scale: actionScale },
                { translateX: actionTranslateX },
              ],
            },
          ]}
        >
          <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>Vers les courses</Text>
        </Animated.View>
      </View>

      {/* Rangée de premier plan qui glisse */}
      <Animated.View
        style={[styles.swipeForeground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Micro-signifier d'affordance permanent (swipe vers la droite) */}
        <Animated.View
          style={[styles.affordancePillLeft, { opacity: affordanceOpacity }]}
          pointerEvents="none"
        >
          <View style={styles.affordanceBarLeft} />
          <Ionicons
            name="chevron-forward"
            size={10}
            color="#16A34A"
            style={styles.affordanceChevronLeft}
          />
        </Animated.View>

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
  affordancePillLeft: {
    position: 'absolute',
    left: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 2,
  },
  affordanceBarLeft: {
    width: 2.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#16A34A',
    opacity: 0.55,
  },
  affordanceChevronLeft: {
    marginLeft: 0.5,
    opacity: 0.55,
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
