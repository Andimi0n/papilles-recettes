import React from 'react';
import { Modal } from 'react-native';
import {
  ScanRecipeScreen,
  IngredientSelectionState,
  cycleIngredientState,
  initializeStockIngredients,
  organizeIngredientsForDisplay,
  getActiveIngredientsForAi,
  AllowedMealType,
} from '../../screens/ScanRecipeScreen';
import { Recipe } from '../../types/recipe';
import { FridgeItem } from '../../types/fridge';

export {
  IngredientSelectionState,
  cycleIngredientState,
  initializeStockIngredients,
  organizeIngredientsForDisplay,
  getActiveIngredientsForAi,
  AllowedMealType,
};

export interface StockCookModalProps {
  visible: boolean;
  preserveSession?: boolean;
  recipes?: Recipe[];
  stockItems?: FridgeItem[];
  doableCount?: number;
  isDoableFilterActive?: boolean;
  onApplyDoableFilter?: (active: boolean) => void;
  onRecipeGenerated?: (partialRecipe: Partial<Recipe>) => void;
  onNavigateToStock?: () => void;
  onClose: () => void;
}

export const StockCookModal: React.FC<StockCookModalProps> = ({
  visible,
  recipes = [],
  stockItems = [],
  onRecipeGenerated,
  onClose,
}) => {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScanRecipeScreen
        initialMode="chef"
        recipes={recipes}
        stockItems={stockItems}
        onBack={onClose}
        onRecipeExtracted={(recipe) => {
          onRecipeGenerated?.(recipe);
          onClose();
        }}
      />
    </Modal>
  );
};
