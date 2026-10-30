import React, { useState, useMemo, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Recipe, Category, RecipeIdea } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle } from '../types/shopping';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
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

interface StockCookModalProps {
  visible: boolean;
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
  recipes,
  stockItems,
  doableCount,
  isDoableFilterActive,
  onApplyDoableFilter,
  onRecipeGenerated,
  onNavigateToStock,
  onClose,
}) => {
  const { isDark, colors } = useTheme();

  // Ingrédients du stock sélectionnés pour l'IA (tous cochés par défaut à l'ouverture)
  const [selectedStockNames, setSelectedStockNames] = useState<string[]>(() =>
    stockItems.map((item) => item.name)
  );
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
  const prevVisibleRef = useRef(visible);
  const prevStockCountRef = useRef(stockItems.length);

  // Synchronisation lors de l'ouverture ou lors de l'arrivée asynchrone des aliments du stock
  useEffect(() => {
    const justOpened = visible && !prevVisibleRef.current;
    const stockLoadedAsync =
      visible && prevStockCountRef.current === 0 && stockItems.length > 0;

    if (justOpened || stockLoadedAsync) {
      setSelectedStockNames(stockItems.map((item) => item.name));
      setMealType('Plat');
      setAiFlowStep('config');
      setIdeas([]);
      setSelectedIdea(null);
    }
    prevVisibleRef.current = visible;
    prevStockCountRef.current = stockItems.length;
  }, [visible, stockItems]);

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

  // Nombre de recettes faisables globalement (réutilise doableCount déjà calculé par HomeScreen)
  const effectiveDoableCount = useMemo(() => {
    if (typeof doableCount === 'number') {
      return doableCount;
    }
    if (stockItems.length === 0 || recipes.length === 0) {
      return 0;
    }
    const map = evaluateRecipesWithStock(recipes, stockItems, {
      assumePantryStaplesAvailable: true,
    });
    let count = 0;
    map.forEach((ev) => {
      if (ev.isDoable) count++;
    });
    return count;
  }, [doableCount, recipes, stockItems]);

  // Recettes faisables avec le stock pour le type de repas choisi (Solution 1)
  const doableRecipesForCurrentType = useMemo(() => {
    if (stockItems.length === 0 || recipes.length === 0) return [];
    const map = evaluateRecipesWithStock(recipes, stockItems, {
      assumePantryStaplesAvailable: true,
    });
    return recipes.filter((r) => map.get(r.id)?.isDoable && r.category === mealType);
  }, [recipes, stockItems, mealType]);

  // Groupement des aliments du stock par rayon (comme dans Mes Étagères)
  const groupedStockByAisle = useMemo(() => {
    const map = new Map<ShoppingAisle, FridgeItem[]>();
    stockItems.forEach((item) => {
      const aisle = item.aisle || 'Autre';
      const list = map.get(aisle) || [];
      list.push(item);
      map.set(aisle, list);
    });

    const result: { aisle: ShoppingAisle; items: FridgeItem[] }[] = [];
    ALL_AISLES.forEach((aisle) => {
      const aisleItems = map.get(aisle);
      if (aisleItems && aisleItems.length > 0) {
        result.push({ aisle, items: aisleItems });
      }
    });

    const otherItems = map.get('Autre');
    if (otherItems && otherItems.length > 0 && !result.some((r) => r.aisle === 'Autre')) {
      result.push({ aisle: 'Autre', items: otherItems });
    }

    return result;
  }, [stockItems]);

  const toggleStockIngredient = (name: string) => {
    setSelectedStockNames((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const toggleAisle = (aisleItems: FridgeItem[]) => {
    const aisleNames = aisleItems.map((i) => i.name);
    const allAisleSelected = aisleNames.every((n) => selectedStockNames.includes(n));
    if (allAisleSelected) {
      setSelectedStockNames((prev) => prev.filter((n) => !aisleNames.includes(n)));
    } else {
      setSelectedStockNames((prev) => Array.from(new Set([...prev, ...aisleNames])));
    }
  };

  const handleSelectAllStock = () => {
    setSelectedStockNames(stockItems.map((i) => i.name));
  };

  const handleDeselectAllStock = () => {
    setSelectedStockNames([]);
  };

  // Étape 1 : Demande de 3 idées gourmandes au Chef IA (Solution 4)
  const handleStartFetchIdeas = async () => {
    if (selectedStockNames.length === 0) {
      Alert.alert(
        'Aucun ingrédient sélectionné',
        'Veuillez sélectionner au moins un aliment présent dans votre stock pour inspirer le Chef IA.'
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

  const executeFetchIdeas = async (key?: string) => {
    setActiveModelInfo({ model: FAST_GEMINI_MODELS_CASCADE[0], isFallback: false });
    setAiFlowStep('loading_ideas');

    try {
      // Uniquement les titres des recettes faisables du type choisi (Solution 1)
      const doableTitles = doableRecipesForCurrentType
        .map((r) => r.title?.trim())
        .filter(Boolean);

      // Récupération des allergènes à exclure pour le Chef IA si l'option est active
      const aiExclusionEnabled = await StorageService.getAiAllergenExclusionEnabled();
      let excludedAllergens: string[] = [];
      if (aiExclusionEnabled) {
        const userAllergens = await StorageService.getUserAllergens();
        if (userAllergens.length > 0) {
          excludedAllergens = userAllergens.map((a) => a.name.trim()).filter(Boolean);
        }
      }

      const generatedIdeas = await RecipeAiService.suggestRecipeIdeasFromFridge(
        selectedStockNames,
        {
          mealType,
          servings,
          onlyVegetarian: isVegetarian,
          existingDoableTitles: doableTitles,
          excludedAllergens,
          chefMood,
          additionalPreferences: additionalPreferences.trim(),
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

      if (!generatedIdeas || generatedIdeas.length === 0) {
        throw new Error("Le Chef IA n'a pas pu proposer d'idées. Réessayez.");
      }

      setIdeas(generatedIdeas);
      setAiFlowStep('ideas');
    } catch (err: any) {
      setAiFlowStep('config');
      Alert.alert(
        'Erreur Chef IA',
        err?.message ||
          "Impossible de générer les idées du Chef. Vérifiez votre clé API Gemini et votre connexion."
      );
    }
  };

  // Étape 2 : Concrétisation de la recette complète à partir de l'idée choisie (Solution 4)
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
    setActiveModelInfo({ model: GEMINI_MODELS_CASCADE[0], isFallback: false });
    setAiStepIndex(0);
    setAiFlowStep('generating_recipe');

    try {
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
        selectedStockNames,
        {
          mealType,
          servings,
          onlyVegetarian: isVegetarian,
          excludedAllergens,
          additionalPreferences: additionalPreferences.trim(),
          chefMood: chefMood,
          onModelAttempt: (model, isFallback) => {
            setActiveModelInfo({ model, isFallback });
          },
        },
        key
      );

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
          `Recette inédite créée par le Chef IA avec vos aliments en stock : ${selectedStockNames.join(', ')}`,
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

      setAiFlowStep('config');
      onClose();

      if (onRecipeGenerated) {
        onRecipeGenerated(partialRecipe);
      }
    } catch (err: any) {
      setAiFlowStep('ideas');
      Alert.alert(
        'Erreur Chef IA',
        err?.message ||
          "Impossible de finaliser la recette. Veuillez réessayer."
      );
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
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Cuisiner avec mon stock</Text>
              <Text style={styles.headerSubtitle}>
                Anti-gaspillage, carnet & inspirations IA
              </Text>
            </View>

            {onNavigateToStock && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateToStock();
                }}
                style={styles.manageStockBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="fridge-outline" size={16} color={colors.primary} />
                <Text style={styles.manageStockBtnText}>Étagères</Text>
              </TouchableOpacity>
            )}
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
                  onPress={() => setAiFlowStep('ideas')}
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
                  onPress={() => setAiFlowStep('config')}
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
                  onPress={() => executeFetchIdeas()}
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
                  <Text style={styles.changeConfigBtnText}>Modifier mes ingrédients</Text>
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
                                onPress={() => setMealType(t.id)}
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

                      {/* Instructions libres */}
                      <View style={styles.aiPreferencesRow}>
                        <View style={styles.aiParamLabelCol}>
                          <Text style={styles.aiParamTitle}>Instructions libres (optionnel)</Text>
                          <Text style={styles.aiParamSub}>Ex: Sans gluten, épicé, avec du fromage...</Text>
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

                      {/* Information filtre anti-redondance ciblée (Solution 1) */}
                      <View style={styles.doableFilterInfoBox}>
                        <Ionicons
                          name={
                            doableRecipesForCurrentType.length > 0
                              ? 'shield-checkmark-outline'
                              : 'sparkles-outline'
                          }
                          size={15}
                          color={colors.primary}
                        />
                        <Text style={styles.doableFilterInfoText}>
                          {doableRecipesForCurrentType.length > 0
                            ? `${doableRecipesForCurrentType.length} ${mealType.toLowerCase()}${doableRecipesForCurrentType.length > 1 ? 's' : ''} déjà faisable${doableRecipesForCurrentType.length > 1 ? 's' : ''} dans votre carnet sera évité${doableRecipesForCurrentType.length > 1 ? 's' : ''}`
                            : `Aucune ${mealType.toLowerCase()} similaire en stock dans votre carnet : champ libre total pour le Chef IA`}
                        </Text>
                      </View>
                    </View>

                    {/* Bouton de génération des 3 idées (Solution 4 - Étape 1, placé au-dessus des ingrédients) */}
                    <TouchableOpacity
                      style={[
                        styles.generateAiBtn,
                        selectedStockNames.length === 0 && styles.generateAiBtnDisabled,
                      ]}
                      onPress={handleStartFetchIdeas}
                      disabled={selectedStockNames.length === 0}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.generateAiBtnText}>
                        💡 Trouver 3 idées de {mealType.toLowerCase()}
                      </Text>
                    </TouchableOpacity>

                    {/* 2. Choix des aliments en stock */}
                    <View style={styles.stockSelectionHeader}>
                      <Text style={styles.stockSelectionTitle}>
                        Aliments en vedette ({selectedStockNames.length}/{totalStockCount}) :
                      </Text>
                      <View style={styles.stockSelectionActions}>
                        <TouchableOpacity onPress={handleSelectAllStock}>
                          <Text style={styles.stockMiniLink}>Tout cocher</Text>
                        </TouchableOpacity>
                        <Text style={styles.stockMiniDivider}>•</Text>
                        <TouchableOpacity onPress={handleDeselectAllStock}>
                          <Text style={styles.stockMiniLink}>Tout décocher</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Liste verticale des aliments groupés par rayon */}
                    <View style={styles.stockAislesContainer}>
                      {groupedStockByAisle.map(({ aisle, items }) => {
                        const config = AISLE_CONFIGS[aisle] || {
                          iconName: 'cube-outline',
                          color: colors.primary,
                          aisle,
                        };
                        const selectedInAisle = items.filter((i) =>
                          selectedStockNames.includes(i.name)
                        ).length;
                        const allAisleSelected = selectedInAisle === items.length;

                        return (
                          <View key={aisle} style={styles.aisleGroupCard}>
                            {/* En-tête de catégorie / rayon */}
                            <View style={styles.aisleGroupHeader}>
                              <View style={styles.aisleGroupTitleRow}>
                                <View
                                  style={[
                                    styles.aisleIconBox,
                                    { backgroundColor: config.color + '20' },
                                  ]}
                                >
                                  <Ionicons
                                    name={config.iconName as any}
                                    size={14}
                                    color={config.color}
                                  />
                                </View>
                                <Text style={styles.aisleGroupTitle}>{aisle}</Text>
                                <Text style={styles.aisleGroupCount}>
                                  ({selectedInAisle}/{items.length})
                                </Text>
                              </View>

                              {/* Action rapide cocher/décocher tout le rayon */}
                              <TouchableOpacity
                                onPress={() => toggleAisle(items)}
                                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                              >
                                <Text
                                  style={[
                                    styles.aisleActionToggleText,
                                    { color: config.color },
                                  ]}
                                >
                                  {allAisleSelected ? 'Tout décocher' : 'Tout cocher'}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Puces d'ingrédients du rayon disposées en grille/wrap vertical */}
                            <View style={styles.aisleChipsWrap}>
                              {items.map((item) => {
                                const isSelected = selectedStockNames.includes(item.name);
                                return (
                                  <TouchableOpacity
                                    key={item.id}
                                    style={[
                                      styles.stockChip,
                                      isSelected && styles.stockChipSelected,
                                    ]}
                                    onPress={() => toggleStockIngredient(item.name)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                                      size={14}
                                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                                    />
                                    <Text
                                      style={[
                                        styles.stockChipText,
                                        isSelected && styles.stockChipTextSelected,
                                      ]}
                                    >
                                      {item.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* SECTION 2 : VÉRIFICATION DU CARNET (Besoin 1) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardIconBox}>
                        <Ionicons name="book-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle}>Dans votre carnet</Text>
                        <Text style={styles.cardSubtitle}>
                          Recettes réalisables immédiatement avec vos stocks
                        </Text>
                      </View>
                    </View>

                    <View style={styles.carnetStatusRow}>
                      <View style={styles.carnetStatBox}>
                        <Text style={styles.carnetStatNumber}>{effectiveDoableCount}</Text>
                        <Text style={styles.carnetStatLabel}>
                          {effectiveDoableCount > 1 ? 'recettes prêtes' : 'recette prête'}
                        </Text>
                      </View>

                      <View style={styles.carnetStatDescCol}>
                        {effectiveDoableCount > 0 ? (
                          <Text style={styles.carnetStatDescText}>
                            Vous avez 100% des ingrédients requis (hors sel, poivre et huile du
                            placard) pour ces recettes !
                          </Text>
                        ) : (
                          <Text style={styles.carnetStatDescText}>
                            Aucune recette ne correspond à 100% à votre stock actuel. Le Chef IA
                            ci-dessus vous permet d&apos;inventer des recettes sur-mesure !
                          </Text>
                        )}
                      </View>
                    </View>

                    {effectiveDoableCount > 0 && (
                      <View style={styles.carnetActionRow}>
                        {isDoableFilterActive ? (
                          <TouchableOpacity
                            style={[styles.carnetBtn, styles.carnetBtnActive]}
                            onPress={() => {
                              onApplyDoableFilter(false);
                              onClose();
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                            <Text style={styles.carnetBtnTextActive}>
                              Désactiver le filtre de stock
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.carnetBtn}
                            onPress={() => {
                              onApplyDoableFilter(true);
                              onClose();
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="funnel" size={16} color="#FFFFFF" />
                            <Text style={styles.carnetBtnText}>
                              Voir mes {effectiveDoableCount} recette{effectiveDoableCount > 1 ? 's' : ''} faisable{effectiveDoableCount > 1 ? 's' : ''}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
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

  // Stat Carnet
  carnetStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  carnetStatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minWidth: 70,
  },
  carnetStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  carnetStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  carnetStatDescCol: {
    flex: 1,
    paddingLeft: 12,
  },
  carnetStatDescText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  carnetActionRow: {
    marginTop: 2,
  },
  carnetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  carnetBtnActive: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger + '55',
  },
  carnetBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  carnetBtnTextActive: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  // Sélection stock chips
  stockSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  stockSelectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stockSelectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockMiniLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  stockMiniDivider: {
    fontSize: 10,
    color: colors.textMuted,
  },
  stockAislesContainer: {
    gap: 10,
    marginBottom: 12,
  },
  aisleGroupCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aisleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  aisleGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  aisleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisleGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aisleGroupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  aisleActionToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aisleChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stockChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stockChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  stockChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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
