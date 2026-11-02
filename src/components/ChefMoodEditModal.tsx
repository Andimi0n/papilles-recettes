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
import { ChefMoodOption } from '../services/recipeAiService';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';

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
      Alert.alert('Philosophie requise', "Veuillez détailler l'identité et la philosophie du Chef (Étape 1).");
      return;
    }
    if (!trimmedDirective) {
      Alert.alert('Directive requise', "Veuillez formuler la demande pour les 3 idées de plats (Étape 1).");
      return;
    }
    if (!trimmedExecution) {
      Alert.alert('Consignes requises', "Veuillez renseigner les consignes de rédaction pour la recette complète (Étape 2).");
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

        {/* 3. Philosophie & Identité (Étape 1 - 3 idées) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>1. Identité du Chef (Étape 1 - 3 idées) *</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3 Idées</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Définissez la personnalité, la philosophie culinaire et le ton du Chef IA.
          </Text>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            value={systemPersona}
            onChangeText={setSystemPersona}
            placeholder="Ex: Tu es un chef spécialisé dans les cuissons au barbecue, les marinades intenses et la cuisine en plein air..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* 4. Directive Utilisateur (Étape 1 - 3 idées) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>2. Directive de suggestion (Étape 1) *</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3 Idées</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            La consigne directe de recherche de plats passée au modèle.
          </Text>
          <TextInput
            style={styles.input}
            value={userDirective}
            onChangeText={setUserDirective}
            placeholder="Ex: Conçois 3 idées de grillades et marinades ultra-savoureuses"
            placeholderTextColor={colors.textMuted}
            maxLength={120}
          />
        </View>

        {/* 5. Consignes de Rédaction (Étape 2 - Recette complète) */}
        <View style={styles.formGroup}>
          <View style={styles.labelWithBadgeRow}>
            <Text style={styles.label}>3. Consignes de rédaction (Étape 2 - Fiche recette) *</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Recette complète</Text>
            </View>
          </View>
          <Text style={styles.helperText}>
            Règles de style, exigences techniques et conseil du chef (&apos;userNote&apos;) pour la recette détaillée.
          </Text>
          <TextInput
            style={[styles.input, styles.textAreaLarge]}
            value={recipeExecutionPrompt}
            onChangeText={setRecipeExecutionPrompt}
            placeholder={`Ex: Tu es un maître du feu et des cuissons braisées.\n- Style : étapes détaillant les températures et le temps de repos.\n- Astuce ('userNote') : donne un secret pour réussir la sauce ou la croûte.`}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
          />
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
    color: colors.primary,
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
  textAreaLarge: {
    minHeight: 88,
    textAlignVertical: 'top',
    lineHeight: 20,
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
