import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Recipe, Category, Difficulty, Ingredient, RecipeStep } from '../types/recipe';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { StarRating } from '../components/StarRating';
import { generateUniqueId } from '../utils/helpers';
import { IngredientAutocompleteInput } from '../components/IngredientAutocompleteInput';
import { VocabularyService } from '../services/vocabularyService';


interface RecipeFormScreenProps {
  initialRecipe?: Recipe | null;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

const CATEGORIES: Category[] = [
  'Plat',
  'Entrée',
  'Dessert',
  'Apéritif',
  'Petit-déjeuner',
  'Boisson',
];

const DIFFICULTIES: Difficulty[] = ['Facile', 'Moyen', 'Difficile'];

const PRESET_IMAGES = [
  { label: 'Pâtes', url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80' },
  { label: 'Gourmand', url: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Salade/Avocat', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
  { label: 'Curry/Épices', url: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80' },
  { label: 'Chocolat', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Tarte/Gâteau', url: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=800&q=80' },
];

export const RecipeFormScreen: React.FC<RecipeFormScreenProps> = ({
  initialRecipe,
  onSave,
  onCancel,
}) => {
  const { isDark, colors } = useTheme();
  const isEditing = !!initialRecipe;

  // Form states
  const [title, setTitle] = useState(initialRecipe?.title || '');
  const [description, setDescription] = useState(initialRecipe?.description || '');
  const [category, setCategory] = useState<Category>(initialRecipe?.category || 'Plat');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRecipe?.difficulty || 'Facile');
  const [prepTime, setPrepTime] = useState(initialRecipe?.prepTimeMinutes?.toString() || '15');
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTimeMinutes?.toString() || '20');
  const [servings, setServings] = useState(initialRecipe?.servings || 4);
  const [rating, setRating] = useState(
    initialRecipe?.rating !== undefined ? initialRecipe.rating : 4
  );
  const [isVegetarian, setIsVegetarian] = useState(initialRecipe?.isVegetarian ?? false);
  const [userNote, setUserNote] = useState(initialRecipe?.userNote || '');
  const [imageUrl, setImageUrl] = useState(
    initialRecipe?.imageUrl ||
      'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=80'
  );
  const [availableImages, setAvailableImages] = useState<string[]>(
    initialRecipe?.availableImages && initialRecipe.availableImages.length > 0
      ? initialRecipe.availableImages
      : initialRecipe?.imageUrl && !initialRecipe.imageUrl.includes('unsplash.com')
      ? [initialRecipe.imageUrl]
      : []
  );

  // Ingredients state
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialRecipe?.ingredients || [
      { id: 'ing_1', name: '', quantity: '', unit: '' },
    ]
  );

  // Steps state
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialRecipe?.steps || [
      { id: 'stp_1', order: 1, instruction: '' },
    ]
  );

  // Image picker
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la galerie pour choisir une photo.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Erreur sélection image:', e);
    }
  };

  // Ingredients handlers
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: generateUniqueId('ing'), name: '', quantity: '', unit: '' },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) {
      setIngredients([{ id: generateUniqueId('ing'), name: '', quantity: '', unit: '' }]);
      return;
    }
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Steps handlers
  const handleAddStep = () => {
    setSteps([
      ...steps,
      { id: generateUniqueId('stp'), order: steps.length + 1, instruction: '' },
    ]);
  };

  const handleUpdateStep = (index: number, instruction: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], instruction };
    setSteps(updated);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setSteps([{ id: generateUniqueId('stp'), order: 1, instruction: '' }]);
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    const reordered = filtered.map((step, idx) => ({ ...step, order: idx + 1 }));
    setSteps(reordered);
  };

  // Save validation
  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Titre manquant', 'Veuillez saisir au moins un titre pour la recette.');
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim().length > 0);
    if (validIngredients.length === 0) {
      Alert.alert('Ingrédient requis', 'Veuillez renseigner au moins un ingrédient.');
      return;
    }

    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);
    if (validSteps.length === 0) {
      Alert.alert('Étape requise', 'Veuillez renseigner au moins une étape de préparation.');
      return;
    }

    const recipe: Recipe = {
      id: initialRecipe?.id || generateUniqueId('rec'),
      title: title.trim(),

      description: description.trim(),
      category,
      difficulty,
      prepTimeMinutes: parseInt(prepTime, 10) || 10,
      cookTimeMinutes: parseInt(cookTime, 10) || 0,
      servings: Math.max(1, servings),
      rating,
      isVegetarian,
      userNote: userNote.trim() || undefined,
      imageUrl: imageUrl.trim(),
      availableImages: availableImages.length > 0 ? availableImages : undefined,
      isFavorite: initialRecipe?.isFavorite || false,
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ingredients: validIngredients,
      steps: validSteps.map((s, idx) => ({ ...s, order: idx + 1 })),
    };

    // Enregistrement silencieux et incrémentation de l'usage dans le vocabulaire
    // Si un ingrédient était un synonyme d'un autre, il est promu délibérément en ingrédient canonique distinct
    validIngredients.forEach((ing) => {
      const clean = ing.name.trim();
      VocabularyService.incrementUsage(clean).catch(() => {});
      VocabularyService.promoteAliasToCanonical(clean).catch(() => {});
    });

    onSave(recipe);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Modifier la recette' : 'Nouvelle recette'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photo de la recette</Text>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.changeImageBtnText}>Choisir une photo</Text>
              </TouchableOpacity>
            </View>

            {/* Photos Marmiton disponibles pour la couverture */}
            {availableImages.length > 0 && (
              <View style={styles.candidateBlock}>
                <View style={styles.candidateHeaderRow}>
                  <Ionicons name="images" size={16} color={Colors.primary} />
                  <Text style={styles.candidateHeaderTitle}>
                    Photos Marmiton disponibles ({availableImages.length}) :
                  </Text>
                </View>
                <Text style={styles.candidateSubtitle}>
                  Touchez une photo pour la définir comme image de couverture
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.candidateScroll}>
                  {availableImages.map((imgUrl, idx) => {
                    const isSelected = imageUrl === imgUrl;
                    return (
                      <TouchableOpacity
                        key={`avail_img_${idx}`}
                        style={[
                          styles.candidateThumb,
                          isSelected && styles.candidateThumbSelected,
                        ]}
                        onPress={() => setImageUrl(imgUrl)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: imgUrl }} style={styles.candidateImage} />
                        {isSelected && (
                          <View style={styles.candidateCheckBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
                        <Text
                          style={[
                            styles.candidateThumbLabel,
                            isSelected && styles.candidateThumbLabelSelected,
                          ]}
                        >
                          Photo {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Presets rapides d'images */}
            <Text style={styles.subLabel}>Ou choisissez parmi nos photos gourmandes :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
              {PRESET_IMAGES.map((preset, idx) => (
                <TouchableOpacity
                  key={`preset_${idx}`}
                  style={[
                    styles.presetThumb,
                    imageUrl === preset.url && styles.presetThumbSelected,
                  ]}
                  onPress={() => setImageUrl(preset.url)}
                >
                  <Image source={{ uri: preset.url }} style={styles.presetImage} />
                  <Text style={styles.presetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Informations générales */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Informations générales</Text>

            <Text style={styles.inputLabel}>Titre de la recette *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Tarte aux fraises maison..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description / Histoire</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Une pâte croustillante avec crème pâtissière..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Catégorie */}
            <Text style={styles.inputLabel}>Catégorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowPills}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, category === cat && styles.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Option Végétarien */}
            <Text style={styles.inputLabel}>Régime alimentaire</Text>
            <TouchableOpacity
              style={[styles.vegeToggleCard, isVegetarian && styles.vegeToggleCardActive]}
              onPress={() => setIsVegetarian(!isVegetarian)}
              activeOpacity={0.75}
            >
              <View style={[styles.vegeCheckbox, isVegetarian && styles.vegeCheckboxActive]}>
                {isVegetarian && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.vegeLabelWrapper}>
                <View style={styles.vegeTitleRow}>
                  <Text style={[styles.vegeTitle, isVegetarian && styles.vegeTitleActive]}>
                    🌱 Recette végétarienne
                  </Text>
                  {isVegetarian && (
                    <View style={styles.vegeActiveBadge}>
                      <Text style={styles.vegeActiveBadgeText}>Végé</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.vegeSubtitle}>
                  Sans viande, volaille, poisson ni fruits de mer
                </Text>
              </View>
            </TouchableOpacity>

            {/* Difficulté */}
            <Text style={styles.inputLabel}>Difficulté</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTIES.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[styles.diffBtn, difficulty === diff && styles.diffBtnActive]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[styles.diffBtnText, difficulty === diff && styles.diffBtnTextActive]}>
                    {diff}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Temps et Portions */}
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Prépa (min)</Text>
                <TextInput
                  style={styles.textInput}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Cuisson (min)</Text>
                <TextInput
                  style={styles.textInput}
                  value={cookTime}
                  onChangeText={setCookTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.inputLabel}>Portions</Text>
                <View style={styles.servingsControl}>
                  <TouchableOpacity
                    onPress={() => setServings(Math.max(1, servings - 1))}
                    style={styles.servingBtn}
                  >
                    <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.servingsValue}>{servings}</Text>
                  <TouchableOpacity
                    onPress={() => setServings(servings + 1)}
                    style={styles.servingBtn}
                  >
                    <Ionicons name="add" size={16} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Note & Appréciation */}
            <Text style={styles.inputLabel}>Note de la recette ({rating}/5)</Text>
            <View style={styles.starBox}>
              <StarRating
                rating={rating}
                size={28}
                interactive={true}
                onRatingChange={setRating}
                showScore={true}
                showClear={rating > 0}
              />
            </View>

            {/* Astuce secrète */}
            <Text style={styles.inputLabel}>Astuce secrète du chef (optionnel)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={userNote}
              onChangeText={setUserNote}
              placeholder="Ex: Ajouter une pincée de sel dans les blancs en neige..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Ingrédients */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Ingrédients ({ingredients.length})</Text>
              <TouchableOpacity onPress={handleAddIngredient} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {ingredients.map((ing, index) => (
              <View
                key={ing.id}
                style={[
                  styles.ingredientEditRow,
                  { zIndex: (ingredients.length - index) * 10 },
                ]}
              >
                <IngredientAutocompleteInput
                  containerStyle={{ flex: 3 }}
                  style={[styles.textInput, { width: '100%', marginBottom: 0 }]}
                  value={ing.name}
                  onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
                  onAutoExtractedDetails={(extracted) => {
                    if (extracted.quantity && !ing.quantity) {
                      handleUpdateIngredient(index, 'quantity', extracted.quantity);
                    }
                    if (extracted.unit && !ing.unit) {
                      handleUpdateIngredient(index, 'unit', extracted.unit);
                    }
                  }}
                  placeholder="Nom (ex: Farine)"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={[styles.textInput, styles.ingQtyInput]}
                  value={ing.quantity}
                  onChangeText={(val) => handleUpdateIngredient(index, 'quantity', val)}
                  placeholder="Qté (ex: 200)"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={[styles.textInput, styles.ingUnitInput]}
                  value={ing.unit}
                  onChangeText={(val) => handleUpdateIngredient(index, 'unit', val)}
                  placeholder="Unité (g, ml)"
                  placeholderTextColor={Colors.textMuted}
                />
                <TouchableOpacity
                  onPress={() => handleRemoveIngredient(index)}
                  style={styles.deleteRowBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Étapes de préparation */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Étapes ({steps.length})</Text>
              <TouchableOpacity onPress={handleAddStep} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={18} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Ajouter une étape</Text>
              </TouchableOpacity>
            </View>

            {steps.map((step, index) => (
              <View key={step.id} style={styles.stepEditRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.stepInput]}
                  value={step.instruction}
                  onChangeText={(val) => handleUpdateStep(index, val)}
                  placeholder={`Description de l'étape ${index + 1}...`}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <TouchableOpacity
                  onPress={() => handleRemoveStep(index)}
                  style={styles.deleteRowBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    padding: 6,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  section: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceAlt,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  changeImageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetThumb: {
    width: 76,
    marginRight: 10,
    alignItems: 'center',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetThumbSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  presetImage: {
    width: 68,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  presetText: {
    fontSize: 10,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  rowPills: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  diffBtnActive: {
    backgroundColor: Colors.secondaryLight,
    borderColor: Colors.secondary,
  },
  diffBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  diffBtnTextActive: {
    color: Colors.secondary,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  gridCol: {
    flex: 1,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
    paddingHorizontal: 6,
  },
  servingBtn: {
    padding: 6,
  },
  servingsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  starBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemBtnText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  ingredientEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  ingNameInput: {
    flex: 3,
  },
  ingQtyInput: {
    flex: 1.5,
  },
  ingUnitInput: {
    flex: 1.5,
  },
  deleteRowBtn: {
    padding: 8,
  },
  stepEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  stepInput: {
    flex: 1,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  vegeToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  vegeToggleCardActive: {
    backgroundColor: colors.isDark ? '#143823' : '#F0FDF4',
    borderColor: colors.isDark ? '#2E7D52' : '#86EFAC',
  },
  vegeCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vegeCheckboxActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  vegeLabelWrapper: {
    flex: 1,
  },
  vegeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  vegeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vegeTitleActive: {
    color: colors.isDark ? '#4ADE80' : '#15803D',
  },
  vegeActiveBadge: {
    backgroundColor: colors.isDark ? '#143823' : '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vegeActiveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.isDark ? '#4ADE80' : '#16A34A',
  },
  vegeSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  candidateBlock: {
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  candidateHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.isDark ? colors.primary : colors.primaryDark,
  },
  candidateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  candidateScroll: {
    flexDirection: 'row',
  },
  candidateThumb: {
    width: 90,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.cardBackground,
    position: 'relative',
  },
  candidateThumbSelected: {
    borderColor: colors.primary,
    ...shadows.small,
  },
  candidateImage: {
    width: '100%',
    height: 64,
    borderRadius: 8,
  },
  candidateCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#16A34A',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  candidateThumbLabel: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  candidateThumbLabelSelected: {
    color: '#16A34A',
    fontWeight: '700',
  },
}));
