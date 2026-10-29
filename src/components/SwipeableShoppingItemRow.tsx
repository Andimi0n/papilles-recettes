import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface SwipeableShoppingItemRowProps {
  children: React.ReactNode;
  onMoveToShelves: () => void;
  isFirst: boolean;
  isLast: boolean;
  shouldAnimateHint?: boolean;
  hintTrigger?: number;
  onLongPress?: () => void;
}

export const SwipeableShoppingItemRow: React.FC<SwipeableShoppingItemRowProps> = ({
  children,
  onMoveToShelves,
  isFirst,
  isLast,
  shouldAnimateHint = false,
  hintTrigger = 0,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const [translateX] = useState(() => new Animated.Value(0));
  const [isTriggered, setIsTriggered] = useState(false);
  const hasAnimatedRef = useRef(false);

  // Micro-retour haptique au franchissement du seuil (-75px)
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate(12);
      } catch {
        // Fallback sans effet si vibration non supportée
      }
    }
  }, []);

  // Petite animation d'amorce vers la gauche quand on arrive sur l'écran (jouée 1 seule fois par arrivée)
  useEffect(() => {
    if (shouldAnimateHint && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: -65,
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
      inputRange: [-25, -8, 0],
      outputRange: [0, 0.4, 1],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-75, -25, 0],
      outputRange: [1, 0.6, 0.2],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionScale = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-120, -75, -35, 0],
      outputRange: [1.15, 1.06, 0.95, 0.85],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const actionTranslateX = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-150, -75, 0],
      outputRange: [-16, 0, 16],
      extrapolate: 'clamp',
    });
  }, [translateX]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        if (isTriggered) return false;
        return (
          gestureState.dx < -12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isTriggered) return false;
        return (
          gestureState.dx < -12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTriggered) return;
        const state = gestureState as typeof gestureState & { _hapticFired?: boolean };
        if (gestureState.dx < 0) {
          // Amorti élastique progressif au-delà de -120px
          const offset =
            gestureState.dx < -120
              ? -120 + (gestureState.dx + 120) * 0.4
              : gestureState.dx;
          translateX.setValue(offset);

          // Détection du passage de seuil (-75px) avec retour haptique
          const isPastThreshold = gestureState.dx <= -75;
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

        // Seuil de basculement vers les étagères
        const isSwipedEnough =
          gestureState.dx < -75 ||
          (gestureState.vx < -0.4 && gestureState.dx < -30);

        if (isSwipedEnough) {
          setIsTriggered(true);
          Animated.timing(translateX, {
            toValue: -500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onMoveToShelves();
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
  }, [translateX, isTriggered, onMoveToShelves, triggerHaptic]);

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
      {/* Fond d'action bleu/primaire révélé par le swipe vers la gauche */}
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
          <Text style={styles.swipeActionText}>Vers mes étagères</Text>
          <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Rangée de premier plan qui glisse */}
      <Animated.View
        style={[styles.swipeForeground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={onLongPress}
          delayLongPress={350}
        >
          {children}
        </TouchableOpacity>

        {/* Micro-signifier d'affordance permanent (swipe vers la gauche) */}
        <Animated.View
          style={[styles.affordancePillRight, { opacity: affordanceOpacity }]}
          pointerEvents="none"
        >
          <Ionicons
            name="chevron-back"
            size={10}
            color={colors.primary}
            style={styles.affordanceChevronRight}
          />
          <View style={styles.affordanceBarRight} />
        </Animated.View>
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
    ...shadows.small,
  },
  swipeHiddenActionWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: colors.primary,
    paddingRight: 18,
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
  affordancePillRight: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 2,
  },
  affordanceBarRight: {
    width: 2.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  affordanceChevronRight: {
    marginRight: 0.5,
    opacity: 0.55,
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
