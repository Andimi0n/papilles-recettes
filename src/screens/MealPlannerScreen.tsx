import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import {
  DayOfWeek,
  MealTime,
  PlannedMeal,
  WeeklyPlanMap,
  PlannerSettings,
  PlannerMode,
  DEFAULT_PLANNER_SETTINGS,
} from '../types/planner';
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
  formatShortDateFrench,
  getDayOfWeekFromDateString,
  getPlannerDaySlots,
  PlannerDaySlot,
  ORDERED_DAYS_OF_WEEK,
} from '../utils/helpers';


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
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab && prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveMainTab(initialTab);
  }

  // --- ÉTAT DU PLANNING HEBDOMADAIRE & RÉGLAGES ---
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanMap>({});
  const [plannerSettings, setPlannerSettings] = useState<PlannerSettings>(DEFAULT_PLANNER_SETTINGS);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{
    slotKey: string;
    dayLabel: string;
    dayName: DayOfWeek;
    dateStr?: string;
    mealTime: MealTime;
    isPassed?: boolean;
  } | null>(null);
  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);

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

  // Chargement du planning prévisionnel et des réglages de planification
  const loadPlan = useCallback(async () => {
    try {
      const [data, settings] = await Promise.all([
        StorageService.getWeeklyPlan(),
        StorageService.getPlannerSettings(),
      ]);
      setWeeklyPlan(data);
      setPlannerSettings(settings);
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
    void (async () => {
      await loadPlan();
      await loadMealLogs();
    })();
  }, [loadPlan, loadMealLogs]);

  // Génération des 7 créneaux journaliers (Fixe ou Dynamique)
  const daySlots: PlannerDaySlot[] = useMemo(() => {
    return getPlannerDaySlots(plannerSettings.mode, plannerSettings.startDay);
  }, [plannerSettings.mode, plannerSettings.startDay]);

  // Détection du prochain repas en mode dynamique
  const nextUpcomingSlotKey = useMemo(() => {
    if (plannerSettings.mode !== 'dynamic') return null;
    for (const slot of daySlots) {
      if (!slot.isLunchPassed) {
        return slot.lunchKey;
      }
      if (!slot.isDinnerPassed) {
        return slot.dinnerKey;
      }
    }
    return null;
  }, [plannerSettings.mode, daySlots]);

  // Nombre de repas programmés au total dans la période active (sur 14 créneaux)
  const plannedCount = useMemo(() => {
    return daySlots.reduce((count, slot) => {
      return count + (weeklyPlan[slot.lunchKey] ? 1 : 0) + (weeklyPlan[slot.dinnerKey] ? 1 : 0);
    }, 0);
  }, [weeklyPlan, daySlots]);

  // Gestion des changements de réglages depuis le modal rapide
  const handleChangeMode = async (mode: PlannerMode) => {
    try {
      const updated = await StorageService.savePlannerSettings({ mode });
      setPlannerSettings(updated);
    } catch (e) {
      console.error('Erreur changement mode:', e);
    }
  };

  const handleChangeStartDay = async (startDay: DayOfWeek) => {
    try {
      const updated = await StorageService.savePlannerSettings({ startDay });
      setPlannerSettings(updated);
    } catch (e) {
      console.error('Erreur changement jour début:', e);
    }
  };

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

  // Si une recette était programmée au planning pour ce jour (compatible mode dynamique et fixe)
  const plannedLunchForDay = weeklyPlan[`${selectedDate}_lunch`] || weeklyPlan[`${currentDayOfWeek}_lunch`];
  const plannedDinnerForDay = weeklyPlan[`${selectedDate}_dinner`] || weeklyPlan[`${currentDayOfWeek}_dinner`];

  // --- GESTION DU PLANNING HEBDOMADAIRE ---
  const handleOpenPicker = (
    slotKey: string,
    dayLabel: string,
    dayName: DayOfWeek,
    mealTime: MealTime,
    isPassed?: boolean,
    dateStr?: string
  ) => {
    setActiveSlot({
      slotKey,
      dayLabel,
      dayName,
      mealTime,
      isPassed,
      dateStr,
    });
  };

  const handleSaveRecipeToSlot = async (recipe: Recipe, servings: number) => {
    if (!activeSlot) return;
    const { slotKey, dayName, mealTime, dateStr } = activeSlot;
    const meal: PlannedMeal = {
      id: generateUniqueId('plan_meal'),
      day: dayName,
      mealTime,
      date: dateStr,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeImageUrl: recipe.imageUrl,
      servings,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, meal);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de planifier cette recette.');
    } finally {
      setActiveSlot(null);
    }
  };

  const handleSaveCustomMealToSlot = async (title: string, servings: number) => {
    if (!activeSlot) return;
    const { slotKey, dayName, mealTime, dateStr } = activeSlot;
    const meal: PlannedMeal = {
      id: generateUniqueId('plan_custom'),
      day: dayName,
      mealTime,
      date: dateStr,
      recipeTitle: title,
      servings,
      customNote: title,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, meal);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de planifier ce repas.');
    } finally {
      setActiveSlot(null);
    }
  };

  const handleRemoveMealFromSlot = async (slotKey: string, mealTime: MealTime) => {
    try {
      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, null);
      setWeeklyPlan(nextPlan);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de supprimer ce repas.');
    }
  };

  const handleUpdateServings = async (
    slotKey: string,
    mealTime: MealTime,
    delta: number
  ) => {
    const meal = weeklyPlan[slotKey];
    if (!meal) return;

    const newServings = Math.max(1, meal.servings + delta);
    const updatedMeal: PlannedMeal = {
      ...meal,
      servings: newServings,
    };

    try {
      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, updatedMeal);
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
            const keysToClear = daySlots.flatMap((s) => [s.lunchKey, s.dinnerKey]);
            const nextPlan = await StorageService.clearWeeklyPlan(keysToClear);
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
        'Ajoutez des recettes à votre planning avant de générer la liste de courses.'
      );
      return;
    }

    try {
      const keys = daySlots.flatMap((s) => [s.lunchKey, s.dinnerKey]);
      const { addedCount } = await StorageService.generateShoppingListFromWeeklyPlan(
        recipes,
        weeklyPlan,
        keys
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
              <Text style={styles.returnTodayText}>Revenir à Aujourd’hui</Text>
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
                    <Text style={styles.journalEmptyTitle}>Qu’avez-vous mangé ce midi ?</Text>
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
                    <Text style={styles.journalEmptyTitle}>Qu’avez-vous mangé ce soir ?</Text>
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
        <ScrollView
          ref={scrollViewRef}
          style={styles.calendarScroll}
          contentContainerStyle={styles.calendarContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Barre d'état du mode de planification & Bouton Options rapide */}
          <View style={styles.modeBar}>
            <View style={styles.modeIndicator}>
              <Ionicons
                name={plannerSettings.mode === 'dynamic' ? 'flash' : 'calendar'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.modeIndicatorText}>
                {plannerSettings.mode === 'dynamic'
                  ? 'Planning Dynamique (dès aujourd’hui)'
                  : `Planning Fixe (${plannerSettings.startDay} à ${
                      ORDERED_DAYS_OF_WEEK[
                        (ORDERED_DAYS_OF_WEEK.indexOf(plannerSettings.startDay) + 6) % 7
                      ]
                    })`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modeSwitchBtn}
              onPress={() => setIsConfigModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={13} color={colors.primary} />
              <Text style={styles.modeSwitchBtnText}>Options</Text>
            </TouchableOpacity>
          </View>

          {/* Bouton phare : Générer la liste de courses de la semaine (scrollable) */}
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

          {/* Calendrier complet défilant des 7 jours */}
          {daySlots.map((slot) => {
            const lunchMeal = weeklyPlan[slot.lunchKey];
            const dinnerMeal = weeklyPlan[slot.dinnerKey];

            const isLunchPassed = slot.isLunchPassed;
            const isDinnerPassed = slot.isDinnerPassed;

            const isLunchNext = nextUpcomingSlotKey === slot.lunchKey;
            const isDinnerNext = nextUpcomingSlotKey === slot.dinnerKey;

            return (
              <View
                key={slot.key}
                style={styles.dayCard}
              >
                  {/* En-tête du jour */}
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <View
                        style={[
                          styles.dayBadge,
                          plannerSettings.mode === 'dynamic' &&
                            slot.isToday &&
                            styles.dayBadgeToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayBadgeText,
                            plannerSettings.mode === 'dynamic' &&
                              slot.isToday &&
                              styles.dayBadgeTextToday,
                          ]}
                        >
                          {slot.mainLabel}
                        </Text>
                      </View>
                      {slot.dateLabel && (
                        <Text style={styles.dayDateText}>• {slot.dateLabel}</Text>
                      )}
                    </View>

                    <Text style={styles.dayCountHint}>
                      {[lunchMeal ? 'Midi' : null, dinnerMeal ? 'Soir' : null]
                        .filter(Boolean)
                        .join(' • ') || 'Aucun repas'}
                    </Text>
                  </View>

                  {/* Créneau 1 : Midi ☀️ */}
                  {lunchMeal ? (
                    <View
                      style={[
                        styles.mealSlotRow,
                        isLunchPassed && styles.slotPassedWrapper,
                      ]}
                    >
                      <View style={styles.slotTimeBadge}>
                        <Text style={styles.slotTimeEmoji}>☀️</Text>
                        <Text style={styles.slotTimeLabel}>Midi</Text>
                        {isLunchPassed && (
                          <View style={styles.passedPillBadge}>
                            <Text style={styles.passedPillText} numberOfLines={1}>Passé</Text>
                          </View>
                        )}
                        {isLunchNext && (
                          <View style={styles.nextPillBadge}>
                            <Text style={styles.nextPillText} numberOfLines={1}>Proch.</Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={[
                          styles.slotFilledCard,
                          isLunchPassed && styles.slotFilledCardPassed,
                          isLunchNext && styles.slotCardNextHighlight,
                        ]}
                      >
                        {lunchMeal.recipeImageUrl ? (
                          <Image
                            source={{ uri: lunchMeal.recipeImageUrl }}
                            style={[
                              styles.slotThumb,
                              isLunchPassed && styles.slotThumbPassed,
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.slotThumbPlaceholder,
                              isLunchPassed && styles.slotThumbPassed,
                            ]}
                          >
                            <Ionicons
                              name="restaurant-outline"
                              size={18}
                              color={isLunchPassed ? colors.textMuted : colors.primary}
                            />
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
                          <Text
                            style={[
                              styles.slotMealTitle,
                              isLunchPassed && styles.slotMealTitlePassed,
                            ]}
                            numberOfLines={1}
                          >
                            {lunchMeal.recipeTitle}
                          </Text>
                          <View style={styles.slotServingsStepper}>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(slot.lunchKey, 'lunch', -1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="remove" size={12} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.slotServingsText}>{lunchMeal.servings} p.</Text>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(slot.lunchKey, 'lunch', 1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="add" size={12} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.slotActionsCol}>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() =>
                              handleOpenPicker(
                                slot.lunchKey,
                                slot.mainLabel,
                                slot.dayName,
                                'lunch',
                                isLunchPassed,
                                slot.dateStr
                              )
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleRemoveMealFromSlot(slot.lunchKey, 'lunch')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.slotEmptyMinimal,
                        isLunchPassed && styles.slotEmptyMinimalPassed,
                        isLunchNext && styles.slotEmptyMinimalNext,
                      ]}
                      onPress={() =>
                        handleOpenPicker(
                          slot.lunchKey,
                          slot.mainLabel,
                          slot.dayName,
                          'lunch',
                          isLunchPassed,
                          slot.dateStr
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isLunchNext ? 'arrow-forward-circle-outline' : 'add'}
                        size={14}
                        color={isLunchPassed ? colors.textMuted : isLunchNext ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.slotEmptyMinimalText,
                          isLunchPassed && styles.slotEmptyMinimalTextPassed,
                          isLunchNext && styles.slotEmptyMinimalTextNext,
                        ]}
                      >
                        {isLunchPassed ? 'Déjeuner (passé)' : 'Déjeuner'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Créneau 2 : Soir 🌙 */}
                  {dinnerMeal ? (
                    <View
                      style={[
                        styles.mealSlotRow,
                        styles.mealSlotRowLast,
                        isDinnerPassed && styles.slotPassedWrapper,
                      ]}
                    >
                      <View style={styles.slotTimeBadge}>
                        <Text style={styles.slotTimeEmoji}>🌙</Text>
                        <Text style={styles.slotTimeLabel}>Soir</Text>
                        {isDinnerPassed && (
                          <View style={styles.passedPillBadge}>
                            <Text style={styles.passedPillText} numberOfLines={1}>Passé</Text>
                          </View>
                        )}
                        {isDinnerNext && (
                          <View style={styles.nextPillBadge}>
                            <Text style={styles.nextPillText} numberOfLines={1}>Proch.</Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={[
                          styles.slotFilledCard,
                          isDinnerPassed && styles.slotFilledCardPassed,
                          isDinnerNext && styles.slotCardNextHighlight,
                        ]}
                      >
                        {dinnerMeal.recipeImageUrl ? (
                          <Image
                            source={{ uri: dinnerMeal.recipeImageUrl }}
                            style={[
                              styles.slotThumb,
                              isDinnerPassed && styles.slotThumbPassed,
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.slotThumbPlaceholder,
                              isDinnerPassed && styles.slotThumbPassed,
                            ]}
                          >
                            <Ionicons
                              name="restaurant-outline"
                              size={18}
                              color={isDinnerPassed ? colors.textMuted : colors.primary}
                            />
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
                          <Text
                            style={[
                              styles.slotMealTitle,
                              isDinnerPassed && styles.slotMealTitlePassed,
                            ]}
                            numberOfLines={1}
                          >
                            {dinnerMeal.recipeTitle}
                          </Text>
                          <View style={styles.slotServingsStepper}>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(slot.dinnerKey, 'dinner', -1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="remove" size={12} color={colors.primary} />
                            </TouchableOpacity>
                            <Text style={styles.slotServingsText}>{dinnerMeal.servings} p.</Text>
                            <TouchableOpacity
                              style={styles.slotStepBtn}
                              onPress={() => handleUpdateServings(slot.dinnerKey, 'dinner', 1)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="add" size={12} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.slotActionsCol}>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() =>
                              handleOpenPicker(
                                slot.dinnerKey,
                                slot.mainLabel,
                                slot.dayName,
                                'dinner',
                                isDinnerPassed,
                                slot.dateStr
                              )
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="swap-horizontal" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotIconBtn}
                            onPress={() => handleRemoveMealFromSlot(slot.dinnerKey, 'dinner')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.slotEmptyMinimal,
                        styles.slotEmptyMinimalLast,
                        isDinnerPassed && styles.slotEmptyMinimalPassed,
                        isDinnerNext && styles.slotEmptyMinimalNext,
                      ]}
                      onPress={() =>
                        handleOpenPicker(
                          slot.dinnerKey,
                          slot.mainLabel,
                          slot.dayName,
                          'dinner',
                          isDinnerPassed,
                          slot.dateStr
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isDinnerNext ? 'arrow-forward-circle-outline' : 'add'}
                        size={14}
                        color={isDinnerPassed ? colors.textMuted : isDinnerNext ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.slotEmptyMinimalText,
                          isDinnerPassed && styles.slotEmptyMinimalTextPassed,
                          isDinnerNext && styles.slotEmptyMinimalTextNext,
                        ]}
                      >
                        {isDinnerPassed ? 'Dîner (passé)' : 'Dîner'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
      )}

      {/* Modal de sélection de recette pour le planning prévisionnel */}
      <MealSlotPickerModal
        visible={Boolean(activeSlot)}
        day={
          activeSlot
            ? `${activeSlot.dayLabel}${activeSlot.dateStr ? ' (' + formatShortDateFrench(activeSlot.dateStr) + ')' : ''}`
            : null
        }
        mealTime={activeSlot?.mealTime || null}
        isPassed={activeSlot?.isPassed}
        recipes={recipes}
        currentMeal={
          activeSlot ? weeklyPlan[activeSlot.slotKey] : undefined
        }
        onSelectRecipe={handleSaveRecipeToSlot}
        onSelectCustomMeal={handleSaveCustomMealToSlot}
        onRemoveMeal={() => {
          if (activeSlot) {
            handleRemoveMealFromSlot(activeSlot.slotKey, activeSlot.mealTime);
          }
        }}
        onClose={() => setActiveSlot(null)}
      />

      {/* Modal de réglages rapides du planning (Fixe vs Dynamique) */}
      <Modal
        visible={isConfigModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConfigModalVisible(false)}
      >
        <View style={styles.configModalBackdrop}>
          <View style={styles.configModalDialog}>
            <View style={styles.configModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="options" size={20} color={colors.primary} />
                <Text style={styles.configModalTitle}>Organisation du Menu</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsConfigModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.configModalSubtitle}>
              Choisissez votre mode d’organisation de la semaine :
            </Text>

            <View style={styles.modalModeRow}>
              <TouchableOpacity
                style={[
                  styles.modalModeBtn,
                  plannerSettings.mode === 'fixed' && styles.modalModeBtnActive,
                ]}
                onPress={() => handleChangeMode('fixed')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={plannerSettings.mode === 'fixed' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modalModeBtnText,
                    plannerSettings.mode === 'fixed' && styles.modalModeBtnTextActive,
                  ]}
                >
                  Fixe
                </Text>
                <Text style={styles.modalModeSubText}>Semaine de courses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalModeBtn,
                  plannerSettings.mode === 'dynamic' && styles.modalModeBtnActive,
                ]}
                onPress={() => handleChangeMode('dynamic')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="flash"
                  size={18}
                  color={plannerSettings.mode === 'dynamic' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modalModeBtnText,
                    plannerSettings.mode === 'dynamic' && styles.modalModeBtnTextActive,
                  ]}
                >
                  Dynamique
                </Text>
                <Text style={styles.modalModeSubText}>Dès aujourd’hui</Text>
              </TouchableOpacity>
            </View>

            {plannerSettings.mode === 'fixed' ? (
              <View style={styles.modalDaysSection}>
                <Text style={styles.modalDaysTitle}>Premier jour de la semaine :</Text>
                <Text style={styles.modalDaysSub}>
                  Jour où vous commencez vos menus (ex: courses le mercredi) :
                </Text>
                <View style={styles.modalDaysGrid}>
                  {ORDERED_DAYS_OF_WEEK.map((d) => {
                    const isSelected = plannerSettings.startDay === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.modalDayChip,
                          isSelected && styles.modalDayChipActive,
                        ]}
                        onPress={() => handleChangeStartDay(d)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modalDayChipText,
                            isSelected && styles.modalDayChipTextActive,
                          ]}
                        >
                          {d.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.modalInfoBox}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
                  <Text style={styles.modalInfoText}>
                    Planning du {plannerSettings.startDay} au{' '}
                    {ORDERED_DAYS_OF_WEEK[
                      (ORDERED_DAYS_OF_WEEK.indexOf(plannerSettings.startDay) + 6) % 7
                    ]}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.modalDynamicNotice}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                <Text style={styles.modalDynamicNoticeText}>
                  Planning glissant sur 7 jours débutant au prochain repas selon l’heure. Les repas passés sont grisés tout en restant modifiables si vous souhaitez forcer un choix.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setIsConfigModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14,
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
    marginBottom: 8,
    gap: 10,
  },
  mealSlotRowLast: {
    marginBottom: 0,
  },
  slotTimeBadge: {
    width: 50,
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
  slotEmptyMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  slotEmptyMinimalLast: {
    marginBottom: 0,
  },
  slotEmptyMinimalPassed: {
    borderColor: colors.borderLight,
    opacity: 0.6,
  },
  slotEmptyMinimalNext: {
    borderColor: colors.primary + '88',
    backgroundColor: colors.primaryLight + '22',
  },
  slotEmptyMinimalText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  slotEmptyMinimalTextPassed: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  slotEmptyMinimalTextNext: {
    color: colors.primary,
    fontWeight: '700',
  },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  modeIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayBadgeToday: {
    backgroundColor: colors.primary,
  },
  dayBadgeTextToday: {
    color: '#FFFFFF',
  },
  passedPillBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: colors.borderMedium,
  },
  passedPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  nextPillBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPillText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  slotPassedWrapper: {
    opacity: 0.65,
  },
  slotCardNextHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
  },
  slotFilledCardPassed: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  slotThumbPassed: {
    opacity: 0.7,
  },
  slotMealTitlePassed: {
    color: colors.textSecondary,
  },

  configModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  configModalDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.card,
  },
  configModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  configModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  configModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  modalModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 3,
    gap: 4,
    marginBottom: 14,
  },
  modalModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 2,
  },
  modalModeBtnActive: {
    backgroundColor: colors.cardBackground,
    ...shadows.card,
  },
  modalModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalModeBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalModeSubText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  modalDaysSection: {
    marginBottom: 16,
  },
  modalDaysTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  modalDaysSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalDaysGrid: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  modalDayChip: {
    flex: 1,
    minWidth: 38,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalDayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalDayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalDayChipTextActive: {
    color: '#FFFFFF',
  },
  modalInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  modalDynamicNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalDynamicNoticeText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 17,
    flex: 1,
  },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
}));
