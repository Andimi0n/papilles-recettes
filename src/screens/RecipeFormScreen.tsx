import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Recipe, Category, Difficulty, Ingredient, RecipeStep } from '../types/recipe';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { StarRating } from '../components/StarRating';
import { generateUniqueId, normalizeString } from '../utils/helpers';
import { normalizeIngredient } from '../utils/ingredientNormalizer';
import { CanonicalIngredient } from '../types/vocabulary';
import { UnifiedIngredientInput } from '../components/UnifiedIngredientInput';
import { QualifyIngredientModal } from '../components/QualifyIngredientModal';
import { UnitQuickPicker } from '../components/UnitQuickPicker';
import { UnitPickerModal } from '../components/UnitPickerModal';
import { formatQuantityWithUnit } from '../constants/units';
import { UnifiedIngredientService } from '../services/unifiedIngredientService';
import { VocabularyService } from '../services/vocabularyService';
import { isKnownDefaultPantryStaple } from '../data/canonicalVocabulary';
import { RecipeLinkPickerModal } from '../components/RecipeLinkPickerModal';
import { findAutoMatchCandidate } from '../utils/recipeLinkMatcher';
import {
  RecipeAiService,
  ExtractedRecipeData,
  AiConnectionStatus,
} from '../services/recipeAiService';

interface RecipeFormScreenProps {
  initialRecipe?: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
  availableRecipes?: Recipe[];
}

const SAMPLE_RECIPES = [
  `Risotto crémeux aux champignons & parmesan
Pour 4 personnes
- 300g de riz arborio
- 250g de champignons de Paris
- 1 échalote
- 1 gousse d'ail
- 15cl de vin blanc sec
- 1 litre de bouillon de légumes chaud
- 50g de parmesan râpé
- 30g de beurre doux
- 2 c. à soupe d'huile d'olive
- Sel, poivre du moulin, persil plat ciselé

Préparation :
Émincer l'échalote et l'ail. Couper les champignons en lamelles.
Dans une sauteuse, faire dorer les champignons dans un filet d'huile d'olive 5 min puis réserver.
Faire suer l'échalote avec le reste d'huile, ajouter le riz et le nacrer 2 minutes.
Déglacer au vin blanc et laisser évaporer complètement.
Verser le bouillon chaud louche après louche en remuant constamment pendant 18 à 20 minutes.
Hors du feu, incorporer les champignons, le beurre bien froid et le parmesan.
Couvrir 2 minutes, rectifier l'assaisonnement et servir immédiatement avec du persil frais.`,
  `Quiche fondante poireaux & fromage de chèvre
Ingrédients :
1 pâte brisée pur beurre
3 blancs de poireaux
150g de fromage de chèvre frais (ou bûche)
3 gros oeufs
20cl de crème fraîche épaisse
10cl de lait
Noix de muscade râpée, sel fin et poivre du moulin
Un filet d'huile d'olive

Instructions :
Préchauffer le four à 180°C (th. 6).
Laver et émincer finement les poireaux. Les faire fondre à feu doux dans une poêle avec un filet d'huile d'olive pendant 15 minutes jusqu'à ce qu'ils soient tendres.
Dans un saladier, fouetter les oeufs entiers avec la crème fraîche et le lait. Assaisonner avec le sel, le poivre et une pincée de muscade.
Étaler la pâte brisée dans un moule à tarte, piquer le fond avec une fourchette.
Répartir la fondue de poireaux, émietter le chèvre par-dessus, puis verser l'appareil aux oeufs.
Enfourner pour environ 35 à 40 minutes jusqu'à ce que la quiche soit bien dorée et gonflée. Laisser tiédir avant de servir.`,
];

const CATEGORIES: Category[] = [
  'Plat',
  'Entrée',
  'Dessert',
  'Apéritif',
  'Petit-déjeuner',
  'Boisson',
];

const DIFFICULTIES: Difficulty[] = ['Facile', 'Moyen', 'Difficile'];

const PRESET_IMAGES = [
  { label: 'Pâtes', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80' },
  { label: 'Gourmand', url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Salade/Avocat', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
  { label: 'Curry/Épices', url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Chocolat', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Tarte/Gâteau', url: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=800&q=80' },
];

export const RecipeFormScreen: React.FC<RecipeFormScreenProps> = ({
  initialRecipe,
  onSave,
  onCancel,
  availableRecipes = [],
}) => {
  const { isDark, colors } = useTheme();
  const isEditing = Boolean(
    initialRecipe && initialRecipe.id && !initialRecipe.id.startsWith('extracted_')
  );
  const hasPreloadedData = Boolean(
    initialRecipe &&
      (initialRecipe.title || (initialRecipe.ingredients && initialRecipe.ingredients.length > 0))
  );
  const [creationMode, setCreationMode] = useState<'text' | 'manual'>(
    hasPreloadedData ? 'manual' : 'text'
  );

  const [rawTextInput, setRawTextInput] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Analyse du texte...');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<AiConnectionStatus | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    RecipeAiService.getApiKey().then((k) => setApiKey(k || ''));
    setIsCheckingConnection(true);
    RecipeAiService.checkConnection().then((st) => {
      setConnectionStatus(st);
      setIsCheckingConnection(false);
    });
  }, []);

  const verifyAiStatus = async (keyToTest?: string) => {
    setIsCheckingConnection(true);
    try {
      const status = await RecipeAiService.checkConnection(keyToTest);
      setConnectionStatus(status);
    } catch (e: any) {
      setConnectionStatus({
        ok: false,
        code: 'UNKNOWN_ERROR',
        message: e?.message || 'Erreur lors du test de connexion',
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    try {
      await RecipeAiService.setApiKey(tempApiKeyInput.trim());
      setApiKey(tempApiKeyInput.trim());
      setIsApiKeyModalVisible(false);
      await verifyAiStatus(tempApiKeyInput.trim());
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la clé API.');
    }
  };

  const handleFillSample = () => {
    const sample = SAMPLE_RECIPES[Math.floor(Math.random() * SAMPLE_RECIPES.length)];
    setRawTextInput(sample);
  };

  const handleAnalyzeText = async () => {
    const trimmed = rawTextInput.trim();
    if (!trimmed) {
      Alert.alert(
        'Texte requis',
        'Veuillez coller ou saisir le texte de votre recette avant de lancer l\'analyse.'
      );
      return;
    }

    if (connectionStatus && !connectionStatus.ok) {
      Alert.alert(
        'IA indisponible',
        `${connectionStatus.message}\n\nVeuillez vérifier votre connexion ou votre clé API.`
      );
      return;
    }

    setIsAnalyzingText(true);
    setLoadingStep('Lecture et compréhension de votre texte...');

    try {
      setTimeout(() => setLoadingStep('Découpage et normalisation des ingrédients...'), 1200);
      setTimeout(() => setLoadingStep('Autocomplétion des temps et portions...'), 2400);

      const extracted: ExtractedRecipeData = await RecipeAiService.extractRecipeFromRawText(
        trimmed,
        apiKey
      );

      if (extracted.title) setTitle(extracted.title);
      if (extracted.description) setDescription(extracted.description);
      if (extracted.category) setCategory(extracted.category as Category);
      if (extracted.difficulty) setDifficulty(extracted.difficulty as Difficulty);
      if (extracted.prepTimeMinutes) setPrepTime(extracted.prepTimeMinutes.toString());
      if (extracted.cookTimeMinutes) setCookTime(extracted.cookTimeMinutes.toString());
      if (extracted.servings) setServings(extracted.servings);
      if (extracted.isVegetarian !== undefined) setIsVegetarian(extracted.isVegetarian);
      if (extracted.userNote) setUserNote(extracted.userNote.trim());
      if (extracted.tags && Array.isArray(extracted.tags)) setTags(extracted.tags);
      if (extracted.ingredients && extracted.ingredients.length > 0) {
        setIngredients(
          extracted.ingredients.map((ing, idx) => {
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
          })
        );
      }
      if (extracted.steps && extracted.steps.length > 0) {
        setSteps(
          extracted.steps.map((st, idx) => ({
            id: generateUniqueId(`stp_text_${idx + 1}`),
            order: st.order || idx + 1,
            instruction: st.instruction,
          }))
        );
      }
      // Basculer directement en mode formulaire manuel pour révision et enregistrement !
      setCreationMode('manual');
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

  // Form states
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [category, setCategory] = useState<Category>(initialRecipe?.category || 'Plat');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRecipe?.difficulty || 'Facile');
  const [prepTime, setPrepTime] = useState(initialRecipe?.prepTimeMinutes?.toString() || '15');
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTimeMinutes?.toString() || '20');
  const [servings, setServings] = useState(initialRecipe?.servings || 4);
  const [rating, setRating] = useState(
    initialRecipe?.rating !== undefined ? initialRecipe.rating : 4
  );
  const [isVegetarian, setIsVegetarian] = useState(initialRecipe?.isVegetarian ?? false);
  const [userNote, setUserNote] = useState(initialRecipe?.userNote || '');
  const [imageUrl, setImageUrl] = useState(
    initialRecipe?.imageUrl ||
      'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=80'
  );
  const [availableImages, setAvailableImages] = useState<string[]>(
    initialRecipe?.availableImages && initialRecipe.availableImages.length > 0
      ? initialRecipe.availableImages
      : initialRecipe?.imageUrl && !initialRecipe.imageUrl.includes('unsplash.com')
      ? [initialRecipe.imageUrl]
      : []
  );

  // Tags state
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);
  const [tagInputText, setTagInputText] = useState('');

  const existingTags: string[] = useMemo(() => {
    const set = new Set<string>();
    (availableRecipes || []).forEach((r) => {
      (r.tags || []).forEach((t) => {
        const trimmed = typeof t === 'string' ? t.trim() : '';
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [availableRecipes]);

  const POPULAR_TAG_SUGGESTIONS = [
    'Rapide',
    'Sans gluten',
    'Sans lactose',
    'Apéro',
    'Batch cooking',
    'Enfant',
    'Épicé',
    'Comfort food',
    'Économique',
    'Festif',
  ];

  const suggestedTags: string[] = useMemo(() => {
    const allAvailable = new Set<string>();
    existingTags.forEach((t: string) => allAvailable.add(t));
    POPULAR_TAG_SUGGESTIONS.forEach((t) => allAvailable.add(t));
    return Array.from(allAvailable).filter(
      (cand) => !tags.some((t) => t.toLowerCase() === cand.toLowerCase())
    );
  }, [existingTags, tags]);

  const handleAddTag = (newTag: string) => {
    const trimmed = newTag.trim().replace(/^#+/, '');
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!tags.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      setTags((prev) => [...prev, formatted]);
    }
    setTagInputText('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients || [
      { id: 'ing_1', name: '', quantity: '', unit: '' },
    ]
  );
  // Focus actif pour élévation prioritaire du dongle de suggestions
  const [activeIngIndex, setActiveIngIndex] = useState<number | null>(null);

  // État de qualification obligatoire d'ingrédient non répertorié (Section 8)
  const [isQualifyModalVisible, setIsQualifyModalVisible] = useState(false);
  const [pendingQualifyIndex, setPendingQualifyIndex] = useState<number | null>(null);
  const [pendingUnrecognizedName, setPendingUnrecognizedName] = useState('');
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number } | undefined>();
  const [isUnitModalVisible, setIsUnitModalVisible] = useState(false);
  const [unitModalTargetIndex, setUnitModalTargetIndex] = useState<number | null>(null);

  // État de liaison de recette (sous-recettes / préparations maison)
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [linkModalTargetIndex, setLinkModalTargetIndex] = useState<number | null>(null);

  const handleOpenLinkModal = (index: number) => {
    setLinkModalTargetIndex(index);
    setIsLinkModalVisible(true);
  };

  const handleSelectLinkedRecipe = (linkedRecipeId?: string) => {
    if (linkModalTargetIndex !== null) {
      handleUpdateIngredient(linkModalTargetIndex, 'linkedRecipeId', linkedRecipeId);
    }
  };

  const isSubmittingRef = useRef(false);
  const queueTotalRef = useRef(0);
  const queueProcessedRef = useRef(0);
  const ingredientsRef = useRef(ingredients);

  useEffect(() => {
    ingredientsRef.current = ingredients;
  }, [ingredients]);

  // Steps state
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialRecipe?.steps || [
      { id: 'stp_1', order: 1, instruction: '' },
    ]
  );

  // Image picker
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la galerie pour choisir une photo.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Erreur sélection image:', e);
    }
  };

  // Ingredients handlers
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: generateUniqueId('ing'), name: '', quantity: '', unit: '' },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    // RÈGLE ANTI-DÉSYNCHRONISATION (Spécification 3.3) :
    // Toute modification du champ 'name' réévalue synchrone via normalizeIngredient(value)
    // et ne conserve JAMAIS un ancien canonicalId obsolète !
    if (field === 'name') {
      const textVal = typeof value === 'string' ? value.trim() : '';
      if (!textVal) {
        updated[index].canonicalId = undefined;
      } else {
        const res = normalizeIngredient({ name: textVal });
        updated[index].canonicalId = res.canonicalId;
        if (res.isPantryStaple !== undefined && updated[index].isPantryStaple === undefined) {
          updated[index].isPantryStaple = res.isPantryStaple;
        }
      }
    }

    setIngredients(updated);
  };

  const handleSelectCanonicalIngredient = (
    index: number,
    item: CanonicalIngredient,
    details?: { quantity?: string; unit?: string }
  ) => {
    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      name: updated[index].name.trim() || item.canonicalName,
      canonicalId: item.id,
      isPantryStaple: item.isPantryStaple ?? updated[index].isPantryStaple,
    };
    if (details?.quantity && !updated[index].quantity) {
      updated[index].quantity = details.quantity;
    }
    if (details?.unit && !updated[index].unit) {
      updated[index].unit = details.unit;
    }
    setIngredients(updated);
    setActiveIngIndex(null);
  };

  const handleCancelQualify = () => {
    isSubmittingRef.current = false;
    queueTotalRef.current = 0;
    queueProcessedRef.current = 0;
    setQueueProgress(undefined);
    setIsQualifyModalVisible(false);
    setPendingQualifyIndex(null);
    setPendingUnrecognizedName('');
  };

  const handleQualifyIngredientSuccess = (
    canonical: CanonicalIngredient,
    meta?: { wasAddedAsAlias?: boolean }
  ) => {
    const updated = [...ingredientsRef.current];
    if (pendingQualifyIndex !== null && pendingQualifyIndex >= 0 && pendingQualifyIndex < updated.length) {
      const current = updated[pendingQualifyIndex];
      // Si ce n'est pas un synonyme valide enregistré (ex: terme générique/interdit comme "huile"),
      // on remplace directement le nom de l'ingrédient par le nom canonique choisi.
      const shouldReplaceName = meta?.wasAddedAsAlias === false || !current.name.trim();
      updated[pendingQualifyIndex] = {
        ...current,
        name: shouldReplaceName ? canonical.canonicalName : current.name.trim(),
        canonicalId: canonical.id,
        isPantryStaple: canonical.isPantryStaple ?? current.isPantryStaple,
      };
      setIngredients(updated);
      ingredientsRef.current = updated;
    }

    // N'enchaîner vers la suite que si la qualification a été déclenchée par une tentative de sauvegarde globale
    if (!isSubmittingRef.current) {
      setIsQualifyModalVisible(false);
      setPendingQualifyIndex(null);
      setPendingUnrecognizedName('');
      setQueueProgress(undefined);
      return;
    }

    queueProcessedRef.current += 1;

    const syncList = VocabularyService.getSyncList();
    const nextUnrecIdx = updated.findIndex((ing) => {
      const trimmed = ing.name.trim();
      if (!trimmed) return false;
      if (ing.canonicalId && syncList.some((c) => c.id === ing.canonicalId)) return false;
      const res = UnifiedIngredientService.resolveRecognizedIngredient(trimmed);
      return !res.isRecognized;
    });

    if (nextUnrecIdx >= 0) {
      // Ingrédient suivant trouvé : basculer immédiatement la modale sur cet ingrédient
      const currentStep = queueProcessedRef.current + 1;
      const totalSteps = Math.max(currentStep, queueTotalRef.current);
      setPendingQualifyIndex(nextUnrecIdx);
      setPendingUnrecognizedName(updated[nextUnrecIdx].name.trim());
      setQueueProgress({ current: currentStep, total: totalSteps });
      setIsQualifyModalVisible(true);
    } else {
      // Tous les ingrédients sont désormais qualifiés : enregistrement automatique final
      setIsQualifyModalVisible(false);
      setPendingQualifyIndex(null);
      setPendingUnrecognizedName('');
      setQueueProgress(undefined);
      isSubmittingRef.current = false;
      executeSaveRecipe(updated);
    }
  };

  const handleToggleIngredientStaple = (index: number) => {
    const updated = [...ingredientsRef.current];
    updated[index] = {
      ...updated[index],
      isPantryStaple: !updated[index].isPantryStaple,
    };
    setIngredients(updated);
    ingredientsRef.current = updated;
  };

  const handleToggleIngredientOptional = (index: number) => {
    const updated = [...ingredientsRef.current];
    updated[index] = {
      ...updated[index],
      isOptional: !updated[index].isOptional,
    };
    setIngredients(updated);
    ingredientsRef.current = updated;
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredientsRef.current.length <= 1) {
      const defaultList = [{ id: generateUniqueId('ing'), name: '', quantity: '', unit: '' }];
      setIngredients(defaultList);
      ingredientsRef.current = defaultList;
      return;
    }
    const updated = ingredientsRef.current.filter((_, i) => i !== index);
    setIngredients(updated);
    ingredientsRef.current = updated;
  };

  // Steps handlers
  const handleAddStep = () => {
    setSteps([
      ...steps,
      { id: generateUniqueId('stp'), order: steps.length + 1, instruction: '' },
    ]);
  };

  const handleUpdateStep = (index: number, instruction: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], instruction };
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setSteps([{ id: generateUniqueId('stp'), order: 1, instruction: '' }]);
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    const reordered = filtered.map((step, idx) => ({ ...step, order: idx + 1 }));
    setSteps(reordered);
  };

  const executeSaveRecipe = (finalIngredients: Ingredient[]) => {
    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);
    const syncList = VocabularyService.getSyncList();

    const validatedIngredients: Ingredient[] = [];
    for (const ing of finalIngredients) {
      const trimmedName = ing.name.trim();
      if (!trimmedName) continue;

      if (ing.canonicalId && syncList.some((c) => c.id === ing.canonicalId)) {
        validatedIngredients.push(ing);
        continue;
      }

      const res = UnifiedIngredientService.resolveRecognizedIngredient(trimmedName);
      if (res.isRecognized && res.canonical) {
        validatedIngredients.push({
          ...ing,
          name: ing.name.trim() || res.canonical.canonicalName,
          canonicalId: res.canonical.id,
          isPantryStaple: res.canonical.isPantryStaple ?? ing.isPantryStaple,
        });
      } else {
        validatedIngredients.push(ing);
      }
    }

    isSubmittingRef.current = false;
    queueTotalRef.current = 0;
    queueProcessedRef.current = 0;
    setQueueProgress(undefined);
    setIsQualifyModalVisible(false);
    setPendingQualifyIndex(null);
    setPendingUnrecognizedName('');

    const recipe: Recipe = {
      id: initialRecipe?.id || generateUniqueId('rec'),
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      prepTimeMinutes: parseInt(prepTime, 10) || 10,
      cookTimeMinutes: parseInt(cookTime, 10) || 0,
      servings: Math.max(1, servings),
      rating,
      isVegetarian,
      tags: tags.length > 0 ? tags : undefined,
      userNote: userNote.trim() || undefined,
      imageUrl: imageUrl.trim(),
      availableImages: availableImages.length > 0 ? availableImages : undefined,
      isFavorite: initialRecipe?.isFavorite || false,
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ingredients: validatedIngredients,
      steps: validSteps.map((s, idx) => ({ ...s, order: idx + 1 })),
    };

    // Incrémentation de l'usage dans le vocabulaire
    validatedIngredients.forEach((ing) => {
      VocabularyService.incrementUsage(ing.canonicalId || ing.name).catch(() => {});
    });

    onSave(recipe);
  };

  // Save validation
  const handleSubmit = (overrideIngredients?: unknown) => {
    if (!title.trim()) {
      isSubmittingRef.current = false;
      Alert.alert('Titre manquant', 'Veuillez saisir au moins un titre pour la recette.');
      return;
    }

    const currentIngredients = Array.isArray(overrideIngredients)
      ? (overrideIngredients as Ingredient[])
      : ingredientsRef.current;
    const nonEmptyIngredients = currentIngredients.filter((i) => i.name.trim().length > 0);
    if (nonEmptyIngredients.length === 0) {
      isSubmittingRef.current = false;
      Alert.alert('Ingrédient requis', 'Veuillez renseigner au moins un ingrédient.');
      return;
    }

    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);
    if (validSteps.length === 0) {
      isSubmittingRef.current = false;
      Alert.alert('Étape requise', 'Veuillez renseigner au moins une étape de préparation.');
      return;
    }

    // CONFORMITÉ STRICTE AU LEXIQUE (Section 8) :
    // Chaque ingrédient de la recette DOIT impérativement appartenir au lexique canonique.
    const syncList = VocabularyService.getSyncList();

    // Résolution préalable directe O(1) de tous les ingrédients identifiables
    const workingIngredients: Ingredient[] = currentIngredients.map((ing) => {
      const trimmed = ing.name.trim();
      if (!trimmed) return ing;
      if (ing.canonicalId && syncList.some((c) => c.id === ing.canonicalId)) {
        return ing;
      }
      const res = UnifiedIngredientService.resolveRecognizedIngredient(trimmed);
      if (res.isRecognized && res.canonical) {
        return {
          ...ing,
          name: ing.name.trim() || res.canonical.canonicalName,
          canonicalId: res.canonical.id,
          isPantryStaple: res.canonical.isPantryStaple ?? ing.isPantryStaple,
        };
      }
      return ing;
    });

    setIngredients(workingIngredients);
    ingredientsRef.current = workingIngredients;

    // Détection de tous les ingrédients hors lexique
    const unrecIndices: number[] = [];
    for (let i = 0; i < workingIngredients.length; i++) {
      const ing = workingIngredients[i];
      const trimmed = ing.name.trim();
      if (!trimmed) continue;
      if (ing.canonicalId && syncList.some((c) => c.id === ing.canonicalId)) {
        continue;
      }
      const res = UnifiedIngredientService.resolveRecognizedIngredient(trimmed);
      if (res.isRecognized && res.canonical) {
        continue;
      }
      unrecIndices.push(i);
    }

    if (unrecIndices.length === 0) {
      executeSaveRecipe(workingIngredients);
      return;
    }

    // Lancer la file d'attente séquentielle
    isSubmittingRef.current = true;
    queueTotalRef.current = unrecIndices.length;
    queueProcessedRef.current = 0;

    const firstIdx = unrecIndices[0];
    setPendingQualifyIndex(firstIdx);
    setPendingUnrecognizedName(workingIngredients[firstIdx].name.trim());
    setQueueProgress({ current: 1, total: unrecIndices.length });
    setIsQualifyModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing
              ? 'Modifier la recette'
              : creationMode === 'text'
              ? 'Ajouter une recette'
              : 'Nouvelle recette'}
          </Text>
          {creationMode === 'manual' ? (
            <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTempApiKeyInput(apiKey);
                setIsApiKeyModalVisible(true);
              }}
              style={styles.keyBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
              {connectionStatus && (
                <View
                  style={[
                    styles.statusDotSmall,
                    { backgroundColor: connectionStatus.ok ? '#22C55E' : '#EF4444' },
                  ]}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sélecteur de mode (Texte brut IA vs À la main) */}
        {!isEditing && (
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, creationMode === 'text' && styles.segmentBtnActive]}
              onPress={() => setCreationMode('text')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={creationMode === 'text' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  creationMode === 'text' && styles.segmentBtnTextActive,
                ]}
              >
                Texte brut (IA)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, creationMode === 'manual' && styles.segmentBtnActive]}
              onPress={() => setCreationMode('manual')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={creationMode === 'manual' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  creationMode === 'manual' && styles.segmentBtnTextActive,
                ]}
              >
                À la main
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {creationMode === 'text' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.textModeScroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Bannière de statut IA */}
            {connectionStatus && (
              <View
                style={[
                  styles.statusBanner,
                  connectionStatus.ok ? styles.statusBannerOk : styles.statusBannerWarning,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: connectionStatus.ok ? '#22C55E' : '#EAB308' },
                  ]}
                />
                <Text style={styles.statusBannerText} numberOfLines={2}>
                  {connectionStatus.ok
                    ? 'Gemini 3.8 Flash prêt — extraction automatique'
                    : connectionStatus.message}
                </Text>
                {!connectionStatus.ok && (
                  <TouchableOpacity
                    onPress={() => {
                      setTempApiKeyInput(apiKey);
                      setIsApiKeyModalVisible(true);
                    }}
                    style={styles.statusFixBtn}
                  >
                    <Text style={styles.statusFixBtnText}>Régler</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Carte de saisie de texte */}
            <View style={styles.textCard}>
              <View style={styles.textCardHeader}>
                <View style={styles.textCardTitleRow}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  <Text style={styles.textCardTitle}>Collez votre recette en vrac</Text>
                </View>
                <Text style={styles.textCardSubtitle}>
                  Collez des notes, un message ou les ingrédients et instructions. L'IA structure automatiquement le titre, les portions, le minutage et le lexique d'ingrédients.
                </Text>
              </View>

              <View style={styles.textHelperRow}>
                <TouchableOpacity
                  style={styles.sampleQuickBtn}
                  onPress={handleFillSample}
                  activeOpacity={0.7}
                >
                  <Ionicons name="dice-outline" size={15} color={colors.primary} />
                  <Text style={styles.sampleQuickBtnText}>Exemple rapide</Text>
                </TouchableOpacity>

                {rawTextInput.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearTextBtn}
                    onPress={() => setRawTextInput('')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.clearTextBtnText}>Effacer</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.rawTextInput}
                value={rawTextInput}
                onChangeText={setRawTextInput}
                placeholder={"Ex: Risotto aux champignons\n300g de riz arborio, 250g de champignons, 1 échalote, parmesan, vin blanc...\n\nFaire revenir l'échalote et le riz, mouiller au vin blanc puis bouillon 20 min..."}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Bouton d'action d'analyse */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.analyzeBtn,
                  (isAnalyzingText || (connectionStatus && !connectionStatus.ok)) && styles.analyzeBtnDisabled,
                ]}
                onPress={handleAnalyzeText}
                disabled={isAnalyzingText}
                activeOpacity={0.85}
              >
                {isAnalyzingText ? (
                  <View style={styles.analyzingContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.analyzeBtnText}>{loadingStep}</Text>
                  </View>
                ) : (
                  <View style={styles.analyzingContent}>
                    <Ionicons name="sparkles" size={19} color="#FFFFFF" />
                    <Text style={styles.analyzeBtnText}>Structurer et créer la recette</Text>
                  </View>
                )}
              </TouchableOpacity>

              {isAnalyzingText && (
                <TouchableOpacity
                  style={[styles.analyzeBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setIsAnalyzingText(false)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.analyzeBtnText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Passerelle directe vers la saisie manuelle */}
            <TouchableOpacity
              style={styles.manualSwitchCard}
              onPress={() => setCreationMode('manual')}
              activeOpacity={0.8}
            >
              <View style={styles.manualSwitchIconCircle}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.manualSwitchTextCol}>
                <Text style={styles.manualSwitchTitle}>Passer à la saisie manuelle</Text>
                <Text style={styles.manualSwitchSubtitle}>
                  Renseignez vous-même les ingrédients et étapes sans passer par l'IA
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photo de la recette</Text>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.changeImageBtnText}>Choisir une photo</Text>
              </TouchableOpacity>
            </View>

            {/* Photos Marmiton disponibles pour la couverture */}
            {availableImages.length > 0 && (
              <View style={styles.candidateBlock}>
                <View style={styles.candidateHeaderRow}>
                  <Ionicons name="images" size={16} color={Colors.primary} />
                  <Text style={styles.candidateHeaderTitle}>
                    Photos Marmiton disponibles ({availableImages.length}) :
                  </Text>
                </View>
                <Text style={styles.candidateSubtitle}>
                  Touchez une photo pour la définir comme image de couverture
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.candidateScroll}>
                  {availableImages.map((imgUrl, idx) => {
                    const isSelected = imageUrl === imgUrl;
                    return (
                      <TouchableOpacity
                        key={`avail_img_${idx}`}
                        style={[
                          styles.candidateThumb,
                          isSelected && styles.candidateThumbSelected,
                        ]}
                        onPress={() => setImageUrl(imgUrl)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: imgUrl }} style={styles.candidateImage} />
                        {isSelected && (
                          <View style={styles.candidateCheckBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.candidateThumbLabel,
                            isSelected && styles.candidateThumbLabelSelected,
                          ]}
                        >
                          Photo {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Presets rapides d'images */}
            <Text style={styles.subLabel}>Ou choisissez parmi nos photos gourmandes :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {PRESET_IMAGES.map((preset, idx) => (
                <TouchableOpacity
                  key={`preset_${idx}`}
                  style={[
                    styles.presetThumb,
                    imageUrl === preset.url && styles.presetThumbSelected,
                  ]}
                  onPress={() => setImageUrl(preset.url)}
                >
                  <Image source={{ uri: preset.url }} style={styles.presetImage} />
                  <Text style={styles.presetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Informations générales */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Informations générales</Text>

            <Text style={styles.inputLabel}>Titre de la recette *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Tarte aux fraises maison..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description / Histoire</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Une pâte croustillante avec crème pâtissière..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Catégorie */}
            <Text style={styles.inputLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowPills}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, category === cat && styles.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Option Végétarien */}
            <Text style={styles.inputLabel}>Régime alimentaire</Text>
            <TouchableOpacity
              style={[styles.vegeToggleCard, isVegetarian && styles.vegeToggleCardActive]}
              onPress={() => setIsVegetarian(!isVegetarian)}
              activeOpacity={0.75}
            >
              <View style={[styles.vegeCheckbox, isVegetarian && styles.vegeCheckboxActive]}>
                {isVegetarian && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.vegeLabelWrapper}>
                <View style={styles.vegeTitleRow}>
                  <Text style={[styles.vegeTitle, isVegetarian && styles.vegeTitleActive]}>
                    🌱 Recette végétarienne
                  </Text>
                  {isVegetarian && (
                    <View style={styles.vegeActiveBadge}>
                      <Text style={styles.vegeActiveBadgeText}>Végé</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.vegeSubtitle}>
                  Sans viande, volaille, poisson ni fruits de mer
                </Text>
              </View>
            </TouchableOpacity>

            {/* Tags & Étiquettes personnalisés */}
            <View style={styles.tagsSectionHeader}>
              <Text style={styles.inputLabel}>Tags & Étiquettes</Text>
              <Text style={styles.tagsSubtitle}>
                Classez votre recette selon vos envies (ex: Rapide, Apéro, Sans lactose...)
              </Text>
            </View>

            {/* Saisie d'un nouveau tag */}
            <View style={styles.tagInputRow}>
              <View style={styles.tagInputWrap}>
                <Ionicons
                  name="pricetag-outline"
                  size={16}
                  color={colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.tagTextInput}
                  value={tagInputText}
                  onChangeText={setTagInputText}
                  placeholder="Créer un nouveau tag..."
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => handleAddTag(tagInputText)}
                  returnKeyType="done"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.addTagBtn,
                  !tagInputText.trim() && styles.addTagBtnDisabled,
                ]}
                onPress={() => handleAddTag(tagInputText)}
                disabled={!tagInputText.trim()}
                activeOpacity={0.8}
                accessibilityLabel="Ajouter le tag"
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Tags actuellement assignés à la recette */}
            {tags.length > 0 && (
              <View style={styles.currentTagsWrap}>
                {tags.map((t) => (
                  <View key={t} style={styles.assignedTagBadge}>
                    <Text style={styles.assignedTagText}>#{t}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(t)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={styles.removeTagBtn}
                      accessibilityLabel={`Supprimer le tag ${t}`}
                    >
                      <Ionicons name="close" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions de tags en 1 clic */}
            {suggestedTags.length > 0 && (
              <View style={styles.suggestedTagsContainer}>
                <Text style={styles.suggestedTagsTitle}>Suggestions en 1 clic :</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestedTagsScroll}>
                  {suggestedTags.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={styles.suggestedTagChip}
                      onPress={() => handleAddTag(t)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.suggestedTagText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Difficulté */}
            <Text style={styles.inputLabel}>Difficulté</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[styles.diffBtn, difficulty === diff && styles.diffBtnActive]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[styles.diffBtnText, difficulty === diff && styles.diffBtnTextActive]}>
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Temps et Portions */}
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Prépa (min)</Text>
                <TextInput
                  style={styles.textInput}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Cuisson (min)</Text>
                <TextInput
                  style={styles.textInput}
                  value={cookTime}
                  onChangeText={setCookTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Portions</Text>
                <View style={styles.servingsControl}>
                  <TouchableOpacity
                    onPress={() => setServings(Math.max(1, servings - 1))}
                    style={styles.servingBtn}
                  >
                    <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.servingsValue}>{servings}</Text>
                  <TouchableOpacity
                    onPress={() => setServings(servings + 1)}
                    style={styles.servingBtn}
                  >
                    <Ionicons name="add" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Note & Appréciation */}
            <Text style={styles.inputLabel}>Note de la recette ({rating}/5)</Text>
            <View style={styles.starBox}>
              <StarRating
                rating={rating}
                size={28}
                interactive={true}
                onRatingChange={setRating}
                showScore={true}
                showClear={rating > 0}
              />
            </View>

            {/* Astuce secrète */}
            <Text style={styles.inputLabel}>Astuce secrète du chef (optionnel)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={userNote}
              onChangeText={setUserNote}
              placeholder="Ex: Ajouter une pincée de sel dans les blancs en neige..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Ingrédients */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Ingrédients ({ingredients.length})</Text>
              <TouchableOpacity onPress={handleAddIngredient} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {/* En-têtes de colonnes Nom | Quantité | Unité */}
            {ingredients.length > 0 && (
              <View style={styles.ingredientColumnsHeader}>
                <Text style={[styles.columnHeaderLabel, styles.colNomHeader]}>Nom</Text>
                <Text style={[styles.columnHeaderLabel, styles.colQtyHeader]}>Quantité</Text>
                <Text style={[styles.columnHeaderLabel, styles.colUnitHeader]}>Unité</Text>
                <View style={styles.colActionSpacer} />
              </View>
            )}

            {ingredients.map((ing, index) => (
              <View
                key={ing.id}
                style={[
                  styles.ingredientCard,
                  {
                    zIndex: activeIngIndex === index ? 9999 : (ingredients.length - index) * 10,
                    elevation: activeIngIndex === index ? 20 : (ingredients.length - index),
                  },
                ]}
              >
                <View style={styles.ingredientEditRow}>
                  <UnifiedIngredientInput
                    containerStyle={styles.ingNameContainer}
                    style={[styles.textInput, styles.ingNameInput]}
                    value={ing.name}
                    onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
                    onSelectIngredient={(canon, details) => handleSelectCanonicalIngredient(index, canon, details)}
                    onAutoExtractedDetails={(extracted) => {
                      if (extracted.quantity && !ing.quantity) {
                        handleUpdateIngredient(index, 'quantity', extracted.quantity);
                      }
                      if (extracted.unit && !ing.unit) {
                        handleUpdateIngredient(index, 'unit', extracted.unit);
                      }
                    }}
                    placeholder="Ex: Farine"
                    placeholderTextColor={colors.textMuted}
                    context="recipe"
                    onRequestQualify={(raw) => {
                      setPendingQualifyIndex(index);
                      setPendingUnrecognizedName(raw);
                      setIsQualifyModalVisible(true);
                    }}
                    onFocus={() => setActiveIngIndex(index)}
                    onBlur={() => setActiveIngIndex(null)}
                  />
                  <TextInput
                    style={[styles.textInput, styles.ingQtyInput]}
                    value={ing.quantity}
                    onChangeText={(val) => handleUpdateIngredient(index, 'quantity', val)}
                    placeholder="200"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    onFocus={() => setActiveIngIndex(index)}
                  />
                  <View style={styles.ingUnitInputWrapper}>
                    <TextInput
                      style={[styles.textInput, styles.ingUnitInput]}
                      value={ing.unit}
                      onChangeText={(val) => handleUpdateIngredient(index, 'unit', val)}
                      placeholder="g"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      onFocus={() => setActiveIngIndex(index)}
                    />
                    <TouchableOpacity
                      style={styles.unitPickerTriggerBtn}
                      onPress={() => {
                        setUnitModalTargetIndex(index);
                        setIsUnitModalVisible(true);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      accessibilityLabel="Choisir une unité"
                    >
                      <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveIngredient(index)}
                    style={styles.deleteRowBtn}
                    accessibilityLabel="Supprimer cet ingrédient"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* Puces d'accès rapide aux unités si cette ligne est active */}
                {activeIngIndex === index && (
                  <View style={styles.recipeUnitQuickRow}>
                    <UnitQuickPicker
                      value={ing.unit}
                      onChangeUnit={(val) => handleUpdateIngredient(index, 'unit', val)}
                      onOpenFullPicker={() => {
                        setUnitModalTargetIndex(index);
                        setIsUnitModalVisible(true);
                      }}
                      compact
                    />
                  </View>
                )}

                {/* Organisation par sections (Livre de Chef) */}
                <View style={styles.ingredientFlagsRow}>
                  {/* Badge statut Lexique */}
                  {ing.name.trim().length >= 2 && (
                    Boolean(ing.canonicalId || UnifiedIngredientService.resolveRecognizedIngredient(ing.name).isRecognized) ? (
                      <View style={styles.lexiconBadgeOk}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                        <Text style={styles.lexiconBadgeOkText}>Lexique</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.lexiconBadgeWarn}
                        onPress={() => {
                          setPendingQualifyIndex(index);
                          setPendingUnrecognizedName(ing.name.trim());
                          setIsQualifyModalVisible(true);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons name="alert-circle" size={12} color={colors.amber} />
                        <Text style={styles.lexiconBadgeWarnText}>À qualifier</Text>
                      </TouchableOpacity>
                    )
                  )}

                  <TouchableOpacity
                    style={[
                      styles.flagChip,
                      ing.isPantryStaple && styles.flagChipActiveStaple,
                    ]}
                    onPress={() => handleToggleIngredientStaple(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="archive-outline"
                      size={12}
                      color={ing.isPantryStaple ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.flagChipText,
                        ing.isPantryStaple && styles.flagChipTextActiveStaple,
                      ]}
                    >
                      {ing.isPantryStaple ? 'En placard' : '+ Placard'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.flagChip,
                      ing.isOptional && styles.flagChipActiveOptional,
                    ]}
                    onPress={() => handleToggleIngredientOptional(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={12}
                      color={ing.isOptional ? '#D97706' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.flagChipText,
                        ing.isOptional && styles.flagChipTextActiveOptional,
                      ]}
                    >
                      {ing.isOptional ? 'En finition' : '+ Finition'}
                    </Text>
                  </TouchableOpacity>

                  {/* Puce Recette Liée (Sous-recette / Fait maison) */}
                  {(() => {
                    const manualRecipe =
                      ing.linkedRecipeId && ing.linkedRecipeId !== 'none'
                        ? availableRecipes.find((r) => r.id === ing.linkedRecipeId)
                        : null;
                    const isNone = ing.linkedRecipeId === 'none';
                    const autoCandidate = !ing.linkedRecipeId
                      ? findAutoMatchCandidate(ing.name, availableRecipes, initialRecipe?.id)
                      : null;

                    if (manualRecipe) {
                      return (
                        <TouchableOpacity
                          style={[styles.flagChip, styles.flagChipActiveLinked]}
                          onPress={() => handleOpenLinkModal(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="link" size={12} color={colors.primary} />
                          <Text
                            style={[styles.flagChipText, styles.flagChipTextActiveLinked]}
                            numberOfLines={1}
                          >
                            {manualRecipe.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    if (isNone) {
                      return (
                        <TouchableOpacity
                          style={styles.flagChip}
                          onPress={() => handleOpenLinkModal(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="ban-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.flagChipText}>Pas de lien</Text>
                        </TouchableOpacity>
                      );
                    }

                    if (autoCandidate) {
                      return (
                        <TouchableOpacity
                          style={[styles.flagChip, styles.flagChipAutoLinked]}
                          onPress={() => handleOpenLinkModal(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="sparkles" size={12} color={colors.primary} />
                          <Text
                            style={[styles.flagChipText, styles.flagChipTextAutoLinked]}
                            numberOfLines={1}
                          >
                            Lien : {autoCandidate.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        style={styles.flagChip}
                        onPress={() => handleOpenLinkModal(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="link-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.flagChipText}>+ Lier recette</Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </View>
            ))}
          </View>

          {/* Étapes de préparation */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Étapes ({steps.length})</Text>
              <TouchableOpacity onPress={handleAddStep} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Ajouter une étape</Text>
              </TouchableOpacity>
            </View>

            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepEditRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.stepInput]}
                  value={step.instruction}
                  onChangeText={(val) => handleUpdateStep(index, val)}
                  placeholder={`Description de l'étape ${index + 1}...`}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <TouchableOpacity
                  onPress={() => handleRemoveStep(index)}
                  style={styles.deleteRowBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Bouton d'enregistrement bas de page */}
          <TouchableOpacity onPress={handleSubmit} style={styles.bottomSaveBtn} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.bottomSaveBtnText}>Enregistrer la recette</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      </KeyboardAvoidingView>

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
            La structuration automatique utilise Gemini 3.8 Flash. Vous pouvez renseigner votre clé personnelle Google AI Studio (gratuite).
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
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal de qualification stricte (Passeport Ingrédient) */}
    <QualifyIngredientModal
      visible={isQualifyModalVisible}
      rawName={pendingUnrecognizedName}
      context="recipe"
      queueProgress={queueProgress}
      onClose={handleCancelQualify}
      onSelectCanonical={(canonical, meta) => {
        handleQualifyIngredientSuccess(canonical, meta);
      }}
      onAttachAsSynonym={(canonical) => {
        handleQualifyIngredientSuccess(canonical, { wasAddedAsAlias: true });
      }}
      onCreateCanonical={(created) => {
        handleQualifyIngredientSuccess(created, { wasAddedAsAlias: false });
      }}
    />

    {/* Modal de sélection d'unités complètes pour la recette */}
    <UnitPickerModal
      visible={isUnitModalVisible}
      currentUnit={unitModalTargetIndex !== null ? ingredients[unitModalTargetIndex]?.unit : ''}
      onSelectUnit={(val) => {
        if (unitModalTargetIndex !== null) {
          handleUpdateIngredient(unitModalTargetIndex, 'unit', val);
        }
      }}
      onClose={() => {
        setIsUnitModalVisible(false);
        setUnitModalTargetIndex(null);
      }}
      title="Unité pour l'ingrédient"
    />

    {/* Modal de sélection de recette liée pour un ingrédient */}
    <RecipeLinkPickerModal
      visible={isLinkModalVisible}
      ingredientName={linkModalTargetIndex !== null ? ingredients[linkModalTargetIndex]?.name : ''}
      currentLinkedRecipeId={
        linkModalTargetIndex !== null ? ingredients[linkModalTargetIndex]?.linkedRecipeId : undefined
      }
      availableRecipes={availableRecipes}
      currentRecipeId={initialRecipe?.id}
      onSelectRecipe={handleSelectLinkedRecipe}
      onClose={() => {
        setIsLinkModalVisible(false);
        setLinkModalTargetIndex(null);
      }}
    />
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
  headerBtn: {
    padding: 6,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changeImageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetThumb: {
    width: 76,
    marginRight: 10,
    alignItems: 'center',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetThumbSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  presetImage: {
    width: 68,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  presetText: {
    fontSize: 10,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rowPills: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  diffBtnActive: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.secondary,
  },
  diffBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  diffBtnTextActive: {
    color: Colors.secondary,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  gridCol: {
    flex: 1,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    paddingHorizontal: 6,
  },
  servingBtn: {
    padding: 6,
  },
  servingsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  starBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  ingredientCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  ingredientEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ingredientFlagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingLeft: 2,
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    maxWidth: 220,
  },
  flagChipActiveStaple: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  flagChipActiveOptional: {
    backgroundColor: colors.amber + '20',
    borderColor: colors.amber,
  },
  flagChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    flexShrink: 1,
  },
  flagChipTextActiveStaple: {
    color: colors.primary,
    fontWeight: '700',
  },
  flagChipTextActiveOptional: {
    color: colors.amber,
    fontWeight: '700',
  },
  flagChipActiveLinked: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary,
  },
  flagChipTextActiveLinked: {
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
  },
  flagChipAutoLinked: {
    backgroundColor: colors.primaryLight + '25',
    borderColor: colors.primaryLight + '70',
  },
  flagChipTextAutoLinked: {
    color: colors.primary,
    fontWeight: '600',
    flexShrink: 1,
  },
  lexiconBadgeOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  lexiconBadgeOkText: {
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '600',
  },
  lexiconBadgeWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.amber + '18',
    borderWidth: 1,
    borderColor: colors.amber + '40',
  },
  lexiconBadgeWarnText: {
    fontSize: 10.5,
    color: colors.amber,
    fontWeight: '700',
  },
  ingredientColumnsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    marginBottom: 6,
  },
  columnHeaderLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colNomHeader: {
    flex: 5,
    textAlign: 'left',
    paddingLeft: 4,
  },
  colQtyHeader: {
    flex: 1.8,
    textAlign: 'center',
  },
  colUnitHeader: {
    flex: 1.2,
    textAlign: 'center',
  },
  colActionSpacer: {
    width: 34,
  },
  ingNameContainer: {
    flex: 5,
  },
  ingNameInput: {
    width: '100%',
    marginBottom: 0,
  },
  ingQtyInput: {
    flex: 1.8,
    marginBottom: 0,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  ingUnitInputWrapper: {
    flex: 1.3,
    position: 'relative',
    justifyContent: 'center',
  },
  ingUnitInput: {
    width: '100%',
    marginBottom: 0,
    textAlign: 'center',
    paddingLeft: 4,
    paddingRight: 16,
  },
  unitPickerTriggerBtn: {
    position: 'absolute',
    right: 3,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  recipeUnitQuickRow: {
    marginTop: 6,
    marginBottom: 4,
  },
  deleteRowBtn: {
    width: 34,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  stepInput: {
    flex: 1,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  switchAiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 12,
  },
  switchAiIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchAiTextCol: {
    flex: 1,
  },
  switchAiTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  switchAiSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  vegeToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  vegeToggleCardActive: {
    backgroundColor: colors.isDark ? '#143823' : '#F0FDF4',
    borderColor: colors.isDark ? '#2E7D52' : '#86EFAC',
  },
  vegeCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vegeCheckboxActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  vegeLabelWrapper: {
    flex: 1,
  },
  vegeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  vegeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vegeTitleActive: {
    color: colors.isDark ? '#4ADE80' : '#15803D',
  },
  vegeActiveBadge: {
    backgroundColor: colors.isDark ? '#143823' : '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vegeActiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.isDark ? '#4ADE80' : '#16A34A',
  },
  vegeSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tagsSectionHeader: {
    marginBottom: 4,
  },
  tagsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: -4,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tagInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  tagTextInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  addTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnDisabled: {
    opacity: 0.45,
  },
  currentTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  assignedTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 10,
    gap: 6,
  },
  assignedTagText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  removeTagBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedTagsContainer: {
    marginBottom: 16,
  },
  suggestedTagsTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  suggestedTagsScroll: {
    flexDirection: 'row',
  },
  suggestedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
  },
  suggestedTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  candidateBlock: {
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  candidateHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.isDark ? colors.primary : colors.primaryDark,
  },
  candidateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  candidateScroll: {
    flexDirection: 'row',
  },
  candidateThumb: {
    width: 90,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBackground,
    position: 'relative',
  },
  candidateThumbSelected: {
    borderColor: colors.primary,
    ...shadows.small,
  },
  candidateImage: {
    width: '100%',
    height: 64,
    borderRadius: 8,
  },
  candidateCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#16A34A',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  candidateThumbLabel: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  candidateThumbLabelSelected: {
    color: '#16A34A',
    fontWeight: '700',
  },
  keyBtn: {
    padding: 6,
    position: 'relative',
  },
  statusDotSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textModeScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    gap: 8,
  },
  statusBannerOk: {
    backgroundColor: colors.isDark ? 'rgba(34, 197, 94, 0.12)' : '#F0FDF4',
    borderColor: colors.isDark ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
  },
  statusBannerWarning: {
    backgroundColor: colors.isDark ? 'rgba(234, 179, 8, 0.12)' : '#FEFCE8',
    borderColor: colors.isDark ? 'rgba(234, 179, 8, 0.3)' : '#FEF08A',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  statusFixBtn: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFixBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  textCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  textCardHeader: {
    marginBottom: 12,
  },
  textCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  textCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  textCardSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textHelperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sampleQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sampleQuickBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  clearTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearTextBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rawTextInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    minHeight: 220,
  },
  analyzeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
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
  manualSwitchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    gap: 12,
    ...shadows.small,
  },
  manualSwitchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.isDark ? 'rgba(34, 197, 94, 0.15)' : '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 1,
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    ...shadows.medium,
  },
  bottomSaveBtnText: {
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
