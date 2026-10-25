import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Modal,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { StarRating } from '../components/StarRating';
import { CookingModeModal } from '../components/CookingModeModal';
import {
  formatDuration,
  scaleQuantity,
  extractTimersFromText,
  formatTimerSeconds,
  getLocalDateString,
  normalizeString,
} from '../utils/helpers';
import { prepareUserAllergens, evaluateRecipeAllergens } from '../utils/allergenMatcher';
import { formatQuantityWithUnit } from '../constants/units';

interface InlineStepTimer {
  id: string;
  stepId: string;
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateRating: (id: string, rating: number, userNote?: string) => void;
  onNavigateToShoppingList?: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onUpdateRating,
  onNavigateToShoppingList,
}) => {
  const { isDark, colors } = useTheme();
  // Nombre de portions ajustables dynamiquement
  const [currentServings, setCurrentServings] = useState<number>(recipe.servings || 4);
  const [isAddingToShoppingList, setIsAddingToShoppingList] = useState(false);
  const [isShoppingModalVisible, setIsShoppingModalVisible] = useState(false);
  const [shoppingSelection, setShoppingSelection] = useState<Record<string, boolean>>({});

  // Synchronise lorsque la recette change
  React.useEffect(() => {
    setCurrentServings(recipe.servings || 4);
  }, [recipe.id, recipe.servings]);

  // Checklists locales pour la session de cuisine
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Allergènes de l'utilisateur et détection
  const [userAllergens, setUserAllergens] = useState<UserAllergenItem[]>([]);

  useEffect(() => {
    StorageService.getUserAllergens()
      .then(setUserAllergens)
      .catch((e) => console.error('Erreur chargement allergènes sur RecipeDetailScreen:', e));
  }, []);

  const preparedAllergens = useMemo(
    () => prepareUserAllergens(userAllergens),
    [userAllergens]
  );

  const allergenEval = useMemo(
    () => evaluateRecipeAllergens(recipe, preparedAllergens),
    [recipe, preparedAllergens]
  );

  const allergenIngredientIdsSet = useMemo(() => {
    const set = new Set<string>();
    allergenEval.allergenIngredients.forEach((a) => {
      if (a.ingredient.id) set.add(a.ingredient.id);
      set.add(normalizeString(a.ingredient.name));
    });
    return set;
  }, [allergenEval]);

  // Regroupement culinaire par sections ("Livre de Chef")
  const ingredientGroups = useMemo(() => {
    const main = (recipe.ingredients || []).filter((i) => !i.isPantryStaple && !i.isOptional);
    const pantry = (recipe.ingredients || []).filter((i) => Boolean(i.isPantryStaple) && !i.isOptional);
    const optional = (recipe.ingredients || []).filter((i) => Boolean(i.isOptional));

    const hasSubsections = pantry.length > 0 || optional.length > 0;

    const list: {
      key: 'main' | 'pantry' | 'optional';
      title: string;
      subtitle?: string;
      iconName?: string;
      items: typeof recipe.ingredients;
    }[] = [];

    if (main.length > 0) {
      list.push({
        key: 'main',
        title: hasSubsections ? 'Ingrédients principaux' : '',
        subtitle: undefined,
        iconName: 'basket-outline',
        items: main,
      });
    }

    if (pantry.length > 0) {
      list.push({
        key: 'pantry',
        title: 'Assaisonnements & condiments',
        subtitle: 'Huiles, vinaigres, assaisonnements & épices usuelles',
        iconName: 'sparkles-outline',
        items: pantry,
      });
    }

    if (optional.length > 0) {
      list.push({
        key: 'optional',
        title: 'En finition & au goût',
        subtitle: 'Touches facultatives ou décoratives',
        iconName: 'leaf-outline',
        items: optional,
      });
    }

    return { groups: list, hasSubsections };
  }, [recipe.ingredients]);

  // Minuteurs interactifs autonomes pour chaque étape
  const [inlineTimers, setInlineTimers] = useState<Record<string, InlineStepTimer>>({});

  // Réinitialiser les minuteurs si l'utilisateur change de recette
  useEffect(() => {
    setInlineTimers({});
  }, [recipe.id]);

  // Alerte haptique et sonore lors de la fin d'un minuteur
  const triggerInlineTimerAlert = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 800]);
    }
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const playTone = (freq: number, delay: number, duration: number) => {
          setTimeout(() => {
            try {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + duration);
            } catch (e) {}
          }, delay);
        };
        playTone(880, 0, 0.4);
        playTone(1174.66, 150, 0.6);
        playTone(1760, 400, 0.8);
      }
    } catch (e) {}
  };

  // Compte à rebours temps réel pour l'ensemble des minuteurs actifs
  useEffect(() => {
    const hasRunningTimer = Object.values(inlineTimers).some(
      (t) => t.isRunning && t.remainingSeconds > 0
    );

    if (!hasRunningTimer) return;

    const interval = setInterval(() => {
      setInlineTimers((prev) => {
        let hasChanges = false;
        const nextState = { ...prev };

        Object.keys(nextState).forEach((key) => {
          const timer = nextState[key];
          if (timer.isRunning && timer.remainingSeconds > 0) {
            hasChanges = true;
            const newRemaining = timer.remainingSeconds - 1;
            if (newRemaining === 0) {
              triggerInlineTimerAlert();
              nextState[key] = {
                ...timer,
                remainingSeconds: 0,
                isRunning: false,
              };
            } else {
              nextState[key] = {
                ...timer,
                remainingSeconds: newRemaining,
              };
            }
          }
        });

        return hasChanges ? nextState : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inlineTimers]);

  const handleStartInlineTimer = (
    stepId: string,
    stepIndex: number,
    timerId: string,
    label: string,
    totalSeconds: number
  ) => {
    const key = `${stepId}_${timerId}`;
    setInlineTimers((prev) => ({
      ...prev,
      [key]: {
        id: key,
        stepId,
        stepIndex,
        label,
        totalSeconds,
        remainingSeconds: totalSeconds,
        isRunning: true,
      },
    }));
  };

  const handleToggleInlineTimerPause = (key: string) => {
    setInlineTimers((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      return {
        ...prev,
        [key]: {
          ...existing,
          isRunning: !existing.isRunning,
        },
      };
    });
  };

  const handleAddMinuteToInlineTimer = (key: string) => {
    setInlineTimers((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newRem = existing.remainingSeconds + 60;
      return {
        ...prev,
        [key]: {
          ...existing,
          remainingSeconds: newRem,
          totalSeconds: Math.max(existing.totalSeconds, newRem),
          isRunning: true,
        },
      };
    });
  };

  const handleStopInlineTimer = (key: string) => {
    setInlineTimers((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Modal Mode Cuisine Pas-à-Pas
  const [isCookingModeVisible, setIsCookingModeVisible] = useState(false);

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
          const formatted = formatQuantityWithUnit(scaled, i.unit);
          return `• ${i.name} ${formatted ? `(${formatted})` : ''}`.trim();
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

  const handleOpenShoppingModal = () => {
    // Les ingrédients essentiels sont cochés par défaut.
    // Les fonds de placard (sel, poivre, huile...) et les ingrédients optionnels sont décochés !
    const initialSel: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      const isStaple = Boolean(ing.isPantryStaple);
      const isOpt = Boolean(ing.isOptional);
      initialSel[ing.id] = !isStaple && !isOpt;
    });
    setShoppingSelection(initialSel);
    setIsShoppingModalVisible(true);
  };

  const handleToggleShoppingItem = (id: string) => {
    setShoppingSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAllShopping = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      updated[ing.id] = select;
    });
    setShoppingSelection(updated);
  };

  const handleSelectEssentialsOnly = () => {
    const updated: Record<string, boolean> = {};
    recipe.ingredients.forEach((ing) => {
      updated[ing.id] = !ing.isPantryStaple && !ing.isOptional;
    });
    setShoppingSelection(updated);
  };

  const handleConfirmAddToShopping = async () => {
    const selectedIds = Object.keys(shoppingSelection).filter((id) => shoppingSelection[id]);
    if (selectedIds.length === 0) {
      Alert.alert('Aucun ingrédient', 'Veuillez sélectionner au moins un ingrédient à ajouter.');
      return;
    }

    setIsAddingToShoppingList(true);
    try {
      const { addedCount } = await StorageService.addRecipeToShoppingList(
        recipe,
        currentServings,
        selectedIds
      );
      setIsShoppingModalVisible(false);
      Alert.alert(
        '🛒 Ajouté à la liste de courses',
        `${addedCount} ingrédient${addedCount > 1 ? 's ajoutés' : ' ajouté'} pour ${currentServings} personne${currentServings > 1 ? 's' : ''} (rayons triés automatiquement) !`,
        [
          { text: 'Continuer', style: 'cancel' },
          ...(onNavigateToShoppingList
            ? [
                {
                  text: 'Voir ma liste',
                  style: 'default' as const,
                  onPress: onNavigateToShoppingList,
                },
              ]
            : []),
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'ajouter les ingrédients à la liste de courses.");
    } finally {
      setIsAddingToShoppingList(false);
    }
  };

  const handleMarkAsEatenToday = () => {
    Alert.alert(
      '🍽️ Noter dans mon suivi',
      `À quel moment avez-vous mangé « ${recipe.title} » aujourd'hui ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '☀️ Ce midi',
          onPress: async () => {
            try {
              const todayStr = getLocalDateString();
              await StorageService.setMealLog(todayStr, 'lunch', {
                title: recipe.title,
                recipeId: recipe.id,
                recipeImageUrl: recipe.imageUrl,
              });
              Alert.alert('✅ Enregistré', `Ce plat a été noté pour votre déjeuner de ce midi !`);
            } catch (e) {
              Alert.alert('Erreur', "Impossible d'enregistrer le repas.");
            }
          },
        },
        {
          text: '🌙 Ce soir',
          onPress: async () => {
            try {
              const todayStr = getLocalDateString();
              await StorageService.setMealLog(todayStr, 'dinner', {
                title: recipe.title,
                recipeId: recipe.id,
                recipeImageUrl: recipe.imageUrl,
              });
              Alert.alert('✅ Enregistré', `Ce plat a été noté pour votre dîner de ce soir !`);
            } catch (e) {
              Alert.alert('Erreur', "Impossible d'enregistrer le repas.");
            }
          },
        },
      ]
    );
  };

  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Top Floating Navigation Header */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={onBack} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity
              onPress={handleMarkAsEatenToday}
              style={styles.navBtn}
              accessibilityLabel="Marquer comme mangé aujourd'hui"
            >
              <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenShoppingModal}
              style={styles.navBtn}
              accessibilityLabel="Ajouter à ma liste de courses"
            >
              <Ionicons name="cart-outline" size={22} color={Colors.primary} />
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
                  {recipe.rating > 0 ? `${recipe.rating.toFixed(1)} / 5` : 'Non notée'}
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
                showScore={true}
                showClear={recipe.rating > 0}
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

          {/* Bouton Principal : Lancer le Mode Cuisine Pas-à-Pas */}
          <TouchableOpacity
            style={styles.startCookingBannerBtn}
            onPress={() => setIsCookingModeVisible(true)}
            activeOpacity={0.88}
          >
            <View style={styles.startCookingIconCircle}>
              <Ionicons name="restaurant" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.startCookingTextCol}>
              <Text style={styles.startCookingTitle}>Lancer le Mode Cuisine</Text>
              <Text style={styles.startCookingSubtitle}>
                Plein écran • Instructions XXL • Minuteurs intégrés
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Bannière d'alerte Allergènes si présence détectée */}
          {allergenEval.hasAllergen && (
            <View style={[styles.allergenAlertCard, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
              <View style={styles.allergenAlertHeader}>
                <Ionicons name="warning" size={22} color={colors.danger} />
                <Text style={[styles.allergenAlertTitle, { color: colors.danger }]}>
                  Attention : Présence d'allergènes
                </Text>
              </View>
              <Text style={[styles.allergenAlertDesc, { color: colors.textPrimary }]}>
                Cette recette contient des aliments correspondant à vos allergies enregistrées :
              </Text>
              <View style={styles.allergenAlertChipsRow}>
                {allergenEval.allergenIngredients.map((item, idx) => (
                  <View
                    key={`allg_ing_${item.ingredient.id || idx}`}
                    style={[styles.allergenBadgeChip, { backgroundColor: colors.danger }]}
                  >
                    <Ionicons name="alert-circle" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.allergenBadgeChipText}>
                      {item.ingredient.name}
                      {item.allergenFamily ? ` (${item.allergenFamily})` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Mention discrète de précaution si des ingrédients hors lexique sont présents (Arbitrage 5) */}
          {!allergenEval.hasAllergen && allergenEval.hasUnrecognizedIngredients && (
            <View style={[styles.allergenAlertCard, { backgroundColor: colors.amberLight, borderColor: colors.amber, paddingVertical: 8, paddingHorizontal: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.amber} />
                <Text style={{ fontSize: 12, color: colors.textPrimary, flex: 1, fontWeight: '500' }}>
                  Certains ingrédients non répertoriés nécessitent une vérification manuelle de vos allergènes.
                </Text>
              </View>
            </View>
          )}

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

            {/* Bouton 1 clic : Ajouter à ma liste de courses */}
            <TouchableOpacity
              style={styles.addToShoppingBtn}
              onPress={handleOpenShoppingModal}
              activeOpacity={0.85}
              disabled={isAddingToShoppingList}
            >
              <Ionicons name="cart" size={17} color="#FFFFFF" />
              <Text style={styles.addToShoppingBtnText}>
                Ajouter à ma liste de courses ({currentServings} pers.)
              </Text>
            </TouchableOpacity>

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

                  return (
                    <TouchableOpacity
                      key={ing.id}
                      style={[
                        styles.ingredientRow,
                        isChecked && styles.rowChecked,
                        isAllergen && !isChecked && styles.ingredientRowAllergen,
                      ]}
                      onPress={() => toggleIngredientCheck(ing.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkmark-circle' : isAllergen ? 'warning' : 'ellipse-outline'}
                        size={22}
                        color={isChecked ? Colors.secondary : isAllergen ? colors.danger : Colors.border}
                        style={styles.checkIcon}
                      />
                      <View style={styles.ingredientNameWrapper}>
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
                      </View>
                      {scaledQty ? (
                        <Text
                          style={[
                            styles.ingredientQty,
                            isScaled && styles.ingredientQtyScaled,
                            isChecked && styles.textChecked,
                            isAllergen && !isChecked && { color: colors.danger, fontWeight: '700' },
                          ]}
                        >
                          {formatQuantityWithUnit(scaledQty, ing.unit)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Steps Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepsHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Préparation ({recipe.steps.length} étapes)
                </Text>
                <TouchableOpacity
                  style={styles.headerCookBtn}
                  onPress={() => setIsCookingModeVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={13} color="#FFFFFF" />
                  <Text style={styles.headerCookBtnText}>Cuisiner</Text>
                </TouchableOpacity>
              </View>
            </View>

            {recipe.steps.map((step, index) => {
              const isChecked = !!checkedSteps[step.id];
              const stepTimers = extractTimersFromText(step.instruction);

              return (
                <View
                  key={step.id}
                  style={[styles.stepItemContainer, isChecked && styles.rowChecked]}
                >
                  <TouchableOpacity
                    style={styles.stepRow}
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

                  {stepTimers.length > 0 && (
                    <View style={styles.inlineTimerChipsRow}>
                      {stepTimers.map((t) => {
                        const timerKey = `${step.id}_${t.id}`;
                        const activeTimer = inlineTimers[timerKey];

                        if (!activeTimer) {
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={styles.inlineStartTimerBtn}
                              onPress={() =>
                                handleStartInlineTimer(
                                  step.id,
                                  index,
                                  t.id,
                                  t.label,
                                  t.totalSeconds
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons name="play" size={12} color="#FFFFFF" />
                              <Text style={styles.inlineStartTimerBtnText}>
                                Lancer minuteur ({t.label})
                              </Text>
                            </TouchableOpacity>
                          );
                        }

                        const progressPercent = Math.min(
                          100,
                          Math.max(
                            0,
                            (activeTimer.remainingSeconds / activeTimer.totalSeconds) * 100
                          )
                        );
                        const isFinished = activeTimer.remainingSeconds === 0;

                        return (
                          <View
                            key={t.id}
                            style={[
                              styles.inlineActiveTimerBox,
                              isFinished && styles.inlineActiveTimerBoxFinished,
                            ]}
                          >
                            <View style={styles.inlineActiveTimerHeader}>
                              <View style={styles.inlineTimerTitleRow}>
                                <Ionicons
                                  name={
                                    isFinished
                                      ? 'alarm'
                                      : activeTimer.isRunning
                                      ? 'timer'
                                      : 'pause-circle'
                                  }
                                  size={15}
                                  color={isFinished ? '#FFFFFF' : Colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.inlineTimerDigits,
                                    isFinished && styles.inlineTimerDigitsFinished,
                                  ]}
                                >
                                  {formatTimerSeconds(activeTimer.remainingSeconds)}
                                </Text>
                                <Text
                                  style={[
                                    styles.inlineTimerLabel,
                                    isFinished && styles.inlineTimerLabelFinished,
                                  ]}
                                >
                                  {isFinished ? '• Temps écoulé !' : `(${activeTimer.label})`}
                                </Text>
                              </View>

                              {/* Actions de contrôle */}
                              <View style={styles.inlineTimerActionsRow}>
                                {!isFinished ? (
                                  <>
                                    <TouchableOpacity
                                      style={styles.inlineTimerSmallBtn}
                                      onPress={() => handleToggleInlineTimerPause(timerKey)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons
                                        name={activeTimer.isRunning ? 'pause' : 'play'}
                                        size={13}
                                        color={Colors.primary}
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.inlineTimerSmallBtn}
                                      onPress={() => handleAddMinuteToInlineTimer(timerKey)}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.inlineTimerAddText}>+1m</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={[styles.inlineTimerSmallBtn, styles.inlineTimerStopBtn]}
                                      onPress={() => handleStopInlineTimer(timerKey)}
                                      activeOpacity={0.7}
                                    >
                                      <Ionicons name="close" size={13} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                  </>
                                ) : (
                                  <TouchableOpacity
                                    style={styles.inlineTimerStopAlarmBtn}
                                    onPress={() => handleStopInlineTimer(timerKey)}
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                                    <Text style={styles.inlineTimerStopAlarmText}>Arrêter</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>

                            {/* Jauge d'avancement horizontale */}
                            <View style={styles.inlineProgressBarTrack}>
                              <View
                                style={[
                                  styles.inlineProgressBarFill,
                                  { width: `${progressPercent}%` },
                                  isFinished && styles.inlineProgressBarFillFinished,
                                ]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
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

        {/* Modal de sélection avant ajout à la liste de courses */}
        <Modal
          visible={isShoppingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsShoppingModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.shoppingDialogCard}>
              <View style={styles.shoppingDialogHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shoppingDialogTitle}>Ajouter aux courses</Text>
                  <Text style={styles.shoppingDialogSubtitle}>
                    {recipe.title} • {currentServings} pers.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsShoppingModalVisible(false)}
                  style={styles.shoppingDialogCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Raccourcis de sélection */}
              <View style={styles.shoppingQuickBtnsRow}>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={handleSelectEssentialsOnly}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Indispensables uniquement</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={() => handleSelectAllShopping(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Tout cocher</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shoppingQuickBtn}
                  onPress={() => handleSelectAllShopping(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shoppingQuickBtnText}>Tout décocher</Text>
                </TouchableOpacity>
              </View>

              {/* Liste des ingrédients organisée en sous-sections Livre de Chef */}
              <ScrollView style={styles.shoppingListScroll} showsVerticalScrollIndicator={true}>
                {ingredientGroups.groups.map((group) => (
                  <View key={`shop_group_${group.key}`} style={styles.shoppingGroupBlock}>
                    <View style={styles.shoppingGroupHeader}>
                      <View style={styles.shoppingGroupHeaderTop}>
                        <Ionicons
                          name={
                            group.key === 'main'
                              ? 'basket-outline'
                              : group.key === 'pantry'
                              ? 'sparkles-outline'
                              : 'leaf-outline'
                          }
                          size={13}
                          color={group.key === 'main' ? colors.primary : colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.shoppingGroupTitle}>
                          {group.key === 'main'
                            ? 'INGRÉDIENTS PRINCIPAUX'
                            : group.key === 'pantry'
                            ? 'ASSAISONNEMENTS & CONDIMENTS'
                            : 'EN FINITION & AU GOÛT'}
                        </Text>
                      </View>
                      {group.key !== 'main' ? (
                        <Text style={styles.shoppingGroupHint}>
                          {group.key === 'pantry'
                            ? 'Cochez si vous en manquez dans vos placards'
                            : 'Touches facultatives ou selon vos préférences'}
                        </Text>
                      ) : null}
                    </View>

                    {group.items.map((ing) => {
                      const isChecked = !!shoppingSelection[ing.id];
                      const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, currentServings);

                      return (
                        <TouchableOpacity
                          key={`shop_item_${ing.id}`}
                          style={[styles.shoppingItemRow, isChecked && styles.shoppingItemRowChecked]}
                          onPress={() => handleToggleShoppingItem(ing.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={isChecked ? colors.primary : colors.textMuted}
                            style={{ marginRight: 10 }}
                          />
                          <Text style={[styles.shoppingItemName, !isChecked && styles.shoppingItemNameMuted]}>
                            {ing.name}
                          </Text>
                          {scaledQty ? (
                            <Text style={[styles.shoppingItemQty, !isChecked && styles.shoppingItemNameMuted]}>
                              {formatQuantityWithUnit(scaledQty, ing.unit)}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>

              {/* Footer avec action */}
              <View style={styles.shoppingDialogFooter}>
                <TouchableOpacity
                  style={styles.shoppingCancelBtn}
                  onPress={() => setIsShoppingModalVisible(false)}
                >
                  <Text style={styles.shoppingCancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.shoppingConfirmBtn,
                    Object.values(shoppingSelection).filter(Boolean).length === 0 && styles.shoppingConfirmBtnDisabled,
                  ]}
                  onPress={handleConfirmAddToShopping}
                  disabled={isAddingToShoppingList || Object.values(shoppingSelection).filter(Boolean).length === 0}
                >
                  <Ionicons name="cart" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shoppingConfirmBtnText}>
                    Ajouter ({Object.values(shoppingSelection).filter(Boolean).length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Mode Cuisine Pas-à-Pas Plein Écran */}
        <CookingModeModal
          visible={isCookingModeVisible}
          recipe={recipe}
          servings={currentServings}
          onClose={() => setIsCookingModeVisible(false)}
          onQuickRate={(rating) => onUpdateRating(recipe.id, rating)}
        />

        {/* Bandeau flottant des minuteurs en cours si au moins un minuteur est actif */}
        {Object.values(inlineTimers).length > 0 && (
          <View style={styles.floatingTimersSummaryBar}>
            <Ionicons name="timer" size={16} color="#FFFFFF" />
            <Text style={styles.floatingTimersSummaryText} numberOfLines={1}>
              {Object.values(inlineTimers).length} minuteur{Object.values(inlineTimers).length > 1 ? 's' : ''} :{' '}
              {Object.values(inlineTimers)
                .map(
                  (t) =>
                    `Étape ${t.stepIndex + 1} (${
                      t.remainingSeconds === 0 ? 'Fin !' : formatTimerSeconds(t.remainingSeconds)
                    })`
                )
                .join(' • ')}
            </Text>
          </View>
        )}
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
    color: colors.amber,
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
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
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
  ingredientGroupBlock: {
    marginBottom: 6,
  },
  ingredientGroupHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginTop: 4,
    marginBottom: 2,
  },
  ingredientGroupHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientGroupSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 19,
  },
  ingredientNamePantry: {
    color: colors.textSecondary,
  },
  allergenAlertCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  allergenAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  allergenAlertTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  allergenAlertDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  allergenAlertChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  allergenBadgeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  ingredientRowAllergen: {
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 2,
    borderBottomWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  rowChecked: {
    opacity: 0.6,
  },
  checkIcon: {
    marginRight: 10,
  },
  ingredientNameWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  ingredientNameAllergen: {
    color: colors.danger,
    fontWeight: '700',
  },
  allergenInlineTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  allergenInlineTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  stapleMiniBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.primary + '40',
  },
  stapleMiniBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  optionalMiniBadge: {
    backgroundColor: '#D9770618',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#D9770640',
  },
  optionalMiniBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  stepRow: {
    flexDirection: 'row',
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
  // Bouton Bannière Lancer le Mode Cuisine
  startCookingBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
    ...Shadows.medium,
  },
  startCookingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCookingTextCol: {
    flex: 1,
  },
  startCookingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  startCookingSubtitle: {
    fontSize: 12,
    color: '#FFEFEA',
    fontWeight: '500',
  },
  stepsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerCookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  headerCookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepItemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  // Minuteurs Inline dans les étapes
  inlineTimerChipsRow: {
    marginLeft: 38,
    marginTop: 8,
    gap: 8,
  },
  inlineStartTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 6,
    ...Shadows.small,
  },
  inlineStartTimerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inlineActiveTimerBox: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    ...Shadows.small,
  },
  inlineActiveTimerBoxFinished: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  inlineActiveTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inlineTimerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineTimerDigits: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  inlineTimerDigitsFinished: {
    color: '#FFFFFF',
  },
  inlineTimerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inlineTimerLabelFinished: {
    color: '#FFFFFF',
  },
  inlineTimerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineTimerSmallBtn: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTimerStopBtn: {
    borderColor: Colors.border,
  },
  inlineTimerAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  inlineTimerStopAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  inlineTimerStopAlarmText: {
    color: Colors.danger,
    fontWeight: '800',
    fontSize: 11,
  },
  inlineProgressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  inlineProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  inlineProgressBarFillFinished: {
    backgroundColor: '#FFFFFF',
  },
  // Barre flottante récapitulative des minuteurs
  floatingTimersSummaryBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: colors.isDark ? colors.surfaceAlt : colors.textPrimary,
    borderWidth: colors.isDark ? 1 : 0,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
    ...shadows.medium,
  },
  floatingTimersSummaryText: {
    flex: 1,
    color: colors.isDark ? colors.textPrimary : '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  addToShoppingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 8,
    ...Shadows.small,
  },
  addToShoppingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shoppingDialogCard: {
    width: '92%',
    maxHeight: '82%',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  shoppingDialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  shoppingDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shoppingDialogSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shoppingDialogCloseBtn: {
    padding: 4,
  },
  shoppingQuickBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  shoppingQuickBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shoppingQuickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  shoppingListScroll: {
    maxHeight: 340,
  },
  shoppingGroupBlock: {
    marginBottom: 12,
  },
  shoppingGroupHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: 4,
  },
  shoppingGroupHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shoppingGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  shoppingGroupHint: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
    paddingLeft: 19,
  },
  shoppingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
    borderRadius: 8,
  },
  shoppingItemRowChecked: {
    backgroundColor: colors.primary + '08',
  },
  shoppingItemName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  shoppingItemNameMuted: {
    color: colors.textMuted,
  },
  shoppingItemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  shoppingDialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  shoppingCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  shoppingCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  shoppingConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  shoppingConfirmBtnDisabled: {
    opacity: 0.4,
  },
  shoppingConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
