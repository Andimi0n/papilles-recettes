import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { DayOfWeek, MealTime, PlannedMeal, WeeklyPlanMap } from '../types/planner';
import { MealLogEntry, MealLogMap, DayMealLogSummary } from '../types/mealLog';
import { StorageService } from '../services/storageService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { MealSlotPickerModal } from '../components/MealSlotPickerModal';
import { QuickMealLogModal } from '../components/QuickMealLogModal';
import {
  generateUniqueId,
  getLocalDateString,
  addDaysToDateString,
  formatMealLogDateFrench,
  getDayOfWeekFromDateString,
} from '../utils/helpers';

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
  initialTab?: 'journal' | 'planner';
}

export const MealPlannerScreen: React.FC<MealPlannerScreenProps> = ({
  recipes,
  onSelectRecipe,
  onNavigateToShoppingList,
  initialTab = 'journal',
}) => {
  const { isDark, colors } = useTheme();
  const [activeMainTab, setActiveMainTab] = useState<'journal' | 'planner'>(initialTab);

  // Synchronise si initialTab change
  useEffect(() => {
    if (initialTab) {
      setActiveMainTab(initialTab);
    }
  }, [initialTab]);

  // --- ÉTAT DU PLANNING HEBDOMADAIRE ---
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanMap>({});
  const [activeSlot, setActiveSlot] = useState<{
    day: DayOfWeek;
    mealTime: MealTime;
  } | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<DayOfWeek>('Lundi');
  const scrollViewRef = useRef<ScrollView>(null);
  const dayPositions = useRef<Record<string, number>>({});

  // --- ÉTAT DU SUIVI DES REPAS (JOURNAL) ---
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [mealLogs, setMealLogs] = useState<MealLogMap>({});
  const [recentDays, setRecentDays] = useState<DayMealLogSummary[]>([]);
  const [quickLogModal, setQuickLogModal] = useState<{
    visible: boolean;
    date: string;
    mealTime: MealTime;
    entry?: MealLogEntry | null;
  }>({
    visible: false,
    date: todayStr,
    mealTime: 'lunch',
    entry: null,
  });

  // Chargement du planning prévisionnel
  const loadPlan = useCallback(async () => {
    try {
      const data = await StorageService.getWeeklyPlan();
      setWeeklyPlan(data);
    } catch (e) {
      console.error('Erreur chargement planning:', e);
    }
  }, []);

  // Chargement du suivi des repas
  const loadMealLogs = useCallback(async () => {
    try {
      const [logs, history] = await Promise.all([
        StorageService.getMealLogs(),
        StorageService.getRecentDaysMealLogs(14),
      ]);
      setMealLogs(logs);
      setRecentDays(history);
    } catch (e) {
      console.error('Erreur chargement suivi repas:', e);
    }
  }, []);

  useEffect(() => {
    loadPlan();
    loadMealLogs();
  }, [loadPlan, loadMealLogs]);

  // Nombre de repas programmés au total (sur 14 créneaux)
  const plannedCount = useMemo(() => {
    return Object.values(weeklyPlan).filter(Boolean).length;
  }, [weeklyPlan]);

  // --- GESTION DU SUIVI DES REPAS (JOURNAL) ---
  const handleOpenQuickLog = (date: string, mealTime: MealTime) => {
    const slotKey = `${date}_${mealTime}`;
    const entry = mealLogs[slotKey] || null;
    setQuickLogModal({
      visible: true,
      date,
      mealTime,
      entry,
    });
  };

  const handleSaveMealLog = async (
    title: string,
    recipeId?: string,
    recipeImageUrl?: string,
    note?: string
  ) => {
    const { date, mealTime } = quickLogModal;
    try {
      const nextLogs = await StorageService.setMealLog(date, mealTime, {
        title,
        recipeId,
        recipeImageUrl,
        note,
      });
      setMealLogs(nextLogs);
      const history = await StorageService.getRecentDaysMealLogs(14);
      setRecentDays(history);
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer le repas.");
    }
  };

  const handleDeleteMealLog = async () => {
    const { date, mealTime } = quickLogModal;
    try {
      const nextLogs = await StorageService.setMealLog(date, mealTime, null);
      setMealLogs(nextLogs);
      const history = await StorageService.getRecentDaysMealLogs(14);
      setRecentDays(history);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer ce repas.');
    }
  };

  // Repas du jour sélectionné
  const currentDayOfWeek = useMemo(
    () => getDayOfWeekFromDateString(selectedDate),
    [selectedDate]
  );
  const selectedLunch = mealLogs[`${selectedDate}_lunch`];
  const selectedDinner = mealLogs[`${selectedDate}_dinner`];

  // Si une recette était programmée au planning pour ce jour
  const plannedLunchForDay = weeklyPlan[`${currentDayOfWeek}_lunch`];
  const plannedDinnerForDay = weeklyPlan[`${currentDayOfWeek}_dinner`];

  // --- GESTION DU PLANNING HEBDOMADAIRE ---
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
      {/* En-tête principal avec Switcher d'onglets (Suivi vs Menu) */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>
            {activeMainTab === 'journal' ? 'Suivi des Repas' : 'Menu de la Semaine'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeMainTab === 'journal'
              ? 'Ce que vous avez mangé midi & soir'
              : plannedCount === 0
              ? 'Aucun repas programmé'
              : `${plannedCount} sur 14 repas prévus`}
          </Text>
        </View>

        {activeMainTab === 'planner' && plannedCount > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClearWeek}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Switcher d'onglets au sommet */}
      <View style={styles.tabSwitcherWrapper}>
        <View style={styles.tabSwitcherContainer}>
          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeMainTab === 'journal' && styles.tabSwitcherBtnActive,
            ]}
            onPress={() => setActiveMainTab('journal')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeMainTab === 'journal' ? 'restaurant' : 'restaurant-outline'}
              size={15}
              color={activeMainTab === 'journal' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabSwitcherText,
                activeMainTab === 'journal' && styles.tabSwitcherTextActive,
              ]}
            >
              Suivi des repas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabSwitcherBtn,
              activeMainTab === 'planner' && styles.tabSwitcherBtnActive,
            ]}
            onPress={() => setActiveMainTab('planner')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeMainTab === 'planner' ? 'calendar' : 'calendar-outline'}
              size={15}
              color={activeMainTab === 'planner' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabSwitcherText,
                activeMainTab === 'planner' && styles.tabSwitcherTextActive,
              ]}
            >
              Menu de la semaine
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* VUE 1 : SUIVI DES REPAS (JOURNAL) */}
      {activeMainTab === 'journal' ? (
        <ScrollView
          style={styles.journalScroll}
          contentContainerStyle={styles.journalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Barre de navigation de date (Jour précédent / Date / Jour suivant) */}
          <View style={styles.dateNavCard}>
            <TouchableOpacity
              style={styles.dateNavArrow}
              onPress={() => setSelectedDate((prev) => addDaysToDateString(prev, -1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.dateNavCenter}>
              <View style={styles.dateNavLabelRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                <Text style={styles.dateNavTitle}>
                  {formatMealLogDateFrench(selectedDate)}
                </Text>
              </View>
              <Text style={styles.dateNavSubtitle}>
                {currentDayOfWeek} {selectedDate === todayStr ? '• Aujourd’hui' : ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dateNavArrow}
              onPress={() => setSelectedDate((prev) => addDaysToDateString(prev, 1))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Bouton pour revenir à Aujourd'hui si on consulte une autre date */}
          {selectedDate !== todayStr && (
            <TouchableOpacity
              style={styles.returnTodayBtn}
              onPress={() => setSelectedDate(todayStr)}
              activeOpacity={0.7}
            >
              <Ionicons name="today-outline" size={14} color={colors.primary} />
              <Text style={styles.returnTodayText}>Revenir à Aujourd'hui</Text>
            </TouchableOpacity>
          )}

          {/* Section : Ce que j'ai mangé sur cette journée */}
          <View style={styles.journalDayCardsSection}>
            {/* CARTE MIDI ☀️ */}
            <View style={styles.journalMealCard}>
              <View style={styles.journalMealHeader}>
                <View style={styles.journalMealTimeCol}>
                  <Text style={styles.journalMealEmoji}>☀️</Text>
                  <Text style={styles.journalMealTimeLabel}>Déjeuner (Midi)</Text>
                </View>
                {selectedLunch && (
                  <View style={styles.journalActionsRow}>
                    <TouchableOpacity
                      style={styles.journalActionIconBtn}
                      onPress={() => handleOpenQuickLog(selectedDate, 'lunch')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {selectedLunch ? (
                <TouchableOpacity
                  style={styles.journalFilledBox}
                  onPress={() => handleOpenQuickLog(selectedDate, 'lunch')}
                  activeOpacity={0.8}
                >
                  {selectedLunch.recipeImageUrl ? (
                    <Image
                      source={{ uri: selectedLunch.recipeImageUrl }}
                      style={styles.journalDishThumb}
                    />
                  ) : (
                    <View style={styles.journalDishPlaceholder}>
                      <Ionicons name="restaurant" size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.journalDishInfo}>
                    <Text style={styles.journalDishTitle}>{selectedLunch.title}</Text>
                    {selectedLunch.note ? (
                      <Text style={styles.journalDishNote}>{selectedLunch.note}</Text>
                    ) : null}
                    {selectedLunch.recipeId && (
                      <Text style={styles.journalLinkedBadge}>Recette du carnet</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.journalEmptyBox}
                  onPress={() => handleOpenQuickLog(selectedDate, 'lunch')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                  <View style={styles.journalEmptyTextCol}>
                    <Text style={styles.journalEmptyTitle}>Qu'avez-vous mangé ce midi ?</Text>
                    <Text style={styles.journalEmptySubtitle}>
                      {plannedLunchForDay?.recipeTitle
                        ? `Prévu : ${plannedLunchForDay.recipeTitle} (Toucher pour valider)`
                        : 'Saisie libre, resto, restes, ou plat cuisiné'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* CARTE SOIR 🌙 */}
            <View style={styles.journalMealCard}>
              <View style={styles.journalMealHeader}>
                <View style={styles.journalMealTimeCol}>
                  <Text style={styles.journalMealEmoji}>🌙</Text>
                  <Text style={styles.journalMealTimeLabel}>Dîner (Soir)</Text>
                </View>
                {selectedDinner && (
                  <View style={styles.journalActionsRow}>
                    <TouchableOpacity
                      style={styles.journalActionIconBtn}
                      onPress={() => handleOpenQuickLog(selectedDate, 'dinner')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {selectedDinner ? (
                <TouchableOpacity
                  style={styles.journalFilledBox}
                  onPress={() => handleOpenQuickLog(selectedDate, 'dinner')}
                  activeOpacity={0.8}
                >
                  {selectedDinner.recipeImageUrl ? (
                    <Image
                      source={{ uri: selectedDinner.recipeImageUrl }}
                      style={styles.journalDishThumb}
                    />
                  ) : (
                    <View style={styles.journalDishPlaceholder}>
                      <Ionicons name="restaurant" size={20} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.journalDishInfo}>
                    <Text style={styles.journalDishTitle}>{selectedDinner.title}</Text>
                    {selectedDinner.note ? (
                      <Text style={styles.journalDishNote}>{selectedDinner.note}</Text>
                    ) : null}
                    {selectedDinner.recipeId && (
                      <Text style={styles.journalLinkedBadge}>Recette du carnet</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.journalEmptyBox}
                  onPress={() => handleOpenQuickLog(selectedDate, 'dinner')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                  <View style={styles.journalEmptyTextCol}>
                    <Text style={styles.journalEmptyTitle}>Qu'avez-vous mangé ce soir ?</Text>
                    <Text style={styles.journalEmptySubtitle}>
                      {plannedDinnerForDay?.recipeTitle
                        ? `Prévu : ${plannedDinnerForDay.recipeTitle} (Toucher pour valider)`
                        : 'Saisie libre, resto, restes, ou plat cuisiné'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* HISTORIQUE RÉCENT (LES 14 DERNIERS JOURS) */}
          <View style={styles.historySection}>
            <View style={styles.historyHeaderRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.historyHeaderTitle}>Historique des derniers jours</Text>
            </View>

            {recentDays.map((dayItem) => {
              const isSelected = dayItem.date === selectedDate;
              const hasEntries = Boolean(dayItem.lunch || dayItem.dinner);

              return (
                <TouchableOpacity
                  key={dayItem.date}
                  style={[
                    styles.historyItemCard,
                    isSelected && styles.historyItemCardActive,
                  ]}
                  onPress={() => setSelectedDate(dayItem.date)}
                  activeOpacity={0.75}
                >
                  <View style={styles.historyDateCol}>
                    <Text style={[styles.historyDayName, isSelected && styles.historyTextActive]}>
                      {dayItem.dateLabel}
                    </Text>
                    <Text style={styles.historyDaySub}>{dayItem.dayOfWeek}</Text>
                  </View>

                  <View style={styles.historyMealsCol}>
                    <View style={styles.historyMealRow}>
                      <Text style={styles.historySlotEmoji}>☀️</Text>
                      <Text
                        style={[
                          styles.historyMealText,
                          !dayItem.lunch && styles.historyMealTextEmpty,
                        ]}
                        numberOfLines={1}
                      >
                        {dayItem.lunch ? dayItem.lunch.title : '—'}
                      </Text>
                    </View>

                    <View style={styles.historyMealRow}>
                      <Text style={styles.historySlotEmoji}>🌙</Text>
                      <Text
                        style={[
                          styles.historyMealText,
                          !dayItem.dinner && styles.historyMealTextEmpty,
                        ]}
                        numberOfLines={1}
                      >
                        {dayItem.dinner ? dayItem.dinner.title : '—'}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        /* VUE 2 : MENU PRÉVISIONNEL DE LA SEMAINE (PLANNING) */
        <View style={{ flex: 1 }}>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysTabContent}
            >
              {DAYS_OF_WEEK.map((day) => {
                const hasMeals =
                  Boolean(weeklyPlan[`${day}_lunch`]) || Boolean(weeklyPlan[`${day}_dinner`]);
                const isSel = selectedDayTab === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayTabPill, isSel && styles.dayTabPillActive]}
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
                            <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
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
                              <Ionicons name="remove" size={12} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.slotServingsText}>{lunchMeal.servings} p.</Text>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(day, 'lunch', 1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="add" size={12} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.slotActionsCol}>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleOpenPicker(day, 'lunch')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleRemoveMealFromSlot(day, 'lunch')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.slotEmptyBtn}
                        onPress={() => handleOpenPicker(day, 'lunch')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
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
                            <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
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
                              <Ionicons name="remove" size={12} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.slotServingsText}>{dinnerMeal.servings} p.</Text>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(day, 'dinner', 1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="add" size={12} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.slotActionsCol}>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleOpenPicker(day, 'dinner')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleRemoveMealFromSlot(day, 'dinner')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.slotEmptyBtn}
                        onPress={() => handleOpenPicker(day, 'dinner')}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        <Text style={styles.slotEmptyText}>Prévoir le dîner</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Modal de sélection de recette pour le planning prévisionnel */}
      <MealSlotPickerModal
        visible={Boolean(activeSlot)}
        day={activeSlot?.day || null}
        mealTime={activeSlot?.mealTime || null}
        recipes={recipes}
        currentMeal={
          activeSlot ? weeklyPlan[`${activeSlot.day}_${activeSlot.mealTime}`] : undefined
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

      {/* Modal de saisie rapide libre pour le suivi des repas (journal) */}
      <QuickMealLogModal
        visible={quickLogModal.visible}
        date={quickLogModal.date}
        mealTime={quickLogModal.mealTime}
        currentEntry={quickLogModal.entry}
        recipes={recipes}
        plannedMealTitle={
          quickLogModal.mealTime === 'lunch'
            ? plannedLunchForDay?.recipeTitle
            : plannedDinnerForDay?.recipeTitle
        }
        onSave={handleSaveMealLog}
        onDelete={quickLogModal.entry ? handleDeleteMealLog : undefined}
        onClose={() =>
          setQuickLogModal((prev) => ({ ...prev, visible: false, entry: null }))
        }
      />
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  tabSwitcherWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabSwitcherBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  tabSwitcherText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabSwitcherTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  journalScroll: {
    flex: 1,
  },
  journalContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  dateNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
    marginBottom: 10,
  },
  dateNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavCenter: {
    alignItems: 'center',
  },
  dateNavLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateNavSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  returnTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  returnTodayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  journalDayCardsSection: {
    gap: 12,
    marginBottom: 20,
  },
  journalMealCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  journalMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  journalMealTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalMealEmoji: {
    fontSize: 16,
  },
  journalMealTimeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  journalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journalActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalFilledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  journalDishThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  journalDishPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journalDishInfo: {
    flex: 1,
  },
  journalDishTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  journalDishNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  journalLinkedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  journalEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
    gap: 12,
  },
  journalEmptyTextCol: {
    flex: 1,
  },
  journalEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  journalEmptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historySection: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  historyItemCardActive: {
    backgroundColor: colors.primaryLight,
  },
  historyDateCol: {
    width: 95,
  },
  historyDayName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyTextActive: {
    color: colors.primary,
  },
  historyDaySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  historyMealsCol: {
    flex: 1,
    gap: 3,
  },
  historyMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySlotEmoji: {
    fontSize: 11,
  },
  historyMealText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  historyMealTextEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actionBannerWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    ...shadows.card,
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
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTabPillTextActive: {
    color: '#FFFFFF',
  },
  dayMealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
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
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dayBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  dayCountHint: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    marginTop: 1,
  },
  slotFilledCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  slotThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  slotThumbPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  slotServingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
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
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
    backgroundColor: colors.cardBackground,
  },
  slotEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
}));
