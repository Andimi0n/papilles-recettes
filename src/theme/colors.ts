import { StyleSheet } from 'react-native';

export type ThemeId = 'botanique' | 'nocturne';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  // Brand & Accent Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  secondary: string;
  secondaryLight: string;

  amber: string;
  amberLight: string;

  // Neutrals & Surfaces
  background: string;
  cardBackground: string;
  surfaceAlt: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  borderLight: string;

  // Feedback & Badges
  danger: string;
  dangerLight: string;
  heart: string;
  heartLight: string;

  // Metadata
  isDark: boolean;
}

/**
 * Thème Clair : « Jardin Botanique & Slow Food »
 * Inspiré par la fraîcheur des aromates, le sapin velouté, la figue douce et l'amande pâle.
 */
export const BotaniqueColors: ThemeColors = {
  primary: '#2D6A4F',        // Vert sapin velouté
  primaryLight: '#E8F3ED',   // Voile céladon frais
  primaryDark: '#1B4332',    // Canopée profonde
  
  secondary: '#407058',      // Romarin & sauge
  secondaryLight: '#EEF5F0', // Brume mentholée
  
  amber: '#D97706',          // Miel d'acacia doré (étoiles)
  amberLight: '#FEF3C7',
  
  background: '#F3F7F4',     // Brume d'amande très pâle
  cardBackground: '#FFFFFF', // Blanc porcelaine
  surfaceAlt: '#E7EFEA',     // Pierre claire / argile
  
  textPrimary: '#15261D',    // Vert-noir ardoise
  textSecondary: '#4E6557',  // Sauge sombre
  textMuted: '#7E9688',      // Eucalyptus doux
  
  border: '#D7E3DC',         // Lichen délicat
  borderLight: '#E6EFEA',
  
  danger: '#C53030',
  dangerLight: '#FCEBEB',
  heart: '#854062',          // Figue douce
  heartLight: '#F7EBF0',
  
  isDark: false,
};

/**
 * Thème Sombre : « Table Nocturne & Club Gourmand »
 * Inspiré par les speakeasies, les bougies chaudes, le laiton doré et le cuir torréfié.
 */
export const NocturneColors: ThemeColors = {
  primary: '#E28743',        // Caramel ambré cuivré
  primaryLight: '#2C1E14',   // Cognac torréfié profond
  primaryDark: '#C26724',
  
  secondary: '#2E6F54',      // Émeraude nocturne feutré
  secondaryLight: '#16281F',
  
  amber: '#F59E0B',          // Lueur de bougie dorée (étoiles)
  amberLight: '#2E220D',
  
  background: '#121215',     // Noir velours espresso
  cardBackground: '#1C1C22', // Ardoise fumée chaude
  surfaceAlt: '#272730',     // Fonte / anthracite
  
  textPrimary: '#F5F2EB',    // Crème ivoire chaud
  textSecondary: '#A8A39C',  // Lin fumé
  textMuted: '#6E6A63',      // Cendres douces
  
  border: '#2E2D36',         // Métal feutré sombre
  borderLight: '#24232C',
  
  danger: '#F87171',
  dangerLight: '#341919',
  heart: '#E28743',          // Cuivre étincelant
  heartLight: '#2D1E16',
  
  isDark: true,
};

export const LightShadows = {
  small: {
    shadowColor: '#15261D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#15261D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#15261D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const DarkShadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Variable d'état interne pour le proxy et le cache
let _activeColors: ThemeColors = BotaniqueColors;
let _activeShadows = LightShadows;
let _activeThemeId: ThemeId = 'botanique';

export function setActiveThemeInternal(id: ThemeId) {
  _activeThemeId = id;
  if (id === 'nocturne') {
    _activeColors = NocturneColors;
    _activeShadows = DarkShadows;
  } else {
    _activeColors = BotaniqueColors;
    _activeShadows = LightShadows;
  }
}

export function getActiveThemeId(): ThemeId {
  return _activeThemeId;
}

export function getActiveColors(): ThemeColors {
  return _activeColors;
}

export function getActiveShadows() {
  return _activeShadows;
}

/**
 * Proxy dynamique transparent sur les couleurs :
 * Garantit que les lectures comme Colors.primary ou Colors.background
 * renvoient toujours la couleur du thème actuellement actif sans rechargement lourd.
 */
export const Colors = new Proxy({} as ThemeColors, {
  get(_target, prop: keyof ThemeColors) {
    return _activeColors[prop];
  },
  has(_target, prop) {
    return prop in _activeColors;
  },
  ownKeys(_target) {
    return Reflect.ownKeys(_activeColors);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(_activeColors, prop);
  },
});

/**
 * Proxy dynamique transparent sur les ombres
 */
export const Shadows = new Proxy({} as typeof LightShadows, {
  get(_target, prop: keyof typeof LightShadows) {
    return _activeShadows[prop];
  },
  has(_target, prop) {
    return prop in _activeShadows;
  },
  ownKeys(_target) {
    return Reflect.ownKeys(_activeShadows);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(_activeShadows, prop);
  },
});

/**
 * Usine de styles réactifs au thème :
 * Permet de définir des feuilles de styles StyleSheet qui se recalculent
 * automatiquement dès que l'utilisateur ou le système bascule de thème.
 */
export function createDynamicStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors, shadows: typeof LightShadows) => T
): T {
  let cachedThemeId: ThemeId | '' = '';
  let cachedStyles: any = null;

  return new Proxy({} as T, {
    get(_target, prop: string) {
      if (cachedThemeId !== _activeThemeId || !cachedStyles) {
        cachedStyles = StyleSheet.create(factory(_activeColors, _activeShadows));
        cachedThemeId = _activeThemeId;
      }
      return cachedStyles[prop];
    },
    has(_target, prop) {
      if (cachedThemeId !== _activeThemeId || !cachedStyles) {
        cachedStyles = StyleSheet.create(factory(_activeColors, _activeShadows));
        cachedThemeId = _activeThemeId;
      }
      return prop in cachedStyles;
    },
    ownKeys(_target) {
      if (cachedThemeId !== _activeThemeId || !cachedStyles) {
        cachedStyles = StyleSheet.create(factory(_activeColors, _activeShadows));
        cachedThemeId = _activeThemeId;
      }
      return Reflect.ownKeys(cachedStyles);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (cachedThemeId !== _activeThemeId || !cachedStyles) {
        cachedStyles = StyleSheet.create(factory(_activeColors, _activeShadows));
        cachedThemeId = _activeThemeId;
      }
      return Reflect.getOwnPropertyDescriptor(cachedStyles, prop);
    },
  });
}
