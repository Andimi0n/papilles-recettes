import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ThemeId,
  ThemeMode,
  ThemeColors,
  BotaniqueColors,
  NocturneColors,
  ColorblindColors,
  LightShadows,
  DarkShadows,
  setActiveThemeInternal,
} from './colors';
import { StorageService } from '../services/storageService';

interface ThemeContextType {
  themeId: ThemeId;
  themeMode: ThemeMode;
  isDark: boolean;
  isLoaded: boolean;
  colors: ThemeColors;
  shadows: typeof LightShadows;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'botanique',
  themeMode: 'light',
  isDark: false,
  isLoaded: false,
  colors: BotaniqueColors,
  shadows: LightShadows,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialThemeMode?: ThemeMode }> = ({
  children,
  initialThemeMode,
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode || 'light');
  const [isLoaded, setIsLoaded] = useState(Boolean(initialThemeMode));

  const isDark = themeMode === 'dark';
  const themeId: ThemeId = themeMode === 'colorblind' ? 'colorblind' : isDark ? 'nocturne' : 'botanique';
  const colors = themeMode === 'colorblind' ? ColorblindColors : isDark ? NocturneColors : BotaniqueColors;
  const shadows = isDark ? DarkShadows : LightShadows;

  // Synchronisation synchrone immédiate du singleton interne AVANT le rendu des composants enfants
  setActiveThemeInternal(themeId);

  // Chargement de la préférence utilisateur sauvegardée en stockage local
  useEffect(() => {
    let isMounted = true;
    const loadStoredTheme = async () => {
      try {
        const stored = await StorageService.getThemeMode();
        if (isMounted && stored) {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.error('Erreur chargement mode thème:', e);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    };
    loadStoredTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await StorageService.saveThemeMode(mode);
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      themeId,
      themeMode,
      isDark,
      isLoaded,
      colors,
      shadows,
      setThemeMode,
      toggleTheme,
    }),
    [themeId, themeMode, isDark, isLoaded, colors, shadows, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
