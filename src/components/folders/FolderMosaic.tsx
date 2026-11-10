import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';
import { getFolderMosaicImages, FolderMosaicSlotTuple, RecipePhotoCandidate } from '../../utils/folderMosaicHelper';

export interface FolderMosaicProps {
  /**
   * Liste de recettes, d'objets avec imageUrl, ou tuple de 4 slots
   */
  images?: readonly RecipePhotoCandidate[] | RecipePhotoCandidate[] | FolderMosaicSlotTuple | null;
  /**
   * Taille fixe optionnelle (largeur et hauteur identiques)
   */
  size?: number;
  /**
   * Rayon des coins de la mosaïque (défaut : 14)
   */
  borderRadius?: number;
  /**
   * Style personnalisé additionnel
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Icône de substitution pour les slots vides
   */
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
}

export const FolderMosaic: React.FC<FolderMosaicProps> = ({
  images,
  size,
  borderRadius = 14,
  style,
  fallbackIcon = 'restaurant-outline',
}) => {
  const { colors, isDark } = useTheme();
  const styles = dynamicStyles;

  const slots = getFolderMosaicImages(images);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    {
      borderRadius,
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.borderLight,
    },
    size ? { width: size, height: size } : styles.fluidAspectRatio,
    style,
  ];

  const iconColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.18)';
  const iconSize = size ? Math.max(14, Math.round(size * 0.16)) : 18;

  const renderSlot = (slotUrl: string | null, index: number) => {
    return (
      <View key={`slot-${index}`} style={[styles.cell, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
        {slotUrl ? (
          <Image
            source={{ uri: slotUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
          />
        ) : (
          <Ionicons name={fallbackIcon} size={iconSize} color={iconColor} />
        )}
      </View>
    );
  };

  return (
    <View style={containerStyle} testID="folder-mosaic-container">
      {/* Ligne supérieure (slots 0 et 1) */}
      <View style={styles.row}>
        {renderSlot(slots[0], 0)}
        <View style={[styles.verticalDivider, { backgroundColor: colors.borderLight }]} />
        {renderSlot(slots[1], 1)}
      </View>

      {/* Séparateur horizontal */}
      <View style={[styles.horizontalDivider, { backgroundColor: colors.borderLight }]} />

      {/* Ligne inférieure (slots 2 et 3) */}
      <View style={styles.row}>
        {renderSlot(slots[2], 2)}
        <View style={[styles.verticalDivider, { backgroundColor: colors.borderLight }]} />
        {renderSlot(slots[3], 3)}
      </View>
    </View>
  );
};

const dynamicStyles = createDynamicStyles((colors) => ({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  fluidAspectRatio: {
    width: '100%',
    aspectRatio: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  verticalDivider: {
    width: 1.5,
    height: '100%',
  },
  horizontalDivider: {
    height: 1.5,
    width: '100%',
  },
}));
