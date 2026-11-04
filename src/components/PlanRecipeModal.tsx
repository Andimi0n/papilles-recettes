import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import {
  MealTime,
  PlannedMeal,
  WeeklyPlanMap,
  PlannerSettings,
  DEFAULT_PLANNER_SETTINGS,
} from '../types/planner';
import { StorageService } from '../services/storageService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  getLocalDateString,
  addDaysToDateString,
  getDayOfWeekFromDateString,
  formatShortDateFrench,
  generateUniqueId,
} from '../utils/helpers';

export interface PlanRecipeModalProps {
  visible: boolean;
  recipe: Recipe;
  initialServings: number;
  onClose: () => void;
  onNavigateToPlanner?: () => void;
}

interface DaySlotData {
  key: string;
  dateStr: string;
  dayName: string;
  mainLabel: string;
  dateLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  lunchKey: string;
  dinnerKey: string;
  lunchMeal?: PlannedMeal;
  dinnerMeal?: PlannedMeal;
}

export const PlanRecipeModal: React.FC<PlanRecipeModalProps> = ({
  visible,
  recipe,
  initialServings,
  onClose,
  onNavigateToPlanner,
}) => {
  const { colors } = useTheme();
  const [servings, setServings] = useState<number>(initialServings);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanMap>({});
  const [plannerSettings, setPlannerSettings] = useState<PlannerSettings>(DEFAULT_PLANNER_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Synchronise les portions actives dès l'ouverture du modal pendant le render
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible && !prevVisible) {
    setPrevVisible(true);
    setServings(initialServings);
    setIsLoading(true);
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  // Chargement du planning et des réglages
  useEffect(() => {
    let isCancelled = false;
    if (visible) {
      Promise.all([
        StorageService.getWeeklyPlan(),
        StorageService.getPlannerSettings(),
      ])
        .then(([plan, settings]) => {
          if (!isCancelled) {
            setWeeklyPlan(plan);
            setPlannerSettings(settings);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.error('Erreur chargement planning dans PlanRecipeModal:', err);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [visible]);

  // Grille des 7 prochains jours
  const daySlots: DaySlotData[] = useMemo(() => {
    const todayStr = getLocalDateString();
    const slots: DaySlotData[] = [];

    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysToDateString(todayStr, i);
      const dayName = getDayOfWeekFromDateString(dateStr);
      const dateLabel = formatShortDateFrench(dateStr);
      const isToday = i === 0;
      const isTomorrow = i === 1;

      let mainLabel: string;
      if (isToday) {
        mainLabel = "Aujourd'hui";
      } else if (isTomorrow) {
        mainLabel = 'Demain';
      } else {
        mainLabel = dayName;
      }

      const lunchKey =
        plannerSettings.mode === 'dynamic'
          ? `${dateStr}_lunch`
          : `${dayName}_lunch`;
      const dinnerKey =
        plannerSettings.mode === 'dynamic'
          ? `${dateStr}_dinner`
          : `${dayName}_dinner`;

      const lunchMeal =
        weeklyPlan[lunchKey] ||
        weeklyPlan[`${dateStr}_lunch`] ||
        weeklyPlan[`${dayName}_lunch`];
      const dinnerMeal =
        weeklyPlan[dinnerKey] ||
        weeklyPlan[`${dateStr}_dinner`] ||
        weeklyPlan[`${dayName}_dinner`];

      slots.push({
        key: `slot_${dateStr}_${i}`,
        dateStr,
        dayName,
        mainLabel,
        dateLabel,
        isToday,
        isTomorrow,
        lunchKey,
        dinnerKey,
        lunchMeal,
        dinnerMeal,
      });
    }

    return slots;
  }, [plannerSettings.mode, weeklyPlan]);

  const planMealForSlot = async (
    slot: DaySlotData,
    mealTime: MealTime,
    slotKey: string
  ) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const meal: PlannedMeal = {
        id: generateUniqueId('plan_meal'),
        day: slot.dayName,
        mealTime,
        date: slot.dateStr,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImageUrl: recipe.imageUrl,
        servings,
      };

      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, meal);
      setWeeklyPlan(nextPlan);

      const timeLabel = mealTime === 'lunch' ? 'midi' : 'soir';
      const dayLabel = slot.mainLabel.toLowerCase();

      Alert.alert(
        'Repas planifié !',
        `« ${recipe.title} » est au menu pour ${dayLabel} (${timeLabel}).`,
        [
          {
            text: 'OK',
            onPress: onClose,
          },
          ...(onNavigateToPlanner
            ? [
                {
                  text: 'Voir le planning',
                  onPress: () => {
                    onClose();
                    onNavigateToPlanner();
                  },
                },
              ]
            : []),
        ]
      );
    } catch (err) {
      console.error('Erreur lors de la planification du repas:', err);
      Alert.alert('Erreur', "Impossible d'ajouter ce repas au planning.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSlotPress = (slot: DaySlotData, mealTime: MealTime) => {
    const existingMeal = mealTime === 'lunch' ? slot.lunchMeal : slot.dinnerMeal;
    const slotKey = mealTime === 'lunch' ? slot.lunchKey : slot.dinnerKey;

    if (existingMeal) {
      const isSameRecipe = existingMeal.recipeId === recipe.id;
      const existingTitle =
        existingMeal.recipeTitle || existingMeal.customNote || 'ce repas';

      if (isSameRecipe) {
        Alert.alert(
          'Mettre à jour ce créneau ?',
          `« ${recipe.title} » est déjà au menu (${existingMeal.servings} pers.). Mettre à jour avec ${servings} pers. ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Mettre à jour',
              onPress: () => planMealForSlot(slot, mealTime, slotKey),
            },
          ]
        );
      } else {
        Alert.alert(
          'Remplacer le repas ?',
          `Remplacer « ${existingTitle} » par « ${recipe.title} » ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Remplacer',
              style: 'destructive',
              onPress: () => planMealForSlot(slot, mealTime, slotKey),
            },
          ]
        );
      }
    } else {
      planMealForSlot(slot, mealTime, slotKey);
    }
  };

  const renderSlotChip = (
    slot: DaySlotData,
    mealTime: MealTime,
    meal?: PlannedMeal
  ) => {
    const isLunch = mealTime === 'lunch';
    const label = isLunch ? 'Midi' : 'Soir';
    const icon = isLunch ? 'sunny-outline' : 'moon-outline';
    const isOccupied = !!meal;
    const isCurrentRecipe = meal?.recipeId === recipe.id;

    return (
      <TouchableOpacity
        style={[
          styles.slotChip,
          isOccupied ? styles.slotChipOccupied : styles.slotChipEmpty,
        ]}
        onPress={() => handleSlotPress(slot, mealTime)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${slot.mainLabel} : ${
          isOccupied ? meal?.recipeTitle : 'créneau libre, appuyer pour ajouter'
        }`}
      >
        <View style={styles.slotChipHeader}>
          <View style={styles.slotChipTimeRow}>
            <Ionicons
              name={icon}
              size={13}
              color={isOccupied ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.slotChipTimeText,
                isOccupied && styles.slotChipTimeTextOccupied,
              ]}
            >
              {label}
            </Text>
          </View>

          {isOccupied ? (
            <View style={styles.occupiedBadge}>
              <Text style={styles.occupiedBadgeText}>
                {meal?.servings ? `${meal.servings}p` : 'Prévu'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyAddBadge}>
              <Ionicons name="add" size={13} color={colors.primary} />
            </View>
          )}
        </View>

        {isOccupied ? (
          <View style={styles.occupiedContentBox}>
            <Text
              style={[
                styles.occupiedRecipeTitle,
                isCurrentRecipe && styles.occupiedCurrentRecipeTitle,
              ]}
              numberOfLines={1}
            >
              {meal?.recipeTitle || meal?.customNote}
            </Text>
            <Text style={styles.replaceHintText} numberOfLines={1}>
              {isCurrentRecipe ? 'Mettre à jour' : 'Remplacer'}
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContentBox}>
            <Text style={styles.emptySlotText}>+ Ajouter</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* En-tête de la modale */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View>
              <Text style={styles.headerTitle}>Ajouter au menu</Text>
              <Text style={styles.headerSubtitle}>
                Choisissez un créneau pour les 7 prochains jours
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fermer la fenêtre d'ajout au menu"
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Récapitulatif de la recette & Portions actives */}
        <View style={styles.recipeSummaryCard}>
          {recipe.imageUrl ? (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.recipeThumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.recipeThumbnailPlaceholder}>
              <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
            </View>
          )}

          <View style={styles.recipeInfoBox}>
            <Text style={styles.recipeTitle} numberOfLines={1}>
              {recipe.title}
            </Text>

            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>Convives prévus :</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServings((prev) => Math.max(1, prev - 1))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Diminuer les portions"
                >
                  <Ionicons name="remove" size={14} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <Ionicons name="people" size={13} color={colors.primary} />
                  <Text style={styles.stepperValueText}>{servings} pers.</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServings((prev) => Math.min(50, prev + 1))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Augmenter les portions"
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Grille des 7 jours */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement du planning...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionSubtitle}>Créneaux des 7 prochains jours</Text>

            {daySlots.map((slot) => (
              <View key={slot.key} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayHeaderLeft}>
                    <View
                      style={[
                        styles.dayBadge,
                        slot.isToday && styles.dayBadgeToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayBadgeText,
                          slot.isToday && styles.dayBadgeTextToday,
                        ]}
                      >
                        {slot.mainLabel}
                      </Text>
                    </View>
                    <Text style={styles.dayDateText}>• {slot.dateLabel}</Text>
                  </View>

                  <Text style={styles.dayOccupiedCount}>
                    {[slot.lunchMeal ? 'Midi' : null, slot.dinnerMeal ? 'Soir' : null]
                      .filter(Boolean)
                      .join(' • ') || 'Libre'}
                  </Text>
                </View>

                <View style={styles.slotsRow}>
                  {renderSlotChip(slot, 'lunch', slot.lunchMeal)}
                  {renderSlotChip(slot, 'dinner', slot.dinnerMeal)}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  recipeSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 12,
    ...shadows.card,
  },
  recipeThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  recipeThumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeInfoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  stepperValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  stepperValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginLeft: 2,
  },
  dayCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayBadgeToday: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary + '50',
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayBadgeTextToday: {
    color: colors.primary,
  },
  dayDateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayOccupiedCount: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotChip: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 64,
    justifyContent: 'space-between',
  },
  slotChipEmpty: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
  },
  slotChipOccupied: {
    backgroundColor: colors.primaryLight + '50',
    borderWidth: 1,
    borderColor: colors.primary + '60',
  },
  slotChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotChipTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotChipTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  slotChipTimeTextOccupied: {
    color: colors.primaryDark,
  },
  occupiedBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  occupiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyAddBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  occupiedContentBox: {
    marginTop: 2,
  },
  occupiedRecipeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  occupiedCurrentRecipeTitle: {
    color: colors.primary,
  },
  replaceHintText: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyContentBox: {
    marginTop: 4,
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
}));
