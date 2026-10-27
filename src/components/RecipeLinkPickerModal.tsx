import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { findAutoMatchCandidate } from '../utils/recipeLinkMatcher';
import { normalizeString } from '../utils/helpers';

interface RecipeLinkPickerModalProps {
  visible: boolean;
  ingredientName: string;
  currentLinkedRecipeId?: string;
  availableRecipes: Recipe[];
  currentRecipeId?: string;
  onSelectRecipe: (linkedRecipeId?: string) => void;
  onClose: () => void;
}

export const RecipeLinkPickerModal: React.FC<RecipeLinkPickerModalProps> = ({
  visible,
  ingredientName,
  currentLinkedRecipeId,
  availableRecipes,
  currentRecipeId,
  onSelectRecipe,
  onClose,
}) => {
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');

  // Détection du candidat automatique
  const autoCandidate = useMemo(() => {
    return findAutoMatchCandidate(ingredientName, availableRecipes, currentRecipeId);
  }, [ingredientName, availableRecipes, currentRecipeId]);

  // Filtrage des recettes du carnet
  const filteredRecipes = useMemo(() => {
    const list = availableRecipes.filter((r) => r.id !== currentRecipeId);
    const query = normalizeString(searchQuery.trim());
    if (!query) return list;

    return list.filter((r) => {
      const matchTitle = normalizeString(r.title).includes(query);
      const matchCat = normalizeString(r.category || '').includes(query);
      return matchTitle || matchCat;
    });
  }, [availableRecipes, currentRecipeId, searchQuery]);

  const isAutoSelected = currentLinkedRecipeId === undefined;
  const isNoneSelected = currentLinkedRecipeId === 'none';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>Lier une recette</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Pour l'ingrédient « {ingredientName || 'sélectionné'} »
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une recette du carnet..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste principale avec options d'en-tête */}
          <FlatList
            data={filteredRecipes}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.optionsHeader}>
                {/* Option 1 : Détection automatique */}
                {autoCandidate ? (
                  <TouchableOpacity
                    style={[styles.specialOptionCard, isAutoSelected && styles.specialOptionCardActive]}
                    onPress={() => {
                      onSelectRecipe(undefined); // undefined = automatique
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="sparkles" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.optionTextCol}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle}>Détection automatique</Text>
                        <View style={styles.badgeRecommended}>
                          <Text style={styles.badgeRecommendedText}>Recommandé</Text>
                        </View>
                      </View>
                      <Text style={styles.optionSubtitle} numberOfLines={1}>
                        Lié à : {autoCandidate.title}
                      </Text>
                    </View>
                    {isAutoSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ) : null}

                {/* Option 2 : Aucun lien */}
                <TouchableOpacity
                  style={[styles.specialOptionCard, isNoneSelected && styles.specialOptionCardActive]}
                  onPress={() => {
                    onSelectRecipe('none');
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconCircle, { backgroundColor: colors.borderLight }]}>
                    <Ionicons name="ban-outline" size={18} color={colors.textMuted} />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={styles.optionTitle}>Aucune recette liée</Text>
                    <Text style={styles.optionSubtitle}>
                      Ingrédient brut ou préparation du commerce (pas de lien)
                    </Text>
                  </View>
                  {isNoneSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionDividerText}>
                    OU CHOISIR MANUELLEMENT DANS LE CARNET ({filteredRecipes.length})
                  </Text>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = currentLinkedRecipeId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.recipeCard, isSelected && styles.recipeCardActive]}
                  onPress={() => {
                    onSelectRecipe(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.recipeThumb} />
                  ) : (
                    <View style={[styles.recipeThumb, styles.recipeThumbEmpty]}>
                      <Ionicons name="restaurant-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.recipeMetaRow}>
                      <Text style={styles.recipeMetaTag}>{item.category || 'Plat'}</Text>
                      {item.prepTimeMinutes ? (
                        <Text style={styles.recipeMetaTime}>
                          ⏱️ {item.prepTimeMinutes + (item.cookTimeMinutes || 0)} min
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aucune recette correspondante</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  optionsHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  specialOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 10,
    ...shadows.card,
  },
  specialOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextCol: {
    flex: 1,
    marginRight: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeRecommended: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeRecommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionDivider: {
    marginTop: 10,
    marginBottom: 8,
    paddingVertical: 4,
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 8,
  },
  recipeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  recipeThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  recipeThumbEmpty: {
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    marginRight: 8,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  recipeMetaTag: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: 8,
  },
  recipeMetaTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
}));
