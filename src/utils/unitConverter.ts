import { normalizeUnit } from '../constants/units';
import { convertUnicodeFractions } from './helpers';

export type ConversionMode = 'original' | 'mass' | 'volume';

export type UnitType = 'mass' | 'metric_volume' | 'spoon_volume' | 'unconvertible';

// Ratios de masse vers grammes (g)
const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
};

// Ratios de volume métrique vers millilitres (ml)
const METRIC_VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  cl: 10,
  l: 1000,
};

// Ratios de mesures de chef / cuillères vers millilitres (ml)
const SPOON_VOLUME_TO_ML: Record<string, number> = {
  'c. à soupe': 15,
  'c. à café': 5,
  verre: 200,
  tasse: 250,
};

/**
 * Normalise une chaîne d'unité pour l'analyse de conversion
 */
export function getNormalizedUnitKey(unit?: string): string {
  if (!unit) return '';
  return normalizeUnit(unit).toLowerCase().trim();
}

/**
 * Détermine la catégorie de conversion d'une unité
 */
export function getUnitType(unit?: string): UnitType {
  const key = getNormalizedUnitKey(unit);
  if (!key) return 'unconvertible';

  if (MASS_TO_GRAMS[key] !== undefined) {
    return 'mass';
  }
  if (METRIC_VOLUME_TO_ML[key] !== undefined) {
    return 'metric_volume';
  }
  if (SPOON_VOLUME_TO_ML[key] !== undefined) {
    return 'spoon_volume';
  }

  return 'unconvertible';
}

/**
 * Tente d'extraire une valeur numérique flottante d'une quantité brute.
 * Gère fractions Unicode (½), fractions textuelles (1/2, 1 1/2), fourchettes ("2-3"), virgules décimales.
 */
export function parseQuantityNumber(qtyStr?: string): number | null {
  if (!qtyStr || !qtyStr.trim()) return null;
  const trimmed = convertUnicodeFractions(qtyStr.trim()).replace(',', '.');

  // Fourchette simple "2-3" ou "2 à 3" -> moyenne arithmétique
  const range = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:-|–|à|a)\s*(\d+(?:\.\d+)?)$/i);
  if (range) {
    const min = parseFloat(range[1]);
    const max = parseFloat(range[2]);
    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
      return (min + max) / 2;
    }
  }

  // Nombre composé avec fraction "1 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = parseFloat(mixed[1]);
    const n = parseFloat(mixed[2]);
    const d = parseFloat(mixed[3]);
    if (d !== 0 && !isNaN(whole) && !isNaN(n) && !isNaN(d)) {
      return whole + n / d;
    }
  }

  // Fraction simple "1/2"
  const frac = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const n = parseFloat(frac[1]);
    const d = parseFloat(frac[2]);
    if (d !== 0 && !isNaN(n) && !isNaN(d)) {
      return n / d;
    }
  }

  // Nombre pur
  const num = parseFloat(trimmed);
  return !isNaN(num) && num > 0 ? num : null;
}

/**
 * Formate un nombre de manière lisible pour la cuisine
 */
function formatConvertedNumber(num: number): string {
  if (num <= 0) return '0';
  if (Number.isInteger(num)) return num.toString();

  // Pour les valeurs >= 10 (ex: 15 g, 250 ml), arrondir à l'entier
  if (num >= 10) {
    return Math.round(num).toString();
  }

  // Pour les petites valeurs < 10, garder 1 décimale si nécessaire
  const rounded = Math.round(num * 10) / 10;
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }

  return rounded.toString().replace('.', ',');
}

export interface ConvertedQuantityResult {
  quantity: string;
  unit: string;
  isConverted: boolean;
  targetMode: ConversionMode;
}

/**
 * Convertit une quantité et unité d'ingrédient vers le mode cible demandé
 */
export function convertIngredientQuantity(
  rawQuantity: string | undefined,
  rawUnit: string | undefined,
  target: ConversionMode,
  density?: number
): ConvertedQuantityResult {
  const fallback = {
    quantity: rawQuantity || '',
    unit: rawUnit || '',
    isConverted: false,
    targetMode: 'original' as ConversionMode,
  };

  if (target === 'original') {
    return fallback;
  }

  const num = parseQuantityNumber(rawQuantity);
  if (num === null) {
    return fallback;
  }

  const unitType = getUnitType(rawUnit);
  if (unitType === 'unconvertible') {
    return fallback;
  }

  const unitKey = getNormalizedUnitKey(rawUnit);
  const hasValidDensity = typeof density === 'number' && density > 0;

  // 1. Cible : TOUT EN GRAMMES ('mass')
  if (target === 'mass') {
    if (unitType === 'mass') {
      const grams = num * MASS_TO_GRAMS[unitKey];
      // Si déjà en grammes entiers, pas de conversion superflue
      if (unitKey === 'g' && Math.abs(grams - num) < 0.001) {
        return fallback;
      }
      return {
        quantity: formatConvertedNumber(grams),
        unit: 'g',
        isConverted: true,
        targetMode: 'mass',
      };
    }

    // Volume métrique ou cuillère vers masse
    if (unitType === 'metric_volume' || unitType === 'spoon_volume') {
      if (!hasValidDensity) {
        // Pas de densité renseignée : conversion impossible
        return fallback;
      }
      const ml =
        unitType === 'metric_volume'
          ? num * METRIC_VOLUME_TO_ML[unitKey]
          : num * SPOON_VOLUME_TO_ML[unitKey];
      const grams = ml * density!;
      return {
        quantity: formatConvertedNumber(grams),
        unit: 'g',
        isConverted: true,
        targetMode: 'mass',
      };
    }
  }

  // 2. Cible : TOUT EN VOLUME ('volume')
  if (target === 'volume') {
    if (unitType === 'mass') {
      if (!hasValidDensity) {
        // Pas de densité renseignée : conversion impossible
        return fallback;
      }
      const grams = num * MASS_TO_GRAMS[unitKey];
      const ml = grams / density!;
      return formatMetricVolume(ml);
    }

    if (unitType === 'metric_volume') {
      const ml = num * METRIC_VOLUME_TO_ML[unitKey];
      // Si déjà dans une unité métrique propre (ml, cl ou L), on peut conserver ou harmoniser
      // Si c'est cl ou L, et qu'on demande 'volume', c'est déjà du volume
      // On re-formate seulement si c'était par exemple 0.05 L ou 1500 ml
      return formatMetricVolume(ml);
    }

    if (unitType === 'spoon_volume') {
      // Cuillère vers millilitres / centilitres standard
      const ml = num * SPOON_VOLUME_TO_ML[unitKey];
      return formatMetricVolume(ml);
    }
  }

  return fallback;
}

/**
 * Formate un volume en millilitres vers l'unité métrique la plus naturelle (ml, cl, L)
 */
function formatMetricVolume(ml: number): ConvertedQuantityResult {
  if (ml >= 1000) {
    const liters = ml / 1000;
    const roundedL = Math.round(liters * 100) / 100;
    return {
      quantity: roundedL.toString().replace('.', ','),
      unit: 'L',
      isConverted: true,
      targetMode: 'volume',
    };
  }

  if (ml >= 100) {
    // Si c'est un multiple de 10 cl (ex: 200 ml -> 20 cl, 250 ml -> 25 cl)
    if (ml % 10 === 0) {
      return {
        quantity: formatConvertedNumber(ml / 10),
        unit: 'cl',
        isConverted: true,
        targetMode: 'volume',
      };
    }
    return {
      quantity: formatConvertedNumber(ml),
      unit: 'ml',
      isConverted: true,
      targetMode: 'volume',
    };
  }

  // En dessous de 100 ml (ex: 15 ml, 30 ml, 50 ml)
  return {
    quantity: formatConvertedNumber(ml),
    unit: 'ml',
    isConverted: true,
    targetMode: 'volume',
  };
}

/**
 * Détermine le prochain mode de conversion lors d'un tap sur la quantité d'un ingrédient spécifique.
 * Règle stricte : Unité de base -> volume/poids -> volume/poids -> Unité de base.
 * Si pas possible de convertir, on reste sur l'unité de base.
 */
export function getNextConversionTarget(
  currentMode: ConversionMode,
  rawUnit?: string,
  density?: number
): ConversionMode {
  const unitType = getUnitType(rawUnit);
  if (unitType === 'unconvertible') {
    return 'original';
  }

  const hasDensity = typeof density === 'number' && density > 0;

  // CAS 1 : Unité de base en MASSE (ex: 250 g de farine)
  // Cycle : original -> volume -> original
  if (unitType === 'mass') {
    if (!hasDensity) {
      return 'original';
    }
    if (currentMode === 'original' || currentMode === 'mass') {
      return 'volume';
    }
    return 'original';
  }

  // CAS 2 : Unité de base en VOLUME MÉTRIQUE (ex: 20 cl de crème ou 250 ml d'eau)
  // Cycle : original -> mass -> original
  if (unitType === 'metric_volume') {
    if (!hasDensity) {
      return 'original';
    }
    if (currentMode === 'original' || currentMode === 'volume') {
      return 'mass';
    }
    return 'original';
  }

  // CAS 3 : Unité de chef / cuillère (ex: 2 c. à soupe d'huile)
  // Avec densité : original -> mass -> volume -> original
  // Sans densité : original -> volume -> original
  if (unitType === 'spoon_volume') {
    if (hasDensity) {
      if (currentMode === 'original') {
        return 'mass';
      }
      if (currentMode === 'mass') {
        return 'volume';
      }
      return 'original';
    } else {
      if (currentMode === 'original') {
        return 'volume';
      }
      return 'original';
    }
  }

  return 'original';
}

/**
 * Détermine si un ingrédient est convertible (permet d'afficher un indicateur d'interactivité)
 */
export function isIngredientConvertible(
  rawQuantity?: string,
  rawUnit?: string,
  density?: number
): boolean {
  if (!parseQuantityNumber(rawQuantity)) return false;
  const unitType = getUnitType(rawUnit);
  if (unitType === 'unconvertible') return false;

  const hasDensity = typeof density === 'number' && density > 0;

  if (unitType === 'mass' || unitType === 'metric_volume') {
    return hasDensity;
  }

  if (unitType === 'spoon_volume') {
    return true; // Même sans densité, convertible en volume métrique (ml)
  }

  return false;
}
