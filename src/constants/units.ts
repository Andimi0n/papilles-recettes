export type UnitCategory = 'mass' | 'volume' | 'spoon' | 'piece' | 'container';

export interface StandardUnit {
  id: string;
  label: string;
  shortLabel: string;
  category: UnitCategory;
  aliases: string[];
}

export interface UnitCategoryConfig {
  id: UnitCategory;
  label: string;
  icon: string;
}

export const UNIT_CATEGORIES: UnitCategoryConfig[] = [
  { id: 'mass', label: 'Masse & Poids', icon: 'scale-outline' },
  { id: 'volume', label: 'Volume & Liquides', icon: 'water-outline' },
  { id: 'spoon', label: 'Mesures de chef', icon: 'restaurant-outline' },
  { id: 'piece', label: 'Unités & Pièces', icon: 'shapes-outline' },
  { id: 'container', label: 'Conditionnements', icon: 'cube-outline' },
];

export const STANDARD_UNITS: StandardUnit[] = [
  // --- Masse ---
  {
    id: 'g',
    label: 'grammes (g)',
    shortLabel: 'g',
    category: 'mass',
    aliases: ['g', 'gr', 'gramme', 'grammes'],
  },
  {
    id: 'kg',
    label: 'kilogrammes (kg)',
    shortLabel: 'kg',
    category: 'mass',
    aliases: ['kg', 'kilo', 'kilos', 'kilogramme', 'kilogrammes'],
  },
  {
    id: 'mg',
    label: 'milligrammes (mg)',
    shortLabel: 'mg',
    category: 'mass',
    aliases: ['mg', 'milligramme', 'milligrammes'],
  },

  // --- Volume ---
  {
    id: 'ml',
    label: 'millilitres (ml)',
    shortLabel: 'ml',
    category: 'volume',
    aliases: ['ml', 'millilitre', 'millilitres'],
  },
  {
    id: 'cl',
    label: 'centilitres (cl)',
    shortLabel: 'cl',
    category: 'volume',
    aliases: ['cl', 'centilitre', 'centilitres'],
  },
  {
    id: 'l',
    label: 'litres (L)',
    shortLabel: 'L',
    category: 'volume',
    aliases: ['l', 'litre', 'litres', 'L'],
  },

  // --- Cuillères & Mesures de chef ---
  {
    id: 'c. à soupe',
    label: 'cuillère à soupe (c.à.s)',
    shortLabel: 'c.à.s',
    category: 'spoon',
    aliases: ['c. à soupe', 'c a soupe', 'cuillere a soupe', 'cuilleres a soupe', 'cas', 'c.a.s', 'c.à.s'],
  },
  {
    id: 'c. à café',
    label: 'cuillère à café (c.à.c)',
    shortLabel: 'c.à.c',
    category: 'spoon',
    aliases: ['c. à café', 'c a cafe', 'cuillere a cafe', 'cuilleres a cafe', 'cac', 'c.a.c', 'c.à.c'],
  },
  {
    id: 'pincée',
    label: 'pincée',
    shortLabel: 'pincée',
    category: 'spoon',
    aliases: ['pincee', 'pincees', 'pincée', 'pincées'],
  },
  {
    id: 'poignée',
    label: 'poignée',
    shortLabel: 'poignée',
    category: 'spoon',
    aliases: ['poignee', 'poignees', 'poignée', 'poignées'],
  },
  {
    id: 'pointe',
    label: 'pointe (de couteau)',
    shortLabel: 'pointe',
    category: 'spoon',
    aliases: ['pointe', 'pointes'],
  },
  {
    id: 'filet',
    label: 'filet',
    shortLabel: 'filet',
    category: 'spoon',
    aliases: ['filet', 'filets'],
  },
  {
    id: 'trait',
    label: 'trait',
    shortLabel: 'trait',
    category: 'spoon',
    aliases: ['trait', 'traits'],
  },
  {
    id: 'goutte',
    label: 'goutte',
    shortLabel: 'goutte',
    category: 'spoon',
    aliases: ['goutte', 'gouttes'],
  },

  // --- Unités & Pièces ---
  {
    id: 'pièce',
    label: 'pièce (unité)',
    shortLabel: 'pièce',
    category: 'piece',
    aliases: ['piece', 'pieces', 'pièce', 'pièces', 'pcs', 'pc'],
  },
  {
    id: 'gousse',
    label: 'gousse',
    shortLabel: 'gousse',
    category: 'piece',
    aliases: ['gousse', 'gousses'],
  },
  {
    id: 'tranche',
    label: 'tranche',
    shortLabel: 'tranche',
    category: 'piece',
    aliases: ['tranche', 'tranches'],
  },
  {
    id: 'morceau',
    label: 'morceau',
    shortLabel: 'morceau',
    category: 'piece',
    aliases: ['morceau', 'morceaux'],
  },
  {
    id: 'branche',
    label: 'branche',
    shortLabel: 'branche',
    category: 'piece',
    aliases: ['branche', 'branches'],
  },
  {
    id: 'brin',
    label: 'brin',
    shortLabel: 'brin',
    category: 'piece',
    aliases: ['brin', 'brins'],
  },
  {
    id: 'botte',
    label: 'botte',
    shortLabel: 'botte',
    category: 'piece',
    aliases: ['botte', 'bottes'],
  },
  {
    id: 'feuille',
    label: 'feuille',
    shortLabel: 'feuille',
    category: 'piece',
    aliases: ['feuille', 'feuilles'],
  },
  {
    id: 'zeste',
    label: 'zeste',
    shortLabel: 'zeste',
    category: 'piece',
    aliases: ['zeste', 'zestes'],
  },
  {
    id: 'noisette',
    label: 'noisette',
    shortLabel: 'noisette',
    category: 'piece',
    aliases: ['noisette', 'noisettes'],
  },

  // --- Conditionnements & Récipients ---
  {
    id: 'boîte',
    label: 'boîte / conserve',
    shortLabel: 'boîte',
    category: 'container',
    aliases: ['boite', 'boites', 'boîte', 'boîtes', 'conserve', 'conserves'],
  },
  {
    id: 'bocal',
    label: 'bocal',
    shortLabel: 'bocal',
    category: 'container',
    aliases: ['bocal', 'bocaux'],
  },
  {
    id: 'pot',
    label: 'pot',
    shortLabel: 'pot',
    category: 'container',
    aliases: ['pot', 'pots'],
  },
  {
    id: 'sachet',
    label: 'sachet',
    shortLabel: 'sachet',
    category: 'container',
    aliases: ['sachet', 'sachets'],
  },
  {
    id: 'paquet',
    label: 'paquet',
    shortLabel: 'paquet',
    category: 'container',
    aliases: ['paquet', 'paquets'],
  },
  {
    id: 'brique',
    label: 'brique',
    shortLabel: 'brique',
    category: 'container',
    aliases: ['brique', 'briques'],
  },
  {
    id: 'barquette',
    label: 'barquette',
    shortLabel: 'barquette',
    category: 'container',
    aliases: ['barquette', 'barquettes'],
  },
  {
    id: 'bouteille',
    label: 'bouteille',
    shortLabel: 'bouteille',
    category: 'container',
    aliases: ['bouteille', 'bouteilles'],
  },
  {
    id: 'tablette',
    label: 'tablette',
    shortLabel: 'tablette',
    category: 'container',
    aliases: ['tablette', 'tablettes'],
  },
  {
    id: 'verre',
    label: 'verre',
    shortLabel: 'verre',
    category: 'container',
    aliases: ['verre', 'verres'],
  },
  {
    id: 'tasse',
    label: 'tasse',
    shortLabel: 'tasse',
    category: 'container',
    aliases: ['tasse', 'tasses'],
  },
];

/**
 * Puces d'accès rapide 1-tap pour le mobile.
 * Sélection des unités les plus courantes en courses et cuisine.
 */
export const QUICK_PICK_UNITS: string[] = [
  'g',
  'kg',
  'ml',
  'cl',
  'l',
  'c. à soupe',
  'c. à café',
  'pièce',
  'tranche',
  'boîte',
  'sachet',
];

/**
 * Table de hachage O(1) alias -> StandardUnit
 */
const ALIAS_TO_UNIT_MAP: Map<string, StandardUnit> = new Map();
STANDARD_UNITS.forEach((unit) => {
  ALIAS_TO_UNIT_MAP.set(unit.id.toLowerCase(), unit);
  ALIAS_TO_UNIT_MAP.set(unit.shortLabel.toLowerCase(), unit);
  unit.aliases.forEach((alias) => {
    ALIAS_TO_UNIT_MAP.set(alias.toLowerCase().trim(), unit);
  });
});

/**
 * Normalise une chaîne d'unité quelconque vers sa forme canonique si reconnue,
 * sinon renvoie la chaîne nettoyée (entrée libre préservée).
 */
export function normalizeUnit(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const clean = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const match = ALIAS_TO_UNIT_MAP.get(clean) || ALIAS_TO_UNIT_MAP.get(trimmed.toLowerCase());
  if (match) {
    return match.id;
  }

  return trimmed;
}

/**
 * Trouve la définition de l'unité standard correspondante (si reconnue).
 */
export function findStandardUnit(raw?: string): StandardUnit | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const clean = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ALIAS_TO_UNIT_MAP.get(clean) || ALIAS_TO_UNIT_MAP.get(trimmed.toLowerCase());
}

/**
 * Détermine si une chaîne correspond à une unité standard reconnue.
 */
export function isStandardUnit(raw?: string): boolean {
  return findStandardUnit(raw) !== undefined;
}

/**
 * Formate proprement l'affichage d'une quantité et son unité
 * Évite les doubles espaces ou les espaces superflus quand l'unité est vide.
 */
export function formatQuantityWithUnit(quantity?: string, unit?: string): string {
  const q = quantity?.trim();
  const u = unit?.trim();
  if (q && u) {
    return `${q} ${u}`;
  }
  if (q) return q;
  if (u) return u;
  return '';
}
