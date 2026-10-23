export type ShoppingAisle =
  | 'Fruits & Légumes'
  | 'Boucherie & Poissonnerie'
  | 'Produits Frais & Crèmerie'
  | 'Épicerie & Condiments'
  | 'Boulangerie & Pâtisserie'
  | 'Surgelés'
  | 'Boissons'
  | 'Autre';

export interface ShoppingItem {
  id: string;
  name: string;
  canonicalId?: string;
  quantity?: string;
  unit?: string;
  isChecked: boolean;
  aisle: ShoppingAisle;
  recipeTitle?: string;
  recipeId?: string;
  servings?: number;
  createdAt: string;
}

export interface AisleConfig {
  aisle: ShoppingAisle;
  iconName: string;
  color: string;
  bgColor: string;
}
