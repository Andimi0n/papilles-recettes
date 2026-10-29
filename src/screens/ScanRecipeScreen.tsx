import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  RecipeAiService,
  ExtractedRecipeData,
  AiConnectionStatus,
} from '../services/recipeAiService';
import { UnifiedIngredientService } from '../services/unifiedIngredientService';
import { WebRecipeService } from '../services/webRecipeService';
import { Recipe } from '../types/recipe';
import { generateUniqueId } from '../utils/helpers';
import { QrScannerModal } from '../components/QrScannerModal';

export type AddRecipeMode = 'text' | 'photo' | 'url';

export interface ScanRecipeScreenProps {
  initialMode?: AddRecipeMode;
  onBack: () => void;
  onRecipeExtracted: (recipeData: Partial<Recipe>, coverImageUri?: string) => void;
  onRecipeReceived?: (recipe: Recipe) => void;
  onManualCreate?: () => void;
}

interface CapturedPhoto {
  id: string;
  uri: string;
  base64: string;
}

const POPULAR_PLATFORMS = [
  'Marmiton',
  '750g',
  'CuisineAZ',
  'Jow',
  'Chefclub',
  'BBC Good Food',
  'Blogs WordPress',
  'Schema.org (95% du Web)',
];

export const ScanRecipeScreen: React.FC<ScanRecipeScreenProps> = ({
  initialMode = 'photo',
  onBack,
  onRecipeExtracted,
  onRecipeReceived,
  onManualCreate,
}) => {
  const { colors } = useTheme();
  const [mode, setMode] = useState<AddRecipeMode>(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);

  if (prevInitialMode !== initialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }

  // États Mode Photo
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);

  // États Mode Texte
  const [rawTextInput, setRawTextInput] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);

  // États Mode URL Web
  const [urlInput, setUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [importStepText, setImportStepText] = useState('');
  const [urlErrorMessage, setUrlErrorMessage] = useState<string | null>(null);

  // États communs IA & Modales
  const [loadingStep, setLoadingStep] = useState('Préparation des données...');
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // Vérification de la connexion IA en direct
  const [connectionStatus, setConnectionStatus] = useState<AiConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

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

  useEffect(() => {
    RecipeAiService.getApiKey().then((key) => {
      setApiKey(key);
      verifyAiStatus(key);
    });
  }, [verifyAiStatus]);

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

  const handleQrRecipeScanned = (recipe: Recipe) => {
    setIsQrScannerVisible(false);
    if (onRecipeReceived) {
      onRecipeReceived(recipe);
    } else {
      onRecipeExtracted(recipe);
    }
  };

  // Compresser et préparer l'image en base64
  const processImage = async (uri: string): Promise<CapturedPhoto> => {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.55, format: SaveFormat.JPEG, base64: true }
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

  // ANALYSE PHOTO
  const handleAnalyzePhotos = async () => {
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

    setIsAnalyzingPhotos(true);
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
        imageUrl: photos[0].uri,
        availableImages: photos.map((p) => p.uri),
        ingredients: (extracted.ingredients || []).map((ing, idx) => {
          const res = UnifiedIngredientService.resolveRecognizedIngredient(ing.name);
          return {
            id: generateUniqueId(`ing_scanned_${idx + 1}`),
            name: res.isRecognized && res.canonical ? res.canonical.canonicalName : ing.name,
            canonicalId: res.isRecognized && res.canonical ? res.canonical.id : undefined,
            quantity: ing.quantity,
            unit: ing.unit,
            isPantryStaple: ing.isPantryStaple ?? res.canonical?.isPantryStaple,
            isOptional: ing.isOptional,
          };
        }),
        steps: (extracted.steps || []).map((st, idx) => ({
          id: generateUniqueId(`stp_scanned_${idx + 1}`),
          order: st.order || idx + 1,
          instruction: st.instruction,
        })),
      };

      onRecipeExtracted(partialRecipe, photos[0].uri);
    } catch (error: any) {
      console.error('Erreur extraction photos:', error);
      Alert.alert(
        'Échec de l\'analyse',
        error?.message || 'Une erreur est survenue lors de l\'analyse de la photo.'
      );
    } finally {
      setIsAnalyzingPhotos(false);
    }
  };

  // ANALYSE TEXTE
  const handleAnalyzeText = async () => {
    const trimmed = rawTextInput.trim();
    if (!trimmed) {
      Alert.alert('Texte vide', 'Veuillez saisir ou coller le texte de votre recette.');
      return;
    }

    if (connectionStatus && !connectionStatus.ok) {
      Alert.alert(
        'IA indisponible',
        `${connectionStatus.message}\n\nVeuillez vérifier votre connexion ou votre clé API avant de lancer l'analyse.`
      );
      return;
    }

    setIsAnalyzingText(true);
    setLoadingStep('Analyse et compréhension du texte...');

    try {
      setTimeout(() => setLoadingStep('Extraction des ingrédients et étapes...'), 1500);

      const extracted: ExtractedRecipeData = await RecipeAiService.extractRecipeFromText(
        trimmed,
        apiKey
      );

      const partialRecipe: Partial<Recipe> = {
        title: extracted.title || 'Recette importée',
        description: extracted.description || '',
        category: extracted.category || 'Plat',
        difficulty: extracted.difficulty || 'Moyen',
        prepTimeMinutes: extracted.prepTimeMinutes || 15,
        cookTimeMinutes: extracted.cookTimeMinutes || 20,
        servings: extracted.servings || 4,
        rating: 4.5,
        userNote: extracted.userNote ? extracted.userNote.trim() : undefined,
        isVegetarian: extracted.isVegetarian ?? false,
        ingredients: (extracted.ingredients || []).map((ing, idx) => {
          const res = UnifiedIngredientService.resolveRecognizedIngredient(ing.name);
          return {
            id: generateUniqueId(`ing_text_${idx + 1}`),
            name: res.isRecognized && res.canonical ? res.canonical.canonicalName : ing.name,
            canonicalId: res.isRecognized && res.canonical ? res.canonical.id : undefined,
            quantity: ing.quantity,
            unit: ing.unit,
            isPantryStaple: ing.isPantryStaple ?? res.canonical?.isPantryStaple,
            isOptional: ing.isOptional,
          };
        }),
        steps: (extracted.steps || []).map((st, idx) => ({
          id: generateUniqueId(`stp_text_${idx + 1}`),
          order: st.order || idx + 1,
          instruction: st.instruction,
        })),
      };

      onRecipeExtracted(partialRecipe);
    } catch (error: any) {
      console.error('Erreur extraction texte:', error);
      Alert.alert(
        'Échec de l\'analyse',
        error?.message || 'Une erreur est survenue lors de l\'analyse du texte.'
      );
    } finally {
      setIsAnalyzingText(false);
    }
  };

  // IMPORT URL WEB
  const handleImportUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlErrorMessage('Veuillez renseigner un lien web de recette.');
      return;
    }

    try {
      setUrlErrorMessage(null);
      setIsImportingUrl(true);
      setImportStepText('1/3 - Téléchargement de la page web...');

      await new Promise((resolve) => setTimeout(resolve, 250));
      setImportStepText('2/3 - Extraction Schema.org & normalisation...');

      const recipe = await WebRecipeService.importRecipeFromUrl(trimmed);

      const imgCount = recipe.availableImages?.length || (recipe.imageUrl ? 1 : 0);
      setImportStepText(
        `3/3 - ${recipe.title} (${recipe.ingredients.length} ingr., ${imgCount} photo(s)), ouverture...`
      );
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (onRecipeReceived) {
        onRecipeReceived(recipe);
      } else {
        onRecipeExtracted(recipe, recipe.imageUrl);
      }
    } catch (err: any) {
      console.error('Erreur import recette web:', err);
      setUrlErrorMessage(
        err?.message || 'Une erreur est survenue lors de l\'importation de la recette web.'
      );
    } finally {
      setIsImportingUrl(false);
      setImportStepText('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header uniforme */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>
              {mode === 'text' && 'Texte brut'}
              {mode === 'photo' && 'Scanner une recette'}
              {mode === 'url' && 'Coller un lien web'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {mode === 'text' && 'Extraction intelligente IA'}
              {mode === 'photo' && 'Vision multimodale IA'}
              {mode === 'url' && 'Extraction web automatique'}
            </Text>
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
              color={connectionStatus?.ok ? colors.secondary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Switcher segmenté à 3 entrées */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'text' && styles.segmentBtnActive]}
            onPress={() => setMode('text')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={mode === 'text' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                mode === 'text' && styles.segmentBtnTextActive,
              ]}
            >
              Texte brut
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'photo' && styles.segmentBtnActive]}
            onPress={() => setMode('photo')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="camera-outline"
              size={16}
              color={mode === 'photo' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                mode === 'photo' && styles.segmentBtnTextActive,
              ]}
            >
              Scanner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'url' && styles.segmentBtnActive]}
            onPress={() => setMode('url')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="globe-outline"
              size={16}
              color={mode === 'url' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                mode === 'url' && styles.segmentBtnTextActive,
              ]}
            >
              Coller un lien
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bannière Live IA (modes Texte & Photo) */}
          {(mode === 'text' || mode === 'photo') && (
            <>
              {isCheckingConnection ? (
                <View style={styles.checkingBadge}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.checkingText}>Vérification de la connexion IA...</Text>
                </View>
              ) : connectionStatus?.ok ? (
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.secondary} />
                  <View style={styles.readyTextCol}>
                    <Text style={styles.readyTitle}>Reconnaissance IA prête</Text>
                    <Text style={styles.readySubtitle}>Gemini 3.8 Flash connecté</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => verifyAiStatus(apiKey)}
                    style={styles.refreshBadgeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="refresh" size={15} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.errorCard}>
                  <View style={styles.errorTopRow}>
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={colors.danger}
                      style={styles.errorIcon}
                    />
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
                      <Ionicons name="key-outline" size={14} color={colors.primary} />
                      <Text style={styles.errorKeyBtnText}>Configurer clé</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* 1. ONGLET TEXTE BRUT */}
          {/* ========================================================= */}
          {mode === 'text' && (
            <View>
              {/* Carte guide */}
              <View style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={styles.guideTitle}>Extraction intelligente par IA</Text>
                </View>
                <Text style={styles.guideText}>
                  Collez vos notes, un message ou le texte brut d&apos;une recette. L&apos;IA structure automatiquement le titre, les portions, les temps de cuisson, les ingrédients et les étapes.
                </Text>
              </View>

              {/* Boîte de saisie texte */}
              <View style={styles.inputCard}>
                <View style={styles.inputCardHeader}>
                  <View style={styles.inputCardHeaderLeft}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputCardHeaderTitle}>Votre recette en texte</Text>
                  </View>
                  <View style={styles.inputCardHeaderActions}>
                    {rawTextInput.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearQuickBtn}
                        onPress={() => setRawTextInput('')}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Effacer le texte"
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TextInput
                  style={styles.rawTextArea}
                  value={rawTextInput}
                  onChangeText={setRawTextInput}
                  placeholder={"Ex: Risotto aux champignons\n300g de riz arborio, 250g de champignons, 1 échalote...\n\nFaire suer l'échalote, ajouter le riz..."}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.inputCardFooter}>
                  <Text style={styles.textCountHint}>
                    {rawTextInput.length} caractère{rawTextInput.length > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Bouton d'action principal */}
              <TouchableOpacity
                style={[
                  styles.primaryCtaBtn,
                  (isAnalyzingText ||
                    !rawTextInput.trim() ||
                    (connectionStatus && !connectionStatus.ok)) &&
                    styles.primaryCtaBtnDisabled,
                ]}
                onPress={handleAnalyzeText}
                disabled={isAnalyzingText || !rawTextInput.trim()}
                activeOpacity={0.85}
              >
                {isAnalyzingText ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryCtaBtnText}>{loadingStep}</Text>
                  </View>
                ) : (
                  <View style={styles.btnLoadingRow}>
                    <Ionicons name="sparkles" size={19} color="#FFFFFF" />
                    <Text style={styles.primaryCtaBtnText}>
                      Structurer et créer la recette
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================================= */}
          {/* 2. ONGLET SCANNER (PHOTO & QR) */}
          {/* ========================================================= */}
          {mode === 'photo' && (
            <View>
              {/* Carte guide */}
              <View style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <Ionicons name="camera-outline" size={16} color={colors.primary} />
                  <Text style={styles.guideTitle}>Tous formats de photo acceptés</Text>
                </View>
                <Text style={styles.guideText}>
                  Prenez en photo votre recette depuis n&apos;importe quel support : livre de cuisine, fiche repas, carnet manuscrit ou capture d&apos;écran. Par défaut <Text style={styles.guideBold}>1 photo</Text> suffit, vous pouvez en ajouter d&apos;autres si la recette s&apos;étale sur plusieurs pages.
                </Text>
              </View>

              {photos.length === 0 ? (
                /* État initial : invitation à ajouter une photo */
                <View style={styles.emptyHeroBox}>
                  <View style={styles.emptyHeroIconCircle}>
                    <Ionicons name="camera-outline" size={38} color={colors.primary} />
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
                      <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
                      <Text style={styles.heroGalleryBtnText}>Choisir dans la galerie</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.heroQrBtn}
                      onPress={() => setIsQrScannerVisible(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
                      <Text style={styles.heroQrBtnText}>Scanner un QR code Papilles</Text>
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
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoThumb}
                          resizeMode="cover"
                        />
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

                  <View style={styles.addMoreRow}>
                    <TouchableOpacity
                      style={styles.addMoreBtn}
                      onPress={() => handlePickPhoto(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={17} color={colors.primary} />
                      <Text style={styles.addMoreBtnText}>+ Ajouter photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addMoreBtn}
                      onPress={() => handlePickPhoto(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={17} color={colors.primary} />
                      <Text style={styles.addMoreBtnText}>+ Galerie</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Bouton d'action principal */}
              {photos.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.primaryCtaBtn,
                    (isAnalyzingPhotos || (connectionStatus && !connectionStatus.ok)) &&
                      styles.primaryCtaBtnDisabled,
                  ]}
                  onPress={handleAnalyzePhotos}
                  disabled={isAnalyzingPhotos}
                  activeOpacity={0.85}
                >
                  {isAnalyzingPhotos ? (
                    <View style={styles.btnLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryCtaBtnText}>{loadingStep}</Text>
                    </View>
                  ) : (
                    <View style={styles.btnLoadingRow}>
                      <Ionicons name="sparkles" size={19} color="#FFFFFF" />
                      <Text style={styles.primaryCtaBtnText}>
                        Analyser la recette ({photos.length} photo{photos.length > 1 ? 's' : ''})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ========================================================= */}
          {/* 3. ONGLET COLLER UN LIEN WEB */}
          {/* ========================================================= */}
          {mode === 'url' && (
            <View>
              {/* Carte guide */}
              <View style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <Ionicons name="globe-outline" size={16} color={colors.primary} />
                  <Text style={styles.guideTitle}>Importation universelle de recette web</Text>
                </View>
                <Text style={styles.guideText}>
                  Collez l&apos;adresse web d&apos;une recette trouvée sur Internet. Papilles extrait automatiquement la photo haute résolution, les portions, les temps de cuisson, les ingrédients normalisés et les étapes.
                </Text>
              </View>

              {/* Boîte de saisie d'URL */}
              <View style={styles.inputCard}>
                <View style={styles.inputCardHeader}>
                  <View style={styles.inputCardHeaderLeft}>
                    <Ionicons name="link-outline" size={18} color={colors.primary} />
                    <Text style={styles.inputCardHeaderTitle}>Adresse de la recette</Text>
                  </View>
                  {urlInput.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearQuickBtn}
                      onPress={() => {
                        setUrlInput('');
                        setUrlErrorMessage(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={styles.clearQuickBtnText}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.urlInputWrapper}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.urlInputIcon}
                  />
                  <TextInput
                    style={styles.urlInput}
                    value={urlInput}
                    onChangeText={(text) => {
                      setUrlInput(text);
                      if (urlErrorMessage) setUrlErrorMessage(null);
                    }}
                    placeholder="https://... (ex: Marmiton, 750g, CuisineAZ, blog...)"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>

                {/* Chips des plateformes compatibles */}
                <View style={styles.platformsBox}>
                  <Text style={styles.platformsTitle}>Sites compatibles testés :</Text>
                  <View style={styles.platformsChipsRow}>
                    {POPULAR_PLATFORMS.map((site) => (
                      <View key={site} style={styles.platformChip}>
                        <Text style={styles.platformChipText}>{site}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Erreur éventuelle d'import */}
              {urlErrorMessage && (
                <View style={styles.urlErrorCard}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.urlErrorText}>{urlErrorMessage}</Text>
                </View>
              )}

              {/* Bouton d'action principal */}
              <TouchableOpacity
                style={[
                  styles.primaryCtaBtn,
                  (isImportingUrl || !urlInput.trim()) && styles.primaryCtaBtnDisabled,
                ]}
                onPress={handleImportUrl}
                disabled={isImportingUrl || !urlInput.trim()}
                activeOpacity={0.85}
              >
                {isImportingUrl ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryCtaBtnText}>{importStepText}</Text>
                  </View>
                ) : (
                  <View style={styles.btnLoadingRow}>
                    <Ionicons name="globe-outline" size={19} color="#FFFFFF" />
                    <Text style={styles.primaryCtaBtnText}>Importer la recette</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Passerelle directe vers la saisie manuelle sans IA (commune aux 3 modes) */}
          {onManualCreate && (
            <TouchableOpacity
              style={styles.manualSwitchCard}
              onPress={onManualCreate}
              activeOpacity={0.8}
            >
              <View style={styles.manualSwitchIconCircle}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.manualSwitchTextCol}>
                <Text style={styles.manualSwitchTitle}>Passer à la saisie manuelle</Text>
                <Text style={styles.manualSwitchSubtitle}>
                  Créer une recette vierge à la main sans passer par l&apos;IA
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
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
                L&apos;analyse intelligente utilise Gemini 3.8 Flash. Vous pouvez configurer votre propre clé Google AI Studio.
              </Text>

              <View style={styles.keyInputContainer}>
                <TextInput
                  style={styles.keyInput}
                  value={tempApiKeyInput}
                  onChangeText={setTempApiKeyInput}
                  placeholder="Collez votre clé API Gemini ici..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isKeyVisible}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setIsKeyVisible(!isKeyVisible)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isKeyVisible ? 'Masquer la clé' : 'Afficher la clé'}
                >
                  <Ionicons
                    name={isKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
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

        {/* Modal Scanner QR Code pour partage direct */}
        <QrScannerModal
          visible={isQrScannerVisible}
          onClose={() => setIsQrScannerVisible(false)}
          onRecipeScanned={handleQrRecipeScanned}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  keyBtn: {
    padding: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  checkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  checkingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  readyTextCol: {
    flex: 1,
    marginLeft: 8,
  },
  readyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  readySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
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
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  guideText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  guideBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    ...shadows.small,
  },
  inputCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  inputCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputCardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputCardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  sampleQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  clearQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    gap: 4,
  },
  clearQuickBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.danger,
  },
  rawTextArea: {
    minHeight: 180,
    maxHeight: 280,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  inputCardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  textCountHint: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  primaryCtaBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.medium,
  },
  primaryCtaBtnDisabled: {
    opacity: 0.55,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryCtaBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyHeroBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: 16,
  },
  emptyHeroIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyHeroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHeroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  heroButtonsCol: {
    width: '100%',
    gap: 10,
  },
  heroCameraBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    ...shadows.small,
  },
  heroCameraBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  heroGalleryBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  heroGalleryBtnText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  heroQrBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  heroQrBtnText: {
    color: colors.primary,
    fontWeight: '700',
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
    color: colors.textPrimary,
  },
  photosCountHint: {
    fontSize: 12,
    color: colors.textMuted,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
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
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  urlInputIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
    height: 48,
  },
  platformsBox: {
    marginTop: 2,
  },
  platformsTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  platformsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  platformChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  urlErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 8,
  },
  urlErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.danger,
    fontWeight: '600',
    lineHeight: 17,
  },
  manualSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    gap: 12,
  },
  manualSwitchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  manualSwitchTextCol: {
    flex: 1,
  },
  manualSwitchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  manualSwitchSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginBottom: 16,
    paddingRight: 10,
  },
  keyInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveBtn: {
    backgroundColor: colors.primary,
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
