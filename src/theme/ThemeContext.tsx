import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import {
  ThemeId,
  ThemeMode,
  ThemeColors,
  BotaniqueColors,
  NocturneColors,
  LightShadows,
  DarkShadows,
  setActiveThemeInternal,
} from './colors';
import { StorageService } from '../services/storageService';

interface ThemeContextType {
  themeId: ThemeId;
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  shadows: typeof LightShadows;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'botanique',
  themeMode: 'system',
  isDark: false,
  colors: BotaniqueColors,
  shadows: LightShadows,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setRerenderVersion] = useState(0);

  // Détermine si on doit afficher le thème sombre
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return deviceColorScheme === 'dark';
  }, [themeMode, deviceColorScheme]);

  const themeId: ThemeId = isDark ? 'nocturne' : 'botanique';
  const colors = isDark ? NocturneColors : BotaniqueColors;
  const shadows = isDark ? DarkShadows : LightShadows;

  // Synchronise le singleton interne pour les proxies Colors et createDynamicStyles
  useEffect(() => {
    setActiveThemeInternal(themeId);
    setRerenderVersion((v) => v + 1);
  }, [themeId]);

  // Chargement de la préférence utilisateur sauvegardée
  useEffect(() => {
    const loadStoredTheme = async () => {
      try {
        const stored = await StorageService.getThemeMode();
        if (stored) {
          setThemeModeState(stored);
        }
      } catch (e) {
        console.error('Erreur chargement mode thème:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadStoredTheme();
  }, []);

  // Écoute dynamique les changements d'apparence système (si l'utilisateur bascule son OS)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        const targetId: ThemeId = colorScheme === 'dark' ? 'nocturne' : 'botanique';
        setActiveThemeInternal(targetId);
        setRerenderVersion((v) => v + 1);
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await StorageService.saveThemeMode(mode);
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    // Si on est actuellement sombre -> bascule clair, sinon bascule sombre
    const nextMode: ThemeMode = isDark ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [isDark, setThemeMode]);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      themeId,
      themeMode,
      isDark,
      colors,
      shadows,
      setThemeMode,
      toggleTheme,
    }),
    [themeId, themeMode, isDark, colors, shadows, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
