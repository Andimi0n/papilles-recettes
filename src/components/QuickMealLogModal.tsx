import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealTime } from '../types/planner';
import { MealLogEntry } from '../types/mealLog';
import { Recipe } from '../types/recipe';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { formatMealLogDateFrench, normalizeString } from '../utils/helpers';

interface QuickMealLogModalProps {
  visible: boolean;
  date: string;
  mealTime: MealTime;
  currentEntry?: MealLogEntry | null;
  recipes?: Recipe[];
  plannedMealTitle?: string;
  onSave: (
    title: string,
    recipeId?: string,
    recipeImageUrl?: string,
    note?: string
  ) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const QUICK_SUGGESTIONS = [
  '🥗 Salade',
  '🍕 Pizza',
  '🍣 Resto japonais',
  '🍝 Pâtes',
  '🥪 Sandwich',
  '🍔 Burger',
  '🍲 Restes',
  '🥩 Grillades',
  '🥐 Brunch',
];

export const QuickMealLogModal: React.FC<QuickMealLogModalProps> = ({
  visible,
  date,
  mealTime,
  currentEntry,
  recipes = [],
  plannedMealTitle,
  onSave,
  onDelete,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState('');

  // Initialisation à l'ouverture du modal
  useEffect(() => {
    if (visible) {
      if (currentEntry) {
        setTitle(currentEntry.title || '');
        setNote(currentEntry.note || '');
        if (currentEntry.recipeId) {
          const matched = recipes.find((r) => r.id === currentEntry.recipeId);
          setSelectedRecipe(matched || null);
        } else {
          setSelectedRecipe(null);
        }
      } else {
        setTitle('');
        setNote('');
        setSelectedRecipe(null);
      }
      setShowRecipePicker(false);
      setRecipeSearch('');
    }
  }, [visible, currentEntry, recipes]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes.slice(0, 15);
    const query = normalizeString(recipeSearch);
    return recipes.filter((r) => normalizeString(r.title).includes(query)).slice(0, 15);
  }, [recipes, recipeSearch]);

  const handleSelectRecipe = (r: Recipe) => {
    setTitle(r.title);
    setSelectedRecipe(r);
    setShowRecipePicker(false);
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(
      trimmed,
      selectedRecipe ? selectedRecipe.id : undefined,
      selectedRecipe ? selectedRecipe.imageUrl : undefined,
      note.trim() || undefined
    );
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  };

  const mealTimeLabel = mealTime === 'lunch' ? 'Déjeuner (Midi)' : 'Dîner (Soir)';
  const mealTimeEmoji = mealTime === 'lunch' ? '☀️' : '🌙';
  const dateFormatted = formatMealLogDateFrench(date);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Poignée supérieure */}
          <View style={styles.handleBar} />

          {/* En-tête */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.timeBadgeRow}>
                <Text style={styles.timeBadgeEmoji}>{mealTimeEmoji}</Text>
                <Text style={styles.timeBadgeText}>{mealTimeLabel}</Text>
              </View>
              <Text style={styles.dateSubtitle}>{dateFormatted}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Saisie principale du plat en écriture libre */}
            <Text style={styles.fieldLabel}>Qu'avez-vous mangé ?</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Sushi au resto, Salade césar, Pâtes carbo..."
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (selectedRecipe && t !== selectedRecipe.title) {
                    setSelectedRecipe(null);
                  }
                }}
                autoFocus={visible}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              {title.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setTitle('');
                    setSelectedRecipe(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Recette liée sélectionnée */}
            {selectedRecipe && (
              <View style={styles.linkedRecipeBanner}>
                {selectedRecipe.imageUrl ? (
                  <Image source={{ uri: selectedRecipe.imageUrl }} style={styles.linkedRecipeThumb} />
                ) : (
                  <View style={styles.linkedRecipePlaceholder}>
                    <Ionicons name="book" size={14} color={colors.primary} />
                  </View>
                )}
                <View style={styles.linkedRecipeTextCol}>
                  <Text style={styles.linkedRecipeTag}>Recette du carnet liée</Text>
                  <Text style={styles.linkedRecipeTitle} numberOfLines={1}>
                    {selectedRecipe.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedRecipe(null)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Raccourci si un repas était prévu au planning pour cette date */}
            {plannedMealTitle && !title && (
              <TouchableOpacity
                style={styles.plannedMealChip}
                onPress={() => setTitle(plannedMealTitle)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={styles.plannedMealText} numberOfLines={1}>
                  Prévu au menu : <Text style={styles.plannedMealBold}>{plannedMealTitle}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Suggestions rapides en écriture libre */}
            <Text style={styles.subLabel}>Suggestions rapides</Text>
            <View style={styles.chipsRow}>
              {QUICK_SUGGESTIONS.map((sug) => (
                <TouchableOpacity
                  key={sug}
                  style={styles.sugChip}
                  onPress={() => {
                    // Si le champ est vide, on prend la suggestion sans l'émoji
                    const clean = sug.replace(/^[^\s]+\s*/, '');
                    setTitle(clean);
                    setSelectedRecipe(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sugChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sélecteur de recette du carnet */}
            {recipes.length > 0 && (
              <View style={styles.recipesSection}>
                <TouchableOpacity
                  style={styles.toggleRecipesBtn}
                  onPress={() => setShowRecipePicker((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showRecipePicker ? 'chevron-up' : 'book-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.toggleRecipesBtnText}>
                    {showRecipePicker
                      ? 'Masquer mes recettes'
                      : 'Choisir parmi mes recettes cuisinées'}
                  </Text>
                </TouchableOpacity>

                {showRecipePicker && (
                  <View style={styles.recipePickerContainer}>
                    <View style={styles.recipeSearchBox}>
                      <Ionicons name="search" size={16} color={colors.textMuted} />
                      <TextInput
                        style={styles.recipeSearchInput}
                        placeholder="Rechercher une recette..."
                        placeholderTextColor={colors.textMuted}
                        value={recipeSearch}
                        onChangeText={setRecipeSearch}
                      />
                    </View>

                    <ScrollView
                      style={styles.recipeSelectList}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredRecipes.map((r) => (
                        <TouchableOpacity
                          key={r.id}
                          style={styles.recipeSelectItem}
                          onPress={() => handleSelectRecipe(r)}
                          activeOpacity={0.7}
                        >
                          {r.imageUrl ? (
                            <Image source={{ uri: r.imageUrl }} style={styles.recipeSelectThumb} />
                          ) : (
                            <View style={styles.recipeSelectPlaceholder}>
                              <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                            </View>
                          )}
                          <Text style={styles.recipeSelectTitle} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Note ou commentaire facultatif */}
            <Text style={styles.subLabel}>Note personnelle (facultatif)</Text>
            <View style={styles.noteInputWrapper}>
              <TextInput
                style={styles.noteInput}
                placeholder="Ex: Au resto avec des collègues, très bon !"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                maxLength={300}
              />
            </View>
          </ScrollView>

          {/* Boutons d'action inférieurs */}
          <View style={styles.actionsBar}>
            {currentEntry && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.saveBtn,
                !title.trim() && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {currentEntry ? 'Mettre à jour' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
    ...shadows.large,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.borderMedium,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleCol: {
    flex: 1,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBadgeEmoji: {
    fontSize: 18,
  },
  timeBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    maxHeight: 460,
  },
  scrollInner: {
    paddingBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },
  linkedRecipeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 10,
  },
  linkedRecipeThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  linkedRecipePlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkedRecipeTextCol: {
    flex: 1,
  },
  linkedRecipeTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  linkedRecipeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  plannedMealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  plannedMealText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  plannedMealBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sugChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sugChipText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  recipesSection: {
    marginTop: 14,
  },
  toggleRecipesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  toggleRecipesBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  recipePickerContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  recipeSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    marginBottom: 8,
  },
  recipeSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  recipeSelectList: {
    maxHeight: 150,
  },
  recipeSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  recipeSelectThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  recipeSelectPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeSelectTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  noteInputWrapper: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  deleteBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.card,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
}));
