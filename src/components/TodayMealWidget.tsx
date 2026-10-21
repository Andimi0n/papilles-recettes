import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealTime } from '../types/planner';
import { MealLogEntry } from '../types/mealLog';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface TodayMealWidgetProps {
  todayLunch?: MealLogEntry;
  todayDinner?: MealLogEntry;
  onPressSlot: (slot: MealTime) => void;
  onNavigateToJournal?: () => void;
}

export const TodayMealWidget: React.FC<TodayMealWidgetProps> = ({
  todayLunch,
  todayDinner,
  onPressSlot,
  onNavigateToJournal,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.cardContainer}>
      {/* En-tête du widget */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.headerEmoji}>🍽️</Text>
          <Text style={styles.headerTitle}>Ce que j'ai mangé aujourd'hui</Text>
        </View>

        {onNavigateToJournal && (
          <TouchableOpacity
            style={styles.journalLinkBtn}
            onPress={onNavigateToJournal}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.journalLinkText}>Journal</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grille des 2 créneaux : Midi et Soir */}
      <View style={styles.slotsRow}>
        {/* Créneau Midi */}
        <TouchableOpacity
          style={[
            styles.slotCard,
            todayLunch ? styles.slotCardFilled : styles.slotCardEmpty,
          ]}
          onPress={() => onPressSlot('lunch')}
          activeOpacity={0.8}
        >
          <View style={styles.slotHeader}>
            <View style={styles.slotTimeBadge}>
              <Text style={styles.slotEmoji}>☀️</Text>
              <Text style={styles.slotTimeName}>Midi</Text>
            </View>
            <Ionicons
              name={todayLunch ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={todayLunch ? colors.primary : colors.textMuted}
            />
          </View>

          {todayLunch ? (
            <Text style={styles.slotMealTitle} numberOfLines={2}>
              {todayLunch.title}
            </Text>
          ) : (
            <Text style={styles.slotPlaceholderText}>
              + Saisir ce midi
            </Text>
          )}
        </TouchableOpacity>

        {/* Créneau Soir */}
        <TouchableOpacity
          style={[
            styles.slotCard,
            todayDinner ? styles.slotCardFilled : styles.slotCardEmpty,
          ]}
          onPress={() => onPressSlot('dinner')}
          activeOpacity={0.8}
        >
          <View style={styles.slotHeader}>
            <View style={styles.slotTimeBadge}>
              <Text style={styles.slotEmoji}>🌙</Text>
              <Text style={styles.slotTimeName}>Soir</Text>
            </View>
            <Ionicons
              name={todayDinner ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={todayDinner ? colors.primary : colors.textMuted}
            />
          </View>

          {todayDinner ? (
            <Text style={styles.slotMealTitle} numberOfLines={2}>
              {todayDinner.title}
            </Text>
          ) : (
            <Text style={styles.slotPlaceholderText}>
              + Saisir ce soir
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  cardContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: {
    fontSize: 15,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  journalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  journalLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  slotCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 68,
    justifyContent: 'space-between',
  },
  slotCardFilled: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  slotCardEmpty: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderMedium,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slotTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotEmoji: {
    fontSize: 13,
  },
  slotTimeName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotMealTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  slotPlaceholderText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
}));
