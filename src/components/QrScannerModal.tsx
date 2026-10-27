import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions, Camera, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { Recipe } from '../types/recipe';
import { RecipeShareService } from '../services/recipeShareService';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeScanned: (recipe: Recipe) => void;
}

const InnerQrScanner: React.FC<Omit<QrScannerModalProps, 'visible'>> = ({
  onClose,
  onRecipeScanned,
}) => {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualLinkInput, setManualLinkInput] = useState('');

  const handleProcessBarcodeData = (data: string) => {
    if (scanned || isProcessing) return;

    setIsProcessing(true);
    setScanned(true);

    const recipe = RecipeShareService.decodeRecipe(data);
    if (recipe) {
      setIsProcessing(false);
      onRecipeScanned(recipe);
      onClose();
    } else {
      Alert.alert(
        'Code non reconnu',
        "Ce QR code n'est pas une recette Papilles valide ou les données sont corrompues.",
        [
          {
            text: 'Réessayer',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]
      );
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (result.data) {
      handleProcessBarcodeData(result.data);
    }
  };

  const handlePickImageFromGallery = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      setIsProcessing(true);
      const uri = pickerResult.assets[0].uri;
      const scannedCodes = await Camera.scanFromURLAsync(uri, ['qr']);

      if (scannedCodes && scannedCodes.length > 0 && scannedCodes[0].data) {
        handleProcessBarcodeData(scannedCodes[0].data);
      } else {
        setIsProcessing(false);
        Alert.alert(
          'Aucun QR code trouvé',
          'Aucun QR code de recette Papilles n’a été détecté sur cette photo.'
        );
      }
    } catch (e) {
      setIsProcessing(false);
      console.warn('[QrScannerModal] Erreur scan photo galerie:', e);
      Alert.alert('Erreur', 'Impossible d’analyser cette image.');
    }
  };

  const handleConfirmManualPaste = () => {
    if (!manualLinkInput.trim()) return;
    handleProcessBarcodeData(manualLinkInput.trim());
  };

  return (
    <View style={styles.container}>
      {/* Vérification des permissions caméra */}
      {!permission?.granted ? (
        <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Accès à la caméra requis
          </Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
            Papilles a besoin de la caméra pour scanner les QR codes de recettes partagées par vos amis.
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
            activeOpacity={0.8}
          >
            <Text style={[styles.permissionCancelText, { color: colors.textSecondary }]}>
              Annuler
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />

          {/* Viseur visuel avec bords sombres */}
          <View style={styles.overlayMask}>
            {/* Barre supérieure */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconCircleBtn}
                onPress={onClose}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.scannerHeaderTitle}>Scanner une recette</Text>

              <TouchableOpacity
                style={[styles.iconCircleBtn, torch && styles.iconCircleBtnActive]}
                onPress={() => setTorch((t) => !t)}
                accessibilityLabel="Lampe torche"
              >
                <Ionicons
                  name={torch ? 'flashlight' : 'flashlight-outline'}
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Cadre de visée */}
            <View style={styles.finderContainer}>
              <View style={styles.finderBox}>
                {/* Coins du viseur */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.processingText}>Importation...</Text>
                  </View>
                )}
              </View>
              <Text style={styles.finderInstruction}>
                {"Visez le QR code affiché sur l'autre téléphone"}
              </Text>
            </View>

            {/* Barre inférieure avec options alternatives */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.bottomActionBtn}
                onPress={handlePickImageFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={20} color="#FFFFFF" />
                <Text style={styles.bottomActionText}>Depuis photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bottomActionBtn}
                onPress={() => setShowManualPaste((v) => !v)}
                activeOpacity={0.8}
              >
                <Ionicons name="link-outline" size={20} color="#FFFFFF" />
                <Text style={styles.bottomActionText}>Coller un lien</Text>
              </TouchableOpacity>
            </View>

            {/* Modale ou tiroir de saisie manuelle de lien */}
            {showManualPaste && (
              <View style={[styles.pasteDrawer, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.pasteTitle, { color: colors.textPrimary }]}>
                  Coller un lien Papilles
                </Text>
                <TextInput
                  style={[
                    styles.pasteInput,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  placeholder="papilles://import?r=..."
                  placeholderTextColor={colors.textSecondary}
                  value={manualLinkInput}
                  onChangeText={setManualLinkInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.pasteActions}>
                  <TouchableOpacity
                    style={[styles.pasteCancelBtn, { backgroundColor: colors.backgroundSecondary }]}
                    onPress={() => setShowManualPaste(false)}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pasteConfirmBtn, { backgroundColor: colors.primary }]}
                    onPress={handleConfirmManualPaste}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Importer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  visible,
  onClose,
  onRecipeScanned,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <InnerQrScanner onClose={onClose} onRecipeScanned={onRecipeScanned} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
    backgroundColor: 'rgba(27, 61, 44, 0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  scannerHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    backgroundColor: 'rgba(245, 158, 11, 0.7)',
  },
  finderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  finderBox: {
    width: 250,
    height: 250,
    borderRadius: 20,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 18,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 18,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 18,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 18,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 10,
  },
  finderInstruction: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    paddingHorizontal: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  bottomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bottomActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  pasteDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  pasteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  pasteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  pasteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  pasteCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  pasteConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
});
