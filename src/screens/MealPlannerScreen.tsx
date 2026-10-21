import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { DayOfWeek, MealTime, PlannedMeal, WeeklyPlanMap } from '../types/planner';
import { StorageService } from '../services/storageService';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { MealSlotPickerModal } from '../components/MealSlotPickerModal';
import { generateUniqueId } from '../utils/helpers';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

interface MealPlannerScreenProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onNavigateToShoppingList: () => void;
}

export const MealPlannerScreen: React.FC<MealPlannerScreenProps> = ({
  recipes,
  onSelectRecipe,
  onNavigateToShoppingList,
}) => {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanMap>({});
  const [activeSlot, setActiveSlot] = useState<{
    day: DayOfWeek;
    mealTime: MealTime;
  } | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<DayOfWeek>('Lundi');
  const scrollViewRef = useRef<ScrollView>(null);
  const dayPositions = useRef<Record<string, number>>({});

  const loadPlan = useCallback(async () => {
    try {
      const data = await StorageService.getWeeklyPlan();
      setWeeklyPlan(data);
    } catch (e) {
      console.error('Erreur chargement planning:', e);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Nombre de repas programmés au total (sur 14 créneaux)
  const plannedCount = useMemo(() => {
    return Object.values(weeklyPlan).filter(Boolean).length;
  }, [weeklyPlan]);

  const handleOpenPicker = (day: DayOfWeek, mealTime: MealTime) => {
    setActiveSlot({ day, mealTime });
  };

  const handleSaveRecipeToSlot = async (recipe: Recipe, servings: number) => {
    if (!activeSlot) return;
    const { day, mealTime } = activeSlot;
    const meal: PlannedMeal = {
      id: generateUniqueId('plan_meal'),
      day,
      mealTime,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeImageUrl: recipe.imageUrl,
      servings,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(day, mealTime, meal);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de planifier cette recette.');
    } finally {
      setActiveSlot(null);
    }
  };

  const handleSaveCustomMealToSlot = async (title: string, servings: number) => {
    if (!activeSlot) return;
    const { day, mealTime } = activeSlot;
    const meal: PlannedMeal = {
      id: generateUniqueId('plan_custom'),
      day,
      mealTime,
      recipeTitle: title,
      servings,
      customNote: title,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(day, mealTime, meal);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de planifier ce repas.');
    } finally {
      setActiveSlot(null);
    }
  };

  const handleRemoveMealFromSlot = async (day: DayOfWeek, mealTime: MealTime) => {
    try {
      const nextPlan = await StorageService.setWeeklyMeal(day, mealTime, null);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer ce repas.');
    }
  };

  const handleUpdateServings = async (
    day: DayOfWeek,
    mealTime: MealTime,
    delta: number
  ) => {
    const slotKey = `${day}_${mealTime}`;
    const meal = weeklyPlan[slotKey];
    if (!meal) return;

    const newServings = Math.max(1, meal.servings + delta);
    const updatedMeal: PlannedMeal = {
      ...meal,
      servings: newServings,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(day, mealTime, updatedMeal);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      console.error('Erreur mise à jour portions:', e);
    }
  };

  const handleClearWeek = () => {
    if (plannedCount === 0) return;
    Alert.alert(
      'Réinitialiser le menu',
      'Êtes-vous sûr de vouloir effacer tous les repas prévus pour cette semaine ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer le menu',
          style: 'destructive',
          onPress: async () => {
            const nextPlan = await StorageService.clearWeeklyPlan();
            setWeeklyPlan(nextPlan);
          },
        },
      ]
    );
  };

  // Génération de la liste de courses
  const handleGenerateShoppingList = async () => {
    if (plannedCount === 0) {
      Alert.alert(
        'Aucun repas prévu',
        'Ajoutez des recettes à votre planning de la semaine avant de générer la liste de courses.'
      );
      return;
    }

    try {
      const { addedCount } = await StorageService.generateShoppingListFromWeeklyPlan(
        recipes,
        weeklyPlan
      );

      Alert.alert(
        '🛒 Liste de courses générée !',
        `${addedCount} ingrédient${addedCount > 1 ? 's ont été ajoutés et fusionnés' : ' a été ajouté'} à votre liste de courses pour vos ${plannedCount} repas planifiés.`,
        [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Voir la liste de courses',
            style: 'default',
            onPress: onNavigateToShoppingList,
          },
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer la liste de courses.');
    }
  };

  const scrollToDay = (day: DayOfWeek) => {
    setSelectedDayTab(day);
    const y = dayPositions.current[day];
    if (typeof y === 'number' && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* En-tête principal */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Menu de la Semaine</Text>
          <Text style={styles.headerSubtitle}>
            {plannedCount === 0
              ? 'Aucun repas programmé'
              : `${plannedCount} sur 14 repas prévus`}
          </Text>
        </View>

        {plannedCount > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearWeek}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Bouton phare : Générer la liste de courses de la semaine */}
      <View style={styles.actionBannerWrapper}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerateShoppingList}
          activeOpacity={0.88}
        >
          <View style={styles.generateIconCircle}>
            <Ionicons name="cart" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.generateTextCol}>
            <Text style={styles.generateBtnTitle}>Générer la liste de courses</Text>
            <Text style={styles.generateBtnSubtitle}>
              Fusionne tous les ingrédients de vos repas planifiés
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Navigation rapide par jour (Pills horizontaux) */}
      <View style={styles.daysTabStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysTabContent}>
          {DAYS_OF_WEEK.map((day) => {
            const hasMeals =
              Boolean(weeklyPlan[`${day}_lunch`]) || Boolean(weeklyPlan[`${day}_dinner`]);
            const isSel = selectedDayTab === day;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayTabPill,
                  isSel && styles.dayTabPillActive,
                ]}
                onPress={() => scrollToDay(day)}
              >
                <Text
                  style={[
                    styles.dayTabPillText,
                    isSel && styles.dayTabPillTextActive,
                  ]}
                >
                  {day.slice(0, 3)}
                </Text>
                {hasMeals && (
                  <View
                    style={[
                      styles.dayMealDot,
                      isSel && { backgroundColor: '#FFFFFF' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Calendrier complet défilant du Lundi au Dimanche */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.calendarScroll}
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        {DAYS_OF_WEEK.map((day) => {
          const lunchMeal = weeklyPlan[`${day}_lunch`];
          const dinnerMeal = weeklyPlan[`${day}_dinner`];

          return (
            <View
              key={day}
              style={styles.dayCard}
              onLayout={(e) => {
                dayPositions.current[day] = e.nativeEvent.layout.y;
              }}
            >
              {/* En-tête du jour */}
              <View style={styles.dayHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{day}</Text>
                </View>
                <Text style={styles.dayCountHint}>
                  {[lunchMeal ? 'Midi' : null, dinnerMeal ? 'Soir' : null]
                    .filter(Boolean)
                    .join(' • ') || 'Aucun repas'}
                </Text>
              </View>

              {/* Créneau 1 : Midi ☀️ */}
              <View style={styles.mealSlotRow}>
                <View style={styles.slotTimeBadge}>
                  <Text style={styles.slotTimeEmoji}>☀️</Text>
                  <Text style={styles.slotTimeLabel}>Midi</Text>
                </View>

                {lunchMeal ? (
                  <View style={styles.slotFilledCard}>
                    {lunchMeal.recipeImageUrl ? (
                      <Image
                        source={{ uri: lunchMeal.recipeImageUrl }}
                        style={styles.slotThumb}
                      />
                    ) : (
                      <View style={styles.slotThumbPlaceholder}>
                        <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.slotInfoCol}
                      onPress={() => {
                        if (lunchMeal.recipeId) {
                          const r = recipes.find((x) => x.id === lunchMeal.recipeId);
                          if (r) onSelectRecipe(r);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.slotMealTitle} numberOfLines={1}>
                        {lunchMeal.recipeTitle}
                      </Text>
                      <View style={styles.slotServingsStepper}>
                        <TouchableOpacity
                          style={styles.slotStepBtn}
                          onPress={() => handleUpdateServings(day, 'lunch', -1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="remove" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.slotServingsText}>{lunchMeal.servings} p.</Text>
                        <TouchableOpacity
                          style={styles.slotStepBtn}
                          onPress={() => handleUpdateServings(day, 'lunch', 1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="add" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.slotActionsCol}>
                      <TouchableOpacity
                        style={styles.slotIconBtn}
                        onPress={() => handleOpenPicker(day, 'lunch')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="swap-horizontal" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.slotIconBtn}
                        onPress={() => handleRemoveMealFromSlot(day, 'lunch')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.slotEmptyBtn}
                    onPress={() => handleOpenPicker(day, 'lunch')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.slotEmptyText}>Prévoir le déjeuner</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Créneau 2 : Soir 🌙 */}
              <View style={styles.mealSlotRow}>
                <View style={styles.slotTimeBadge}>
                  <Text style={styles.slotTimeEmoji}>🌙</Text>
                  <Text style={styles.slotTimeLabel}>Soir</Text>
                </View>

                {dinnerMeal ? (
                  <View style={styles.slotFilledCard}>
                    {dinnerMeal.recipeImageUrl ? (
                      <Image
                        source={{ uri: dinnerMeal.recipeImageUrl }}
                        style={styles.slotThumb}
                      />
                    ) : (
                      <View style={styles.slotThumbPlaceholder}>
                        <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.slotInfoCol}
                      onPress={() => {
                        if (dinnerMeal.recipeId) {
                          const r = recipes.find((x) => x.id === dinnerMeal.recipeId);
                          if (r) onSelectRecipe(r);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.slotMealTitle} numberOfLines={1}>
                        {dinnerMeal.recipeTitle}
                      </Text>
                      <View style={styles.slotServingsStepper}>
                        <TouchableOpacity
                          style={styles.slotStepBtn}
                          onPress={() => handleUpdateServings(day, 'dinner', -1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="remove" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.slotServingsText}>{dinnerMeal.servings} p.</Text>
                        <TouchableOpacity
                          style={styles.slotStepBtn}
                          onPress={() => handleUpdateServings(day, 'dinner', 1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="add" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.slotActionsCol}>
                      <TouchableOpacity
                        style={styles.slotIconBtn}
                        onPress={() => handleOpenPicker(day, 'dinner')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="swap-horizontal" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.slotIconBtn}
                        onPress={() => handleRemoveMealFromSlot(day, 'dinner')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.slotEmptyBtn}
                    onPress={() => handleOpenPicker(day, 'dinner')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.slotEmptyText}>Prévoir le dîner</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal de sélection de recette pour le créneau actif */}
      <MealSlotPickerModal
        visible={activeSlot !== null}
        day={activeSlot?.day || null}
        mealTime={activeSlot?.mealTime || null}
        recipes={recipes}
        currentMeal={
          activeSlot
            ? weeklyPlan[`${activeSlot.day}_${activeSlot.mealTime}`]
            : undefined
        }
        onSelectRecipe={handleSaveRecipeToSlot}
        onSelectCustomMeal={handleSaveCustomMealToSlot}
        onRemoveMeal={() => {
          if (activeSlot) {
            handleRemoveMealFromSlot(activeSlot.day, activeSlot.mealTime);
          }
        }}
        onClose={() => setActiveSlot(null)}
      />
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  actionBannerWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    ...Shadows.medium,
  },
  generateIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateTextCol: {
    flex: 1,
  },
  generateBtnTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  generateBtnSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 1,
  },
  daysTabStrip: {
    paddingVertical: 8,
  },
  daysTabContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayTabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayTabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dayTabPillTextActive: {
    color: '#FFFFFF',
  },
  dayMealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  dayCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dayBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  dayCountHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mealSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  slotTimeBadge: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTimeEmoji: {
    fontSize: 16,
  },
  slotTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  slotFilledCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  slotThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
  },
  slotThumbPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotInfoCol: {
    flex: 1,
    marginLeft: 10,
  },
  slotMealTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  slotServingsStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotStepBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotServingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    paddingHorizontal: 2,
  },
  slotActionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  slotIconBtn: {
    padding: 6,
  },
  slotEmptyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.cardBackground,
  },
  slotEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
}));
