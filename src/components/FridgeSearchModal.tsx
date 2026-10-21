import React from 'react';
import { StockCookModal } from './StockCookModal';
import { Recipe } from '../types/recipe';

/**
 * @deprecated Remplacé par StockCookModal ("Cuisiner avec mon stock").
 */
export interface FridgeSearchModalProps {
  visible: boolean;
  recipes: Recipe[];
  selectedIngredients?: string[];
  onApply?: (ingredients: string[]) => void;
  onGenerateRecipe?: (partialRecipe: Partial<Recipe>) => void;
  onClose: () => void;
}

export const FridgeSearchModal: React.FC<FridgeSearchModalProps> = ({
  visible,
  recipes,
  onGenerateRecipe,
  onClose,
}) => {
  return (
    <StockCookModal
      visible={visible}
      recipes={recipes}
      stockItems={[]}
      isDoableFilterActive={false}
      onApplyDoableFilter={() => {}}
      onRecipeGenerated={onGenerateRecipe}
      onClose={onClose}
    />
  );
};
