import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import {
  STANDARD_UNITS,
  UNIT_CATEGORIES,
  StandardUnit,
  normalizeUnit,
} from '../constants/units';

export interface UnitPickerModalProps {
  visible: boolean;
  currentUnit?: string;
  onSelectUnit: (unit: string) => void;
  onClose: () => void;
  title?: string;
}

export const UnitPickerModal: React.FC<UnitPickerModalProps> = ({
  visible,
  currentUnit = '',
  onSelectUnit,
  onClose,
  title = 'Choisir une unité',
}) => {
  const { colors, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');

  const modalHeight = Math.min(640, Math.round(windowHeight * 0.82));
  const normalizedCurrent = normalizeUnit(currentUnit);

  // Filtrage selon la recherche
  const filteredUnits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return STANDARD_UNITS;
    return STANDARD_UNITS.filter((u) => {
      if (u.id.toLowerCase().includes(q)) return true;
      if (u.label.toLowerCase().includes(q)) return true;
      if (u.shortLabel.toLowerCase().includes(q)) return true;
      return u.aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [searchQuery]);

  // Groupement par catégorie
  const groupedUnits = useMemo(() => {
    const groups: { [key: string]: StandardUnit[] } = {};
    UNIT_CATEGORIES.forEach((cat) => {
      groups[cat.id] = [];
    });
    filteredUnits.forEach((unit) => {
      if (groups[unit.category]) {
        groups[unit.category].push(unit);
      }
    });
    return groups;
  }, [filteredUnits]);

  const handleSelect = (unitId: string) => {
    onSelectUnit(unitId);
    setSearchQuery('');
    onClose();
  };

  const handleCustomInputSelect = () => {
    if (searchQuery.trim()) {
      onSelectUnit(searchQuery.trim());
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalContainer,
            { height: modalHeight, backgroundColor: colors.cardBackground },
          ]}
        >
          {/* Poignée visuelle */}
          <View style={[styles.handleBar, { backgroundColor: colors.borderMedium }]} />

          {/* En-tête */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Standardisez vos mesures ou saisissez une unité personnalisée
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.borderMedium }]}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Rechercher une unité (ex: g, ml, cuillère, sachet)..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="done"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Option libre si recherche tapée */}
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={[
                  styles.customOptionCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.primary },
                ]}
                onPress={handleCustomInputSelect}
                activeOpacity={0.7}
              >
                <View style={[styles.customOptionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.customOptionTextCol}>
                  <Text style={[styles.customOptionTitle, { color: colors.primary }]}>
                    Utiliser « {searchQuery.trim()} »
                  </Text>
                  <Text style={[styles.customOptionSub, { color: colors.textMuted }]}>
                    Saisie libre comme unité personnalisée
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            {/* Option Sans Unité / À la pièce */}
            <TouchableOpacity
              style={[
                styles.unitRow,
                { backgroundColor: colors.cardBackground, borderColor: colors.borderMedium },
                !currentUnit && styles.unitRowSelected,
                !currentUnit && { borderColor: colors.primary, backgroundColor: isDark ? '#1C3326' : '#EDF7F1' },
              ]}
              onPress={() => handleSelect('')}
              activeOpacity={0.7}
            >
              <View style={[styles.unitBadge, { backgroundColor: isDark ? '#26332E' : '#E8EFEA' }]}>
                <Ionicons name="remove-outline" size={18} color={colors.textSecondary} />
              </View>
              <View style={styles.unitTextCol}>
                <Text style={[styles.unitName, { color: colors.textPrimary }]}>Aucune unité / À la pièce</Text>
                <Text style={[styles.unitSub, { color: colors.textMuted }]}>Ex: 2 citrons, 3 œufs, 1 salade</Text>
              </View>
              {!currentUnit && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>

            {/* Catégories d'unités */}
            {UNIT_CATEGORIES.map((cat) => {
              const units = groupedUnits[cat.id];
              if (!units || units.length === 0) return null;

              return (
                <View key={cat.id} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name={cat.icon as any} size={16} color={colors.primary} style={styles.categoryIcon} />
                    <Text style={[styles.categoryTitle, { color: colors.primary }]}>{cat.label}</Text>
                  </View>

                  <View style={styles.unitsGrid}>
                    {units.map((unit) => {
                      const isSelected = normalizedCurrent === unit.id;

                      return (
                        <TouchableOpacity
                          key={unit.id}
                          style={[
                            styles.unitCard,
                            { backgroundColor: colors.cardBackground, borderColor: colors.borderMedium },
                            isSelected && {
                              borderColor: colors.primary,
                              backgroundColor: isDark ? '#1C3326' : '#EDF7F1',
                            },
                          ]}
                          onPress={() => handleSelect(unit.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.unitCardHeader}>
                            <View
                              style={[
                                styles.shortLabelBadge,
                                { backgroundColor: isSelected ? colors.primary : isDark ? '#26332E' : '#E8EFEA' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.shortLabelText,
                                  { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                                ]}
                              >
                                {unit.shortLabel}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                            )}
                          </View>
                          <Text style={[styles.unitCardLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                            {unit.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  customOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  customOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customOptionTextCol: {
    flex: 1,
  },
  customOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  customOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  unitRowSelected: {
    borderWidth: 1.5,
  },
  unitBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unitTextCol: {
    flex: 1,
  },
  unitName: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitSub: {
    fontSize: 11,
    marginTop: 2,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  unitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shortLabelBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shortLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unitCardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
