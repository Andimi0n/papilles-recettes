import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Difficulty, Category } from '../types/recipe';
import { CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { RecipeStockEvaluation } from '../utils/stockMatcher';
import {
  recipeMatchesIngredients,
  recipeMatchesMaxTime,
  recipeMatchesDifficulty,
  searchRecipes,
} from '../utils/searchEngine';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    maxTotalTime: number | null;
    difficulties: Difficulty[];
    selectedIngredients: string[];
    ingredientMatchMode: 'all' | 'any';
    onlyVegetarian?: boolean;
    minRating?: number;
    onlyDoableWithStock?: boolean;
  }) => void;
  onReset: () => void;
  // Valeurs initiales / actives
  maxTotalTime: number | null;
  difficulties: Difficulty[];
  selectedIngredients: string[];
  ingredientMatchMode: 'all' | 'any';
  onlyVegetarian?: boolean;
  minRating?: number;
  onlyDoableWithStock?: boolean;
  // Données pour le calcul du compteur en temps réel
  recipes: Recipe[];
  doableRecipesMap?: Map<string, RecipeStockEvaluation>;
  selectedCategories?: Category[];
  searchQuery?: string;
}

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Tous', value: null },
  { label: '≤ 15 min', value: 15 },
  { label: '≤ 30 min', value: 30 },
  { label: '≤ 45 min', value: 45 },
  { label: '≤ 1 h', value: 60 },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['Facile', 'Moyen', 'Difficile'];

const POPULAR_INGREDIENT_SUGGESTIONS = [
  'Tomate',
  'Courgette',
  'Poulet',
  'Œufs',
  'Pâtes',
  'Riz',
  'Saumon',
  'Pomme de terre',
  'Chocolat',
  'Carotte',
  'Oignon',
  'Champignon',
];

const RATING_OPTIONS = [
  { label: 'Toutes', value: 0 },
  { label: '≥ 3 ★', value: 3 },
  { label: '≥ 4 ★', value: 4 },
  { label: '≥ 4.5 ★', value: 4.5 },
];

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  maxTotalTime,
  difficulties,
  selectedIngredients,
  ingredientMatchMode,
  onlyVegetarian = false,
  minRating = 0,
  onlyDoableWithStock = false,
  recipes,
  doableRecipesMap,
  selectedCategories,
  searchQuery,
}) => {
  const { isDark, colors } = useTheme();

  // États locaux de brouillon (draft) pour ajuster les filtres avant application
  const [draftMaxTotalTime, setDraftMaxTotalTime] = useState<number | null>(maxTotalTime);
  const [draftDifficulties, setDraftDifficulties] = useState<Difficulty[]>(difficulties);
  const [draftIngredients, setDraftIngredients] = useState<string[]>(selectedIngredients);
  const [draftIngredientMatchMode, setDraftIngredientMatchMode] = useState<'all' | 'any'>(
    ingredientMatchMode
  );
  const [draftVegetarian, setDraftVegetarian] = useState<boolean>(onlyVegetarian);
  const [draftMinRating, setDraftMinRating] = useState<number>(minRating);
  const [draftOnlyDoable, setDraftOnlyDoable] = useState<boolean>(onlyDoableWithStock);

  // Saisie et autocomplétion pour les ingrédients
  const [ingredientInputText, setIngredientInputText] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<CanonicalIngredient[]>([]);

  // Synchronise les brouillons dès l'ouverture du modal
  useEffect(() => {
    if (visible) {
      setDraftMaxTotalTime(maxTotalTime);
      setDraftDifficulties(difficulties);
      setDraftIngredients(selectedIngredients);
      setDraftIngredientMatchMode(ingredientMatchMode);
      setDraftVegetarian(onlyVegetarian);
      setDraftMinRating(minRating);
      setDraftOnlyDoable(onlyDoableWithStock);
      setIngredientInputText('');
      setAutocompleteSuggestions([]);
    }
  }, [
    visible,
    maxTotalTime,
    difficulties,
    selectedIngredients,
    ingredientMatchMode,
    onlyVegetarian,
    minRating,
    onlyDoableWithStock,
  ]);

  // Recherche synchrone d'ingrédients canoniques pendant la frappe
  const handleIngredientTextChange = (text: string) => {
    setIngredientInputText(text);
    const clean = text.trim();
    if (clean.length >= 2) {
      const matches = VocabularyService.search(clean, 6);
      // Exclure les ingrédients déjà présents dans draftIngredients
      const filtered = matches.filter(
        (m) => !draftIngredients.some((ing) => ing.toLowerCase() === m.canonicalName.toLowerCase())
      );
      setAutocompleteSuggestions(filtered);
    } else {
      setAutocompleteSuggestions([]);
    }
  };

  const handleAddIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!draftIngredients.some((i) => i.toLowerCase() === formatted.toLowerCase())) {
      setDraftIngredients((prev) => [...prev, formatted]);
    }
    setIngredientInputText('');
    setAutocompleteSuggestions([]);
  };

  const handleRemoveIngredient = (name: string) => {
    setDraftIngredients((prev) => prev.filter((i) => i !== name));
  };

  const handleToggleDifficulty = (diff: Difficulty) => {
    setDraftDifficulties((prev) => {
      if (prev.includes(diff)) {
        return prev.filter((d) => d !== diff);
      } else {
        return [...prev, diff];
      }
    });
  };

  const handleResetDrafts = () => {
    setDraftMaxTotalTime(null);
    setDraftDifficulties([]);
    setDraftIngredients([]);
    setDraftIngredientMatchMode('all');
    setDraftVegetarian(false);
    setDraftMinRating(0);
    setDraftOnlyDoable(false);
    setIngredientInputText('');
    setAutocompleteSuggestions([]);
  };

  const handleApply = () => {
    onApply({
      maxTotalTime: draftMaxTotalTime,
      difficulties: draftDifficulties,
      selectedIngredients: draftIngredients,
      ingredientMatchMode: draftIngredientMatchMode,
      onlyVegetarian: draftVegetarian,
      minRating: draftMinRating,
      onlyDoableWithStock: draftOnlyDoable,
    });
    onClose();
  };

  // Calcul dynamique et instantané du nombre de recettes correspondantes
  const matchingRecipesCount = useMemo(() => {
    let result = recipes;

    // Filtre texte existant
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchRes = searchRecipes(recipes, searchQuery);
      result = searchRes.map((r) => r.recipe);
    }

    // Catégories sélectionnées
    if (
      selectedCategories &&
      selectedCategories.length > 0 &&
      !selectedCategories.includes('Tous')
    ) {
      result = result.filter((r) => selectedCategories.includes(r.category));
    }

    // Filtre végétarien
    if (draftVegetarian) {
      result = result.filter((r) => r.isVegetarian);
    }

    // Filtre stock (recettes 100% faisables)
    if (draftOnlyDoable && doableRecipesMap) {
      result = result.filter((r) => doableRecipesMap.get(r.id)?.isDoable);
    }

    // Filtre note minimale
    if (draftMinRating > 0) {
      result = result.filter((r) => r.rating >= draftMinRating);
    }

    // Filtre temps total max
    if (draftMaxTotalTime !== null) {
      result = result.filter((r) => recipeMatchesMaxTime(r, draftMaxTotalTime));
    }

    // Filtre difficultés
    if (draftDifficulties.length > 0) {
      result = result.filter((r) => recipeMatchesDifficulty(r, draftDifficulties));
    }

    // Filtre ingrédients ciblés
    if (draftIngredients.length > 0) {
      result = result.filter((r) =>
        recipeMatchesIngredients(r, draftIngredients, draftIngredientMatchMode)
      );
    }

    return result.length;
  }, [
    recipes,
    searchQuery,
    selectedCategories,
    draftVegetarian,
    draftOnlyDoable,
    draftMinRating,
    draftMaxTotalTime,
    draftDifficulties,
    draftIngredients,
    draftIngredientMatchMode,
    doableRecipesMap,
  ]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalContent}>
            {/* Poignée de drag & En-tête */}
            <View style={styles.dragHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Filtres avancés</Text>
                  <Text style={styles.headerSubtitle}>
                    Affinez votre recherche selon vos envies
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
                accessibilityLabel="Fermer les filtres avancés"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contenu déroulant des sections de filtrage */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION 1 : FILTRER PAR INGRÉDIENTS (FAMILLE 2) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="nutrition-outline" size={17} color={colors.secondary} />
                  <Text style={styles.sectionTitle}>Ingrédients souhaités</Text>
                  {draftIngredients.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftIngredients.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Trouvez des recettes contenant spécifiquement ces ingrédients.
                </Text>

                {/* Champ de saisie d'ingrédients avec autocomplétion */}
                <View style={styles.inputRow}>
                  <Ionicons
                    name="search-outline"
                    size={17}
                    color={colors.textMuted}
                    style={styles.inputSearchIcon}
                  />
                  <TextInput
                    style={styles.ingredientInput}
                    value={ingredientInputText}
                    onChangeText={handleIngredientTextChange}
                    placeholder="Ajouter un ingrédient (ex: Courgette, Tomate...)"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={() => handleAddIngredient(ingredientInputText)}
                    autoCorrect={false}
                    autoCapitalize="sentences"
                  />
                  {ingredientInputText.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.addIngredientBtn}
                      onPress={() => handleAddIngredient(ingredientInputText)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Suggestions issues de l'autocomplétion pendant la frappe */}
                {autocompleteSuggestions.length > 0 && (
                  <View style={styles.autocompleteSuggestionsContainer}>
                    <Text style={styles.suggestionsHeaderLabel}>Suggestions du lexique :</Text>
                    <View style={styles.suggestionsWrap}>
                      {autocompleteSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionChip}
                          onPress={() => handleAddIngredient(item.canonicalName)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle" size={14} color={colors.primary} />
                          <Text style={styles.suggestionChipText}>{item.canonicalName}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Puces des ingrédients actuellement sélectionnés */}
                {draftIngredients.length > 0 ? (
                  <View style={styles.selectedIngredientsContainer}>
                    <Text style={styles.selectedIngredientsLabel}>Ingrédients inclus :</Text>
                    <View style={styles.selectedIngredientsWrap}>
                      {draftIngredients.map((ing) => (
                        <View key={ing} style={styles.selectedIngredientChip}>
                          <Text style={styles.selectedIngredientChipText}>{ing}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveIngredient(ing)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={styles.removeChipBtn}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Règle de correspondance si au moins 2 ingrédients sélectionnés (ET vs OU) */}
                    {draftIngredients.length >= 2 && (
                      <View style={styles.matchModeContainer}>
                        <Text style={styles.matchModeLabel}>Règle de combinaison :</Text>
                        <View style={styles.matchModeSegmented}>
                          <TouchableOpacity
                            style={[
                              styles.matchModeBtn,
                              draftIngredientMatchMode === 'all' && styles.matchModeBtnActive,
                            ]}
                            onPress={() => setDraftIngredientMatchMode('all')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'all' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Tous (ET)
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.matchModeBtn,
                              draftIngredientMatchMode === 'any' && styles.matchModeBtnActive,
                            ]}
                            onPress={() => setDraftIngredientMatchMode('any')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'any' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Au moins un (OU)
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.matchModeExplanation}>
                          {draftIngredientMatchMode === 'all'
                            ? 'La recette doit obligatoirement inclure tous ces ingrédients.'
                            : 'La recette peut inclure n’importe lequel de ces ingrédients.'}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  /* Suggestions d'ingrédients populaires rapides si rien n'est sélectionné */
                  <View style={styles.popularSuggestionsContainer}>
                    <Text style={styles.popularLabel}>Suggestions fréquentes en 1 clic :</Text>
                    <View style={styles.popularWrap}>
                      {POPULAR_INGREDIENT_SUGGESTIONS.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={styles.popularChip}
                          onPress={() => handleAddIngredient(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.popularChipText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* SECTION 2 : TEMPS TOTAL MAX */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={17} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Temps total maximum</Text>
                  {draftMaxTotalTime !== null && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>≤ {draftMaxTotalTime}m</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Préparation + cuisson cumulées pour des repas rapides ou mijotés.
                </Text>

                <View style={styles.chipsRow}>
                  {TIME_OPTIONS.map((opt) => {
                    const isSelected = draftMaxTotalTime === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => setDraftMaxTotalTime(isSelected && opt.value !== null ? null : opt.value)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            isSelected && styles.choiceChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION 3 : NIVEAU DE DIFFICULTÉ */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bar-chart-outline" size={17} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Niveau de difficulté</Text>
                  {draftDifficulties.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftDifficulties.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Sélectionnez un ou plusieurs niveaux de technicité.
                </Text>

                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.choiceChip,
                      draftDifficulties.length === 0 && styles.choiceChipActive,
                    ]}
                    onPress={() => setDraftDifficulties([])}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        draftDifficulties.length === 0 && styles.choiceChipTextActive,
                      ]}
                    >
                      Toutes
                    </Text>
                  </TouchableOpacity>

                  {DIFFICULTY_OPTIONS.map((diff) => {
                    const isSelected = draftDifficulties.includes(diff);
                    return (
                      <TouchableOpacity
                        key={diff}
                        style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                        onPress={() => handleToggleDifficulty(diff)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            isSelected && styles.choiceChipTextActive,
                          ]}
                        >
                          {diff}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION 4 : PRÉFÉRENCES & RÉGIME */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="options-outline" size={17} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Régime & Stock</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Préférences rapides synchronisées avec la barre d'accueil.
                </Text>

                {/* Végétarien & Stock Toggles */}
                <View style={styles.preferenceTogglesWrap}>
                  <TouchableOpacity
                    style={[
                      styles.preferenceToggleBtn,
                      draftVegetarian && styles.preferenceToggleBtnActiveVege,
                    ]}
                    onPress={() => setDraftVegetarian(!draftVegetarian)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="leaf"
                      size={16}
                      color={draftVegetarian ? '#FFFFFF' : (isDark ? '#4ADE80' : '#15803D')}
                    />
                    <Text
                      style={[
                        styles.preferenceToggleText,
                        draftVegetarian && styles.preferenceToggleTextActive,
                      ]}
                    >
                      Végétarien uniquement
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.preferenceToggleBtn,
                      draftOnlyDoable && styles.preferenceToggleBtnActiveStock,
                    ]}
                    onPress={() => setDraftOnlyDoable(!draftOnlyDoable)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="restaurant"
                      size={16}
                      color={draftOnlyDoable ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.preferenceToggleText,
                        draftOnlyDoable && styles.preferenceToggleTextActive,
                      ]}
                    >
                      En stock uniquement
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Note minimale */}
                <View style={styles.ratingSubSection}>
                  <Text style={styles.ratingSubLabel}>Note minimale :</Text>
                  <View style={styles.chipsRow}>
                    {RATING_OPTIONS.map((opt) => {
                      const isSelected = draftMinRating === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[styles.choiceChip, isSelected && styles.choiceChipActive]}
                          onPress={() => setDraftMinRating(opt.value)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              isSelected && styles.choiceChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* BARRE D'ACTIONS INFÉRIEURE (FIXE & STABLE) */}
            <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
              <View style={styles.footerRow}>
                {/* Réinitialiser */}
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetDrafts}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={17} color={colors.textSecondary} />
                  <Text style={styles.resetBtnText}>Réinitialiser</Text>
                </TouchableOpacity>

                {/* Bouton Appliquer avec décompte temps réel */}
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApply}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>
                    {matchingRecipesCount === 0
                      ? 'Aucune recette correspondante'
                      : matchingRecipesCount === 1
                      ? 'Voir 1 recette'
                      : `Voir les ${matchingRecipesCount} recettes`}
                  </Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    maxHeight: '92%',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    maxHeight: '100%',
    ...shadows.large,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 44,
  },
  inputSearchIcon: {
    marginRight: 6,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
    height: 44,
  },
  addIngredientBtn: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  autocompleteSuggestionsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsHeaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  suggestionChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedIngredientsContainer: {
    marginTop: 12,
  },
  selectedIngredientsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  selectedIngredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedIngredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 16,
    ...shadows.card,
  },
  selectedIngredientChipText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  removeChipBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModeContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  matchModeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  matchModeSegmented: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchModeBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  matchModeBtnActive: {
    backgroundColor: colors.secondary,
  },
  matchModeBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  matchModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  matchModeExplanation: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 5,
    fontStyle: 'italic',
  },
  popularSuggestionsContainer: {
    marginTop: 10,
  },
  popularLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  popularWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  popularChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularChipText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  preferenceTogglesWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  preferenceToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preferenceToggleBtnActiveVege: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  preferenceToggleBtnActiveStock: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  preferenceToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  preferenceToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ratingSubSection: {
    marginTop: 4,
  },
  ratingSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  footerSafeArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    ...shadows.card,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
}));
