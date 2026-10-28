import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Modal,
  Platform,
  Vibration,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Recipe } from '../types/recipe';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { Colors } from '../theme/colors';
import { styles } from './RecipeDetailScreen.styles';
import { useTheme } from '../theme/ThemeContext';
import { StarRating } from '../components/StarRating';
import { CookingModeModal } from '../components/CookingModeModal';
import { RecipeQrModal } from '../components/RecipeQrModal';
import { RecipePrintModal } from '../components/RecipePrintModal';
import { RecipeIngredientsList } from '../components/recipe-detail/RecipeIngredientsList';
import { RecipeInstructionsList } from '../components/recipe-detail/RecipeInstructionsList';
import { RecipeShareService } from '../services/recipeShareService';
import {
  formatDuration,
  scaleQuantity,
  extractTimersFromText,
  formatTimerSeconds,
  getLocalDateString,
  normalizeString,
} from '../utils/helpers';
import { prepareUserAllergens, evaluateRecipeAllergens } from '../utils/allergenMatcher';
import { formatQuantityWithUnit } from '../constants/units';
import { findLinkedRecipeForIngredient, getLinkedRecipesForRecipe } from '../utils/recipeLinkMatcher';
import { VocabularyService } from '../services/vocabularyService';
import { FridgeItem } from '../types/fridge';
import { prepareStockItems, evaluateRecipeStock } from '../utils/stockMatcher';
import { RecipeAiService, PimpSuggestion, SosSubstituteSuggestion } from '../services/recipeAiService';
import {
  ConversionMode,
  convertIngredientQuantity,
  getNextConversionTarget,
  isIngredientConvertible,
} from '../utils/unitConverter';

interface InlineStepTimer {
  id: string;
  stepId: string;
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

interface RecipeDetailScreenProps {
  recipe: Recipe;
  allRecipes?: Recipe[];
  onOpenLinkedRecipe?: (recipeId: string) => void;
  previousRecipeTitle?: string;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateRating: (id: string, rating: number, userNote?: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onNavigateToShoppingList?: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipe,
  allRecipes = [],
  onOpenLinkedRecipe,
  previousRecipeTitle,
  onBack,
  onEdit,
  onDelete,
  onUpdateRating,
  onUpdateTags,
  onNavigateToShoppingList,
}) => {
  // Maintient l'écran du smartphone allumé pendant la lecture de la fiche recette
  useKeepAwake();

  const { isDark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Nombre de portions ajustables dynamiquement
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 4);
  const [isAddingToShoppingList, setIsAddingToShoppingList] = useState(false);
  const [isShoppingModalVisible, setIsShoppingModalVisible] = useState(false);
  const [shoppingSelection, setShoppingSelection] = useState<Record<string, boolean>>({});

  // Pimp Recipe feature state
  const [isPimping, setIsPimping] = useState(false);
  const [isPimpModalVisible, setIsPimpModalVisible] = useState(false);
  const [pimpSuggestions, setPimpSuggestions] = useState<PimpSuggestion[]>([]);
  const [pimpChefNote, setPimpChefNote] = useState<string>('');

  // SOS Replacement feature state
  const [isSosLoading, setIsSosLoading] = useState(false);
  const [isSosModalVisible, setIsSosModalVisible] = useState(false);
  const [sosTargetIngredient, setSosTargetIngredient] = useState('');
  const [sosSuggestions, setSosSuggestions] = useState<SosSubstituteSuggestion[]>([]);
  const [sosChefNote, setSosChefNote] = useState('');

  // Synchronise lorsque la recette change
  React.useEffect(() => {
    const fetchDefaultServings = async () => {
      try {
        const defaultServings = await StorageService.getDefaultServings();
        setCurrentServings(defaultServings);
      } catch (e) {
        setCurrentServings(recipe.servings || 4);
      }
    };
    fetchDefaultServings();
  }, [recipe.id, recipe.servings]);

  // Modes de conversion d'unités (global et overrides par ingrédient)
  const [globalConversionMode, setGlobalConversionMode] = useState<ConversionMode>('original');
  const [ingredientModes, setIngredientModes] = useState<Record<string, ConversionMode>>({});

  const handleCycleGlobalConversion = () => {
    setGlobalConversionMode((prev) => {
      if (prev === 'original') return 'mass';
      if (prev === 'mass') return 'volume';
      return 'original';
    });
    setIngredientModes({});
  };

  const handleCycleIngredientUnit = (ing: Recipe['ingredients'][number]) => {
    const currentMode = ingredientModes[ing.id] ?? globalConversionMode;
    const density = VocabularyService.getDensity(ing.canonicalId || ing.name);
    const nextMode = getNextConversionTarget(currentMode, ing.unit, density);
    setIngredientModes((prev) => ({
      ...prev,
      [ing.id]: nextMode,
    }));
  };

  // Checklists locales pour la session de cuisine
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Allergènes de l'utilisateur et détection
  const [userAllergens, setUserAllergens] = useState<UserAllergenItem[]>([]);
  const [stockItems, setStockItems] = useState<FridgeItem[]>([]);

  useEffect(() => {
    StorageService.getUserAllergens()
      .then(setUserAllergens)
      .catch((e) => console.error('Erreur chargement allergènes sur RecipeDetailScreen:', e));
    StorageService.getFridgeItems()
      .then(setStockItems)
      .catch((e) => console.error('Erreur chargement stock sur RecipeDetailScreen:', e));
  }, []);

  const stockEvaluation = useMemo(() => {
    if (stockItems.length === 0 || !recipe) return null;
    const prepared = prepareStockItems(stockItems);
    return evaluateRecipeStock(recipe, prepared, { assumePantryStaplesAvailable: true });
  }, [recipe, stockItems]);

  const preparedAllergens = useMemo(
    () => prepareUserAllergens(userAllergens),
    [userAllergens]
  );

  const allergenEval = useMemo(
    () => evaluateRecipeAllergens(recipe, preparedAllergens),
    [recipe, preparedAllergens]
  );

  const allergenIngredientIdsSet = useMemo(() => {
    const set = new Set<string>();
    allergenEval.allergenIngredients.forEach((a) => {
      if (a.ingredient.id) set.add(a.ingredient.id);
      set.add(normalizeString(a.ingredient.name));
    });
    return set;
  }, [allergenEval]);

  // Gestion rapide des tags de la recette
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  const [modalDraftTags, setModalDraftTags] = useState<string[]>(recipe.tags || []);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
  const [detailTagInput, setDetailTagInput] = useState('');

  const existingTagsAcrossCarnet = useMemo(() => {
    const set = new Set<string>();
    (allRecipes || []).forEach((r) => {
      (r.tags || []).forEach((t) => {
        const trimmed = typeof t === 'string' ? t.trim() : '';
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allRecipes]);

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

  const detailSuggestedTags = useMemo(() => {
    const allAvailable = new Set<string>();
    existingTagsAcrossCarnet.forEach((t) => allAvailable.add(t));
    POPULAR_TAG_SUGGESTIONS.forEach((t) => allAvailable.add(t));
    return Array.from(allAvailable).filter(
      (cand) => !modalDraftTags.some((t) => t.toLowerCase() === cand.toLowerCase())
    );
  }, [existingTagsAcrossCarnet, modalDraftTags]);

  const handleAddModalTag = (tagText: string) => {
    const trimmed = tagText.trim().replace(/^#+/, '');
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!modalDraftTags.some((t) => t.toLowerCase() === formatted.toLowerCase())) {
      setModalDraftTags((prev) => [...prev, formatted]);
    }
    setDetailTagInput('');
  };

  const handleRemoveModalTag = (tagText: string) => {
    setModalDraftTags((prev) => prev.filter((t) => t.toLowerCase() !== tagText.toLowerCase()));
  };

  const handleSaveTags = () => {
    if (onUpdateTags) {
      onUpdateTags(recipe.id, modalDraftTags);
    }
    setIsTagModalVisible(false);
  };

  // Résolution et indexation des recettes liées (ex: pâte brisée maison pour une quiche)
  const linkedRecipesMap = useMemo(() => {
    if (!allRecipes || allRecipes.length === 0) return new Map<string, Recipe>();
    const map = new Map<string, Recipe>();
    (recipe.ingredients || []).forEach((ing) => {
      const matched = findLinkedRecipeForIngredient(ing, allRecipes, recipe.id);
      if (matched) {
        map.set(ing.id, matched);
      }
    });
    return map;
  }, [recipe.ingredients, allRecipes, recipe.id]);

  const linkedPreparations = useMemo(() => {
    if (!allRecipes || allRecipes.length === 0) return [];
    return getLinkedRecipesForRecipe(recipe, allRecipes);
  }, [recipe, allRecipes]);

  // Regroupement culinaire par sections ("Livre de Chef")
  const ingredientGroups = useMemo(() => {
    const main = (recipe.ingredients || []).filter((i) => !i.isPantryStaple && !i.isOptional);
    const pantry = (recipe.ingredients || []).filter((i) => Boolean(i.isPantryStaple) && !i.isOptional);
    const optional = (recipe.ingredients || []).filter((i) => Boolean(i.isOptional));

    const hasSubsections = pantry.length > 0 || optional.length > 0;

    const list: {
      key: 'main' | 'pantry' | 'optional';
      title: string;
      subtitle?: string;
      iconName?: string;
      items: typeof recipe.ingredients;
    }[] = [];

    if (main.length > 0) {
      list.push({
        key: 'main',
        title: hasSubsections ? 'Ingrédients principaux' : '',
        subtitle: undefined,
        iconName: 'basket-outline',
        items: main,
      });
    }

    if (pantry.length > 0) {
      list.push({
        key: 'pantry',
        title: 'Assaisonnements & condiments',
        subtitle: 'Huiles, vinaigres, assaisonnements & épices usuelles',
        iconName: 'sparkles-outline',
        items: pantry,
      });
    }

    if (optional.length > 0) {
      list.push({
        key: 'optional',
        title: 'En finition & au goût',
        subtitle: 'Touches facultatives ou décoratives',
        iconName: 'leaf-outline',
        items: optional,
      });
    }

    return { groups: list, hasSubsections };
  }, [recipe.ingredients]);

  // Minuteurs interactifs autonomes pour chaque étape
  const [inlineTimers, setInlineTimers] = useState<Record<string, InlineStepTimer>>({});

  // Synchronisation de l'état lors d'un changement de recette (Pattern React 19)
  const [prevRecipeId, setPrevRecipeId] = useState(recipe.id);
  if (prevRecipeId !== recipe.id) {
    setPrevRecipeId(recipe.id);
    setGlobalConversionMode('original');
    setIngredientModes({});
    setModalDraftTags(recipe.tags || []);
    setInlineTimers({});
  }

  // Alerte haptique et sonore lors de la fin d'un minuteur
  const triggerInlineTimerAlert = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 800]);
    }
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const playTone = (freq: number, delay: number, duration: number) => {
          setTimeout(() => {
            try {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + duration);
            } catch (e) {}
          }, delay);
        };
        playTone(880, 0, 0.4);
        playTone(1174.66, 150, 0.6);
        playTone(1760, 400, 0.8);
      }
    } catch (e) {}
  };

  // Compte à rebours temps réel pour l'ensemble des minuteurs actifs
  useEffect(() => {
    const hasRunningTimer = Object.values(inlineTimers).some(
      (t) => t.isRunning && t.remainingSeconds > 0
    );

    if (!hasRunningTimer) return;

    const interval = setInterval(() => {
      setInlineTimers((prev) => {
        let hasChanges = false;
        const nextState = { ...prev };

        Object.keys(nextState).forEach((key) => {
          const timer = nextState[key];
          if (timer.isRunning && timer.remainingSeconds > 0) {
            hasChanges = true;
            const newRemaining = timer.remainingSeconds - 1;
            if (newRemaining === 0) {
              triggerInlineTimerAlert();
              nextState[key] = {
                ...timer,
                remainingSeconds: 0,
                isRunning: false,
              };
            } else {
              nextState[key] = {
                ...timer,
                remainingSeconds: newRemaining,
              };
            }
          }
        });

        return hasChanges ? nextState : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inlineTimers]);

  const handleStartInlineTimer = (
    stepId: string,
    stepIndex: number,
    timerId: string,
    label: string,
    totalSeconds: number
  ) => {
    const key = `${stepId}_${timerId}`;
    setInlineTimers((prev) => ({
      ...prev,
      [key]: {
        id: key,
        stepId,
        stepIndex,
        label,
        totalSeconds,
        remainingSeconds: totalSeconds,
        isRunning: true,
      },
    }));
  };

  const handleToggleInlineTimerPause = (key: string) => {
    setInlineTimers((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          isRunning: !existing.isRunning,
        },
      };
    });
  };

  const handleAddMinuteToInlineTimer = (key: string) => {
    setInlineTimers((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newRem = existing.remainingSeconds + 60;
      return {
        ...prev,
        [key]: {
          ...existing,
          remainingSeconds: newRem,
          totalSeconds: Math.max(existing.totalSeconds, newRem),
          isRunning: true,
        },
      };
    });
  };

  const handleStopInlineTimer = (key: string) => {
    setInlineTimers((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Modal Mode Cuisine Pas-à-Pas
  const [isCookingModeVisible, setIsCookingModeVisible] = useState(false);

  // Modal pour modifier l'astuce / commentaire
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState(recipe.userNote || '');

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepCheck = (id: string) => {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteConfirm = () => {
    Alert.alert(
      'Supprimer la recette',
      `Êtes-vous sûr de vouloir supprimer "${recipe.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete(recipe.id),
        },
      ]
    );
  };

  const handleSaveNote = () => {
    onUpdateRating(recipe.id, recipe.rating, noteText.trim());
    setIsNoteModalVisible(false);
  };

  const handleSosReplacement = async (ingredientName: string) => {
    if (isSosLoading) return;
    setIsSosLoading(true);
    setSosTargetIngredient(ingredientName);

    try {
      const stockItems = await StorageService.getFridgeItems();
      const stockNames = stockItems.map(item => item.name);

      if (stockNames.length === 0) {
        Alert.alert('Frigo vide', 'Ajoutez des ingrédients dans votre stock pour que l\'IA puisse vous proposer des remplacements !');
        setIsSosLoading(false);
        return;
      }

      const result = await RecipeAiService.suggestSubstituteWithStock(ingredientName, stockNames);

      if (result && result.suggestions && result.suggestions.length > 0) {
        setSosSuggestions(result.suggestions);
        setSosChefNote(result.chefNote);
        setIsSosModalVisible(true);
      } else {
        Alert.alert('Aucune suggestion', 'Le Chef n\'a pas trouvé de remplacement avec votre stock actuel.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de contacter le Chef IA.');
    } finally {
      setIsSosLoading(false);
    }
  };

  const handlePimpRecipe = async () => {
    if (isPimping) return;
    setIsPimping(true);

    try {
      // Fetch user's current fridge stock
      const stockItems = await StorageService.getFridgeItems();
      const stockNames = stockItems.map(item => item.name);

      if (stockNames.length === 0) {
        Alert.alert('Frigo vide', 'Ajoutez des ingrédients dans votre stock pour que le Chef puisse vous proposer des améliorations !');
        setIsPimping(false);
        return;
      }

      // Call AI Service
      const result = await RecipeAiService.pimpRecipeWithStock(recipe, stockNames);

      if (result && result.suggestions && result.suggestions.length > 0) {
        setPimpSuggestions(result.suggestions);
        setPimpChefNote(result.chefNote);
        setIsPimpModalVisible(true);
      } else {
        Alert.alert('Aucune suggestion', 'Le Chef n\'a pas trouvé d\'amélioration pertinente avec votre stock actuel.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de contacter le Chef IA.');
    } finally {
      setIsPimping(false);
    }
  };

  const handleOpenShoppingModal = () => {
    // Les ingrédients essentiels sont cochés par défaut.
    // Les fonds de placard (sel, poivre, huile...) et les ingrédients optionnels sont décochés !
    const initialSel: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      const isStaple = Boolean(ing.isPantryStaple);
      const isOpt = Boolean(ing.isOptional);
      initialSel[ing.id] = !isStaple && !isOpt;
    });
    setShoppingSelection(initialSel);
    setIsShoppingModalVisible(true);
  };

  const handleToggleShoppingItem = (id: string) => {
    setShoppingSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAllShopping = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      updated[ing.id] = select;
    });
    setShoppingSelection(updated);
  };

  const handleSelectEssentialsOnly = () => {
    const updated: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      updated[ing.id] = !ing.isPantryStaple && !ing.isOptional;
    });
    setShoppingSelection(updated);
  };

  const handleConfirmAddToShopping = async () => {
    const selectedIds = Object.keys(shoppingSelection).filter((id) => shoppingSelection[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Aucun ingrédient', 'Veuillez sélectionner au moins un ingrédient à ajouter.');
      return;
    }

    setIsAddingToShoppingList(true);
    try {
      const { addedCount } = await StorageService.addRecipeToShoppingList(
        recipe,
        currentServings,
        selectedIds
      );
      setIsShoppingModalVisible(false);
      Alert.alert(
        '🛒 Ajouté à la liste de courses',
        `${addedCount} ingrédient${addedCount > 1 ? 's ajoutés' : ' ajouté'} pour ${currentServings} personne${currentServings > 1 ? 's' : ''} (rayons triés automatiquement) !`,
        [
          { text: 'Continuer', style: 'cancel' },
          ...(onNavigateToShoppingList
            ? [
                {
                  text: 'Voir ma liste',
                  style: 'default' as const,
                  onPress: onNavigateToShoppingList,
                },
              ]
            : []),
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter les ingrédients à la liste de courses.");
    } finally {
      setIsAddingToShoppingList(false);
    }
  };

  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Top Floating Navigation Header */}
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={onBack}
            style={previousRecipeTitle ? styles.navBtnWithLabel : styles.navBtn}
            accessibilityLabel={previousRecipeTitle ? `Retour à ${previousRecipeTitle}` : 'Retour'}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            {previousRecipeTitle ? (
              <Text style={styles.navBackLabel} numberOfLines={1}>
                {previousRecipeTitle}
              </Text>
            ) : null}
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity
              onPress={() => onEdit(recipe)}
              style={styles.navBtn}
              accessibilityLabel="Modifier la recette"
            >
              <Ionicons name="create-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsQrModalVisible(true)}
              style={styles.navBtn}
              accessibilityLabel="Partager la fiche recette"
            >
              <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPrintModalVisible(true)}
              style={styles.navBtn}
              accessibilityLabel="Imprimer la fiche recette"
            >
              <Ionicons name="print-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteConfirm}
              style={[styles.navBtn, styles.navBtnDanger]}
              accessibilityLabel="Supprimer la recette"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Image (compacte si présente, masquée si absente pour rapprocher les ingrédients) */}
          {recipe.imageUrl && recipe.imageUrl.trim().length > 0 ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.heroBadgesRow}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{recipe.category}</Text>
                </View>
                {recipe.isVegetarian && (
                  <View style={styles.vegeHeroPill}>
                    <Ionicons name="leaf" size={11} color="#FFFFFF" />
                    <Text style={styles.vegeHeroPillText}>Végétarien</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Title, Badges, Compact Rating & Tags */}
          <View style={styles.headerInfo}>
            {(!recipe.imageUrl || recipe.imageUrl.trim().length === 0) && (
              <View style={styles.headerBadgesRow}>
                <View style={styles.categoryPillInline}>
                  <Text style={styles.categoryPillTextInline}>{recipe.category}</Text>
                </View>
                {recipe.isVegetarian && (
                  <View style={styles.vegeHeroPillInline}>
                    <Ionicons name="leaf" size={11} color="#FFFFFF" />
                    <Text style={styles.vegeHeroPillText}>Végétarien</Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.title}>{recipe.title}</Text>
            {recipe.description ? (
              <Text style={styles.description}>{recipe.description}</Text>
            ) : null}

            {/* Notation, Pimper & Astuce intégrées en ligne compacte */}
            <View style={styles.compactMetaRow}>
              <View style={styles.compactRatingLeft}>
                <StarRating
                  rating={recipe.rating}
                  size={18}
                  interactive={true}
                  showScore={true}
                  showClear={recipe.rating > 0}
                  onRatingChange={(newRating) => onUpdateRating(recipe.id, newRating)}
                />
              </View>
              <View style={styles.compactMetaActionsRight}>
                <TouchableOpacity
                  onPress={handlePimpRecipe}
                  style={styles.compactPimpBtn}
                  disabled={isPimping}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.75}
                  accessibilityLabel="Pimper la recette avec mon stock"
                >
                  {isPimping ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                      <Text style={styles.compactPimpBtnText}>Pimper</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsNoteModalVisible(true)}
                  style={styles.compactNoteBtn}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={recipe.userNote ? 'bulb' : 'bulb-outline'}
                    size={14}
                    color={recipe.userNote ? colors.amber : colors.primary}
                  />
                  <Text style={[styles.compactNoteBtnText, recipe.userNote && { color: colors.amber }]}>
                    {recipe.userNote ? 'Astuce' : '+ Astuce'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {recipe.userNote ? (
              <TouchableOpacity
                onPress={() => setIsNoteModalVisible(true)}
                style={styles.compactChefNoteBox}
                activeOpacity={0.8}
              >
                <Ionicons name="bulb-outline" size={14} color={colors.amber} style={{ marginRight: 6 }} />
                <Text style={styles.compactChefNoteText} numberOfLines={2}>
                  {recipe.userNote}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Tags / Étiquettes */}
            <View style={styles.detailTagsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.detailTagsScroll}
              >
                {recipe.tags && recipe.tags.length > 0
                  ? recipe.tags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.detailTagBadge}
                        onPress={() => {
                          setModalDraftTags(recipe.tags || []);
                          setIsTagModalVisible(true);
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
                        <Text style={styles.detailTagText}>#{tag}</Text>
                      </TouchableOpacity>
                    ))
                  : null}
                <TouchableOpacity
                  style={styles.detailAddTagBtn}
                  onPress={() => {
                    setModalDraftTags(recipe.tags || []);
                    setIsTagModalVisible(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
                  <Text style={styles.detailAddTagBtnText}>
                    {recipe.tags && recipe.tags.length > 0 ? '+ Tag' : '+ Tags'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          {/* Key Facts / Metadata Grid épuré */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Ionicons name="hourglass-outline" size={17} color={colors.primary} />
              <Text style={styles.metaValue}>{formatDuration(recipe.prepTimeMinutes)}</Text>
              <Text style={styles.metaLabel}>Préparation</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="flame-outline" size={17} color={colors.primary} />
              <Text style={styles.metaValue}>{formatDuration(recipe.cookTimeMinutes)}</Text>
              <Text style={styles.metaLabel}>Cuisson</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="people-outline" size={17} color={colors.primary} />
              <Text style={styles.metaValue}>{currentServings}</Text>
              <Text style={styles.metaLabel}>Portions</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="speedometer-outline" size={17} color={colors.primary} />
              <Text style={styles.metaValue}>{recipe.difficulty}</Text>
              <Text style={styles.metaLabel}>Difficulté</Text>
            </View>
          </View>

          {/* Bannière d'alerte Allergènes si présence détectée */}
          {allergenEval.hasAllergen && (
            <View style={[styles.allergenAlertCard, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
              <View style={styles.allergenAlertHeader}>
                <Ionicons name="warning" size={22} color={colors.danger} />
                <Text style={[styles.allergenAlertTitle, { color: colors.danger }]}>
                  Attention : Présence d’allergènes
                </Text>
              </View>
              <Text style={[styles.allergenAlertDesc, { color: colors.textPrimary }]}>
                Cette recette contient des aliments correspondant à vos allergies enregistrées :
              </Text>
              <View style={styles.allergenAlertChipsRow}>
                {allergenEval.allergenIngredients.map((item, idx) => (
                  <View
                    key={`allg_ing_${item.ingredient.id || idx}`}
                    style={[styles.allergenBadgeChip, { backgroundColor: colors.danger }]}
                  >
                    <Ionicons name="alert-circle" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.allergenBadgeChipText}>
                      {item.ingredient.name}
                      {item.allergenFamily ? ` (${item.allergenFamily})` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mention discrète de précaution si des ingrédients hors lexique sont présents (Arbitrage 5) */}
          {!allergenEval.hasAllergen && allergenEval.hasUnrecognizedIngredients && (
            <View style={[styles.allergenAlertCard, { backgroundColor: colors.amberLight, borderColor: colors.amber, paddingVertical: 8, paddingHorizontal: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.amber} />
                <Text style={{ fontSize: 12, color: colors.textPrimary, flex: 1, fontWeight: '500' }}>
                  Certains ingrédients non répertoriés nécessitent une vérification manuelle de vos allergènes.
                </Text>
              </View>
            </View>
          )}

          {/* Ingredients Section with Dynamic Servings Stepper */}
          <RecipeIngredientsList
            recipe={recipe}
            currentServings={currentServings}
            onServingsChange={setCurrentServings}
            stockEvaluation={stockEvaluation}
            stockItemsLength={stockItems.length}
            globalConversionMode={globalConversionMode}
            onCycleGlobalConversion={handleCycleGlobalConversion}
            ingredientGroups={ingredientGroups}
            checkedIngredients={checkedIngredients}
            onToggleIngredientCheck={toggleIngredientCheck}
            ingredientModes={ingredientModes}
            onCycleIngredientUnit={handleCycleIngredientUnit}
            allergenIngredientIdsSet={allergenIngredientIdsSet}
            linkedPreparations={linkedPreparations}
            linkedRecipesMap={linkedRecipesMap}
            onOpenLinkedRecipe={onOpenLinkedRecipe}
            onSosRequest={handleSosReplacement}
            sosLoadingIngredient={isSosLoading ? sosTargetIngredient : null}
          />

          {/* Steps Section */}
          <RecipeInstructionsList
            steps={recipe.steps}
            checkedSteps={checkedSteps}
            onToggleStepCheck={toggleStepCheck}
            inlineTimers={inlineTimers}
            onStartInlineTimer={handleStartInlineTimer}
            onToggleInlineTimerPause={handleToggleInlineTimerPause}
            onAddMinuteToInlineTimer={handleAddMinuteToInlineTimer}
            onStopInlineTimer={handleStopInlineTimer}
          />
        </ScrollView>

        {/* Bandeau d’actions flottant en bas : Courses & Cuisiner */}
        <View
          style={[
            styles.floatingBottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={handleOpenShoppingModal}
            activeOpacity={0.85}
            disabled={isAddingToShoppingList}
            accessibilityLabel="Ajouter aux courses"
          >
            <Ionicons name="cart" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingPimpBtn}
            onPress={handlePimpRecipe}
            activeOpacity={0.85}
            disabled={isPimping}
          >
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={styles.floatingPimpBtnText}>Pimper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.floatingCookBtn}
            onPress={() => setIsCookingModeVisible(true)}
            activeOpacity={0.85}
            accessibilityLabel="Lancer le mode cuisine"
          >
            <Ionicons name="play" size={16} color="#FFFFFF" />
            <Text style={styles.floatingCookBtnText}>Cuisiner</Text>
          </TouchableOpacity>
        </View>

        {/* Modal Modification Astuce */}
        <Modal
          visible={isNoteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsNoteModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Astuce ou note personnelle</Text>
              <Text style={styles.modalSubtitle}>
                Ajoutez vos secrets de cuisson ou remarques pour cette recette.
              </Text>

              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ex: Remplacer le beurre par de l'huile de sésame..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsNoteModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveNote}
                >
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de sélection avant ajout à la liste de courses */}
        <Modal
          visible={isShoppingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsShoppingModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.shoppingDialogCard}>
              <View style={styles.shoppingDialogHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shoppingDialogTitle}>Ajouter aux courses</Text>
                  <Text style={styles.shoppingDialogSubtitle}>
                    {recipe.title} • {currentServings} pers.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsShoppingModalVisible(false)}
                  style={styles.shoppingDialogCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Raccourcis de sélection */}
              <View style={styles.shoppingQuickBtnsRow}>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={handleSelectEssentialsOnly}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Indispensables uniquement</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={() => handleSelectAllShopping(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Tout cocher</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={() => handleSelectAllShopping(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Tout décocher</Text>
                </TouchableOpacity>
              </View>

              {/* Liste des ingrédients organisée en sous-sections Livre de Chef */}
              <ScrollView style={styles.shoppingListScroll} showsVerticalScrollIndicator={true}>
                {ingredientGroups.groups.map((group) => (
                  <View key={`shop_group_${group.key}`} style={styles.shoppingGroupBlock}>
                    <View style={styles.shoppingGroupHeader}>
                      <View style={styles.shoppingGroupHeaderTop}>
                        <Ionicons
                          name={
                            group.key === 'main'
                              ? 'basket-outline'
                              : group.key === 'pantry'
                              ? 'sparkles-outline'
                              : 'leaf-outline'
                          }
                          size={13}
                          color={group.key === 'main' ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.shoppingGroupTitle}>
                          {group.key === 'main'
                            ? 'INGRÉDIENTS PRINCIPAUX'
                            : group.key === 'pantry'
                            ? 'ASSAISONNEMENTS & CONDIMENTS'
                            : 'EN FINITION & AU GOÛT'}
                        </Text>
                      </View>
                      {group.key !== 'main' ? (
                        <Text style={styles.shoppingGroupHint}>
                          {group.key === 'pantry'
                            ? 'Cochez si vous en manquez dans vos placards'
                            : 'Touches facultatives ou selon vos préférences'}
                        </Text>
                      ) : null}
                    </View>

                    {group.items.map((ing) => {
                      const isChecked = !!shoppingSelection[ing.id];
                      const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, currentServings);

                      return (
                        <TouchableOpacity
                          key={`shop_item_${ing.id}`}
                          style={[styles.shoppingItemRow, isChecked && styles.shoppingItemRowChecked]}
                          onPress={() => handleToggleShoppingItem(ing.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isChecked ? colors.primary : colors.textMuted}
                            style={{ marginRight: 10 }}
                          />
                          <Text style={[styles.shoppingItemName, !isChecked && styles.shoppingItemNameMuted]}>
                            {ing.name}
                          </Text>
                          {scaledQty ? (
                            <Text style={[styles.shoppingItemQty, !isChecked && styles.shoppingItemNameMuted]}>
                              {formatQuantityWithUnit(scaledQty, ing.unit)}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

              {/* Footer avec action */}
              <View style={styles.shoppingDialogFooter}>
                <TouchableOpacity
                  style={styles.shoppingCancelBtn}
                  onPress={() => setIsShoppingModalVisible(false)}
                >
                  <Text style={styles.shoppingCancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shoppingConfirmBtn,
                    Object.values(shoppingSelection).filter(Boolean).length === 0 && styles.shoppingConfirmBtnDisabled,
                  ]}
                  onPress={handleConfirmAddToShopping}
                  disabled={isAddingToShoppingList || Object.values(shoppingSelection).filter(Boolean).length === 0}
                >
                  <Ionicons name="cart" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shoppingConfirmBtnText}>
                    Ajouter ({Object.values(shoppingSelection).filter(Boolean).length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de gestion rapide des tags de la recette */}
        <Modal
          visible={isTagModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTagModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.tagDialogCard}>
                <View style={styles.tagDialogHeader}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.tagDialogIconWrap}>
                      <Ionicons name="pricetag" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tagDialogTitle}>Tags & Étiquettes</Text>
                      <Text style={styles.tagDialogSubtitle} numberOfLines={1}>
                        {recipe.title}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsTagModalVisible(false)}
                    style={styles.shoppingDialogCloseBtn}
                    accessibilityLabel="Fermer"
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Saisie d'un nouveau tag */}
                <View style={styles.modalTagInputRow}>
                  <View style={styles.modalTagInputWrap}>
                    <Ionicons
                      name="pricetag-outline"
                      size={15}
                      color={colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <TextInput
                      style={styles.modalTagTextInput}
                      value={detailTagInput}
                      onChangeText={setDetailTagInput}
                      placeholder="Nouveau tag personnalisé..."
                      placeholderTextColor={colors.textMuted}
                      onSubmitEditing={() => handleAddModalTag(detailTagInput)}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.modalAddTagBtn,
                      !detailTagInput.trim() && styles.modalAddTagBtnDisabled,
                    ]}
                    onPress={() => handleAddModalTag(detailTagInput)}
                    disabled={!detailTagInput.trim()}
                    activeOpacity={0.8}
                    accessibilityLabel="Ajouter le tag"
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Tags assignés */}
                <Text style={styles.tagModalSectionLabel}>
                  {modalDraftTags.length > 0
                    ? 'Tags associés à cette recette :'
                    : 'Aucun tag associé pour le moment'}
                </Text>
                {modalDraftTags.length > 0 && (
                  <View style={styles.modalAssignedTagsWrap}>
                    {modalDraftTags.map((t) => (
                      <View key={t} style={styles.modalAssignedTagChip}>
                        <Text style={styles.modalAssignedTagText}>#{t}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveModalTag(t)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          style={styles.modalRemoveTagBtn}
                          accessibilityLabel={`Supprimer le tag ${t}`}
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Suggestions */}
                {detailSuggestedTags.length > 0 && (
                  <View style={styles.modalSuggestedContainer}>
                    <Text style={styles.tagModalSectionLabel}>Suggestions du carnet :</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.modalSuggestedScroll}
                    >
                      {detailSuggestedTags.map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={styles.modalSuggestedTagChip}
                          onPress={() => handleAddModalTag(t)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                          <Text style={styles.modalSuggestedTagText}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Boutons d'actions */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.tagModalCancelBtn}
                    onPress={() => setIsTagModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagModalCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tagModalSaveBtn}
                    onPress={handleSaveTags}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.tagModalSaveBtnText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Modal Mode Cuisine Pas-à-Pas Plein Écran */}
        <CookingModeModal
          visible={isCookingModeVisible}
          recipe={recipe}
          servings={currentServings}
          onClose={() => setIsCookingModeVisible(false)}
          onQuickRate={(rating) => onUpdateRating(recipe.id, rating)}
        />

        {/* Modal QR Code de partage */}
        <RecipeQrModal
          visible={isQrModalVisible}
          recipe={recipe}
          servings={currentServings}
          onClose={() => setIsQrModalVisible(false)}
        />

        {/* Modal d'impression et export PDF A4 */}
        <RecipePrintModal
          visible={isPrintModalVisible}
          recipe={recipe}
          initialServings={currentServings}
          onClose={() => setIsPrintModalVisible(false)}
        />

        {/* Bandeau flottant des minuteurs en cours si au moins un minuteur est actif */}
        {Object.values(inlineTimers).length > 0 && (
          <View style={styles.floatingTimersSummaryBar}>
            <Ionicons name="timer" size={16} color="#FFFFFF" />
            <Text style={styles.floatingTimersSummaryText} numberOfLines={1}>
              {Object.values(inlineTimers).length} minuteur{Object.values(inlineTimers).length > 1 ? 's' : ''} :{' '}
              {Object.values(inlineTimers)
                .map(
                  (t) =>
                    `Étape ${t.stepIndex + 1} (${
                      t.remainingSeconds === 0 ? 'Fin !' : formatTimerSeconds(t.remainingSeconds)
                    })`
                )
                .join(' • ')}
            </Text>
          </View>
        )}

        {/* Modal SOS Remplacement */}
        <Modal
          visible={isSosModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsSosModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.pimpModalCard}>
              <View style={styles.pimpModalHeader}>
                <Text style={styles.pimpModalTitle}>SOS : {sosTargetIngredient}</Text>
                <TouchableOpacity
                  onPress={() => setIsSosModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Fermer la fenêtre SOS"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {sosChefNote ? (
                  <Text style={styles.pimpChefNote}>{sosChefNote}</Text>
                ) : null}

                {sosSuggestions.map((suggestion, index) => (
                  <View key={index} style={styles.pimpSuggestionCard}>
                    <Text style={styles.pimpSuggestionTitle}>{suggestion.substituteName}</Text>
                    <Text style={styles.pimpSuggestionReason}>{suggestion.reason}</Text>
                    <Text style={styles.pimpSuggestionUsage}>{suggestion.howToUse}</Text>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.pimpModalCloseBtn}
                onPress={() => setIsSosModalVisible(false)}
              >
                <Text style={styles.pimpModalCloseBtnText}>C&apos;est noté, merci Chef !</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Pimper ma recette */}
        <Modal
          visible={isPimpModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsPimpModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.pimpModalCard}>
              <View style={styles.pimpModalHeader}>
                <Text style={styles.pimpModalTitle}>Pimper ma recette 🌶️</Text>
                <TouchableOpacity
                  onPress={() => setIsPimpModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Fermer la fenêtre Pimper"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {pimpChefNote ? (
                  <Text style={styles.pimpChefNote}>{pimpChefNote}</Text>
                ) : null}

                {pimpSuggestions.map((suggestion, index) => (
                  <View key={index} style={styles.pimpSuggestionCard}>
                    <Text style={styles.pimpSuggestionTitle}>{suggestion.ingredientName}</Text>
                    <Text style={styles.pimpSuggestionReason}>{suggestion.reason}</Text>
                    <Text style={styles.pimpSuggestionUsage}>{suggestion.howToUse}</Text>
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.pimpModalCloseBtn}
                onPress={() => setIsPimpModalVisible(false)}
              >
                <Text style={styles.pimpModalCloseBtnText}>C&apos;est noté, merci Chef !</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

