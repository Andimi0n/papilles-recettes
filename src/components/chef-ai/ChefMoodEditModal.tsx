import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChefMoodOption, ChefAiModelSpeed } from '../../services/recipeAiService';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';

export interface ChefMoodEditModalProps {
  visible: boolean;
  mood: ChefMoodOption | null;
  onSave: (savedMood: ChefMoodOption) => Promise<void> | void;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'sparkles-outline',
  'flame-outline',
  'flash-outline',
  'leaf-outline',
  'basket-outline',
  'wine-outline',
  'earth-outline',
  'color-palette-outline',
  'restaurant-outline',
  'pizza-outline',
  'cafe-outline',
  'ice-cream-outline',
  'fish-outline',
  'nutrition-outline',
  'heart-outline',
  'ribbon-outline',
  'fast-food-outline',
  'beer-outline',
];

interface ChefMoodFormProps {
  mood: ChefMoodOption | null;
  onSave: (savedMood: ChefMoodOption) => Promise<void> | void;
  onClose: () => void;
  insets: EdgeInsets;
}

const ChefMoodForm: React.FC<ChefMoodFormProps> = ({
  mood,
  onSave,
  onClose,
  insets,
}) => {
  const { colors } = useTheme();

  const [label, setLabel] = useState(mood?.label || '');
  const [selectedIcon, setSelectedIcon] = useState(mood?.icon || 'sparkles-outline');
  const [systemPersona, setSystemPersona] = useState(mood?.systemPersona || '');
  const [userDirective, setUserDirective] = useState(mood?.userDirective || '');
  const [recipeExecutionPrompt, setRecipeExecutionPrompt] = useState(mood?.recipeExecutionPrompt || '');
  const [ideasModelSpeed, setIdeasModelSpeed] = useState<ChefAiModelSpeed>(
    mood?.ideasModelSpeed || (mood?.id === 'creatif' ? 'thoughtful' : 'fast')
  );
  const [recipeModelSpeed, setRecipeModelSpeed] = useState<ChefAiModelSpeed>(
    mood?.recipeModelSpeed || 'fast'
  );
  const [showPromptStructure, setShowPromptStructure] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = mood !== null;

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    const trimmedPersona = systemPersona.trim();
    const trimmedDirective = userDirective.trim();
    const trimmedExecution = recipeExecutionPrompt.trim();

    if (!trimmedLabel) {
      Alert.alert('Nom requis', "Veuillez renseigner le nom de l'humeur du Chef.");
      return;
    }
    if (!trimmedPersona) {
      Alert.alert(
        'Identité requise',
        "Veuillez détailler l'identité et la philosophie commune du Chef (Étapes 1 & 2)."
      );
      return;
    }
    if (!trimmedDirective) {
      Alert.alert(
        'Directive requise',
        "Veuillez formuler la consigne de suggestion pour les 3 idées (Étape 1)."
      );
      return;
    }
    if (!trimmedExecution) {
      Alert.alert(
        'Consignes requises',
        "Veuillez renseigner les consignes de rédaction pour la recette complète (Étape 2)."
      );
      return;
    }

    try {
      setIsSaving(true);
      const moodId = mood ? mood.id : `custom_mood_${Date.now()}`;
      const savedMood: ChefMoodOption = {
        id: moodId,
        label: trimmedLabel,
        icon: selectedIcon,
        systemPersona: trimmedPersona,
        userDirective: trimmedDirective,
        recipeExecutionPrompt: trimmedExecution,
        isCustom: mood ? (mood.isCustom ?? false) : true,
        ideasModelSpeed,
        recipeModelSpeed,
      };

      await onSave(savedMood);
      onClose();
    } catch {
      Alert.alert('Erreur', "Une erreur est survenue lors de l'enregistrement de l'humeur.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerIconContainer}>
            <Ionicons
              name={isEditing ? 'create-outline' : 'sparkles-outline'}
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={styles.headerTitle}>
            {isEditing ? "Modifier l'humeur" : 'Nouvelle humeur du Chef'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Form Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encadré d'information : Architecture des Prompts */}
        <View style={styles.infoAccordionBox}>
          <TouchableOpacity
            style={styles.infoAccordionHeader}
            onPress={() => setShowPromptStructure(!showPromptStructure)}
            activeOpacity={0.7}
          >
            <View style={styles.infoAccordionHeaderLeft}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoAccordionTitle}>
                Structure des prompts finaux (Étapes 1 &amp; 2)
              </Text>
            </View>
            <Ionicons
              name={showPromptStructure ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showPromptStructure && (
            <View style={styles.infoAccordionContent}>
              <View style={styles.promptStepItem}>
                <Text style={styles.promptStepHeader}>
                  Étape 1 : 3 Idées de recettes
                </Text>
                <Text style={styles.promptStepDetail}>
                  • <Text style={styles.promptStepBold}>Prompt Système :</Text> Identité commune du Chef + Contraintes diététiques &amp; anti-redondance.
                </Text>
                <Text style={styles.promptStepDetail}>
                  • <Text style={styles.promptStepBold}>Prompt Utilisateur :</Text> Directives de suggestion + Ingrédients du frigo sélectionnés.
                </Text>
              </View>

              <View style={styles.promptStepDivider} />

              <View style={styles.promptStepItem}>
                <Text style={styles.promptStepHeader}>
                  Étape 2 : Recette complète détaillée
                </Text>
                <Text style={styles.promptStepDetail}>
                  • <Text style={styles.promptStepBold}>Prompt Système :</Text> Identité commune du Chef + Directives de rédaction de la recette + Titre de l&apos;idée validée.
                </Text>
                <Text style={styles.promptStepDetail}>
                  • <Text style={styles.promptStepBold}>Prompt Utilisateur :</Text> &quot;Rédige cette recette (mode &apos;...&apos;)&quot; + Ingrédients clés et fonds de placard.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 1. Nom de l'humeur */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nom de l&apos;humeur *</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Ex: Barbecue & Fumoir, Cuisine Étudiante..."
            placeholderTextColor={colors.textMuted}
            maxLength={40}
          />
        </View>

        {/* 2. Choix de l'icône */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Icône visuelle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconListRow}
          >
            {AVAILABLE_ICONS.map((iconName) => {
              const isSelected = selectedIcon === iconName;
              return (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconChip,
                    isSelected && styles.iconChipSelected,
                  ]}
                  onPress={() => setSelectedIcon(iconName)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={iconName as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Identité du Chef (Commune Étapes 1 & 2) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>1. Identité du Chef (Commune Étapes 1 &amp; 2) *</Text>
            <View style={styles.stepBadgeCommon}>
              <Text style={styles.stepBadgeCommonText}>Commune 1 &amp; 2</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Définit qui est le chef, sa philosophie culinaire, ses valeurs et son ton. Injecté comme socle au début des étapes 1 et 2.
          </Text>
          <TextInput
            style={[styles.input, styles.textAreaAuto]}
            value={systemPersona}
            onChangeText={setSystemPersona}
            placeholder="Ex: Tu es un chef spécialisé dans les cuissons au barbecue, les marinades intenses et la cuisine en plein air. Ta philosophie : sublimer les produits bruts avec la maîtrise du feu..."
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled={false}
          />
        </View>

        {/* 4. Directives de suggestion (Étape 1 - 3 idées) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>2. Directives de suggestion (Étape 1) *</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Étape 1 (3 idées)</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Consigne concise guidant la recherche et l&apos;orientation des 3 idées de plats.
          </Text>
          <TextInput
            style={[styles.input, styles.textAreaAuto]}
            value={userDirective}
            onChangeText={setUserDirective}
            placeholder="Ex: Conçois 3 idées de grillades et marinades ultra-savoureuses, faciles à réaliser en extérieur"
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled={false}
          />
          {/* Sélecteur de modèle pour Étape 1 */}
          <View style={styles.speedSelectorContainer}>
            <Text style={styles.speedSelectorLabel}>Modèle IA pour les 3 idées :</Text>
            <View style={styles.speedButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.speedButton,
                  ideasModelSpeed === 'fast' && styles.speedButtonSelected,
                ]}
                onPress={() => setIdeasModelSpeed('fast')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mode rapide Flash Lite pour les 3 idées"
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={ideasModelSpeed === 'fast' ? '#FFFFFF' : colors.primary}
                />
                <View style={styles.speedButtonTextCol}>
                  <Text
                    style={[
                      styles.speedButtonText,
                      ideasModelSpeed === 'fast' && styles.speedButtonTextSelected,
                    ]}
                  >
                    Rapide
                  </Text>
                  <Text
                    style={[
                      styles.speedButtonSubtext,
                      ideasModelSpeed === 'fast' && styles.speedButtonSubtextSelected,
                    ]}
                  >
                    Flash-Lite
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.speedButton,
                  ideasModelSpeed === 'thoughtful' && styles.speedButtonSelected,
                ]}
                onPress={() => setIdeasModelSpeed('thoughtful')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mode réfléchi Flash standard pour les 3 idées"
              >
                <Ionicons
                  name="bulb"
                  size={16}
                  color={ideasModelSpeed === 'thoughtful' ? '#FFFFFF' : colors.amber}
                />
                <View style={styles.speedButtonTextCol}>
                  <Text
                    style={[
                      styles.speedButtonText,
                      ideasModelSpeed === 'thoughtful' && styles.speedButtonTextSelected,
                    ]}
                  >
                    Réfléchi
                  </Text>
                  <Text
                    style={[
                      styles.speedButtonSubtext,
                      ideasModelSpeed === 'thoughtful' && styles.speedButtonSubtextSelected,
                    ]}
                  >
                    Flash 2e
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. Directives de rédaction (Étape 2 - Fiche recette) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>3. Directives de rédaction (Étape 2) *</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Étape 2 (Recette)</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Consignes courtes sur le style, la précision des découpes/cuissons et l&apos;astuce du chef (&apos;userNote&apos;) pour la fiche complète.
          </Text>
          <TextInput
            style={[styles.input, styles.textAreaAuto]}
            value={recipeExecutionPrompt}
            onChangeText={setRecipeExecutionPrompt}
            placeholder={`Ex: - Style de rédaction : étapes précises détaillant les températures et le temps de repos de la viande.\n- Technique : explique la caramélisation des sucs.\n- Astuce ('userNote') : donne un secret pour réussir la sauce ou la croûte.`}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled={false}
          />
          {/* Sélecteur de modèle pour Étape 2 */}
          <View style={styles.speedSelectorContainer}>
            <Text style={styles.speedSelectorLabel}>Modèle IA pour la recette complète :</Text>
            <View style={styles.speedButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.speedButton,
                  recipeModelSpeed === 'fast' && styles.speedButtonSelected,
                ]}
                onPress={() => setRecipeModelSpeed('fast')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mode rapide Flash Lite pour la recette complète"
              >
                <Ionicons
                  name="flash"
                  size={16}
                  color={recipeModelSpeed === 'fast' ? '#FFFFFF' : colors.primary}
                />
                <View style={styles.speedButtonTextCol}>
                  <Text
                    style={[
                      styles.speedButtonText,
                      recipeModelSpeed === 'fast' && styles.speedButtonTextSelected,
                    ]}
                  >
                    Rapide
                  </Text>
                  <Text
                    style={[
                      styles.speedButtonSubtext,
                      recipeModelSpeed === 'fast' && styles.speedButtonSubtextSelected,
                    ]}
                  >
                    Flash-Lite
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.speedButton,
                  recipeModelSpeed === 'thoughtful' && styles.speedButtonSelected,
                ]}
                onPress={() => setRecipeModelSpeed('thoughtful')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Mode réfléchi Flash standard pour la recette complète"
              >
                <Ionicons
                  name="bulb"
                  size={16}
                  color={recipeModelSpeed === 'thoughtful' ? '#FFFFFF' : colors.amber}
                />
                <View style={styles.speedButtonTextCol}>
                  <Text
                    style={[
                      styles.speedButtonText,
                      recipeModelSpeed === 'thoughtful' && styles.speedButtonTextSelected,
                    ]}
                  >
                    Réfléchi
                  </Text>
                  <Text
                    style={[
                      styles.speedButtonSubtext,
                      recipeModelSpeed === 'thoughtful' && styles.speedButtonSubtextSelected,
                    ]}
                  >
                    Flash 2e
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Enregistrement...' : "Enregistrer l'humeur"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export const ChefMoodEditModal: React.FC<ChefMoodEditModalProps> = ({
  visible,
  mood,
  onSave,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {visible ? (
          <ChefMoodForm
            key={mood ? mood.id : 'new_mood'}
            mood={mood}
            onSave={onSave}
            onClose={onClose}
            insets={insets}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...shadows.large,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  infoAccordionBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 12,
    marginBottom: 16,
  },
  infoAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  infoAccordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  infoAccordionContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  promptStepItem: {
    marginBottom: 6,
  },
  promptStepHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  promptStepDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 2,
  },
  promptStepBold: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  promptStepDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 6,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepBadgeCommon: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeCommonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  stepBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textAreaAuto: {
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconListRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedSelectorContainer: {
    marginTop: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  speedSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  speedButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  speedButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedButtonTextCol: {
    flex: 1,
  },
  speedButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  speedButtonTextSelected: {
    color: '#FFFFFF',
  },
  speedButtonSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  speedButtonSubtextSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    ...shadows.card,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
