import { MarmitonService } from '../marmitonService';

describe('MarmitonService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('searchRecipes timeout error handling', () => {
    const originalFetch = global.fetch;
    const originalConsoleError = console.error;

    beforeEach(() => {
      global.fetch = jest.fn();
      console.error = jest.fn(); // Suppress console.error during test
    });

    afterEach(() => {
      global.fetch = originalFetch;
      console.error = originalConsoleError;
    });

    it('should throw timeout error when fetch is aborted', async () => {
      // Mock fetch to throw an AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(MarmitonService.searchRecipes('poulet')).rejects.toThrow(
        /Délai d'attente dépassé/
      );
    });

    it('should throw timeout error when fetch fails with timeout in message', async () => {
      // Mock fetch to throw an error with 'timeout' in message
      const timeoutError = new Error('network timeout occurred');
      (global.fetch as jest.Mock).mockRejectedValueOnce(timeoutError);

      await expect(MarmitonService.searchRecipes('poulet')).rejects.toThrow(
        /Délai d'attente dépassé/
      );
    });
  });
});
