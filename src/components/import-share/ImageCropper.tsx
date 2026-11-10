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

export type CropAspectRatio = 'free' | '1:1' | '4:3' | '16:9';

export interface ImageCropperProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onApplyCrop: (croppedUri: string) => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_CROP_SIZE = 50;
const HANDLE_TOUCH_RADIUS = 36;

interface DisplayLayout {
  scale: number;
  displayedWidth: number;
  displayedHeight: number;
  offsetX: number;
  offsetY: number;
}

function createCropPanResponder(
  getCropRect: () => CropRect,
  getDisplayLayout: () => DisplayLayout | null,
  getAspectRatio: () => CropAspectRatio,
  onUpdateCropRect: (rect: CropRect) => void
) {
  let activeDrag: 'move' | 'tl' | 'tr' | 'bl' | 'br' | null = null;
  let startDragRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const current = getCropRect();

      // Détection des 4 coins
      const distTL = Math.hypot(locationX - current.x, locationY - current.y);
      const distTR = Math.hypot(locationX - (current.x + current.width), locationY - current.y);
      const distBL = Math.hypot(locationX - current.x, locationY - (current.y + current.height));
      const distBR = Math.hypot(
        locationX - (current.x + current.width),
        locationY - (current.y + current.height)
      );

      if (distTL <= HANDLE_TOUCH_RADIUS) {
        activeDrag = 'tl';
      } else if (distTR <= HANDLE_TOUCH_RADIUS) {
        activeDrag = 'tr';
      } else if (distBL <= HANDLE_TOUCH_RADIUS) {
        activeDrag = 'bl';
      } else if (distBR <= HANDLE_TOUCH_RADIUS) {
        activeDrag = 'br';
      } else if (
        locationX >= current.x &&
        locationX <= current.x + current.width &&
        locationY >= current.y &&
        locationY <= current.y + current.height
      ) {
        activeDrag = 'move';
      } else {
        activeDrag = null;
      }

      startDragRect = { ...current };
    },
    onPanResponderMove: (_, gestureState) => {
      const layout = getDisplayLayout();
      if (!activeDrag || !layout) return;

      const start = startDragRect;
      const { displayedWidth, displayedHeight, offsetX, offsetY } = layout;
      const maxX = offsetX + displayedWidth;
      const maxY = offsetY + displayedHeight;

      const mode = activeDrag;

      if (mode === 'move') {
        let nextX = start.x + gestureState.dx;
        let nextY = start.y + gestureState.dy;

        // Clamping dans les bordures de l'image
        nextX = Math.max(offsetX, Math.min(nextX, maxX - start.width));
        nextY = Math.max(offsetY, Math.min(nextY, maxY - start.height));

        const updated: CropRect = {
          ...start,
          x: nextX,
          y: nextY,
        };
        onUpdateCropRect(updated);
        return;
      }

      // Redimensionnement par coins
      let newX = start.x;
      let newY = start.y;
      let newW = start.width;
      let newH = start.height;

      if (mode === 'tl') {
        newX = Math.max(offsetX, Math.min(start.x + gestureState.dx, start.x + start.width - MIN_CROP_SIZE));
        newY = Math.max(offsetY, Math.min(start.y + gestureState.dy, start.y + start.height - MIN_CROP_SIZE));
        newW = start.x + start.width - newX;
        newH = start.y + start.height - newY;
      } else if (mode === 'tr') {
        newY = Math.max(offsetY, Math.min(start.y + gestureState.dy, start.y + start.height - MIN_CROP_SIZE));
        const right = Math.min(maxX, Math.max(start.x + start.width + gestureState.dx, start.x + MIN_CROP_SIZE));
        newW = right - start.x;
        newH = start.y + start.height - newY;
      } else if (mode === 'bl') {
        newX = Math.max(offsetX, Math.min(start.x + gestureState.dx, start.x + start.width - MIN_CROP_SIZE));
        newW = start.x + start.width - newX;
        const bottom = Math.min(maxY, Math.max(start.y + start.height + gestureState.dy, start.y + MIN_CROP_SIZE));
        newH = bottom - start.y;
      } else if (mode === 'br') {
        const right = Math.min(maxX, Math.max(start.x + start.width + gestureState.dx, start.x + MIN_CROP_SIZE));
        const bottom = Math.min(maxY, Math.max(start.y + start.height + gestureState.dy, start.y + MIN_CROP_SIZE));
        newW = right - start.x;
        newH = bottom - start.y;
      }

      const currentAspect = getAspectRatio();
      // Si un ratio fixe est verrouillé, ajuster la dimension opposée
      if (currentAspect === '1:1') {
        const side = Math.min(newW, newH);
        newW = side;
        newH = side;
      } else if (currentAspect === '4:3') {
        const ratioVal = 4 / 3;
        newH = newW / ratioVal;
        if (newY + newH > maxY) {
          newH = maxY - newY;
          newW = newH * ratioVal;
        }
      } else if (currentAspect === '16:9') {
        const ratioVal = 16 / 9;
        newH = newW / ratioVal;
        if (newY + newH > maxY) {
          newH = maxY - newY;
          newW = newH * ratioVal;
        }
      }

      const updated: CropRect = {
        x: newX,
        y: newY,
        width: Math.max(MIN_CROP_SIZE, newW),
        height: Math.max(MIN_CROP_SIZE, newH),
      };
      onUpdateCropRect(updated);
    },
    onPanResponderRelease: () => {
      activeDrag = null;
    },
    onPanResponderTerminate: () => {
      activeDrag = null;
    },
  });
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  visible,
  imageUri,
  onClose,
  onApplyCrop,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [customCropRect, setCustomCropRect] = useState<CropRect | null>(null);
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>('free');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Charger les dimensions réelles de l'image
  useEffect(() => {
    if (!visible || !imageUri) {
      return;
    }

    let isMounted = true;
    RNImage.getSize(
      imageUri,
      (width, height) => {
        if (isMounted) {
          setImageSize({ width, height });
        }
      },
      (err) => {
        if (isMounted) {
          console.warn('[ImageCropper] Erreur récupération taille image:', err);
          Alert.alert('Erreur', 'Impossible de lire les dimensions de l\'image.');
          onClose();
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [visible, imageUri, onClose]);

  // Calculer l'espace d'affichage de l'image (contentFit="contain")
  const displayLayout = useMemo(() => {
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

  // Rectangle calculé par défaut selon le ratio
  const defaultCropRect = useMemo((): CropRect => {
    if (!displayLayout) return { x: 0, y: 0, width: 0, height: 0 };

    const { displayedWidth, displayedHeight, offsetX, offsetY } = displayLayout;

    if (aspectRatio === 'free') {
      const w = displayedWidth * 0.9;
      const h = displayedHeight * 0.9;
      return {
        x: offsetX + (displayedWidth - w) / 2,
        y: offsetY + (displayedHeight - h) / 2,
        width: w,
        height: h,
      };
    }

    let targetRatio = 1;
    if (aspectRatio === '1:1') targetRatio = 1;
    else if (aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (aspectRatio === '16:9') targetRatio = 16 / 9;

    let w = displayedWidth * 0.9;
    let h = w / targetRatio;

    if (h > displayedHeight * 0.9) {
      h = displayedHeight * 0.9;
      w = h * targetRatio;
    }

    return {
      x: offsetX + (displayedWidth - w) / 2,
      y: offsetY + (displayedHeight - h) / 2,
      width: w,
      height: h,
    };
  }, [displayLayout, aspectRatio]);

  const activeCropRect = customCropRect ?? defaultCropRect;

  // Synchroniser les références pour les interactions tactiles PanResponder
  const cropRectRef = useRef<CropRect>(activeCropRect);
  const displayLayoutRef = useRef(displayLayout);
  const aspectRatioRef = useRef(aspectRatio);

  useEffect(() => {
    cropRectRef.current = activeCropRect;
  }, [activeCropRect]);

  useEffect(() => {
    displayLayoutRef.current = displayLayout;
  }, [displayLayout]);

  useEffect(() => {
    aspectRatioRef.current = aspectRatio;
  }, [aspectRatio]);

  const [panResponder, setPanResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);

  useEffect(() => {
    const responder = createCropPanResponder(
      () => cropRectRef.current,
      () => displayLayoutRef.current,
      () => aspectRatioRef.current,
      (updated) => {
        setCustomCropRect(updated);
        cropRectRef.current = updated;
      }
    );
    setPanResponder(responder);
  }, []);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // Gestionnaire de changement de ratio
  const handleSelectAspectRatio = (ratio: CropAspectRatio) => {
    setAspectRatio(ratio);
    setCustomCropRect(null);
  };

  // Réinitialiser au plein cadre
  const handleResetCrop = () => {
    if (displayLayout) {
      setAspectRatio('free');
      setCustomCropRect({
        x: displayLayout.offsetX,
        y: displayLayout.offsetY,
        width: displayLayout.displayedWidth,
        height: displayLayout.displayedHeight,
      });
    }
  };

  // Appliquer le rognage effectif via expo-image-manipulator
  const handleApply = async () => {
    if (!imageUri || !imageSize || !displayLayout || isProcessing) return;

    try {
      setIsProcessing(true);
      const current = cropRectRef.current;
      const { scale, offsetX, offsetY } = displayLayout;

      // Calcul des coordonnées réelles dans l'image d'origine
      const originX = Math.max(0, Math.round((current.x - offsetX) / scale));
      const originY = Math.max(0, Math.round((current.y - offsetY) / scale));
      const cropW = Math.min(imageSize.width - originX, Math.round(current.width / scale));
      const cropH = Math.min(imageSize.height - originY, Math.round(current.height / scale));

      if (cropW <= 0 || cropH <= 0) {
        Alert.alert('Erreur', 'Zone de rognage invalide.');
        return;
      }

      const manipResult = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropW,
              height: cropH,
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
        Alert.alert('Erreur', 'Impossible de rogner l\'image.');
      }
    } catch (err) {
      console.error('[ImageCropper] Erreur manipulateAsync:', err);
      Alert.alert('Erreur', 'Le rognage a échoué.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

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

          <Text style={styles.headerTitle}>Cadrer la photo</Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleResetCrop}
            accessibilityLabel="Réinitialiser le cadre"
            disabled={isProcessing}
          >
            <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Zone centrale de visualisation et cadrage */}
        <View style={styles.cropArea} onLayout={handleContainerLayout}>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
          )}

          {/* Masque sombre et cadre interactif */}
          {displayLayout && activeCropRect.width > 0 && activeCropRect.height > 0 && panResponder && (
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none" {...panResponder.panHandlers}>
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

              {/* Cadre de recadrage interactif */}
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
                <View style={styles.gridLineH1} />
                <View style={styles.gridLineH2} />
                <View style={styles.gridLineV1} />
                <View style={styles.gridLineV2} />

                {/* 4 coins de redimensionnement */}
                <View style={[styles.cornerHandle, styles.handleTL]} />
                <View style={[styles.cornerHandle, styles.handleTR]} />
                <View style={[styles.cornerHandle, styles.handleBL]} />
                <View style={[styles.cornerHandle, styles.handleBR]} />

                {/* Poignée centrale discrète */}
                <View style={styles.centerMoveIndicator}>
                  <Ionicons name="move" size={20} color="rgba(255,255,255,0.7)" />
                </View>
              </View>
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Cadrage en cours...</Text>
            </View>
          )}
        </View>

        {/* Barre de contrôle inférieure (ratios + validation) */}
        <View style={[styles.bottomControlBar, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
          {/* Sélecteur de format / ratio */}
          <View style={styles.ratioSelectorRow}>
            {(
              [
                { label: 'Libre', val: 'free' },
                { label: '1:1', val: '1:1' },
                { label: '4:3', val: '4:3' },
                { label: '16:9', val: '16:9' },
              ] as const
            ).map((item) => {
              const isSelected = aspectRatio === item.val;
              return (
                <TouchableOpacity
                  key={item.val}
                  style={[
                    styles.ratioPill,
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleSelectAspectRatio(item.val)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.ratioPillText,
                      isSelected && styles.ratioPillTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Boutons d'action : Annuler / Appliquer */}
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  cornerHandle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFFFFF',
  },
  handleTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  handleTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
  },
  handleBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  handleBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },
  centerMoveIndicator: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
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
  ratioSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  ratioPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ratioPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  ratioPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
