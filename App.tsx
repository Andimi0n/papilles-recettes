import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
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
import { SettingsModal } from './src/screens/SettingsModal';
import { Colors, Shadows, createDynamicStyles } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

type AppScreen = 'home' | 'planner' | 'shopping' | 'detail' | 'form' | 'scan';

function AppContent() {
  const { isDark, colors, isLoaded: isThemeLoaded } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [returnScreenAfterDetail, setReturnScreenAfterDetail] = useState<'home' | 'planner'>('home');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shoppingBadgeCount, setShoppingBadgeCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const [scanInitialMode, setScanInitialMode] = useState<'photo' | 'text'>('photo');

  // Actions de navigation
  const navigateToDetail = (recipe: Recipe, fromScreen: 'home' | 'planner' = 'home') => {
    setSelectedRecipeId(recipe.id);
    setReturnScreenAfterDetail(fromScreen);
    setCurrentScreen('detail');
  };

  const navigateToCreate = () => {
    setEditingRecipe(null);
    setCurrentScreen('form');
  };

  const navigateToScan = (initialMode: 'photo' | 'text' = 'photo') => {
    setScanInitialMode(initialMode);
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

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecipeId(null);
    setEditingRecipe(null);
  };

  const navigateToShopping = () => {
    setCurrentScreen('shopping');
    setSelectedRecipeId(null);
    setEditingRecipe(null);
    refreshShoppingBadge();
  };

  const navigateToPlanner = () => {
    setCurrentScreen('planner');
    setSelectedRecipeId(null);
    setEditingRecipe(null);
  };

  // Actions de gestion des données
  const handleSaveRecipe = async (savedRecipe: Recipe) => {
    try {
      const updated = await StorageService.saveRecipe(savedRecipe);
      setRecipes(updated);
      setSelectedRecipeId(savedRecipe.id);
      setCurrentScreen('detail');
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer la recette.");
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const updated = await StorageService.deleteRecipe(id);
      setRecipes(updated);
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

  const isMainTab = ['home', 'planner', 'shopping'].includes(currentScreen);

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
              onAddNewRecipe={navigateToCreate}
              onScanRecipe={navigateToScan}
              onImportRecipe={handleRecipeExtracted}
              onQuickRate={handleUpdateRating}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {currentScreen === 'planner' && (
            <MealPlannerScreen
              recipes={recipes}
              onSelectRecipe={(r) => navigateToDetail(r, 'planner')}
              onNavigateToShoppingList={navigateToShopping}
            />
          )}

          {currentScreen === 'shopping' && (
            <ShoppingListScreen
              onNavigateToRecipes={navigateToHome}
              onNavigateToPlanner={navigateToPlanner}
            />
          )}

          {/* Écrans Secondaires (pleine page) */}
          {currentScreen === 'scan' && (
            <ScanRecipeScreen
              initialMode={scanInitialMode}
              onBack={navigateToHome}
              onRecipeExtracted={handleRecipeExtracted}
            />
          )}

          {currentScreen === 'detail' && selectedRecipe && (
            <RecipeDetailScreen
              recipe={selectedRecipe}
              onBack={() => {
                setCurrentScreen(returnScreenAfterDetail);
                refreshShoppingBadge();
              }}
              onEdit={navigateToEdit}
              onDelete={handleDeleteRecipe}
              onUpdateRating={handleUpdateRating}
              onNavigateToShoppingList={navigateToShopping}
            />
          )}

          {currentScreen === 'form' && (
            <RecipeFormScreen
              initialRecipe={editingRecipe}
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
              onPress={navigateToHome}
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
              onPress={navigateToPlanner}
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
                Planning
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={navigateToShopping}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconWrapper}>
                <Ionicons
                  name={currentScreen === 'shopping' ? 'cart' : 'cart-outline'}
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
                Courses
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modal de Réglages & Paramètres */}
        <SettingsModal
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          recipes={recipes}
          onRecipesReloadNeeded={reloadRecipes}
        />
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
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
}));
