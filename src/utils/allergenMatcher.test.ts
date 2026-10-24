import {
  prepareUserAllergens,
  isIngredientAllergen,
  evaluateRecipeAllergens,
  detectProbableAllergenFamily,
  recipeContainsAllergens,
} from './allergenMatcher';
import { UserAllergenItem } from '../types/vocabulary';
import { Recipe } from '../types/recipe';

describe('allergenMatcher', () => {
  const mockUserAllergens: UserAllergenItem[] = [
    {
      id: 'a1',
      name: 'Lait & Lactose',
      allergenFamily: 'lait',
      addedAt: '',
    },
    {
      id: 'a2',
      name: 'Sulfites',
      allergenFamily: 'sulfites',
      addedAt: '',
    },
    {
      id: 'a3',
      name: 'Fruits à coque',
      allergenFamily: 'fruits_a_coque',
      addedAt: '',
    },
  ];

  describe('prepareUserAllergens', () => {
    it('should properly extract active allergen families', () => {
      const prepared = prepareUserAllergens(mockUserAllergens);
      expect(prepared.activeFamilies.has('lait')).toBe(true);
      expect(prepared.activeFamilies.has('sulfites')).toBe(true);
      expect(prepared.activeFamilies.has('fruits_a_coque')).toBe(true);
    });

    it('should return empty state when no allergens provided', () => {
      const prepared = prepareUserAllergens([]);
      expect(prepared.activeFamilies.size).toBe(0);
    });
  });

  describe('isIngredientAllergen - Zéro faux positif (Lexique-First)', () => {
    let prepared: ReturnType<typeof prepareUserAllergens>;

    beforeEach(() => {
      prepared = prepareUserAllergens(mockUserAllergens);
    });

    it('should not match "oignon blanc" with sulfites', () => {
      const result = isIngredientAllergen('oignon blanc', prepared);
      expect(result.isAllergen).toBe(false);
    });

    it('should not match "noix de muscade" with fruits à coque', () => {
      const result = isIngredientAllergen('noix de muscade', prepared);
      expect(result.isAllergen).toBe(false);
    });

    it('should not match "lait de coco" with lait', () => {
      const result = isIngredientAllergen('lait de coco', prepared);
      expect(result.isAllergen).toBe(false);
    });
  });

  describe('isIngredientAllergen - Détection des racines sémantiques', () => {
    let prepared: ReturnType<typeof prepareUserAllergens>;

    beforeEach(() => {
      prepared = prepareUserAllergens(mockUserAllergens);
    });

    it('should match "sauce béchamel maison" with lait', () => {
      const result = isIngredientAllergen('sauce béchamel maison', prepared);
      expect(result.isAllergen).toBe(true);
      expect(result.allergenFamily).toBe('lait');
    });

    it('should match "coulis de noisettes torréfiées" with fruits à coque', () => {
      const result = isIngredientAllergen('coulis de noisettes torréfiées', prepared);
      expect(result.isAllergen).toBe(true);
      expect(result.allergenFamily).toBe('fruits_a_coque');
    });

    it('should not match faux amis végétaux', () => {
      const beurreCacahuete = isIngredientAllergen('beurre de cacahuète artisanal', prepared);
      expect(beurreCacahuete.isAllergen).toBe(false);

      const cremeMarrons = isIngredientAllergen('crème de marrons d\'Ardèche', prepared);
      expect(cremeMarrons.isAllergen).toBe(false);

      const laitRiz = isIngredientAllergen('lait de riz bio', prepared);
      expect(laitRiz.isAllergen).toBe(false);
    });
  });

  describe('evaluateRecipeAllergens', () => {
    let prepared: ReturnType<typeof prepareUserAllergens>;

    beforeEach(() => {
      prepared = prepareUserAllergens(mockUserAllergens);
    });

    it('should raise precaution indicator for unrecognized ingredients', () => {
      const recipeWithUnrecognized = {
        id: 'r_unrec',
        title: 'Gâteau mystère',
        ingredients: [
          { id: 'i1', name: 'Farine', canonicalId: 'ing_canon_farine' },
          { id: 'i2', name: 'Sucre', canonicalId: 'ing_canon_sucre' },
          { id: 'i3', name: 'Pâte de yuzu bio' },
        ],
      } as Recipe;

      const evalRecipe = evaluateRecipeAllergens(recipeWithUnrecognized, prepared);

      expect(evalRecipe.hasAllergen).toBe(false);
      expect(evalRecipe.hasUnrecognizedIngredients).toBe(true);
      expect(evalRecipe.unrecognizedIngredients?.length).toBe(1);
      expect(evalRecipe.unrecognizedIngredients?.[0].name).toBe('Pâte de yuzu bio');
    });

    it('should return empty result if no recipe ingredients or allergens', () => {
      const emptyEval = evaluateRecipeAllergens({ ingredients: [] } as any, prepareUserAllergens([]));
      expect(emptyEval.hasAllergen).toBe(false);
      expect(emptyEval.hasUnrecognizedIngredients).toBe(false);
    });
  });

  describe('detectProbableAllergenFamily', () => {
    it('should return null for empty string', () => {
      expect(detectProbableAllergenFamily('')).toBeNull();
      expect(detectProbableAllergenFamily('   ')).toBeNull();
    });

    it('should detect lait roots', () => {
      expect(detectProbableAllergenFamily('sauce au fromage')).toBe('lait');
      expect(detectProbableAllergenFamily('mascarpone doux')).toBe('lait');
      expect(detectProbableAllergenFamily('yogourt nature')).toBe('lait');
    });

    it('should avoid faux-amis for lait', () => {
      // 'lait de soja' contains 'soja', so it matches 'soja' family but skips 'lait'
      expect(detectProbableAllergenFamily('lait de soja')).toBe('soja');

      expect(detectProbableAllergenFamily('beurre de cacahuète')).toBe('arachides');

      // True false-friend with no other allergen fallback
      expect(detectProbableAllergenFamily('lait de riz')).toBeNull();
    });

    it('should avoid faux-amis for fruits_a_coque', () => {
      expect(detectProbableAllergenFamily('noix de coco râpée')).toBeNull();
      expect(detectProbableAllergenFamily('noix de muscade en poudre')).toBeNull();
    });
  });

  describe('recipeContainsAllergens', () => {
    let prepared: ReturnType<typeof prepareUserAllergens>;

    beforeEach(() => {
      prepared = prepareUserAllergens(mockUserAllergens);
    });

    it('should return false for safe recipes', () => {
      const safeRecipe = {
        ingredients: [
          { name: 'pomme' },
          { name: 'sucre' }
        ]
      } as Recipe;
      expect(recipeContainsAllergens(safeRecipe, prepared)).toBe(false);
    });

    it('should return true for recipes with allergens', () => {
      const allergenRecipe = {
        ingredients: [
          { name: 'pomme' },
          { name: 'mascarpone' }
        ]
      } as Recipe;
      expect(recipeContainsAllergens(allergenRecipe, prepared)).toBe(true);
    });

    it('should return false if missing inputs', () => {
      expect(recipeContainsAllergens(null as any, prepared)).toBe(false);
      expect(recipeContainsAllergens({ ingredients: [] } as any, null as any)).toBe(false);
    });
  });
});
