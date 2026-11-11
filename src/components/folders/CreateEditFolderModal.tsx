import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder, FolderSummary } from '../../types/folder';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';

export interface CreateEditFolderModalProps {
  visible: boolean;
  folder?: Folder | FolderSummary | null;
  onSave: (data: { name: string; icon: string }) => Promise<void> | void;
  onClose: () => void;
}

export const CULINARY_FOLDER_EMOJIS = [
  '📁', '🍰', '🥗', '⏱️', '🍝', '🍕', '🍲', '🥐',
  '🥞', '🍔', '🍣', '🥑', '🍖', '🥪', '🥟', '🌮',
  '☕', '🍷', '🍨', '🍪', '🥖', '🥣', '🍱', '🍤',
  '🍎', '🥦', '🥕', '🍓', '🍋', '🧀', '🍳', '🍢',
  '🌟', '❤️', '🏷️', '📦', '🎉', '🌿', '🔥', '✨',
];

export const CreateEditFolderModal: React.FC<CreateEditFolderModalProps> = ({
  visible,
  folder,
  onSave,
  onClose,
}) => {
  const { colors, shadows, isDark } = useTheme();
  const styles = dynamicStyles;

  const [name, setName] = useState(folder?.name || '');
  const [selectedEmoji, setSelectedEmoji] = useState(folder?.icon || '📁');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pattern React 19 : Ajustement d'état synchronisé lors de l'ouverture ou du changement de dossier
  const [prevFolder, setPrevFolder] = useState(folder);
  const [prevVisible, setPrevVisible] = useState(visible);

  if (prevFolder !== folder || (!prevVisible && visible)) {
    setPrevFolder(folder);
    setPrevVisible(visible);
    setName(folder?.name || '');
    setSelectedEmoji(folder?.icon || '📁');
    setIsSubmitting(false);
  } else if (prevVisible !== visible) {
    setPrevVisible(visible);
  }

  const isEditing = Boolean(folder && folder.id);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nom requis', 'Veuillez saisir un nom pour le dossier de recettes.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        icon: selectedEmoji || '📁',
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d enregistrer le dossier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modalCard, shadows.medium, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons
                  name={isEditing ? 'pencil-outline' : 'folder-open-outline'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {isEditing ? 'Modifier le dossier' : 'Nouveau dossier'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fermer la modale"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Aperçu en direct de la carte de dossier */}
            <View style={[styles.previewBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
              <Text style={styles.previewEmoji}>{selectedEmoji || '📁'}</Text>
              <View style={styles.previewTextContainer}>
                <Text
                  style={[styles.previewName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {name.trim() || 'Nom du dossier'}
                </Text>
                <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
                  {isEditing ? 'Modification en cours' : 'Nouveau dossier'}
                </Text>
              </View>
            </View>

            {/* Saisie du nom */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Nom du dossier
              </Text>
              <View style={[styles.textInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex : Desserts du dimanche, Batch cooking..."
                  placeholderTextColor={colors.textMuted}
                  maxLength={40}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                {name.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setName('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.clearInputBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Sélecteur d'icônes / Emojis culinaires */}
            <View style={styles.emojiSection}>
              <View style={styles.emojiSectionHeader}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Icône du dossier
                </Text>
                <Text style={[styles.emojiHint, { color: colors.textMuted }]}>
                  Sélectionnez un emoji culinaire
                </Text>
              </View>

              <View style={styles.emojiGrid}>
                {CULINARY_FOLDER_EMOJIS.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiCell,
                        {
                          backgroundColor: isSelected
                            ? colors.primaryLight
                            : isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : 'rgba(0, 0, 0, 0.03)',
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                        },
                      ]}
                      onPress={() => setSelectedEmoji(emoji)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Choisir l'emoji ${emoji}`}
                    >
                      <Text style={styles.emojiItemText}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Annuler"
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary },
                isSubmitting && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Enregistrer les modifications' : 'Créer le dossier'}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Enregistrer' : 'Créer le dossier'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const dynamicStyles = createDynamicStyles((colors, shadows) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...Platform.select({
      web: { position: 'fixed' as any },
      default: { position: 'absolute' },
    }),
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  clearInputBtn: {
    padding: 4,
  },
  emojiSection: {
    marginBottom: 10,
  },
  emojiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  emojiHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiItemText: {
    fontSize: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
