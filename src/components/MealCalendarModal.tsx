import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealLogMap } from '../types/mealLog';
import { WeeklyPlanMap } from '../types/planner';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  getLocalDateString,
  formatMealLogDateFrench,
  getDayOfWeekFromDateString,
} from '../utils/helpers';

interface MealCalendarModalProps {
  visible: boolean;
  selectedDate: string;
  mealLogs: MealLogMap;
  weeklyPlan?: WeeklyPlanMap;
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const MealCalendarModal: React.FC<MealCalendarModalProps> = ({
  visible,
  selectedDate,
  mealLogs,
  weeklyPlan = {},
  onSelectDate,
  onClose,
}) => {
  const { colors } = useTheme();
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Mois affiché dans le calendrier (année, mois index 0-11)
  const [viewYear, setViewYear] = useState(() => {
    const [y] = (selectedDate || todayStr).split('-').map(Number);
    return y;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = (selectedDate || todayStr).split('-').map(Number);
    return m - 1;
  });

  // Date prévisualisée dans le calendrier
  const [previewDate, setPreviewDate] = useState<string>(selectedDate || todayStr);

  // Synchronisation lors de l'ouverture pendant le render
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible && !prevVisible) {
    setPrevVisible(true);
    const target = selectedDate || todayStr;
    const [y, m] = target.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setPreviewDate(target);
  } else if (!visible && prevVisible) {
    setPrevVisible(false);
  }

  // Navigation mensuelle (reculer/avancer sans restriction de date)
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const [y, m] = todayStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setPreviewDate(todayStr);
  };

  // Grille des jours du mois
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Jour de la semaine du 1er jour (0 = Dimanche, 1 = Lundi, etc.)
    const firstDayJs = new Date(viewYear, viewMonth, 1).getDay();
    // Conversion pour que Lundi = 0 et Dimanche = 6
    const startOffset = (firstDayJs + 6) % 7;

    const cells: {
      type: 'empty' | 'day';
      key: string;
      dayNumber?: number;
      dateStr?: string;
    }[] = [];

    // Cases vides avant le 1er jour
    for (let i = 0; i < startOffset; i++) {
      cells.push({ type: 'empty', key: `empty_start_${i}` });
    }

    // Jours réels du mois
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        type: 'day',
        key: `day_${dateStr}`,
        dayNumber: d,
        dateStr,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Détails de la journée prévisualisée
  const previewDayOfWeek = useMemo(
    () => getDayOfWeekFromDateString(previewDate),
    [previewDate]
  );
  const previewLunch = mealLogs[`${previewDate}_lunch`];
  const previewDinner = mealLogs[`${previewDate}_dinner`];
  const previewPlannedLunch = weeklyPlan[`${previewDate}_lunch`] || weeklyPlan[`${previewDayOfWeek}_lunch`];
  const previewPlannedDinner = weeklyPlan[`${previewDate}_dinner`] || weeklyPlan[`${previewDayOfWeek}_dinner`];

  const handleConfirmSelection = (dateToSelect: string) => {
    onSelectDate(dateToSelect);
    onClose();
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
            <Text style={styles.headerTitle}>Calendrier des repas</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Fermer le calendrier"
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Barre de navigation du mois */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              style={styles.monthNavArrow}
              onPress={handlePrevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Mois précédent"
            >
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.monthTitleCenter}>
              <Text style={styles.monthTitleText}>
                {MONTH_NAMES_FR[viewMonth]} {viewYear}
              </Text>
              {(viewYear !== Number(todayStr.split('-')[0]) ||
                viewMonth !== Number(todayStr.split('-')[1]) - 1) && (
                <TouchableOpacity
                  style={styles.todayResetPill}
                  onPress={handleResetToCurrentMonth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.todayResetText}>Revenir au mois actuel</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.monthNavArrow}
              onPress={handleNextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Mois suivant"
            >
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* En-tête des jours de la semaine (Lun - Dim) */}
          <View style={styles.weekHeaderRow}>
            {WEEKDAY_HEADERS.map((w) => (
              <Text key={w} style={styles.weekHeaderCell}>
                {w}
              </Text>
            ))}
          </View>

          {/* Grille du mois */}
          <View style={styles.daysGrid}>
            {calendarCells.map((cell) => {
              if (cell.type === 'empty' || !cell.dateStr || !cell.dayNumber) {
                return <View key={cell.key} style={styles.dayCellEmpty} />;
              }

              const isSelected = cell.dateStr === previewDate;
              const isToday = cell.dateStr === todayStr;
              const hasLunch = Boolean(mealLogs[`${cell.dateStr}_lunch`]);
              const hasDinner = Boolean(mealLogs[`${cell.dateStr}_dinner`]);

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => setPreviewDate(cell.dateStr!)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayCellNum,
                      isSelected && styles.dayCellNumSelected,
                      isToday && !isSelected && styles.dayCellNumToday,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>

                  {/* Micro-indicateurs pour les repas enregistrés */}
                  <View style={styles.cellDotsRow}>
                    <View
                      style={[
                        styles.cellDot,
                        hasLunch &&
                          (isSelected
                            ? styles.cellDotFilledLight
                            : styles.cellDotFilled),
                      ]}
                    />
                    <View
                      style={[
                        styles.cellDot,
                        hasDinner &&
                          (isSelected
                            ? styles.cellDotFilledLight
                            : styles.cellDotFilled),
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fiche de prévisualisation du jour sélectionné */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <View>
                <Text style={styles.previewDateTitle}>
                  {formatMealLogDateFrench(previewDate)}
                </Text>
                <Text style={styles.previewDateSubtitle}>
                  {previewDayOfWeek} {previewDate === todayStr ? '• Aujourd’hui' : ''}
                </Text>
              </View>

              <View style={styles.previewLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.cellDot, styles.cellDotFilled]} />
                  <Text style={styles.legendText}>Repas renseigné</Text>
                </View>
              </View>
            </View>

            {/* Repas du midi ☀️ */}
            <View style={styles.previewMealRow}>
              <Text style={styles.previewMealEmoji}>☀️</Text>
              <View style={styles.previewMealInfo}>
                <Text style={styles.previewMealSlotLabel}>Midi :</Text>
                <Text
                  style={[
                    styles.previewMealTitle,
                    !previewLunch && styles.previewMealEmptyText,
                  ]}
                  numberOfLines={1}
                >
                  {previewLunch
                    ? previewLunch.title
                    : previewPlannedLunch
                    ? `Prévu : ${previewPlannedLunch.recipeTitle}`
                    : 'Aucun repas renseigné'}
                </Text>
              </View>
            </View>

            {/* Repas du soir 🌙 */}
            <View style={styles.previewMealRow}>
              <Text style={styles.previewMealEmoji}>🌙</Text>
              <View style={styles.previewMealInfo}>
                <Text style={styles.previewMealSlotLabel}>Soir :</Text>
                <Text
                  style={[
                    styles.previewMealTitle,
                    !previewDinner && styles.previewMealEmptyText,
                  ]}
                  numberOfLines={1}
                >
                  {previewDinner
                    ? previewDinner.title
                    : previewPlannedDinner
                    ? `Prévu : ${previewPlannedDinner.recipeTitle}`
                    : 'Aucun repas renseigné'}
                </Text>
              </View>
            </View>

            {/* Bouton de confirmation pour afficher/éditer cette journée */}
            <TouchableOpacity
              style={styles.confirmDayBtn}
              onPress={() => handleConfirmSelection(previewDate)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.confirmDayBtnText}>
                {previewDate === todayStr
                  ? 'Afficher aujourd’hui'
                  : 'Afficher cette journée'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
    marginBottom: 14,
  },
  monthNavArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleCenter: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  todayResetPill: {
    marginTop: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  weekHeaderCell: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
    marginBottom: 16,
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 4,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellNum: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayCellNumSelected: {
    color: '#FFFFFF',
  },
  dayCellNumToday: {
    color: colors.primary,
  },
  cellDotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    alignItems: 'center',
  },
  cellDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMedium,
  },
  cellDotFilled: {
    backgroundColor: colors.primary,
  },
  cellDotFilledLight: {
    backgroundColor: '#FFFFFF',
  },
  previewCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
    gap: 12,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  previewDateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  previewDateSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  previewMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  previewMealEmoji: {
    fontSize: 16,
  },
  previewMealInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewMealSlotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  previewMealTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  previewMealEmptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  confirmDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    ...shadows.card,
    marginTop: 4,
  },
  confirmDayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
}));
