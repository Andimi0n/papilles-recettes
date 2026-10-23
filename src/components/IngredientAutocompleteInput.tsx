import React from 'react';
import {
  UnifiedIngredientInput,
  UnifiedIngredientInputProps,
} from './UnifiedIngredientInput';

export type IngredientAutocompleteInputProps = UnifiedIngredientInputProps;

/**
 * Composant d'autocomplétion et d'entrée unifiée d'ingrédients.
 * Délégué transparent vers UnifiedIngredientInput pour garantir l'uniformité
 * absolue à travers l'application (Stocks, Courses, Recettes, Recherche et Réglages).
 */
export const IngredientAutocompleteInput: React.FC<UnifiedIngredientInputProps> = (props) => {
  return <UnifiedIngredientInput {...props} />;
};

export default IngredientAutocompleteInput;
