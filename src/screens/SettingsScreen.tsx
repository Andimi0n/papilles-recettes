import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
  Keyboard,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { StorageService } from '../services/storageService';
import { RecipeAiService } from '../services/recipeAiService';
import { VocabularyService } from '../services/vocabularyService';
import { VocabularyManagerModal } from '../components/VocabularyManagerModal';
import { AllergenFamilyPickerModal } from '../components/AllergenFamilyPickerModal';
import { IngredientAutocompleteInput } from '../components/IngredientAutocompleteInput';
import { Recipe } from '../types/recipe';
import {
  ALLERGEN_FAMILIES,
  AllergenFamily,
  AllergenFamilyConfig,
  UserAllergenItem,
  CanonicalIngredient,
} from '../types/vocabulary';
import {
  PlannerSettings,
  PlannerMode,
  DayOfWeek,
  DEFAULT_PLANNER_SETTINGS,
} from '../types/planner';
import { normalizeString, generateUniqueId, ORDERED_DAYS_OF_WEEK } from '../utils/helpers';

export interface SettingsScreenProps {
  recipes: Recipe[];
  onRecipesReloadNeeded?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  recipes,
  onRecipesReloadNeeded,
}) => {
  const { themeMode, themeId, colors, setThemeMode } = useTheme();

  // Clé API Gemini
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Préférences
  const [defaultServings, setDefaultServings] = useState(4);
  const [shoppingCount, setShoppingCount] = useState(0);
  const [plannerSettings, setPlannerSettings] = useState<PlannerSettings>(DEFAULT_PLANNER_SETTINGS);

  // Allergies & Intolérances
  const [userAllergens, setUserAllergens] = useState<UserAllergenItem[]>([]);
  const [isAllergenFilterEnabled, setIsAllergenFilterEnabled] = useState(true);
  const [isAiAllergenExclusionEnabled, setIsAiAllergenExclusionEnabled] = useState(true);
  const [allergenInputText, setAllergenInputText] = useState('');
  const [isPickerModalVisible, setIsPickerModalVisible] = useState(false);
  const [pendingIngredient, setPendingIngredient] = useState<{
    name: string;
    canonicalId?: string;
    currentFamily?: AllergenFamily | null;
  } | null>(null);

  // Vocabulaire & Lexique Ingrédients
  const [vocabList, setVocabList] = useState<CanonicalIngredient[]>([]);
  const [isVocabModalVisible, setIsVocabModalVisible] = useState(false);
  const [vocabCount, setVocabCount] = useState(0);

  // Import JSON Modal/State
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadInitialSettings = async () => {
    try {
      const key = await RecipeAiService.getApiKey();
      setApiKey(key || '');

      const servings = await StorageService.getDefaultServings();
      setDefaultServings(servings);

      const items = await StorageService.getShoppingList();
      setShoppingCount(items.length);

      const allergens = await StorageService.getUserAllergens();
      setUserAllergens(allergens);

      const filterAllergens = await StorageService.getAllergenFilterEnabled();
      setIsAllergenFilterEnabled(filterAllergens);

      const excludeAi = await StorageService.getAiAllergenExclusionEnabled();
      setIsAiAllergenExclusionEnabled(excludeAi);

      const loadedVocab = await VocabularyService.getAll();
      setVocabList(loadedVocab);
      setVocabCount(loadedVocab.length);

      const planSettings = await StorageService.getPlannerSettings();
      setPlannerSettings(planSettings);
    } catch (e) {
      console.error('Erreur chargement réglages:', e);
    }
  };

  const handleSelectPlannerMode = async (mode: PlannerMode) => {
    try {
      const updated = await StorageService.savePlannerSettings({ mode });
      setPlannerSettings(updated);
    } catch (e) {
      console.error('Erreur changement mode planification:', e);
    }
  };

  const handleSelectPlannerStartDay = async (startDay: DayOfWeek) => {
    try {
      const updated = await StorageService.savePlannerSettings({ startDay });
      setPlannerSettings(updated);
    } catch (e) {
      console.error('Erreur changement jour départ:', e);
    }
  };

  useEffect(() => {
    loadInitialSettings();
  }, []);

  const handleSaveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const trimmed = apiKey.trim();
      if (trimmed.length > 0) {
        await RecipeAiService.setApiKey(trimmed);
        Alert.alert('Succès', 'Votre clé API Gemini a été enregistrée en toute sécurité.');
      } else {
        await RecipeAiService.clearApiKey();
        Alert.alert('Clé supprimée', 'La clé API personnalisée a été retirée.');
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer la clé.");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleTestAi = async () => {
    setTestStatus({ loading: true });
    try {
      const res = await RecipeAiService.checkConnection(apiKey.trim() || undefined);
      setTestStatus({
        loading: false,
        success: res.ok,
        message: res.message,
      });
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: err?.message || 'Erreur inconnue lors du test.',
      });
    }
  };

  const handleSelectServings = async (servings: number) => {
    setDefaultServings(servings);
    await StorageService.saveDefaultServings(servings);
  };

  // --- Gestion des Allergènes & Intolérances ---

  const handleToggleAllergenFilter = async (enabled: boolean) => {
    setIsAllergenFilterEnabled(enabled);
    await StorageService.setAllergenFilterEnabled(enabled);
  };

  const handleToggleAiAllergenExclusion = async (enabled: boolean) => {
    setIsAiAllergenExclusionEnabled(enabled);
    await StorageService.setAiAllergenExclusionEnabled(enabled);
  };

  const handleToggleAllergenFamily = async (fam: AllergenFamilyConfig) => {
    const associated = vocabList.filter((ing) => ing.allergen === fam.id);
    const presentCount = associated.filter((ing) =>
      userAllergens.some((a) => {
        const nameMatch = normalizeString(a.name) === normalizeString(ing.canonicalName);
        const idMatch = Boolean(a.canonicalId && a.canonicalId === ing.id);
        return nameMatch || (idMatch && a.allergenFamily === fam.id);
      })
    ).length;
    const isAllActive = associated.length > 0 && presentCount === associated.length;

    if (isAllActive) {
      Alert.alert(
        `Retirer ${fam.emoji} ${fam.name}`,
        `Souhaitez-vous retirer tous les ingrédients associés à la famille ${fam.name} (${associated.length} ingrédients) de vos allergies ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Retirer',
            style: 'destructive',
            onPress: async () => {
              const associatedNames = new Set(associated.map((i) => normalizeString(i.canonicalName)));
              const associatedIds = new Set(associated.map((i) => i.id));
              const remaining = userAllergens.filter((a) => {
                if (a.allergenFamily === fam.id) return false;
                if (associatedNames.has(normalizeString(a.name))) return false;
                if (a.canonicalId && associatedIds.has(a.canonicalId)) return false;
                return true;
              });
              await StorageService.saveUserAllergens(remaining);
              setUserAllergens(remaining);
            },
          },
        ]
      );
    } else {
      const current = [...userAllergens];
      let addedCount = 0;
      for (const ing of associated) {
        const exists = current.some((a) => {
          const nameMatch = normalizeString(a.name) === normalizeString(ing.canonicalName);
          const idMatch = Boolean(a.canonicalId && a.canonicalId === ing.id);
          return nameMatch || (idMatch && a.allergenFamily === fam.id);
        });
        if (!exists) {
          current.push({
            id: generateUniqueId('allg'),
            name: ing.canonicalName,
            canonicalId: ing.id,
            allergenFamily: fam.id,
            addedAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }
      await StorageService.saveUserAllergens(current);
      setUserAllergens(current);
      Alert.alert(
        `${fam.emoji} ${fam.name}`,
        `${addedCount} ingrédient${addedCount > 1 ? 's' : ''} associé${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} à vos allergies.`
      );
    }
  };

  const handleInitiateAddIngredient = (name?: string, ing?: CanonicalIngredient) => {
    Keyboard.dismiss();
    const cleanName = (name || allergenInputText).trim();
    if (!cleanName) return;

    const norm = normalizeString(cleanName);
    const alreadyExists = userAllergens.some((a) => {
      const nameMatch = normalizeString(a.name) === norm;
      const idMatch = Boolean(ing && a.canonicalId && a.canonicalId === ing.id);
      return nameMatch || idMatch;
    });
    if (alreadyExists) {
      Alert.alert('Déjà enregistré', `« ${cleanName} » figure déjà dans votre liste d'allergènes.`);
      setAllergenInputText('');
      return;
    }

    const matched = ing || vocabList.find(
      (i) => i.normalizedName === norm || (i.aliases && i.aliases.includes(norm))
    );

    setPendingIngredient({
      name: matched ? matched.canonicalName : (cleanName.charAt(0).toUpperCase() + cleanName.slice(1)),
      canonicalId: matched?.id,
      currentFamily: matched?.allergen || null,
    });
    setIsPickerModalVisible(true);
  };

  const handleFamilyChosen = async (family: AllergenFamily | null) => {
    if (!pendingIngredient) return;
    try {
      let canonicalId = pendingIngredient.canonicalId;
      let canonicalName = pendingIngredient.name;

      // S'il n'existe pas encore dans le vocabulaire, on l'ajoute
      if (!canonicalId) {
        const created = await VocabularyService.add({
          canonicalName,
          allergen: family || undefined,
          isCustom: true,
        });
        canonicalId = created.id;
        canonicalName = created.canonicalName;
      } else if (family !== undefined) {
        // Mettre à jour le tag allergène dans le vocabulaire
        await VocabularyService.updateAllergenFamily(canonicalId, family);
      }

      // Ajouter aux allergènes utilisateur
      await StorageService.addUserAllergen({
        name: canonicalName,
        canonicalId,
        allergenFamily: family,
      });

      const updatedAllergens = await StorageService.getUserAllergens();
      setUserAllergens(updatedAllergens);
      const updatedVocab = await VocabularyService.getAll();
      setVocabList(updatedVocab);
      setVocabCount(updatedVocab.length);

      setAllergenInputText('');
      setPendingIngredient(null);
      setIsPickerModalVisible(false);
    } catch (e) {
      console.error('Erreur enregistrement allergène:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer cet allergène.");
    }
  };

  const handleRemoveAllergen = async (item: UserAllergenItem) => {
    await StorageService.removeUserAllergen(item.id);
    const updated = await StorageService.getUserAllergens();
    setUserAllergens(updated);
  };

  const handleClearAllAllergens = () => {
    if (userAllergens.length === 0) return;
    Alert.alert(
      'Vider mes allergies',
      'Voulez-vous supprimer l\'ensemble de vos allergènes enregistrés ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            await StorageService.saveUserAllergens([]);
            setUserAllergens([]);
          },
        },
      ]
    );
  };

  const handleEditChipFamily = (item: UserAllergenItem) => {
    setPendingIngredient({
      name: item.name,
      canonicalId: item.canonicalId,
      currentFamily: item.allergenFamily || null,
    });
    setIsPickerModalVisible(true);
  };

  const handleExportData = async () => {
    try {
      const json = await StorageService.exportAllData();
      await Share.share({
        title: 'Sauvegarde Recettes Papilles',
        message: json,
      });
    } catch (e) {
      console.error('Erreur export données:', e);
    }
  };

  const handleConfirmImport = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('Erreur', 'Veuillez coller le texte JSON à importer.');
      return;
    }

    setIsImporting(true);
    try {
      const result = await StorageService.importRecipes(importJsonText.trim());
      if (result.success) {
        Alert.alert('Succès', `${result.count} recette(s) ont été importées avec succès !`);
        setIsImportModalVisible(false);
        setImportJsonText('');
        if (onRecipesReloadNeeded) onRecipesReloadNeeded();
      } else {
        Alert.alert('Erreur importation', result.error || 'Format JSON invalide.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || "Impossible d'importer les données.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetDemo = () => {
    Alert.alert(
      'Réinitialiser les recettes',
      'Voulez-vous recharger les 100 recettes cultes du chef ? Vos modifications sur ces recettes seront réinitialisées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.resetToDemoRecipes();
              Alert.alert('Terminé', 'Les recettes initiales ont été rechargées.');
              if (onRecipesReloadNeeded) onRecipesReloadNeeded();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de réinitialiser.');
            }
          },
        },
      ]
    );
  };

  const handleResetVocabulary = () => {
    Alert.alert(
      'Réinitialiser le lexique',
      'Cette action va recharger les 208 ingrédients canoniques certifiés par défaut. Vos ajouts et personnalisations d\'ingrédients seront réinitialisés. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              await VocabularyService.resetToDefaults();
              await loadInitialSettings();
              Alert.alert('Succès', 'Le lexique a été réinitialisé avec les 208 ingrédients certifiés.');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de réinitialiser le lexique.');
            }
          },
        },
      ]
    );
  };

  const handleFullFactoryReset = () => {
    Alert.alert(
      'Remise à zéro complète ?',
      "Cette action va réinitialiser l'application à son état d'origine :\n\n• Rechargement des 100 recettes cultes Marmiton normalisées\n• Rechargement des 208 ingrédients de référence\n• Vidage complet de la liste de courses\n• Vidage complet du stock (étagères)\n• Vidage du planning hebdomadaire\n\nIdéal pour repartir sur une base 100% saine après une phase de test. Continuer ?",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout réinitialiser',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await VocabularyService.resetToDefaults();
              await StorageService.resetToDemoRecipes();
              await StorageService.clearAllShoppingItems();
              await StorageService.clearFridge();
              await StorageService.clearWeeklyPlan();

              if (onRecipesReloadNeeded) {
                await onRecipesReloadNeeded();
              }
              await loadInitialSettings();

              Alert.alert(
                'Application réinitialisée !',
                'Votre carnet a été restauré à l\'état d\'usine avec les 100 recettes cultes et le référentiel complet de 208 ingrédients.'
              );
            } catch (e: any) {
              Alert.alert('Erreur', e?.message || 'Impossible de réinitialiser.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  const ratedCount = recipes.filter((r) => (r.rating || 0) > 0).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header écran Paramètres */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="settings" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Paramètres</Text>
              <Text style={styles.headerSubtitle}>Préférences, IA & Gestion des données</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1 : THÈME & AMBIANCE */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Ambiance Visuelle & Thème</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Basculez entre l'herboristerie fraîche et l'ambiance feutrée du soir.
            </Text>

            <View style={styles.themeSelectorRow}>
              {/* Option Système */}
              <TouchableOpacity
                style={[styles.themeOptionBtn, themeMode === 'system' && styles.themeOptionActive]}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={themeMode === 'system' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'system' && styles.themeOptionTextActive,
                  ]}
                >
                  Système
                </Text>
                <Text style={styles.themeOptionSub}>Auto</Text>
              </TouchableOpacity>

              {/* Option Jardin Botanique */}
              <TouchableOpacity
                style={[
                  styles.themeOptionBtn,
                  themeMode === 'light' && styles.themeOptionActive,
                  { borderLeftWidth: 1, borderLeftColor: colors.borderLight },
                ]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.8}
              >
                <Text style={styles.themeEmoji}>🌿</Text>
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'light' && styles.themeOptionTextActive,
                  ]}
                >
                  Botanique
                </Text>
                <Text style={styles.themeOptionSub}>Clair</Text>
              </TouchableOpacity>

              {/* Option Table Nocturne */}
              <TouchableOpacity
                style={[
                  styles.themeOptionBtn,
                  themeMode === 'dark' && styles.themeOptionActive,
                  { borderLeftWidth: 1, borderLeftColor: colors.borderLight },
                ]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.8}
              >
                <Text style={styles.themeEmoji}>🌙</Text>
                <Text
                  style={[
                    styles.themeOptionText,
                    themeMode === 'dark' && styles.themeOptionTextActive,
                  ]}
                >
                  Nocturne
                </Text>
                <Text style={styles.themeOptionSub}>Sombre</Text>
              </TouchableOpacity>
            </View>

            {/* Pastilles d'aperçu de la palette active (placées en dessous du nom de la palette) */}
            <View style={styles.swatchCard}>
              <Text style={styles.swatchTitle}>
                Palette active :{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>
                  {themeId === 'botanique' ? 'Jardin Botanique' : 'Table Nocturne (Émeraude & Ardoise)'}
                </Text>
              </Text>
              <View style={styles.swatchRow}>
                <View style={[styles.swatchDot, { backgroundColor: colors.primary }]} />
                <View style={[styles.swatchDot, { backgroundColor: colors.secondary }]} />
                <View style={[styles.swatchDot, { backgroundColor: colors.amber }]} />
                <View style={[styles.swatchDot, { backgroundColor: colors.cardBackground, borderWidth: 1.5, borderColor: colors.border }]} />
                <View style={[styles.swatchDot, { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border }]} />
              </View>
            </View>
          </View>

          {/* SECTION 2 : INTELLIGENCE ARTIFICIELLE & CLÉ API */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Intelligence Artificielle (Gemini)</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Utilisée pour scanner des recettes manuscrites, analyser les ingrédients de vos photos et le mode Frigo magique.
            </Text>

            <View style={styles.apiKeyInputContainer}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Collez votre clé API Google AI Studio"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.inputActionBtn}
                onPress={() => setShowApiKey(!showApiKey)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {apiKey.length > 0 && (
                <TouchableOpacity
                  style={styles.inputActionBtn}
                  onPress={() => setApiKey('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.apiBtnRow}>
              <TouchableOpacity
                style={[styles.saveKeyBtn, isSavingKey && { opacity: 0.6 }]}
                onPress={handleSaveApiKey}
                disabled={isSavingKey}
                activeOpacity={0.8}
              >
                {isSavingKey ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                    <Text style={styles.saveKeyBtnText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testKeyBtn, testStatus.loading && { opacity: 0.6 }]}
                onPress={handleTestAi}
                disabled={testStatus.loading}
                activeOpacity={0.8}
              >
                {testStatus.loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={16} color={colors.primary} />
                    <Text style={styles.testKeyBtnText}>Tester la connexion</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Résultat du test de disponibilité */}
            {testStatus.message && (
              <View
                style={[
                  styles.statusBox,
                  testStatus.success ? styles.statusSuccess : styles.statusError,
                ]}
              >
                <Ionicons
                  name={testStatus.success ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={testStatus.success ? '#16A34A' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: testStatus.success ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {testStatus.message}
                </Text>
              </View>
            )}

            <View style={styles.aiInfoBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.aiInfoText}>
                Obtenez une clé gratuitement sur{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>
                  aistudio.google.com
                </Text>
                . Aucun moyen de paiement n'est nécessaire.
              </Text>
            </View>
          </View>

          {/* SECTION 3 : PRÉFÉRENCES DE CUISINE */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Préférences de Cuisine</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Nombre de convives par défaut pour les nouvelles recettes et le calcul des portions.
            </Text>

            <View style={styles.servingsStepperRow}>
              <TouchableOpacity
                style={[
                  styles.stepperBtn,
                  defaultServings <= 1 && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleSelectServings(Math.max(1, defaultServings - 1))}
                disabled={defaultServings <= 1}
                activeOpacity={0.7}
                accessibilityLabel="Diminuer le nombre de convives"
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={defaultServings <= 1 ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>

              <View style={styles.stepperValueContainer}>
                <Ionicons name="people" size={18} color={colors.primary} />
                <Text style={styles.stepperValueText}>
                  {defaultServings} {defaultServings > 1 ? 'personnes' : 'personne'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.stepperBtn,
                  defaultServings >= 50 && styles.stepperBtnDisabled,
                ]}
                onPress={() => handleSelectServings(Math.min(50, defaultServings + 1))}
                disabled={defaultServings >= 50}
                activeOpacity={0.7}
                accessibilityLabel="Augmenter le nombre de convives"
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 4 : MES ALLERGIES ALIMENTAIRES */}
          <View style={[styles.sectionCard, { zIndex: 90 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="warning-outline" size={20} color={colors.amber} />
              <Text style={styles.sectionTitle}>Mes Allergies Alimentaires</Text>
              {userAllergens.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                    {userAllergens.length}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSubtitle}>
              Définissez vos allergies alimentaires par ingrédient ou sélectionnez directement les 14 familles majeures (norme INCO).
            </Text>

            {/* Préférences & Règles de filtrage automatiques */}
            <View style={[styles.allergenSettingsBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              {/* Option 1 : Filtrer les recettes par défaut */}
              <View style={styles.allergenToggleRow}>
                <View style={styles.allergenToggleTextCol}>
                  <View style={styles.allergenToggleTitleRow}>
                    <Ionicons name="filter" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.allergenToggleTitle, { color: colors.textPrimary }]}>
                      Filtrer les recettes avec allergènes
                    </Text>
                  </View>
                  <Text style={[styles.allergenToggleSub, { color: colors.textMuted }]}>
                    Masque automatiquement sur l'accueil et la recherche les recettes contenant vos allergènes.
                  </Text>
                </View>
                <Switch
                  value={isAllergenFilterEnabled}
                  onValueChange={handleToggleAllergenFilter}
                  trackColor={{ false: colors.borderLight, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.allergenToggleDivider, { backgroundColor: colors.borderLight }]} />

              {/* Option 2 : Exclure des suggestions Chef IA */}
              <View style={styles.allergenToggleRow}>
                <View style={styles.allergenToggleTextCol}>
                  <View style={styles.allergenToggleTitleRow}>
                    <Ionicons name="sparkles" size={16} color={colors.amber} style={{ marginRight: 6 }} />
                    <Text style={[styles.allergenToggleTitle, { color: colors.textPrimary }]}>
                      Exclure des suggestions Chef IA
                    </Text>
                  </View>
                  <Text style={[styles.allergenToggleSub, { color: colors.textMuted }]}>
                    Interdit à l'IA de proposer des idées ou recettes contenant vos allergènes.
                  </Text>
                </View>
                <Switch
                  value={isAiAllergenExclusionEnabled}
                  onValueChange={handleToggleAiAllergenExclusion}
                  trackColor={{ false: colors.borderLight, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Boutons des 14 allergènes majeurs */}
            <View style={styles.allergenSubSection}>
              <View style={styles.allergenSubHeader}>
                <Text style={[styles.allergenSubTitle, { color: colors.textSecondary }]}>
                  14 Familles Majeures (Ajout rapide) :
                </Text>
              </View>
              <View style={styles.allergenButtonsGrid}>
                {ALLERGEN_FAMILIES.map((fam) => {
                  const associated = vocabList.filter((ing) => ing.allergen === fam.id);
                  const presentCount = associated.filter((ing) =>
                    userAllergens.some((a) => {
                      const nameMatch = normalizeString(a.name) === normalizeString(ing.canonicalName);
                      const idMatch = Boolean(a.canonicalId && a.canonicalId === ing.id);
                      return nameMatch || (idMatch && a.allergenFamily === fam.id);
                    })
                  ).length;
                  const isAllActive = associated.length > 0 && presentCount === associated.length;
                  const isPartiallyActive = presentCount > 0 && !isAllActive;

                  return (
                    <TouchableOpacity
                      key={fam.id}
                      style={[
                        styles.allergenFamilyBtn,
                        isAllActive
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : isPartiallyActive
                          ? { backgroundColor: colors.primaryLight, borderColor: colors.primary }
                          : { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight },
                      ]}
                      onPress={() => handleToggleAllergenFamily(fam)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.allergenFamilyEmoji}>{fam.emoji}</Text>
                      <Text
                        style={[
                          styles.allergenFamilyText,
                          { color: isAllActive ? '#FFFFFF' : isPartiallyActive ? colors.primary : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {fam.name}
                      </Text>
                      {isAllActive && (
                        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                      )}
                      {isPartiallyActive && (
                        <Text style={[styles.partialCountText, { color: colors.primary }]}>
                          ({presentCount})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Saisie manuelle d'un ingrédient spécifique */}
            <View style={[styles.allergenSubSection, { zIndex: 100 }]}>
              <Text style={[styles.allergenSubTitle, { color: colors.textSecondary, marginBottom: 8 }]}>
                Ajouter un ingrédient spécifique :
              </Text>
              <View style={styles.quickAddMainRow}>
                <IngredientAutocompleteInput
                  containerStyle={{ flex: 1, marginRight: 8, zIndex: 100 }}
                  style={[styles.nameInput, { width: '100%', marginRight: 0 }]}
                  placeholder="Ex: Noix de cajou, Fraise, Beurre..."
                  placeholderTextColor={colors.textMuted}
                  value={allergenInputText}
                  onChangeText={setAllergenInputText}
                  clearOnSelect
                  returnKeyType="done"
                  onRequestQualify={(raw) => handleInitiateAddIngredient(raw)}
                  onSubmitEditing={() => handleInitiateAddIngredient()}
                  onSelectIngredient={(ing) => {
                    handleInitiateAddIngredient(ing.canonicalName, ing);
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    !allergenInputText.trim() && styles.addButtonDisabled,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={() => handleInitiateAddIngredient()}
                  disabled={!allergenInputText.trim()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Liste des allergènes enregistrés regroupés par famille + Autre */}
            <View style={styles.allergenSubSection}>
              <View style={styles.listSectionHeaderRow}>
                <Text style={[styles.allergenSubTitle, { color: colors.textSecondary }]}>
                  Mes allergènes enregistrés :
                </Text>
                {userAllergens.length > 0 && (
                  <TouchableOpacity onPress={handleClearAllAllergens} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.clearAllBtnText, { color: colors.danger }]}>Tout effacer</Text>
                  </TouchableOpacity>
                )}
              </View>

              {userAllergens.length === 0 ? (
                <View style={[styles.emptyAllergenBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
                  <Text style={[styles.emptyAllergenTitle, { color: colors.textPrimary }]}>
                    Aucun allergène enregistré
                  </Text>
                  <Text style={[styles.emptyAllergenDesc, { color: colors.textMuted }]}>
                    Sélectionnez les 14 familles majeures en 1 clic ou saisissez vos allergies alimentaires ci-dessus.
                  </Text>
                </View>
              ) : (
                <View style={styles.groupedAllergensContainer}>
                  {/* Groupes des 14 familles */}
                  {ALLERGEN_FAMILIES.map((fam) => {
                    const items = userAllergens.filter((a) => a.allergenFamily === fam.id);
                    if (items.length === 0) return null;

                    return (
                      <View key={fam.id} style={[styles.allergenGroupCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                        <View style={styles.allergenGroupHeader}>
                          <View style={styles.allergenGroupHeaderLeft}>
                            <Text style={styles.allergenGroupEmoji}>{fam.emoji}</Text>
                            <Text style={[styles.allergenGroupTitle, { color: colors.textPrimary }]}>
                              {fam.name}
                            </Text>
                            <View style={[styles.groupCountBadge, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.groupCountText, { color: colors.primary }]}>
                                {items.length}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert(
                                `Retirer ${fam.name}`,
                                `Retirer tous les ingrédients de la famille ${fam.name} ?`,
                                [
                                  { text: 'Annuler', style: 'cancel' },
                                  {
                                    text: 'Retirer',
                                    style: 'destructive',
                                    onPress: async () => {
                                      const associated = vocabList.filter((ing) => ing.allergen === fam.id);
                                      const associatedNames = new Set(associated.map((i) => normalizeString(i.canonicalName)));
                                      const associatedIds = new Set(associated.map((i) => i.id));
                                      const remaining = userAllergens.filter((a) => {
                                        if (a.allergenFamily === fam.id) return false;
                                        if (associatedNames.has(normalizeString(a.name))) return false;
                                        if (a.canonicalId && associatedIds.has(a.canonicalId)) return false;
                                        return true;
                                      });
                                      await StorageService.saveUserAllergens(remaining);
                                      setUserAllergens(remaining);
                                    },
                                  },
                                ]
                              );
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.chipsWrapRow}>
                          {items.map((item) => (
                            <View
                              key={item.id}
                              style={[styles.allergenChip, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                            >
                              <TouchableOpacity
                                onPress={() => handleEditChipFamily(item)}
                                style={styles.chipTextContainer}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                                  {item.name}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleRemoveAllergen(item)}
                                style={styles.chipDeleteBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="close" size={14} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}

                  {/* Groupe "Autre" */}
                  {(() => {
                    const otherItems = userAllergens.filter((a) => !a.allergenFamily);
                    if (otherItems.length === 0) return null;

                    return (
                      <View style={[styles.allergenGroupCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
                        <View style={styles.allergenGroupHeader}>
                          <View style={styles.allergenGroupHeaderLeft}>
                            <Text style={styles.allergenGroupEmoji}>❓</Text>
                            <Text style={[styles.allergenGroupTitle, { color: colors.textPrimary }]}>
                              Autres allergies spécifiques
                            </Text>
                            <View style={[styles.groupCountBadge, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.groupCountText, { color: colors.primary }]}>
                                {otherItems.length}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.chipsWrapRow}>
                          {otherItems.map((item) => (
                            <View
                              key={item.id}
                              style={[styles.allergenChip, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                            >
                              <TouchableOpacity
                                onPress={() => handleEditChipFamily(item)}
                                style={styles.chipTextContainer}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                                  {item.name}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleRemoveAllergen(item)}
                                style={styles.chipDeleteBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="close" size={14} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              )}
            </View>
          </View>

          {/* SECTION : PLANIFICATION DES MENUS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Planification des Menus</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Organisez vos prévisions selon vos habitudes : semaine fixe de courses ou planning dynamique glissant.
            </Text>

            {/* Sélecteur de mode Fixe vs Dynamique */}
            <View style={styles.plannerModeRow}>
              <TouchableOpacity
                style={[
                  styles.plannerModeBtn,
                  plannerSettings.mode === 'fixed' && styles.plannerModeBtnActive,
                ]}
                onPress={() => handleSelectPlannerMode('fixed')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={plannerSettings.mode === 'fixed' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.plannerModeBtnText,
                    plannerSettings.mode === 'fixed' && styles.plannerModeBtnTextActive,
                  ]}
                >
                  Fixe
                </Text>
                <Text style={styles.plannerModeSub}>Semaine de courses</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.plannerModeBtn,
                  plannerSettings.mode === 'dynamic' && styles.plannerModeBtnActive,
                  { borderLeftWidth: 1, borderLeftColor: colors.borderLight },
                ]}
                onPress={() => handleSelectPlannerMode('dynamic')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="flash"
                  size={18}
                  color={plannerSettings.mode === 'dynamic' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.plannerModeBtnText,
                    plannerSettings.mode === 'dynamic' && styles.plannerModeBtnTextActive,
                  ]}
                >
                  Dynamique
                </Text>
                <Text style={styles.plannerModeSub}>Dès aujourd'hui</Text>
              </TouchableOpacity>
            </View>

            {/* Configuration mode Fixe */}
            {plannerSettings.mode === 'fixed' ? (
              <View style={styles.fixedConfigContainer}>
                <Text style={styles.configLabel}>Premier jour de la semaine :</Text>
                <Text style={styles.configSubLabel}>
                  Choisissez par quel jour commence votre organisation (ex: jour de vos courses).
                </Text>

                <View style={styles.daysChipsRow}>
                  {ORDERED_DAYS_OF_WEEK.map((day) => {
                    const isSelected = plannerSettings.startDay === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayChip,
                          isSelected && styles.dayChipActive,
                        ]}
                        onPress={() => handleSelectPlannerStartDay(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            isSelected && styles.dayChipTextActive,
                          ]}
                        >
                          {day.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.plannerSummaryBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.plannerSummaryText}>
                    Votre menu s'organisera du{' '}
                    <Text style={{ fontWeight: '700', color: colors.primary }}>
                      {plannerSettings.startDay}
                    </Text>
                    {' au '}
                    <Text style={{ fontWeight: '700', color: colors.primary }}>
                      {ORDERED_DAYS_OF_WEEK[
                        (ORDERED_DAYS_OF_WEEK.indexOf(plannerSettings.startDay) + 6) % 7
                      ]}
                    </Text>
                    .
                  </Text>
                </View>
              </View>
            ) : (
              /* Configuration mode Dynamique */
              <View style={styles.dynamicConfigContainer}>
                <View style={styles.plannerSummaryBox}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.plannerSummaryText, { fontWeight: '700', marginBottom: 2 }]}>
                      Planning continu sur 7 jours
                    </Text>
                    <Text style={styles.plannerSummaryText}>
                      Vos prévisions s'affichent à partir d'aujourd'hui, en commençant par le prochain repas à préparer. Les repas passés sont grisés et restent modifiables si vous souhaitez forcer un choix.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* SECTION : LEXIQUE & VOCABULAIRE DES INGRÉDIENTS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="book-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Lexique & Ingrédients Canoniques</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Standardisation stricte pour éviter les doublons et synonymes ('petits pois' vs 'boîte de petits pois', 'muscade', 'carotte'...).
            </Text>

            <View style={styles.dataActionsColumn}>
              {/* Bouton 1 : Consulter & Gérer le lexique */}
              <TouchableOpacity
                style={styles.dataActionBtn}
                onPress={() => setIsVocabModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="library-outline" size={20} color={colors.primary} />
                <View style={styles.dataActionInfo}>
                  <Text style={styles.dataActionTitle}>Gérer le vocabulaire des ingrédients</Text>
                  <Text style={styles.dataActionDesc}>
                    {vocabCount > 0 ? `${vocabCount} ingrédients canoniques répertoriés` : 'Consulter, renommer, fusionner'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Bouton 2 : Réinitialiser le lexique par défaut */}
              <TouchableOpacity
                style={[styles.dataActionBtn, { borderBottomWidth: 0 }]}
                onPress={handleResetVocabulary}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                <View style={styles.dataActionInfo}>
                  <Text style={styles.dataActionTitle}>Réinitialiser le lexique d'origine</Text>
                  <Text style={styles.dataActionDesc}>Recharge les 208 ingrédients et alias certifiés</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 5 : GESTION DES DONNÉES & SAUVEGARDE */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="file-tray-full-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Données & Sauvegarde</Text>
            </View>

            {/* Statistiques rapides */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{recipes.length}</Text>
                <Text style={styles.statLabel}>Recettes</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{ratedCount}</Text>
                <Text style={styles.statLabel}>Notées</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{shoppingCount}</Text>
                <Text style={styles.statLabel}>En courses</Text>
              </View>
            </View>

            {/* Boutons d'export / import */}
            <View style={styles.dataActionsColumn}>
              <TouchableOpacity
                style={styles.dataActionBtn}
                onPress={handleExportData}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
                <View style={styles.dataActionInfo}>
                  <Text style={styles.dataActionTitle}>Exporter ma collection</Text>
                  <Text style={styles.dataActionDesc}>Sauvegarde complète au format JSON</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dataActionBtn}
                onPress={() => setIsImportModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
                <View style={styles.dataActionInfo}>
                  <Text style={styles.dataActionTitle}>Importer des recettes</Text>
                  <Text style={styles.dataActionDesc}>Coller un export JSON de recettes</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dataActionBtn}
                onPress={handleResetDemo}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={18} color={colors.danger} />
                <View style={styles.dataActionInfo}>
                  <Text style={[styles.dataActionTitle, { color: colors.danger }]}>
                    Réinitialiser les recettes Marmiton
                  </Text>
                  <Text style={styles.dataActionDesc}>Recharge le catalogue culte par défaut</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Bouton de remise à zéro complète pour purger les tests */}
              <TouchableOpacity
                style={[styles.dataActionBtn, { borderBottomWidth: 0 }]}
                onPress={handleFullFactoryReset}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-bin-outline" size={18} color={colors.danger} />
                <View style={styles.dataActionInfo}>
                  <Text style={[styles.dataActionTitle, { color: colors.danger }]}>
                    Remise à zéro complète (Nettoyer les tests)
                  </Text>
                  <Text style={styles.dataActionDesc}>
                    Recharge recettes & lexique, vide courses, stock et planning
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 6 : À PROPOS */}
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Papilles — Carnet de Recettes & Menus</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0 • Mobile First</Text>
            <Text style={styles.aboutPrivacy}>
              🔒 Vos données, recettes et photos sont stockées à 100% sur votre appareil. Aucune télémétrie ni revente de données.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Modal d'importation JSON */}
      <Modal
        visible={isImportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImportModalVisible(false)}
      >
        <View style={styles.importBackdrop}>
          <View style={styles.importDialog}>
            <Text style={styles.importDialogTitle}>Importer des Recettes</Text>
            <Text style={styles.importDialogDesc}>
              Collez ci-dessous le code JSON issu d'un export précédent :
            </Text>
            <TextInput
              style={styles.importTextInput}
              multiline
              value={importJsonText}
              onChangeText={setImportJsonText}
              placeholder='[ { "title": "Ma recette", ... } ]'
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.importDialogBtnRow}>
              <TouchableOpacity
                style={styles.importCancelBtn}
                onPress={() => setIsImportModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.importCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.importConfirmBtn, isImporting && { opacity: 0.6 }]}
                onPress={handleConfirmImport}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                {isImporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.importConfirmText}>Importer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de gestion du lexique & vocabulaire des ingrédients */}
      <VocabularyManagerModal
        visible={isVocabModalVisible}
        onClose={() => {
          setIsVocabModalVisible(false);
          loadInitialSettings();
        }}
      />

      {/* Modal de classification de la famille d'allergène */}
      {pendingIngredient && (
        <AllergenFamilyPickerModal
          visible={isPickerModalVisible}
          ingredientName={pendingIngredient.name}
          currentFamily={pendingIngredient.currentFamily}
          onSelectFamily={handleFamilyChosen}
          onClose={() => {
            setIsPickerModalVisible(false);
            setPendingIngredient(null);
          }}
        />
      )}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  themeOptionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  themeOptionActive: {
    backgroundColor: colors.cardBackground,
    ...shadows.small,
  },
  themeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  themeOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  themeOptionSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  swatchCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  swatchTitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  apiKeyInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: colors.textPrimary,
  },
  inputActionBtn: {
    padding: 8,
  },
  apiBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  saveKeyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  saveKeyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  testKeyBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  testKeyBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusError: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  aiInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  aiInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  servingsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  stepperBtnDisabled: {
    opacity: 0.35,
    backgroundColor: colors.surfaceAlt,
    elevation: 0,
    shadowOpacity: 0,
  },
  stepperValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepperValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  allergenSubSection: {
    marginBottom: 16,
  },
  allergenSettingsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  allergenToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  allergenToggleTextCol: {
    flex: 1,
  },
  allergenToggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  allergenToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  allergenToggleSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  allergenToggleDivider: {
    height: 1,
    marginVertical: 10,
  },
  allergenSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  allergenSubTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  allergenButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  allergenFamilyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  allergenFamilyEmoji: {
    fontSize: 14,
  },
  allergenFamilyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  partialCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickAddMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    height: 44,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  listSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyAllergenBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAllergenTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyAllergenDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  groupedAllergensContainer: {
    gap: 10,
  },
  allergenGroupCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  allergenGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  allergenGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allergenGroupEmoji: {
    fontSize: 16,
  },
  allergenGroupTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  groupCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 6,
  },
  chipTextContainer: {
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chipDeleteBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannerModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  plannerModeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    gap: 2,
  },
  plannerModeBtnActive: {
    backgroundColor: colors.cardBackground,
    ...shadows.small,
  },
  plannerModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  plannerModeBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  plannerModeSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  fixedConfigContainer: {
    gap: 10,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  configSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  daysChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  dayChip: {
    flex: 1,
    minWidth: 40,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  plannerSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  plannerSummaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    flex: 1,
  },
  dynamicConfigContainer: {
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dataActionsColumn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
  },
  dataActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dataActionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dataActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dataActionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  aboutPrivacy: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  importBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  importDialog: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.large,
  },
  importDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  importDialogDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  importTextInput: {
    height: 140,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  importDialogBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  importCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  importCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  importConfirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  importConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
}));
