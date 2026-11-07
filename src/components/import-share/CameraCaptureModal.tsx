import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export interface CameraCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * 'photo' : Capture unique avec prévisualisation et validation (ex: photo de recette)
   * 'scan' : Capture multi-pages documentaire (ex: recto/verso pour scan IA)
   */
  mode?: 'photo' | 'scan';
  /**
   * Nombre maximal de photos en mode scan (défaut : 4)
   */
  maxPhotos?: number;
  /**
   * Titre personnalisé dans l'en-tête
   */
  title?: string;
  /**
   * Callback lorsqu'une seule photo est validée (mode 'photo')
   */
  onPhotoCaptured?: (uri: string) => void;
  /**
   * Callback lorsqu'une ou plusieurs photos sont validées (mode 'scan')
   */
  onPhotosCaptured?: (uris: string[]) => void;
}

const InnerCameraCapture: React.FC<Omit<CameraCaptureModalProps, 'visible'>> = ({
  onClose,
  mode = 'photo',
  maxPhotos = 4,
  title,
  onPhotoCaptured,
  onPhotosCaptured,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // État prévisualisation en mode 'photo'
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // État multi-photos en mode 'scan'
  const [capturedScanUris, setCapturedScanUris] = useState<string[]>([]);

  const handleClose = () => {
    if (mode === 'scan' && capturedScanUris.length > 0) {
      Alert.alert(
        'Photos capturées',
        `Vous avez capturé ${capturedScanUris.length} photo(s). Voulez-vous les utiliser ?`,
        [
          {
            text: 'Abandonner',
            style: 'destructive',
            onPress: () => {
              setCapturedScanUris([]);
              setPreviewUri(null);
              onClose();
            },
          },
          {
            text: 'Valider',
            onPress: () => {
              onPhotosCaptured?.(capturedScanUris);
              setCapturedScanUris([]);
              setPreviewUri(null);
              onClose();
            },
          },
        ]
      );
      return;
    }

    setPreviewUri(null);
    setCapturedScanUris([]);
    onClose();
  };

  const handleToggleFacing = () => {
    setFacing((prev) => {
      const next: CameraType = prev === 'back' ? 'front' : 'back';
      if (next === 'front') {
        setTorch(false);
      }
      return next;
    });
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });

      if (!photo || !photo.uri) {
        Alert.alert('Erreur', 'Impossible de capturer la photo.');
        return;
      }

      if (mode === 'photo') {
        // En mode photo unique, ouvrir l'écran d'aperçu / confirmation
        setPreviewUri(photo.uri);
      } else {
        // En mode scan, empiler la photo dans le lot
        setCapturedScanUris((prev) => {
          const next = [...prev, photo.uri];
          if (next.length >= maxPhotos) {
            // Quota maximum atteint, valider automatiquement
            setTimeout(() => {
              onPhotosCaptured?.(next);
              onClose();
            }, 300);
          }
          return next;
        });
      }
    } catch (err) {
      console.error('[CameraCaptureModal] Erreur capture photo:', err);
      Alert.alert('Erreur', 'Impossible de capturer la photo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à vos photos dans vos réglages.'
        );
        return;
      }

      if (mode === 'photo') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });

        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
          onPhotoCaptured?.(result.assets[0].uri);
          onClose();
        }
      } else {
        const remainingLimit = Math.max(1, maxPhotos - capturedScanUris.length);
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remainingLimit,
          quality: 0.85,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const newUris = result.assets.map((a) => a.uri).filter(Boolean);
          setCapturedScanUris((prev) => [...prev, ...newUris]);
        }
      }
    } catch (err) {
      console.warn('[CameraCaptureModal] Erreur import galerie:', err);
      Alert.alert('Erreur', 'Impossible de charger les images de la galerie.');
    }
  };

  const handleDeleteScanPhoto = (index: number) => {
    setCapturedScanUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmScan = () => {
    if (capturedScanUris.length === 0) return;
    onPhotosCaptured?.(capturedScanUris);
    setCapturedScanUris([]);
    onClose();
  };

  // --- Écran de demande de permissions ---
  if (!permission) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: '#000000' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionIconCircle, { backgroundColor: `${colors.primary}1A` }]}>
          <Ionicons name="camera" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          {"Accès à l'appareil photo requis"}
        </Text>
        <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
          {"Papilles a besoin d'accéder à votre appareil photo pour photographier vos recettes et scanner vos fiches imprimées."}
        </Text>
        <TouchableOpacity
          style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
          activeOpacity={0.8}
        >
          <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionCancelBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.permissionCancelText, { color: colors.textSecondary }]}>
            Annuler
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Écran de prévisualisation (mode 'photo' après déclenchement) ---
  if (mode === 'photo' && previewUri) {
    return (
      <View style={[styles.container, { backgroundColor: '#000000' }]}>
        <Image
          source={{ uri: previewUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
        />

        {/* Barre supérieure aperçu */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 44) }]}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => setPreviewUri(null)}
            accessibilityLabel="Annuler l'aperçu"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aperçu de la photo</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Barre d'actions inférieure aperçu */}
        <View style={[styles.bottomBarPreview, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => setPreviewUri(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>Reprendre</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmPhotoBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              onPhotoCaptured?.(previewUri);
              setPreviewUri(null);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.confirmPhotoBtnText}>Valider</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Viseur Caméra interactif en direct ---
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torch}
        mode="picture"
        animateShutter
      />

      {/* Masque sombre et guides de cadrage */}
      <View style={styles.overlayMask} pointerEvents="box-none">
        {/* Barre supérieure */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 44) }]}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={handleClose}
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {title || (mode === 'scan' ? `Scan recette (${capturedScanUris.length}/${maxPhotos})` : 'Prendre une photo')}
          </Text>

          <View style={styles.topActionsRow}>
            {/* Flash / Lampe torche (caméra arrière) */}
            {facing === 'back' && (
              <TouchableOpacity
                style={[styles.iconCircleBtn, torch && styles.iconCircleBtnActive]}
                onPress={() => setTorch((t) => !t)}
                accessibilityLabel="Lampe torche"
              >
                <Ionicons
                  name={torch ? 'flashlight' : 'flashlight-outline'}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}

            {/* Inversion caméra avant / arrière */}
            <TouchableOpacity
              style={[styles.iconCircleBtn, { marginLeft: 8 }]}
              onPress={handleToggleFacing}
              accessibilityLabel="Changer de caméra"
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Guide visuel de cadrage documentaire en mode Scan */}
        {mode === 'scan' && (
          <View style={styles.scanGuideContainer} pointerEvents="none">
            <View style={styles.scanGuideBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanGuideText}>
              {capturedScanUris.length === 0
                ? 'Cadrez la page ou le livre de cuisine'
                : `Page ${capturedScanUris.length + 1} : cadrez la suite`}
            </Text>
          </View>
        )}

        {/* Zone inférieure */}
        <View style={styles.bottomControlsContainer} pointerEvents="box-none">
          {/* Bandeau de miniatures capturées en mode Scan */}
          {mode === 'scan' && capturedScanUris.length > 0 && (
            <View style={styles.thumbnailStripContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailScrollContent}
              >
                {capturedScanUris.map((uri, idx) => (
                  <View key={`thumb_${idx}`} style={styles.thumbnailItem}>
                    <Image source={{ uri }} style={styles.thumbnailImg} contentFit="cover" />
                    <View style={styles.thumbnailBadge}>
                      <Text style={styles.thumbnailBadgeText}>P.{idx + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.thumbnailDeleteBtn}
                      onPress={() => handleDeleteScanPhoto(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={`Supprimer la photo ${idx + 1}`}
                    >
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Barre d'action principale : Galerie / Déclencheur / Valider */}
          <View
            style={[
              styles.bottomBar,
              { paddingBottom: Math.max(insets.bottom + 16, 28) },
            ]}
          >
            {/* Bouton Galerie */}
            <TouchableOpacity
              style={styles.sideActionBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
              accessibilityLabel="Importer depuis la galerie"
            >
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
              <Text style={styles.sideActionText}>Galerie</Text>
            </TouchableOpacity>

            {/* Bouton Déclencheur Shutter */}
            <TouchableOpacity
              style={[
                styles.shutterOuter,
                (isCapturing || (mode === 'scan' && capturedScanUris.length >= maxPhotos)) &&
                  styles.shutterOuterDisabled,
              ]}
              onPress={handleTakePhoto}
              disabled={isCapturing || (mode === 'scan' && capturedScanUris.length >= maxPhotos)}
              activeOpacity={0.7}
              accessibilityLabel="Prendre la photo"
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.shutterInner,
                  isCapturing && styles.shutterInnerCapturing,
                ]}
              >
                {isCapturing && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>

            {/* Bouton Terminer (mode scan) ou calage symétrique */}
            {mode === 'scan' && capturedScanUris.length > 0 ? (
              <TouchableOpacity
                style={[styles.validateScanBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmScan}
                activeOpacity={0.8}
                accessibilityLabel="Valider les photos capturées"
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.validateScanBtnText}>
                  OK ({capturedScanUris.length})
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sideActionSpacer} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  visible,
  ...props
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
      statusBarTranslucent
    >
      <InnerCameraCapture {...props} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  permissionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  permissionCancelBtn: {
    paddingVertical: 10,
  },
  permissionCancelText: {
    fontWeight: '600',
    fontSize: 14,
  },
  overlayMask: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSpacer: {
    width: 44,
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.8)',
  },
  scanGuideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  scanGuideBox: {
    width: '84%',
    height: '62%',
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 14,
  },
  scanGuideText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomControlsContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  thumbnailStripContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  thumbnailScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailItem: {
    width: 52,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    position: 'relative',
    backgroundColor: '#1E1E1E',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbnailBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  thumbnailDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  sideActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  sideActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  sideActionSpacer: {
    width: 70,
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterOuterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInnerCapturing: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  validateScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    width: 80,
  },
  validateScanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 3,
  },
  bottomBarPreview: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  confirmPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
  },
  confirmPhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
});
