import { StyleSheet, Appearance } from 'react-native';

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
  backgroundSecondary: string;
  cardBackground: string;
  surfaceAlt: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  borderLight: string;
  borderMedium: string;

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
  backgroundSecondary: '#E7EFEA', // Pierre claire / argile
  cardBackground: '#FFFFFF', // Blanc porcelaine
  surfaceAlt: '#E7EFEA',     // Pierre claire / argile
  
  textPrimary: '#15261D',    // Vert-noir ardoise
  textSecondary: '#4E6557',  // Sauge sombre
  textMuted: '#7E9688',      // Eucalyptus doux
  
  border: '#D7E3DC',         // Lichen délicat
  borderLight: '#E6EFEA',
  borderMedium: '#D7E3DC',
  
  danger: '#C53030',
  dangerLight: '#FCEBEB',
  heart: '#854062',          // Figue douce
  heartLight: '#F7EBF0',
  
  isDark: false,
};

/**
 * Thème Sombre : « Table Nocturne & Sauge Céleste »
 * Une esthétique culinaire moderne, apaisante et hautement contrastée :
 * Ardoise minérale profonde, touches émeraude lumineuse, sauge argentée, miel doré et framboise gourmande.
 */
export const NocturneColors: ThemeColors = {
  primary: '#38B27A',        // Émeraude culinaire lumineuse et raffinée
  primaryLight: '#143325',   // Voile vert sombre délicat
  primaryDark: '#237B50',    // Émeraude profonde
  
  secondary: '#5FB49C',      // Sauge & eucalyptus moderne
  secondaryLight: '#162F27', // Brume végétale nocturne
  
  amber: '#F59E0B',          // Éclat miel d'or / safran chaud (étoiles)
  amberLight: '#2C220E',     // Fond ambré discret
  
  background: '#101413',     // Ardoise obsidienne très sombre (nuance forêt subtile)
  backgroundSecondary: '#232C28', // Surface contrastée / pierre d'ardoise
  cardBackground: '#181F1C', // Carte ardoise minérale élégante
  surfaceAlt: '#232C28',     // Surface contrastée / pierre d'ardoise
  
  textPrimary: '#F2F6F3',    // Ivoire doux haute lisibilité
  textSecondary: '#A0B3A7',  // Sauge argentée douce
  textMuted: '#687B70',      // Céladon ardoisé discret
  
  border: '#28362F',         // Délimitation minérale fine
  borderLight: '#1E2923',    // Filet très discret
  borderMedium: '#28362F',    // Filet très discret
  
  danger: '#F87171',         // Corail d'alerte vif
  dangerLight: '#321616',
  heart: '#E25575',          // Framboise gourmande
  heartLight: '#341620',
  
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
  card: {
    shadowColor: '#15261D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Initialisation synchronisée avec l'apparence système dès le chargement du module
const _initialIsDark = Appearance.getColorScheme() === 'dark';
let _activeColors: ThemeColors = _initialIsDark ? NocturneColors : BotaniqueColors;
let _activeShadows = _initialIsDark ? DarkShadows : LightShadows;
let _activeThemeId: ThemeId = _initialIsDark ? 'nocturne' : 'botanique';

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
export function createDynamicStyles<T extends Parameters<typeof StyleSheet.create>[0]>(
  factory: (colors: ThemeColors, shadows: typeof LightShadows) => T
): ReturnType<typeof StyleSheet.create<T>> {
  let cachedThemeId: ThemeId | '' = '';
  let cachedStyles: any = null;

  return new Proxy({} as ReturnType<typeof StyleSheet.create<T>>, {
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
