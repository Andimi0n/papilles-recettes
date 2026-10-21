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
  isLoaded: boolean;
  colors: ThemeColors;
  shadows: typeof LightShadows;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const initialDeviceDark = Appearance.getColorScheme() === 'dark';

const ThemeContext = createContext<ThemeContextType>({
  themeId: initialDeviceDark ? 'nocturne' : 'botanique',
  themeMode: 'system',
  isDark: initialDeviceDark,
  isLoaded: false,
  colors: initialDeviceDark ? NocturneColors : BotaniqueColors,
  shadows: initialDeviceDark ? DarkShadows : LightShadows,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useColorScheme();
  const [systemColorScheme, setSystemColorScheme] = useState<'light' | 'dark'>(
    (deviceColorScheme || Appearance.getColorScheme()) === 'dark' ? 'dark' : 'light'
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronise dès que le hook Expo/RN useColorScheme change
  useEffect(() => {
    if (deviceColorScheme) {
      setSystemColorScheme(deviceColorScheme === 'dark' ? 'dark' : 'light');
    }
  }, [deviceColorScheme]);

  // Écoute dynamique les changements d'apparence système via Appearance (quand l'utilisateur bascule son OS)
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme) {
        setSystemColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });
    return () => subscription.remove();
  }, []);

  // Détermine si on doit afficher le thème sombre
  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const themeId: ThemeId = isDark ? 'nocturne' : 'botanique';
  const colors = isDark ? NocturneColors : BotaniqueColors;
  const shadows = isDark ? DarkShadows : LightShadows;

  // IMPORTANT : Synchronisation synchrone immédiate du singleton interne AVANT le rendu des composants enfants
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
    // Si on est actuellement sombre -> bascule clair, sinon bascule sombre
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
