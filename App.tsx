import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  BackHandler,
  Linking,
  AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, RecipeViewMode } from './src/types/recipe';
import { FridgeItem } from './src/types/fridge';
import { StorageService } from './src/services/storageService';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeFormScreen } from './src/screens/RecipeFormScreen';
import { ScanRecipeScreen, CapturedPhoto, AddRecipeMode } from './src/screens/ScanRecipeScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';
import { MealPlannerScreen } from './src/screens/MealPlannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ImportRecipeModal } from './src/components/import-share/ImportRecipeModal';
import { RecipeShareService } from './src/services/recipeShareService';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { createDynamicStyles, ThemeMode } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

type AppScreen = 'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan';

interface TabPaneProps {
  isActive: boolean;
  hasBeenViewed: boolean;
  children: () => React.ReactNode;
}

/**
 * Conteneur d'onglet Keep-Alive à isolation de rendu native :
 * - Montage paresseux (ne monte pas tant que l'onglet n'a pas été visité).
 * - Gel total de la réconciliation React dès que l'onglet est masqué (0% CPU/re-rendu).
 * - Dégel et rafraîchissement automatique dès que l'onglet redevient actif.
 */
const TabPane = React.memo<TabPaneProps>(
  ({ isActive, hasBeenViewed, children }) => {
    if (!hasBeenViewed) {
      return null;
    }
    return (
      <View style={[styles.tabContainer, !isActive && styles.tabHidden]}>
        {children()}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Si l'onglet n'a jamais été visité et ne devient pas actif : ignorer
    if (!prevProps.hasBeenViewed && !nextProps.hasBeenViewed) {
      return true;
    }
    // Si l'onglet était inactif et reste inactif : geler le sous-arbre (zéro re-rendu)
    if (!prevProps.isActive && !nextProps.isActive && prevProps.hasBeenViewed === nextProps.hasBeenViewed) {
      return true;
    }
    return false;
  }
);
TabPane.displayName = 'TabPane';

interface InitialAppData {
  recipes: Recipe[];
  onboarded: boolean;
  viewMode: RecipeViewMode;
  stock: FridgeItem[];
  themeMode: ThemeMode;
}

interface AppContentProps {
  initialData?: InitialAppData | null;
}

function AppContent({ initialData }: AppContentProps) {
  const { isDark, colors, isLoaded: isThemeLoaded } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [viewedTabs, setViewedTabs] = useState<Record<string, boolean>>({ home: true });

  // Barre de navigation Android visible au premier plan (l'application reste au-dessus de la barre système)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setHidden(false);
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          NavigationBar.setHidden(false);
        }
      });
      return () => {
        subscription.remove();
      };
    }
  }, []);

  if (['home', 'planner', 'shopping', 'settings'].includes(currentScreen) && !viewedTabs[currentScreen]) {
    setViewedTabs((prev) => ({ ...prev, [currentScreen]: true }));
  }

  const [returnScreenAfterDetail, setReturnScreenAfterDetail] = useState<'home' | 'planner' | 'shopping' | 'settings'>('home');
  const [recipes, setRecipes] = useState<Recipe[]>(initialData?.recipes || []);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recipeDetailStack, setRecipeDetailStack] = useState<string[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [showOnboarding, setShowOnboarding] = useState(initialData ? !initialData.onboarded : false);
  const [initialViewMode, setInitialViewMode] = useState<RecipeViewMode>(initialData?.viewMode || 'detailed');
  const [initialStockItems, setInitialStockItems] = useState<FridgeItem[]>(initialData?.stock || []);

  // Recette reçue en partage (via Deep Link ou scan QR code)
  const [receivedSharedRecipe, setReceivedSharedRecipe] = useState<Recipe | null>(null);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  // Nettoyage préventif des anciens brouillons caméra résiduels
  useEffect(() => {
    AsyncStorage.multiRemove([
      '@papilles_camera_recipe_draft',
      '@papilles_camera_scan_draft',
    ]).catch(() => {});
  }, []);

  // Recharge la liste des recettes
  const reloadRecipes = useCallback(async () => {
    try {
      const loaded = await StorageService.getRecipes();
      setRecipes(loaded);
    } catch (e) {
      console.error('Erreur rechargement recettes:', e);
    }
  }, []);

  // Fallback si initialData n'était pas injecté (sécurité défensive)
  useEffect(() => {
    if (initialData) return;
    const loadFallbackData = async () => {
      try {
        const [loaded, onboarded, savedViewMode, fridge] = await Promise.all([
          StorageService.getRecipes().catch(() => [] as Recipe[]),
          StorageService.hasCompletedOnboarding().catch(() => false),
          StorageService.getRecipeViewMode().catch(() => 'detailed' as RecipeViewMode),
          StorageService.getFridgeItems().catch(() => [] as FridgeItem[]),
        ]);
        setRecipes(loaded as Recipe[]);
        if (!onboarded) setShowOnboarding(true);
        if (savedViewMode) setInitialViewMode(savedViewMode);
        if (Array.isArray(fridge)) setInitialStockItems(fridge);
      } catch (e) {
        console.error('Erreur chargement fallback:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadFallbackData();
  }, [initialData]);

  // Écoute et décodage des liens profonds de partage (papilles://import?r=...)
  const handleIncomingUrl = useCallback((url: string | null | undefined) => {
    if (!url) return;
    if (RecipeShareService.isSharePayload(url)) {
      const decoded = RecipeShareService.decodeRecipe(url);
      if (decoded) {
        setReceivedSharedRecipe(decoded);
        setIsImportModalVisible(true);
      } else {
        Alert.alert(
          'Lien invalide',
          "Impossible de lire la recette partagée. Les données sont peut-être incomplètes ou corrompues."
        );
      }
    }
  }, []);

  useEffect(() => {
    // 1. URL initiale si l'app est ouverte à froid via un clic sur un lien
    Linking.getInitialURL().then(handleIncomingUrl).catch(() => {});

    // 2. Événements si l'application était déjà en tâche de fond
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleIncomingUrl]);

  // Fin de l'onboarding — persiste le flag et masque l'écran
  const handleOnboardingComplete = useCallback(async () => {
    await StorageService.completeOnboarding();
    setShowOnboarding(false);
  }, []);

  // Traitement de l'import d'une recette partagée
  const handleConfirmImportSharedRecipe = async (sharedRecipe: Recipe) => {
    try {
      const updated = await StorageService.saveRecipe(sharedRecipe);
      setRecipes(updated);
      setIsImportModalVisible(false);
      setReceivedSharedRecipe(null);
      navigateToDetail(sharedRecipe, 'home');
      Alert.alert('Recette importée', `« ${sharedRecipe.title} » a été ajoutée à votre carnet !`);
    } catch (e) {
      console.error('Erreur importation recette partagée:', e);
      Alert.alert('Erreur', 'Impossible d’enregistrer la recette reçue.');
    }
  };

  const handleCustomizeSharedRecipe = (sharedRecipe: Recipe) => {
    setIsImportModalVisible(false);
    setReceivedSharedRecipe(null);
    setEditingRecipe(sharedRecipe);
    setCurrentScreen('form');
  };

  const handleRecipeReceivedFromScan = (sharedRecipe: Recipe) => {
    setReceivedSharedRecipe(sharedRecipe);
    setIsImportModalVisible(true);
  };

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;

  // Actions de navigation
  const navigateToDetail = (recipe: Recipe, fromScreen: 'home' | 'planner' | 'shopping' = 'home') => {
    setSelectedRecipeId(recipe.id);
    setRecipeDetailStack([recipe.id]);
    setReturnScreenAfterDetail(fromScreen);
    setCurrentScreen('detail');
  };

  const handleOpenLinkedRecipe = (linkedRecipeId: string) => {
    setSelectedRecipeId(linkedRecipeId);
    setRecipeDetailStack((prev) => [...prev, linkedRecipeId]);
  };

  const handleBackFromDetail = () => {
    if (recipeDetailStack.length > 1) {
      const nextStack = recipeDetailStack.slice(0, -1);
      const prevId = nextStack[nextStack.length - 1];
      setRecipeDetailStack(nextStack);
      setSelectedRecipeId(prevId);
    } else {
      setRecipeDetailStack([]);
      setSelectedRecipeId(null);
      setCurrentScreen(returnScreenAfterDetail);
    }
  };

  const previousRecipeTitle =
    recipeDetailStack.length > 1
      ? recipes.find((r) => r.id === recipeDetailStack[recipeDetailStack.length - 2])?.title
      : undefined;

  // Prise en charge du bouton retour matériel Android sur la pile de recettes
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentScreen === 'detail') {
        handleBackFromDetail();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [currentScreen, recipeDetailStack, returnScreenAfterDetail]);

  const [recipeCreationSource, setRecipeCreationSource] = useState<'stock_ai' | 'scan' | 'manual' | null>(null);
  const [reopenStockModal, setReopenStockModal] = useState(false);

  const navigateToCreate = () => {
    setRecipeCreationSource('manual');
    setEditingRecipe(null);
    setCurrentScreen('form');
  };

  const [scanInitialMode, setScanInitialMode] = useState<AddRecipeMode>('photo');
  const [restoredScanPhotos, setRestoredScanPhotos] = useState<CapturedPhoto[]>([]);
  const [pendingScanPhotoUri, setPendingScanPhotoUri] = useState<string | null>(null);

  const navigateToAddRecipe = () => {
    setRecipeCreationSource('manual');
    setEditingRecipe(null);
    setCurrentScreen('form');
  };

  const navigateToScan = (initialMode: AddRecipeMode = 'photo') => {
    setRecipeCreationSource('scan');
    setScanInitialMode(initialMode);
    setCurrentScreen('scan');
  };

  const handleRecipeExtractedFromScan = (partialRecipe: Partial<Recipe>, coverImageUri?: string) => {
    setRecipeCreationSource('scan');
    const recipeToEdit = { ...partialRecipe };
    if (coverImageUri && !recipeToEdit.imageUrl) {
      recipeToEdit.imageUrl = coverImageUri;
    }
    setEditingRecipe(recipeToEdit as Recipe);
    setCurrentScreen('form');
  };

  const handleRecipeImportedFromHome = (recipe: Recipe, source?: 'stock_ai' | 'scan') => {
    setRecipeCreationSource(source || 'stock_ai');
    setEditingRecipe(recipe);
    setCurrentScreen('form');
  };

  const navigateToEdit = (recipe: Recipe) => {
    setRecipeCreationSource(null);
    setEditingRecipe(recipe);
    setCurrentScreen('form');
  };

  const [initialHomeDoableFilter, setInitialHomeDoableFilter] = useState(false);

  const navigateToHome = (options?: { onlyDoable?: boolean }) => {
    setCurrentScreen('home');
    setSelectedRecipeId(null);
    setRecipeDetailStack([]);
    setEditingRecipe(null);
    setRecipeCreationSource(null);
    setReopenStockModal(false);
    setInitialHomeDoableFilter(Boolean(options?.onlyDoable));
  };

  const [plannerInitialTab, setPlannerInitialTab] = useState<'journal' | 'planner'>('journal');
  const [shoppingInitialTab, setShoppingInitialTab] = useState<'shopping' | 'fridge'>('fridge');

  const navigateToShopping = (tab: 'shopping' | 'fridge' = 'fridge') => {
    setShoppingInitialTab(tab);
    setCurrentScreen('shopping');
    setSelectedRecipeId(null);
    setRecipeDetailStack([]);
    setEditingRecipe(null);
  };

  const navigateToPlanner = (tab: 'journal' | 'planner' = 'journal') => {
    setPlannerInitialTab(tab);
    setCurrentScreen('planner');
    setSelectedRecipeId(null);
    setRecipeDetailStack([]);
    setEditingRecipe(null);
  };

  // Actions de gestion des données
  const handleSaveRecipe = async (savedRecipe: Recipe) => {
    try {
      const updated = await StorageService.saveRecipe(savedRecipe);
      setRecipes(updated);
      setSelectedRecipeId(savedRecipe.id);
      setRecipeDetailStack((prev) =>
        prev.length > 0 ? [...prev.slice(0, -1), savedRecipe.id] : [savedRecipe.id]
      );
      setRecipeCreationSource(null);
      setReopenStockModal(false);
      setCurrentScreen('detail');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer la recette.");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const updated = await StorageService.deleteRecipe(id);
      setRecipes(updated);
      setRecipeDetailStack([]);
      navigateToHome();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer la recette.');
    }
  };

  const handleUpdateRating = async (id: string, rating: number, userNote?: string) => {
    try {
      const updated = await StorageService.updateRecipeRating(id, rating, userNote);
      setRecipes(updated);
    } catch (e) {
      console.error('Erreur mise à jour note:', e);
    }
  };

  const handleUpdateTags = async (id: string, tags: string[]) => {
    try {
      const updated = await StorageService.updateRecipeTags(id, tags);
      setRecipes(updated);
    } catch (e) {
      console.error('Erreur mise à jour tags:', e);
      Alert.alert('Erreur', 'Impossible de mettre à jour les tags.');
    }
  };

  if (isLoading || (!isThemeLoaded && !initialData)) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationBar hidden={false} style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <View style={styles.container}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationBar hidden={false} style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </View>
    );
  }

  const isMainTab = ['home', 'planner', 'shopping', 'settings'].includes(currentScreen);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationBar hidden={false} style={isDark ? 'light' : 'dark'} />
        {/* Écrans Principaux avec Keep-Alive (onglets persistants en mémoire, isolés et gelés si inactifs) */}
        <View style={styles.mainContent}>
          <TabPane
            isActive={currentScreen === 'home'}
            hasBeenViewed={Boolean(viewedTabs.home)}
          >
            {() => (
              <HomeScreen
                recipes={recipes}
                onSelectRecipe={(r) => navigateToDetail(r, 'home')}
                onAddNewRecipe={navigateToAddRecipe}
                onScanRecipe={navigateToScan}
                onImportRecipe={handleRecipeImportedFromHome}
                onOpenSettings={() => setCurrentScreen('settings')}
                onNavigateToStock={() => navigateToShopping('fridge')}
                initialOnlyDoable={initialHomeDoableFilter}
                initialViewMode={initialViewMode}
                initialStockItems={initialStockItems}
                isActive={currentScreen === 'home'}
                reopenStockModal={reopenStockModal}
                onStockModalReopened={() => setReopenStockModal(false)}
              />
            )}
          </TabPane>

          <TabPane
            isActive={currentScreen === 'planner'}
            hasBeenViewed={Boolean(viewedTabs.planner)}
          >
            {() => (
              <MealPlannerScreen
                recipes={recipes}
                onSelectRecipe={(r) => navigateToDetail(r, 'planner')}
                onNavigateToShoppingList={() => navigateToShopping('shopping')}
                initialTab={plannerInitialTab}
                isActive={currentScreen === 'planner'}
              />
            )}
          </TabPane>

          <TabPane
            isActive={currentScreen === 'shopping'}
            hasBeenViewed={Boolean(viewedTabs.shopping)}
          >
            {() => (
              <ShoppingListScreen
                onNavigateToRecipes={navigateToHome}
                onNavigateToPlanner={navigateToPlanner}
                initialTab={shoppingInitialTab}
                isActive={currentScreen === 'shopping'}
              />
            )}
          </TabPane>

          <TabPane
            isActive={currentScreen === 'settings'}
            hasBeenViewed={Boolean(viewedTabs.settings)}
          >
            {() => (
              <SettingsScreen
                recipes={recipes}
                onRecipesReloadNeeded={reloadRecipes}
              />
            )}
          </TabPane>

          {/* Écrans Secondaires (pleine page) */}
          {currentScreen === 'scan' && (
            <ScanRecipeScreen
              key={scanInitialMode}
              initialMode={scanInitialMode}
              initialPhotos={restoredScanPhotos}
              initialPendingPhotoUri={pendingScanPhotoUri || undefined}
              recipes={recipes}
              stockItems={initialStockItems}
              onBack={() => {
                setRestoredScanPhotos([]);
                setPendingScanPhotoUri(null);
                navigateToHome();
              }}
              onRecipeExtracted={(r, cover) => {
                setRestoredScanPhotos([]);
                setPendingScanPhotoUri(null);
                handleRecipeExtractedFromScan(r, cover);
              }}
              onRecipeReceived={handleRecipeReceivedFromScan}
              onManualCreate={navigateToAddRecipe}
            />
          )}

          {currentScreen === 'detail' && selectedRecipe && (
            <RecipeDetailScreen
              recipe={selectedRecipe}
              allRecipes={recipes}
              onOpenLinkedRecipe={handleOpenLinkedRecipe}
              previousRecipeTitle={previousRecipeTitle}
              onBack={handleBackFromDetail}
              onEdit={navigateToEdit}
              onDelete={handleDeleteRecipe}
              onUpdateRating={handleUpdateRating}
              onUpdateTags={handleUpdateTags}
              onRecipeUpdated={(updated) => {
                setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              }}
              onNavigateToShoppingList={() => navigateToShopping('shopping')}
              onNavigateToPlanner={() => setCurrentScreen('planner')}
            />
          )}

          {currentScreen === 'form' && (
            <RecipeFormScreen
              initialRecipe={editingRecipe}
              availableRecipes={recipes}
              onSave={handleSaveRecipe}
              onCancel={() => {
                if (selectedRecipeId) {
                  setCurrentScreen('detail');
                } else if (recipeCreationSource === 'stock_ai') {
                  // Revenir immédiatement aux 3 idées de plats dans le modal Chef IA
                  setEditingRecipe(null);
                  setRecipeCreationSource(null);
                  setCurrentScreen('home');
                  setReopenStockModal(true);
                } else {
                  setRecipeCreationSource(null);
                  navigateToHome();
                }
              }}
            />
          )}
        </View>

        {/* Barre de navigation inférieure persistante pour les onglets principaux */}
        {isMainTab && (
          <View
            style={[
              styles.bottomTabBar,
              { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 10) },
            ]}
          >
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateToHome()}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentScreen === 'home' ? 'book' : 'book-outline'}
                size={22}
                color={currentScreen === 'home' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentScreen === 'home' && styles.tabLabelActive,
                ]}
              >
                Recettes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateToPlanner('journal')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentScreen === 'planner' ? 'calendar' : 'calendar-outline'}
                size={22}
                color={currentScreen === 'planner' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentScreen === 'planner' && styles.tabLabelActive,
                ]}
              >
                Repas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateToShopping('fridge')}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconWrapper}>
                <Ionicons
                  name={currentScreen === 'shopping' ? 'basket' : 'basket-outline'}
                  size={23}
                  color={currentScreen === 'shopping' ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentScreen === 'shopping' && styles.tabLabelActive,
                ]}
              >
                Étagères & Courses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => {
                setCurrentScreen('settings');
                setSelectedRecipeId(null);
                setEditingRecipe(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentScreen === 'settings' ? 'settings' : 'settings-outline'}
                size={22}
                color={currentScreen === 'settings' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentScreen === 'settings' && styles.tabLabelActive,
                ]}
              >
                Paramètres
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modale d'aperçu et d'import de recette reçue (Deep Link ou QR code) */}
        <ImportRecipeModal
          visible={isImportModalVisible}
          recipe={receivedSharedRecipe}
          onConfirmImport={handleConfirmImportSharedRecipe}
          onCustomize={handleCustomizeSharedRecipe}
          onClose={() => {
            setIsImportModalVisible(false);
            setReceivedSharedRecipe(null);
          }}
        />
      </View>
  );
}

function AppRoot() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialData, setInitialData] = useState<InitialAppData | null>(null);
  const isSplashHiddenRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    const loadInitialData = async () => {
      const startTime = Date.now();
      try {
        const [loaded, onboarded, savedViewMode, fridge, theme] = await Promise.all([
          StorageService.getRecipes().catch(() => [] as Recipe[]),
          StorageService.hasCompletedOnboarding().catch(() => false),
          StorageService.getRecipeViewMode().catch(() => 'detailed' as RecipeViewMode),
          StorageService.getFridgeItems().catch(() => [] as FridgeItem[]),
          StorageService.getThemeMode().catch(() => 'light' as ThemeMode),
          Promise.race([
            Ionicons.loadFont(),
            new Promise((resolve) => setTimeout(resolve, 300)),
          ]).catch(() => {}),
        ]);
        console.log(`⚡ [Papilles Startup] Données initiales et police résolues en ${Date.now() - startTime}ms`);
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        if (isMounted) {
          setInitialData({
            recipes: loaded as Recipe[],
            onboarded: Boolean(onboarded),
            viewMode: (savedViewMode || 'detailed') as RecipeViewMode,
            stock: Array.isArray(fridge) ? fridge : [],
            themeMode: (theme || 'light') as ThemeMode,
          });
          setAppIsReady(true);
        }
      } catch (e) {
        console.error('Erreur chargement initial:', e);
        if (safetyTimer) {
          clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        if (isMounted) setAppIsReady(true);
      }
    };

    loadInitialData();

    // Filet de sécurité splash screen (masquage garanti après 1.2s max si anomalie persistante)
    safetyTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('⚠️ [Papilles Startup] Filet de sécurité 1.2s déclenché pour débloquer le splash screen');
        setAppIsReady(true);
      }
    }, 1200);

    return () => {
      isMounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !isSplashHiddenRef.current) {
      isSplashHiddenRef.current = true;
      console.log('⚡ [Papilles Startup] onLayoutRootView appelé -> Masquage du splash screen');
      try {
        await SplashScreen.hideAsync();
        console.log('⚡ [Papilles Startup] Splash screen masqué avec succès');
      } catch (e) {
        console.warn('⚡ [Papilles Startup] Info masquage splash screen:', e);
      }
    }
  }, [appIsReady]);

  // Filet de sécurité secondaire : si onLayout n'est pas appelé sous 350ms après appIsReady
  useEffect(() => {
    if (appIsReady) {
      const fallbackHideTimer = setTimeout(() => {
        if (!isSplashHiddenRef.current) {
          isSplashHiddenRef.current = true;
          SplashScreen.hideAsync().catch(() => {});
        }
      }, 350);
      return () => clearTimeout(fallbackHideTimer);
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ThemeProvider initialThemeMode={initialData?.themeMode}>
      <View style={styles.rootLayout} onLayout={onLayoutRootView}>
        <AppContent initialData={initialData} />
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppRoot />
    </SafeAreaProvider>
  );
}

const styles = createDynamicStyles((colors, shadows) => ({
  rootLayout: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
  },
  tabContainer: {
    flex: 1,
  },
  tabHidden: {
    display: 'none',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    ...shadows.medium,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
}));
