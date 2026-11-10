/**
 * Type pour un élément pouvant fournir une photo de recette
 */
export type RecipePhotoCandidate =
  | { imageUrl?: string | null; [key: string]: any }
  | string
  | null
  | undefined;

/**
 * Type garantissant un tuple de 4 emplacements (string ou null)
 */
export type FolderMosaicSlotTuple = [
  string | null,
  string | null,
  string | null,
  string | null,
];

/**
 * Fonction pure extrayant les 4 premières photos disponibles parmi une liste de recettes
 * et garantissant toujours un tableau de 4 slots [slot0, slot1, slot2, slot3].
 * Les slots non pourvus sont remplis avec `null`.
 *
 * @param recipes Liste de recettes ou d'URLs de photos
 * @returns Tuple de 4 slots (URL ou null)
 */
export function getFolderMosaicImages(
  recipes?: readonly RecipePhotoCandidate[] | RecipePhotoCandidate[] | null
): FolderMosaicSlotTuple {
  if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
    return [null, null, null, null];
  }

  const validImages: string[] = [];

  for (let i = 0; i < recipes.length && validImages.length < 4; i++) {
    const item = recipes[i];
    if (!item) continue;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        validImages.push(trimmed);
      }
    } else if (typeof item === 'object' && typeof item.imageUrl === 'string') {
      const trimmed = item.imageUrl.trim();
      if (trimmed.length > 0) {
        validImages.push(trimmed);
      }
    }
  }

  return [
    validImages[0] ?? null,
    validImages[1] ?? null,
    validImages[2] ?? null,
    validImages[3] ?? null,
  ];
}
