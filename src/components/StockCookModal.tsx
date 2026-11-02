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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category, RecipeIdea } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle } from '../types/shopping';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { evaluateRecipesWithStock } from '../utils/stockMatcher';
import { AISLE_CONFIGS, ALL_AISLES, classifyIngredientAisle } from '../utils/aisleClassifier';
import {
  RecipeAiService,
  formatAiModelName,
  discoverGeminiModels,
  CHEF_MOODS,
  ChefMoodOption,
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
  const { colors, isDark } = useTheme();

  // Ingrédients principaux (⭐ indispensables), optionnels et inactifs
  const [primaryIngredients, setPrimaryIngredients] = useState<string[]>([]);
  const [optionalIngredients, setOptionalIngredients] = useState<string[]>([]);
  const [inactiveIngredients, setInactiveIngredients] = useState<string[]>([]);
  const [ingredientSearchText, setIngredientSearchText] = useState<string>('');
  const [rejectedIdeaTitles, setRejectedIdeaTitles] = useState<string[]>([]);
  const [isFavoritePromptsModalVisible, setIsFavoritePromptsModalVisible] = useState(false);

  const [servings, setServings] = useState<number>(4);
  const [isVegetarian, setIsVegetarian] = useState<boolean>(false);
  const [mealType, setMealType] = useState<AllowedMealType>('Plat');
  const [isMealTypeDropdownOpen, setIsMealTypeDropdownOpen] = useState<boolean>(false);
  const [additionalPreferences, setAdditionalPreferences] = useState<string>('');

  const currentMealTypeObj = useMemo(
    () => MEAL_TYPES.find((t) => t.id === mealType) || MEAL_TYPES[1],
    [mealType]
  );

  // Flow d'invention IA en 2 étapes (Solution 4)
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
      // Pré-chargement dynamique des modèles en arrière-plan (0 latence lors du clic)
      RecipeAiService.getApiKey().then((k) => {
        if (k) discoverGeminiModels(k).catch(() => {});
      });

      if (!preserveSession) {
        const init = initializeStockIngredients(stockItems);
        setPrimaryIngredients(init.primaryIngredients);
        setOptionalIngredients(init.optionalIngredients);
        setInactiveIngredients(init.inactiveIngredients);
        setIngredientSearchText('');
        setRejectedIdeaTitles([]);
        setMealType('Plat');
        setIsMealTypeDropdownOpen(false);
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
    setIsMealTypeDropdownOpen(false);
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

  // Charger les humeurs du Chef depuis le storage si configuré
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    StorageService.getChefMoods()
      .then((moods) => {
        if (isMounted && moods && moods.length > 0) {
          setAvailableMoods(moods);
          setChefMood((current) => {
            if (moods.some((m) => m.id === current)) return current;
            return moods[0].id;
          });
        }
      })
      .catch(() => {});
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

  const handleToggleStar = (name: string) => {
    const trimmedLower = name.trim().toLowerCase();
    if (primaryIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setPrimaryIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
      setOptionalIngredients((prev) => [...prev, name]);
      setRejectedIdeaTitles([]);
    } else if (optionalIngredients.some((i) => i.toLowerCase() === trimmedLower)) {
      setOptionalIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
      setPrimaryIngredients((prev) => [...prev, name]);
      setRejectedIdeaTitles([]);
    } else {
      setInactiveIngredients((prev) => prev.filter((i) => i.toLowerCase() !== trimmedLower));
      setPrimaryIngredients((prev) => [...prev, name]);
      setRejectedIdeaTitles([]);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const allItemsWithState = useMemo(() => {
    const items: { name: string; state: IngredientSelectionState }[] = [
      ...primaryIngredients.map((name) => ({ name, state: 'primary' as const })),
      ...optionalIngredients.map((name) => ({ name, state: 'optional' as const })),
      ...inactiveIngredients.map((name) => ({ name, state: 'inactive' as const })),
    ];
    return organizeIngredientsForDisplay(items);
  }, [primaryIngredients, optionalIngredients, inactiveIngredients]);

  const getIngredientAisle = useCallback(
    (name: string): ShoppingAisle => {
      const trimmed = name.trim().toLowerCase();
      const stockMatch = stockItems.find((s) => s.name?.trim().toLowerCase() === trimmed);
      if (stockMatch?.aisle) {
        return stockMatch.aisle;
      }
      return classifyIngredientAisle(name);
    },
    [stockItems]
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

    const apiKeyForModels = key || (await RecipeAiService.getApiKey());
    if (apiKeyForModels) {
      discoverGeminiModels(apiKeyForModels)
        .then((m) => {
          setActiveModelInfo((prev) => (!prev.model ? { model: m.fast[0], isFallback: false } : prev));
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

  const _totalStockCount = stockItems.length;

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
              {aiFlowStep === 'ideas' ? (
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Fermer"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerSpacer} />
              )}
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
                    ? `Anti-doublon : ${doableRecipesForCurrentType.length} ${mealType.toLowerCase()}${doableRecipesForCurrentType.length > 1 ? 's' : ''} faisable${doableRecipesForCurrentType.length > 1 ? 's' : ''} dans votre carnet ${doableRecipesForCurrentType.length > 1 ? (mealType === 'Entrée' || mealType === 'Boisson' ? 'seront évitées' : 'seront évités') : (mealType === 'Entrée' || mealType === 'Boisson' ? 'sera évitée' : 'sera évité')}`
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
            /* ÉCRAN 4 : Configuration normale (3 Cartes & sélection d'ingrédients / options) */
            <>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => {
                  if (isMealTypeDropdownOpen) {
                    setIsMealTypeDropdownOpen(false);
                  }
                }}
              >
                {/* 1. CARTE 1 : FORMAT DU REPAS */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionCardHeader}>
                    <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
                    <Text style={styles.sectionCardTitle}>1. FORMAT DU REPAS</Text>
                  </View>
                  <View style={styles.formatRow}>
                    {/* Liste déroulante Format de repas */}
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

                    {/* Portions stepper */}
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

                    {/* Végétarien toggle compact */}
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

                  {/* Menu déroulant dépliable */}
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

                  {/* Humeur du Chef */}
                  <View style={styles.moodSection}>
                    <Text style={styles.subSectionTitle}>Humeur du Chef</Text>
                    <ScrollView
                      horizontal
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

                  {/* Instructions libres & envies */}
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

                  {/* Barre d'ajout rapide (placée en haut de la section 3) */}
                  <View style={styles.inputComposerWrapper}>
                    <UnifiedIngredientInput
                      value={ingredientSearchText}
                      onChangeText={setIngredientSearchText}
                      placeholder="Ajouter un ingrédient manquant ou hors stock..."
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

                  {/* Astuce tactile */}
                  <View style={styles.tipRow}>
                    <Ionicons name="bulb-outline" size={13} color={colors.amber} />
                    <Text style={styles.tipText}>
                      Touchez un ingrédient pour l&apos;alterner en vedette ou en normal. ✕ le met de côté.
                    </Text>
                  </View>

                  {/* Retenus pour la recette */}
                  <View style={styles.ingredientsSubHeader}>
                    <Text style={styles.ingredientsSubTitle}>
                      Retenus pour la recette ({activeCount})
                    </Text>
                    {activeCount > 0 && (
                      <TouchableOpacity
                        onPress={handleExcludeAll}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={styles.quickActionText}>Tout exclure</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {activeCount === 0 ? (
                    <View style={styles.emptyActiveGuide}>
                      <Ionicons name="restaurant-outline" size={18} color={colors.textMuted} />
                      <Text style={styles.emptyActiveGuideText}>
                        Aucun ingrédient retenu. Ajoutez-en ci-dessus pour inspirer le Chef IA.
                      </Text>
                    </View>
                  ) : (
                    groupedActiveIngredients.map(({ aisle, items }) => {
                      const aisleConfig = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
                      return (
                        <View key={`active_aisle_${aisle}`} style={styles.aisleGroup}>
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
                                key={`active_${name}`}
                                style={[
                                  styles.stockChip,
                                  isPrimary ? styles.stockChipPrimary : styles.stockChipOptional,
                                ]}
                              >
                                <TouchableOpacity
                                  style={styles.stockChipBody}
                                  onPress={() => handleToggleStar(name)}
                                  activeOpacity={0.7}
                                  accessibilityRole="button"
                                  accessibilityLabel={
                                    isPrimary
                                      ? `${name}, en vedette. Toucher pour repasser en normal`
                                      : `${name}, normal. Toucher pour passer en vedette`
                                  }
                                >
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
                                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Mettre ${name} de côté`}
                                >
                                  <Ionicons
                                    name="close"
                                    size={14}
                                    color={isPrimary ? '#FFFFFF' : colors.primary}
                                  />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Mis de côté */}
                  {inactiveIngredients.length > 0 && (
                    <View style={styles.inactiveSection}>
                      <View style={styles.ingredientsSubHeader}>
                        <Text style={styles.ingredientsSubTitle}>
                          Mis de côté ({inactiveIngredients.length})
                        </Text>
                        <TouchableOpacity
                          onPress={handleIncludeAll}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Text style={styles.quickActionText}>Tout inclure</Text>
                        </TouchableOpacity>
                      </View>
                      {groupedInactiveIngredients.map(({ aisle, items }) => {
                        const aisleConfig = AISLE_CONFIGS[aisle] || AISLE_CONFIGS['Autre'];
                        return (
                          <View key={`inactive_aisle_${aisle}`} style={styles.aisleGroup}>
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

              {/* 4. PIED DE PAGE FIXE (Sticky Bottom Bar) */}
              <View style={styles.stickyFooterContainer}>
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
                    💡 Trouver 3 idées {formatMealTypeGenitive(mealType)} ({activeCount} ingrédient{activeCount > 1 ? 's' : ''})
                  </Text>
                </TouchableOpacity>
              </View>
            </>
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

  // Cartes principales & en-têtes
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Carte 1 : Format du repas
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeDropdownTrigger: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
  mealTypeDropdownTriggerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  mealTypeDropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    marginRight: 4,
  },
  mealTypeDropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mealTypeDropdownMenu: {
    marginTop: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mealTypeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeDropdownItemLast: {
    borderBottomWidth: 0,
  },
  mealTypeDropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  mealTypeDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealTypeDropdownIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeDropdownIconBoxActive: {
    backgroundColor: colors.primary,
  },
  mealTypeDropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  mealTypeDropdownItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  servingsCompactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtnCompact: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  servingsLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  servingsValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  veggieCompactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
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

  // Carte 2 : Style & Envies
  subSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  moodSection: {
    marginBottom: 12,
  },
  moodSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
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
  promptInputSection: {
    marginTop: 2,
  },
  preferencesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  favoritePromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  promptSparkleIcon: {
    marginRight: 6,
  },
  aiPreferencesInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearPromptBtn: {
    padding: 4,
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

  // Rayons d'ingrédients (Section 3)
  aisleGroup: {
    marginBottom: 10,
  },
  aisleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginTop: 2,
  },
  aisleIconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisleTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  aisleCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  aisleCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Carte 3 : Ingrédients
  ingredientsSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ingredientsSubTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyActiveGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  emptyActiveGuideText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: 16,
    opacity: 0.7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  stockChipBody: {
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  stockChipCloseBtn: {
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  tipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  inputComposerWrapper: {
    zIndex: 100,
    marginBottom: 10,
  },
  inactiveSection: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
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

  // Sticky Footer & Bouton IA
  stickyFooterContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
  generateAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
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
