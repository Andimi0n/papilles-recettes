import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Difficulty, Category, TimeFilterMode } from '../types/recipe';
import { RecipeStockEvaluation } from '../utils/stockMatcher';
import {
  recipeMatchesIngredients,
  recipeMatchesTime,
  recipeMatchesDifficulty,
  recipeMatchesTags,
  searchRecipes,
} from '../utils/searchEngine';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { StarRating } from './StarRating';
import { UnifiedIngredientInput } from './UnifiedIngredientInput';

interface AdvancedFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    targetTotalTime: number | null;
    timeFilterMode: TimeFilterMode;
    difficulties: Difficulty[];
    selectedIngredients: string[];
    ingredientMatchMode: 'all' | 'any';
    selectedTags?: string[];
    tagMatchMode?: 'all' | 'any';
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
  selectedTags?: string[];
  tagMatchMode?: 'all' | 'any';
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

interface TimePreset {
  id: string;
  label: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  targetMinutes: number;
  mode: TimeFilterMode;
}

const TIME_PRESETS: TimePreset[] = [
  {
    id: 'express',
    label: 'Express',
    badge: '≤ 20 min',
    icon: 'flash-outline',
    targetMinutes: 20,
    mode: 'max',
  },
  {
    id: 'daily',
    label: 'Quotidien',
    badge: '≤ 40 min',
    icon: 'time-outline',
    targetMinutes: 40,
    mode: 'max',
  },
  {
    id: 'comfort',
    label: 'Confort',
    badge: '≤ 1 h',
    icon: 'restaurant-outline',
    targetMinutes: 60,
    mode: 'max',
  },
  {
    id: 'slow',
    label: 'Mijoté',
    badge: '≥ 1 h',
    icon: 'flame-outline',
    targetMinutes: 60,
    mode: 'min',
  },
];

const TIME_FINE_PRESETS = [
  { label: '15 min', value: 15, mode: 'max' as TimeFilterMode },
  { label: '30 min', value: 30, mode: 'max' as TimeFilterMode },
  { label: '45 min', value: 45, mode: 'max' as TimeFilterMode },
  { label: '1 h 30', value: 90, mode: 'max' as TimeFilterMode },
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
  selectedTags = [],
  tagMatchMode = 'any',
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

  // Filtres rapides (Végé & En stock) éditables directement dans le modal
  const [draftOnlyVegetarian, setDraftOnlyVegetarian] = useState<boolean>(onlyVegetarian);
  const [draftOnlyDoableWithStock, setDraftOnlyDoableWithStock] = useState<boolean>(onlyDoableWithStock);

  const [draftMinRating, setDraftMinRating] = useState<number>(minRating);
  const [draftDifficulties, setDraftDifficulties] = useState<Difficulty[]>(difficulties);
  const [draftIngredients, setDraftIngredients] = useState<string[]>(selectedIngredients);
  const [draftIngredientMatchMode, setDraftIngredientMatchMode] = useState<'all' | 'any'>(
    ingredientMatchMode
  );
  const [draftTags, setDraftTags] = useState<string[]>(selectedTags);
  const [draftTagMatchMode, setDraftTagMatchMode] = useState<'all' | 'any'>(tagMatchMode || 'any');

  // Saisie pour les ingrédients
  const [ingredientInputText, setIngredientInputText] = useState('');

  // Décompte des recettes faisables avec le stock
  const doableCount = useMemo(() => {
    if (!doableRecipesMap) return 0;
    let count = 0;
    recipes.forEach((r) => {
      if (doableRecipesMap.get(r.id)?.isDoable) count++;
    });
    return count;
  }, [recipes, doableRecipesMap]);

  // Liste de tous les tags existants dans les recettes
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (Array.isArray(r.tags)) {
        r.tags.forEach((t) => {
          const trimmed = typeof t === 'string' ? t.trim() : '';
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [recipes]);

  // Synchronise les brouillons dès l'ouverture du modal pendant le render (pattern officiel React 19)
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible && !prevVisible) {
    setPrevVisible(true);
    const activeTime = targetTotalTime !== undefined ? targetTotalTime : (maxTotalTime !== undefined ? maxTotalTime : null);
    setDraftTargetTotalTime(activeTime);
    setDraftTimeFilterMode(timeFilterMode || 'max');
    setDraftOnlyVegetarian(onlyVegetarian);
    setDraftOnlyDoableWithStock(onlyDoableWithStock);
    setDraftMinRating(minRating);
    setDraftDifficulties(difficulties);
    setDraftIngredients(selectedIngredients);
    setDraftIngredientMatchMode(ingredientMatchMode);
    setDraftTags(selectedTags);
    setDraftTagMatchMode(tagMatchMode || 'any');
    setIngredientInputText('');
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  const handleAddIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!draftIngredients.some((i) => i.toLowerCase() === formatted.toLowerCase())) {
      setDraftIngredients((prev) => [...prev, formatted]);
    }
    setIngredientInputText('');
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

  const handleToggleTimePreset = (minutes: number, mode: TimeFilterMode) => {
    if (draftTargetTotalTime === minutes && draftTimeFilterMode === mode) {
      setDraftTargetTotalTime(null);
      setDraftTimeFilterMode('max');
    } else {
      setDraftTargetTotalTime(minutes);
      setDraftTimeFilterMode(mode);
    }
  };

  const handleClearTime = () => {
    setDraftTargetTotalTime(null);
    setDraftTimeFilterMode('max');
  };

  const handleToggleTag = (tag: string) => {
    setDraftTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (exists) {
        return prev.filter((t) => t.toLowerCase() !== tag.toLowerCase());
      }
      return [...prev, tag];
    });
  };

  const handleResetDrafts = () => {
    setDraftTargetTotalTime(null);
    setDraftTimeFilterMode('max');
    setDraftOnlyVegetarian(false);
    setDraftOnlyDoableWithStock(false);
    setDraftMinRating(0);
    setDraftDifficulties([]);
    setDraftIngredients([]);
    setDraftIngredientMatchMode('all');
    setDraftTags([]);
    setDraftTagMatchMode('any');
    setIngredientInputText('');
    onReset();
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
      selectedTags: draftTags,
      tagMatchMode: draftTagMatchMode,
      onlyVegetarian: draftOnlyVegetarian,
      onlyDoableWithStock: draftOnlyDoableWithStock,
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

    // Filtre végétarien (draft local éditable dans le modal)
    if (draftOnlyVegetarian) {
      result = result.filter((r) => r.isVegetarian);
    }

    // Filtre stock (recettes 100% faisables, draft local éditable dans le modal)
    if (draftOnlyDoableWithStock && doableRecipesMap) {
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

    // Filtre tags personnalisés
    if (draftTags.length > 0) {
      result = result.filter((r) =>
        recipeMatchesTags(r, draftTags, draftTagMatchMode)
      );
    }

    return result.length;
  }, [
    recipes,
    searchQuery,
    selectedCategories,
    draftOnlyVegetarian,
    draftOnlyDoableWithStock,
    draftTargetTotalTime,
    draftTimeFilterMode,
    draftMinRating,
    draftDifficulties,
    draftIngredients,
    draftIngredientMatchMode,
    draftTags,
    draftTagMatchMode,
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
              {/* SECTION 1 : EN UN COUP D'ŒIL (FILTRES RAPIDES EN STOCK & VÉGÉ) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
                  <Text style={styles.sectionTitle}>En un coup d’œil</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Priorisez selon votre frigo et vos habitudes alimentaires.
                </Text>

                <View style={styles.quickFiltersRow}>
                  {/* Carte En Stock */}
                  <TouchableOpacity
                    style={[
                      styles.quickFilterCard,
                      draftOnlyDoableWithStock && styles.quickFilterCardStockActive,
                    ]}
                    onPress={() => setDraftOnlyDoableWithStock((prev) => !prev)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickFilterHeader}>
                      <Ionicons
                        name={draftOnlyDoableWithStock ? 'restaurant' : 'restaurant-outline'}
                        size={18}
                        color={draftOnlyDoableWithStock ? '#FFFFFF' : colors.primary}
                      />
                      <Ionicons
                        name={draftOnlyDoableWithStock ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={draftOnlyDoableWithStock ? '#FFFFFF' : colors.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.quickFilterTitle,
                        draftOnlyDoableWithStock && styles.quickFilterTitleActive,
                      ]}
                    >
                      En stock
                    </Text>
                    <Text
                      style={[
                        styles.quickFilterSubtitle,
                        draftOnlyDoableWithStock && styles.quickFilterSubtitleActive,
                      ]}
                    >
                      {doableCount > 0 ? `${doableCount} faisable${doableCount > 1 ? 's' : ''}` : '100% cuisinable'}
                    </Text>
                  </TouchableOpacity>

                  {/* Carte Végétarien */}
                  <TouchableOpacity
                    style={[
                      styles.quickFilterCard,
                      draftOnlyVegetarian && styles.quickFilterCardVegeActive,
                    ]}
                    onPress={() => setDraftOnlyVegetarian((prev) => !prev)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.quickFilterHeader}>
                      <Ionicons
                        name={draftOnlyVegetarian ? 'leaf' : 'leaf-outline'}
                        size={18}
                        color={draftOnlyVegetarian ? '#FFFFFF' : (isDark ? '#4ADE80' : '#15803D')}
                      />
                      <Ionicons
                        name={draftOnlyVegetarian ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={draftOnlyVegetarian ? '#FFFFFF' : colors.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.quickFilterTitle,
                        draftOnlyVegetarian && styles.quickFilterTitleActive,
                      ]}
                    >
                      Végétarien
                    </Text>
                    <Text
                      style={[
                        styles.quickFilterSubtitle,
                        draftOnlyVegetarian && styles.quickFilterSubtitleActive,
                      ]}
                    >
                      Sans viande ni poisson
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECTION 2 : TEMPS TOTAL (4 PRESETS UNIVERSELS + RACCOURCIS FINS) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name={draftTimeFilterMode === 'min' ? 'flame-outline' : 'time-outline'}
                    size={17}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Temps total</Text>
                  {draftTargetTotalTime !== null ? (
                    <TouchableOpacity
                      onPress={handleClearTime}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.countBadge}
                    >
                      <Text style={styles.countBadgeText}>
                        {draftTimeFilterMode === 'min' ? '≥ ' : '≤ '}
                        {formatMinutes(draftTargetTotalTime)}
                      </Text>
                      <Ionicons name="close" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Illimité</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Préparation et cuisson cumulées.
                </Text>

                {/* 4 Grandes Cartes Presets Universels (Grille 2x2) */}
                <View style={styles.timeGrid}>
                  {TIME_PRESETS.map((preset) => {
                    const isSelected =
                      draftTargetTotalTime === preset.targetMinutes &&
                      draftTimeFilterMode === preset.mode;

                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[
                          styles.timeCard,
                          isSelected && styles.timeCardActive,
                        ]}
                        onPress={() => handleToggleTimePreset(preset.targetMinutes, preset.mode)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.timeCardHeader}>
                          <Ionicons
                            name={preset.icon}
                            size={18}
                            color={isSelected ? '#FFFFFF' : colors.primary}
                          />
                          <View
                            style={[
                              styles.timeCardBadge,
                              isSelected && styles.timeCardBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timeCardBadgeText,
                                isSelected && styles.timeCardBadgeTextActive,
                              ]}
                            >
                              {preset.badge}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.timeCardTitle,
                            isSelected && styles.timeCardTitleActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Raccourcis complémentaires fins */}
                <View style={styles.timeFinePresetsRow}>
                  {TIME_FINE_PRESETS.map((fine) => {
                    const isSelected =
                      draftTargetTotalTime === fine.value &&
                      draftTimeFilterMode === fine.mode;

                    return (
                      <TouchableOpacity
                        key={fine.label}
                        style={[
                          styles.timeFineChip,
                          isSelected && styles.timeFineChipActive,
                        ]}
                        onPress={() => handleToggleTimePreset(fine.value, fine.mode)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.timeFineChipText,
                            isSelected && styles.timeFineChipTextActive,
                          ]}
                        >
                          {fine.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {draftTargetTotalTime !== null && (
                    <TouchableOpacity
                      style={styles.timeClearChip}
                      onPress={handleClearTime}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.timeClearChipText}>Effacer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* SECTION 3 : NOTE MINIMALE */}
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

              {/* SECTION 4 : NIVEAU DE DIFFICULTÉ */}
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

              {/* SECTION 5 : INGRÉDIENTS SOUHAITÉS */}
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

                {/* Champ de saisie d'ingrédients unifié */}
                <UnifiedIngredientInput
                  containerStyle={{ zIndex: 99, marginBottom: 10 }}
                  placeholder="Ajouter un ingrédient (ex: Courgette, Tomate...)"
                  placeholderTextColor={colors.textMuted}
                  value={ingredientInputText}
                  onChangeText={setIngredientInputText}
                  context="search"
                  clearOnSelect
                  showSearchIcon
                  onSubmitEditing={() => handleAddIngredient(ingredientInputText)}
                  onSelectIngredient={(item) => handleAddIngredient(item.canonicalName)}
                />

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
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.removeChipBtn}
                            accessibilityLabel={`Retirer ${ing}`}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Règle de correspondance si au moins 2 ingrédients sélectionnés */}
                    {draftIngredients.length >= 2 && (
                      <View style={styles.matchModeContainer}>
                        <Text style={styles.matchModeLabel}>Critère de combinaison :</Text>
                        <View style={styles.matchModeSegmented}>
                          <TouchableOpacity
                            style={[
                              styles.matchModeBtn,
                              draftIngredientMatchMode === 'all' && styles.matchModeBtnActive,
                            ]}
                            onPress={() => setDraftIngredientMatchMode('all')}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="checkbox-outline"
                              size={13}
                              color={draftIngredientMatchMode === 'all' ? '#FFFFFF' : colors.textSecondary}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'all' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Tous ces ingrédients
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
                            <Ionicons
                              name="shuffle-outline"
                              size={13}
                              color={draftIngredientMatchMode === 'any' ? '#FFFFFF' : colors.textSecondary}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'any' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Au moins l’un d’eux
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.matchModeExplanation}>
                          {draftIngredientMatchMode === 'all'
                            ? 'La recette doit contenir l’ensemble de ces ingrédients.'
                            : 'La recette peut contenir n’importe lequel de ces ingrédients.'}
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

              {/* SECTION 6 : TAGS & ÉTIQUETTES */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pricetag-outline" size={17} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Tags & Étiquettes</Text>
                  {draftTags.length > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftTags.length}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Tous les tags</Text>
                  )}
                </View>
                <Text style={styles.sectionDescription}>
                  Filtrez les recettes selon vos étiquettes personnalisées.
                </Text>

                {availableTags.length === 0 ? (
                  <View style={styles.emptyTagsNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.emptyTagsNoticeText}>
                      Aucune étiquette n’est encore associée à vos recettes.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.tagsWrap}>
                      {availableTags.map((tag) => {
                        const isSelected = draftTags.some((t) => t.toLowerCase() === tag.toLowerCase());
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[styles.tagFilterChip, isSelected && styles.tagFilterChipActive]}
                            onPress={() => handleToggleTag(tag)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark' : 'pricetag-outline'}
                              size={13}
                              color={isSelected ? '#FFFFFF' : colors.primary}
                              style={{ marginRight: 5 }}
                            />
                            <Text
                              style={[
                                styles.tagFilterChipText,
                                isSelected && styles.tagFilterChipTextActive,
                              ]}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {draftTags.length > 1 && (
                      <View style={styles.tagMatchModeBox}>
                        <View style={styles.matchModeSegmented}>
                          <TouchableOpacity
                            style={[
                              styles.matchModeBtn,
                              draftTagMatchMode === 'any' && styles.matchModeBtnActive,
                            ]}
                            onPress={() => setDraftTagMatchMode('any')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftTagMatchMode === 'any' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Au moins une étiquette
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.matchModeBtn,
                              draftTagMatchMode === 'all' && styles.matchModeBtnActive,
                            ]}
                            onPress={() => setDraftTagMatchMode('all')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftTagMatchMode === 'all' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Toutes les étiquettes
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {draftTags.length > 0 && (
                      <TouchableOpacity
                        style={styles.tagsClearChip}
                        onPress={() => setDraftTags([])}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="close-circle-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.tagsClearChipText}>Désélectionner les tags</Text>
                      </TouchableOpacity>
                    )}
                  </>
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

                {/* Bouton Appliquer avec décompte temps réel & état désactivé sécurisé */}
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    matchingRecipesCount === 0 && styles.applyBtnDisabled,
                  ]}
                  onPress={handleApply}
                  disabled={matchingRecipesCount === 0}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>
                    {matchingRecipesCount === 0
                      ? '0 recette correspondante'
                      : matchingRecipesCount === 1
                      ? 'Voir 1 recette'
                      : `Voir les ${matchingRecipesCount} recettes`}
                  </Text>
                  {matchingRecipesCount > 0 && (
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  )}
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  /* Section 1 : En un coup d'œil */
  quickFiltersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickFilterCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 82,
    justifyContent: 'space-between',
  },
  quickFilterCardStockActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickFilterCardVegeActive: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  quickFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quickFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickFilterTitleActive: {
    color: '#FFFFFF',
  },
  quickFilterSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quickFilterSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  /* Section 2 : Presets Temps Universels */
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  timeCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 74,
    justifyContent: 'space-between',
  },
  timeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeCardBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeCardBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  timeCardBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  timeCardBadgeTextActive: {
    color: '#FFFFFF',
  },
  timeCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 6,
  },
  timeCardTitleActive: {
    color: '#FFFFFF',
  },
  timeFinePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  timeFineChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeFineChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeFineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeFineChipTextActive: {
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 'auto',
  },
  timeClearChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
    paddingRight: 6,
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
    width: 22,
    height: 22,
    borderRadius: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  matchModeBtnActive: {
    backgroundColor: colors.secondary,
  },
  matchModeBtnText: {
    fontSize: 12,
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
  /* Section Tags */
  emptyTagsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTagsNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  tagFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagFilterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tagFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tagMatchModeBox: {
    marginTop: 12,
  },
  tagsClearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  tagsClearChipText: {
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
  applyBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
    opacity: 0.6,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
}));
