import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Ingredient } from '../../types/recipe';
import { useTheme } from '../../theme/ThemeContext';
import { Colors } from '../../theme/colors';
import { scaleQuantity, normalizeString } from '../../utils/helpers';
import { formatQuantityWithUnit } from '../../constants/units';
import { VocabularyService } from '../../services/vocabularyService';
import {
  ConversionMode,
  convertIngredientQuantity,
  isIngredientConvertible,
} from '../../utils/unitConverter';
import { RecipeStockEvaluation } from '../../utils/stockMatcher';
import { RecipeServingsController } from './RecipeServingsController';
import { styles } from '../../screens/RecipeDetailScreen.styles';

export interface IngredientGroup {
  key: string;
  title: string;
  subtitle?: string;
  iconName?: string;
  items: Ingredient[];
}

export interface RecipeIngredientsListProps {
  recipe: Recipe;
  currentServings: number;
  onServingsChange: (servings: number) => void;
  stockEvaluation: RecipeStockEvaluation | null;
  stockItemsLength: number;
  globalConversionMode: ConversionMode;
  onCycleGlobalConversion: () => void;
  ingredientGroups: { hasSubsections: boolean; groups: IngredientGroup[] };
  checkedIngredients: Record<string, boolean>;
  onToggleIngredientCheck: (id: string) => void;
  ingredientModes: Record<string, ConversionMode>;
  onCycleIngredientUnit: (ing: Ingredient) => void;
  allergenIngredientIdsSet: Set<string>;
  linkedPreparations: { ingredient: Ingredient; linkedRecipe: Recipe }[];
  linkedRecipesMap: Map<string, Recipe>;
  onOpenLinkedRecipe?: (recipeId: string) => void;
  onSosRequest?: (ingredientName: string) => void;
  sosLoadingIngredient?: string | null;
}

export const RecipeIngredientsList: React.FC<RecipeIngredientsListProps> = ({
  recipe,
  currentServings,
  onServingsChange,
  stockEvaluation,
  stockItemsLength,
  globalConversionMode,
  onCycleGlobalConversion,
  ingredientGroups,
  checkedIngredients,
  onToggleIngredientCheck,
  ingredientModes,
  onCycleIngredientUnit,
  allergenIngredientIdsSet,
  linkedPreparations,
  linkedRecipesMap,
  onOpenLinkedRecipe,
  onSosRequest,
  sosLoadingIngredient,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionCard}>
      {/* Titre Ingrédients avec micro-indicateur de stock accolé */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>
            Ingrédients ({recipe.ingredients.length})
            {stockEvaluation && stockItemsLength > 0 && stockEvaluation.totalEssentialCount > 0 ? (
              <Text style={[styles.stockMicroBadge, stockEvaluation.isDoable && styles.stockMicroBadgeReady]}>
                {` • ${Math.round(stockEvaluation.matchPercentage)}% en stock`}
              </Text>
            ) : null}
          </Text>
        </View>

        {/* Ligne technique discrète : portions & conversion d'unités */}
        <RecipeServingsController
          currentServings={currentServings}
          originalServings={recipe.servings || 4}
          onServingsChange={onServingsChange}
          globalConversionMode={globalConversionMode}
          onCycleGlobalConversion={onCycleGlobalConversion}
        />
      </View>

      {/* Préparations maison associées (ex: pâte brisée maison pour une quiche) */}
      {linkedPreparations.length > 0 && (
        <View style={styles.linkedPreparationsCard}>
          <View style={styles.linkedPreparationsHeader}>
            <Ionicons name="restaurant-outline" size={15} color={colors.primary} />
            <Text style={styles.linkedPreparationsTitle}>
              Préparation{linkedPreparations.length > 1 ? 's' : ''} maison associée{linkedPreparations.length > 1 ? 's' : ''} ({linkedPreparations.length})
            </Text>
          </View>
          {linkedPreparations.map(({ ingredient, linkedRecipe }) => (
            <TouchableOpacity
              key={`prep_${ingredient.id}_${linkedRecipe.id}`}
              style={styles.linkedPreparationItem}
              onPress={() => onOpenLinkedRecipe?.(linkedRecipe.id)}
              activeOpacity={0.7}
            >
              {linkedRecipe.imageUrl ? (
                <Image source={{ uri: linkedRecipe.imageUrl }} style={styles.linkedPrepThumb} />
              ) : (
                <View style={[styles.linkedPrepThumb, styles.linkedPrepThumbPlaceholder]}>
                  <Ionicons name="restaurant-outline" size={16} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.linkedPrepTextCol}>
                <Text style={styles.linkedPrepTitle} numberOfLines={1}>
                  {linkedRecipe.title}
                </Text>
                <Text style={styles.linkedPrepSub} numberOfLines={1}>
                  Pour l’ingrédient « {ingredient.name} »
                </Text>
              </View>
              <View style={styles.linkedPrepAction}>
                <Text style={styles.linkedPrepActionText}>Voir</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {ingredientGroups.groups.map((group) => (
        <View key={`ing_group_${group.key}`} style={styles.ingredientGroupBlock}>
          {group.title ? (
            <View style={styles.ingredientGroupHeader}>
              <View style={styles.ingredientGroupHeaderTop}>
                {group.iconName && (
                  <Ionicons
                    name={group.iconName as any}
                    size={13}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text style={styles.ingredientGroupTitle}>{group.title}</Text>
              </View>
              {group.subtitle ? (
                <Text style={styles.ingredientGroupSubtitle}>{group.subtitle}</Text>
              ) : null}
            </View>
          ) : null}

          {group.items.map((ing) => {
            const isChecked = !!checkedIngredients[ing.id];
            const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, currentServings);
            const isScaled = currentServings !== recipe.servings && !!ing.quantity;
            const isAllergen = allergenIngredientIdsSet.has(ing.id) || allergenIngredientIdsSet.has(normalizeString(ing.name));
            const linkedRecipe = linkedRecipesMap.get(ing.id);
            const isMissing = stockEvaluation?.missingIngredients.some((missingIng) => missingIng.id === ing.id) ?? false;

            // Calcul de conversion d'unité culinaire
            const effectiveMode = ingredientModes[ing.id] ?? globalConversionMode;
            const density = VocabularyService.getDensity(ing.canonicalId || ing.name);
            const conv = convertIngredientQuantity(scaledQty, ing.unit, effectiveMode, density);
            const displayQty = conv.quantity;
            const displayUnit = conv.unit;
            const isConverted = conv.isConverted;
            const canConvert = isIngredientConvertible(scaledQty, ing.unit, density);

            return (
              <TouchableOpacity
                key={ing.id}
                style={[
                  styles.ingredientRow,
                  isChecked && styles.rowChecked,
                  isAllergen && !isChecked && styles.ingredientRowAllergen,
                ]}
                onPress={() => onToggleIngredientCheck(ing.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isChecked ? 'checkmark-circle' : isAllergen ? 'warning' : 'ellipse-outline'}
                  size={22}
                  color={isChecked ? Colors.secondary : isAllergen ? colors.danger : Colors.border}
                  style={styles.checkIcon}
                />
                <View style={styles.ingredientCol}>
                  <View style={styles.ingredientNameRow}>
                    <Text
                      style={[
                        styles.ingredientName,
                        isChecked && styles.textChecked,
                        group.key === 'pantry' && styles.ingredientNamePantry,
                        isAllergen && !isChecked && styles.ingredientNameAllergen,
                      ]}
                    >
                      {ing.name}
                    </Text>
                    {isAllergen && !isChecked && (
                      <View style={[styles.allergenInlineTag, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                        <Text style={[styles.allergenInlineTagText, { color: colors.danger }]}>Allergène</Text>
                      </View>
                    )}
                    {isMissing && !isChecked && onSosRequest && (
                      <TouchableOpacity
                        style={styles.sosInlineBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          onSosRequest(ing.name);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="help-buoy" size={12} color="#FFF" />
                        <Text style={styles.sosInlineBtnText}>SOS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {linkedRecipe && (
                    <TouchableOpacity
                      style={styles.linkedRecipeInlineBtn}
                      onPress={() => onOpenLinkedRecipe?.(linkedRecipe.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="book-outline" size={12} color={colors.primary} />
                      <Text style={styles.linkedRecipeInlineBtnText} numberOfLines={1}>
                        Recette maison : {linkedRecipe.title}
                      </Text>
                      <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                {scaledQty ? (
                  <TouchableOpacity
                    disabled={!canConvert}
                    onPress={() => onCycleIngredientUnit(ing)}
                    activeOpacity={canConvert ? 0.6 : 1}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.ingredientQtyBtn,
                      isConverted && styles.ingredientQtyBtnConverted,
                      canConvert && styles.ingredientQtyBtnInteractive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ingredientQty,
                        isScaled && styles.ingredientQtyScaled,
                        isChecked && styles.textChecked,
                        isConverted && styles.ingredientQtyConvertedText,
                        isAllergen && !isChecked && { color: colors.danger, fontWeight: '700' },
                      ]}
                    >
                      {formatQuantityWithUnit(displayQty, displayUnit)}
                    </Text>
                    {canConvert && (
                      <Ionicons
                        name={isConverted ? 'swap-horizontal' : 'swap-horizontal-outline'}
                        size={11}
                        color={isConverted ? colors.primary : colors.textMuted}
                        style={styles.convertIcon}
                      />
                    )}
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {/* Remplacement SOS discret si des ingrédients manquent dans le stock */}
      {stockEvaluation && stockEvaluation.missingIngredients.length > 0 && onSosRequest && (
        <View style={styles.sosDiscreetContainer}>
          <View style={styles.sosDiscreetHeader}>
            <Ionicons name="help-buoy-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.sosDiscreetTitle}>
              Besoin d’un substitut avec votre stock ?
            </Text>
          </View>
          <View style={styles.sosDiscreetChipsRow}>
            {stockEvaluation.missingIngredients.map((missingIng) => (
              <TouchableOpacity
                key={`sos_missing_${missingIng.id}`}
                style={styles.sosDiscreetChip}
                onPress={() => onSosRequest(missingIng.name)}
                disabled={!!sosLoadingIngredient}
                activeOpacity={0.75}
                accessibilityLabel={`Demander un remplacement SOS pour ${missingIng.name}`}
              >
                {sosLoadingIngredient === missingIng.name ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ transform: [{ scale: 0.65 }], marginHorizontal: 2 }}
                  />
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                    <Text style={styles.sosDiscreetChipText}>{missingIng.name}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
