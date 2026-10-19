import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Share,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { Colors, Shadows } from '../theme/colors';
import { StarRating } from '../components/StarRating';
import { formatDuration, getRatingLabel, scaleQuantity } from '../utils/helpers';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateRating: (id: string, rating: number, userNote?: string) => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateRating,
}) => {
  // Nombre de portions ajustables dynamiquement
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 4);

  // Synchronise lorsque la recette change
  React.useEffect(() => {
    setCurrentServings(recipe.servings || 4);
  }, [recipe.id, recipe.servings]);

  // Checklists locales pour la session de cuisine
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Modal pour modifier l'astuce / commentaire
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState(recipe.userNote || '');

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStepCheck = (id: string) => {
    setCheckedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShare = async () => {
    try {
      const ingredientList = recipe.ingredients
        .map((i) => {
          const scaled = scaleQuantity(i.quantity, recipe.servings || 4, currentServings);
          return `• ${i.name} ${scaled ? `(${scaled} ${i.unit || ''})` : ''}`;
        })
        .join('\n');
      const message = `Recette Papilles : ${recipe.title} (${currentServings} pers.)\n\nIngrédients :\n${ingredientList}\n\nTemps total : ${formatDuration(recipe.prepTimeMinutes + recipe.cookTimeMinutes)} - Note : ${recipe.rating}/5 ⭐`;

      await Share.share({
        message,
        title: recipe.title,
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const handleDeleteConfirm = () => {
    Alert.alert(
      'Supprimer la recette',
      `Êtes-vous sûr de vouloir supprimer "${recipe.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete(recipe.id),
        },
      ]
    );
  };

  const handleSaveNote = () => {
    onUpdateRating(recipe.id, recipe.rating, noteText.trim());
    setIsNoteModalVisible(false);
  };

  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Floating Navigation Header */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={onBack} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => onToggleFavorite(recipe.id)} style={styles.navBtn}>
              <Ionicons
                name={recipe.isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={recipe.isFavorite ? Colors.heart : Colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
              <Ionicons name="share-social-outline" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(recipe)} style={styles.navBtn}>
              <Ionicons name="create-outline" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteConfirm} style={styles.navBtn}>
              <Ionicons name="trash-outline" size={22} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Image */}
          <View style={styles.imageWrapper}>
            {recipe.imageUrl && recipe.imageUrl.trim().length > 0 ? (
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImagePlaceholder}>
                <Ionicons name="restaurant-outline" size={54} color={Colors.primary + '55'} />
              </View>
            )}
            <View style={styles.heroBadgesRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{recipe.category}</Text>
              </View>
              {recipe.isVegetarian && (
                <View style={styles.vegeHeroPill}>
                  <Ionicons name="leaf" size={13} color="#FFFFFF" />
                  <Text style={styles.vegeHeroPillText}>🌱 Végétarien</Text>
                </View>
              )}
            </View>
          </View>

          {/* Title & Description */}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{recipe.title}</Text>
            {recipe.description ? (
              <Text style={styles.description}>{recipe.description}</Text>
            ) : null}
          </View>

          {/* Interactive Rating Section */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeaderRow}>
              <View>
                <Text style={styles.ratingCardTitle}>Évaluation & Note</Text>
                <Text style={styles.ratingCardSubtitle}>
                  {getRatingLabel(recipe.rating)} ({recipe.rating > 0 ? recipe.rating.toFixed(1) : '0'}/5)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsNoteModalVisible(true)}
                style={styles.editNoteBtn}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.primary} />
                <Text style={styles.editNoteBtnText}>Astuce</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.starRow}>
              <StarRating
                rating={recipe.rating}
                size={32}
                interactive={true}
                onRatingChange={(newRating) => onUpdateRating(recipe.id, newRating)}
              />
            </View>

            {recipe.userNote ? (
              <View style={styles.chefNoteBox}>
                <Ionicons name="bulb-outline" size={18} color={Colors.amber} style={styles.chefNoteIcon} />
                <Text style={styles.chefNoteText}>{recipe.userNote}</Text>
              </View>
            ) : null}
          </View>

          {/* Key Facts / Metadata Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Ionicons name="hourglass-outline" size={20} color={Colors.primary} />
              <Text style={styles.metaValue}>{formatDuration(recipe.prepTimeMinutes)}</Text>
              <Text style={styles.metaLabel}>Préparation</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="flame-outline" size={20} color={Colors.primary} />
              <Text style={styles.metaValue}>{formatDuration(recipe.cookTimeMinutes)}</Text>
              <Text style={styles.metaLabel}>Cuisson</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <Text style={styles.metaValue}>{currentServings}</Text>
              <Text style={styles.metaLabel}>Portions</Text>
            </View>
            <View style={styles.metaCell}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
              <Text style={styles.metaValue}>{recipe.difficulty}</Text>
              <Text style={styles.metaLabel}>Difficulté</Text>
            </View>
          </View>

          {/* Ingredients Section with Dynamic Servings Stepper */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Ingrédients ({recipe.ingredients.length})
                </Text>

                {/* Stepper de portions interactif */}
                <View style={styles.servingsSelector}>
                  <TouchableOpacity
                    onPress={() => setCurrentServings((prev) => Math.max(1, prev - 1))}
                    style={styles.servingsStepBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color={Colors.primary} />
                  </TouchableOpacity>

                  <View style={styles.servingsCountBox}>
                    <Ionicons name="people" size={13} color={Colors.primary} style={styles.servingsIcon} />
                    <Text style={styles.servingsCountText}>{currentServings} pers.</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setCurrentServings((prev) => prev + 1)}
                    style={styles.servingsStepBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sectionSubRow}>
                <Text style={styles.sectionHint}>
                  {currentServings !== recipe.servings
                    ? `Quantités recalculées pour ${currentServings} personnes`
                    : 'Cochez au fil de la recette'}
                </Text>
                {currentServings !== recipe.servings && (
                  <TouchableOpacity
                    onPress={() => setCurrentServings(recipe.servings || 4)}
                    style={styles.resetServingsBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={12} color={Colors.primary} />
                    <Text style={styles.resetServingsText}>
                      Rétablir ({recipe.servings} p.)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {recipe.ingredients.map((ing) => {
              const isChecked = !!checkedIngredients[ing.id];
              const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, currentServings);
              const isScaled = currentServings !== recipe.servings && !!ing.quantity;

              return (
                <TouchableOpacity
                  key={ing.id}
                  style={[styles.ingredientRow, isChecked && styles.rowChecked]}
                  onPress={() => toggleIngredientCheck(ing.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isChecked ? Colors.secondary : Colors.border}
                    style={styles.checkIcon}
                  />
                  <Text
                    style={[
                      styles.ingredientName,
                      isChecked && styles.textChecked,
                    ]}
                  >
                    {ing.name}
                  </Text>
                  {scaledQty ? (
                    <Text
                      style={[
                        styles.ingredientQty,
                        isScaled && styles.ingredientQtyScaled,
                        isChecked && styles.textChecked,
                      ]}
                    >
                      {scaledQty} {ing.unit || ''}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Steps Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Préparation ({recipe.steps.length} étapes)
              </Text>
            </View>

            {recipe.steps.map((step, index) => {
              const isChecked = !!checkedSteps[step.id];
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[styles.stepRow, isChecked && styles.rowChecked]}
                  onPress={() => toggleStepCheck(step.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.stepNumberBadge, isChecked && styles.stepNumberChecked]}>
                    <Text style={[styles.stepNumberText, isChecked && styles.stepNumberTextChecked]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepInstruction,
                      isChecked && styles.textChecked,
                    ]}
                  >
                    {step.instruction}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Modal Modification Astuce */}
        <Modal
          visible={isNoteModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsNoteModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Astuce ou note personnelle</Text>
              <Text style={styles.modalSubtitle}>
                Ajoutez vos secrets de cuisson ou remarques pour cette recette.
              </Text>

              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Ex: Remplacer le beurre par de l'huile de sésame..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsNoteModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveNote}
                >
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    gap: 10,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageWrapper: {
    height: 250,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
  },
  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  heroBadgesRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Shadows.small,
  },
  vegeHeroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Shadows.small,
  },
  vegeHeroPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  headerInfo: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ratingCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  ratingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ratingCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ratingCardSubtitle: {
    fontSize: 13,
    color: Colors.amber,
    fontWeight: '600',
    marginTop: 2,
  },
  editNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  editNoteBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  starRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chefNoteBox: {
    flexDirection: 'row',
    backgroundColor: Colors.amberLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  chefNoteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  chefNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-around',
    ...Shadows.small,
  },
  metaCell: {
    alignItems: 'center',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  servingsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  servingsStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  servingsCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  servingsIcon: {
    marginRight: 2,
  },
  servingsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sectionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  resetServingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetServingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowChecked: {
    opacity: 0.6,
  },
  checkIcon: {
    marginRight: 10,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  ingredientQty: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  ingredientQtyScaled: {
    color: '#D97706',
    fontWeight: '700',
  },
  textChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberChecked: {
    backgroundColor: Colors.secondaryLight,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  stepNumberTextChecked: {
    color: Colors.secondary,
  },
  stepInstruction: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Shadows.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: Colors.surfaceAlt,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
