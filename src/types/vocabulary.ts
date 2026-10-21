import { ShoppingAisle } from './shopping';

export interface CanonicalIngredient {
  id: string;               // Identifiant unique, ex: "ing_carotte"
  canonicalName: string;    // Nom officiel d'affichage (ex: "Carotte", "Petits pois", "Muscade")
  normalizedName: string;   // Nom minuscule sans accent pour recherche O(1) (ex: "carotte")
  aliases: string[];        // Alias, synonymes ou variantes (ex: ["carottes", "carotte epluchee", "carotte rapee"])
  defaultAisle: ShoppingAisle; // Rayon de supermarché associé par défaut
  isCustom?: boolean;       // Vrai si créé manuellement par l'utilisateur ou auto-appris
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
}
