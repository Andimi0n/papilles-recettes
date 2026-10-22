import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  RecipeAiService,
  ExtractedRecipeData,
  AiConnectionStatus,
} from '../services/recipeAiService';
import { Recipe } from '../types/recipe';
import { generateUniqueId } from '../utils/helpers';


interface ScanRecipeScreenProps {
  onBack: () => void;
  onRecipeExtracted: (recipeData: Partial<Recipe>, coverImageUri?: string) => void;
}

interface CapturedPhoto {
  id: string;
  uri: string;
  base64: string;
}

export const ScanRecipeScreen: React.FC<ScanRecipeScreenProps> = ({
  onBack,
  onRecipeExtracted,
}) => {
  const { isDark, colors } = useTheme();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Préparation des données...');

  // État de la vérification de connexion réelle
  const [connectionStatus, setConnectionStatus] = useState<AiConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Vérification active de l'IA (vrai ping)
  const verifyAiStatus = useCallback(async (keyToTest?: string) => {
    setIsCheckingConnection(true);
    try {
      const status = await RecipeAiService.checkConnection(keyToTest);
      setConnectionStatus(status);
    } catch (e: any) {
      setConnectionStatus({
        ok: false,
        code: 'UNKNOWN_ERROR',
        message: e?.message || 'Erreur inattendue',
      });
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  // Chargement initial de la clé et vérification live
  useEffect(() => {
    RecipeAiService.getApiKey().then((key) => {
      setApiKey(key);
      verifyAiStatus(key);
    });
  }, [verifyAiStatus]);

  // Compresser et préparer l'image en base64 pour l'envoi vers l'IA
  const processImage = async (uri: string): Promise<CapturedPhoto> => {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1400 } }],
      { compress: 0.8, format: SaveFormat.JPEG, base64: true }
    );

    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uri: manipResult.uri,
      base64: manipResult.base64 || '',
    };
  };

  const handlePickPhoto = async (fromCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'Veuillez autoriser l\'accès à l\'appareil photo dans vos réglages pour scanner une recette.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: false,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'Veuillez autoriser l\'accès à vos photos dans vos réglages.'
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsMultipleSelection: true,
          selectionLimit: 4,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newCaptured: CapturedPhoto[] = [];
        for (let i = 0; i < result.assets.length; i++) {
          const processed = await processImage(result.assets[i].uri);
          newCaptured.push(processed);
        }
        setPhotos((prev) => [...prev, ...newCaptured]);
      }
    } catch (e: any) {
      console.error('Erreur sélection photo:', e);
      Alert.alert('Erreur', 'Impossible de charger la photo.');
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveApiKey = async () => {
    const trimmed = tempApiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('Clé vide', 'Veuillez saisir votre clé API.');
      return;
    }
    await RecipeAiService.setApiKey(trimmed);
    setApiKey(trimmed);
    setIsApiKeyModalVisible(false);
    verifyAiStatus(trimmed);
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) {
      Alert.alert('Aucune photo', 'Prenez au moins une photo de votre recette.');
      return;
    }

    if (connectionStatus && !connectionStatus.ok) {
      Alert.alert(
        'IA indisponible',
        `${connectionStatus.message}\n\nVeuillez vérifier votre connexion ou votre clé API avant de lancer l'analyse.`
      );
      return;
    }

    setIsAnalyzing(true);
    setLoadingStep('Envoi des photos vers l\'IA...');

    try {
      setTimeout(() => setLoadingStep('Lecture et compréhension du texte...'), 1500);
      setTimeout(() => setLoadingStep('Extraction des ingrédients et étapes de cuisson...'), 3000);

      const payload = photos.map((p) => ({
        base64: p.base64,
        mimeType: 'image/jpeg',
      }));

      const extracted: ExtractedRecipeData = await RecipeAiService.extractRecipeFromImages(
        payload,
        apiKey
      );

      // On transforme en recette partielle avec identifiants uniques
      const partialRecipe: Partial<Recipe> = {
        title: extracted.title || 'Recette scannée',
        description: extracted.description || '',
        category: extracted.category || 'Plat',
        difficulty: extracted.difficulty || 'Moyen',
        prepTimeMinutes: extracted.prepTimeMinutes || 15,
        cookTimeMinutes: extracted.cookTimeMinutes || 20,
        servings: extracted.servings || 4,
        rating: 4.5,
        userNote: extracted.userNote ? extracted.userNote.trim() : undefined,
        isVegetarian: extracted.isVegetarian ?? false,
        imageUrl: photos[0].uri, // Utilise la première photo comme couverture
        availableImages: photos.map((p) => p.uri),
        ingredients: (extracted.ingredients || []).map((ing, idx) => ({
          id: generateUniqueId(`ing_scanned_${idx + 1}`),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
        steps: (extracted.steps || []).map((st, idx) => ({
          id: generateUniqueId(`stp_scanned_${idx + 1}`),
          order: st.order || idx + 1,
          instruction: st.instruction,
        })),

      };

      onRecipeExtracted(partialRecipe, photos[0].uri);
    } catch (error: any) {
      console.error('Erreur extraction:', error);
      Alert.alert(
        'Échec de l\'analyse',
        error?.message || 'Une erreur est survenue lors de l\'analyse de la photo.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Scanner une recette</Text>
            <Text style={styles.headerSubtitle}>Vision multimodale IA</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setTempApiKeyInput(apiKey);
              setIsApiKeyModalVisible(true);
            }}
            style={styles.keyBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={connectionStatus?.ok ? 'key' : 'key-outline'}
              size={18}
              color={connectionStatus?.ok ? Colors.secondary : Colors.primary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vérification Live de l'IA (commune aux 2 modes) */}
          {isCheckingConnection ? (
            <View style={styles.checkingBadge}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.checkingText}>Vérification de la connexion IA...</Text>
            </View>
          ) : connectionStatus?.ok ? (
            <View style={styles.readyBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} />
              <View style={styles.readyTextCol}>
                <Text style={styles.readyTitle}>Reconnaissance IA prête</Text>
                <Text style={styles.readySubtitle}>Gemini 3.8 Flash connecté</Text>
              </View>
              <TouchableOpacity
                onPress={() => verifyAiStatus(apiKey)}
                style={styles.refreshBadgeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="refresh" size={15} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.errorCard}>
              <View style={styles.errorTopRow}>
                <Ionicons name="close-circle" size={22} color={Colors.danger} style={styles.errorIcon} />
                <View style={styles.errorTitleCol}>
                  <Text style={styles.errorTitle}>Reconnaissance IA indisponible</Text>
                  <Text style={styles.errorMessage}>
                    {connectionStatus?.message || 'Impossible de joindre le service IA'}
                  </Text>
                </View>
              </View>
              <View style={styles.errorActionsRow}>
                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={() => verifyAiStatus(apiKey)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="reload" size={14} color="#FFFFFF" />
                  <Text style={styles.errorRetryBtnText}>Réessayer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.errorKeyBtn}
                  onPress={() => {
                    setTempApiKeyInput(apiKey);
                    setIsApiKeyModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="key-outline" size={14} color={Colors.primary} />
                  <Text style={styles.errorKeyBtnText}>Configurer clé</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Guide explicatif photo */}
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.guideTitle}>Tous formats de photo acceptés</Text>
            </View>
            <Text style={styles.guideText}>
              Prenez en photo votre recette depuis n'importe quel support : livre de cuisine, fiche repas, carnet manuscrit, magazine ou capture d'écran.
              {'\n'}Par défaut <Text style={styles.guideBold}>1 photo</Text> suffit, mais vous pouvez en ajouter d'autres si la recette s'étale sur plusieurs pages.
            </Text>
          </View>

              {/* Zone de photos */}
              {photos.length === 0 ? (
                /* État initial : Invitation à prendre une 1ère photo */
                <View style={styles.emptyHeroBox}>
                  <View style={styles.emptyHeroIconCircle}>
                    <Ionicons name="camera-outline" size={40} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyHeroTitle}>Prenez en photo votre recette</Text>
                  <Text style={styles.emptyHeroSubtitle}>
                    Photographiez la page de votre livre ou votre fiche
                  </Text>

                  <View style={styles.heroButtonsCol}>
                    <TouchableOpacity
                      style={styles.heroCameraBtn}
                      onPress={() => handlePickPhoto(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.heroCameraBtnText}>Prendre une photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.heroGalleryBtn}
                      onPress={() => handlePickPhoto(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
                      <Text style={styles.heroGalleryBtnText}>Choisir dans la galerie</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Liste dynamique des photos capturées */
                <View style={styles.photosSection}>
                  <View style={styles.photosSectionHeader}>
                    <Text style={styles.photosCountTitle}>
                      {photos.length} photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.photosCountHint}>
                      La 1ère servira de photo de couverture
                    </Text>
                  </View>

                  <View style={styles.photosGrid}>
                    {photos.map((photo, index) => (
                      <View key={photo.id} style={styles.photoCard}>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumb} resizeMode="cover" />
                        <View style={styles.photoIndexBadge}>
                          <Text style={styles.photoIndexBadgeText}>
                            {index === 0 ? 'Photo 1 (couverture)' : `Photo ${index + 1}`}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(photo.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {/* Bouton pour ajouter une photo supplémentaire */}
                  <View style={styles.addMoreRow}>
                    <TouchableOpacity
                      style={styles.addMoreBtn}
                      onPress={() => handlePickPhoto(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={17} color={Colors.primary} />
                      <Text style={styles.addMoreBtnText}>Ajouter photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addMoreBtn}
                      onPress={() => handlePickPhoto(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={17} color={Colors.primary} />
                      <Text style={styles.addMoreBtnText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Bouton d'action principal d'analyse photo */}
              {photos.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.analyzeBtn,
                    (isAnalyzing || (connectionStatus && !connectionStatus.ok)) && styles.analyzeBtnDisabled,
                  ]}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing}
                  activeOpacity={0.85}
                >
                  {isAnalyzing ? (
                    <View style={styles.analyzingContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.analyzeBtnText}>{loadingStep}</Text>
                    </View>
                  ) : (
                    <View style={styles.analyzingContent}>
                      <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                      <Text style={styles.analyzeBtnText}>
                        Analyser la recette ({photos.length} photo{photos.length > 1 ? 's' : ''})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
        </ScrollView>

        {/* Modal de configuration de la clé API */}
        <Modal
          visible={isApiKeyModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsApiKeyModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Clé API Google Gemini</Text>
              <Text style={styles.modalSubtitle}>
                L'analyse multimodale utilise Gemini 3.8 Flash. Vous pouvez utiliser votre propre clé Google AI Studio.
              </Text>

              <View style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  value={tempApiKeyInput}
                  onChangeText={setTempApiKeyInput}
                  placeholder="Collez votre clé API Gemini ici..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isKeyVisible}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setIsKeyVisible(!isKeyVisible)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isKeyVisible ? "Masquer la clé" : "Afficher la clé"}
                >
                  <Ionicons
                    name={isKeyVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>


              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsApiKeyModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveApiKey}
                >
                  <Text style={styles.modalSaveText}>Tester & Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  keyBtn: {
    padding: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 7,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInputBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 16,
    ...Shadows.small,
  },
  textInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '50',
  },
  textInputHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textInputHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  textInputHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  sampleQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondary,
  },
  clearQuickBtn: {
    padding: 5,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  rawTextArea: {
    minHeight: 180,
    maxHeight: 280,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  textInputFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
  },
  textCountHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  checkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  checkingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  readyTextCol: {
    flex: 1,
    marginLeft: 8,
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  readySubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  refreshBadgeBtn: {
    padding: 4,
  },
  errorCard: {
    backgroundColor: colors.dangerLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.danger,
    ...shadows.small,
  },
  errorTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  errorTitleCol: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  errorMessage: {
    fontSize: 12,
    color: colors.isDark ? '#FCA5A5' : '#B91C1C',
    marginTop: 3,
    lineHeight: 16,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  errorRetryBtn: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  errorRetryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  errorKeyBtn: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  errorKeyBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  guideCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  guideText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  guideBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyHeroBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    marginBottom: 16,
  },
  emptyHeroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHeroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHeroSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  heroButtonsCol: {
    width: '100%',
    gap: 10,
  },
  heroCameraBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    ...Shadows.small,
  },
  heroCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  heroGalleryBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  heroGalleryBtnText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  photosSection: {
    marginBottom: 16,
  },
  photosSectionHeader: {
    marginBottom: 10,
  },
  photosCountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  photosCountHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  photosGrid: {
    gap: 12,
    marginBottom: 12,
  },
  photoCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoIndexBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  analyzeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...Shadows.medium,
  },
  analyzeBtnDisabled: {
    opacity: 0.65,
  },
  analyzingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyzeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingRight: 10,
  },
  keyInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
}));
