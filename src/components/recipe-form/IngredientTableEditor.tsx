import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Ingredient } from '../../types/recipe';
import { CanonicalIngredient } from '../../types/vocabulary';
import { UnifiedIngredientInput } from '../UnifiedIngredientInput';
import { UnitQuickPicker } from '../UnitQuickPicker';
import { UnifiedIngredientService } from '../../services/unifiedIngredientService';
import { findAutoMatchCandidate } from '../../utils/recipeLinkMatcher';
import { useTheme } from '../../theme/ThemeContext';
import { Colors } from '../../theme/colors';
import { styles } from '../../screens/RecipeFormScreen.styles';

export interface IngredientTableEditorProps {
  ingredients: Ingredient[];
  onAddIngredient: () => void;
  onUpdateIngredient: (index: number, field: keyof Ingredient, val: any) => void;
  onSelectCanonicalIngredient: (index: number, canon: CanonicalIngredient, details?: any) => void;
  onRemoveIngredient: (index: number) => void;
  onToggleIngredientStaple: (index: number) => void;
  onToggleIngredientOptional: (index: number) => void;
  onOpenLinkModal: (index: number) => void;
  onRequestQualify: (index: number, rawName: string) => void;
  onOpenUnitModal: (index: number) => void;
  availableRecipes: Recipe[];
  currentRecipeId?: string;
}

export const IngredientTableEditor: React.FC<IngredientTableEditorProps> = ({
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onSelectCanonicalIngredient,
  onRemoveIngredient,
  onToggleIngredientStaple,
  onToggleIngredientOptional,
  onOpenLinkModal,
  onRequestQualify,
  onOpenUnitModal,
  availableRecipes,
  currentRecipeId,
}) => {
  const { colors } = useTheme();
  const [activeIngIndex, setActiveIngIndex] = useState<number | null>(null);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Ingrédients ({ingredients.length})</Text>
        <TouchableOpacity onPress={onAddIngredient} style={styles.addItemBtn}>
          <Ionicons name="add-circle" size={18} color={Colors.primary} />
          <Text style={styles.addItemBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* En-têtes de colonnes Nom | Quantité | Unité */}
      {ingredients.length > 0 && (
        <View style={styles.ingredientColumnsHeader}>
          <Text style={[styles.columnHeaderLabel, styles.colNomHeader]}>Nom</Text>
          <Text style={[styles.columnHeaderLabel, styles.colQtyHeader]}>Quantité</Text>
          <Text style={[styles.columnHeaderLabel, styles.colUnitHeader]}>Unité</Text>
          <View style={styles.colActionSpacer} />
        </View>
      )}

      {ingredients.map((ing, index) => (
        <View
          key={ing.id}
          style={[
            styles.ingredientCard,
            {
              zIndex: activeIngIndex === index ? 9999 : (ingredients.length - index) * 10,
              elevation: activeIngIndex === index ? 20 : (ingredients.length - index),
            },
          ]}
        >
          <View style={styles.ingredientEditRow}>
            <UnifiedIngredientInput
              containerStyle={styles.ingNameContainer}
              style={[styles.textInput, styles.ingNameInput]}
              value={ing.name}
              onChangeText={(val) => onUpdateIngredient(index, 'name', val)}
              onSelectIngredient={(canon, details) => onSelectCanonicalIngredient(index, canon, details)}
              onAutoExtractedDetails={(extracted) => {
                if (extracted.quantity && !ing.quantity) {
                  onUpdateIngredient(index, 'quantity', extracted.quantity);
                }
                if (extracted.unit && !ing.unit) {
                  onUpdateIngredient(index, 'unit', extracted.unit);
                }
              }}
              placeholder="Ex: Farine"
              placeholderTextColor={colors.textMuted}
              context="recipe"
              onRequestQualify={(raw) => onRequestQualify(index, raw)}
              onFocus={() => setActiveIngIndex(index)}
              onBlur={() => setActiveIngIndex(null)}
            />
            <TextInput
              style={[styles.textInput, styles.ingQtyInput]}
              value={ing.quantity ? String(ing.quantity) : ''}
              onChangeText={(val) => onUpdateIngredient(index, 'quantity', val)}
              placeholder="200"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              onFocus={() => setActiveIngIndex(index)}
            />
            <View style={styles.ingUnitInputWrapper}>
              <TextInput
                style={[styles.textInput, styles.ingUnitInput]}
                value={ing.unit || ''}
                onChangeText={(val) => onUpdateIngredient(index, 'unit', val)}
                placeholder="g"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                onFocus={() => setActiveIngIndex(index)}
              />
              <TouchableOpacity
                style={styles.unitPickerTriggerBtn}
                onPress={() => onOpenUnitModal(index)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                accessibilityLabel="Choisir une unité"
              >
                <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => onRemoveIngredient(index)}
              style={styles.deleteRowBtn}
              accessibilityLabel="Supprimer cet ingrédient"
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>

          {/* Puces d'accès rapide aux unités si cette ligne est active */}
          {activeIngIndex === index && (
            <View style={styles.recipeUnitQuickRow}>
              <UnitQuickPicker
                value={ing.unit}
                onChangeUnit={(val) => onUpdateIngredient(index, 'unit', val)}
                onOpenFullPicker={() => onOpenUnitModal(index)}
                compact
              />
            </View>
          )}

          {/* Organisation par sections (Livre de Chef) */}
          <View style={styles.ingredientFlagsRow}>
            {/* Badge statut Lexique */}
            {ing.name.trim().length >= 2 && (
              Boolean(ing.canonicalId || UnifiedIngredientService.resolveRecognizedIngredient(ing.name).isRecognized) ? (
                <View style={styles.lexiconBadgeOk}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                  <Text style={styles.lexiconBadgeOkText}>Lexique</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.lexiconBadgeWarn}
                  onPress={() => onRequestQualify(index, ing.name.trim())}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.amber} />
                  <Text style={styles.lexiconBadgeWarnText}>À qualifier</Text>
                </TouchableOpacity>
              )
            )}

            <TouchableOpacity
              style={[
                styles.flagChip,
                ing.isPantryStaple && styles.flagChipActiveStaple,
              ]}
              onPress={() => onToggleIngredientStaple(index)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="archive-outline"
                size={12}
                color={ing.isPantryStaple ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.flagChipText,
                  ing.isPantryStaple && styles.flagChipTextActiveStaple,
                ]}
              >
                {ing.isPantryStaple ? 'En placard' : '+ Placard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.flagChip,
                ing.isOptional && styles.flagChipActiveOptional,
              ]}
              onPress={() => onToggleIngredientOptional(index)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="sparkles-outline"
                size={12}
                color={ing.isOptional ? '#D97706' : colors.textMuted}
              />
              <Text
                style={[
                  styles.flagChipText,
                  ing.isOptional && styles.flagChipTextActiveOptional,
                ]}
              >
                {ing.isOptional ? 'En finition' : '+ Finition'}
              </Text>
            </TouchableOpacity>

            {/* Puce Recette Liée (Sous-recette / Fait maison) */}
            {(() => {
              const manualRecipe =
                ing.linkedRecipeId && ing.linkedRecipeId !== 'none'
                  ? availableRecipes.find((r) => r.id === ing.linkedRecipeId)
                  : null;
              const isNone = ing.linkedRecipeId === 'none';
              const autoCandidate = !ing.linkedRecipeId
                ? findAutoMatchCandidate(ing.name, availableRecipes, currentRecipeId)
                : null;

              if (manualRecipe) {
                return (
                  <TouchableOpacity
                    style={[styles.flagChip, styles.flagChipActiveLinked]}
                    onPress={() => onOpenLinkModal(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="link" size={12} color={colors.primary} />
                    <Text
                      style={[styles.flagChipText, styles.flagChipTextActiveLinked]}
                      numberOfLines={1}
                    >
                      {manualRecipe.title}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (isNone) {
                return (
                  <TouchableOpacity
                    style={styles.flagChip}
                    onPress={() => onOpenLinkModal(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ban-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.flagChipText}>Pas de lien</Text>
                  </TouchableOpacity>
                );
              }

              if (autoCandidate) {
                return (
                  <TouchableOpacity
                    style={[styles.flagChip, styles.flagChipAutoLinked]}
                    onPress={() => onOpenLinkModal(index)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                    <Text
                      style={[styles.flagChipText, styles.flagChipTextAutoLinked]}
                      numberOfLines={1}
                    >
                      Lien : {autoCandidate.title}
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.flagChip}
                  onPress={() => onOpenLinkModal(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.flagChipText}>+ Lier recette</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      ))}
    </View>
  );
};
