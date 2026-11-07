import React, { useState, useEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChefFavoritePrompt } from '../../types/recipe';
import { StorageService } from '../../services/storageService';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';

export interface ChefFavoritePromptsModalProps {
  visible: boolean;
  currentPromptText: string;
  onSelectPrompt: (promptText: string) => void;
  onClose: () => void;
}

export const ChefFavoritePromptsModal: React.FC<ChefFavoritePromptsModalProps> = ({
  visible,
  currentPromptText,
  onSelectPrompt,
  onClose,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();


  const [prompts, setPrompts] = useState<ChefFavoritePrompt[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  const refreshPrompts = useCallback(async () => {
    try {
      const list = await StorageService.getChefFavoritePrompts();
      setPrompts(list);
    } catch (_e) {
      console.error('Erreur chargement prompts favoris');
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;

    StorageService.getChefFavoritePrompts()
      .then((list) => {
        if (isMounted) {
          setPrompts(list);
        }
      })
      .catch((_err) => {
        console.error('Erreur chargement prompts favoris');
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleStartCreating = () => {
    setNewText(currentPromptText?.trim() || '');
    setNewTitle('');
    setIsCreating(true);
  };

  const handleSavePrompt = async () => {
    const trimmedTitle = newTitle.trim();
    const trimmedText = newText.trim();

    if (!trimmedTitle) {
      Alert.alert('Titre requis', 'Veuillez saisir un titre pour ce prompt favori.');
      return;
    }
    if (!trimmedText) {
      Alert.alert('Consigne requise', 'Veuillez saisir le contenu de la consigne culinaire.');
      return;
    }

    try {
      await StorageService.saveChefFavoritePrompt({
        title: trimmedTitle,
        promptText: trimmedText,
      });
      setIsCreating(false);
      setNewTitle('');
      setNewText('');
      await refreshPrompts();
    } catch (_e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le prompt favori.');
    }
  };

  const handleDeletePrompt = (prompt: ChefFavoritePrompt) => {
    Alert.alert(
      'Supprimer le prompt',
      `Voulez-vous vraiment supprimer "${prompt.title}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteChefFavoritePrompt(prompt.id);
              await refreshPrompts();
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer le prompt.');
            }
          },
        },
      ]
    );
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="bookmark" size={22} color={colors.primary} style={styles.headerIcon} />
              <Text style={styles.title}>Prompts favoris du Chef</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Appliquez vos consignes habituelles en 1 clic ou sauvegardez vos formules préférées.
          </Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Formulaire de création / enregistrement */}
            {isCreating ? (
              <View style={styles.createCard}>
                <View style={styles.createHeader}>
                  <Text style={styles.createTitle}>Nouveau prompt favori</Text>
                  <TouchableOpacity onPress={() => setIsCreating(false)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Titre du raccourci</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex : Express 15 min, Sans four, Enfants..."
                  placeholderTextColor={colors.textSecondary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                />

                <Text style={styles.inputLabel}>Consigne culinaire</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex : Cuisson poêle uniquement, sauce légère..."
                  placeholderTextColor={colors.textSecondary}
                  value={newText}
                  onChangeText={setNewText}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrompt}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Enregistrer le favori</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addTriggerBtn}
                onPress={handleStartCreating}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addTriggerBtnText}>
                  {currentPromptText?.trim()
                    ? 'Enregistrer la consigne actuelle en favori'
                    : 'Créer un nouveau prompt favori'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Liste des prompts */}
            {prompts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="bookmark-outline" size={44} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Aucun prompt favori enregistré.</Text>
              </View>
            ) : (
              prompts.map((prompt) => (
                <View key={prompt.id} style={styles.promptCard}>
                  <TouchableOpacity
                    style={styles.promptClickableArea}
                    onPress={() => {
                      onSelectPrompt(prompt.promptText);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.promptTitleRow}>
                      <Text style={styles.promptTitle}>{prompt.title}</Text>
                      <View style={styles.useBadge}>
                        <Text style={styles.useBadgeText}>Appliquer</Text>
                      </View>
                    </View>
                    <Text style={styles.promptText} numberOfLines={3}>
                      {prompt.promptText}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePrompt(prompt)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger || '#E53935'} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  addTriggerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  createCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
    ...shadows.card,
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
    marginTop: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 10,
  },
  promptCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  promptClickableArea: {
    flex: 1,
    marginRight: 10,
  },
  promptTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  useBadge: {
    backgroundColor: colors.primaryLight || '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  useBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  promptText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 4,
  },
}));

