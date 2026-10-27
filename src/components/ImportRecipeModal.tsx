import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { Recipe } from '../types/recipe';
import { formatQuantityWithUnit } from '../constants/units';

interface ImportRecipeModalProps {
  visible: boolean;
  recipe: Recipe | null;
  onConfirmImport: (recipe: Recipe) => void;
  onCustomize?: (recipe: Recipe) => void;
  onClose: () => void;
}

export const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({
  visible,
  recipe,
  onConfirmImport,
  onCustomize,
  onClose,
}) => {
  const { colors } = useTheme();

  if (!recipe) return null;

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Badge & Titre */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="gift-outline" size={14} color={colors.primary} />
              <Text style={styles.badgeText}>Recette reçue en partage</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
          >
            {/* Image si URL distante valide */}
            {recipe.imageUrl &&
            (recipe.imageUrl.startsWith('http://') ||
              recipe.imageUrl.startsWith('https://')) ? (
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : null}

            <Text style={styles.recipeTitle}>{recipe.title}</Text>

            {recipe.description ? (
              <Text style={styles.description}>{recipe.description}</Text>
            ) : null}

            {/* Chips d'informations rapides */}
            <View style={styles.metaRow}>
              {totalTime > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.metaText}>{totalTime} min</Text>
                </View>
              )}
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={14} color={colors.primary} />
                <Text style={styles.metaText}>{recipe.servings || 4} pers.</Text>
              </View>
              <View style={styles.metaChip}>
                <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                <Text style={styles.metaText}>{recipe.category || 'Plat'}</Text>
              </View>
              {recipe.rating > 0 && (
                <View style={styles.metaChip}>
                  <Ionicons name="star" size={13} color="#F59E0B" />
                  <Text style={styles.metaText}>{recipe.rating}/5</Text>
                </View>
              )}
            </View>

            {/* Note personnelle éventuelle */}
            {recipe.userNote ? (
              <View style={styles.noteBox}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.noteText}>
                  <Text style={styles.noteLabel}>Conseil du chef : </Text>
                  {recipe.userNote}
                </Text>
              </View>
            ) : null}

            {/* Section Ingrédients */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Ingrédients ({recipe.ingredients?.length || 0})
                </Text>
              </View>
              <View style={styles.ingredientsList}>
                {(recipe.ingredients || []).map((ing, idx) => {
                  const qtyFormatted = formatQuantityWithUnit(
                    ing.quantity,
                    ing.unit
                  );
                  return (
                    <View key={ing.id || idx} style={styles.ingredientRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      {qtyFormatted ? (
                        <Text style={styles.ingredientQty}>{qtyFormatted}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Section Étapes */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Étapes ({recipe.steps?.length || 0})
                </Text>
              </View>
              <View style={styles.stepsList}>
                {(recipe.steps || []).map((step, idx) => (
                  <View key={step.id || idx} style={styles.stepRow}>
                    <View style={styles.stepNumberBadge}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step.instruction}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirmImport(recipe)}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Ajouter à mes recettes</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              {onCustomize && (
                <TouchableOpacity
                  style={styles.customizeBtn}
                  onPress={() => onCustomize(recipe)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.customizeBtnText}>{"Modifier avant d'ajouter"}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Ignorer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 24,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  coverImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
  },
  recipeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  noteLabel: {
    fontWeight: '700',
    color: colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ingredientsList: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  ingredientQty: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stepsList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customizeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
}));
