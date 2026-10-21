import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Category } from '../types/recipe';
import { FridgeItem } from '../types/fridge';
import { ShoppingAisle } from '../types/shopping';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { evaluateRecipesWithStock, RecipeStockEvaluation } from '../utils/stockMatcher';
import { RecipeAiService } from '../services/recipeAiService';
import { StorageService } from '../services/storageService';
import { generateUniqueId } from '../utils/helpers';

interface StockCookModalProps {
  visible: boolean;
  recipes: Recipe[];
  stockItems: FridgeItem[];
  doableCount?: number;
  isDoableFilterActive: boolean;
  onApplyDoableFilter: (active: boolean) => void;
  onRecipeGenerated?: (partialRecipe: Partial<Recipe>) => void;
  onNavigateToStock?: () => void;
  onClose: () => void;
}

const AI_STEPS = [
  'Le Chef IA examine vos ingrédients en stock...',
  'Vérification anti-doublon avec votre carnet...',
  'Association créative et équilibre des saveurs...',
  'Calcul des proportions & assaisonnements...',
  'Rédaction des étapes pas-à-pas...',
];

const MEAL_TYPES: { id: string; label: string }[] = [
  { id: '', label: 'Tout type' },
  { id: 'Plat', label: 'Plat' },
  { id: 'Entrée', label: 'Entrée' },
  { id: 'Dessert', label: 'Dessert' },
  { id: 'Apéritif', label: 'Apéritif' },
];

export const StockCookModal: React.FC<StockCookModalProps> = ({
  visible,
  recipes,
  stockItems,
  doableCount,
  isDoableFilterActive,
  onApplyDoableFilter,
  onRecipeGenerated,
  onNavigateToStock,
  onClose,
}) => {
  const { isDark, colors } = useTheme();

  // Ingrédients du stock sélectionnés pour l'IA
  const [selectedStockNames, setSelectedStockNames] = useState<string[]>([]);
  const [servings, setServings] = useState<number>(4);
  const [isVegetarian, setIsVegetarian] = useState<boolean>(false);
  const [mealType, setMealType] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState(0);

  // Saisie clé API si absente
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  const stepIntervalRef = useRef<any>(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (visible) {
      setSelectedStockNames(stockItems.map((item) => item.name));
      setIsGeneratingAi(false);
      // Charger les portions par défaut depuis le storage si configuré
      StorageService.getDefaultServings().then((val) => {
        if (val && val >= 1) setServings(val);
      });
    }
  }, [visible, stockItems]);

  // Animation des étapes IA
  useEffect(() => {
    if (isGeneratingAi) {
      setAiStepIndex(0);
      stepIntervalRef.current = setInterval(() => {
        setAiStepIndex((prev) => (prev + 1) % AI_STEPS.length);
      }, 2300);
    } else {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    }
    return () => {
      if (stepIntervalRef.current) {
        clearInterval(stepIntervalRef.current);
      }
    };
  }, [isGeneratingAi]);

  // Nombre de recettes faisables (réutilise doableCount déjà calculé par HomeScreen pour 0ms de latence)
  const effectiveDoableCount = useMemo(() => {
    if (typeof doableCount === 'number') {
      return doableCount;
    }
    if (stockItems.length === 0 || recipes.length === 0) {
      return 0;
    }
    const map = evaluateRecipesWithStock(recipes, stockItems, {
      assumePantryStaplesAvailable: true,
    });
    let count = 0;
    map.forEach((ev) => {
      if (ev.isDoable) count++;
    });
    return count;
  }, [doableCount, recipes, stockItems]);

  // Groupement des aliments du stock par rayon (comme dans Mes Étagères)
  const groupedStockByAisle = useMemo(() => {
    const map = new Map<ShoppingAisle, FridgeItem[]>();
    stockItems.forEach((item) => {
      const aisle = item.aisle || 'Autre';
      const list = map.get(aisle) || [];
      list.push(item);
      map.set(aisle, list);
    });

    const result: { aisle: ShoppingAisle; items: FridgeItem[] }[] = [];
    ALL_AISLES.forEach((aisle) => {
      const aisleItems = map.get(aisle);
      if (aisleItems && aisleItems.length > 0) {
        result.push({ aisle, items: aisleItems });
      }
    });

    const otherItems = map.get('Autre');
    if (otherItems && otherItems.length > 0 && !result.some((r) => r.aisle === 'Autre')) {
      result.push({ aisle: 'Autre', items: otherItems });
    }

    return result;
  }, [stockItems]);

  const toggleStockIngredient = (name: string) => {
    setSelectedStockNames((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const toggleAisle = (aisleItems: FridgeItem[]) => {
    const aisleNames = aisleItems.map((i) => i.name);
    const allAisleSelected = aisleNames.every((n) => selectedStockNames.includes(n));
    if (allAisleSelected) {
      setSelectedStockNames((prev) => prev.filter((n) => !aisleNames.includes(n)));
    } else {
      setSelectedStockNames((prev) => Array.from(new Set([...prev, ...aisleNames])));
    }
  };

  const handleSelectAllStock = () => {
    setSelectedStockNames(stockItems.map((i) => i.name));
  };

  const handleDeselectAllStock = () => {
    setSelectedStockNames([]);
  };

  // Lancement de la génération IA sans redondance
  const handleStartAiGeneration = async () => {
    if (selectedStockNames.length === 0) {
      Alert.alert(
        'Aucun ingrédient sélectionné',
        'Veuillez sélectionner au moins un aliment présent dans votre stock pour inspirer le Chef IA.'
      );
      return;
    }

    const apiKey = await RecipeAiService.getApiKey();
    if (!apiKey) {
      setIsApiKeyModalVisible(true);
      return;
    }

    executeAiGeneration(apiKey);
  };

  const executeAiGeneration = async (key?: string) => {
    setIsGeneratingAi(true);

    try {
      // Liste de toutes les recettes existantes pour l'anti-redondance
      const existingTitles = recipes.map((r) => r.title);

      const generated = await RecipeAiService.generateRecipeFromFridge(
        selectedStockNames,
        {
          servings,
          onlyVegetarian: isVegetarian,
          mealType: mealType || undefined,
          existingRecipeTitles: existingTitles,
        },
        key
      );

      const partialRecipe: Partial<Recipe> = {
        id: generateUniqueId('rec_ai_stock'),
        title: generated.title,
        description: generated.description,
        category: (generated.category as Category) || 'Plat',
        difficulty: generated.difficulty || 'Moyen',
        prepTimeMinutes: generated.prepTimeMinutes || 15,
        cookTimeMinutes: generated.cookTimeMinutes || 20,
        servings: generated.servings || servings,
        isVegetarian: generated.isVegetarian ?? isVegetarian,
        userNote:
          generated.userNote ||
          `Recette inédite créée par le Chef IA avec vos aliments en stock : ${selectedStockNames.join(', ')}`,
        rating: 0,
        isFavorite: false,
        ingredients: generated.ingredients.map((ing, idx) => ({
          id: generateUniqueId(`ing_${idx}`),
          name: ing.name,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
          isPantryStaple: ing.isPantryStaple,
          isOptional: ing.isOptional,
        })),
        steps: generated.steps.map((st, idx) => ({
          id: generateUniqueId(`stp_${idx}`),
          order: st.order || idx + 1,
          instruction: st.instruction,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setIsGeneratingAi(false);
      onClose();

      if (onRecipeGenerated) {
        onRecipeGenerated(partialRecipe);
      }
    } catch (err: any) {
      setIsGeneratingAi(false);
      Alert.alert(
        'Erreur Chef IA',
        err?.message ||
          "Impossible de générer la recette. Vérifiez votre clé API Gemini et votre connexion."
      );
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = tempApiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('Clé requise', 'Veuillez renseigner votre clé API Google Gemini.');
      return;
    }
    await RecipeAiService.setApiKey(trimmed);
    setIsApiKeyModalVisible(false);
    setTempApiKeyInput('');
    executeAiGeneration(trimmed);
  };

  const totalStockCount = stockItems.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Cuisiner avec mon stock</Text>
              <Text style={styles.headerSubtitle}>
                Anti-gaspillage, carnet & inspirations IA
              </Text>
            </View>

            {onNavigateToStock && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateToStock();
                }}
                style={styles.manageStockBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
                <Text style={styles.manageStockBtnText}>Étagères</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loader animé si génération IA en cours */}
          {isGeneratingAi ? (
            <View style={styles.aiLoadingContainer}>
              <View style={styles.aiLoadingCard}>
                <View style={styles.aiSparkleIconBox}>
                  <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                </View>
                <Text style={styles.aiLoadingTitle}>Création de votre recette inédite</Text>
                <Text style={styles.aiLoadingStepText}>{AI_STEPS[aiStepIndex]}</Text>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={styles.aiLoadingSpinner}
                />
                <Text style={styles.aiLoadingHint}>
                  Garanti sans aucun doublon avec vos {recipes.length} recettes existantes
                </Text>
              </View>
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ÉTAT 1 : Stock complètement vide */}
              {totalStockCount === 0 ? (
                <View style={styles.emptyStockBox}>
                  <View style={styles.emptyStockIconCircle}>
                    <Ionicons name="nutrition-outline" size={38} color={colors.textMuted} />
                  </View>
                  <Text style={styles.emptyStockTitle}>Vos étagères sont vides</Text>
                  <Text style={styles.emptyStockSubtitle}>
                    Renseignez vos ingrédients du placard ou du frigo dans l'onglet "Courses &
                    Étagères" pour voir instantanément quelles recettes cuisiner ou inspirer le Chef
                    IA.
                  </Text>
                  {onNavigateToStock && (
                    <TouchableOpacity
                      style={styles.fillStockBtn}
                      onPress={() => {
                        onClose();
                        onNavigateToStock();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.fillStockBtnText}>Remplir mes étagères 🥫</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* SECTION 1 : FILTRE DU CARNET (Besoin 1) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardIconBox}>
                        <Ionicons name="book-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle}>Dans votre carnet</Text>
                        <Text style={styles.cardSubtitle}>
                          Recettes réalisables immédiatement
                        </Text>
                      </View>
                    </View>

                    <View style={styles.carnetStatusRow}>
                      <View style={styles.carnetStatBox}>
                        <Text style={styles.carnetStatNumber}>{effectiveDoableCount}</Text>
                        <Text style={styles.carnetStatLabel}>
                          {effectiveDoableCount > 1 ? 'recettes prêtes' : 'recette prête'}
                        </Text>
                      </View>

                      <View style={styles.carnetStatDescCol}>
                        {effectiveDoableCount > 0 ? (
                          <Text style={styles.carnetStatDescText}>
                            Vous avez 100% des ingrédients requis (hors sel, poivre et huile du
                            placard) pour ces recettes !
                          </Text>
                        ) : (
                          <Text style={styles.carnetStatDescText}>
                            Aucune recette ne correspond à 100% à votre stock actuel. Vous pouvez
                            demander au Chef IA d'inventer une création sur-mesure ci-dessous !
                          </Text>
                        )}
                      </View>
                    </View>

                    {effectiveDoableCount > 0 && (
                      <View style={styles.carnetActionRow}>
                        {isDoableFilterActive ? (
                          <TouchableOpacity
                            style={[styles.carnetBtn, styles.carnetBtnActive]}
                            onPress={() => {
                              onApplyDoableFilter(false);
                              onClose();
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                            <Text style={styles.carnetBtnTextActive}>
                              Désactiver le filtre de stock
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.carnetBtn}
                            onPress={() => {
                              onApplyDoableFilter(true);
                              onClose();
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="funnel" size={16} color="#FFFFFF" />
                            <Text style={styles.carnetBtnText}>
                              Voir mes {effectiveDoableCount} recette{effectiveDoableCount > 1 ? 's' : ''} faisable{effectiveDoableCount > 1 ? 's' : ''}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* SECTION 2 : INSPIRATION CHEF IA (Besoin 2) */}
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.cardIconBox, { backgroundColor: colors.secondary + '20' }]}>
                        <Ionicons name="sparkles" size={18} color={colors.secondary} />
                      </View>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardTitle}>Invention Chef IA inédite</Text>
                        <Text style={styles.cardSubtitle}>
                          Sans aucun doublon avec votre carnet existant
                        </Text>
                      </View>
                    </View>

                    {/* Résumé des aliments en stock avec sélection interactive */}
                    <View style={styles.stockSelectionHeader}>
                      <Text style={styles.stockSelectionTitle}>
                        Aliments en vedette ({selectedStockNames.length}/{totalStockCount}) :
                      </Text>
                      <View style={styles.stockSelectionActions}>
                        <TouchableOpacity onPress={handleSelectAllStock}>
                          <Text style={styles.stockMiniLink}>Tout cocher</Text>
                        </TouchableOpacity>
                        <Text style={styles.stockMiniDivider}>•</Text>
                        <TouchableOpacity onPress={handleDeselectAllStock}>
                          <Text style={styles.stockMiniLink}>Tout décocher</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Liste verticale des aliments groupés par rayon */}
                    <View style={styles.stockAislesContainer}>
                      {groupedStockByAisle.map(({ aisle, items }) => {
                        const config = AISLE_CONFIGS[aisle] || {
                          iconName: 'cube-outline',
                          color: colors.primary,
                          aisle,
                        };
                        const selectedInAisle = items.filter((i) =>
                          selectedStockNames.includes(i.name)
                        ).length;
                        const allAisleSelected = selectedInAisle === items.length;

                        return (
                          <View key={aisle} style={styles.aisleGroupCard}>
                            {/* En-tête de catégorie / rayon */}
                            <View style={styles.aisleGroupHeader}>
                              <View style={styles.aisleGroupTitleRow}>
                                <View
                                  style={[
                                    styles.aisleIconBox,
                                    { backgroundColor: config.color + '20' },
                                  ]}
                                >
                                  <Ionicons
                                    name={config.iconName as any}
                                    size={14}
                                    color={config.color}
                                  />
                                </View>
                                <Text style={styles.aisleGroupTitle}>{aisle}</Text>
                                <Text style={styles.aisleGroupCount}>
                                  ({selectedInAisle}/{items.length})
                                </Text>
                              </View>

                              {/* Action rapide cocher/décocher tout le rayon */}
                              <TouchableOpacity
                                onPress={() => toggleAisle(items)}
                                hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
                              >
                                <Text
                                  style={[
                                    styles.aisleActionToggleText,
                                    { color: config.color },
                                  ]}
                                >
                                  {allAisleSelected ? 'Tout décocher' : 'Tout cocher'}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Puces d'ingrédients du rayon disposées en grille/wrap vertical */}
                            <View style={styles.aisleChipsWrap}>
                              {items.map((item) => {
                                const isSelected = selectedStockNames.includes(item.name);
                                return (
                                  <TouchableOpacity
                                    key={item.id}
                                    style={[
                                      styles.stockChip,
                                      isSelected && styles.stockChipSelected,
                                    ]}
                                    onPress={() => toggleStockIngredient(item.name)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                                      size={14}
                                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                                    />
                                    <Text
                                      style={[
                                        styles.stockChipText,
                                        isSelected && styles.stockChipTextSelected,
                                      ]}
                                    >
                                      {item.name}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Paramètres de l'invention IA */}
                    <View style={styles.aiParamsGrid}>
                      {/* Portions */}
                      <View style={styles.aiParamRow}>
                        <View style={styles.aiParamLabelCol}>
                          <Text style={styles.aiParamTitle}>Nombre de personnes</Text>
                          <Text style={styles.aiParamSub}>Ajuste les quantités</Text>
                        </View>
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={[
                              styles.stepperBtn,
                              servings <= 1 && styles.stepperBtnDisabled,
                            ]}
                            onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                            disabled={servings <= 1}
                          >
                            <Ionicons name="remove" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                          <Text style={styles.stepperValue}>{servings}</Text>
                          <TouchableOpacity
                            style={[
                              styles.stepperBtn,
                              servings >= 20 && styles.stepperBtnDisabled,
                            ]}
                            onPress={() => setServings((prev) => Math.min(20, prev + 1))}
                            disabled={servings >= 20}
                          >
                            <Ionicons name="add" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Végétarien toggle */}
                      <View style={styles.aiParamRow}>
                        <View style={styles.aiParamLabelCol}>
                          <Text style={styles.aiParamTitle}>Végétarien uniquement</Text>
                          <Text style={styles.aiParamSub}>Sans viande ni poisson</Text>
                        </View>
                        <Switch
                          value={isVegetarian}
                          onValueChange={setIsVegetarian}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor="#FFFFFF"
                        />
                      </View>

                      {/* Catégorie optionnelle */}
                      <View style={styles.mealTypesRow}>
                        {MEAL_TYPES.map((type) => {
                          const isCatSelected = mealType === type.id;
                          return (
                            <TouchableOpacity
                              key={type.id || 'all'}
                              style={[
                                styles.mealTypePill,
                                isCatSelected && styles.mealTypePillSelected,
                              ]}
                              onPress={() => setMealType(type.id)}
                            >
                              <Text
                                style={[
                                  styles.mealTypePillText,
                                  isCatSelected && styles.mealTypePillTextSelected,
                                ]}
                              >
                                {type.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Bouton de génération IA */}
                    <TouchableOpacity
                      style={[
                        styles.generateAiBtn,
                        selectedStockNames.length === 0 && styles.generateAiBtnDisabled,
                      ]}
                      onPress={handleStartAiGeneration}
                      disabled={selectedStockNames.length === 0}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                      <Text style={styles.generateAiBtnText}>
                        Générer une recette inédite
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          )}

          {/* Modal Clé API si absente */}
          <Modal
            visible={isApiKeyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsApiKeyModalVisible(false)}
          >
            <View style={styles.apiKeyModalOverlay}>
              <View style={styles.apiKeyModalCard}>
                <View style={styles.apiKeyHeader}>
                  <Ionicons name="key-outline" size={24} color={colors.primary} />
                  <Text style={styles.apiKeyTitle}>Clé API Gemini Requise</Text>
                </View>
                <Text style={styles.apiKeyText}>
                  Pour inventer des recettes avec vos restes, l'application utilise l'intelligence
                  artificielle gratuite Google Gemini (modèle BYOK).
                </Text>
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Collez votre clé API Gemini (AIza...)"
                  placeholderTextColor={colors.textMuted}
                  value={tempApiKeyInput}
                  onChangeText={setTempApiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <View style={styles.apiKeyActions}>
                  <TouchableOpacity
                    style={styles.apiKeyCancelBtn}
                    onPress={() => setIsApiKeyModalVisible(false)}
                  >
                    <Text style={styles.apiKeyCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.apiKeySaveBtn}
                    onPress={handleSaveApiKey}
                  >
                    <Text style={styles.apiKeySaveText}>Valider & Générer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  manageStockBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Boîte vide
  emptyStockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emptyStockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStockTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStockSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  fillStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  fillStockBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Cartes principales
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Stat Carnet
  carnetStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  carnetStatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minWidth: 70,
  },
  carnetStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  carnetStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  carnetStatDescCol: {
    flex: 1,
    paddingLeft: 12,
  },
  carnetStatDescText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  carnetActionRow: {
    marginTop: 2,
  },
  carnetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  carnetBtnActive: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger + '55',
  },
  carnetBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  carnetBtnTextActive: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },

  // Sélection stock chips
  stockSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  stockSelectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stockSelectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockMiniLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  stockMiniDivider: {
    fontSize: 10,
    color: colors.textMuted,
  },
  stockAislesContainer: {
    gap: 10,
    marginBottom: 12,
  },
  aisleGroupCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aisleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '60',
  },
  aisleGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  aisleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aisleGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  aisleGroupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  aisleActionToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aisleChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stockChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stockChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  stockChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Paramètres IA
  aiParamsGrid: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  aiParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aiParamLabelCol: {
    flex: 1,
  },
  aiParamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aiParamSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.35,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: 8,
    minWidth: 26,
    textAlign: 'center',
  },
  mealTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
  },
  mealTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypePillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealTypePillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  mealTypePillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  generateAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    ...shadows.card,
  },
  generateAiBtnDisabled: {
    opacity: 0.45,
  },
  generateAiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Loader IA
  aiLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aiLoadingCard: {
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    ...shadows.card,
  },
  aiSparkleIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  aiLoadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  aiLoadingStepText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 22,
    marginBottom: 16,
  },
  aiLoadingSpinner: {
    marginVertical: 12,
  },
  aiLoadingHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },

  // Clé API Modal
  apiKeyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  apiKeyModalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  apiKeyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  apiKeyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  apiKeyInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  apiKeyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  apiKeyCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  apiKeyCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  apiKeySaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  apiKeySaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
}));
