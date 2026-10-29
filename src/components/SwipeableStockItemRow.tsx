import React, { useState, useMemo } from 'react';
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
  onTriggerTransfer?: (coords: { startX: number; startY: number }) => void;
  isFirst: boolean;
  isLast: boolean;
  indicatorColor?: string;
}

export const SwipeableStockItemRow: React.FC<SwipeableStockItemRowProps> = React.memo(({
  children,
  onMoveToShopping,
  onTriggerTransfer,
  isFirst,
  isLast,
  indicatorColor = '#16A34A',
}) => {
  const [translateX] = useState(() => new Animated.Value(0));
  const [rowOpacity] = useState(() => new Animated.Value(1));
  const [isTriggered, setIsTriggered] = useState(false);

  // Interpolations dynamiques pour le retour visuel et l'affordance
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

  // Inclinaison dynamique subtile de la carte lors du swipe et de l'envol
  const rowRotate = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 150, 500],
      outputRange: ['0deg', '2deg', '4.5deg'],
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
          const startX = gestureState.moveX || 280;
          const startY = gestureState.moveY || 300;
          onTriggerTransfer?.({ startX, startY });

          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 550,
              duration: 210,
              useNativeDriver: true,
            }),
            Animated.timing(rowOpacity, {
              toValue: 0,
              duration: 190,
              useNativeDriver: true,
            }),
          ]).start(() => {
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
  }, [translateX, rowOpacity, isTriggered, onMoveToShopping, onTriggerTransfer]);

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
        style={[
          styles.swipeForeground,
          {
            opacity: rowOpacity,
            transform: [{ translateX }, { rotate: rowRotate }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Micro-signifier d'affordance permanent (swipe vers la droite) avec couleur du rayon */}
        <Animated.View
          style={[styles.affordancePillLeft, { opacity: affordanceOpacity }]}
          pointerEvents="none"
        >
          <View style={[styles.affordanceBarLeft, { backgroundColor: indicatorColor }]} />
          <Ionicons
            name="chevron-forward"
            size={10}
            color={indicatorColor}
            style={styles.affordanceChevronLeft}
          />
        </Animated.View>

        {children}
      </Animated.View>
    </View>
  );
});

SwipeableStockItemRow.displayName = 'SwipeableStockItemRow';

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
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 2,
  },
  affordanceBarLeft: {
    width: 2.5,
    height: 15,
    borderRadius: 2,
    opacity: 0.8,
  },
  affordanceChevronLeft: {
    marginLeft: 0.5,
    opacity: 0.8,
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
