import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../../theme/colors';

export interface SwipeableRecipeIngredientRowProps {
  children: React.ReactNode;
  onSwipeRight: () => void;
  isRecognized: boolean;
  indicatorColor?: string;
  showIndicator?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export const SwipeableRecipeIngredientRow: React.FC<SwipeableRecipeIngredientRowProps> = React.memo(({
  children,
  onSwipeRight,
  isRecognized,
  indicatorColor = '#16A34A',
  showIndicator = true,
  isFirst = false,
  isLast = false,
}) => {
  const [translateX] = useState(() => new Animated.Value(0));

  // Interpolations dynamiques pour le fond d'action
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

  // Inclinaison dynamique subtile de la rangée lors du glissement vers la droite
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
        return (
          gestureState.dx > 12 &&
          gestureState.dx > Math.abs(gestureState.dy) * 1.5
        );
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dx > 12 &&
          gestureState.dx > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
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
        // Seuil de basculement vers l'action
        const isSwipedEnough =
          gestureState.dx > 75 ||
          (gestureState.vx > 0.4 && gestureState.dx > 30);

        if (isSwipedEnough) {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 8,
            tension: 45,
            useNativeDriver: true,
          }).start();
          onSwipeRight();
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
        Animated.spring(translateX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    });
  }, [translateX, onSwipeRight]);

  return (
    <View
      style={[
        styles.swipeRowContainer,
        !isLast && styles.swipeRowBorder,
      ]}
    >
      {/* Fond d'action révélé par le swipe vers la droite : vert si dans le lexique, ambre si hors-lexique */}
      <View
        style={[
          styles.swipeHiddenActionWrap,
          !isRecognized && styles.swipeHiddenActionWrapUnrecognized,
        ]}
      >
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
          <Ionicons
            name={isRecognized ? 'cart-outline' : 'sparkles'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.swipeActionText}>
            {isRecognized ? 'Vers les courses' : 'Ajouter au lexique'}
          </Text>
        </Animated.View>
      </View>

      {/* Rangée de premier plan qui glisse */}
      <Animated.View
        style={[
          styles.swipeForeground,
          {
            transform: [{ translateX }, { rotate: rowRotate }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Barre verticale de couleur faisant toute la hauteur de la ligne */}
        {showIndicator && (
          <View
            style={[styles.indicatorBar, { backgroundColor: indicatorColor }]}
            pointerEvents="none"
          />
        )}

        {children}
      </Animated.View>
    </View>
  );
});

SwipeableRecipeIngredientRow.displayName = 'SwipeableRecipeIngredientRow';

const styles = createDynamicStyles((colors) => ({
  swipeRowContainer: {
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    position: 'relative',
  },
  swipeRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
  swipeHiddenActionWrapUnrecognized: {
    backgroundColor: '#D97706',
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
  indicatorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2.5,
    zIndex: 2,
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
