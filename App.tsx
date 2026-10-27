import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from './src/types/recipe';
import { StorageService } from './src/services/storageService';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeFormScreen } from './src/screens/RecipeFormScreen';
import { ScanRecipeScreen } from './src/screens/ScanRecipeScreen';
import { ShoppingListScreen } from './src/screens/ShoppingListScreen';
import { MealPlannerScreen } from './src/screens/MealPlannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Colors, Shadows, createDynamicStyles } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

type AppScreen = 'home' | 'planner' | 'shopping' | 'settings' | 'detail' | 'form' | 'scan';

function AppContent() {
  const { isDark, colors, isLoaded: isThemeLoaded } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [returnScreenAfterDetail, setReturnScreenAfterDetail] = useState<'home' | 'planner' | 'shopping' | 'settings'>('home');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recipeDetailStack, setRecipeDetailStack] = useState<string[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shoppingBadgeCount, setShoppingBadgeCount] = useState(0);

  // Met à jour le compteur d'articles de courses restants pour le badge
  const refreshShoppingBadge = useCallback(async () => {
    try {
      const items = await StorageService.getShoppingList();
      const uncompleted = items.filter((i) => !i.isChecked).length;
      setShoppingBadgeCount(uncompleted);
    } catch (e) {
      console.error('Erreur rafraîchissement badge courses:', e);
    }
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

  // Chargement initial des recettes et du badge courses
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await StorageService.migrateRecipesToCanonicalV1().catch(() => {});
        const loaded = await StorageService.getRecipes();
        setRecipes(loaded);
        await refreshShoppingBadge();
      } catch (e) {
        console.error('Erreur chargement initial:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [refreshShoppingBadge]);

  // Actualise le badge à chaque fois qu'on revient sur un écran principal
  useEffect(() => {
    if (['home', 'planner', 'shopping'].includes(currentScreen)) {
      refreshShoppingBadge();
    }
  }, [currentScreen, refreshShoppingBadge]);

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
      refreshShoppingBadge();
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

  const navigateToCreate = () => {
    setEditingRecipe(null);
    setCurrentScreen('form');
  };

  const navigateToAddRecipe = () => {
    setEditingRecipe(null);
    setCurrentScreen('form');
  };

  const navigateToScan = () => {
    setCurrentScreen('scan');
  };

  const handleRecipeExtracted = (partialRecipe: Partial<Recipe>) => {
    setEditingRecipe(partialRecipe as Recipe);
    setCurrentScreen('form');
  };

  const navigateToEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setCurrentScreen('form');
  };

  const [initialHomeDoableFilter, setInitialHomeDoableFilter] = useState(false);

  const navigateToHome = (options?: { onlyDoable?: boolean }) => {
    setCurrentScreen('home');
    setSelectedRecipeId(null);
    setRecipeDetailStack([]);
    setEditingRecipe(null);
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
    refreshShoppingBadge();
  };

  const navigateToPlanner = (tab: 'journal' | 'planner' = 'journal') => {
    setPlannerInitialTab(tab);
    setCurrentScreen('planner');
    setSelectedRecipeId(null);
    setRecipeDetailStack([]);
    setEditingRecipe(null);
  };

  const navigateToJournal = () => {
    navigateToPlanner('journal');
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

  if (isLoading || !isThemeLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isMainTab = ['home', 'planner', 'shopping', 'settings'].includes(currentScreen);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.container}>
        {/* Écrans Principaux */}
        <View style={styles.mainContent}>
          {currentScreen === 'home' && (
            <HomeScreen
              recipes={recipes}
              onSelectRecipe={(r) => navigateToDetail(r, 'home')}
              onAddNewRecipe={navigateToAddRecipe}
              onScanRecipe={navigateToScan}
              onImportRecipe={handleRecipeExtracted}
              onQuickRate={handleUpdateRating}
              onOpenSettings={() => setCurrentScreen('settings')}
              onNavigateToJournal={navigateToJournal}
              onNavigateToStock={() => navigateToShopping('fridge')}
              initialOnlyDoable={initialHomeDoableFilter}
            />
          )}

          {currentScreen === 'planner' && (
            <MealPlannerScreen
              recipes={recipes}
              onSelectRecipe={(r) => navigateToDetail(r, 'planner')}
              onNavigateToShoppingList={() => navigateToShopping('shopping')}
              initialTab={plannerInitialTab}
            />
          )}

          {currentScreen === 'shopping' && (
            <ShoppingListScreen
              onNavigateToRecipes={navigateToHome}
              onNavigateToPlanner={navigateToPlanner}
              initialTab={shoppingInitialTab}
              recipes={recipes}
              onSelectRecipe={(r) => navigateToDetail(r, 'shopping')}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              recipes={recipes}
              onRecipesReloadNeeded={reloadRecipes}
            />
          )}

          {/* Écrans Secondaires (pleine page) */}
          {currentScreen === 'scan' && (
            <ScanRecipeScreen
              onBack={() => navigateToHome()}
              onRecipeExtracted={handleRecipeExtracted}
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
              onNavigateToShoppingList={() => navigateToShopping('shopping')}
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
                } else {
                  navigateToHome();
                }
              }}
            />
          )}
        </View>

        {/* Barre de navigation inférieure persistante pour les onglets principaux */}
        {isMainTab && (
          <View style={styles.bottomTabBar}>
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
                {shoppingBadgeCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {shoppingBadgeCount > 99 ? '99+' : shoppingBadgeCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  currentScreen === 'shopping' && styles.tabLabelActive,
                ]}
              >
                Courses & Étagères
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
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
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
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.cardBackground,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
