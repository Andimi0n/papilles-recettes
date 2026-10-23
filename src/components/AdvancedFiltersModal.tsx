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
import { Recipe, Difficulty, Category, TimeFilterMode } from '../types/recipe';
import { CanonicalIngredient } from '../types/vocabulary';
import { VocabularyService } from '../services/vocabularyService';
import { RecipeStockEvaluation } from '../utils/stockMatcher';
import {
  recipeMatchesIngredients,
  recipeMatchesTime,
  recipeMatchesDifficulty,
  searchRecipes,
} from '../utils/searchEngine';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { StarRating } from './StarRating';

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    targetTotalTime: number | null;
    timeFilterMode: TimeFilterMode;
    difficulties: Difficulty[];
    selectedIngredients: string[];
    ingredientMatchMode: 'all' | 'any';
    onlyVegetarian?: boolean;
    minRating?: number;
    onlyDoableWithStock?: boolean;
    maxTotalTime?: number | null; // rétrocompatibilité
  }) => void;
  onReset: () => void;
  // Valeurs initiales / actives
  targetTotalTime?: number | null;
  timeFilterMode?: TimeFilterMode;
  maxTotalTime?: number | null; // rétrocompatibilité
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

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
};

const TIME_QUICK_PRESETS: { label: string; value: number }[] = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 h', value: 60 },
  { label: '1 h 30', value: 90 },
  { label: '2 h', value: 120 },
];

const DIFFICULTY_CONFIG: {
  level: Difficulty;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { level: 'Facile', label: 'Facile', icon: 'leaf-outline' },
  { level: 'Moyen', label: 'Moyen', icon: 'flame-outline' },
  { level: 'Difficile', label: 'Difficile', icon: 'trophy-outline' },
];

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

export const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  targetTotalTime,
  timeFilterMode = 'max',
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

  // Initialisation sécurisée du temps cible avec prise en compte de maxTotalTime en secours
  const initialTime = targetTotalTime !== undefined ? targetTotalTime : (maxTotalTime !== undefined ? maxTotalTime : null);

  // États locaux de brouillon (draft) pour ajuster les filtres avant application
  const [draftTargetTotalTime, setDraftTargetTotalTime] = useState<number | null>(initialTime);
  const [draftTimeFilterMode, setDraftTimeFilterMode] = useState<TimeFilterMode>(timeFilterMode || 'max');
  const [timeInputString, setTimeInputString] = useState<string>(initialTime !== null ? String(initialTime) : '');

  const [draftMinRating, setDraftMinRating] = useState<number>(minRating);
  const [draftDifficulties, setDraftDifficulties] = useState<Difficulty[]>(difficulties);
  const [draftIngredients, setDraftIngredients] = useState<string[]>(selectedIngredients);
  const [draftIngredientMatchMode, setDraftIngredientMatchMode] = useState<'all' | 'any'>(
    ingredientMatchMode
  );

  // Saisie et autocomplétion pour les ingrédients
  const [ingredientInputText, setIngredientInputText] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<CanonicalIngredient[]>([]);

  // Synchronise les brouillons dès l'ouverture du modal
  useEffect(() => {
    if (visible) {
      const activeTime = targetTotalTime !== undefined ? targetTotalTime : (maxTotalTime !== undefined ? maxTotalTime : null);
      setDraftTargetTotalTime(activeTime);
      setDraftTimeFilterMode(timeFilterMode || 'max');
      setTimeInputString(activeTime !== null ? String(activeTime) : '');
      setDraftMinRating(minRating);
      setDraftDifficulties(difficulties);
      setDraftIngredients(selectedIngredients);
      setDraftIngredientMatchMode(ingredientMatchMode);
      setIngredientInputText('');
      setAutocompleteSuggestions([]);
    }
  }, [
    visible,
    targetTotalTime,
    timeFilterMode,
    maxTotalTime,
    minRating,
    difficulties,
    selectedIngredients,
    ingredientMatchMode,
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
      // Si la difficulté est déjà sélectionnée (clic une 2e fois), on réinitialise à toutes (tableau vide)
      if (prev.includes(diff)) {
        return [];
      }
      // Sinon on sélectionne exclusivement cette difficulté
      return [diff];
    });
  };

  const handleTimeTextChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setTimeInputString(clean);
    if (clean.length === 0) {
      setDraftTargetTotalTime(null);
    } else {
      const val = parseInt(clean, 10);
      if (!isNaN(val)) {
        setDraftTargetTotalTime(Math.min(360, Math.max(1, val)));
      }
    }
  };

  const handleSetTimeValue = (val: number | null) => {
    setDraftTargetTotalTime(val);
    setTimeInputString(val !== null ? String(val) : '');
  };

  const handleIncrementTime = () => {
    setDraftTargetTotalTime((prev) => {
      const current = prev ?? 0;
      let next: number;
      if (current < 30) {
        next = current + 5;
      } else if (current < 120) {
        next = current + 10;
      } else {
        next = current + 15;
      }
      next = Math.min(360, next);
      setTimeInputString(String(next));
      return next;
    });
  };

  const handleDecrementTime = () => {
    setDraftTargetTotalTime((prev) => {
      if (prev === null || prev <= 5) {
        setTimeInputString('');
        return null;
      }
      let next: number;
      if (prev <= 30) {
        next = Math.max(5, prev - 5);
      } else if (prev <= 120) {
        next = prev - 10;
      } else {
        next = prev - 15;
      }
      setTimeInputString(String(next));
      return next;
    });
  };

  const handleResetDrafts = () => {
    setDraftTargetTotalTime(null);
    setDraftTimeFilterMode('max');
    setTimeInputString('');
    setDraftMinRating(0);
    setDraftDifficulties([]);
    setDraftIngredients([]);
    setDraftIngredientMatchMode('all');
    setIngredientInputText('');
    setAutocompleteSuggestions([]);
  };

  const handleApply = () => {
    onApply({
      targetTotalTime: draftTargetTotalTime,
      timeFilterMode: draftTimeFilterMode,
      maxTotalTime: draftTargetTotalTime,
      difficulties: draftDifficulties,
      selectedIngredients: draftIngredients,
      ingredientMatchMode: draftIngredientMatchMode,
      minRating: draftMinRating,
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

    // Filtre végétarien (synchronisé depuis la barre d'accueil)
    if (onlyVegetarian) {
      result = result.filter((r) => r.isVegetarian);
    }

    // Filtre stock (recettes 100% faisables, synchronisé depuis la barre d'accueil)
    if (onlyDoableWithStock && doableRecipesMap) {
      result = result.filter((r) => doableRecipesMap.get(r.id)?.isDoable);
    }

    // Filtre temps total (rapide <= ou mijoté >=)
    if (draftTargetTotalTime !== null) {
      result = result.filter((r) =>
        recipeMatchesTime(r, draftTargetTotalTime, draftTimeFilterMode)
      );
    }

    // Filtre note minimale
    if (draftMinRating > 0) {
      result = result.filter((r) => r.rating >= draftMinRating);
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
    onlyVegetarian,
    onlyDoableWithStock,
    draftTargetTotalTime,
    draftTimeFilterMode,
    draftMinRating,
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
              {/* SECTION 1 : TEMPS TOTAL (RAPIDE ≤ / MIJOTÉ ≥, RACCOURCIS) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name={draftTimeFilterMode === 'min' ? 'flame-outline' : 'time-outline'}
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Temps total</Text>
                  {draftTargetTotalTime !== null ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {draftTimeFilterMode === 'min' ? '≥ ' : '≤ '}
                        {formatMinutes(draftTargetTotalTime)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Illimité</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Préparation + cuisson cumulées pour des repas rapides ou mijotés.
                </Text>

                {/* Commutateur de mode : Moins de (≤) vs Plus de (≥) */}
                <View style={styles.timeModeSegmented}>
                  <TouchableOpacity
                    style={[
                      styles.timeModeBtn,
                      draftTimeFilterMode === 'max' && styles.timeModeBtnActive,
                    ]}
                    onPress={() => setDraftTimeFilterMode('max')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="flash-outline"
                      size={14}
                      color={draftTimeFilterMode === 'max' ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.timeModeBtnText,
                        draftTimeFilterMode === 'max' && styles.timeModeBtnTextActive,
                      ]}
                    >
                      ≤ Moins de (Rapide)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.timeModeBtn,
                      draftTimeFilterMode === 'min' && styles.timeModeBtnActive,
                    ]}
                    onPress={() => setDraftTimeFilterMode('min')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="flame-outline"
                      size={14}
                      color={draftTimeFilterMode === 'min' ? '#FFFFFF' : colors.textSecondary}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.timeModeBtnText,
                        draftTimeFilterMode === 'min' && styles.timeModeBtnTextActive,
                      ]}
                    >
                      ≥ Plus de (Mijoté)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Entrée libre & Pas-à-pas : [-] [ TextInput ] [+] */}
                <View style={styles.timeStepperRow}>
                  <TouchableOpacity
                    style={[
                      styles.timeStepBtn,
                      (!draftTargetTotalTime || draftTargetTotalTime <= 5) && styles.timeStepBtnDisabled,
                    ]}
                    onPress={handleDecrementTime}
                    disabled={!draftTargetTotalTime || draftTargetTotalTime <= 5}
                    activeOpacity={0.7}
                    accessibilityLabel="Diminuer la durée"
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={(!draftTargetTotalTime || draftTargetTotalTime <= 5) ? colors.textMuted : colors.textPrimary}
                    />
                  </TouchableOpacity>

                  <View style={styles.timeInputBox}>
                    <TextInput
                      style={styles.timeTextInput}
                      value={timeInputString}
                      onChangeText={handleTimeTextChange}
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={3}
                      returnKeyType="done"
                    />
                    <Text style={styles.timeInputUnit}>min</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.timeStepBtn}
                    onPress={handleIncrementTime}
                    activeOpacity={0.7}
                    accessibilityLabel="Augmenter la durée"
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Explication lisible en langage naturel */}
                <Text style={styles.timeHumanText}>
                  {draftTargetTotalTime !== null
                    ? draftTimeFilterMode === 'max'
                      ? `Recettes prêtes en moins de ${formatMinutes(draftTargetTotalTime)}`
                      : `Recettes nécessitant plus de ${formatMinutes(draftTargetTotalTime)} (mijoté)`
                    : 'Toutes les durées sont affichées'}
                </Text>

                {/* Raccourcis rapides en 1 clic */}
                <View style={styles.timePresetsRow}>
                  {TIME_QUICK_PRESETS.map((preset) => {
                    const isSelected = draftTargetTotalTime === preset.value;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.timePresetChip, isSelected && styles.timePresetChipActive]}
                        onPress={() => handleSetTimeValue(isSelected ? null : preset.value)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.timePresetChipText,
                            isSelected && styles.timePresetChipTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {draftTargetTotalTime !== null && (
                    <TouchableOpacity
                      style={styles.timeClearChip}
                      onPress={() => handleSetTimeValue(null)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.timeClearChipText}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* SECTION 2 : NOTE MINIMALE */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star" size={17} color={colors.amber} />
                  <Text style={styles.sectionTitle}>Note minimale</Text>
                  {draftMinRating > 0 ? (
                    <View style={[styles.countBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                      <Text style={[styles.countBadgeText, { color: colors.amber }]}>
                        {`≥ ${draftMinRating % 1 === 0 ? draftMinRating : draftMinRating.toFixed(1)} ★`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Toutes les notes</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Affichez uniquement les recettes recevant au moins cette note moyenne.
                </Text>

                <View style={styles.ratingStarsBox}>
                  <StarRating
                    rating={draftMinRating}
                    size={28}
                    interactive
                    onRatingChange={(newVal) => setDraftMinRating(newVal)}
                    showClear={false}
                    showScore={false}
                  />
                  <Text style={styles.ratingValueText}>
                    {draftMinRating > 0
                      ? `≥ ${draftMinRating % 1 === 0 ? draftMinRating : draftMinRating.toFixed(1)} étoiles et plus`
                      : 'Toutes les notes (aucun filtre)'}
                  </Text>
                </View>

                {/* Raccourcis rapides pré-définis */}
                <View style={styles.ratingPresetsRow}>
                  {[
                    { label: 'Toutes', value: 0 },
                    { label: '≥ 3 ★', value: 3.0 },
                    { label: '≥ 3,5 ★', value: 3.5 },
                    { label: '≥ 4 ★', value: 4.0 },
                    { label: '≥ 4,5 ★', value: 4.5 },
                  ].map((preset) => {
                    const isSelected = draftMinRating === preset.value;
                    return (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.ratingPresetChip, isSelected && styles.ratingPresetChipActive]}
                        onPress={() => setDraftMinRating(isSelected && preset.value > 0 ? 0 : preset.value)}
                        activeOpacity={0.75}
                      >
                        {preset.value > 0 && (
                          <Ionicons
                            name="star"
                            size={12}
                            color={isSelected ? '#FFFFFF' : colors.amber}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.ratingPresetChipText,
                            isSelected && styles.ratingPresetChipTextActive,
                          ]}
                        >
                          {preset.label}
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
                  {draftDifficulties.length > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftDifficulties[0]}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Toutes</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Touchez pour cibler un niveau, ou touchez à nouveau pour tout afficher.
                </Text>

                <View style={styles.difficultyRow}>
                  {DIFFICULTY_CONFIG.map((item) => {
                    const isSelected = draftDifficulties.includes(item.level);
                    return (
                      <TouchableOpacity
                        key={item.level}
                        style={[
                          styles.difficultyCard,
                          isSelected && styles.difficultyCardActive,
                        ]}
                        onPress={() => handleToggleDifficulty(item.level)}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={item.icon}
                          size={16}
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          style={[
                            styles.difficultyCardText,
                            isSelected && styles.difficultyCardTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && <View style={styles.difficultyDotActive} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION 4 : INGRÉDIENTS SOUHAITÉS */}
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
  sectionHeaderHint: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timeModeSegmented: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  timeModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  timeModeBtnActive: {
    backgroundColor: colors.primary,
  },
  timeModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  timeStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  timeStepBtnDisabled: {
    opacity: 0.35,
    elevation: 0,
    shadowOpacity: 0,
  },
  timeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 120,
  },
  timeTextInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 46,
    padding: 0,
  },
  timeInputUnit: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  timeHumanText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  timePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  timePresetChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timePresetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timePresetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timePresetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeClearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeClearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  difficultyCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    position: 'relative',
  },
  difficultyCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  difficultyCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  difficultyCardTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  difficultyDotActive: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  ratingStarsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
    gap: 6,
  },
  ratingValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.amber,
  },
  ratingPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingPresetChipActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  ratingPresetChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ratingPresetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
