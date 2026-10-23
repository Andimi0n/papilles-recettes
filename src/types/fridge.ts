import { ShoppingAisle } from './shopping';

export interface FridgeItem {
  id: string;
  name: string;
  canonicalId?: string;
  aisle: ShoppingAisle;
  createdAt: string;
}

export interface FridgeAisleGroup {
  aisle: ShoppingAisle;
  items: FridgeItem[];
}
