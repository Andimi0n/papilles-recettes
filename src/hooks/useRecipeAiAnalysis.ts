import { useState } from 'react';
import { Alert } from 'react-native';
import { Category, Difficulty, Ingredient, RecipeStep } from '../types/recipe';
import { RecipeAiService, ExtractedRecipeData, AiConnectionStatus } from '../services/recipeAiService';
import { UnifiedIngredientService } from '../services/unifiedIngredientService';
import { generateUniqueId } from '../utils/helpers';

interface UseRecipeAiAnalysisProps {
  apiKey: string;
  connectionStatus: AiConnectionStatus | null;
  rawTextInput: string;
  setTitle: (val: string) => void;
  setDescription: (val: string) => void;
  setCategory: (val: Category) => void;
  setDifficulty: (val: Difficulty) => void;
  setPrepTime: (val: string) => void;
  setCookTime: (val: string) => void;
  setServings: (val: number | ((prev: number) => number)) => void;
  setIsVegetarian: (val: boolean) => void;
  setUserNote: (val: string) => void;
  setIngredients: (val: Ingredient[] | ((prev: Ingredient[]) => Ingredient[])) => void;
  setSteps: (val: RecipeStep[] | ((prev: RecipeStep[]) => RecipeStep[])) => void;
  setCreationMode: (val: 'text' | 'manual') => void;
}

export const useRecipeAiAnalysis = ({
  apiKey,
  connectionStatus,
  rawTextInput,
  setTitle,
  setDescription,
  setCategory,
  setDifficulty,
  setPrepTime,
  setCookTime,
  setServings,
  setIsVegetarian,
  setUserNote,
  setIngredients,
  setSteps,
  setCreationMode,
}: UseRecipeAiAnalysisProps) => {
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Analyse du texte...');

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

  return {
    isAnalyzingText,
    loadingStep,
    handleAnalyzeText,
  };
};
