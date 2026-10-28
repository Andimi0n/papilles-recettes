import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe, Ingredient } from '../../types/recipe';
import { CanonicalIngredient } from '../../types/vocabulary';
import { UnifiedIngredientInput } from '../UnifiedIngredientInput';
import { UnifiedIngredientService } from '../../services/unifiedIngredientService';
import { findAutoMatchCandidate } from '../../utils/recipeLinkMatcher';
import { useTheme } from '../../theme/ThemeContext';
import { Colors } from '../../theme/colors';
import { styles } from '../../screens/RecipeFormScreen.styles';
import { parseRecipeIngredientInput } from '../../utils/shoppingInputParser';
import {
  formatQuantityWithUnit,
  QUICK_PICK_UNITS,
  normalizeUnit,
  isStandardUnit,
} from '../../constants/units';
import { generateUniqueId } from '../../utils/helpers';

export interface IngredientTableEditorProps {
  ingredients: Ingredient[];
  onAddIngredient: (newIngredient?: Ingredient) => void;
  onUpdateIngredient: (index: number, field: keyof Ingredient, val: any) => void;
  onUpdateFullIngredient?: (index: number, newIng: Ingredient) => void;
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

/**
 * Formate l'ingrédient pour l'affichage naturel dans le champ libre (ex: "250 g Farine", "3 Œufs", "Sel")
 */
function formatIngredientForInput(name: string, quantity?: string | number, unit?: string): string {
  if (quantity !== undefined && quantity !== null && String(quantity).trim()) {
    const formattedQty = formatQuantityWithUnit(String(quantity), unit);
    return `${formattedQty} ${name}`.trim();
  }
  return name || '';
}

export const IngredientTableEditor: React.FC<IngredientTableEditorProps> = ({
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onUpdateFullIngredient,
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

  // Saisie rapide en tête (comme pour les courses)
  const [quickAddText, setQuickAddText] = useState('');

  // Cache des textes en cours de saisie par ligne (pour ne pas écraser pendant la frappe active)
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({});

  // Ajout rapide via le champ libre supérieur
  const handleQuickAdd = () => {
    const trimmed = quickAddText.trim();
    if (!trimmed) return;

    const parsed = parseRecipeIngredientInput(trimmed);
    if (!parsed.name) return;

    const newIng: Ingredient = {
      id: generateUniqueId('ing'),
      name: parsed.name,
      quantity: parsed.quantity || '',
      unit: parsed.unit || '',
      canonicalId: parsed.canonicalId,
      isPantryStaple: parsed.isPantryStaple,
      isOptional: parsed.isOptional || false,
    };

    onAddIngredient(newIng);
    setQuickAddText('');
  };

  const handleQuickUnitTap = (unitId: string) => {
    const trimmed = quickAddText.trim();
    if (!trimmed) {
      setQuickAddText(`${unitId} `);
      return;
    }
    // Si se termine déjà par un nombre (ex: "250"), colle l'unité
    if (/[0-9]+[.,]?[0-9]*$/.test(trimmed)) {
      setQuickAddText(`${trimmed}${unitId} `);
    } else {
      setQuickAddText(`${trimmed} ${unitId} `);
    }
  };

  // Validation après coup d'un ingrédient existant (détection des quantités, unités et nom canonique)
  const handleCommitIngredient = (index: number) => {
    const ing = ingredients[index];
    if (!ing) return;

    const current = localTexts[ing.id] !== undefined
      ? localTexts[ing.id]
      : formatIngredientForInput(ing.name, ing.quantity, ing.unit);

    const raw = current.trim();
    if (!raw) {
      if (onUpdateFullIngredient) {
        onUpdateFullIngredient(index, { ...ing, name: '', quantity: '', unit: '', canonicalId: undefined });
      } else {
        onUpdateIngredient(index, 'name', '');
        onUpdateIngredient(index, 'quantity', '');
        onUpdateIngredient(index, 'unit', '');
      }
      return;
    }

    const parsed = parseRecipeIngredientInput(raw);

    setLocalTexts((prev) => {
      const copy = { ...prev };
      delete copy[ing.id];
      return copy;
    });

    const updatedIng: Ingredient = {
      ...ing,
      name: parsed.name,
      quantity: parsed.quantity || '',
      unit: parsed.unit || '',
      canonicalId: parsed.canonicalId,
      isPantryStaple: ing.isPantryStaple !== undefined ? ing.isPantryStaple : parsed.isPantryStaple,
    };

    if (onUpdateFullIngredient) {
      onUpdateFullIngredient(index, updatedIng);
    } else {
      onUpdateIngredient(index, 'name', updatedIng.name);
      onUpdateIngredient(index, 'quantity', updatedIng.quantity);
      onUpdateIngredient(index, 'unit', updatedIng.unit);
    }
  };

  // Sélection d'une suggestion canonique depuis la liste déroulante
  const handleSelectCanonical = (
    index: number,
    canon: CanonicalIngredient,
    details?: { quantity?: string; unit?: string }
  ) => {
    const ing = ingredients[index];
    if (!ing) return;

    const qty = details?.quantity || ing.quantity || '';
    const un = details?.unit || ing.unit || '';

    setLocalTexts((prev) => {
      const copy = { ...prev };
      delete copy[ing.id];
      return copy;
    });

    const updatedIng: Ingredient = {
      ...ing,
      name: canon.canonicalName,
      canonicalId: canon.id,
      quantity: qty,
      unit: un,
      isPantryStaple: canon.isPantryStaple ?? ing.isPantryStaple,
    };

    if (onUpdateFullIngredient) {
      onUpdateFullIngredient(index, updatedIng);
    } else {
      onSelectCanonicalIngredient(index, canon, details);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Ingrédients ({ingredients.length})</Text>
        <TouchableOpacity onPress={() => onAddIngredient()} style={styles.addItemBtn}>
          <Ionicons name="add-circle" size={18} color={Colors.primary} />
          <Text style={styles.addItemBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Barre de saisie libre d'ingrédients (identique au système des courses) */}
      <View
        style={[
          styles.quickAddCard,
          {
            zIndex: activeIngIndex === -1 ? 9999 : 100,
            elevation: activeIngIndex === -1 ? 25 : 5,
          },
        ]}
      >
        <View style={styles.quickAddMainRow}>
          <UnifiedIngredientInput
            containerStyle={styles.quickAddInput}
            style={[styles.textInput, { marginBottom: 0 }]}
            placeholder="Ex: 250g farine, 3 œufs, sel..."
            placeholderTextColor={colors.textMuted}
            value={quickAddText}
            onChangeText={setQuickAddText}
            onFocus={() => setActiveIngIndex(-1)}
            onBlur={() => setActiveIngIndex(null)}
            context="recipe"
            returnKeyType="done"
            onSubmitEditing={handleQuickAdd}
            onSelectIngredient={(canon) => {
              const trimmed = quickAddText.trim();
              const match = trimmed.match(
                /^([0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?(?:\s*(?:-|–|à|a)\s*[0-9]+(?:[.,][0-9]+)?(?:\/[0-9]+)?)?)\s*([a-zA-ZÀ-ÿ\.]*)\s*/
              );
              if (match && match[1]) {
                const qty = match[1];
                const u = isStandardUnit(match[2]) ? normalizeUnit(match[2]) : '';
                const prefix = [qty, u].filter(Boolean).join(' ');
                setQuickAddText(`${prefix} ${canon.canonicalName} `);
              } else {
                setQuickAddText(`${canon.canonicalName} `);
              }
            }}
          />

          <TouchableOpacity
            style={[
              styles.quickAddBtn,
              !quickAddText.trim() && styles.quickAddBtnDisabled,
            ]}
            onPress={handleQuickAdd}
            disabled={!quickAddText.trim()}
            activeOpacity={0.8}
            accessibilityLabel="Ajouter cet ingrédient"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Puces de suggestion rapide d'unités culinaires 1-tap */}
        <View style={styles.quickAddOptionsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {QUICK_PICK_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  styles.flagChip,
                  { marginRight: 6, backgroundColor: colors.cardBackground },
                ]}
                onPress={() => handleQuickUnitTap(u)}
                activeOpacity={0.7}
              >
                <Text style={styles.flagChipText}>+{u}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Liste des ingrédients en cartes avec champs libre et détection après coup */}
      {ingredients.map((ing, index) => {
        const rowText =
          localTexts[ing.id] !== undefined
            ? localTexts[ing.id]
            : formatIngredientForInput(ing.name, ing.quantity, ing.unit);

        return (
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
            <View style={styles.freeformIngRow}>
              <UnifiedIngredientInput
                containerStyle={styles.freeformInputWrap}
                style={[styles.textInput, styles.freeformInput]}
                value={rowText}
                onChangeText={(val) => {
                  setLocalTexts((prev) => ({ ...prev, [ing.id]: val }));
                }}
                onFocus={() => setActiveIngIndex(index)}
                onBlur={() => {
                  setActiveIngIndex(null);
                  handleCommitIngredient(index);
                }}
                onSubmitEditing={() => handleCommitIngredient(index)}
                onSelectIngredient={(canon, details) => {
                  handleSelectCanonical(index, canon, details);
                }}
                placeholder="Ex: 250g farine, 3 œufs, sel..."
                placeholderTextColor={colors.textMuted}
                context="recipe"
                onRequestQualify={(raw) => onRequestQualify(index, raw)}
              />

              <TouchableOpacity
                onPress={() => {
                  setLocalTexts((prev) => {
                    const copy = { ...prev };
                    delete copy[ing.id];
                    return copy;
                  });
                  onRemoveIngredient(index);
                }}
                style={styles.deleteRowBtn}
                accessibilityLabel="Supprimer cet ingrédient"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {/* Rangée de métadonnées et puces détectées après coup */}
            <View style={styles.ingredientFlagsRow}>
              {/* Badge Quantité / Unité détectée */}
              <TouchableOpacity
                style={[
                  styles.detectedQtyBadge,
                  !ing.quantity && !ing.unit && styles.detectedQtyBadgeEmpty,
                ]}
                onPress={() => onOpenUnitModal(index)}
                activeOpacity={0.7}
                accessibilityLabel="Modifier l'unité ou la quantité"
              >
                <Ionicons
                  name={ing.unit ? 'scale-outline' : 'calculator-outline'}
                  size={12}
                  color={ing.quantity || ing.unit ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.detectedQtyBadgeText,
                    !ing.quantity && !ing.unit && styles.detectedQtyBadgeEmptyText,
                  ]}
                >
                  {ing.quantity || ing.unit
                    ? formatQuantityWithUnit(ing.quantity, ing.unit)
                    : '+ Qté / Unité'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={10}
                  color={ing.quantity || ing.unit ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>

              {/* Badge statut Lexique */}
              {ing.name.trim().length >= 2 &&
                (Boolean(
                  ing.canonicalId ||
                    UnifiedIngredientService.resolveRecognizedIngredient(ing.name).isRecognized
                ) ? (
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
                ))}

              {/* Puce En placard */}
              <TouchableOpacity
                style={[styles.flagChip, ing.isPantryStaple && styles.flagChipActiveStaple]}
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

              {/* Puce En finition */}
              <TouchableOpacity
                style={[styles.flagChip, ing.isOptional && styles.flagChipActiveOptional]}
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
        );
      })}
    </View>
  );
};
