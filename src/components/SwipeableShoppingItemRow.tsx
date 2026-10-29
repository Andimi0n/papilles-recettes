import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';

interface SwipeableShoppingItemRowProps {
  children: React.ReactNode;
  onMoveToShelves: () => void;
  isFirst: boolean;
  isLast: boolean;
  shouldAnimateHint?: boolean;
  onLongPress?: () => void;
}

export const SwipeableShoppingItemRow: React.FC<SwipeableShoppingItemRowProps> = ({
  children,
  onMoveToShelves,
  isFirst,
  isLast,
  shouldAnimateHint = false,
  onLongPress,
}) => {
  const [translateX] = useState(() => new Animated.Value(0));

  // Animation d'amorce (découverte du swipe gauche) au montage
  useEffect(() => {
    if (shouldAnimateHint) {
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: -65,
            duration: 340,
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
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [shouldAnimateHint, translateX]);

  const snapClose = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateX]);

  const [panResponder] = useState(() => {
    let isOpen = false;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (isOpen) {
          const nextVal = -110 + gestureState.dx;
          translateX.setValue(Math.min(0, Math.max(nextVal, -130)));
        } else if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -130));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isOpen) {
          if (gestureState.dx > 40) {
            isOpen = false;
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          } else {
            Animated.timing(translateX, {
              toValue: -110,
              duration: 160,
              useNativeDriver: true,
            }).start();
          }
        } else {
          if (gestureState.dx < -50) {
            isOpen = true;
            Animated.timing(translateX, {
              toValue: -110,
              duration: 160,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        isOpen = false;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    });
  });

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
      {/* Bouton d'action révélé par le swipe gauche pour basculer vers les étagères */}
      <View style={styles.swipeHiddenActionWrap}>
        <TouchableOpacity
          style={styles.swipeShelvesBtn}
          onPress={() => {
            snapClose();
            onMoveToShelves();
          }}
          activeOpacity={0.85}
          accessibilityLabel="Ranger dans mes étagères"
        >
          <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
          <Text style={styles.swipeShelvesBtnText}>Étagères</Text>
        </TouchableOpacity>
      </View>

      {/* Rangée de premier plan qui glisse */}
      <Animated.View
        style={[
          styles.swipeForeground,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onLongPress={onLongPress}
          delayLongPress={350}
        >
          {children}
        </TouchableOpacity>
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
    right: 0,
    width: 110,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  swipeShelvesBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 3,
  },
  swipeShelvesBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  swipeForeground: {
    backgroundColor: colors.cardBackground,
    width: '100%',
  },
}));
