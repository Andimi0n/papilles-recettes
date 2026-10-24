import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { RecipeAiService } from '../src/services/recipeAiService';

describe('RecipeAiService', () => {
  describe('generateRecipeFromIdea', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw an error if no API key is provided', async () => {
      jest.spyOn(RecipeAiService, 'getApiKey').mockResolvedValue(null);

      const idea = { id: '1', title: 'Test Recipe', description: 'A test recipe', estimatedTime: '15 min', highlightIngredients: [] };
      const ingredients = ['Tomatoes', 'Onions'];

      await expect(RecipeAiService.generateRecipeFromIdea(idea, ingredients)).rejects.toThrow(
        'Clé API Gemini non configurée. Veuillez renseigner votre clé API dans les paramètres.'
      );
    });

    it('should throw an error if the underlying fetch API fails', async () => {
      jest.spyOn(RecipeAiService, 'getApiKey').mockResolvedValue('fake-api-key');

      // Temporarily mock console.warn to suppress the output during the test run.
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error')
        })
      ) as jest.Mock;

      const idea = { id: '1', title: 'Test Recipe', description: 'A test recipe', estimatedTime: '15 min', highlightIngredients: [] };
      const ingredients = ['Tomatoes', 'Onions'];

      await expect(RecipeAiService.generateRecipeFromIdea(idea, ingredients)).rejects.toThrow(
        "Impossible d'obtenir une réponse valide des serveurs Google Gemini."
      );
    });
  });
});
