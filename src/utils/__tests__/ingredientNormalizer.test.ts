import { normalizeIngredient, normalizeIngredients, clearNormalizationCache } from '../ingredientNormalizer';
import { VocabularyService } from '../../services/vocabularyService';

describe('ingredientNormalizer', () => {
  beforeEach(() => {
    clearNormalizationCache();
    // Pre-load vocabulary so sync lists are ready for tests
    return VocabularyService.getAll();
  });

  describe('normalizeIngredient', () => {
    it('returns empty result for empty string', () => {
      const result = normalizeIngredient({ name: '' });
      expect(result.name).toBe('');
      expect(result.wasNormalized).toBe(false);
    });

    it('returns empty result for whitespace string', () => {
      const result = normalizeIngredient({ name: '   ' });
      expect(result.name).toBe('');
      expect(result.wasNormalized).toBe(false);
    });

    it('identifies exact canonical matches immediately', () => {
      const result = normalizeIngredient({ name: 'Crème fraîche' });
      expect(result.name).toBe('Crème fraîche');
      expect(result.canonicalId).toBe('ing_canon_creme_fraiche');
      expect(result.wasNormalized).toBe(false);
    });

    it('extracts quantity and unit properly', () => {
      const result = normalizeIngredient({ name: '1 pot de crème fraîche' });
      expect(result.name).toBe('Crème fraîche');
      expect(result.canonicalId).toBe('ing_canon_creme_fraiche');
      expect(result.quantity).toBe('1');
      expect(result.unit).toBe('pot');
      expect(result.wasNormalized).toBe(true);
    });

    it('trims leading qualifiers like "2 belles carottes"', () => {
      const result = normalizeIngredient({ name: '2 belles carottes' });
      expect(result.name).toBe('Carotte');
      expect(result.canonicalId).toBe('ing_canon_carotte');
      expect(result.quantity).toBe('2');
      expect(result.wasNormalized).toBe(true);
    });

    it('handles unicode fractions correctly', () => {
      const result = normalizeIngredient({ name: '½ citron' });
      expect(result.name).toBe('Citron');
      expect(result.canonicalId).toBe('ing_canon_citron');
      expect(result.quantity).toBe('1/2');
    });

    it('trims culinary preparation words', () => {
      const result = normalizeIngredient({ name: '2 oignons blancs émincés' });
      expect(result.name).toBe('Oignon');
      expect(result.canonicalId).toBe('ing_canon_oignon');
      expect(result.quantity).toBe('2');
    });

    it('handles "facultatif" / optional ingredients', () => {
      const result = normalizeIngredient({ name: 'Persil ciselé (facultatif)' });
      expect(result.name).toBe('Persil');
      expect(result.canonicalId).toBe('ing_canon_persil');
      expect(result.isOptional).toBe(true);
    });

    it('uses provided canonicalId if exact match fails', () => {
      const result = normalizeIngredient({ name: 'Un ingrédient bizarre', canonicalId: 'ing_canon_poulet' });
      expect(result.name).toBe('Poulet');
      expect(result.canonicalId).toBe('ing_canon_poulet');
    });

    it('identifies pantry staples', () => {
      const result = normalizeIngredient({ name: 'Sel' });
      expect(result.name).toBe('Sel');
      expect(result.isPantryStaple).toBe(true);
    });

    it('normalizes to title case for unknown ingredients', () => {
      const result = normalizeIngredient({ name: 'ingrédient magique inconnu' });
      expect(result.name).toBe('Ingrédient magique inconnu');
      expect(result.canonicalId).toBeUndefined();
    });

    it('uses exact cache properly on identical queries', () => {
      const result1 = normalizeIngredient({ name: 'Tomate' });
      const result2 = normalizeIngredient({ name: 'Tomate' });
      expect(result1).toStrictEqual(result2);
    });
  });

  describe('normalizeIngredients', () => {
    it('normalizes a list of ingredients', () => {
      const results = normalizeIngredients([
        { name: '1 boite de petits pois', quantity: '', unit: '' },
        { name: 'Sel', isPantryStaple: true, quantity: '', unit: '' },
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Petits pois');
      expect(results[0].quantity).toBe('1');
      expect(results[0].unit).toBe('boîte');
      expect(results[1].name).toBe('Sel');
      expect(results[1].isPantryStaple).toBe(true);
    });

    it('returns empty array if given non-array', () => {
      // @ts-ignore for testing error case
      expect(normalizeIngredients(null)).toEqual([]);
    });
  });
});
