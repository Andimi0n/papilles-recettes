import { validateMarmitonUrl, MarmitonService } from './marmitonService';
import { RecipeAiService } from './recipeAiService';

// Mock RecipeAiService since it makes API calls
jest.mock('./recipeAiService', () => ({
  RecipeAiService: {
    extractRecipeFromText: jest.fn(),
  },
}));

// We can simply mock fetch for testing URL behaviors
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe('MarmitonService', () => {
  describe('validateMarmitonUrl', () => {
    it('accepts valid Marmiton URLs', () => {
      expect(() => validateMarmitonUrl('https://www.marmiton.org/recettes/recette_poulet_123.aspx')).not.toThrow();
      expect(() => validateMarmitonUrl('https://marmiton.org/recettes/recette_test.html')).not.toThrow();
    });

    it('rejects invalid URLs', () => {
      expect(() => validateMarmitonUrl('http://www.marmiton.org/recettes/recette_poulet.aspx')).toThrow(/HTTPS/);
      expect(() => validateMarmitonUrl('https://malicious.com/recettes/recette_poulet.aspx')).toThrow(/domaine officiel/);
      expect(() => validateMarmitonUrl('https://user:pass@www.marmiton.org/recettes/recette_poulet.aspx')).toThrow(/identifiants/);
      expect(() => validateMarmitonUrl('https://www.marmiton.org:8080/recettes/recette_poulet.aspx')).toThrow(/port HTTPS standard/);
      expect(() => validateMarmitonUrl('https://www.marmiton.org/forum/poulet')).toThrow(/pointer vers une fiche recette/);
    });
  });

  describe('searchRecipes', () => {
    it('filters, deduplicates and extracts correctly', async () => {
      const html = `
        <a href="/recettes/recette_poulet.aspx">Poulet rôti</a>
        <a href="/recettes/recette_poulet.aspx">Poulet rôti</a> <!-- duplicate -->
        <a href="/recettes/recette_boeuf.aspx">Boeuf bourguignon</a>
        <a href="/recettes/recette_short.aspx">abc</a> <!-- too short -->
        <a href="/recettes/recette_voir.aspx">voir la recette du poulet</a> <!-- start with voir la recette -->
      `;
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => html,
      });

      const results = await MarmitonService.searchRecipes('test');
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Poulet rôti');
      expect(results[0].url).toBe('https://www.marmiton.org/recettes/recette_poulet.aspx');
      expect(results[1].title).toBe('Boeuf bourguignon');
    });

    it('throws error if marmiton is unreachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      await expect(MarmitonService.searchRecipes('test')).rejects.toThrow(/Impossible de chercher sur Marmiton/);
    });
  });

  describe('extractMarmitonImages', () => {
    it('extracts images from OpenGraph, HTML classes and JSON-LD', () => {
      const htmlSample = `
        <html>
          <head>
            <meta property="og:image" content="https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg" />
          </head>
          <body>
            <img class="recipe-main-photo" src="https://assets.afcdn.com/recipe/20210101/67890_w1024h768c1.jpg" />
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "image": ["https://assets.afcdn.com/recipe/20210101/11111_w1024h768c1.jpg"]
              }
            </script>
          </body>
        </html>
      `;

      const images = MarmitonService.extractMarmitonImages(htmlSample);
      expect(images).toHaveLength(3);
      expect(images).toContain('https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg');
      expect(images).toContain('https://assets.afcdn.com/recipe/20210101/67890_w1024h768c1.jpg');
      expect(images).toContain('https://assets.afcdn.com/recipe/20210101/11111_w1024h768c1.jpg');
    });
  });

  describe('importRecipeFromUrl', () => {
    it('combines fetch, AI and standardization', async () => {
      const htmlSample = `
        <html>
          <head>
            <meta property="og:image" content="https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg" />
          </head>
          <body>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Poulet Test JSON",
                "image": ["https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg"]
              }
            </script>
          </body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => htmlSample,
      });

      (RecipeAiService.extractRecipeFromText as jest.Mock).mockResolvedValueOnce({
        title: 'Poulet Test',
        description: 'Test desc',
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        servings: 2,
        isVegetarian: false,
        ingredients: [{ name: 'Poulet', quantity: '1', unit: 'kg' }],
        steps: [{ instruction: 'Cuire', order: 1 }]
      });

      const importedRecipe = await MarmitonService.importRecipeFromUrl('https://www.marmiton.org/recettes/recette_poulet_test.aspx');

      expect(importedRecipe.title).toBe('Poulet Test');
      expect(importedRecipe.availableImages).toHaveLength(1);
      expect(importedRecipe.imageUrl).toBe('https://assets.afcdn.com/recipe/20210101/12345_w1024h768c1.jpg');
      expect(importedRecipe.ingredients).toHaveLength(1);
      expect(importedRecipe.steps).toHaveLength(1);
      expect(RecipeAiService.extractRecipeFromText).toHaveBeenCalledTimes(1);
    });

    it('throws error for unreachable recipe page', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(MarmitonService.importRecipeFromUrl('https://www.marmiton.org/recettes/recette_poulet.aspx'))
        .rejects.toThrow(/La page Marmiton n'a pas pu être chargée/);
    });
  });
});
