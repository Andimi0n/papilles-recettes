import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Recipe } from './src/types/recipe';
import { StorageService } from './src/services/storageService';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeFormScreen } from './src/screens/RecipeFormScreen';
import { ScanRecipeScreen } from './src/screens/ScanRecipeScreen';
import { Colors } from './src/theme/colors';

type AppScreen = 'home' | 'detail' | 'form' | 'scan';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chargement initial des recettes depuis le stockage local (AsyncStorage)
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const loaded = await StorageService.getRecipes();
        setRecipes(loaded);
      } catch (e) {
        console.error('Erreur chargement recettes:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecipes();
  }, []);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;

  const [scanInitialMode, setScanInitialMode] = useState<'photo' | 'text'>('photo');

  // Actions de navigation
  const navigateToDetail = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
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

  // Actions de gestion des données
  const handleSaveRecipe = async (savedRecipe: Recipe) => {
    try {
      const updated = await StorageService.saveRecipe(savedRecipe);
      setRecipes(updated);
      setSelectedRecipeId(savedRecipe.id);
      setCurrentScreen('detail');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la recette.');
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

  const handleToggleFavorite = async (id: string) => {
    try {
      const updated = await StorageService.toggleFavorite(id);
      setRecipes(updated);
    } catch (e) {
      console.error('Erreur favori:', e);
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {currentScreen === 'home' && (
          <HomeScreen
            recipes={recipes}
            onSelectRecipe={navigateToDetail}
            onAddNewRecipe={navigateToCreate}
            onScanRecipe={navigateToScan}
            onImportRecipe={handleRecipeExtracted}
            onToggleFavorite={handleToggleFavorite}
            onQuickRate={handleUpdateRating}
          />
        )}

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
            onBack={navigateToHome}
            onEdit={navigateToEdit}
            onDelete={handleDeleteRecipe}
            onToggleFavorite={handleToggleFavorite}
            onUpdateRating={handleUpdateRating}
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
