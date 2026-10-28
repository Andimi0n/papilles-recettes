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
  color: string;
  targetMinutes: number;
  mode: TimeFilterMode;
}

const TIME_PRESETS: TimePreset[] = [
  {
    id: 'express',
    label: 'Express',
    badge: '≤ 20 min',
    icon: 'flash',
    color: '#F59E0B',
    targetMinutes: 20,
    mode: 'max',
  },
  {
    id: 'daily',
    label: 'Quotidien',
    badge: '≤ 40 min',
    icon: 'time',
    color: '#10B981',
    targetMinutes: 40,
    mode: 'max',
  },
  {
    id: 'comfort',
    label: 'Confort',
    badge: '≤ 1 h',
    icon: 'restaurant',
    color: '#0284C7',
    targetMinutes: 60,
    mode: 'max',
  },
  {
    id: 'slow',
    label: 'Mijoté',
    badge: '≥ 1 h',
    icon: 'flame',
    color: '#EF4444',
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
  color: string;
}[] = [
  { level: 'Facile', label: 'Facile', icon: 'leaf', color: '#10B981' },
  { level: 'Moyen', label: 'Moyen', icon: 'flame', color: '#F59E0B' },
  { level: 'Difficile', label: 'Difficile', icon: 'trophy', color: '#EF4444' },
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
  const { colors } = useTheme();

  // Initialisation sécurisée du temps cible avec prise en compte de maxTotalTime en secours
  const initialTime = targetTotalTime !== undefined ? targetTotalTime : (maxTotalTime !== undefined ? maxTotalTime : null);

  // États locaux de brouillon (draft) pour ajuster les filtres avant application
  const [draftTargetTotalTime, setDraftTargetTotalTime] = useState<number | null>(initialTime);
  const [draftTimeFilterMode, setDraftTimeFilterMode] = useState<TimeFilterMode>(timeFilterMode || 'max');

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
      if (prev.includes(diff)) {
        return [];
      }
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

    // Filtre végétarien (issu des filtres accueil)
    if (onlyVegetarian) {
      result = result.filter((r) => r.isVegetarian);
    }

    // Filtre stock (recettes 100% faisables, issu des filtres accueil)
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
    onlyVegetarian,
    onlyDoableWithStock,
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
                  <Ionicons name="options-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Filtres avancés</Text>
                  <Text style={styles.headerSubtitle}>
                    Personnalisez vos critères de recherche
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
                accessibilityLabel="Fermer les filtres avancés"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contenu déroulant compact des sections de filtrage */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION 1 : TEMPS TOTAL (4 PRESETS UNIVERSELS + RACCOURCIS FINS) */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons
                      name={draftTimeFilterMode === 'min' ? 'flame' : 'time'}
                      size={13}
                      color={colors.primary}
                    />
                  </View>
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
                      <Ionicons name="close" size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Illimité</Text>
                  )}
                </View>

                {/* 4 Grandes Cartes Presets Universels compactes (Grille 2x2) */}
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
                        <Ionicons
                          name={preset.icon}
                          size={16}
                          color={isSelected ? '#FFFFFF' : preset.color}
                        />
                        <Text
                          style={[
                            styles.timeCardTitle,
                            isSelected && styles.textWhite,
                          ]}
                          numberOfLines={1}
                        >
                          {preset.label}
                        </Text>
                        <View
                          style={[
                            styles.timeCardBadge,
                            isSelected && styles.timeCardBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeCardBadgeText,
                              isSelected && styles.textWhite,
                            ]}
                          >
                            {preset.badge}
                          </Text>
                        </View>
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
                            isSelected && styles.textWhite,
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

              {/* SECTION 2 : NOTE MINIMALE */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBadge, { backgroundColor: colors.amberLight }]}>
                    <Ionicons name="star" size={13} color={colors.amber} />
                  </View>
                  <Text style={styles.sectionTitle}>Note minimale</Text>
                  {draftMinRating > 0 ? (
                    <View style={[styles.countBadge, { backgroundColor: colors.amber }]}>
                      <Text style={styles.countBadgeText}>
                        {`≥ ${draftMinRating % 1 === 0 ? draftMinRating : draftMinRating.toFixed(1)} ★`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Toutes les notes</Text>
                  )}
                </View>

                <View style={styles.ratingCompactBox}>
                  <View style={styles.ratingStarsRow}>
                    <StarRating
                      rating={draftMinRating}
                      size={24}
                      interactive
                      onRatingChange={(newVal) => setDraftMinRating(newVal)}
                      showClear={false}
                      showScore={false}
                    />
                    <Text style={styles.ratingScorePill}>
                      {draftMinRating > 0
                        ? `≥ ${draftMinRating % 1 === 0 ? draftMinRating : draftMinRating.toFixed(1)} étoiles`
                        : 'Toutes les notes'}
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
                          style={[
                            styles.ratingPresetChip,
                            isSelected && styles.ratingPresetChipActive,
                          ]}
                          onPress={() => setDraftMinRating(isSelected && preset.value > 0 ? 0 : preset.value)}
                          activeOpacity={0.75}
                        >
                          {preset.value > 0 && (
                            <Ionicons
                              name="star"
                              size={11}
                              color={isSelected ? '#FFFFFF' : colors.amber}
                              style={{ marginRight: 3 }}
                            />
                          )}
                          <Text
                            style={[
                              styles.ratingPresetChipText,
                              isSelected && styles.textWhite,
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* SECTION 3 : NIVEAU DE DIFFICULTÉ */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="bar-chart-outline" size={13} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Niveau de difficulté</Text>
                  {draftDifficulties.length > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftDifficulties[0]}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Toutes</Text>
                  )}
                </View>

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
                          color={isSelected ? '#FFFFFF' : item.color}
                        />
                        <Text
                          style={[
                            styles.difficultyCardText,
                            isSelected && styles.textWhite,
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* SECTION 4 : INGRÉDIENTS SOUHAITÉS */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="nutrition-outline" size={13} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Ingrédients souhaités</Text>
                  {draftIngredients.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftIngredients.length}</Text>
                    </View>
                  )}
                </View>

                {/* Champ de saisie d'ingrédients unifié */}
                <UnifiedIngredientInput
                  containerStyle={{ zIndex: 99, marginBottom: 8 }}
                  placeholder="Ajouter un ingrédient (ex: Courgette...)"
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
                    <View style={styles.selectedIngredientsWrap}>
                      {draftIngredients.map((ing) => (
                        <View key={ing} style={styles.selectedIngredientChip}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          <Text style={styles.selectedIngredientChipText}>{ing}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveIngredient(ing)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.removeChipBtn}
                            accessibilityLabel={`Retirer ${ing}`}
                          >
                            <Ionicons name="close" size={13} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Règle de correspondance si au moins 2 ingrédients sélectionnés */}
                    {draftIngredients.length >= 2 && (
                      <View style={styles.matchModeContainer}>
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
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'all' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Tous les ingrédients
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
                              style={{ marginRight: 4 }}
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
                      </View>
                    )}
                  </View>
                ) : (
                  /* Suggestions d'ingrédients populaires rapides en 1 clic */
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
                          <Ionicons name="add" size={13} color={colors.primary} style={{ marginRight: 2 }} />
                          <Text style={styles.popularChipText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* SECTION 5 : TAGS & ÉTIQUETTES */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="nutrition-outline" size={13} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Ingrédients souhaités</Text>
                  {draftIngredients.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftIngredients.length}</Text>
                    </View>
                  )}
                </View>

                {/* Champ de saisie d'ingrédients unifié */}
                <UnifiedIngredientInput
                  containerStyle={{ zIndex: 99, marginBottom: 8 }}
                  placeholder="Ajouter un ingrédient (ex: Courgette...)"
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
                    <View style={styles.selectedIngredientsWrap}>
                      {draftIngredients.map((ing) => (
                        <View key={ing} style={styles.selectedIngredientChip}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          <Text style={styles.selectedIngredientChipText}>{ing}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveIngredient(ing)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.removeChipBtn}
                            accessibilityLabel={`Retirer ${ing}`}
                          >
                            <Ionicons name="close" size={13} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Règle de correspondance si au moins 2 ingrédients sélectionnés */}
                    {draftIngredients.length >= 2 && (
                      <View style={styles.matchModeContainer}>
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
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.matchModeBtnText,
                                draftIngredientMatchMode === 'all' && styles.matchModeBtnTextActive,
                              ]}
                            >
                              Tous les ingrédients
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
                              style={{ marginRight: 4 }}
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
                      </View>
                    )}
                  </View>
                ) : (
                  /* Suggestions d'ingrédients populaires rapides en 1 clic */
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
                          <Ionicons name="add" size={13} color={colors.primary} style={{ marginRight: 2 }} />
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
                  <View style={styles.sectionIconBadge}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Tags & Étiquettes</Text>
                  {draftTags.length > 0 ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{draftTags.length}</Text>
                    </View>
                  ) : (
                    <Text style={styles.sectionHeaderHint}>Tous les tags</Text>
                  )}
                </View>

                {availableTags.length === 0 ? (
                  <View style={styles.emptyTagsNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
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
                            style={[
                              styles.tagFilterChip,
                              isSelected && styles.tagFilterChipActive,
                            ]}
                            onPress={() => handleToggleTag(tag)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark' : 'pricetag-outline'}
                              size={12}
                              color={isSelected ? '#FFFFFF' : colors.primary}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.tagFilterChipText,
                                isSelected && styles.textWhite,
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
                              Au moins un tag
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
                              Tous les tags
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
                        <Ionicons name="close-circle-outline" size={13} color={colors.textSecondary} />
                        <Text style={styles.tagsClearChipText}>Désélectionner les tags</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            {/* BARRE D'ACTIONS INFÉRIEURE (FIXE & COMPACTE) */}
            <SafeAreaView edges={['bottom']} style={styles.footerSafeArea}>
              <View style={styles.footerRow}>
                {/* Réinitialiser */}
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={handleResetDrafts}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
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
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
    maxHeight: '94%',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    maxHeight: '100%',
    ...shadows.large,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
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
    maxHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderHint: {
    marginLeft: 'auto',
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  textWhite: {
    color: '#FFFFFF',
  },

  /* Section 1 : Presets Temps Universels */
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  timeCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 44,
  },
  timeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  timeCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginLeft: 6,
    marginRight: 4,
  },
  timeFinePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  timeFineChip: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeFineChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeFineChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeClearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 'auto',
  },
  timeClearChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Section 2 : Note minimale */
  ratingCompactBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingScorePill: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.amber,
  },
  ratingPresetsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  ratingPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingPresetChipActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  ratingPresetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Section 3 : Difficulté */
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  difficultyCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  difficultyCardText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  /* Section 4 : Ingrédients */
  selectedIngredientsContainer: {
    marginTop: 4,
  },
  selectedIngredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedIngredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingLeft: 9,
    paddingRight: 6,
    paddingVertical: 4.5,
    borderRadius: 14,
    ...shadows.card,
  },
  selectedIngredientChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removeChipBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchModeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  matchModeSegmented: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 2.5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  matchModeBtnActive: {
    backgroundColor: colors.primary,
  },
  matchModeBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  matchModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  popularSuggestionsContainer: {
    marginTop: 4,
  },
  popularLabel: {
    fontSize: 11,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  /* Section 5 : Tags */
  emptyTagsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTagsNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagFilterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tagMatchModeBox: {
    marginTop: 8,
  },
  tagsClearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  tagsClearChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* Barre d'actions inférieure */
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
    paddingVertical: 10,
    gap: 10,
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
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
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
    fontSize: 13.5,
    fontWeight: '700',
  },
}));
