import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { Colors, Shadows } from '../theme/colors';
import { IngredientChip } from './IngredientChip';
import { extractUniqueIngredientNames, normalizeString } from '../utils/helpers';

interface FridgeSearchModalProps {
  visible: boolean;
  recipes: Recipe[];
  selectedIngredients: string[];
  onApply: (ingredients: string[]) => void;
  onClose: () => void;
}

export const FridgeSearchModal: React.FC<FridgeSearchModalProps> = ({
  visible,
  recipes,
  selectedIngredients,
  onApply,
  onClose,
}) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedIngredients);
  const [inputIngredient, setInputIngredient] = useState('');

  // Synchronise lorsque le modal s'ouvre
  React.useEffect(() => {
    setLocalSelected(selectedIngredients);
    setInputIngredient('');
  }, [visible, selectedIngredients]);

  // Tous les ingrédients connus dans la base
  const allKnownIngredients = useMemo(() => extractUniqueIngredientNames(recipes), [recipes]);

  // Ingrédients filtrés par la saisie
  const suggestions = useMemo(() => {
    if (!inputIngredient.trim()) {
      // Si vide, on propose les ingrédients populaires
      return allKnownIngredients.slice(0, 16);
    }
    const norm = normalizeString(inputIngredient);
    return allKnownIngredients.filter((ing) => normalizeString(ing).includes(norm));
  }, [allKnownIngredients, inputIngredient]);

  const handleToggleIngredient = (name: string) => {
    const norm = normalizeString(name);
    const exists = localSelected.some((sel) => normalizeString(sel) === norm);
    if (exists) {
      setLocalSelected(localSelected.filter((sel) => normalizeString(sel) !== norm));
    } else {
      setLocalSelected([...localSelected, name]);
    }
  };

  const handleAddManualIngredient = () => {
    const trimmed = inputIngredient.trim();
    if (!trimmed) return;
    const norm = normalizeString(trimmed);
    const exists = localSelected.some((sel) => normalizeString(sel) === norm);
    if (!exists) {
      setLocalSelected([...localSelected, trimmed]);
    }
    setInputIngredient('');
  };

  const handleClearAll = () => {
    setLocalSelected([]);
  };

  const handleApply = () => {
    onApply(localSelected);
    onClose();
  };

  // Compte de recettes qui match au moins un ingrédient
  const matchingRecipesCount = useMemo(() => {
    if (localSelected.length === 0) return recipes.length;
    const normalizedSel = localSelected.map(normalizeString);
    return recipes.filter((r) =>
      r.ingredients.some((ing) => {
        const norm = normalizeString(ing.name);
        return normalizedSel.some((sel) => norm.includes(sel) || sel.includes(norm));
      })
    ).length;
  }, [recipes, localSelected]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Que contient votre frigo ?</Text>
              <Text style={styles.headerSubtitle}>
                Trouvez des recettes avec vos ingrédients
              </Text>
            </View>
            {localSelected.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Effacer</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Input d'ajout */}
            <View style={styles.inputContainer}>
              <Ionicons name="add-circle-outline" size={22} color={Colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={inputIngredient}
                onChangeText={setInputIngredient}
                placeholder="Ex: Poulet, Tomate, Beurre, Parmesan..."
                placeholderTextColor={Colors.textMuted}
                onSubmitEditing={handleAddManualIngredient}
                returnKeyType="done"
              />
              {inputIngredient.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={handleAddManualIngredient}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addBtnText}>Ajouter</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Ingrédients actuellement sélectionnés */}
            {localSelected.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Ingrédients choisis ({localSelected.length})
                </Text>
                <View style={styles.chipsWrapper}>
                  {localSelected.map((ing) => (
                    <IngredientChip
                      key={`selected_${ing}`}
                      label={ing}
                      selected={true}
                      onRemove={() => handleToggleIngredient(ing)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Suggestions / Ingrédients disponibles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {inputIngredient.trim() ? 'Résultats de recherche' : 'Suggestions d\'ingrédients fréquents'}
              </Text>
              <View style={styles.chipsWrapper}>
                {suggestions.map((ing) => {
                  const isChosen = localSelected.some(
                    (sel) => normalizeString(sel) === normalizeString(ing)
                  );
                  return (
                    <IngredientChip
                      key={`sug_${ing}`}
                      label={ing}
                      selected={isChosen}
                      onPress={() => handleToggleIngredient(ing)}
                    />
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer d'action */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Text style={styles.applyBtnText}>
                {localSelected.length === 0
                  ? 'Voir toutes les recettes'
                  : `Trouver les recettes (${matchingRecipesCount})`}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.btnIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  closeBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    ...Shadows.small,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.small,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnIcon: {
    marginLeft: 8,
  },
});
