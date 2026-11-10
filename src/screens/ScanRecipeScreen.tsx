import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Animated,
  useWindowDimensions,
  LayoutChangeEvent,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  RecipeAiService,
  ExtractedRecipeData,
  AiConnectionStatus,
  formatAiModelName,
  discoverGeminiModels,
  CHEF_MOODS,
  ChefMoodOption,
} from '../services/recipeAiService';
import { UnifiedIngredientService } from '../services/unifiedIngredientService';
import { WebRecipeService } from '../services/webRecipeService';
import { ImageStorageService } from '../services/imageStorageService';
import { StorageService } from '../services/storageService';
import { Recipe, Category, RecipeIdea } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle } from '../types/shopping';
import { generateUniqueId } from '../utils/helpers';
import { evaluateRecipesWithStock } from '../utils/stockMatcher';
import { AISLE_CONFIGS, ALL_AISLES, classifyIngredientAisle } from '../utils/aisleClassifier';
import { QrScannerModal } from '../components/import-share/QrScannerModal';
import { CameraCaptureModal } from '../components/import-share/CameraCaptureModal';
import { ChefFavoritePromptsModal } from '../components/chef-ai/ChefFavoritePromptsModal';
import { UnifiedIngredientInput } from '../components/lexicon-units/UnifiedIngredientInput';

export type AddRecipeMode = "photo" | "text" | "url" | "chef";
export const MODES: AddRecipeMode[] = ["text", "photo", "url", "chef"];

export type IngredientSelectionState = 'primary' | 'optional' | 'inactive';

export function cycleIngredientState(
  currentState: IngredientSelectionState
): IngredientSelectionState {
  switch (currentState) {
    case 'optional':
      return 'primary';
    case 'primary':
      return 'inactive';
    case 'inactive':
    default:
      return 'optional';
  }
}

export function initializeStockIngredients(stockItems: FridgeItem[]): {
  primaryIngredients: string[];
  optionalIngredients: string[];
  inactiveIngredients: string[];
} {
  if (!stockItems || stockItems.length === 0) {
    return {
      primaryIngredients: [],
      optionalIngredients: [],
      inactiveIngredients: [],
    };
  }
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of stockItems) {
    const trimmed = item.name ? item.name.trim() : '';
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      names.push(trimmed);
    }
  }
  return {
    primaryIngredients: [],
    optionalIngredients: names,
    inactiveIngredients: [],
  };
}

export function organizeIngredientsForDisplay(
  itemsWithState: { name: string; state: IngredientSelectionState }[]
): { name: string; state: IngredientSelectionState }[] {
  const primaries = itemsWithState.filter((i) => i.state === 'primary');
  const optionals = itemsWithState.filter((i) => i.state === 'optional');
  const inactives = itemsWithState.filter((i) => i.state === 'inactive');

  return [...primaries, ...optionals, ...inactives];
}

export function getActiveIngredientsForAi(
  itemsWithState: { name: string; state: IngredientSelectionState }[]
): { primary: string[]; optional: string[] } {
  return {
    primary: itemsWithState.filter((i) => i.state === 'primary').map((i) => i.name),
    optional: itemsWithState.filter((i) => i.state === 'optional').map((i) => i.name),
  };
}

export type AllowedMealType = 'Entrée' | 'Plat' | 'Dessert' | 'Apéritif' | 'Boisson';

const MEAL_TYPES: { id: AllowedMealType; label: string; iconName: string }[] = [
  { id: 'Entrée', label: 'Entrée', iconName: 'leaf-outline' },
  { id: 'Plat', label: 'Plat', iconName: 'restaurant-outline' },
  { id: 'Dessert', label: 'Dessert', iconName: 'ice-cream-outline' },
  { id: 'Apéritif', label: 'Apéritif', iconName: 'wine-outline' },
  { id: 'Boisson', label: 'Boisson', iconName: 'cafe-outline' },
];

function formatMealTypeGenitive(type: AllowedMealType): string {
  switch (type) {
    case 'Entrée':
      return "d'entrée";
    case 'Plat':
      return 'de plat';
    case 'Dessert':
      return 'de dessert';
    case 'Apéritif':
      return "d'apéritif";
    case 'Boisson':
      return 'de boisson';
    default:
      return `de ${(type as string).toLowerCase()}`;
  }
}

const AI_STEPS = [
  'Le Chef IA examine vos ingrédients en stock...',
  'Association créative et équilibre des saveurs...',
  'Calcul précis des proportions & assaisonnements...',
  'Rédaction des étapes pas-à-pas...',
  'Finalisation des secrets de cuisson...',
];

export interface CapturedPhoto {
  id: string;
  uri: string;
  base64: string;
}

export interface ScanRecipeScreenProps {
  initialMode?: AddRecipeMode;
  initialPhotos?: CapturedPhoto[];
  initialPendingPhotoUri?: string;
  recipes?: Recipe[];
  stockItems?: FridgeItem[];
  onBack: () => void;
  onRecipeExtracted: (recipeData: Partial<Recipe>, coverImageUri?: string) => void;
  onRecipeReceived?: (recipe: Recipe) => void;
  onManualCreate?: () => void;
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
  initialPhotos,
  initialPendingPhotoUri,
  recipes = [],
  stockItems,
  onBack,
  onRecipeExtracted,
  onRecipeReceived,
  onManualCreate,
}) => {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [mode, setMode] = useState<AddRecipeMode>(initialMode);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  const pagerRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const prevScreenWidth = useRef(screenWidth);

  const [scrollX] = useState(
    () => new Animated.Value(MODES.indexOf(initialMode) * screenWidth)
  );
  const [tabLayout, setTabLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  if (initialMode && initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
  }

  useEffect(() => {
    if (initialMode) {
      const targetIndex = MODES.indexOf(initialMode);
      pagerRef.current?.scrollTo({
        x: targetIndex * screenWidth,
        animated: false,
      });
    }
  }, [initialMode, screenWidth]);

  // Recalage de la translation si la largeur d'écran change
  useEffect(() => {
    if (prevScreenWidth.current !== screenWidth) {
      prevScreenWidth.current = screenWidth;
      const targetIndex = MODES.indexOf(mode);
      pagerRef.current?.scrollTo({
        x: targetIndex * screenWidth,
        animated: false,
      });
    }
  }, [screenWidth, mode]);

  const onFirstTabLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setTabLayout((prev) => {
        if (
          Math.abs(prev.x - x) < 0.5 &&
          Math.abs(prev.y - y) < 0.5 &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { x, y, width, height };
      });
    }
  }, []);

  // Interpolation de la position de la pilule indicatrice active (0 -> 3 * tabLayout.width)
  const indicatorTranslateX = useMemo(() => {
    return scrollX.interpolate({
      inputRange: [0, 3 * screenWidth],
      outputRange: [0, 3 * tabLayout.width],
      extrapolate: "clamp",
    });
  }, [scrollX, screenWidth, tabLayout.width]);

  // Interpolations d'opacité croisée pour les libellés et icônes des 4 onglets
  const textActiveOpacity = useMemo(() => {
    return scrollX.interpolate({
      inputRange: [0, screenWidth],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });
  }, [scrollX, screenWidth]);

  const photoActiveOpacity = useMemo(() => {
    return scrollX.interpolate({
      inputRange: [0, screenWidth, 2 * screenWidth],
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });
  }, [scrollX, screenWidth]);

  const urlActiveOpacity = useMemo(() => {
    return scrollX.interpolate({
      inputRange: [screenWidth, 2 * screenWidth, 3 * screenWidth],
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });
  }, [scrollX, screenWidth]);

  const chefActiveOpacity = useMemo(() => {
    return scrollX.interpolate({
      inputRange: [2 * screenWidth, 3 * screenWidth],
      outputRange: [0, 1],
      extrapolate: "clamp",
    });
  }, [scrollX, screenWidth]);

  // Basculement d'onglet fluide et synchronisé
  const switchMode = useCallback(
    (target: AddRecipeMode, animated = true) => {
      if (mode === target) return;
      Keyboard.dismiss();
      const targetIndex = MODES.indexOf(target);
      setMode(target);
      pagerRef.current?.scrollTo({
        x: targetIndex * screenWidth,
        animated,
      });
    },
    [mode, screenWidth]
  );

  // =========================================================
  // ÉTATS MODE PHOTO
  // =========================================================
  const [photos, setPhotos] = useState<CapturedPhoto[]>(initialPhotos || []);
  const [isAnalyzingPhotos, setIsAnalyzingPhotos] = useState(false);
  const [isCameraModalVisible, setIsCameraModalVisible] = useState(false);

  // =========================================================
  // ÉTATS MODE TEXTE
  // =========================================================
  const [rawTextInput, setRawTextInput] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);

  // =========================================================
  // ÉTATS MODE URL WEB
  // =========================================================
  const [urlInput, setUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [importStepText, setImportStepText] = useState('');
  const [urlErrorMessage, setUrlErrorMessage] = useState<string | null>(null);

  // =========================================================
  // ÉTATS COMMUNS IA & MODALES
  // =========================================================
  const [loadingStep, setLoadingStep] = useState('Préparation des données...');
  const [isQrScannerVisible, setIsQrScannerVisible] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // =========================================================
  // ÉTATS CHEF IA
  // =========================================================
  const [chefStockItems, setChefStockItems] = useState<FridgeItem[]>(stockItems || []);
  const initialStock = useMemo(() => initializeStockIngredients(stockItems || []), [stockItems]);
  const [primaryIngredients, setPrimaryIngredients] = useState<string[]>(initialStock.primaryIngredients);
  const [optionalIngredients, setOptionalIngredients] = useState<string[]>(initialStock.optionalIngredients);
  const [inactiveIngredients, setInactiveIngredients] = useState<string[]>(initialStock.inactiveIngredients);
  const [ingredientSearchText, setIngredientSearchText] = useState<string>('');
  const [rejectedIdeaTitles, setRejectedIdeaTitles] = useState<string[]>([]);
  const [isFavoritePromptsModalVisible, setIsFavoritePromptsModalVisible] = useState(false);

  const [servings, setServings] = useState<number>(4);
  const [isVegetarian, setIsVegetarian] = useState<boolean>(false);
  const [mealType, setMealType] = useState<AllowedMealType>('Plat');
  const [isMealTypeDropdownOpen, setIsMealTypeDropdownOpen] = useState<boolean>(false);
  const [additionalPreferences, setAdditionalPreferences] = useState<string>('');

  const [aiFlowStep, setAiFlowStep] = useState<
    'config' | 'loading_ideas' | 'ideas' | 'generating_recipe'
  >('config');
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<RecipeIdea | null>(null);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [activeModelInfo, setActiveModelInfo] = useState<{ model: string; isFallback: boolean }>({
    model: '',
    isFallback: false,
  });
  const [chefMood, setChefMood] = useState<string>('quotidien');
  const [availableMoods, setAvailableMoods] = useState<ChefMoodOption[]>(CHEF_MOODS);

  const stepIntervalRef = useRef<any>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const currentOperationIdRef = useRef<number>(0);

  const currentMealTypeObj = useMemo(
    () => MEAL_TYPES.find((t) => t.id === mealType) || MEAL_TYPES[1],
    [mealType]
  );

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
      if (key) discoverGeminiModels(key).catch(() => {});
    });
  }, [verifyAiStatus]);

  const [prevStockItems, setPrevStockItems] = useState(stockItems);
  if (stockItems !== prevStockItems) {
    setPrevStockItems(stockItems);
    if (stockItems && stockItems.length > 0) {
      setChefStockItems(stockItems);
      const init = initializeStockIngredients(stockItems);
      setPrimaryIngredients(init.primaryIngredients);
      setOptionalIngredients(init.optionalIngredients);
      setInactiveIngredients(init.inactiveIngredients);
    }
  }

  // Chargement des stocks pour le Chef IA si non fournis
  useEffect(() => {
    if (!stockItems || stockItems.length === 0) {
      StorageService.getFridgeItems().then((items) => {
        setChefStockItems(items);
        const init = initializeStockIngredients(items);
        setPrimaryIngredients(init.primaryIngredients);
        setOptionalIngredients(init.optionalIngredients);
        setInactiveIngredients(init.inactiveIngredients);
      });
    }
  }, [stockItems]);

  // Détection de blocage du swipe (modales ouvertes ou génération IA en cours)
  const isSwipeBlocked =
    isApiKeyModalVisible ||
    isCameraModalVisible ||
    isQrScannerVisible ||
    isFavoritePromptsModalVisible ||
    isMealTypeDropdownOpen ||
    isAnalyzingPhotos ||
    isAnalyzingText ||
    isImportingUrl ||
    aiFlowStep === "generating_recipe" ||
    aiFlowStep === "loading_ideas";

  const updateModeFromOffset = useCallback(
    (offsetX: number) => {
      const targetIndex = Math.round(offsetX / screenWidth);
      const clampedIndex = Math.max(0, Math.min(MODES.length - 1, targetIndex));
      const targetMode = MODES[clampedIndex];
      if (targetMode !== mode) {
        setMode(targetMode);
      }
    },
    [screenWidth, mode]
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateModeFromOffset(e.nativeEvent.contentOffset.x);
    },
    [updateModeFromOffset]
  );

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocity = e.nativeEvent.velocity?.x ?? 0;
      if (Math.abs(velocity) < 0.05) {
        updateModeFromOffset(e.nativeEvent.contentOffset.x);
      }
    },
    [updateModeFromOffset]
  );

  // Charger réglages utilisateur (portions, végé, humeurs)
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      StorageService.getDefaultServings(),
      StorageService.getDefaultVegetarianFilter(),
      StorageService.getChefMoods(),
    ]).then(([val, defaultVege, moods]) => {
      if (isMounted) {
        if (val && val >= 1) setServings(val);
        if (defaultVege) setIsVegetarian(true);
        if (moods && moods.length > 0) {
          setAvailableMoods(moods);
          setChefMood((current) => (moods.some((m) => m.id === current) ? current : moods[0].id));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Animation des étapes IA de cuisson
  useEffect(() => {
    if (aiFlowStep === 'generating_recipe') {
      stepIntervalRef.current = setInterval(() => {
        setAiStepIndex((prev) => (prev + 1) % AI_STEPS.length);
      }, 2300);
    } else {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    }
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, [aiFlowStep]);

  const cancelCurrentAiOperation = useCallback((targetStep?: 'config' | 'ideas') => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    currentOperationIdRef.current += 1;
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }
    if (targetStep) {
      setAiFlowStep(targetStep);
    }
  }, [setAiFlowStep]);

  useEffect(() => {
    return () => {
      cancelCurrentAiOperation();
    };
  }, [cancelCurrentAiOperation]);

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
    let manipResult: { uri: string; base64?: string };
    try {
      const context = ImageManipulator.manipulate(uri, { maxWidth: 1024, maxHeight: 1024 });
      const image = await context.renderAsync();
      manipResult = await image.saveAsync({ compress: 0.55, format: SaveFormat.JPEG, base64: true });
      context.release();
      image.release();
    } catch {
      manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.55, format: SaveFormat.JPEG, base64: true }
      );
    }

    if (uri.includes('/cache/') || uri.includes('ImagePicker')) {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }

    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      uri: manipResult.uri,
      base64: manipResult.base64 || '',
    };
  };

  // Traitement d'une photo en attente (repli défensif)
  useEffect(() => {
    if (initialPendingPhotoUri) {
      processImage(initialPendingPhotoUri)
        .then((p) => {
          setPhotos((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
        })
        .catch((e) => console.log('[Scan] Erreur traitement photo pending:', e));
    }
  }, [initialPendingPhotoUri]);

  const handleCameraPhotosCaptured = async (uris: string[]) => {
    try {
      const newCaptured: CapturedPhoto[] = [];
      for (const uri of uris) {
        const processed = await processImage(uri);
        newCaptured.push(processed);
      }
      setPhotos((prev) => [...prev, ...newCaptured]);
    } catch (err) {
      console.error('[Scan] Erreur traitement photos caméra:', err);
      Alert.alert('Erreur', 'Impossible de traiter les photos capturées.');
    }
  };

  const handlePickPhoto = async (fromCamera: boolean) => {
    if (fromCamera) {
      setIsCameraModalVisible(true);
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à vos photos dans vos réglages.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 4 - photos.length),
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newCaptured: CapturedPhoto[] = [];
        for (let i = 0; i < result.assets.length; i++) {
          const processed = await processImage(result.assets[i].uri);
          newCaptured.push(processed);
        }
        setPhotos((prev) => [...prev, ...newCaptured]);
      }
    } catch (e: any) {
      console.error('Erreur sélection photo galerie:', e);
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

      const permanentPhotos = await Promise.all(
        photos.map((p) => ImageStorageService.persistImageLocally(p.uri))
      );
      const coverPhotoUri = permanentPhotos[0] || photos[0]?.uri || '';

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
        imageUrl: coverPhotoUri,
        availableImages: permanentPhotos,
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

      onRecipeExtracted(partialRecipe, coverPhotoUri);
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

  // =========================================================
  // GESTIONNAIRES CHEF IA
  // =========================================================
  const doableRecipesForCurrentType = useMemo(() => {
    if (chefStockItems.length === 0 || recipes.length === 0) return [];
    const map = evaluateRecipesWithStock(recipes, chefStockItems, {
      assumePantryStaplesAvailable: true,
    });
    return recipes.filter((r) => map.get(r.id)?.isDoable && r.category === mealType);
  }, [recipes, chefStockItems, mealType]);

  const handleCycleIngredient = (name: string) => {
    if (primaryIngredients.includes(name)) {
      setPrimaryIngredients((prev) => prev.filter((i) => i !== name));
      setInactiveIngredients((prev) => [...prev.filter((i) => i !== name), name]);
      setRejectedIdeaTitles([]);
    } else if (optionalIngredients.includes(name)) {
      setOptionalIngredients((prev) => prev.filter((i) => i !== name));
      setPrimaryIngredients((prev) => [...prev.filter((i) => i !== name), name]);
      setRejectedIdeaTitles([]);
    } else {
      setInactiveIngredients((prev) => prev.filter((i) => i !== name));
      setOptionalIngredients((prev) => [...prev.filter((i) => i !== name), name]);
    }
  };

  const handleExcludeIngredient = (name: string) => {
    const trimmedLower = name.trim().toLowerCase();
    setPrimaryIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
    setOptionalIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
    if (!inactiveIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setInactiveIngredients((prev) => [...prev, name]);
    }
    setRejectedIdeaTitles([]);
  };

  const handleIncludeIngredient = (name: string) => {
    const trimmedLower = name.trim().toLowerCase();
    setInactiveIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
    if (
      !optionalIngredients.some((i) => i.toLowerCase() === trimmedLower) &&
      !primaryIngredients.some((i) => i.toLowerCase() === trimmedLower)
    ) {
      setOptionalIngredients((prev) => [...prev, name]);
    }
    setRejectedIdeaTitles([]);
  };

  const handleAddIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const trimmedLower = trimmed.toLowerCase();

    if (primaryIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setIngredientSearchText('');
      return;
    }

    if (optionalIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setOptionalIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
      setPrimaryIngredients((prev) => [...prev, trimmed]);
      setRejectedIdeaTitles([]);
      setIngredientSearchText('');
      return;
    }

    if (inactiveIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setInactiveIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
      setPrimaryIngredients((prev) => [...prev, trimmed]);
      setRejectedIdeaTitles([]);
      setIngredientSearchText('');
      return;
    }

    setPrimaryIngredients((prev) => [...prev, trimmed]);
    setRejectedIdeaTitles([]);
    setIngredientSearchText('');
  };

  const handleIncludeAll = () => {
    setOptionalIngredients((prev) => [...prev, ...inactiveIngredients]);
    setInactiveIngredients([]);
  };

  const handleExcludeAll = () => {
    setInactiveIngredients((prev) => [...prev, ...primaryIngredients, ...optionalIngredients]);
    setPrimaryIngredients([]);
    setOptionalIngredients([]);
    setRejectedIdeaTitles([]);
  };

  const getIngredientAisle = useCallback(
    (name: string): ShoppingAisle => {
      const trimmed = name.trim().toLowerCase();
      const stockMatch = chefStockItems.find((s) => s.name?.trim().toLowerCase() === trimmed);
      if (stockMatch?.aisle) {
        return stockMatch.aisle;
      }
      return classifyIngredientAisle(name);
    },
    [chefStockItems]
  );

  const groupedActiveIngredients = useMemo<{
    aisle: ShoppingAisle;
    items: { name: string; isPrimary: boolean }[];
  }[]>(() => {
    const activeMap = new Map<string, { name: string; isPrimary: boolean }>();

    primaryIngredients.forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) {
        activeMap.set(trimmed.toLowerCase(), { name: trimmed, isPrimary: true });
      }
    });

    optionalIngredients.forEach((name) => {
      const trimmed = name.trim();
      if (trimmed && !activeMap.has(trimmed.toLowerCase())) {
        activeMap.set(trimmed.toLowerCase(), { name: trimmed, isPrimary: false });
      }
    });

    const aisleMap = new Map<ShoppingAisle, { name: string; isPrimary: boolean }[]>();
    activeMap.forEach((item) => {
      const aisle = getIngredientAisle(item.name);
      const list = aisleMap.get(aisle) || [];
      list.push(item);
      aisleMap.set(aisle, list);
    });

    const groups: {
      aisle: ShoppingAisle;
      items: { name: string; isPrimary: boolean }[];
    }[] = [];

    ALL_AISLES.forEach((aisle) => {
      const list = aisleMap.get(aisle);
      if (list && list.length > 0) {
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        groups.push({ aisle, items: list });
      }
    });

    aisleMap.forEach((list, aisle) => {
      if (!ALL_AISLES.includes(aisle) && list.length > 0) {
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        groups.push({ aisle, items: list });
      }
    });

    return groups;
  }, [primaryIngredients, optionalIngredients, getIngredientAisle]);

  const groupedInactiveIngredients = useMemo<{
    aisle: ShoppingAisle;
    items: string[];
  }[]>(() => {
    if (inactiveIngredients.length === 0) return [];

    const aisleMap = new Map<ShoppingAisle, string[]>();
    const seen = new Set<string>();

    inactiveIngredients.forEach((name) => {
      const trimmed = name.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed && !seen.has(lower)) {
        seen.add(lower);
        const aisle = getIngredientAisle(trimmed);
        const list = aisleMap.get(aisle) || [];
        list.push(trimmed);
        aisleMap.set(aisle, list);
      }
    });

    const groups: { aisle: ShoppingAisle; items: string[] }[] = [];
    ALL_AISLES.forEach((aisle) => {
      const list = aisleMap.get(aisle);
      if (list && list.length > 0) {
        list.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        groups.push({ aisle, items: list });
      }
    });

    aisleMap.forEach((list, aisle) => {
      if (!ALL_AISLES.includes(aisle) && list.length > 0) {
        list.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
        groups.push({ aisle, items: list });
      }
    });

    return groups;
  }, [inactiveIngredients, getIngredientAisle]);

  const activeCount = primaryIngredients.length + optionalIngredients.length;

  const handleStartFetchIdeas = async () => {
    const key = await RecipeAiService.getApiKey();
    if (!key) {
      setIsApiKeyModalVisible(true);
      return;
    }

    executeFetchIdeas(key);
  };

  const executeFetchIdeas = async (key?: string, customRejected?: string[]) => {
    cancelCurrentAiOperation();
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const opId = ++currentOperationIdRef.current;

    setActiveModelInfo({ model: '', isFallback: false });
    const apiKeyForModels = key || (await RecipeAiService.getApiKey());
    if (apiKeyForModels) {
      discoverGeminiModels(apiKeyForModels)
        .then((m) => {
          setActiveModelInfo((prev) => (!prev.model ? { model: m.all[0], isFallback: false } : prev));
        })
        .catch(() => {});
    }
    setAiFlowStep('loading_ideas');

    try {
      const doableTitles = doableRecipesForCurrentType
        .map((r) => r.title?.trim())
        .filter(Boolean);

      const aiExclusionEnabled = await StorageService.getAiAllergenExclusionEnabled();
      let excludedAllergens: string[] = [];
      if (aiExclusionEnabled) {
        const userAllergens = await StorageService.getUserAllergens();
        if (userAllergens.length > 0) {
          excludedAllergens = userAllergens.map((a) => a.name.trim()).filter(Boolean);
        }
      }

      const generatedIdeas = await RecipeAiService.suggestRecipeIdeasFromFridge(
        {
          primary: primaryIngredients,
          optional: optionalIngredients,
        },
        {
          mealType,
          servings,
          onlyVegetarian: isVegetarian,
          existingDoableTitles: doableTitles,
          rejectedIdeaTitles: customRejected || rejectedIdeaTitles,
          excludedAllergens,
          chefMood,
          availableMoods,
          additionalPreferences: additionalPreferences.trim(),
          signal: abortController.signal,
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

      if (opId !== currentOperationIdRef.current || abortController.signal.aborted) {
        return;
      }

      if (!generatedIdeas || generatedIdeas.length === 0) {
        throw new Error("Le Chef IA n'a pas pu proposer d'idées. Réessayez.");
      }

      setIdeas(generatedIdeas);
      setAiFlowStep('ideas');
    } catch (err: any) {
      if (
        opId !== currentOperationIdRef.current ||
        abortController.signal.aborted ||
        err?.name === 'AbortError'
      ) {
        return;
      }
      setAiFlowStep('config');
      Alert.alert(
        'Erreur Chef IA',
        err?.message ||
          "Impossible de générer les idées du Chef. Vérifiez votre clé API Gemini et votre connexion."
      );
    } finally {
      if (activeAbortControllerRef.current === abortController) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  const handleRegenerateIdeas = async () => {
    const currentTitles = ideas.map((i) => i.title.trim()).filter(Boolean);
    const updatedRejected = [...rejectedIdeaTitles, ...currentTitles].slice(-15);
    setRejectedIdeaTitles(updatedRejected);

    const key = await RecipeAiService.getApiKey();
    if (!key) {
      setIsApiKeyModalVisible(true);
      return;
    }

    executeFetchIdeas(key, updatedRejected);
  };

  const handleSelectIdea = async (idea: RecipeIdea) => {
    setSelectedIdea(idea);
    const key = await RecipeAiService.getApiKey();
    if (!key) {
      setIsApiKeyModalVisible(true);
      return;
    }
    executeGenerateRecipeFromIdea(idea, key);
  };

  const executeGenerateRecipeFromIdea = async (idea: RecipeIdea, key?: string) => {
    cancelCurrentAiOperation();
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const opId = ++currentOperationIdRef.current;

    setActiveModelInfo({ model: '', isFallback: false });
    const apiKeyForModels = key || (await RecipeAiService.getApiKey());
    if (apiKeyForModels) {
      discoverGeminiModels(apiKeyForModels)
        .then((m) => {
          setActiveModelInfo((prev) => (!prev.model ? { model: m.fast[0], isFallback: false } : prev));
        })
        .catch(() => {});
    }
    setAiStepIndex(0);
    setAiFlowStep('generating_recipe');

    try {
      const allChosenIngredients = [...primaryIngredients, ...optionalIngredients];
      const aiExclusionEnabled = await StorageService.getAiAllergenExclusionEnabled();
      let excludedAllergens: string[] = [];
      if (aiExclusionEnabled) {
        const userAllergens = await StorageService.getUserAllergens();
        if (userAllergens.length > 0) {
          excludedAllergens = userAllergens.map((a) => a.name.trim()).filter(Boolean);
        }
      }

      const generated = await RecipeAiService.generateRecipeFromIdea(
        idea,
        allChosenIngredients,
        {
          mealType,
          servings,
          onlyVegetarian: isVegetarian,
          excludedAllergens,
          additionalPreferences: additionalPreferences.trim(),
          chefMood: chefMood,
          availableMoods,
          signal: abortController.signal,
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

      if (opId !== currentOperationIdRef.current || abortController.signal.aborted) {
        return;
      }

      const partialRecipe: Partial<Recipe> = {
        id: generateUniqueId('rec_ai_stock'),
        title: generated.title || idea.title,
        description: generated.description || idea.description,
        category: (generated.category as Category) || (mealType as Category) || 'Plat',
        difficulty: generated.difficulty || 'Moyen',
        prepTimeMinutes: generated.prepTimeMinutes || 15,
        cookTimeMinutes: generated.cookTimeMinutes || 20,
        servings: generated.servings || servings,
        isVegetarian: generated.isVegetarian ?? isVegetarian,
        userNote:
          generated.userNote ||
          (allChosenIngredients.length > 0
            ? `Recette inédite créée par le Chef IA avec vos aliments : ${allChosenIngredients.join(', ')}`
            : 'Recette inédite créée par le Chef IA en inspiration libre'),
        rating: 0,
        isFavorite: false,
        ingredients: generated.ingredients.map((ing, idx) => ({
          id: generateUniqueId(`ing_${idx}`),
          name: ing.name,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
          isPantryStaple: ing.isPantryStaple,
          isOptional: ing.isOptional,
          canonicalId: (ing as any).canonicalId,
          aisle: (ing as any).aisle,
        })),
        steps: generated.steps.map((st, idx) => ({
          id: generateUniqueId(`stp_${idx}`),
          order: st.order || idx + 1,
          instruction: st.instruction,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onRecipeExtracted(partialRecipe);
    } catch (err: any) {
      if (
        opId !== currentOperationIdRef.current ||
        abortController.signal.aborted ||
        err?.name === 'AbortError'
      ) {
        return;
      }
      setAiFlowStep('ideas');
      Alert.alert(
        'Erreur Chef IA',
        err?.message ||
          "Impossible de générer la recette pas-à-pas. Vérifiez votre clé API et réessayez."
      );
    } finally {
      if (activeAbortControllerRef.current === abortController) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  const renderAiConnectionBanner = () => {
    if (isCheckingConnection || connectionStatus?.ok) {
      return null;
    }
    return (
      <View style={styles.errorCard}>
        <View style={styles.errorTopRow}>
          <Ionicons
            name="close-circle"
            size={22}
            color={colors.danger}
            style={styles.errorIcon}
          />
          <View style={styles.errorTitleCol}>
            <Text style={styles.errorTitle}>
              {connectionStatus?.code === "INVALID_KEY"
                ? "Clé API Gemini invalide"
                : "Connexion IA impossible"}
            </Text>
            <Text style={styles.errorMessage}>{connectionStatus?.message}</Text>
          </View>
        </View>
        <View style={styles.errorActionsRow}>
          <TouchableOpacity
            style={styles.errorFixBtn}
            onPress={() => {
              setTempApiKeyInput(apiKey);
              setIsApiKeyModalVisible(true);
            }}
          >
            <Ionicons name="key" size={14} color="#FFFFFF" />
            <Text style={styles.errorFixBtnText}>Changer de clé</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={() => verifyAiStatus(apiKey)}
          >
            <Ionicons name="refresh" size={14} color={colors.textPrimary} />
            <Text style={styles.errorRetryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFallbackOptions = () => (
    <>
      {onManualCreate && (
        <TouchableOpacity
          style={styles.manualFallbackBtn}
          onPress={onManualCreate}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={17} color={colors.textSecondary} />
          <Text style={styles.manualFallbackBtnText}>
            Créer la recette manuellement (sans IA)
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.qrFallbackBtn}
        onPress={() => setIsQrScannerVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="qr-code-outline" size={17} color={colors.secondary} />
        <Text style={styles.qrFallbackBtnText}>
          Recevoir une recette par QR Code hors-ligne
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header uniforme */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (mode === 'chef') {
                if (aiFlowStep === 'ideas') {
                  setAiFlowStep('config');
                  return;
                }
                if (aiFlowStep === 'generating_recipe' || aiFlowStep === 'loading_ideas') {
                  cancelCurrentAiOperation('config');
                  return;
                }
              }
              onBack();
            }}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>
              {mode === 'text' && 'Texte brut'}
              {mode === 'photo' && 'Scanner une recette'}
              {mode === 'url' && 'Web'}
              {mode === 'chef' &&
                (aiFlowStep === 'ideas' ? 'Inspirations du Chef' : 'Inspirations du Chef IA')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {mode === 'text' && 'Extraction intelligente IA'}
              {mode === 'photo' && 'Vision multimodale IA'}
              {mode === 'url' && 'Extraction web automatique'}
              {mode === 'chef' &&
                (aiFlowStep === 'ideas'
                  ? '3 idées imaginées pour vous'
                  : 'Création sur-mesure & anti-gaspillage')}
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

        {/* Switcher d'onglets et pager avec swipe tactile fluide */}
        <View style={{ flex: 1, overflow: "hidden" }}>
          {/* Switcher segmenté à 4 entrées */}
          <View style={styles.segmentContainer}>
            {tabLayout.width > 0 && (
              <Animated.View
                style={[
                  styles.segmentPill,
                  {
                    left: tabLayout.x,
                    top: tabLayout.y,
                    width: tabLayout.width,
                    height: tabLayout.height,
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              />
            )}

            {/* Onglet 1 : Texte brut */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tabLayout.width === 0 && mode === "text" && styles.segmentBtnActive,
              ]}
              onLayout={onFirstTabLayout}
              onPress={() => switchMode("text")}
              activeOpacity={0.8}
              accessibilityLabel="Mode texte brut"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "text" }}
            >
              <View style={styles.segmentBtnInner}>
                <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.segmentBtnText}>
                  Texte brut
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.segmentBtnInner,
                  styles.segmentBtnOverlay,
                  { opacity: textActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="document-text" size={14} color="#FFFFFF" />
                <Text numberOfLines={1} style={[styles.segmentBtnText, styles.segmentBtnTextActive]}>
                  Texte brut
                </Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Onglet 2 : Scanner */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tabLayout.width === 0 && mode === "photo" && styles.segmentBtnActive,
              ]}
              onPress={() => switchMode("photo")}
              activeOpacity={0.8}
              accessibilityLabel="Mode scanner une recette"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "photo" }}
            >
              <View style={styles.segmentBtnInner}>
                <Ionicons name="camera-outline" size={14} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.segmentBtnText}>
                  Scanner
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.segmentBtnInner,
                  styles.segmentBtnOverlay,
                  { opacity: photoActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
                <Text numberOfLines={1} style={[styles.segmentBtnText, styles.segmentBtnTextActive]}>
                  Scanner
                </Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Onglet 3 : Web */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tabLayout.width === 0 && mode === "url" && styles.segmentBtnActive,
              ]}
              onPress={() => switchMode("url")}
              activeOpacity={0.8}
              accessibilityLabel="Mode importer depuis le web"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "url" }}
            >
              <View style={styles.segmentBtnInner}>
                <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.segmentBtnText}>
                  Web
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.segmentBtnInner,
                  styles.segmentBtnOverlay,
                  { opacity: urlActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="globe" size={14} color="#FFFFFF" />
                <Text numberOfLines={1} style={[styles.segmentBtnText, styles.segmentBtnTextActive]}>
                  Web
                </Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Onglet 4 : Chef IA */}
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                tabLayout.width === 0 && mode === "chef" && styles.segmentBtnActive,
              ]}
              onPress={() => switchMode("chef")}
              activeOpacity={0.8}
              accessibilityLabel="Mode Chef IA anti-gaspillage"
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === "chef" }}
            >
              <View style={styles.segmentBtnInner}>
                <Ionicons name="sparkles-outline" size={14} color={colors.textSecondary} />
                <Text numberOfLines={1} style={styles.segmentBtnText}>
                  Chef IA
                </Text>
              </View>
              <Animated.View
                style={[
                  styles.segmentBtnInner,
                  styles.segmentBtnOverlay,
                  { opacity: chefActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                <Text numberOfLines={1} style={[styles.segmentBtnText, styles.segmentBtnTextActive]}>
                  Chef IA
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Pager interactif continu plein écran avec swipe natif 60/120 FPS */}
          <Animated.ScrollView
            ref={pagerRef as any}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            directionalLockEnabled
            scrollEnabled={!isSwipeBlocked}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            onScrollBeginDrag={() => Keyboard.dismiss()}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onScrollEndDrag={onScrollEndDrag}
            contentOffset={{ x: MODES.indexOf(initialMode) * screenWidth, y: 0 }}
            style={styles.pagerScrollView}
            contentContainerStyle={styles.pagerTrack}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* VUE 1 : TEXTE BRUT */}
            <View
              style={[styles.pagerPage, { width: screenWidth }]}
              aria-hidden={mode !== "text"}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                nestedScrollEnabled={true}
              >
                {renderAiConnectionBanner()}
                {/* ========================================================= */}
                {/* 1. ONGLET TEXTE BRUT */}
                {/* ========================================================= */}
                <View>
                  <View style={styles.guideCard}>
                  <View style={styles.guideHeader}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    <Text style={styles.guideTitle}>Copier-coller du texte brut</Text>
                  </View>
                  <Text style={styles.guideText}>
                    Collez le texte brut d&apos;une recette issue d&apos;un message, d&apos;un mail, de WhatsApp ou d&apos;un livre. L&apos;IA repère automatiquement le titre, les proportions, la liste des ingrédients et les étapes.
                  </Text>
                </View>

                <View style={styles.inputCard}>
                  <View style={styles.inputCardHeader}>
                    <View style={styles.inputCardHeaderLeft}>
                      <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      <Text style={styles.inputCardHeaderTitle}>Texte de la recette</Text>
                    </View>
                    {rawTextInput.length > 0 && (
                      <TouchableOpacity
                        style={styles.clearQuickBtn}
                        onPress={() => setRawTextInput('')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text style={styles.clearQuickBtnText}>Effacer</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.textInputArea}
                    multiline
                    numberOfLines={10}
                    placeholder="Collez ici le texte de votre recette...&#10;&#10;Exemple :&#10;Tarte aux pommes rustique&#10;Ingrédients : 4 pommes, 1 pâte brisée, 50g de beurre, 2 c. à soupe de cassonade...&#10;Préparation : Préchauffer le four à 180°C..."
                    placeholderTextColor={colors.textMuted}
                    value={rawTextInput}
                    onChangeText={setRawTextInput}
                    textAlignVertical="top"
                  />
                </View>

                {rawTextInput.trim().length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.primaryCtaBtn,
                      (isAnalyzingText || (connectionStatus && !connectionStatus.ok)) &&
                        styles.primaryCtaBtnDisabled,
                    ]}
                    onPress={handleAnalyzeText}
                    disabled={isAnalyzingText}
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
                        <Text style={styles.primaryCtaBtnText}>Analyser et extraire la recette</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {renderFallbackOptions()}
              </ScrollView>
            </View>

            {/* VUE 2 : SCANNER (PHOTO) */}
            <View
              style={[styles.pagerPage, { width: screenWidth }]}
              aria-hidden={mode !== "photo"}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                nestedScrollEnabled={true}
              >
                {renderAiConnectionBanner()}
                {/* ========================================================= */}
                {/* 2. ONGLET SCANNER / PHOTO */}
                {/* ========================================================= */}
                <View>
                  <View style={styles.guideCard}>
                  <View style={styles.guideHeader}>
                    <Ionicons name="camera-outline" size={16} color={colors.primary} />
                    <Text style={styles.guideTitle}>Capture photo (1 à 4 pages)</Text>
                  </View>
                  <Text style={styles.guideText}>
                    Photographiez un livre de cuisine, une fiche manuscrite ou une recette sur un écran. Vous pouvez combiner recto/verso ou ingrédients et étapes sur des pages distinctes.
                  </Text>
                </View>

                {photos.length === 0 ? (
                  <View style={styles.photoEmptyPickerBox}>
                    <View style={styles.pickerIconCircle}>
                      <Ionicons name="camera-reverse-outline" size={36} color={colors.primary} />
                    </View>
                    <Text style={styles.pickerBoxTitle}>Photographier une recette</Text>
                    <Text style={styles.pickerBoxSubtitle}>
                      Prenez une photo bien éclairée à plat, ou sélectionnez une image de votre galerie.
                    </Text>

                    <View style={styles.pickerBtnsRow}>
                      <TouchableOpacity
                        style={styles.pickerPrimaryBtn}
                        onPress={() => handlePickPhoto(true)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="camera" size={20} color="#FFFFFF" />
                        <Text style={styles.pickerPrimaryBtnText}>Prendre une photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pickerSecondaryBtn}
                        onPress={() => handlePickPhoto(false)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="images-outline" size={20} color={colors.primary} />
                        <Text style={styles.pickerSecondaryBtnText}>Galerie</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.photosGridContainer}>
                    <View style={styles.photosGridHeader}>
                      <Text style={styles.photosGridTitle}>
                        {photos.length} photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''} (max 4)
                      </Text>
                      <TouchableOpacity
                        style={styles.clearPhotosBtn}
                        onPress={() => setPhotos([])}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text style={styles.clearPhotosBtnText}>Tout supprimer</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.photosThumbnailsRow}>
                      {photos.map((item, idx) => (
                        <View key={item.id} style={styles.thumbnailWrapper}>
                          <Image
                            source={{ uri: item.uri }}
                            style={styles.thumbnailImg}
                            contentFit="cover"
                            transition={200}
                          />
                          <View style={styles.thumbnailPageBadge}>
                            <Text style={styles.thumbnailPageText}>Page {idx + 1}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.thumbnailRemoveBtn}
                            onPress={() => handleRemovePhoto(item.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    <View style={styles.addMoreBtnsRow}>
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
              {renderFallbackOptions()}
              </ScrollView>
            </View>

            {/* VUE 3 : WEB */}
            <View
              style={[styles.pagerPage, { width: screenWidth }]}
              aria-hidden={mode !== "url"}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                overScrollMode="never"
                nestedScrollEnabled={true}
              >
                {/* ========================================================= */}
                {/* 3. ONGLET WEB */}
                {/* ========================================================= */}
                <View>
                  <View style={styles.guideCard}>
                  <View style={styles.guideHeader}>
                    <Ionicons name="globe-outline" size={16} color={colors.primary} />
                    <Text style={styles.guideTitle}>Importation universelle de recette web</Text>
                  </View>
                  <Text style={styles.guideText}>
                    Collez l&apos;adresse web d&apos;une recette trouvée sur Internet. Papilles extrait automatiquement la photo haute résolution, les portions, les temps de cuisson, les ingrédients normalisés et les étapes.
                  </Text>
                </View>

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

                {urlErrorMessage && (
                  <View style={styles.urlErrorCard}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <Text style={styles.urlErrorText}>{urlErrorMessage}</Text>
                  </View>
                )}

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
              {renderFallbackOptions()}
            </ScrollView>
          </View>

          {/* VUE 4 : CHEF IA */}
          <View
            style={[styles.pagerPage, { width: screenWidth }]}
            aria-hidden={mode !== "chef"}
          >
            <View style={{ flex: 1 }}>
            {aiFlowStep === 'generating_recipe' ? (
              <View style={styles.aiLoadingContainer}>
                <View style={styles.aiLoadingCard}>
                  <View style={styles.aiSparkleIconBox}>
                    <Ionicons name="restaurant" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.aiLoadingTitle}>
                    {selectedIdea?.title || 'Création de votre recette'}
                  </Text>
                  <Text style={styles.aiLoadingStepText}>{AI_STEPS[aiStepIndex]}</Text>
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={styles.aiLoadingSpinner}
                  />
                  <Text style={styles.aiLoadingHint}>
                    Dosage précis des ingrédients pour {servings} personne{servings > 1 ? 's' : ''} et rédaction des étapes pas-à-pas
                  </Text>
                  <View
                    style={[
                      styles.aiModelBadge,
                      activeModelInfo.isFallback ? styles.aiModelBadgeFallback : styles.aiModelBadgeNormal,
                    ]}
                  >
                    <Ionicons
                      name={activeModelInfo.isFallback ? 'swap-horizontal' : 'hardware-chip-outline'}
                      size={13}
                      color={activeModelInfo.isFallback ? colors.amber : colors.primary}
                    />
                    <Text
                      style={[
                        styles.aiModelBadgeText,
                        { color: activeModelInfo.isFallback ? colors.amber : colors.primary },
                      ]}
                    >
                      {activeModelInfo.isFallback
                        ? `Repli de secours : ${formatAiModelName(activeModelInfo.model || 'Gemini Flash')}`
                        : `Modèle : ${formatAiModelName(activeModelInfo.model || 'Gemini Flash')}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelLoadingBtn}
                    onPress={() => cancelCurrentAiOperation('ideas')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.cancelLoadingBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : aiFlowStep === 'loading_ideas' ? (
              <View style={styles.aiLoadingContainer}>
                <View style={styles.aiLoadingCard}>
                  <View style={[styles.aiSparkleIconBox, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                  </View>
                  <Text style={styles.aiLoadingTitle}>Inspiration en cours...</Text>
                  <Text style={styles.aiLoadingStepText}>
                    Le Chef imagine 3 idées gourmandes de type &laquo; {mealType} &raquo;...
                  </Text>
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                    style={styles.aiLoadingSpinner}
                  />
                  <Text style={styles.aiLoadingHint}>
                    {doableRecipesForCurrentType.length > 0
                      ? `Anti-doublon : ${doableRecipesForCurrentType.length} ${mealType.toLowerCase()}${doableRecipesForCurrentType.length > 1 ? 's' : ''} faisable${doableRecipesForCurrentType.length > 1 ? 's' : ''} dans votre carnet ${doableRecipesForCurrentType.length > 1 ? (mealType === 'Entrée' || mealType === 'Boisson' ? 'seront évitées' : 'seront évités') : (mealType === 'Entrée' || mealType === 'Boisson' ? 'sera évitée' : 'sera évité')}`
                      : activeCount > 0
                        ? 'Génération originale adaptée à vos denrées en stock'
                        : 'Génération originale en inspiration libre (carte blanche)'}
                  </Text>
                  <View
                    style={[
                      styles.aiModelBadge,
                      activeModelInfo.isFallback ? styles.aiModelBadgeFallback : styles.aiModelBadgeNormal,
                    ]}
                  >
                    <Ionicons
                      name={activeModelInfo.isFallback ? 'swap-horizontal' : 'hardware-chip-outline'}
                      size={13}
                      color={activeModelInfo.isFallback ? colors.amber : colors.primary}
                    />
                    <Text
                      style={[
                        styles.aiModelBadgeText,
                        { color: activeModelInfo.isFallback ? colors.amber : colors.primary },
                      ]}
                    >
                      {activeModelInfo.isFallback
                        ? `Repli de secours : ${formatAiModelName(activeModelInfo.model || 'Gemini Flash')}`
                        : `Modèle : ${formatAiModelName(activeModelInfo.model || 'Gemini Flash')}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelLoadingBtn}
                    onPress={() => cancelCurrentAiOperation('config')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.cancelLoadingBtnText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : aiFlowStep === 'ideas' ? (
              <ScrollView
                style={styles.chefScroll}
                contentContainerStyle={styles.chefScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                <View style={styles.ideasHeader}>
                  <TouchableOpacity
                    style={styles.backToConfigBtn}
                    onPress={() => setAiFlowStep('config')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-back" size={16} color={colors.primary} />
                    <Text style={styles.backToConfigBtnText}>Modifier ingrédients & options</Text>
                  </TouchableOpacity>

                  <View style={styles.ideasTitleRow}>
                    <View style={[styles.cardIconBox, { backgroundColor: colors.secondary + '20' }]}>
                      <Ionicons name="sparkles" size={18} color={colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ideasTitle}>3 Inspirations du Chef IA</Text>
                      <Text style={styles.ideasSubtitle}>
                        Pour {servings} personne{servings > 1 ? 's' : ''} • {mealType}
                        {isVegetarian ? ' • 100% Végétarien' : ''}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ideasInstructionText}>
                    Choisissez la proposition qui vous donne le plus envie pour générer la recette complète :
                  </Text>
                </View>

                {/* Cartes interactives des 3 idées */}
                <View style={styles.ideasListContainer}>
                  {ideas.map((idea, index) => (
                    <TouchableOpacity
                      key={idea.id || index}
                      style={styles.ideaCard}
                      onPress={() => handleSelectIdea(idea)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.ideaCardTopRow}>
                        <View style={styles.ideaBadgesRow}>
                          <View style={styles.ideaTypeBadge}>
                            <Text style={styles.ideaTypeBadgeText}>{mealType}</Text>
                          </View>
                          {idea.isVegetarian ? (
                            <View
                              style={[
                                styles.ideaTypeBadge,
                                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                              ]}
                            >
                              <Text style={[styles.ideaTypeBadgeText, { color: colors.primary }]}>
                                🌿 Végétarien
                              </Text>
                            </View>
                          ) : null}
                          {idea.estimatedTime ? (
                            <View style={styles.ideaTimeBadge}>
                              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                              <Text style={styles.ideaTimeBadgeText}>{idea.estimatedTime}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.ideaActionArrowCircle}>
                          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                        </View>
                      </View>

                      <Text style={styles.ideaCardTitle}>{idea.title}</Text>
                      <Text style={styles.ideaCardDesc}>{idea.description}</Text>

                      {idea.highlightIngredients && idea.highlightIngredients.length > 0 && (
                        <View style={styles.ideaHighlightsWrap}>
                          {idea.highlightIngredients.map((h, i) => (
                            <View key={i} style={styles.ideaHighlightChip}>
                              <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                              <Text style={styles.ideaHighlightChipText}>{h}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.ideaCardFooter}>
                        <Text style={styles.ideaCookBtnText}>Cuisiner cette recette</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Actions en bas des idées */}
                <View style={styles.ideasBottomActions}>
                  <TouchableOpacity
                    style={styles.refreshIdeasBtn}
                    onPress={handleRegenerateIdeas}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.refreshIdeasBtnText}>Proposer 3 autres idées 🔄</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changeConfigBtn}
                    onPress={() => setAiFlowStep('config')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="options-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.changeConfigBtnText}>Modifier mes critères & prompt</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                <ScrollView
                  style={styles.chefScroll}
                  contentContainerStyle={styles.chefScrollContent}
                  showsVerticalScrollIndicator={false}
                  overScrollMode="never"
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  onScrollBeginDrag={() => {
                    if (isMealTypeDropdownOpen) {
                      setIsMealTypeDropdownOpen(false);
                    }
                  }}
                >
                  {/* Guide Chef IA */}
                  <View style={styles.guideCard}>
                    <View style={styles.guideHeader}>
                      <Ionicons name="sparkles" size={16} color={colors.secondary} />
                      <Text style={styles.guideTitle}>Inspirations du Chef IA</Text>
                    </View>
                    <Text style={styles.guideText}>
                      Trouvez des idées de recettes sur-mesure à partir de vos ingrédients en stock pour ne rien gaspiller et cuisiner avec plaisir au quotidien.
                    </Text>
                  </View>

                  {/* 1. CARTE 1 : FORMAT DU REPAS */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
                      <Text style={styles.sectionCardTitle}>1. FORMAT DU REPAS</Text>
                    </View>
                    <View style={styles.formatRow}>
                      <TouchableOpacity
                        style={[
                          styles.mealTypeDropdownTrigger,
                          isMealTypeDropdownOpen && styles.mealTypeDropdownTriggerActive,
                        ]}
                        onPress={() => setIsMealTypeDropdownOpen((prev) => !prev)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Format du repas : ${currentMealTypeObj.label}. Toucher pour changer.`}
                      >
                        <View style={styles.mealTypeDropdownTriggerContent}>
                          <Ionicons
                            name={currentMealTypeObj.iconName as any}
                            size={15}
                            color={colors.primary}
                          />
                          <Text
                            style={styles.mealTypeDropdownTriggerText}
                            numberOfLines={1}
                          >
                            {currentMealTypeObj.label}
                          </Text>
                        </View>
                        <Ionicons
                          name={isMealTypeDropdownOpen ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={isMealTypeDropdownOpen ? colors.primary : colors.textSecondary}
                        />
                      </TouchableOpacity>

                      <View style={styles.servingsCompactContainer}>
                        <TouchableOpacity
                          style={[
                            styles.stepperBtnCompact,
                            servings <= 1 && styles.stepperBtnDisabled,
                          ]}
                          onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                          disabled={servings <= 1}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel="Diminuer les portions"
                        >
                          <Ionicons name="remove" size={13} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.servingsLabelBox}>
                          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
                          <Text style={styles.servingsValueText}>{servings}</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.stepperBtnCompact,
                            servings >= 20 && styles.stepperBtnDisabled,
                          ]}
                          onPress={() => setServings((prev) => Math.min(20, prev + 1))}
                          disabled={servings >= 20}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel="Augmenter les portions"
                        >
                          <Ionicons name="add" size={13} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.veggieCompactChip,
                          isVegetarian && styles.veggieCompactChipActive,
                        ]}
                        onPress={() => setIsVegetarian((prev) => !prev)}
                        activeOpacity={0.7}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isVegetarian }}
                        accessibilityLabel="Option 100% végétarien"
                      >
                        <Text
                          style={[
                            styles.veggieCompactText,
                            isVegetarian && styles.veggieCompactTextActive,
                          ]}
                        >
                          🌿 Végé
                        </Text>
                        <Ionicons
                          name={isVegetarian ? 'checkbox' : 'square-outline'}
                          size={15}
                          color={isVegetarian ? colors.primary : colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>

                    {isMealTypeDropdownOpen && (
                      <View style={styles.mealTypeDropdownMenu}>
                        {MEAL_TYPES.map((t, index) => {
                          const isSelected = mealType === t.id;
                          const isLast = index === MEAL_TYPES.length - 1;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.mealTypeDropdownItem,
                                isSelected && styles.mealTypeDropdownItemActive,
                                isLast && styles.mealTypeDropdownItemLast,
                              ]}
                              onPress={() => {
                                setMealType(t.id);
                                setIsMealTypeDropdownOpen(false);
                                setRejectedIdeaTitles([]);
                              }}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={`Choisir le format ${t.label}`}
                            >
                              <View style={styles.mealTypeDropdownItemLeft}>
                                <View
                                  style={[
                                    styles.mealTypeDropdownIconBox,
                                    isSelected && styles.mealTypeDropdownIconBoxActive,
                                  ]}
                                >
                                  <Ionicons
                                    name={t.iconName as any}
                                    size={15}
                                    color={isSelected ? '#FFFFFF' : colors.primary}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.mealTypeDropdownItemText,
                                    isSelected && styles.mealTypeDropdownItemTextActive,
                                  ]}
                                >
                                  {t.label}
                                </Text>
                              </View>
                              {isSelected && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={colors.primary}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* 2. CARTE 2 : STYLE & ENVIES DU MOMENT */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                      <Text style={styles.sectionCardTitle}>2. STYLE & ENVIES DU MOMENT</Text>
                    </View>

                    <View style={styles.moodSection}>
                      <Text style={styles.subSectionTitle}>Humeur du Chef</Text>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.moodSelectorRow}
                      >
                        {availableMoods.map((m) => {
                          const isSelected = chefMood === m.id;
                          return (
                            <TouchableOpacity
                              key={m.id}
                              style={[
                                styles.moodChip,
                                isSelected && styles.moodChipSelected,
                              ]}
                              onPress={() => setChefMood(m.id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={(m.icon || 'sparkles-outline') as any}
                                size={13}
                                color={isSelected ? '#FFFFFF' : colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.moodChipText,
                                  isSelected && styles.moodChipTextSelected,
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {m.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.promptInputSection}>
                      <View style={styles.preferencesHeaderRow}>
                        <Text style={styles.subSectionTitle}>Instructions libres</Text>
                        <TouchableOpacity
                          style={styles.favoritePromptBtn}
                          onPress={() => setIsFavoritePromptsModalVisible(true)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="bookmark-outline" size={12} color={colors.primary} />
                          <Text style={styles.favoritePromptBtnText}>Favoris</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.promptInputWrapper}>
                        <Ionicons
                          name="sparkles"
                          size={14}
                          color={colors.primary}
                          style={styles.promptSparkleIcon}
                        />
                        <TextInput
                          style={styles.aiPreferencesInput}
                          placeholder="Ex : sans four, bien épicé, crémeux..."
                          placeholderTextColor={colors.textMuted}
                          value={additionalPreferences}
                          onChangeText={setAdditionalPreferences}
                          maxLength={150}
                        />
                        {additionalPreferences.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setAdditionalPreferences('')}
                            style={styles.clearPromptBtn}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Effacer les instructions"
                          >
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* 3. CARTE 3 : INGRÉDIENTS */}
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionCardHeader}>
                      <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
                      <Text style={styles.sectionCardTitle}>3. INGRÉDIENTS</Text>
                    </View>

                    <View style={styles.inputComposerWrapper}>
                      <UnifiedIngredientInput
                        value={ingredientSearchText}
                        onChangeText={setIngredientSearchText}
                        onSelectIngredient={(item) => {
                          handleAddIngredient(item.canonicalName);
                        }}
                        onSubmitEditing={() => {
                          if (ingredientSearchText.trim()) {
                            handleAddIngredient(ingredientSearchText);
                          }
                        }}
                        placeholder="Ajouter un ingrédient manquant ou en stock..."
                        placeholderTextColor={colors.textMuted}
                        context="stock"
                        clearOnSelect
                      />
                    </View>

                    <View style={styles.activeGuide}>
                      <Text style={styles.subSectionTitle}>
                        Retenus pour la recette ({activeCount})
                      </Text>
                      <View style={styles.activeGuideActions}>
                        {activeCount > 0 && (
                          <TouchableOpacity
                            style={styles.smallActionBtn}
                            onPress={handleExcludeAll}
                            activeOpacity={0.7}
                            accessibilityLabel="Écarter tous les ingrédients retenus"
                          >
                            <Text style={styles.smallActionBtnText}>Tout écarter</Text>
                          </TouchableOpacity>
                        )}
                        {inactiveIngredients.length > 0 && (
                          <TouchableOpacity
                            style={styles.smallActionBtn}
                            onPress={handleIncludeAll}
                            activeOpacity={0.7}
                            accessibilityLabel="Réintégrer tous les ingrédients mis de côté"
                          >
                            <Text style={styles.smallActionBtnText}>Tout inclure</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {activeCount === 0 && (
                      <View style={styles.emptyActiveHintBox}>
                        <Ionicons name="sparkles-outline" size={15} color={colors.secondary} />
                        <Text style={styles.emptyActiveHintText}>
                          Aucun ingrédient imposé — le Chef IA composera ses recettes en carte blanche totale.
                        </Text>
                      </View>
                    )}

                    {groupedActiveIngredients.map(({ aisle, items }) => {
                      const aisleConfig = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
                      return (
                        <View key={aisle} style={styles.groupedAisleBox}>
                          <View style={styles.aisleHeaderRow}>
                            <View
                              style={[
                                styles.aisleIconBox,
                                {
                                  backgroundColor: isDark
                                    ? aisleConfig.color + '26'
                                    : aisleConfig.bgColor,
                                },
                              ]}
                            >
                              <Ionicons
                                name={aisleConfig.iconName as any}
                                size={12}
                                color={aisleConfig.color}
                              />
                            </View>
                            <Text style={[styles.aisleTitle, { color: aisleConfig.color }]}>
                              {aisle}
                            </Text>
                            <View style={styles.aisleCountBadge}>
                              <Text style={styles.aisleCountText}>{items.length}</Text>
                            </View>
                          </View>
                          <View style={styles.chipsWrap}>
                            {items.map(({ name, isPrimary }) => (
                              <View
                                key={name}
                                style={[
                                  styles.stockChip,
                                  isPrimary ? styles.stockChipPrimary : styles.stockChipOptional,
                                ]}
                              >
                                <TouchableOpacity
                                  style={styles.stockChipBody}
                                  onPress={() => handleCycleIngredient(name)}
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${name}, ${isPrimary ? 'indispensable' : 'optionnel'}. Toucher pour changer.`}
                                >
                                  {isPrimary && (
                                    <View style={styles.primaryDotIndicator} />
                                  )}
                                  <Text
                                    style={[
                                      styles.stockChipText,
                                      isPrimary
                                        ? styles.stockChipTextPrimary
                                        : styles.stockChipTextOptional,
                                    ]}
                                  >
                                    {name}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.stockChipCloseBtn}
                                  onPress={() => handleExcludeIngredient(name)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  accessibilityLabel={`Exclure ${name}`}
                                >
                                  <Ionicons
                                    name="close"
                                    size={13}
                                    color={isPrimary ? '#FFFFFF' : colors.textMuted}
                                  />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}

                    {inactiveIngredients.length > 0 && (
                      <View style={styles.inactiveSection}>
                        <View style={styles.inactiveHeader}>
                          <Text style={styles.subSectionTitle}>
                            Mis de côté ({inactiveIngredients.length})
                          </Text>
                          <TouchableOpacity
                            style={styles.smallActionBtn}
                            onPress={handleExcludeAll}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.smallActionBtnText}>Tout exclure</Text>
                          </TouchableOpacity>
                        </View>
                        {groupedInactiveIngredients.map(({ aisle, items }) => {
                          const aisleConfig = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
                          return (
                            <View key={`inactive_${aisle}`} style={styles.groupedAisleBox}>
                              <View style={styles.aisleHeaderRow}>
                                <View
                                  style={[
                                    styles.aisleIconBox,
                                    {
                                      backgroundColor: isDark
                                        ? aisleConfig.color + '26'
                                        : aisleConfig.bgColor,
                                    },
                                  ]}
                                >
                                  <Ionicons
                                    name={aisleConfig.iconName as any}
                                    size={12}
                                    color={aisleConfig.color}
                                  />
                                </View>
                                <Text style={[styles.aisleTitle, { color: aisleConfig.color }]}>
                                  {aisle}
                                </Text>
                                <View style={styles.aisleCountBadge}>
                                  <Text style={styles.aisleCountText}>{items.length}</Text>
                                </View>
                              </View>
                              <View style={styles.chipsWrap}>
                                {items.map((name) => (
                                  <TouchableOpacity
                                    key={`inactive_${name}`}
                                    style={[styles.stockChip, styles.stockChipInactive]}
                                    onPress={() => handleIncludeIngredient(name)}
                                    activeOpacity={0.7}
                                    accessibilityLabel={`Réintégrer ${name}`}
                                  >
                                    <Ionicons name="add" size={13} color={colors.textSecondary} />
                                    <Text style={[styles.stockChipText, styles.stockChipTextInactive]}>
                                      {name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.stickyFooterContainer}>
                  <TouchableOpacity
                    style={styles.generateAiBtn}
                    onPress={handleStartFetchIdeas}
                    activeOpacity={0.8}
                    accessibilityLabel={
                      activeCount > 0
                        ? `Trouver 3 idées ${formatMealTypeGenitive(mealType)} avec ${activeCount} ingrédient${activeCount > 1 ? 's' : ''}`
                        : `Trouver 3 idées ${formatMealTypeGenitive(mealType)} en carte blanche`
                    }
                  >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.generateAiBtnText}>
                      {activeCount > 0
                        ? `💡 Trouver 3 idées ${formatMealTypeGenitive(mealType)} (${activeCount} ingrédient${activeCount > 1 ? 's' : ''})`
                        : `💡 Trouver 3 idées ${formatMealTypeGenitive(mealType)} (carte blanche)`}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
            </View>
          </Animated.ScrollView>
        </View>

        {/* Modal Clé API */}
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
                Pour inventer des recettes avec vos restes et analyser vos fiches, l&apos;application utilise l&apos;intelligence artificielle Google Gemini (modèle BYOK).
              </Text>

              <TouchableOpacity
                style={styles.apiKeyStudioBtn}
                onPress={() =>
                  Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => {
                    Alert.alert(
                      'Navigateur indisponible',
                      'Impossible d’ouvrir automatiquement la page Google AI Studio.'
                    );
                  })
                }
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={15} color={colors.primary} />
                <Text style={styles.apiKeyStudioBtnText}>
                  Obtenir ma clé gratuite (Google AI Studio)
                </Text>
              </TouchableOpacity>

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

        {/* Modal Caméra in-app pour scan documentaire IA */}
        <CameraCaptureModal
          visible={isCameraModalVisible}
          onClose={() => setIsCameraModalVisible(false)}
          mode="scan"
          maxPhotos={4}
          title="Scan de recette"
          onPhotosCaptured={handleCameraPhotosCaptured}
        />

        {/* Modale des prompts favoris Chef IA */}
        <ChefFavoritePromptsModal
          visible={isFavoritePromptsModalVisible}
          currentPromptText={additionalPreferences}
          onSelectPrompt={(text) => setAdditionalPreferences(text)}
          onClose={() => setIsFavoritePromptsModalVisible(false)}
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
    position: "relative",
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentPill: {
    position: "absolute",
    backgroundColor: colors.primary,
    borderRadius: 10,
    ...shadows.small,
  },
  segmentBtn: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  segmentBtnOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pagerScrollView: {
    flex: 1,
  },
  pagerTrack: {
    flexDirection: "row",
    flexGrow: 1,
  },
  pagerPage: {
    flexGrow: 0,
    flexShrink: 0,
    height: "100%",
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
    color: colors.danger,
    lineHeight: 17,
    marginTop: 2,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  errorFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  errorFixBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorRetryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  guideCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  guideText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.card,
  },
  inputCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inputCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputCardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clearQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
  },
  clearQuickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  textInputArea: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  primaryCtaBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.small,
  },
  primaryCtaBtnDisabled: {
    opacity: 0.5,
  },
  primaryCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoEmptyPickerBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.card,
  },
  pickerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pickerBoxTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  pickerBoxSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  pickerBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  pickerPrimaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    ...shadows.small,
  },
  pickerPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  pickerSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerSecondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13.5,
  },
  photosGridContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  photosGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  photosGridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clearPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
  },
  clearPhotosBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  photosThumbnailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  thumbnailWrapper: {
    width: '47.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  thumbnailPageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  thumbnailPageText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  thumbnailRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addMoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  urlInputIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.textPrimary,
  },
  platformsBox: {
    marginTop: 4,
  },
  platformsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  platformsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  platformChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urlErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  urlErrorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    lineHeight: 16,
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  manualFallbackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  qrFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  qrFallbackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 16,
  },
  apiKeyStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    marginBottom: 14,
  },
  apiKeyStudioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  keyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  keyInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    color: colors.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // =========================================================
  // STYLES CHEF IA
  // =========================================================
  chefScroll: {
    flex: 1,
  },
  chefScrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeDropdownTrigger: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeDropdownTriggerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  mealTypeDropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mealTypeDropdownTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mealTypeDropdownMenu: {
    marginTop: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.small,
  },
  mealTypeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  mealTypeDropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  mealTypeDropdownItemLast: {
    borderBottomWidth: 0,
  },
  mealTypeDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealTypeDropdownIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeDropdownIconBoxActive: {
    backgroundColor: colors.primary,
  },
  mealTypeDropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealTypeDropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  servingsCompactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  stepperBtnCompact: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  servingsLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  servingsValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  veggieCompactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  veggieCompactChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  veggieCompactText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  veggieCompactTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  moodSection: {
    marginBottom: 14,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  moodSelectorRow: {
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  moodChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  promptInputSection: {},
  preferencesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  favoritePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  favoritePromptBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  promptInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptSparkleIcon: {
    marginRight: 6,
  },
  aiPreferencesInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearPromptBtn: {
    padding: 4,
  },
  inputComposerWrapper: {
    marginBottom: 14,
  },
  activeGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeGuideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyActiveHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  emptyActiveHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  smallActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  groupedAisleBox: {
    marginBottom: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aisleIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisleTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  aisleCountBadge: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  aisleCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stockChipPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stockChipOptional: {
    backgroundColor: colors.cardBackground,
    borderColor: colors.border,
  },
  stockChipInactive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    opacity: 0.7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockChipBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 9,
    paddingRight: 4,
    gap: 5,
  },
  primaryDotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  stockChipCloseBtn: {
    paddingVertical: 6,
    paddingRight: 8,
    paddingLeft: 4,
  },
  stockChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockChipTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stockChipTextOptional: {
    color: colors.textPrimary,
  },
  stockChipTextInactive: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  inactiveSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stickyFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  generateAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    ...shadows.small,
  },
  generateAiBtnDisabled: {
    opacity: 0.45,
  },
  generateAiBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aiLoadingCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  aiSparkleIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...shadows.small,
  },
  aiLoadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  aiLoadingStepText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  aiLoadingSpinner: {
    marginVertical: 12,
  },
  aiLoadingHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  aiModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 16,
  },
  aiModelBadgeNormal: {
    backgroundColor: colors.primaryLight,
  },
  aiModelBadgeFallback: {
    backgroundColor: colors.dangerLight,
  },
  aiModelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cancelLoadingBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  cancelLoadingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  ideasHeader: {
    marginBottom: 16,
  },
  backToConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backToConfigBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  ideasTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideasTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ideasSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ideasInstructionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  ideasListContainer: {
    gap: 14,
    marginBottom: 20,
  },
  ideaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  ideaCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ideaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ideaTypeBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ideaTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  ideaTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ideaTimeBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  ideaActionArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  ideaCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  ideaHighlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  ideaHighlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ideaHighlightChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  ideaCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 10,
  },
  ideaCookBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  ideasBottomActions: {
    gap: 10,
    marginBottom: 24,
  },
  refreshIdeasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  refreshIdeasBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  changeConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  changeConfigBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
}));
