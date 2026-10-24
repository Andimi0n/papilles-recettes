import {
  createShoppingItemFromIngredient,
  mergeShoppingItems,
  groupItemsByAisle,
  formatShoppingListForShare
} from './shoppingAggregator';
import { ShoppingItem } from '../types/shopping';

describe('shoppingAggregator', () => {

  describe('createShoppingItemFromIngredient', () => {
    it('creates an item with normalized canonical name and quantity', () => {
      const item = createShoppingItemFromIngredient(
        { id: 'ing1', name: 'carottes râpées', quantity: '200', unit: 'g' },
        4,
        6,
        'Salade de carottes',
        'rec1'
      );
      expect(item).not.toBeNull();
      expect(item?.name).toBe('Carotte');
      expect(item?.canonicalId).toBe('ing_canon_carotte');
      expect(item?.quantity).toBe('300'); // 200 * (6/4)
      expect(item?.unit).toBe('g');
      expect(item?.aisle).toBe('Fruits & Légumes');
    });

    it('strictly excludes water (Arbitrage 2)', () => {
      const item = createShoppingItemFromIngredient(
        { id: 'ing2', name: 'Eau', quantity: '1', unit: 'L', isPantryStaple: true },
        4,
        4,
        'Pâtes',
        'rec2'
      );
      expect(item).toBeNull();
    });

    it('includes pantry staples with canonical name ONLY, NO quantity (Arbitrage 2)', () => {
      const item = createShoppingItemFromIngredient(
        { id: 'ing3', name: 'Fleur de sel', quantity: '2', unit: 'pincées', isPantryStaple: true },
        4,
        8,
        'Steak',
        'rec3'
      );
      expect(item).not.toBeNull();
      expect(item?.name).toBe('Sel');
      expect(item?.canonicalId).toBe('ing_canon_sel');
      expect(item?.quantity).toBeUndefined();
      expect(item?.unit).toBeUndefined();
      expect(item?.aisle).toBe('Épicerie & Condiments');
    });
  });

  describe('mergeShoppingItems', () => {
    it('merges pasta with mathematical addition (250g + 150g = 400g)', () => {
      const existingItems: ShoppingItem[] = [
        {
          id: 's1',
          name: 'Pâtes',
          canonicalId: 'ing_canon_pates',
          quantity: '250',
          unit: 'g',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Pâtes au pesto',
          createdAt: new Date().toISOString(),
        }
      ];

      const newItems: ShoppingItem[] = [
        {
          id: 's3',
          name: 'Tagliatelles fraîches',
          canonicalId: 'ing_canon_pates',
          quantity: '150',
          unit: 'g',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Pâtes carbonara',
          createdAt: new Date().toISOString(),
        }
      ];

      const merged = mergeShoppingItems(existingItems, newItems);
      const pates = merged.find(i => i.canonicalId === 'ing_canon_pates');
      expect(pates).toBeDefined();
      expect(pates?.quantity).toBe('400');
      expect(pates?.unit).toBe('g');
      expect(pates?.recipeTitle).toContain('Pâtes au pesto');
      expect(pates?.recipeTitle).toContain('Pâtes carbonara');
    });

    it('merges pantry staples into a single line without parasitic quantities', () => {
      const existingItems: ShoppingItem[] = [
        {
          id: 's2',
          name: 'Huile d\'olive',
          canonicalId: 'ing_canon_huile_d_olive',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Salade grecque',
          createdAt: new Date().toISOString(),
        }
      ];

      const newItems: ShoppingItem[] = [
        {
          id: 's4',
          name: 'Huile d\'olive',
          canonicalId: 'ing_canon_huile_d_olive',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Ratatouille',
          createdAt: new Date().toISOString(),
        }
      ];

      const merged = mergeShoppingItems(existingItems, newItems);
      const huile = merged.filter(i => i.canonicalId === 'ing_canon_huile_d_olive');
      expect(huile.length).toBe(1);
      expect(huile[0].quantity).toBeUndefined();
      expect(huile[0].recipeTitle).toContain('Ratatouille');
    });

    it('validates metric conversion: 1 kg + 250 g = 1,25 kg', () => {
      const existingItems: ShoppingItem[] = [
        {
          id: 's5',
          name: 'Farine',
          canonicalId: 'ing_canon_farine',
          quantity: '1',
          unit: 'kg',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Pain',
          createdAt: new Date().toISOString(),
        }
      ];

      const newItems: ShoppingItem[] = [
        {
          id: 's6',
          name: 'Farine',
          canonicalId: 'ing_canon_farine',
          quantity: '250',
          unit: 'g',
          isChecked: false,
          aisle: 'Épicerie & Condiments',
          recipeTitle: 'Crêpes',
          createdAt: new Date().toISOString(),
        }
      ];

      const merged = mergeShoppingItems(existingItems, newItems);
      const farine = merged.find(i => i.canonicalId === 'ing_canon_farine');
      expect(farine).toBeDefined();
      expect(farine?.quantity).toBe('1,25');
      expect(farine?.unit).toBe('kg');
    });

    it('merges informal units (1 + 2 = 3 poignées)', () => {
      const merged = mergeShoppingItems([], [
        {
          id: 'u1',
          name: 'Mâche',
          canonicalId: 'ing_canon_mache',
          quantity: '1',
          unit: 'poignée',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Salade A',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u2',
          name: 'Mâche',
          canonicalId: 'ing_canon_mache',
          quantity: '2',
          unit: 'poignées',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Salade B',
          createdAt: new Date().toISOString(),
        }
      ]);

      const mache = merged.find(i => i.canonicalId === 'ing_canon_mache');
      expect(mache?.quantity).toBe('3');
    });

    it('merges Unicode typographic fractions (½ + ½ = 1 citron)', () => {
      const merged = mergeShoppingItems([], [
        {
          id: 'u3',
          name: 'Citron',
          canonicalId: 'ing_canon_citron',
          quantity: '½',
          unit: '',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Sauce A',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u4',
          name: 'Citron',
          canonicalId: 'ing_canon_citron',
          quantity: '½',
          unit: '',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Sauce B',
          createdAt: new Date().toISOString(),
        }
      ]);

      const citron = merged.find(i => i.canonicalId === 'ing_canon_citron');
      expect(citron?.quantity).toBe('1');
    });

    it('merges numeric range (2-3 gousses + 1) = 3,5 gousses', () => {
      const merged = mergeShoppingItems([], [
        {
          id: 'u5',
          name: 'Ail',
          canonicalId: 'ing_canon_ail',
          quantity: '2-3',
          unit: 'gousses',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Plat A',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'u6',
          name: 'Ail',
          canonicalId: 'ing_canon_ail',
          quantity: '1',
          unit: 'gousse',
          isChecked: false,
          aisle: 'Fruits & Légumes',
          recipeTitle: 'Plat B',
          createdAt: new Date().toISOString(),
        }
      ]);

      const ail = merged.find(i => i.canonicalId === 'ing_canon_ail');
      expect(ail?.quantity).toBe('3,5');
    });
  });

  describe('groupItemsByAisle', () => {
    it('groups items correctly by aisle including fallback', () => {
      const itemsToGroup: ShoppingItem[] = [
        {
          id: 'g1',
          name: 'Pomme',
          aisle: 'Fruits & Légumes',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'g2',
          name: 'Steak',
          aisle: 'Boucherie & Poissonnerie',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'g3',
          name: 'Banane',
          aisle: 'Fruits & Légumes',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'g4',
          name: 'Essuie-tout',
          aisle: undefined as unknown as any, // devrait tomber dans "Autre"
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const grouped = groupItemsByAisle(itemsToGroup);

      expect(grouped.length).toBe(3); // Fruits, Boucherie, Autre

      const fruitsGroup = grouped.find(g => g.aisle === 'Fruits & Légumes');
      expect(fruitsGroup).toBeDefined();
      expect(fruitsGroup?.items.length).toBe(2);

      const boucherieGroup = grouped.find(g => g.aisle === 'Boucherie & Poissonnerie');
      expect(boucherieGroup).toBeDefined();
      expect(boucherieGroup?.items.length).toBe(1);

      const autreGroup = grouped.find(g => g.aisle === 'Autre');
      expect(autreGroup).toBeDefined();
      expect(autreGroup?.items.length).toBe(1);
    });
  });

  describe('formatShoppingListForShare', () => {
    it('handles an empty list', () => {
      const emptyList = formatShoppingListForShare([]);
      expect(emptyList).toBe('🛒 Ma liste de courses Papilles est vide.');
    });

    it('formats a grouped list with emojis and checkboxes', () => {
      const shareItems: ShoppingItem[] = [
        {
          id: 'f1',
          name: 'Lait',
          quantity: '1',
          unit: 'L',
          aisle: 'Produits Frais & Crèmerie',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'f2',
          name: 'Pomme',
          quantity: '3',
          aisle: 'Fruits & Légumes',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'f3',
          name: 'Sel',
          aisle: 'Épicerie & Condiments',
          isChecked: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const formattedText = formatShoppingListForShare(shareItems);

      expect(formattedText).toContain('🛒 *Ma Liste de Courses Papilles* (3 articles)');
      expect(formattedText).toContain('🧀 *PRODUITS FRAIS & CRÈMERIE*');
      expect(formattedText).toContain('[ ] 1 L Lait');
      expect(formattedText).toContain('🥦 *FRUITS & LÉGUMES*');
      expect(formattedText).toContain('[ ] 3 Pomme');
      expect(formattedText).toContain('🍝 *ÉPICERIE & CONDIMENTS*');
      expect(formattedText).toContain('[ ] Sel');
      expect(formattedText).toContain('Généré avec Papilles Recettes 👩‍🍳');
    });
  });
});
