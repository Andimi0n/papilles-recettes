import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  PanResponder,
  PanResponderGestureState,
  useWindowDimensions,
  Keyboard,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
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
import { styles } from './MealPlannerScreen.styles';
import { useTheme } from '../theme/ThemeContext';
import { MealSlotPickerModal } from '../components/MealSlotPickerModal';
import { QuickMealLogModal } from '../components/QuickMealLogModal';
import { MealCalendarModal } from '../components/MealCalendarModal';
import {
  generateUniqueId,
  getLocalDateString,
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
  isActive?: boolean;
}

export const MealPlannerScreen: React.FC<MealPlannerScreenProps> = ({
  recipes,
  onSelectRecipe,
  onNavigateToShoppingList,
  initialTab = 'journal',
  isActive = true,
}) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeMainTab, setActiveMainTab] = useState<'journal' | 'planner'>(initialTab);

  // Position horizontale du Pager (0 = journal, -screenWidth = planner)
  const [pageTranslateX] = useState(
    () => new Animated.Value(initialTab === 'journal' ? 0 : -screenWidth)
  );

  // Mesure dynamique exacte du premier onglet pour positionner et dimensionner la pastille verte
  const [tabLayout, setTabLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>(() => ({
    x: 4,
    y: 4,
    width: Math.max(0, (screenWidth - 40) / 2),
    height: 34,
  }));

  const onFirstTabLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setTabLayout((prev) => {
        if (
          Math.abs(prev.x - x) < 0.5 &&
          Math.abs(prev.y - y) < 0.5 &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { x, y, width, height };
      });
    }
  }, []);

  // Synchronise si initialTab change depuis l'extérieur (Pattern React 19)
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab && prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab);
    setActiveMainTab(initialTab);
    pageTranslateX.setValue(initialTab === 'journal' ? 0 : -screenWidth);
  }

  // Recalage de la translation si la largeur d'écran change ou si l'écran redevient actif
  useEffect(() => {
    if (activeMainTab === 'planner') {
      pageTranslateX.setValue(-screenWidth);
    } else {
      pageTranslateX.setValue(0);
    }
  }, [screenWidth, activeMainTab, pageTranslateX, isActive]);

  // Interpolation de la position de la pilule indicatrice active (0 -> tabLayout.width)
  const indicatorTranslateX = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [tabLayout.width, 0],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth, tabLayout.width]);

  // Interpolations d'opacité croisée pour les libellés et icônes des onglets
  const journalActiveOpacity = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth]);

  const plannerActiveOpacity = useMemo(() => {
    return pageTranslateX.interpolate({
      inputRange: [-screenWidth, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  }, [pageTranslateX, screenWidth]);

  // Basculement d'onglet fluide et synchronisé (spring physique)
  const switchTab = useCallback(
    (target: 'journal' | 'planner', animated = true) => {
      if (activeMainTab === target) return;
      Keyboard.dismiss();
      const targetX = target === 'journal' ? 0 : -screenWidth;

      if (!animated) {
        pageTranslateX.setValue(targetX);
        setActiveMainTab(target);
        return;
      }

      Animated.spring(pageTranslateX, {
        toValue: targetX,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }).start(() => {
        setActiveMainTab(target);
      });
    },
    [activeMainTab, screenWidth, pageTranslateX]
  );

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
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const ribbonScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const hasInitialScrolledRibbon = useRef(false);
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

  // Rechargement des repas et du plan lorsque l'onglet redevient actif
  useEffect(() => {
    if (isActive) {
      void (async () => {
        await loadPlan();
        await loadMealLogs();
      })();
    }
  }, [isActive, loadPlan, loadMealLogs]);

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
    } catch {
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
    } catch {
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

  // Ruban chronologique d'une semaine (7 jours, du plus ancien au jour actuel)
  const ribbonDays = useMemo(() => {
    return recentDays.slice(0, 7).reverse();
  }, [recentDays]);

  // Validation directe 1-tap d'un plat planifié vers le journal
  const handleQuickConfirmPlanned = async (
    mealTime: MealTime,
    plannedMeal: PlannedMeal
  ) => {
    try {
      const nextLogs = await StorageService.setMealLog(selectedDate, mealTime, {
        title: plannedMeal.recipeTitle,
        recipeId: plannedMeal.recipeId,
        recipeImageUrl: plannedMeal.recipeImageUrl,
        note: plannedMeal.customNote || undefined,
      });
      setMealLogs(nextLogs);
      const history = await StorageService.getRecentDaysMealLogs(14);
      setRecentDays(history);
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer le repas.");
    }
  };

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
    } catch {
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
    } catch {
      Alert.alert('Erreur', 'Impossible de planifier ce repas.');
    } finally {
      setActiveSlot(null);
    }
  };

  const handleRemoveMealFromSlot = async (slotKey: string, mealTime: MealTime) => {
    try {
      const nextPlan = await StorageService.setWeeklyMeal(slotKey, mealTime, null);
      setWeeklyPlan(nextPlan);
    } catch {
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
    } catch {
      Alert.alert('Erreur', 'Impossible de générer la liste de courses.');
    }
  };

  // Swipe tactile fluide et continu (type Pager / Launcher Android)
  const screenSwipePanResponder = useMemo(() => {
    const shouldCapture = (gestureState: PanResponderGestureState) => {
      // Si une modale est ouverte, aucun swipe de page
      if (
        quickLogModal.visible ||
        isConfigModalVisible ||
        isCalendarModalVisible ||
        Boolean(activeSlot)
      ) {
        return false;
      }

      const absDx = Math.abs(gestureState.dx);
      const absDy = Math.abs(gestureState.dy);

      // Si le mouvement a une composante verticale significative,
      // on donne une priorité absolue au scroll vertical de la semaine / journal
      if (absDy > 10 && absDy * 1.5 > absDx) {
        return false;
      }

      // Seuil d'orthogonalité stricte pour le swipe horizontal
      const isHorizontal = absDx > absDy * 1.8;
      if (!isHorizontal) return false;

      // Sur suivi des repas : swipe vers la gauche uniquement pour aller vers planning (dx < -18)
      if (activeMainTab === 'journal' && gestureState.dx < -18) {
        return true;
      }

      // Sur planning menus : swipe vers la droite uniquement pour revenir vers suivi (dx > 18)
      if (activeMainTab === 'planner' && gestureState.dx > 18) {
        return true;
      }

      return false;
    };

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gestureState) => shouldCapture(gestureState),
      onMoveShouldSetPanResponder: (_, gestureState) => shouldCapture(gestureState),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
        pageTranslateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const base = activeMainTab === 'journal' ? 0 : -screenWidth;
        let newX = base + gestureState.dx;

        // Amorti élastique doux aux limites extérieures
        if (newX > 0) {
          newX = newX * 0.15;
        } else if (newX < -screenWidth) {
          const over = newX + screenWidth;
          newX = -screenWidth + over * 0.15;
        }

        pageTranslateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        let shouldSwitch = false;

        if (activeMainTab === 'journal') {
          // Vers la gauche : seuil de 35% de la largeur d'écran ou flick vif
          shouldSwitch =
            gestureState.dx < -screenWidth * 0.35 ||
            (gestureState.dx < -25 && gestureState.vx < -0.35);
        } else {
          // Vers la droite : seuil de 35% de la largeur d'écran ou flick vif
          shouldSwitch =
            gestureState.dx > screenWidth * 0.35 ||
            (gestureState.dx > 25 && gestureState.vx > 0.35);
        }

        const destinationTab = shouldSwitch
          ? (activeMainTab === 'journal' ? 'planner' : 'journal')
          : activeMainTab;

        const targetX = destinationTab === 'journal' ? 0 : -screenWidth;

        Animated.spring(pageTranslateX, {
          toValue: targetX,
          velocity: gestureState.vx,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }).start(() => {
          setActiveMainTab(destinationTab);
        });
      },
      onPanResponderTerminate: () => {
        const targetX = activeMainTab === 'journal' ? 0 : -screenWidth;
        Animated.spring(pageTranslateX, {
          toValue: targetX,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }).start(() => {
          setActiveMainTab(activeMainTab);
        });
      },
    });
  }, [
    activeMainTab,
    quickLogModal.visible,
    isConfigModalVisible,
    isCalendarModalVisible,
    activeSlot,
    screenWidth,
    pageTranslateX,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={{ flex: 1, overflow: 'hidden' }} {...screenSwipePanResponder.panHandlers}>
        {/* En-tête principal avec Switcher d'onglets (Suivi des repas vs Planning menus) */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Repas</Text>
            <Text style={styles.headerSubtitle}>
              {activeMainTab === 'journal'
                ? 'Suivi des repas midi & soir'
                : plannedCount === 0
                ? 'Planification des menus'
                : `${plannedCount} sur 14 repas prévus`}
            </Text>
          </View>

          {activeMainTab === 'planner' && plannedCount > 0 && (
            <View style={styles.headerActionsRow}>
              <TouchableOpacity
                style={styles.headerCartIconBtn}
                onPress={handleGenerateShoppingList}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Générer la liste de courses"
              >
                <Ionicons name="cart" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearWeek}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Effacer les repas de la semaine"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Switcher d'onglets au sommet */}
        <View style={styles.tabSwitcherWrapper}>
          <View style={styles.tabSwitcherContainer}>
            {/* Pilule verte animée continue (glisse 1:1 sous le doigt) */}
            <Animated.View
              style={[
                styles.tabSwitcherPill,
                {
                  left: tabLayout.x,
                  top: tabLayout.y,
                  width: tabLayout.width,
                  height: tabLayout.height,
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
            />

            {/* Onglet 1 : Suivi des repas */}
            <TouchableOpacity
              style={styles.tabSwitcherBtn}
              onLayout={onFirstTabLayout}
              onPress={() => switchTab('journal')}
              activeOpacity={0.8}
              accessibilityLabel="Afficher le suivi des repas"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeMainTab === 'journal' }}
            >
              {/* Couche au repos */}
              <View style={styles.tabSwitcherBtnInner}>
                <Ionicons name="today-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.tabSwitcherText}>Suivi des repas</Text>
              </View>

              {/* Couche active avec fondu enchaîné continu */}
              <Animated.View
                style={[
                  styles.tabSwitcherBtnInner,
                  styles.tabSwitcherBtnOverlay,
                  { opacity: journalActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="today" size={15} color="#FFFFFF" />
                <Text style={[styles.tabSwitcherText, styles.tabSwitcherTextActive]}>
                  Suivi des repas
                </Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Onglet 2 : Planning menus */}
            <TouchableOpacity
              style={styles.tabSwitcherBtn}
              onPress={() => switchTab('planner')}
              activeOpacity={0.8}
              accessibilityLabel="Afficher le planning menus"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeMainTab === 'planner' }}
            >
              {/* Couche au repos */}
              <View style={styles.tabSwitcherBtnInner}>
                <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.tabSwitcherText}>Planning menus</Text>
              </View>

              {/* Couche active avec fondu enchaîné continu */}
              <Animated.View
                style={[
                  styles.tabSwitcherBtnInner,
                  styles.tabSwitcherBtnOverlay,
                  { opacity: plannerActiveOpacity },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="calendar" size={15} color="#FFFFFF" />
                <Text style={[styles.tabSwitcherText, styles.tabSwitcherTextActive]}>
                  Planning menus
                </Text>
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pager Track animé */}
        <Animated.View
          style={[
            styles.pagerTrack,
            {
              width: screenWidth * 2,
              transform: [{ translateX: pageTranslateX }],
            },
          ]}
        >
          {/* VUE 1 : SUIVI DES REPAS (JOURNAL) */}
          <View
            style={[styles.pagerPage, { width: screenWidth }]}
            aria-hidden={activeMainTab !== 'journal'}
          >
        <ScrollView
          style={styles.journalScroll}
          contentContainerStyle={styles.journalContent}
          showsVerticalScrollIndicator={false}
        >
          {/* En-tête date sélectionnée avec bouton retour Aujourd'hui et bouton Calendrier */}
          <View style={styles.selectedDateHeader}>
            <View style={styles.selectedDateCol}>
              <Text style={styles.selectedDateTitle}>
                {formatMealLogDateFrench(selectedDate)}
              </Text>
              <Text style={styles.selectedDateSubtitle}>
                {currentDayOfWeek} {selectedDate === todayStr ? '• Aujourd’hui' : ''}
              </Text>
            </View>

            <View style={styles.selectedDateActions}>
              {selectedDate !== todayStr && (
                <TouchableOpacity
                  style={styles.returnTodayBtn}
                  onPress={() => {
                    setSelectedDate(todayStr);
                    ribbonScrollRef.current?.scrollToEnd({ animated: true });
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="today" size={13} color={colors.primary} />
                  <Text style={styles.returnTodayText}>Aujourd’hui</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.calendarModalBtn}
                onPress={() => setIsCalendarModalVisible(true)}
                activeOpacity={0.75}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Ouvrir le calendrier des repas"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ruban horizontal compact d'une semaine (7 jours, calé sur Aujourd'hui à droite) */}
          <ScrollView
            ref={ribbonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ribbonScroll}
            contentContainerStyle={styles.ribbonContainer}
            onContentSizeChange={() => {
              if (!hasInitialScrolledRibbon.current) {
                ribbonScrollRef.current?.scrollToEnd({ animated: false });
                hasInitialScrolledRibbon.current = true;
              }
            }}
          >
            {ribbonDays.map((item) => {
              const isSelected = item.date === selectedDate;
              const isToday = item.date === todayStr;
              const hasLunch = Boolean(item.lunch || mealLogs[`${item.date}_lunch`]);
              const hasDinner = Boolean(item.dinner || mealLogs[`${item.date}_dinner`]);
              const dayNum = parseInt(item.date.split('-')[2], 10);
              const shortDay = item.dayOfWeek.slice(0, 3);

              return (
                <TouchableOpacity
                  key={item.date}
                  style={[
                    styles.ribbonChip,
                    isSelected && styles.ribbonChipSelected,
                    isToday && !isSelected && styles.ribbonChipToday,
                  ]}
                  onPress={() => setSelectedDate(item.date)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.ribbonDayName,
                      isSelected && styles.ribbonDayNameSelected,
                    ]}
                  >
                    {shortDay}
                  </Text>
                  <Text
                    style={[
                      styles.ribbonDayNum,
                      isSelected && styles.ribbonDayNumSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  <View style={styles.ribbonDotsRow}>
                    <View
                      style={[
                        styles.ribbonDot,
                        hasLunch && (isSelected ? styles.ribbonDotFilledLight : styles.ribbonDotFilled),
                      ]}
                    />
                    <View
                      style={[
                        styles.ribbonDot,
                        hasDinner && (isSelected ? styles.ribbonDotFilledLight : styles.ribbonDotFilled),
                      ]}
                    />
                  </View>
                  {isToday && (
                    <View
                      style={[
                        styles.ribbonTodayBadge,
                        isSelected && styles.ribbonTodayBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.ribbonTodayText,
                          isSelected && styles.ribbonTodayTextSelected,
                        ]}
                      >
                        Auj.
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Section : Ce que j'ai mangé sur cette journée */}
          <View style={styles.journalDayCardsSection}>
            {/* CARTE MIDI ☀️ */}
            <View style={styles.journalMealCard}>
              <View style={styles.journalMealHeader}>
                <View style={styles.journalMealTimeCol}>
                  <Text style={styles.journalMealEmoji}>☀️</Text>
                  <Text style={styles.journalMealTimeLabel}>Déjeuner (Midi)</Text>
                </View>
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
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={150}
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
                  <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : plannedLunchForDay?.recipeTitle ? (
                <View style={styles.journalPlannedBox}>
                  <View style={styles.journalPlannedHeader}>
                    <Ionicons name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.journalPlannedTag}>Prévu au menu :</Text>
                  </View>
                  <View style={styles.journalPlannedBody}>
                    {plannedLunchForDay.recipeImageUrl ? (
                      <Image
                        source={{ uri: plannedLunchForDay.recipeImageUrl }}
                        style={styles.journalPlannedThumb}
                        contentFit="cover"
                        cachePolicy="disk"
                        transition={150}
                      />
                    ) : (
                      <View style={styles.journalPlannedPlaceholder}>
                        <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.journalPlannedTitleCol}>
                      <Text style={styles.journalPlannedTitle} numberOfLines={1}>
                        {plannedLunchForDay.recipeTitle}
                      </Text>
                      {plannedLunchForDay.servings ? (
                        <Text style={styles.journalPlannedServings}>
                          Prévu pour {plannedLunchForDay.servings} pers.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.journalPlannedActions}>
                    <TouchableOpacity
                      style={styles.journalPlannedConfirmBtn}
                      onPress={() => handleQuickConfirmPlanned('lunch', plannedLunchForDay)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.journalPlannedConfirmBtnText}>
                        J’ai mangé ce plat
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.journalPlannedOtherBtn}
                      onPress={() => handleOpenQuickLog(selectedDate, 'lunch')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.journalPlannedOtherBtnText}>Autre plat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                      Saisie libre, resto, restes, ou plat cuisiné
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
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={150}
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
                  <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : plannedDinnerForDay?.recipeTitle ? (
                <View style={styles.journalPlannedBox}>
                  <View style={styles.journalPlannedHeader}>
                    <Ionicons name="calendar" size={14} color={colors.primary} />
                    <Text style={styles.journalPlannedTag}>Prévu au menu :</Text>
                  </View>
                  <View style={styles.journalPlannedBody}>
                    {plannedDinnerForDay.recipeImageUrl ? (
                      <Image
                        source={{ uri: plannedDinnerForDay.recipeImageUrl }}
                        style={styles.journalPlannedThumb}
                        contentFit="cover"
                        cachePolicy="disk"
                        transition={150}
                      />
                    ) : (
                      <View style={styles.journalPlannedPlaceholder}>
                        <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.journalPlannedTitleCol}>
                      <Text style={styles.journalPlannedTitle} numberOfLines={1}>
                        {plannedDinnerForDay.recipeTitle}
                      </Text>
                      {plannedDinnerForDay.servings ? (
                        <Text style={styles.journalPlannedServings}>
                          Prévu pour {plannedDinnerForDay.servings} pers.
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.journalPlannedActions}>
                    <TouchableOpacity
                      style={styles.journalPlannedConfirmBtn}
                      onPress={() => handleQuickConfirmPlanned('dinner', plannedDinnerForDay)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.journalPlannedConfirmBtnText}>
                        J’ai mangé ce plat
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.journalPlannedOtherBtn}
                      onPress={() => handleOpenQuickLog(selectedDate, 'dinner')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.journalPlannedOtherBtnText}>Autre plat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
                      Saisie libre, resto, restes, ou plat cuisiné
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* HISTORIQUE RÉCENT (LES 14 DERNIERS JOURS) */}
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyHeaderRow}
              onPress={() => setIsHistoryExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.historyHeaderTitle}>Historique des derniers jours</Text>
              </View>
              <Ionicons
                name={isHistoryExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {(isHistoryExpanded ? recentDays : recentDays.slice(0, 3)).map((dayItem) => {
              const isSelected = dayItem.date === selectedDate;

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
      </View>

      {/* VUE 2 : MENU PRÉVISIONNEL DE LA SEMAINE (PLANNING) */}
      <View
        style={[styles.pagerPage, { width: screenWidth }]}
        aria-hidden={activeMainTab !== 'planner'}
      >
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
                {plannerSettings.mode === 'dynamic' ? 'Dynamique' : 'Fixe'}
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
                            contentFit="cover"
                            cachePolicy="disk"
                            transition={150}
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
                            accessibilityLabel="Changer ce plat"
                          >
                            <Ionicons name="swap-horizontal" size={17} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotDeleteBtn}
                            onPress={() => handleRemoveMealFromSlot(slot.lunchKey, 'lunch')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Retirer ce plat"
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
                            contentFit="cover"
                            cachePolicy="disk"
                            transition={150}
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
                            accessibilityLabel="Changer ce plat"
                          >
                            <Ionicons name="swap-horizontal" size={17} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.slotDeleteBtn}
                            onPress={() => handleRemoveMealFromSlot(slot.dinnerKey, 'dinner')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Retirer ce plat"
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
        </View>
      </Animated.View>
    </View>

      {/* Modal de sélection de recette pour le planning prévisionnel */}
      {Boolean(activeSlot) && (
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
      )}

      {/* Modal de réglages rapides du planning (Fixe vs Dynamique) */}
      {isConfigModalVisible && (
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
      )}

      {/* Modal de saisie rapide libre pour le suivi des repas (journal) */}
      {quickLogModal.visible && (
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
      )}

      {/* Modal du calendrier mensuel des repas (historique sans limite) */}
      {isCalendarModalVisible && (
        <MealCalendarModal
          visible={isCalendarModalVisible}
          selectedDate={selectedDate}
          mealLogs={mealLogs}
          weeklyPlan={weeklyPlan}
          onSelectDate={(date) => {
            setSelectedDate(date);
            if (date === todayStr) {
              ribbonScrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
          onClose={() => setIsCalendarModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

