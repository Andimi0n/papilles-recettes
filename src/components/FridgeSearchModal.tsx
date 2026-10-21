import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { IngredientChip } from './IngredientChip';
import { extractUniqueIngredientNames, normalizeString, generateUniqueId } from '../utils/helpers';
import { RecipeAiService } from '../services/recipeAiService';
import { StorageService } from '../services/storageService';

interface FridgeSearchModalProps {
  visible: boolean;
  recipes: Recipe[];
  selectedIngredients: string[];
  onApply: (ingredients: string[]) => void;
  onGenerateRecipe?: (partialRecipe: Partial<Recipe>) => void;
  onClose: () => void;
}

const AI_STEPS = [
  'Le Chef IA analyse vos restes...',
  'Association créative des saveurs...',
  'Calcul des proportions & assaisonnements...',
  'Rédaction des étapes pas-à-pas...',
];

export const FridgeSearchModal: React.FC<FridgeSearchModalProps> = ({
  visible,
  recipes,
  selectedIngredients,
  onApply,
  onGenerateRecipe,
  onClose,
}) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIngredients);
  const [inputIngredient, setInputIngredient] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState(0);

  // Modal de clé API si absente
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [tempApiKeyInput, setTempApiKeyInput] = useState('');

  const stepIntervalRef = useRef<any>(null);

  // Synchronise lorsque le modal s'ouvre
  useEffect(() => {
    setLocalSelected(selectedIngredients);
    setInputIngredient('');
    setIsGeneratingAi(false);
  }, [visible, selectedIngredients]);

  // Animation des étapes IA
  useEffect(() => {
    if (isGeneratingAi) {
      setAiStepIndex(0);
      stepIntervalRef.current = setInterval(() => {
        setAiStepIndex((prev) => (prev + 1) % AI_STEPS.length);
      }, 2200);
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

  // Tous les ingrédients connus dans la base
  const allKnownIngredients = useMemo(() => extractUniqueIngredientNames(recipes), [recipes]);

  // Ingrédients filtrés par la saisie
  const suggestions = useMemo(() => {
    if (!inputIngredient.trim()) {
      return allKnownIngredients.slice(0, 16);
    }
    const norm = normalizeString(inputIngredient);
    return allKnownIngredients.filter((ing) => normalizeString(ing).includes(norm));
  }, [allKnownIngredients, inputIngredient]);

  const handleToggleIngredient = (name: string) => {
    const norm = normalizeString(name);
    const exists = localSelected.some((sel) => normalizeString(sel) === norm);
    if (exists) {
      setLocalSelected(localSelected.filter((sel) => normalizeString(sel) !== norm));
    } else {
      setLocalSelected([...localSelected, name]);
    }
  };

  const handleAddManualIngredient = () => {
    const trimmed = inputIngredient.trim();
    if (!trimmed) return;
    const norm = normalizeString(trimmed);
    const exists = localSelected.some((sel) => normalizeString(sel) === norm);
    if (!exists) {
      setLocalSelected([...localSelected, trimmed]);
    }
    setInputIngredient('');
  };

  const handleClearAll = () => {
    setLocalSelected([]);
  };

  const handleLoadFridgeStock = async () => {
    try {
      const fridge = await StorageService.getFridgeItems();
      if (fridge.length === 0) {
        Alert.alert('Étagères vides', "Vous n'avez pas encore d'aliments enregistrés dans l'onglet 'Courses & Étagères'.");
        return;
      }
      const names = fridge.map((f) => f.name);
      const combined = Array.from(new Set([...localSelected, ...names]));
      setLocalSelected(combined);
    } catch (e) {
      console.error('Erreur chargement stock étagères:', e);
    }
  };

  const handleApply = () => {
    onApply(localSelected);
    onClose();
  };

  // Compte de recettes qui match au moins un ingrédient
  const matchingRecipesCount = useMemo(() => {
    if (localSelected.length === 0) return recipes.length;
    const normalizedSel = localSelected.map(normalizeString);
    return recipes.filter((r) =>
      r.ingredients.some((ing) => {
        const norm = normalizeString(ing.name);
        return normalizedSel.some((sel) => norm.includes(sel) || sel.includes(norm));
      })
    ).length;
  }, [recipes, localSelected]);

  // Lancer l'invention d'une recette sur-mesure avec le Chef IA
  const handleAskChefAi = async () => {
    if (localSelected.length === 0) {
      Alert.alert(
        'Frigo vide',
        'Veuillez ajouter ou sélectionner au moins un ingrédient ou reste présent dans votre réfrigérateur.'
      );
      return;
    }

    const apiKey = await RecipeAiService.getApiKey();
    if (!apiKey) {
      setIsApiKeyModalVisible(true);
      return;
    }

    startAiGeneration(apiKey);
  };

  const startAiGeneration = async (key?: string) => {
    setIsGeneratingAi(true);

    try {
      const generated = await RecipeAiService.generateRecipeFromFridge(
        localSelected,
        { servings: 4 },
        key
      );

      const partialRecipe: Partial<Recipe> = {
        id: generateUniqueId('rec_fridge'),
        title: generated.title,
        description: generated.description,
        category: generated.category,
        difficulty: generated.difficulty,
        prepTimeMinutes: generated.prepTimeMinutes,
        cookTimeMinutes: generated.cookTimeMinutes,
        servings: generated.servings,
        isVegetarian: generated.isVegetarian,
        userNote:
          generated.userNote ||
          `Recette anti-gaspi inventée avec vos ingrédients : ${localSelected.join(', ')}`,
        rating: 0,
        isFavorite: false,
        ingredients: generated.ingredients.map((ing, idx) => ({
          id: generateUniqueId(`ing_${idx}`),
          name: ing.name,
          quantity: ing.quantity || '',
          unit: ing.unit || '',
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

      if (onGenerateRecipe) {
        onGenerateRecipe(partialRecipe);
      }
    } catch (err: any) {
      setIsGeneratingAi(false);
      Alert.alert(
        'Erreur Chef IA',
        err?.message || "Impossible d'inventer la recette. Vérifiez votre clé API et connexion Internet."
      );
    }
  };

  const handleSaveApiKey = async () => {
    const trimmed = tempApiKeyInput.trim();
    if (!trimmed) {
      Alert.alert('Clé requise', 'Veuillez saisir votre clé API Google Gemini.');
      return;
    }
    await RecipeAiService.setApiKey(trimmed);
    setIsApiKeyModalVisible(false);
    setTempApiKeyInput('');
    startAiGeneration(trimmed);
  };

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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Que contient votre frigo ?</Text>
              <Text style={styles.headerSubtitle}>
                Trouvez ou inventez des recettes avec vos restes
              </Text>
            </View>
            {localSelected.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Effacer</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Input d'ajout */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={Colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={inputIngredient}
                onChangeText={setInputIngredient}
                placeholder="Ex: Poulet, Tomate, Beurre, Parmesan..."
                placeholderTextColor={Colors.textMuted}
                onSubmitEditing={handleAddManualIngredient}
                returnKeyType="done"
              />
              {inputIngredient.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddManualIngredient}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Raccourci pour charger directement son stock d'étagères */}
            <TouchableOpacity
              style={styles.importFridgeBtn}
              onPress={handleLoadFridgeStock}
              activeOpacity={0.8}
            >
              <Ionicons name="layers-outline" size={15} color={Colors.primary} />
              <Text style={styles.importFridgeBtnText}>
                Importer mes aliments en stock (étagères)
              </Text>
            </TouchableOpacity>

            {/* Ingrédients actuellement sélectionnés */}
            {localSelected.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>
                    Ingrédients choisis ({localSelected.length})
                  </Text>
                  <Text style={styles.matchCountHint}>
                    {matchingRecipesCount === 0
                      ? '0 recette dans le carnet'
                      : `${matchingRecipesCount} recette${matchingRecipesCount > 1 ? 's' : ''}`}
                  </Text>
                </View>

                <View style={styles.chipsWrapper}>
                  {localSelected.map((ing) => (
                    <IngredientChip
                      key={`selected_${ing}`}
                      label={ing}
                      selected={true}
                      onRemove={() => handleToggleIngredient(ing)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* CARTE METTANT EN AVANT LE CHEF IA QUAND 0 RECETTE NE CONVIENT */}
            {localSelected.length > 0 && matchingRecipesCount === 0 && (
              <View style={styles.noMatchAiCard}>
                <View style={styles.noMatchAiHeader}>
                  <View style={styles.aiBadgeIcon}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.noMatchAiTitle}>
                    Aucune recette ne convient ?
                  </Text>
                </View>
                <Text style={styles.noMatchAiDesc}>
                  Ne laissez pas ces ingrédients se perdre ! Demandez au Chef IA d'inventer
                  une recette gastronomique originale sur-mesure avec exactement vos restes.
                </Text>

                <TouchableOpacity
                  style={styles.chefAiPrimaryBtn}
                  onPress={handleAskChefAi}
                  activeOpacity={0.88}
                  disabled={isGeneratingAi}
                >
                  {isGeneratingAi ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="restaurant" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.chefAiPrimaryBtnText}>
                    ✨ Inventer une recette avec ces restes
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Suggestions / Ingrédients disponibles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {inputIngredient.trim()
                  ? 'Résultats de recherche'
                  : "Suggestions d'ingrédients fréquents"}
              </Text>
              <View style={styles.chipsWrapper}>
                {suggestions.map((ing) => {
                  const isChosen = localSelected.some(
                    (sel) => normalizeString(sel) === normalizeString(ing)
                  );
                  return (
                    <IngredientChip
                      key={`sug_${ing}`}
                      label={ing}
                      selected={isChosen}
                      onPress={() => handleToggleIngredient(ing)}
                    />
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer d'action */}
          <View style={styles.footer}>
            {matchingRecipesCount > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApply}
                  activeOpacity={0.85}
                  disabled={isGeneratingAi}
                >
                  <Text style={styles.applyBtnText}>
                    {localSelected.length === 0
                      ? 'Voir toutes les recettes'
                      : `Trouver les recettes (${matchingRecipesCount})`}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.btnIcon} />
                </TouchableOpacity>

                {localSelected.length > 0 && (
                  <TouchableOpacity
                    style={styles.chefAiSecondaryBtn}
                    onPress={handleAskChefAi}
                    activeOpacity={0.8}
                    disabled={isGeneratingAi}
                  >
                    <Ionicons name="sparkles" size={16} color={Colors.primary} />
                    <Text style={styles.chefAiSecondaryBtnText}>
                      Ou demander au Chef IA d'inventer une recette inédite
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.zeroMatchFooterRow}>
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: Colors.surfaceAlt }]}
                  onPress={handleApply}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.applyBtnText, { color: Colors.textSecondary }]}>
                    Voir quand même
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyBtn, { flex: 2, backgroundColor: Colors.primary }]}
                  onPress={handleAskChefAi}
                  activeOpacity={0.85}
                  disabled={isGeneratingAi}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.applyBtnText}>Créer avec le Chef IA</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* OVERLAY CHARGEMENT GÉNÉRATION CHEF IA */}
          {isGeneratingAi && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <View style={styles.loadingHatCircle}>
                  <Ionicons name="restaurant" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.loadingTitle}>Chef IA en cuisine 👨‍🍳</Text>
                <Text style={styles.loadingStepText}>{AI_STEPS[aiStepIndex]}</Text>
                <ActivityIndicator
                  size="large"
                  color={Colors.primary}
                  style={{ marginVertical: 14 }}
                />
                <Text style={styles.loadingHint}>
                  Création d'une recette originale avec vos {localSelected.length} ingrédient
                  {localSelected.length > 1 ? 's' : ''}...
                </Text>
              </View>
            </View>
          )}

          {/* MODAL CONFIGURATION CLÉ API SI BESOIN */}
          <Modal
            visible={isApiKeyModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsApiKeyModalVisible(false)}
          >
            <View style={styles.apiKeyModalOverlay}>
              <View style={styles.apiKeyModalCard}>
                <View style={styles.apiKeyHeaderRow}>
                  <Ionicons name="key-outline" size={24} color={Colors.primary} />
                  <Text style={styles.apiKeyTitle}>Clé API Gemini Requise</Text>
                </View>
                <Text style={styles.apiKeyDescription}>
                  Pour inventer des recettes sur-mesure, Papilles utilise Google Gemini en direct
                  depuis votre appareil.
                  {'\n\n'}
                  Renseignez votre clé API gratuite Google AI Studio (aucun abonnement requis) :
                </Text>

                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Collez votre clé API (ex: AIzaSy...)"
                  placeholderTextColor={Colors.textMuted}
                  value={tempApiKeyInput}
                  onChangeText={setTempApiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={true}
                />

                <View style={styles.apiKeyActionsRow}>
                  <TouchableOpacity
                    style={styles.apiKeyCancelBtn}
                    onPress={() => setIsApiKeyModalVisible(false)}
                  >
                    <Text style={styles.apiKeyCancelBtnText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.apiKeySaveBtn}
                    onPress={handleSaveApiKey}
                  >
                    <Text style={styles.apiKeySaveBtnText}>Enregistrer & Lancer</Text>
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
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  closeBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 14,
    marginBottom: 8,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  importFridgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  importFridgeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  matchCountHint: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  noMatchAiCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + '55',
    ...Shadows.medium,
  },
  noMatchAiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  aiBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMatchAiTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  noMatchAiDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  chefAiPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    ...Shadows.small,
  },
  chefAiPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    gap: 8,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnIcon: {
    marginLeft: 6,
  },
  chefAiSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  chefAiSecondaryBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  zeroMatchFooterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...Shadows.large,
  },
  loadingHatCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  loadingStepText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
    minHeight: 18,
  },
  loadingHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  apiKeyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  apiKeyModalCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    ...Shadows.large,
  },
  apiKeyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  apiKeyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  apiKeyDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  apiKeyInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  apiKeyActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  apiKeyCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  apiKeyCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  apiKeySaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  apiKeySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
}));
