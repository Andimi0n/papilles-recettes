import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export interface FloatingSelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onAssignToFolder: () => void;
  onRemoveFromFolder?: () => void;
  activeFolderId?: string | null;
  folderName?: string;
  bottomInset?: number;
}

export const FloatingSelectionBar: React.FC<FloatingSelectionBarProps> = ({
  selectedCount,
  onClearSelection,
  onAssignToFolder,
  onRemoveFromFolder,
  activeFolderId,
  bottomInset = 0,
}) => {
  const { colors } = useTheme();
  const [translateYAnim] = useState(() => new Animated.Value(60));
  const [opacityAnim] = useState(() => new Animated.Value(0));

  const isInsideFolder = Boolean(activeFolderId && activeFolderId !== 'UNCATEGORIZED');

  useEffect(() => {
    if (selectedCount > 0) {
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: 60,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedCount, translateYAnim, opacityAnim]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomInset + 16,
          transform: [{ translateY: translateYAnim }],
          opacity: opacityAnim,
        },
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Barre d'actions de sélection multiple"
    >
      {/* Côté gauche : Bouton fermer (✕) + Compteur sélection */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={onClearSelection}
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Désélectionner tout"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.countText}>
          {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Côté droit : Actions contextuelles selon activeFolderId */}
      <View style={styles.rightSection}>
        {isInsideFolder && onRemoveFromFolder ? (
          <>
            <TouchableOpacity
              onPress={onRemoveFromFolder}
              style={[styles.secondaryButton, { borderColor: colors.danger }]}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Retirer les recettes du dossier"
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color={colors.danger} />
              <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
                Retirer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAssignToFolder}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ranger dans un autre dossier"
            >
              <Ionicons name="folder-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Autre dossier...</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onAssignToFolder}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ranger dans un dossier"
          >
            <Ionicons name="folder-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Ranger dans...</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: colors.cardBackground,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.large,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    ...shadows.small,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
}));
