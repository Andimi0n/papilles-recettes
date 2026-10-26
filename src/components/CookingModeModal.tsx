import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Recipe, Ingredient } from '../types/recipe';
import { UserAllergenItem } from '../types/vocabulary';
import { StorageService } from '../services/storageService';
import { VocabularyService } from '../services/vocabularyService';
import { Colors, Shadows, createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  extractTimersFromText,
  formatTimerSeconds,
  scaleQuantity,
  DetectedTimer,
  getLocalDateString,
  normalizeString,
  stemWord,
} from '../utils/helpers';
import { prepareUserAllergens, evaluateRecipeAllergens } from '../utils/allergenMatcher';
import { formatQuantityWithUnit } from '../constants/units';
import { StarRating } from './StarRating';

interface CookingModeModalProps {
  visible: boolean;
  recipe: Recipe;
  servings: number;
  onClose: () => void;
  onQuickRate?: (rating: number) => void;
}

interface RunningTimer {
  id: string;
  label: string;
  stepIndex: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({
  visible,
  recipe,
  servings,
  onClose,
  onQuickRate,
}) => {
  // Maintient l'écran du smartphone allumé pendant toute la session de cuisine
  useKeepAwake();
  const { colors } = useTheme();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [isIngredientsSheetVisible, setIsIngredientsSheetVisible] = useState(false);
  const [activeTimer, setActiveTimer] = useState<RunningTimer | null>(null);
  const [isTimerFinishedModalVisible, setIsTimerFinishedModalVisible] = useState(false);
  const [isCompletedModalVisible, setIsCompletedModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(recipe.rating || 0);

  // Réinitialise l'étape et les états lors de l'ouverture
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      setIsCompletedModalVisible(false);
      setUserRating(recipe.rating || 0);
      StorageService.getUserAllergens()
        .then(setUserAllergens)
        .catch(() => {});
    }
  }, [visible, recipe.id]);

  const [userAllergens, setUserAllergens] = useState<UserAllergenItem[]>([]);

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

  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];

  // Détection automatique des durées dans l'instruction de l'étape courante
  const detectedTimers: DetectedTimer[] = useMemo(() => {
    if (!currentStep) return [];
    return extractTimersFromText(currentStep.instruction);
  }, [currentStep?.instruction]);

  // Détection dynamique des ingrédients mentionnés dans l'étape courante
  const detectedIngredients = useMemo(() => {
    if (!currentStep || !recipe.ingredients) return [];

    // Nettoyer la ponctuation de l'instruction en la remplaçant par un espace
    const cleanInstruction = currentStep.instruction.replace(/[.,;:!?'’]/g, ' ');
    const stepTextNorm = normalizeString(cleanInstruction);
    const stepWords = stepTextNorm.split(/\s+/).map(stemWord);

    const IGNORED_WORDS = new Set(['gousse', 'gousses', 'filet', 'filets', 'tranche', 'tranches', 'morceau', 'morceaux', 'branche', 'branches', 'boite', 'boites', 'pincee', 'pincees', 'cuillere', 'cuilleres', 'verre', 'verres', 'tasse', 'tasses', 'sachet', 'sachets', 'trait', 'traits', 'noisette', 'noisettes', 'noix', 'zeste', 'zestes']);

    const detected: Ingredient[] = [];

    const vocab = VocabularyService.getSyncList();
    const getCanonicalNormName = (canonicalId?: string) => {
      if (!canonicalId) return null;
      const canon = vocab.find(v => v.id === canonicalId);
      return canon ? normalizeString(canon.canonicalName) : null;
    };

    recipe.ingredients.forEach(ing => {
       // On utilise le nom canonique s'il existe pour une meilleure détection, sinon le nom brut
       let targetNameNorm = getCanonicalNormName(ing.canonicalId);
       if (!targetNameNorm) {
           targetNameNorm = normalizeString(ing.name);
       }

       const ingWords = targetNameNorm.split(/\s+/).map(stemWord).filter(w => !IGNORED_WORDS.has(w));

       // 1. Recherche par phrase complète (ex: "crème fraîche")
       if (stepTextNorm.includes(targetNameNorm)) {
         detected.push(ing);
       }
       // 2. Recherche par n'importe quel mot clé significatif stemmé
       else {
         const hasMatchingWord = ingWords.some(w => w.length >= 3 && stepWords.includes(w));
         if (hasMatchingWord) {
            detected.push(ing);
         }
       }
    });

    // Élimine les doublons potentiels (même ID)
    const uniqueDetected = detected.filter((item, index, self) =>
      index === self.findIndex((t) => t.id === item.id)
    );

    return uniqueDetected;
  }, [currentStep?.instruction, recipe.ingredients]);


  // Gestion du compte à rebours du minuteur actif
  useEffect(() => {
    let interval: any = null;

    if (activeTimer && activeTimer.isRunning && activeTimer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setActiveTimer((prev) => {
          if (!prev) return null;
          if (prev.remainingSeconds <= 1) {
            // Fin du minuteur !
            triggerTimerAlert();
            return { ...prev, remainingSeconds: 0, isRunning: false };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer?.isRunning, activeTimer?.remainingSeconds]);

  // Alerte haptique et sonore lors de la fin du minuteur
  const triggerTimerAlert = () => {
    setIsTimerFinishedModalVisible(true);

    // Vibration mobile (rythme d'alerte de cuisine)
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500, 200, 800]);
    }

    // Carillon sonore Web Audio (si sur navigateur)
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

  const handleStartTimer = (label: string, totalSec: number) => {
    setActiveTimer({
      id: `timer_${Date.now()}`,
      label,
      stepIndex: currentStepIndex,
      totalSeconds: totalSec,
      remainingSeconds: totalSec,
      isRunning: true,
    });
  };

  const handleToggleTimerPause = () => {
    setActiveTimer((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : null));
  };

  const handleAddTimerMinute = (extraMinutes: number) => {
    setActiveTimer((prev) => {
      if (!prev) return null;
      const newRem = prev.remainingSeconds + extraMinutes * 60;
      return {
        ...prev,
        remainingSeconds: newRem,
        totalSeconds: Math.max(prev.totalSeconds, newRem),
        isRunning: true,
      };
    });
  };

  const handleStopTimer = () => {
    setActiveTimer(null);
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Dernière étape atteinte
      setIsCompletedModalVisible(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleToggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRequestClose = () => {
    if (activeTimer && activeTimer.isRunning) {
      Alert.alert(
        'Minuteur en cours',
        'Un minuteur de cuisine est actuellement en cours. Voulez-vous vraiment quitter le mode pas-à-pas ?',
        [
          { text: 'Rester en cuisine', style: 'cancel' },
          {
            text: 'Quitter',
            style: 'destructive',
            onPress: () => {
              setActiveTimer(null);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const handleRatingChange = (newRating: number) => {
    setUserRating(newRating);
    if (onQuickRate) {
      onQuickRate(newRating);
    }
  };

  const handleLogCookedMeal = async (slot: 'lunch' | 'dinner') => {
    try {
      const todayStr = getLocalDateString();
      await StorageService.setMealLog(todayStr, slot, {
        title: recipe.title,
        recipeId: recipe.id,
        recipeImageUrl: recipe.imageUrl,
      });
      setIsCompletedModalVisible(false);
      onClose();
      Alert.alert(
        '✅ Noté dans vos repas !',
        `« ${recipe.title} » a été ajouté à votre suivi de ce ${slot === 'lunch' ? 'midi' : 'soir'}. Bon appétit !`
      );
    } catch (e) {
      console.error('Erreur enregistrement repas cuisiné:', e);
    }
  };

  if (!visible || steps.length === 0) return null;

  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleRequestClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.container}>
          {/* Top Bar : Quitter, Titre & Indicateur Écran Toujours Allumé */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleRequestClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.titleCol}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe.title}
              </Text>
              <View style={styles.awakeRow}>
                <Ionicons name="bulb-outline" size={12} color={Colors.secondary} />
                <Text style={styles.awakeText}>Écran actif • {servings} pers.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.ingredientsPillBtn}
              onPress={() => setIsIngredientsSheetVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="nutrition-outline" size={16} color={Colors.primary} />
              <Text style={styles.ingredientsPillText}>Ingrédients</Text>
            </TouchableOpacity>
          </View>

          {/* Jauge de progression segmentée */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Bandeau Minuteur Persistant (si actif) */}
          {activeTimer && (
            <View
              style={[
                styles.activeTimerBanner,
                activeTimer.remainingSeconds === 0 && styles.activeTimerBannerFinished,
              ]}
            >
              <View style={styles.activeTimerLeft}>
                <Ionicons
                  name={activeTimer.isRunning ? 'timer' : 'pause-circle'}
                  size={20}
                  color={activeTimer.remainingSeconds === 0 ? '#FFFFFF' : Colors.primary}
                />
                <View>
                  <Text
                    style={[
                      styles.activeTimerDigits,
                      activeTimer.remainingSeconds === 0 && styles.activeTimerDigitsFinished,
                    ]}
                  >
                    {formatTimerSeconds(activeTimer.remainingSeconds)}
                  </Text>
                  <Text
                    style={[
                      styles.activeTimerLabel,
                      activeTimer.remainingSeconds === 0 && styles.activeTimerLabelFinished,
                    ]}
                  >
                    Minuteur {activeTimer.label} (Étape {activeTimer.stepIndex + 1})
                  </Text>
                </View>
              </View>

              <View style={styles.activeTimerActions}>
                {activeTimer.remainingSeconds > 0 ? (
                  <>
                    <TouchableOpacity
                      style={styles.timerSmallBtn}
                      onPress={handleToggleTimerPause}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={activeTimer.isRunning ? 'pause' : 'play'}
                        size={15}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.timerSmallBtn}
                      onPress={() => handleAddTimerMinute(1)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.timerAddMinuteText}>+1m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.timerSmallBtn, styles.timerStopBtn]}
                      onPress={handleStopTimer}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="stop" size={14} color={Colors.danger} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.timerStopAlarmBtn}
                    onPress={handleStopTimer}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.timerStopAlarmText}>Arrêter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Corps de l'étape : XXL, lisible à 1 mètre sur le plan de travail */}
          <ScrollView
            style={styles.stepScrollView}
            contentContainerStyle={styles.stepScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Badge Numéro d'Étape */}
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>
                  Étape {currentStepIndex + 1}
                </Text>
              </View>
              <Text style={styles.stepCountSub}>sur {steps.length}</Text>
            </View>

            {/* Ingrédients détectés dynamiquement dans cette étape */}
            {detectedIngredients.length > 0 && (
              <View style={styles.detectedIngredientsRow}>
                {detectedIngredients.map((ing) => {
                  const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, servings);
                  const qtyStr = scaledQty ? formatQuantityWithUnit(scaledQty, ing.unit) : '';
                  return (
                    <View key={ing.id} style={styles.ingredientChip}>
                      <Text style={styles.ingredientChipText}>
                        {qtyStr ? `${qtyStr} ` : ''}{ing.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Texte de l'instruction en caractères géants */}
            <Text style={styles.instructionText}>
              {currentStep.instruction}
            </Text>

            {/* Minuteurs détectés automatiquement dans cette étape */}
            {detectedTimers.length > 0 && (
              <View style={styles.detectedTimersBox}>
                <View style={styles.detectedTimersHeader}>
                  <Ionicons name="alarm-outline" size={16} color={Colors.primary} />
                  <Text style={styles.detectedTimersTitle}>
                    Minuteur{detectedTimers.length > 1 ? 's' : ''} détecté{detectedTimers.length > 1 ? 's' : ''} pour cette étape :
                  </Text>
                </View>

                <View style={styles.detectedTimersRow}>
                  {detectedTimers.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.startTimerChip}
                      onPress={() => handleStartTimer(t.label, t.totalSeconds)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={14} color="#FFFFFF" />
                      <Text style={styles.startTimerChipText}>
                        Lancer {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Raccourcis de minuteurs rapides manuels */}
            <View style={styles.quickTimersRow}>
              <Text style={styles.quickTimersLabel}>Minuteurs d'appoint :</Text>
              {[1, 3, 5, 10].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={styles.quickTimerChip}
                  onPress={() => handleStartTimer(`${mins} min`, mins * 60)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.quickTimerChipText}>+{mins} min</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Barre de Navigation Inférieure avec Grosses Touches Tactiles */}
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[
                styles.navStepBtn,
                styles.navStepBtnPrev,
                currentStepIndex === 0 && styles.navStepBtnDisabled,
              ]}
              onPress={handlePrevStep}
              disabled={currentStepIndex === 0}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={currentStepIndex === 0 ? Colors.textMuted : Colors.textPrimary}
              />
              <Text
                style={[
                  styles.navStepBtnTextPrev,
                  currentStepIndex === 0 && styles.navStepBtnTextDisabled,
                ]}
              >
                Précédent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navStepBtn,
                styles.navStepBtnNext,
                currentStepIndex === steps.length - 1 && styles.navStepBtnFinish,
              ]}
              onPress={handleNextStep}
              activeOpacity={0.85}
            >
              <Text style={styles.navStepBtnTextNext}>
                {currentStepIndex === steps.length - 1 ? 'Terminer 🎉' : 'Étape suivante'}
              </Text>
              <Ionicons
                name={currentStepIndex === steps.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal Feuille Ingrédients Rétractable */}
        <Modal
          visible={isIngredientsSheetVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsIngredientsSheetVisible(false)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetBox}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleRow}>
                  <Ionicons name="nutrition" size={20} color={Colors.primary} />
                  <Text style={styles.sheetTitle}>
                    Ingrédients ({recipe.ingredients.length})
                  </Text>
                </View>
                <Text style={styles.sheetSubtitle}>
                  Quantités calculées pour {servings} personnes
                </Text>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setIsIngredientsSheetVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {recipe.ingredients.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  const scaledQty = scaleQuantity(ing.quantity, recipe.servings || 4, servings);
                  const isAllergen = allergenIngredientIdsSet.has(ing.id) || allergenIngredientIdsSet.has(normalizeString(ing.name));

                  return (
                    <TouchableOpacity
                      key={ing.id}
                      style={[
                        styles.sheetIngRow,
                        isChecked && styles.sheetIngRowChecked,
                        isAllergen && !isChecked && { backgroundColor: Colors.danger + '18', borderLeftWidth: 3, borderLeftColor: Colors.danger },
                      ]}
                      onPress={() => handleToggleIngredientCheck(ing.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkmark-circle' : isAllergen ? 'warning' : 'ellipse-outline'}
                        size={22}
                        color={isChecked ? Colors.secondary : isAllergen ? Colors.danger : Colors.border}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text
                          style={[
                            styles.sheetIngName,
                            isChecked && styles.sheetIngTextChecked,
                            isAllergen && !isChecked && { color: Colors.danger, fontWeight: '700' },
                          ]}
                        >
                          {ing.name}
                        </Text>
                        {isAllergen && !isChecked && (
                          <View style={{ backgroundColor: Colors.danger + '22', borderColor: Colors.danger, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.danger, textTransform: 'uppercase' }}>Allergène</Text>
                          </View>
                        )}
                      </View>
                      {scaledQty ? (
                        <Text
                          style={[
                            styles.sheetIngQty,
                            isChecked && styles.sheetIngTextChecked,
                            isAllergen && !isChecked && { color: Colors.danger, fontWeight: '700' },
                          ]}
                        >
                          {formatQuantityWithUnit(scaledQty, ing.unit)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.sheetDoneBtn}
                onPress={() => setIsIngredientsSheetVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.sheetDoneBtnText}>Revenir à la cuisine</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal d'Alerte Minuteur Terminé */}
        <Modal
          visible={isTimerFinishedModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTimerFinishedModalVisible(false)}
        >
          <View style={styles.alertBackdrop}>
            <View style={styles.alertBox}>
              <View style={styles.alertIconPulse}>
                <Ionicons name="alarm" size={48} color="#FFFFFF" />
              </View>

              <Text style={styles.alertTitle}>Minuteur Terminé !</Text>
              <Text style={styles.alertMessage}>
                Le temps de cuisson pour l'étape {activeTimer ? activeTimer.stepIndex + 1 : ''} est écoulé.
              </Text>

              <TouchableOpacity
                style={styles.alertDismissBtn}
                onPress={() => {
                  setIsTimerFinishedModalVisible(false);
                  setActiveTimer(null);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.alertDismissText}>Arrêter la sonnerie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Félicitations / Recette Terminée */}
        <Modal
          visible={isCompletedModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsCompletedModalVisible(false)}
        >
          <View style={styles.completeBackdrop}>
            <View style={styles.completeBox}>
              <Text style={styles.trophyEmoji}>👨‍🍳</Text>
              <Text style={styles.completeTitle}>Bravo Chef !</Text>
              <Text style={styles.completeSubtitle}>
                Vous avez terminé toutes les étapes de « {recipe.title} ».
              </Text>

              {/* Notation rapide */}
              <View style={styles.ratingCard}>
                <Text style={styles.ratingPrompt}>Comment avez-vous trouvé ce plat ?</Text>
                <StarRating
                  rating={userRating}
                  size={32}
                  interactive={true}
                  onRatingChange={handleRatingChange}
                />
              </View>

              {/* Raccourci Suivi des Repas */}
              <View style={styles.completeMealLogSection}>
                <Text style={styles.completeMealLogTitle}>Noter dans mon suivi du jour :</Text>
                <View style={styles.completeMealLogBtnsRow}>
                  <TouchableOpacity
                    style={styles.completeMealLogBtn}
                    onPress={() => handleLogCookedMeal('lunch')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sunny" size={14} color={colors.primary} />
                    <Text style={styles.completeMealLogBtnText}>Ce midi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completeMealLogBtn}
                    onPress={() => handleLogCookedMeal('dinner')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="moon" size={14} color={colors.primary} />
                    <Text style={styles.completeMealLogBtnText}>Ce soir</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.completeFinishBtn}
                onPress={() => {
                  setIsCompletedModalVisible(false);
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="restaurant" size={18} color="#FFFFFF" />
                <Text style={styles.completeFinishBtnText}>À table ! (Retour au carnet)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  awakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  awakeText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  ingredientsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
  },
  ingredientsPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Barre de progression
  progressBarContainer: {
    height: 5,
    backgroundColor: Colors.borderLight,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  // Bandeau Minuteur Persistant
  activeTimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activeTimerBannerFinished: {
    backgroundColor: Colors.danger,
  },
  activeTimerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeTimerDigits: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },
  activeTimerDigitsFinished: {
    color: '#FFFFFF',
  },
  activeTimerLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeTimerLabelFinished: {
    color: '#FFFFFF',
  },
  activeTimerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerSmallBtn: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStopBtn: {
    borderColor: Colors.dangerLight,
  },
  timerAddMinuteText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  timerStopAlarmBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timerStopAlarmText: {
    color: Colors.danger,
    fontWeight: '800',
    fontSize: 13,
  },
  // Zone de l'instruction
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
  },
  stepBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepCountSub: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  detectedIngredientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  ingredientChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ingredientChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  instructionText: {
    fontSize: 22,
    lineHeight: 36,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 28,
  },
  // Minuteurs détectés
  detectedTimersBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  detectedTimersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  detectedTimersTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detectedTimersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  startTimerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 7,
    ...Shadows.small,
  },
  startTimerChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Minuteurs manuels rapides
  quickTimersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimersLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginRight: 4,
  },
  quickTimerChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickTimerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Navigation inférieure
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  navStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 18,
    gap: 8,
  },
  navStepBtnPrev: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navStepBtnDisabled: {
    opacity: 0.4,
  },
  navStepBtnNext: {
    flex: 2,
    backgroundColor: Colors.primary,
    ...Shadows.medium,
  },
  navStepBtnFinish: {
    backgroundColor: Colors.secondary,
  },
  navStepBtnTextPrev: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navStepBtnTextDisabled: {
    color: Colors.textMuted,
  },
  navStepBtnTextNext: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Ingrédients Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    padding: 20,
  },
  sheetHeader: {
    marginBottom: 14,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheetScroll: {
    marginBottom: 16,
  },
  sheetIngRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetIngRowChecked: {
    opacity: 0.6,
  },
  sheetIngName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sheetIngQty: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetIngTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  sheetDoneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  // Alerte Minuteur Terminé
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Shadows.medium,
  },
  alertIconPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  alertDismissText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  // Recette terminée
  completeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completeBox: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...Shadows.medium,
  },
  trophyEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  completeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ratingCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 18,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 22,
  },
  ratingPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  completeMealLogSection: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  completeMealLogTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  completeMealLogBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  completeMealLogBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  completeMealLogBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  completeFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 18,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    ...Shadows.small,
  },
  completeFinishBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
}));
