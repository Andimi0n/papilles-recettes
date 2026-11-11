import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Image as RNImage,
  LayoutChangeEvent,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useTheme } from '../../theme/ThemeContext';

export interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onApplyCrop: (croppedUri: string) => void;
  title?: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayLayout {
  scale: number;
  displayedWidth: number;
  displayedHeight: number;
  offsetX: number;
  offsetY: number;
}

const FIXED_ASPECT_RATIO = 1; // Format 1:1 (carré)
const MIN_CROP_SIZE = 64;
const CORNER_TOUCH_RADIUS = 44;
const EDGE_TOUCH_RADIUS = 32;

type DragMode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right' | null;

function computeMax1x1Rect(layout: DisplayLayout, scaleFactor = 0.94): CropRect {
  const { displayedWidth, displayedHeight, offsetX, offsetY } = layout;

  const size = Math.min(displayedWidth, displayedHeight) * scaleFactor;

  return {
    x: offsetX + (displayedWidth - size) / 2,
    y: offsetY + (displayedHeight - size) / 2,
    width: size,
    height: size,
  };
}

function createCropPanResponder(
  getCropRect: () => CropRect,
  getDisplayLayout: () => DisplayLayout | null,
  onUpdateCropRect: (rect: CropRect) => void,
  onDragStateChange: (isDragging: boolean) => void
) {
  let activeDrag: DragMode = null;
  let startDragRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const current = getCropRect();
      const right = current.x + current.width;
      const bottom = current.y + current.height;

      // Zone centrale réservée au déplacement si le cadre devient petit
      const innerMarginX = Math.min(28, current.width * 0.25);
      const innerMarginY = Math.min(28, current.height * 0.25);
      const isDeepInside =
        locationX > current.x + innerMarginX &&
        locationX < right - innerMarginX &&
        locationY > current.y + innerMarginY &&
        locationY < bottom - innerMarginY;

      // 1. Détection des 4 coins
      const cornerCandidates: { mode: DragMode; dist: number }[] = [
        { mode: 'tl' as const, dist: Math.hypot(locationX - current.x, locationY - current.y) },
        { mode: 'tr' as const, dist: Math.hypot(locationX - right, locationY - current.y) },
        { mode: 'bl' as const, dist: Math.hypot(locationX - current.x, locationY - bottom) },
        { mode: 'br' as const, dist: Math.hypot(locationX - right, locationY - bottom) },
      ].filter((c) => c.dist <= CORNER_TOUCH_RADIUS);

      if (cornerCandidates.length > 0 && !isDeepInside) {
        cornerCandidates.sort((a, b) => a.dist - b.dist);
        activeDrag = cornerCandidates[0].mode;
      } else if (!isDeepInside) {
        // 2. Détection des 4 bords
        const withinX = locationX >= current.x - EDGE_TOUCH_RADIUS && locationX <= right + EDGE_TOUCH_RADIUS;
        const withinY = locationY >= current.y - EDGE_TOUCH_RADIUS && locationY <= bottom + EDGE_TOUCH_RADIUS;

        const edgeCandidates: { mode: DragMode; dist: number }[] = [];
        if (withinX && Math.abs(locationY - current.y) <= EDGE_TOUCH_RADIUS) {
          edgeCandidates.push({ mode: 'top', dist: Math.abs(locationY - current.y) });
        }
        if (withinX && Math.abs(locationY - bottom) <= EDGE_TOUCH_RADIUS) {
          edgeCandidates.push({ mode: 'bottom', dist: Math.abs(locationY - bottom) });
        }
        if (withinY && Math.abs(locationX - current.x) <= EDGE_TOUCH_RADIUS) {
          edgeCandidates.push({ mode: 'left', dist: Math.abs(locationX - current.x) });
        }
        if (withinY && Math.abs(locationX - right) <= EDGE_TOUCH_RADIUS) {
          edgeCandidates.push({ mode: 'right', dist: Math.abs(locationX - right) });
        }

        if (edgeCandidates.length > 0) {
          edgeCandidates.sort((a, b) => a.dist - b.dist);
          activeDrag = edgeCandidates[0].mode;
        } else if (
          locationX >= current.x &&
          locationX <= right &&
          locationY >= current.y &&
          locationY <= bottom
        ) {
          activeDrag = 'move';
        } else {
          activeDrag = null;
        }
      } else {
        // 3. Déplacement du cadre entier
        activeDrag = 'move';
      }

      startDragRect = { ...current };
      onDragStateChange(activeDrag !== null);
    },
    onPanResponderMove: (_, gestureState) => {
      const layout = getDisplayLayout();
      if (!activeDrag || !layout) return;

      const start = startDragRect;
      const { displayedWidth, displayedHeight, offsetX, offsetY } = layout;
      const minX = offsetX;
      const minY = offsetY;
      const maxX = offsetX + displayedWidth;
      const maxY = offsetY + displayedHeight;

      const { dx, dy } = gestureState;

      // Déplacement simple du cadre
      if (activeDrag === 'move') {
        const nextX = Math.max(minX, Math.min(start.x + dx, maxX - start.width));
        const nextY = Math.max(minY, Math.min(start.y + dy, maxY - start.height));

        onUpdateCropRect({
          x: nextX,
          y: nextY,
          width: start.width,
          height: start.height,
        });
        return;
      }

      let newX = start.x;
      let newY = start.y;
      let newSize = start.width;

      if (activeDrag === 'br' || activeDrag === 'tl' || activeDrag === 'tr' || activeDrag === 'bl') {
        const isLeft = activeDrag === 'tl' || activeDrag === 'bl';
        const isTop = activeDrag === 'tl' || activeDrag === 'tr';

        const anchorX = isLeft ? start.x + start.width : start.x;
        const anchorY = isTop ? start.y + start.height : start.y;

        const availW = isLeft ? anchorX - minX : maxX - anchorX;
        const availH = isTop ? anchorY - minY : maxY - anchorY;

        const maxAllowedSize = Math.min(availW, availH);
        const minAllowedSize = Math.min(MIN_CROP_SIZE, maxAllowedSize);

        // Projection fluide sur la diagonale 1:1
        const deltaSize = ((isLeft ? -dx : dx) + (isTop ? -dy : dy)) / 2;
        newSize = Math.max(minAllowedSize, Math.min(start.width + deltaSize, maxAllowedSize));

        newX = isLeft ? anchorX - newSize : anchorX;
        newY = isTop ? anchorY - newSize : anchorY;
      } else if (activeDrag === 'left' || activeDrag === 'right') {
        const isLeft = activeDrag === 'left';
        const anchorX = isLeft ? start.x + start.width : start.x;
        const centerY = start.y + start.height / 2;

        const availW = isLeft ? anchorX - minX : maxX - anchorX;
        const maxAllowedSize = Math.min(availW, displayedHeight);
        const minAllowedSize = Math.min(MIN_CROP_SIZE, maxAllowedSize);

        const rawSize = isLeft ? start.width - dx : start.width + dx;
        newSize = Math.max(minAllowedSize, Math.min(rawSize, maxAllowedSize));

        newX = isLeft ? anchorX - newSize : anchorX;
        // Glissement vertical automatique si le carré touche le haut ou le bas
        newY = Math.max(minY, Math.min(centerY - newSize / 2, maxY - newSize));
      } else if (activeDrag === 'top' || activeDrag === 'bottom') {
        const isTop = activeDrag === 'top';
        const anchorY = isTop ? start.y + start.height : start.y;
        const centerX = start.x + start.width / 2;

        const availH = isTop ? anchorY - minY : maxY - anchorY;
        const maxAllowedSize = Math.min(availH, displayedWidth);
        const minAllowedSize = Math.min(MIN_CROP_SIZE, maxAllowedSize);

        const rawSize = isTop ? start.height - dy : start.height + dy;
        newSize = Math.max(minAllowedSize, Math.min(rawSize, maxAllowedSize));

        newY = isTop ? anchorY - newSize : anchorY;
        // Glissement horizontal automatique si le carré touche la gauche ou la droite
        newX = Math.max(minX, Math.min(centerX - newSize / 2, maxX - newSize));
      }

      onUpdateCropRect({
        x: newX,
        y: newY,
        width: newSize,
        height: newSize,
      });
    },
    onPanResponderRelease: () => {
      activeDrag = null;
      onDragStateChange(false);
    },
    onPanResponderTerminate: () => {
      activeDrag = null;
      onDragStateChange(false);
    },
  });
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  visible,
  imageUri,
  onClose,
  onApplyCrop,
  title,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [prevUri, setPrevUri] = useState<string | null>(imageUri);
  const [workingUri, setWorkingUri] = useState<string | null>(imageUri);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [customCropRect, setCustomCropRect] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Cadrage en cours...');

  // Réinitialiser l'état lors d'un changement de l'image source
  if (imageUri !== prevUri) {
    setPrevUri(imageUri);
    setWorkingUri(imageUri);
    setCustomCropRect(null);
  }

  // Charger les dimensions réelles de l'image
  useEffect(() => {
    if (!visible || !workingUri) {
      return;
    }

    let isMounted = true;
    RNImage.getSize(
      workingUri,
      (width, height) => {
        if (isMounted) {
          setImageSize({ width, height });
        }
      },
      (err) => {
        if (isMounted) {
          console.warn('[ImageCropper] Erreur récupération taille image:', err);
          Alert.alert('Erreur', "Impossible de lire les dimensions de l'image.");
          onClose();
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [visible, workingUri, onClose]);

  // Calculer l'espace d'affichage de l'image (contentFit="contain")
  const displayLayout = useMemo((): DisplayLayout | null => {
    if (!imageSize || containerSize.width === 0 || containerSize.height === 0) {
      return null;
    }

    const scale = Math.min(
      containerSize.width / imageSize.width,
      containerSize.height / imageSize.height
    );

    const displayedWidth = imageSize.width * scale;
    const displayedHeight = imageSize.height * scale;
    const offsetX = (containerSize.width - displayedWidth) / 2;
    const offsetY = (containerSize.height - displayedHeight) / 2;

    return {
      scale,
      displayedWidth,
      displayedHeight,
      offsetX,
      offsetY,
    };
  }, [imageSize, containerSize]);

  // Rectangle 1:1 par défaut
  const defaultCropRect = useMemo((): CropRect => {
    if (!displayLayout) return { x: 0, y: 0, width: 0, height: 0 };
    return computeMax1x1Rect(displayLayout, 0.94);
  }, [displayLayout]);

  const activeCropRect = customCropRect ?? defaultCropRect;

  // Synchroniser les références pour le PanResponder
  const cropRectRef = useRef<CropRect>(activeCropRect);
  const displayLayoutRef = useRef<DisplayLayout | null>(displayLayout);

  useEffect(() => {
    cropRectRef.current = activeCropRect;
  }, [activeCropRect]);

  useEffect(() => {
    displayLayoutRef.current = displayLayout;
  }, [displayLayout]);

  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      createCropPanResponder(
        () => cropRectRef.current,
        () => displayLayoutRef.current,
        (updated) => {
          cropRectRef.current = updated;
          setCustomCropRect(updated);
        },
        setIsDragging
      ),
    []
  );
  /* eslint-enable react-hooks/refs */

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // Rotation de 90° dans le sens horaire
  const handleRotate90 = async () => {
    if (!workingUri || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingMessage('Rotation en cours...');

      const manipResult = await manipulateAsync(
        workingUri,
        [{ rotate: 90 }],
        {
          compress: 0.92,
          format: SaveFormat.JPEG,
        }
      );

      if (manipResult?.uri) {
        setWorkingUri(manipResult.uri);
        if (manipResult.width && manipResult.height) {
          setImageSize({ width: manipResult.width, height: manipResult.height });
        } else if (imageSize) {
          setImageSize({ width: imageSize.height, height: imageSize.width });
        }
        setCustomCropRect(null);
      }
    } catch (err) {
      console.error('[ImageCropper] Erreur rotation:', err);
      Alert.alert('Erreur', "Impossible de faire pivoter l'image.");
    } finally {
      setIsProcessing(false);
      setProcessingMessage('Cadrage en cours...');
    }
  };

  // Réinitialiser au plein cadre 1:1 maximal
  const handleResetCrop = () => {
    if (displayLayout) {
      const full1x1 = computeMax1x1Rect(displayLayout, 1);
      cropRectRef.current = full1x1;
      setCustomCropRect(full1x1);
    }
  };

  // Appliquer le rognage via expo-image-manipulator
  const handleApply = async () => {
    if (!workingUri || !imageSize || !displayLayout || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingMessage('Application du cadrage...');
      const current = cropRectRef.current;
      const { scale, offsetX, offsetY } = displayLayout;

      const originX = Math.max(0, Math.round((current.x - offsetX) / scale));
      const originY = Math.max(0, Math.round((current.y - offsetY) / scale));
      const maxAvailableW = imageSize.width - originX;
      const maxAvailableH = imageSize.height - originY;
      const rawSide = Math.round(current.width / scale);
      const cropSide = Math.min(maxAvailableW, maxAvailableH, rawSide);

      if (cropSide <= 0) {
        Alert.alert('Erreur', 'Zone de rognage invalide.');
        return;
      }

      const manipResult = await manipulateAsync(
        workingUri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropSide,
              height: cropSide,
            },
          },
        ],
        {
          compress: 0.88,
          format: SaveFormat.JPEG,
        }
      );

      if (manipResult?.uri) {
        onApplyCrop(manipResult.uri);
        onClose();
      } else {
        Alert.alert('Erreur', "Impossible de rogner l'image.");
      }
    } catch (err) {
      console.error('[ImageCropper] Erreur manipulateAsync:', err);
      Alert.alert('Erreur', 'Le rognage a échoué.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('Cadrage en cours...');
    }
  };

  if (!visible || !workingUri) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { backgroundColor: '#000000' }]}>
        {/* Barre d'en-tête */}
        <View style={[styles.headerBar, { paddingTop: Math.max(insets.top + 8, 44) }]}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={onClose}
            accessibilityLabel="Annuler le rognage"
            disabled={isProcessing}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{title || 'Cadrer la photo'}</Text>
            <View style={styles.ratioBadge}>
              <Text style={styles.ratioBadgeText}>1:1</Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { marginRight: 8 }]}
              onPress={handleRotate90}
              accessibilityLabel="Pivoter de 90°"
              disabled={isProcessing}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleResetCrop}
              accessibilityLabel="Réinitialiser le cadre 1:1"
              disabled={isProcessing}
            >
              <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Zone centrale de visualisation et cadrage */}
        <View style={styles.cropArea} onLayout={handleContainerLayout}>
          <Image
            source={{ uri: workingUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />

          {/* Masque sombre et cadre interactif (pointerEvents="none" sur les enfants pour garantir des coordonnées exactes) */}
          {displayLayout && activeCropRect.width > 0 && activeCropRect.height > 0 && (
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* Masque sombre Haut */}
                <View
                  style={[
                    styles.maskSegment,
                    {
                      top: 0,
                      left: 0,
                      right: 0,
                      height: activeCropRect.y,
                    },
                  ]}
                />

                {/* Masque sombre Bas */}
                <View
                  style={[
                    styles.maskSegment,
                    {
                      top: activeCropRect.y + activeCropRect.height,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    },
                  ]}
                />

                {/* Masque sombre Gauche */}
                <View
                  style={[
                    styles.maskSegment,
                    {
                      top: activeCropRect.y,
                      left: 0,
                      width: activeCropRect.x,
                      height: activeCropRect.height,
                    },
                  ]}
                />

                {/* Masque sombre Droite */}
                <View
                  style={[
                    styles.maskSegment,
                    {
                      top: activeCropRect.y,
                      left: activeCropRect.x + activeCropRect.width,
                      right: 0,
                      height: activeCropRect.height,
                    },
                  ]}
                />

                {/* Cadre de recadrage 1:1 */}
                <View
                  style={[
                    styles.cropBox,
                    {
                      left: activeCropRect.x,
                      top: activeCropRect.y,
                      width: activeCropRect.width,
                      height: activeCropRect.height,
                    },
                  ]}
                >
                  {/* Grille des tiers */}
                  <View style={[styles.gridLineH1, isDragging && styles.gridLineActive]} />
                  <View style={[styles.gridLineH2, isDragging && styles.gridLineActive]} />
                  <View style={[styles.gridLineV1, isDragging && styles.gridLineActive]} />
                  <View style={[styles.gridLineV2, isDragging && styles.gridLineActive]} />

                  {/* 4 coins de redimensionnement renforcés */}
                  <View style={[styles.cornerHandle, styles.handleTL]} />
                  <View style={[styles.cornerHandle, styles.handleTR]} />
                  <View style={[styles.cornerHandle, styles.handleBL]} />
                  <View style={[styles.cornerHandle, styles.handleBR]} />

                  {/* 4 poignées latérales */}
                  <View style={[styles.edgeHandle, styles.edgeTop]} />
                  <View style={[styles.edgeHandle, styles.edgeBottom]} />
                  <View style={[styles.edgeHandle, styles.edgeLeft]} />
                  <View style={[styles.edgeHandle, styles.edgeRight]} />

                  {/* Poignée centrale discrète */}
                  <View style={styles.centerMoveIndicator}>
                    <Ionicons name="move" size={22} color="rgba(255,255,255,0.75)" />
                  </View>
                </View>
              </View>
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>{processingMessage}</Text>
            </View>
          )}
        </View>

        {/* Barre de contrôle inférieure */}
        <View style={[styles.bottomControlBar, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={onClose}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelActionText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyActionBtn, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              disabled={isProcessing || !displayLayout}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.applyActionText}>Valider le cadrage</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ratioBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratioBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  maskSegment: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  cornerHandle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#FFFFFF',
  },
  handleTL: {
    top: -3,
    left: -3,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 3,
  },
  handleTR: {
    top: -3,
    right: -3,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 3,
  },
  handleBL: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 3,
  },
  handleBR: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 3,
  },
  edgeHandle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  edgeTop: {
    top: -3,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 5,
  },
  edgeBottom: {
    bottom: -3,
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 5,
  },
  edgeLeft: {
    left: -3,
    top: '50%',
    marginTop: -18,
    width: 5,
    height: 36,
  },
  edgeRight: {
    right: -3,
    top: '50%',
    marginTop: -18,
    width: 5,
    height: 36,
  },
  centerMoveIndicator: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  processingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControlBar: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingTop: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  applyActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
