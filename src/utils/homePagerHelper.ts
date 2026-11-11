/**
 * homePagerHelper.ts
 *
 * Moteur de calcul et de filtrage gestuel pour la navigation entre
 * les onglets « Recettes » et « Dossiers » sur l'écran d'accueil.
 *
 * Règles :
 * - Geste de swipe horizontal strict : |dx| > 25 && |dx| > |dy| * 2
 * - Exclusion stricte de la zone du bandeau de filtres (FILTER_BAR_HEIGHT = 88)
 * - Directionnalité selon l'onglet actif (recipes -> gauche, folders -> droite)
 * - Désactivation immédiate en mode sélection ou en présence d'une modale
 */

export type HomeViewTab = 'recipes' | 'folders';

export interface HomeSwipeGestureState {
  dx: number;
  dy: number;
  vx?: number;
}

export interface ShouldCaptureSwipeOptions {
  gestureState: HomeSwipeGestureState;
  locationY?: number;
  activeTab: HomeViewTab;
  activeFolderId?: string | null;
  isSelectionMode?: boolean;
  isModalOpen?: boolean;
  filterBarHeight?: number;
}

/**
 * Détermine si le PanResponder de l'accueil doit capturer le geste horizontal
 */
export function shouldCaptureHomeTabSwipe(options: ShouldCaptureSwipeOptions): boolean {
  const {
    gestureState,
    locationY,
    activeTab,
    activeFolderId,
    isSelectionMode = false,
    isModalOpen = false,
    filterBarHeight = 88,
  } = options;

  // 1. Gardes : modale ouverte, mode sélection multiple actif ou navigation intérieure d'un dossier
  if (isModalOpen || isSelectionMode || Boolean(activeFolderId)) {
    return false;
  }

  // 2. Seuil strict : |dx| > 25 et |dx| > |dy| * 2
  const absDx = Math.abs(gestureState.dx);
  const absDy = Math.abs(gestureState.dy);
  if (absDx <= 25 || absDx <= absDy * 2) {
    return false;
  }

  // 3. Direction et exclusions spécifiques à chaque onglet
  if (activeTab === 'recipes') {
    // Vers la gauche uniquement (dx < -25)
    if (gestureState.dx >= -25) {
      return false;
    }
    // Exclusion stricte de la zone des filtres pour préserver le défilement horizontal des pilules
    if (locationY !== undefined && locationY >= 0 && locationY <= filterBarHeight) {
      return false;
    }
    return true;
  }

  if (activeTab === 'folders') {
    // Vers la droite uniquement (dx > 25)
    if (gestureState.dx <= 25) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Calcule l'onglet de destination au relâchement du geste (distance >= 35% de l'écran ou flick vif)
 */
export function calculateHomeTabSwipeDestination(
  activeTab: HomeViewTab,
  dx: number,
  vx: number = 0,
  screenWidth: number
): HomeViewTab {
  if (activeTab === 'recipes') {
    // Vers la gauche : swipe >= 35% de la largeur ou flick vif
    const shouldSwitch = dx < -screenWidth * 0.35 || (dx < -25 && vx < -0.35);
    return shouldSwitch ? 'folders' : 'recipes';
  } else {
    // Vers la droite : swipe >= 35% de la largeur ou flick vif
    const shouldSwitch = dx > screenWidth * 0.35 || (dx > 25 && vx > 0.35);
    return shouldSwitch ? 'recipes' : 'folders';
  }
}
