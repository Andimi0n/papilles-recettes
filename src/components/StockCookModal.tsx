import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Recipe, Category, RecipeIdea } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { evaluateRecipesWithStock } from '../utils/stockMatcher';
import {
  RecipeAiService,
  formatAiModelName,
  FAST_GEMINI_MODELS_CASCADE,
  GEMINI_MODELS_CASCADE,
  CHEF_MOODS,
} from '../services/recipeAiService';
import { StorageService } from '../services/storageService';
import { generateUniqueId } from '../utils/helpers';
import { ChefFavoritePromptsModal } from './ChefFavoritePromptsModal';
import { UnifiedIngredientInput } from './UnifiedIngredientInput';

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

interface StockCookModalProps {
  visible: boolean;
  preserveSession?: boolean;
  recipes: Recipe[];
  stockItems: FridgeItem[];
  doableCount?: number;
  isDoableFilterActive: boolean;
  onApplyDoableFilter: (active: boolean) => void;
  onRecipeGenerated?: (partialRecipe: Partial<Recipe>) => void;
  onNavigateToStock?: () => void;
  onClose: () => void;
}

const AI_STEPS = [
  'Le Chef IA examine vos ingrédients en stock...',
  'Association créative et équilibre des saveurs...',
  'Calcul précis des proportions & assaisonnements...',
  'Rédaction des étapes pas-à-pas...',
  'Finalisation des secrets de cuisson...',
];

export type AllowedMealType = 'Plat' | 'Entrée' | 'Dessert';

const MEAL_TYPES: { id: AllowedMealType; label: string; iconName: string }[] = [
  { id: 'Entrée', label: 'Entrée', iconName: 'leaf-outline' },
  { id: 'Plat', label: 'Plat', iconName: 'restaurant-outline' },
  { id: 'Dessert', label: 'Dessert', iconName: 'ice-cream-outline' },
];

export const StockCookModal: React.FC<StockCookModalProps> = ({
  visible,
  preserveSession = false,
  recipes,
  stockItems,
  doableCount,
  isDoableFilterActive,
  onApplyDoableFilter,
  onRecipeGenerated,
  onNavigateToStock,
  onClose,
}) => {
  const { colors } = useTheme();

  // Ingrédients principaux (⭐ indispensables), optionnels et inactifs
  const [primaryIngredients, setPrimaryIngredients] = useState<string[]>([]);
  const [optionalIngredients, setOptionalIngredients] = useState<string[]>([]);
  const [inactiveIngredients, setInactiveIngredients] = useState<string[]>([]);
  const [isStockExpanded, setIsStockExpanded] = useState<boolean>(false);
  const [ingredientSearchText, setIngredientSearchText] = useState<string>('');
  const [rejectedIdeaTitles, setRejectedIdeaTitles] = useState<string[]>([]);
  const [isFavoritePromptsModalVisible, setIsFavoritePromptsModalVisible] = useState(false);

  const [servings, setServings] = useState<number>(4);
  const [isVegetarian, setIsVegetarian] = useState<boolean>(false);
  const [mealType, setMealType] = useState<AllowedMealType>('Plat');
  const [additionalPreferences, setAdditionalPreferences] = useState<string>('');

  // Flow d'invention IA en 2 étapes (Solution 4)
  const [aiFlowStep, setAiFlowStep] = useState<
    'config' | 'loading_ideas' | 'ideas' | 'generating_recipe'
  >('config');
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<RecipeIdea | null>(null);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [activeModelInfo, setActiveModelInfo] = useState<{ model: string; isFallback: boolean }>({
    model: FAST_GEMINI_MODELS_CASCADE[0],
    isFallback: false,
  });
  const [chefMood, setChefMood] = useState<string>('quotidien');

  // Saisie clé API si absente
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  const stepIntervalRef = useRef<any>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const currentOperationIdRef = useRef<number>(0);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (prevVisible !== visible) {
    setPrevVisible(visible);
    if (visible) {
      if (!preserveSession) {
        const init = initializeStockIngredients(stockItems);
        setPrimaryIngredients(init.primaryIngredients);
        setOptionalIngredients(init.optionalIngredients);
        setInactiveIngredients(init.inactiveIngredients);
        setIsStockExpanded(false);
        setIngredientSearchText('');
        setRejectedIdeaTitles([]);
        setMealType('Plat');
        setAiFlowStep('config');
        setIdeas([]);
        setSelectedIdea(null);
      } else {
        // En cas de réouverture avec session préservée (ex: annulation depuis la fiche de recette générée)
        // on garantit que l'écran affiche directement les 3 idées si elles existent
        if (ideas.length > 0) {
          setAiFlowStep('ideas');
        }
      }
    }
  }

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
  }, []);

  const handleCloseModal = useCallback(() => {
    cancelCurrentAiOperation();
    onClose();
  }, [cancelCurrentAiOperation, onClose]);

  // Nettoyage au démontage pour ne jamais laisser d'opération ou timer orphelin
  useEffect(() => {
    return () => {
      cancelCurrentAiOperation();
    };
  }, [cancelCurrentAiOperation]);


  // Charger les portions par défaut depuis le storage si configuré
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    StorageService.getDefaultServings().then((val) => {
      if (isMounted && val && val >= 1) setServings(val);
    });
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Animation des étapes IA lors de la génération complète
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

  // Recettes faisables avec le stock pour le type de repas choisi (Solution 1)
  const doableRecipesForCurrentType = useMemo(() => {
    if (stockItems.length === 0 || recipes.length === 0) return [];
    const map = evaluateRecipesWithStock(recipes, stockItems, {
      assumePantryStaplesAvailable: true,
    });
    return recipes.filter((r) => map.get(r.id)?.isDoable && r.category === mealType);
  }, [recipes, stockItems, mealType]);

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

  const allItemsWithState = useMemo(() => {
    const items: { name: string; state: IngredientSelectionState }[] = [
      ...primaryIngredients.map((name) => ({ name, state: 'primary' as const })),
      ...optionalIngredients.map((name) => ({ name, state: 'optional' as const })),
      ...inactiveIngredients.map((name) => ({ name, state: 'inactive' as const })),
    ];
    return organizeIngredientsForDisplay(items);
  }, [primaryIngredients, optionalIngredients, inactiveIngredients]);

  const activeCount = primaryIngredients.length + optionalIngredients.length;

  // Étape 1 : Demande de 3 idées gourmandes au Chef IA
  const handleStartFetchIdeas = async () => {
    if (primaryIngredients.length === 0 && optionalIngredients.length === 0) {
      Alert.alert(
        'Aucun ingrédient sélectionné',
        'Veuillez ajouter au moins un ingrédient obligatoire ou optionnel pour inspirer le Chef IA.'
      );
      return;
    }

    const apiKey = await RecipeAiService.getApiKey();
    if (!apiKey) {
      setIsApiKeyModalVisible(true);
      return;
    }

    executeFetchIdeas(apiKey);
  };

  const executeFetchIdeas = async (key?: string, customRejected?: string[]) => {
    cancelCurrentAiOperation();
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const opId = ++currentOperationIdRef.current;

    setActiveModelInfo({ model: FAST_GEMINI_MODELS_CASCADE[0], isFallback: false });
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
          additionalPreferences: additionalPreferences.trim(),
          signal: abortController.signal,
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

      // Si annulé ou périmé entre-temps, on ignore silencieusement
      if (opId !== currentOperationIdRef.current || abortController.signal.aborted) {
        return;
      }

      if (!generatedIdeas || generatedIdeas.length === 0) {
        throw new Error("Le Chef IA n'a pas pu proposer d'idées. Réessayez.");
      }

      setIdeas(generatedIdeas);
      setAiFlowStep('ideas');
    } catch (err: any) {
      // Si annulé par l'utilisateur, ne pas afficher d'alerte et ne rien modifier
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

    const apiKey = await RecipeAiService.getApiKey();
    if (!apiKey) {
      setIsApiKeyModalVisible(true);
      return;
    }

    executeFetchIdeas(apiKey, updatedRejected);
  };

  // Étape 2 : Concrétisation de la recette complète à partir de l'idée choisie
  const handleSelectIdea = async (idea: RecipeIdea) => {
    setSelectedIdea(idea);
    const apiKey = await RecipeAiService.getApiKey();
    if (!apiKey) {
      setIsApiKeyModalVisible(true);
      return;
    }
    executeGenerateRecipeFromIdea(idea, apiKey);
  };

  const executeGenerateRecipeFromIdea = async (idea: RecipeIdea, key?: string) => {
    cancelCurrentAiOperation();
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const opId = ++currentOperationIdRef.current;

    setActiveModelInfo({ model: GEMINI_MODELS_CASCADE[0], isFallback: false });
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
          signal: abortController.signal,
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

      // Si annulé ou périmé entre-temps, on ignore silencieusement
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
          `Recette inédite créée par le Chef IA avec vos aliments : ${allChosenIngredients.join(', ')}`,
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

      // Important : on conserve aiFlowStep à 'ideas' pour que si l'utilisateur annule
      // l'édition dans RecipeFormScreen, la réouverture réaffiche directement les 3 idées de plats
      setAiFlowStep('ideas');
      onClose();

      if (onRecipeGenerated) {
        onRecipeGenerated(partialRecipe);
      }
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
          "Impossible de finaliser la recette. Veuillez réessayer."
      );
    } finally {
      if (activeAbortControllerRef.current === abortController) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = tempApiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('Clé requise', 'Veuillez renseigner votre clé API Google Gemini.');
      return;
    }
    await RecipeAiService.setApiKey(trimmed);
    setIsApiKeyModalVisible(false);
    setTempApiKeyInput('');
    if (selectedIdea) {
      executeGenerateRecipeFromIdea(selectedIdea, trimmed);
    } else {
      executeFetchIdeas(trimmed);
    }
  };

  const totalStockCount = stockItems.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCloseModal}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            {aiFlowStep === 'ideas' ? (
              <TouchableOpacity
                onPress={() => setAiFlowStep('config')}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Retour aux critères"
              >
                <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            )}

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {aiFlowStep === 'ideas' ? 'Inspirations du Chef' : 'Inspirations du Chef IA'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {aiFlowStep === 'ideas'
                  ? '3 idées imaginées pour vous'
                  : 'Création sur-mesure & anti-gaspillage'}
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              {onNavigateToStock && (
                <TouchableOpacity
                  onPress={() => {
                    handleCloseModal();
                    onNavigateToStock();
                  }}
                  style={styles.manageStockBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="fridge-outline" size={16} color={colors.primary} />
                  <Text style={styles.manageStockBtnText}>Étagères</Text>
                </TouchableOpacity>
              )}

              {aiFlowStep === 'ideas' ? (
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Fermer"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : !onNavigateToStock ? (
                <View style={styles.headerSpacer} />
              ) : null}
            </View>
          </View>

          {/* ÉCRAN 1 : Loader animé si génération complète de la recette choisie */}
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
                      ? `Repli de secours : ${formatAiModelName(activeModelInfo.model)}`
                      : `Modèle : ${formatAiModelName(activeModelInfo.model)}`}
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
            /* ÉCRAN 2 : Loader rapide pendant la proposition des 3 idées */
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
                    ? `Anti-doublon : ${doableRecipesForCurrentType.length} ${mealType.toLowerCase()}${doableRecipesForCurrentType.length > 1 ? 's' : ''} faisable${doableRecipesForCurrentType.length > 1 ? 's' : ''} dans votre carnet sera évité${doableRecipesForCurrentType.length > 1 ? 's' : ''}`
                    : 'Génération originale adaptée à vos denrées en stock'}
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
                      ? `Repli de secours : ${formatAiModelName(activeModelInfo.model)}`
                      : `Modèle : ${formatAiModelName(activeModelInfo.model)}`}
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
            /* ÉCRAN 3 : Affichage des 3 idées du Chef (Solution 4) */
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
            /* ÉCRAN 4 : Configuration normale (Carnet & sélection d'ingrédients / options) */
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ÉTAT 1 : Stock complètement vide */}
              {totalStockCount === 0 ? (
                <View style={styles.emptyStockBox}>
                  <View style={styles.emptyStockIconCircle}>
                    <Ionicons name="nutrition-outline" size={38} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyStockTitle}>Vos étagères sont vides</Text>
                  <Text style={styles.emptyStockSubtitle}>
                    Renseignez vos ingrédients du placard ou du frigo dans l&apos;onglet &laquo; Étagères &amp;
                    Courses &raquo; pour voir instantanément quelles recettes cuisiner ou inspirer le Chef
                    IA.
                  </Text>
                  {onNavigateToStock && (
                    <TouchableOpacity
                      style={styles.fillStockBtn}
                      onPress={() => {
                        onClose();
                        onNavigateToStock();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.fillStockBtnText}>Remplir mes étagères 🥫</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* SECTION 1 : INSPIRATION CHEF IA EN 2 ÉTAPES (Besoin 2 + Solutions 1-2-4) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardIconBox, { backgroundColor: colors.secondary + '20' }]}>
                        <Ionicons name="sparkles" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle}>Invention Chef IA inédite</Text>
                        <Text style={styles.cardSubtitle}>
                          3 idées sur-mesure sans doublon avec votre carnet
                        </Text>
                      </View>
                    </View>

                    {/* 1. Paramètres de l'invention IA (Type de plat, portions, végétarien, anti-redondance) */}
                    <View style={styles.aiParamsGrid}>
                      {/* Sélecteur Entrée / Plat / Dessert (Plat par défaut) */}
                      <View style={styles.mealTypeSection}>
                        <Text style={styles.aiParamTitle}>Type de plat souhaité</Text>
                        <View style={styles.mealTypeSelectorRow}>
                          {MEAL_TYPES.map((t) => {
                            const isSelected = mealType === t.id;
                            return (
                              <TouchableOpacity
                                key={t.id}
                                style={[
                                  styles.mealTypeOptionBtn,
                                  isSelected && styles.mealTypeOptionBtnSelected,
                                ]}
                                onPress={() => {
                                  setMealType(t.id);
                                  setRejectedIdeaTitles([]);
                                }}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={t.iconName as any}
                                  size={15}
                                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.mealTypeOptionText,
                                    isSelected && styles.mealTypeOptionTextSelected,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {t.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Sélecteur de Mood / Style d'inspiration */}
                      <View style={styles.moodSection}>
                        <Text style={styles.aiParamTitle}>Style & inspiration du Chef</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.moodSelectorRow}
                        >
                          {CHEF_MOODS.map((m) => {
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
                                  name={m.icon as any}
                                  size={13}
                                  color={isSelected ? '#FFFFFF' : colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.moodChipText,
                                    isSelected && styles.moodChipTextSelected,
                                  ]}
                                >
                                  {m.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Portions */}
                      <View style={styles.aiParamRow}>
                        <View style={styles.aiParamLabelCol}>
                          <Text style={styles.aiParamTitle}>Nombre de personnes</Text>
                          <Text style={styles.aiParamSub}>Ajuste les quantités</Text>
                        </View>
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={[
                              styles.stepperBtn,
                              servings <= 1 && styles.stepperBtnDisabled,
                            ]}
                            onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                            disabled={servings <= 1}
                          >
                            <Ionicons name="remove" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.stepperValue}>{servings}</Text>
                          <TouchableOpacity
                            style={[
                              styles.stepperBtn,
                              servings >= 20 && styles.stepperBtnDisabled,
                            ]}
                            onPress={() => setServings((prev) => Math.min(20, prev + 1))}
                            disabled={servings >= 20}
                          >
                            <Ionicons name="add" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Végétarien toggle */}
                      <View style={styles.aiParamRow}>
                        <View style={styles.aiParamLabelCol}>
                          <Text style={styles.aiParamTitle}>Végétarien uniquement</Text>
                          <Text style={styles.aiParamSub}>Sans viande ni poisson</Text>
                        </View>
                        <Switch
                          value={isVegetarian}
                          onValueChange={setIsVegetarian}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor="#FFFFFF"
                        />
                      </View>

                      {/* Instructions libres & Raccourci Prompts favoris */}
                      <View style={styles.aiPreferencesRow}>
                        <View style={styles.preferencesHeaderRow}>
                          <View style={styles.aiParamLabelCol}>
                            <Text style={styles.aiParamTitle}>Instructions libres (optionnel)</Text>
                            <Text style={styles.aiParamSub}>Ex: Sans gluten, épicé, avec du fromage...</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.favoritePromptBtn}
                            onPress={() => setIsFavoritePromptsModalVisible(true)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="bookmark-outline" size={15} color={colors.primary} />
                            <Text style={styles.favoritePromptBtnText}>Favoris</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.aiPreferencesInput}
                          placeholder="Vos envies..."
                          placeholderTextColor={colors.textMuted}
                          value={additionalPreferences}
                          onChangeText={setAdditionalPreferences}
                          maxLength={150}
                        />
                      </View>

                      {/* Information filtre anti-redondance ciblée interactive */}
                      {doableRecipesForCurrentType.length > 0 ? (
                        <TouchableOpacity
                          style={styles.doableFilterInfoBoxClickable}
                          onPress={() => {
                            onApplyDoableFilter(true);
                            onClose();
                          }}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel="Voir les recettes faisables de votre carnet"
                        >
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={15}
                            color={colors.primary}
                          />
                          <Text style={styles.doableFilterInfoText}>
                            Anti-doublon : {doableRecipesForCurrentType.length} {mealType.toLowerCase()}{doableRecipesForCurrentType.length > 1 ? 's' : ''} faisable{doableRecipesForCurrentType.length > 1 ? 's' : ''} dans votre carnet sera évité{doableRecipesForCurrentType.length > 1 ? 's' : ''}
                          </Text>
                          <Text style={styles.doableFilterInfoAction}>Voir ›</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.doableFilterInfoBox}>
                          <Ionicons
                            name="sparkles-outline"
                            size={15}
                            color={colors.primary}
                          />
                          <Text style={styles.doableFilterInfoText}>
                            Aucune {mealType.toLowerCase()} similaire en stock dans votre carnet : champ libre total pour le Chef IA
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 2. Composition tactile des ingrédients (Cycle 3 états) */}
                    <View style={styles.ingredientsComposerSection}>
                      <View style={styles.composerHeader}>
                        <View style={styles.composerTitleRow}>
                          <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
                          <Text style={styles.composerSectionTitle}>
                            Ingrédients ({activeCount} actif{activeCount > 1 ? 's' : ''})
                          </Text>
                        </View>
                        <View style={styles.quickActionsRow}>
                          <TouchableOpacity
                            onPress={handleIncludeAll}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.quickActionText}>Tout inclure</Text>
                          </TouchableOpacity>
                          <Text style={styles.quickActionDivider}>•</Text>
                          <TouchableOpacity
                            onPress={handleExcludeAll}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={styles.quickActionText}>Tout exclure</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Barre unique de recherche d'ingrédient */}
                      <View style={styles.inputComposerWrapper}>
                        <UnifiedIngredientInput
                          value={ingredientSearchText}
                          onChangeText={setIngredientSearchText}
                          placeholder="Rechercher ou ajouter un ingrédient..."
                          placeholderTextColor={colors.textMuted}
                          onSelectIngredient={(canonical) => {
                            handleAddIngredient(canonical.canonicalName);
                          }}
                          onSubmitEditing={() => {
                            if (ingredientSearchText.trim()) {
                              handleAddIngredient(ingredientSearchText.trim());
                            }
                          }}
                          clearOnSelect
                          keepFocusOnSelect
                          context="stock"
                        />
                      </View>

                      {/* Légende interactive concise */}
                      <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                          <Ionicons name="star" size={11} color={colors.primary} />
                          <Text style={styles.legendText}>⭐ Indispensable</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <Ionicons name="checkmark-circle-outline" size={12} color={colors.primary} />
                          <Text style={styles.legendText}>Optionnel</Text>
                        </View>
                        <View style={styles.legendItem}>
                          <Ionicons name="close-circle-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.legendText}>Exclu</Text>
                        </View>
                      </View>

                      {/* Nuage de puces interactives avec défilement interne et limitation de hauteur */}
                      {allItemsWithState.length > 0 ? (
                        <View style={styles.chipsOuterContainer}>
                          <ScrollView
                            style={[
                              styles.chipsScrollView,
                              !isStockExpanded && allItemsWithState.length > 10 && styles.chipsScrollViewCollapsed,
                            ]}
                            contentContainerStyle={styles.chipsWrap}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={isStockExpanded}
                          >
                            {allItemsWithState.map(({ name, state }) => {
                              const isPrimary = state === 'primary';
                              const isOptional = state === 'optional';
                              const isInactive = state === 'inactive';

                              return (
                                <TouchableOpacity
                                  key={`chip_${name}`}
                                  style={[
                                    styles.stockChip,
                                    isPrimary && styles.stockChipPrimary,
                                    isOptional && styles.stockChipOptional,
                                    isInactive && styles.stockChipInactive,
                                  ]}
                                  onPress={() => handleCycleIngredient(name)}
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${name}, état : ${isPrimary ? 'indispensable' : isOptional ? 'optionnel' : 'exclu'}. Touchez pour modifier.`}
                                >
                                  {isPrimary && <Ionicons name="star" size={11} color="#FFFFFF" />}
                                  {isOptional && (
                                    <Ionicons
                                      name="checkmark-circle-outline"
                                      size={12}
                                      color={colors.primary}
                                    />
                                  )}
                                  {isInactive && (
                                    <Ionicons
                                      name="close-circle-outline"
                                      size={12}
                                      color={colors.textMuted}
                                    />
                                  )}
                                  <Text
                                    style={[
                                      styles.stockChipText,
                                      isPrimary && styles.stockChipTextPrimary,
                                      isOptional && styles.stockChipTextOptional,
                                      isInactive && styles.stockChipTextInactive,
                                    ]}
                                  >
                                    {name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>

                          {/* Bouton d'expansion si stock volumineux */}
                          {allItemsWithState.length > 10 && (
                            <TouchableOpacity
                              style={styles.expandStockBtn}
                              onPress={() => setIsStockExpanded((prev) => !prev)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.expandStockBtnText}>
                                {isStockExpanded
                                  ? 'Réduire l’affichage ▴'
                                  : `Voir tout mon stock (${allItemsWithState.length} aliments) ▾`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <View style={styles.emptyIngredientsGuide}>
                          <Ionicons name="restaurant-outline" size={20} color={colors.textMuted} />
                          <Text style={styles.emptyIngredientsGuideText}>
                            Ajoutez des ingrédients ci-dessus pour composer votre repas.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bouton de génération des 3 idées */}
                    <TouchableOpacity
                      style={[
                        styles.generateAiBtn,
                        activeCount === 0 && styles.generateAiBtnDisabled,
                      ]}
                      onPress={handleStartFetchIdeas}
                      disabled={activeCount === 0}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.generateAiBtnText}>
                        💡 Trouver 3 idées de {mealType.toLowerCase()} ({activeCount} ingrédient{activeCount > 1 ? 's' : ''})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}

          {/* Modal Clé API si absente */}
          <Modal
            visible={isApiKeyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsApiKeyModalVisible(false)}
          >
            <View style={styles.apiKeyModalOverlay}>
              <View style={styles.apiKeyModalCard}>
                <View style={styles.apiKeyHeader}>
                  <Ionicons name="key-outline" size={24} color={colors.primary} />
                  <Text style={styles.apiKeyTitle}>Clé API Gemini Requise</Text>
                </View>
                <Text style={styles.apiKeyText}>
                  Pour inventer des recettes avec vos restes, l&apos;application utilise l&apos;intelligence
                  artificielle gratuite Google Gemini (modèle BYOK).
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
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Collez votre clé API Gemini (AIza...)"
                  placeholderTextColor={colors.textMuted}
                  value={tempApiKeyInput}
                  onChangeText={setTempApiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <View style={styles.apiKeyActions}>
                  <TouchableOpacity
                    style={styles.apiKeyCancelBtn}
                    onPress={() => setIsApiKeyModalVisible(false)}
                  >
                    <Text style={styles.apiKeyCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.apiKeySaveBtn}
                    onPress={handleSaveApiKey}
                  >
                    <Text style={styles.apiKeySaveText}>Valider & Générer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modale des prompts favoris Chef IA */}
          <ChefFavoritePromptsModal
            visible={isFavoritePromptsModalVisible}
            currentPromptText={additionalPreferences}
            onSelectPrompt={(text) => setAdditionalPreferences(text)}
            onClose={() => setIsFavoritePromptsModalVisible(false)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};


const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  manageStockBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Boîte vide
  emptyStockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emptyStockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStockSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  fillStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  fillStockBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Cartes principales
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Paramètres IA
  aiParamsGrid: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  aiParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aiParamLabelCol: {
    flex: 1,
  },
  aiParamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aiParamSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 8,
    minWidth: 26,
    textAlign: 'center',
  },
  aiPreferencesRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  preferencesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  favoritePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  favoritePromptBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  aiPreferencesInput: {
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Sélecteur de type de plat (Entrée / Plat / Dessert)
  mealTypeSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  mealTypeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeOptionBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTypeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mealTypeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Sélecteur de Mood / Style d'inspiration
  moodSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moodSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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

  // Information filtre anti-redondance (Solution 1)
  doableFilterInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.primary + '12',
    borderRadius: 10,
    marginTop: 10,
  },
  doableFilterInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Idées du Chef IA (Solution 4)
  ideasHeader: {
    marginBottom: 16,
  },
  backToConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
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
  ideasTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ideasSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ideasInstructionText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 6,
  },
  ideasListContainer: {
    gap: 12,
    marginBottom: 16,
  },
  ideaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  ideaCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ideaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ideaTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primary + '20',
  },
  ideaTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  ideaTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  ideaTimeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ideaCardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  ideaHighlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  ideaHighlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ideaHighlightChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  ideaCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + '60',
  },
  ideaCookBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  ideasBottomActions: {
    gap: 10,
    marginTop: 6,
    marginBottom: 20,
  },
  refreshIdeasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  refreshIdeasBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  changeConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  changeConfigBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Composition tactile des ingrédients
  ingredientsComposerSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 14,
  },
  composerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  composerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  composerSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  quickActionDivider: {
    fontSize: 10,
    color: colors.textMuted,
  },
  inputComposerWrapper: {
    zIndex: 100,
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipsOuterContainer: {
    marginBottom: 10,
  },
  chipsScrollView: {
    maxHeight: 280,
  },
  chipsScrollViewCollapsed: {
    maxHeight: 125,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  stockChipPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stockChipOptional: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary + '35',
  },
  stockChipInactive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    opacity: 0.6,
  },
  stockChipText: {
    fontSize: 12,
  },
  stockChipTextPrimary: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockChipTextOptional: {
    fontWeight: '600',
    color: colors.primary,
  },
  stockChipTextInactive: {
    fontWeight: '500',
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  expandStockBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  expandStockBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  doableFilterInfoBoxClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginTop: 8,
  },
  doableFilterInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  doableFilterInfoAction: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8,
  },
  apiKeyStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.primary + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary + '35',
    marginBottom: 12,
  },
  apiKeyStudioBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyIngredientsGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  emptyIngredientsGuideText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  generateAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 14,
    ...shadows.card,
  },
  generateAiBtnDisabled: {
    opacity: 0.45,
  },
  generateAiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Loader IA
  aiLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aiLoadingCard: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    ...shadows.card,
  },
  aiSparkleIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aiLoadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  aiLoadingStepText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 22,
    marginBottom: 16,
  },
  aiLoadingSpinner: {
    marginVertical: 12,
  },
  aiLoadingHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  aiModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
  },
  aiModelBadgeNormal: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  aiModelBadgeFallback: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  aiModelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelLoadingBtn: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  cancelLoadingBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Clé API Modal
  apiKeyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  apiKeyModalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  apiKeyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  apiKeyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  apiKeyInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  apiKeyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  apiKeyCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  apiKeyCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  apiKeySaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  apiKeySaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
}));
