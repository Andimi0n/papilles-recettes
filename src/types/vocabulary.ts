import { ShoppingAisle } from './shopping';

/**
 * Les 14 familles d'allergènes majeurs (Règlement UE n° 1169/2011 - INCO)
 */
export type AllergenFamily =
  | 'gluten'
  | 'crustaces'
  | 'oeufs'
  | 'poissons'
  | 'arachides'
  | 'soja'
  | 'lait'
  | 'fruits_a_coque'
  | 'celeri'
  | 'moutarde'
  | 'sesame'
  | 'sulfites'
  | 'lupin'
  | 'mollusques';

export interface AllergenFamilyConfig {
  id: AllergenFamily;
  name: string;        // Nom officiel de la famille (ex: "Gluten", "Lait & Lactose")
  emoji: string;       // Émoji représentatif
  description: string; // Exemples d'ingrédients associés
}

export const ALLERGEN_FAMILIES: AllergenFamilyConfig[] = [
  { id: 'gluten', name: 'Gluten', emoji: '🌾', description: 'Blé, seigle, orge, avoine, épeautre, farine, pâtes, pain...' },
  { id: 'crustaces', name: 'Crustacés', emoji: '🦐', description: 'Crevettes, crabe, homard, langoustines, écrevisses...' },
  { id: 'oeufs', name: 'Œufs', emoji: '🥚', description: 'Œufs entiers, blanc, jaune, mayonnaise...' },
  { id: 'poissons', name: 'Poissons', emoji: '🐟', description: 'Saumon, thon, cabillaud, colin, truite, anchois...' },
  { id: 'arachides', name: 'Arachides', emoji: '🥜', description: 'Cacahuètes, beurre de cacahuète, huile d\'arachide...' },
  { id: 'soja', name: 'Soja', emoji: '🌱', description: 'Tofu, sauce soja, edamame, pousses de soja...' },
  { id: 'lait', name: 'Lait & Lactose', emoji: '🥛', description: 'Lait, beurre, crème, fromages, yaourts, parmesan...' },
  { id: 'fruits_a_coque', name: 'Fruits à coque', emoji: '🌰', description: 'Amandes, noisettes, noix, noix de cajou, pistaches...' },
  { id: 'celeri', name: 'Céleri', emoji: '🥬', description: 'Céleri branche, céleri rave, sel de céleri...' },
  { id: 'moutarde', name: 'Moutarde', emoji: '🟡', description: 'Moutarde de Dijon, graines de moutarde...' },
  { id: 'sesame', name: 'Sésame', emoji: '⚪', description: 'Graines de sésame, huile de sésame, tahini...' },
  { id: 'sulfites', name: 'Sulfites', emoji: '🍷', description: 'Vin blanc, vin rouge, vinaigre balsamique...' },
  { id: 'lupin', name: 'Lupin', emoji: '🫘', description: 'Farine de lupin, graines de lupin...' },
  { id: 'mollusques', name: 'Mollusques', emoji: '🦪', description: 'Moules, huîtres, calmars, poulpes, escargots...' },
];

/**
 * Élément de la liste personnelle d'allergènes de l'utilisateur
 */
export interface UserAllergenItem {
  id: string;                      // Identifiant unique
  canonicalId?: string;            // Identifiant de l'ingrédient dans le lexique (si répertorié)
  name: string;                   // Nom canonique d'affichage
  allergenFamily?: AllergenFamily | null; // Famille d'allergène majeure ou null/undefined ('autre')
  addedAt: string;                // Date d'ajout ISO
}

export interface CanonicalIngredient {
  id: string;               // Identifiant unique, ex: "ing_carotte"
  canonicalName: string;    // Nom officiel d'affichage (ex: "Carotte", "Petits pois", "Muscade")
  normalizedName: string;   // Nom minuscule sans accent pour recherche O(1) (ex: "carotte")
  aliases: string[];        // Alias, synonymes ou variantes (ex: ["carottes", "carotte epluchee", "carotte rapee"])
  defaultAisle: ShoppingAisle; // Rayon de supermarché associé par défaut
  isCustom?: boolean;       // Vrai si créé manuellement par l'utilisateur ou auto-appris
  isPantryStaple?: boolean; // Vrai si ingrédient de base / fond de placard (sel, poivre, huile, épices...)
  allergen?: AllergenFamily; // Famille d'allergène majeure verrouillée (optionnel, 1 des 14 familles INCO)
  usageCount: number;       // Compteur d'utilisation pour ordonner les suggestions d'autocomplétion
  createdAt: string;
  updatedAt: string;
}

export interface NormalizationResult {
  name: string;             // Nom canonique résolu (ex: "Petits pois")
  quantity?: string;        // Quantité extraite ou conservée (ex: "1")
  unit?: string;            // Unité ou contenant extrait (ex: "boîte")
  originalName: string;     // Nom brut avant normalisation
  wasNormalized: boolean;   // Indique si le terme a été modifié/standardisé
  canonicalId?: string;     // Identifiant de l'ingrédient dans le référentiel s'il a été matché
  matchedAlias?: string;    // L'alias qui a permis la correspondance
  isPantryStaple?: boolean; // Vrai si ingrédient de base / fond de placard
  isOptional?: boolean;     // Vrai si facultatif / optionnel
}
