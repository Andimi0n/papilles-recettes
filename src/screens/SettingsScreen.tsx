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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { StorageService } from '../services/storageService';
import { RecipeAiService } from '../services/recipeAiService';
import { VocabularyService } from '../services/vocabularyService';
import { VocabularyManagerModal } from '../components/VocabularyManagerModal';
import { Recipe } from '../types/recipe';

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

  // Vocabulaire & Lexique Ingrédients
  const [isVocabModalVisible, setIsVocabModalVisible] = useState(false);
  const [vocabCount, setVocabCount] = useState(0);
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Import JSON Modal/State
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const loadInitialSettings = async () => {
    try {
      const key = await RecipeAiService.getApiKey();
      setApiKey(key || '');

      const servings = await StorageService.getDefaultServings();
      setDefaultServings(servings);

      const items = await StorageService.getShoppingList();
      setShoppingCount(items.length);

      const vocabList = await VocabularyService.getAll();
      setVocabCount(vocabList.length);
    } catch (e) {
      console.error('Erreur chargement réglages:', e);
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

  const handleNormalizeAllIngredients = () => {
    Alert.alert(
      'Normaliser tous les ingrédients ?',
      "Cette action va parcourir toutes vos recettes enregistrées, votre liste de courses et vos étagères pour uniformiser le nom des ingrédients selon le lexique canonique strict (suppression des contenants, doublons et préfixes).\n\nLes étapes de vos recettes restent 100% inchangées.",
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Normaliser maintenant',
          onPress: async () => {
            setIsNormalizing(true);
            try {
              const res = await StorageService.runCanonicalVocabularyMigration(true);
              if (onRecipesReloadNeeded) {
                await onRecipesReloadNeeded();
              }
              await loadInitialSettings();
              Alert.alert(
                'Harmonisation terminée !',
                `Résultats de la normalisation :\n• ${res.recipesUpdated} recette(s) mise(s) à jour\n• ${res.shoppingUpdated} article(s) de courses harmonisé(s)\n• ${res.fridgeUpdated} aliment(s) d'étagères mis à jour`
              );
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de terminer la normalisation.');
            } finally {
              setIsNormalizing(false);
            }
          },
        },
      ]
    );
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {/* SECTION 4 : LEXIQUE & VOCABULAIRE DES INGRÉDIENTS */}
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

              {/* Bouton 2 : Harmonisation / Normalisation globale à la demande */}
              <TouchableOpacity
                style={[styles.dataActionBtn, { borderBottomWidth: 0 }]}
                onPress={handleNormalizeAllIngredients}
                disabled={isNormalizing}
                activeOpacity={0.7}
              >
                {isNormalizing ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 2 }} />
                ) : (
                  <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                )}
                <View style={styles.dataActionInfo}>
                  <Text style={styles.dataActionTitle}>Normaliser tous les ingrédients</Text>
                  <Text style={styles.dataActionDesc}>
                    Harmonise en 1 clic vos recettes, liste de courses et étagères
                  </Text>
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
                style={[styles.dataActionBtn, { borderBottomWidth: 0 }]}
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
