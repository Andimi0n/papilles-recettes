import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export interface PageJumpModalProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  totalRecipes: number;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

export const PageJumpModal: React.FC<PageJumpModalProps> = ({
  visible,
  currentPage,
  totalPages,
  totalRecipes,
  onSelectPage,
  onClose,
}) => {
  const { colors } = useTheme();
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleValidateInput = () => {
    const raw = inputVal.trim() || String(currentPage);
    const pageNum = parseInt(raw, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      setErrorMsg(`Entrez un numéro entre 1 et ${totalPages}`);
      return;
    }
    setErrorMsg(null);
    setInputVal('');
    onSelectPage(pageNum);
    onClose();
  };

  const handleSelect = (page: number) => {
    setErrorMsg(null);
    setInputVal('');
    onSelectPage(page);
    onClose();
  };

  const handleClose = () => {
    setErrorMsg(null);
    setInputVal('');
    onClose();
  };

  // Liste ordonnée des pages 1..totalPages
  const pagesList = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCard}
            >
              {/* En-tête */}
              <View style={styles.header}>
                <View style={styles.headerTexts}>
                  <Text style={styles.title}>Aller à la page</Text>
                  <Text style={styles.subtitle}>
                    {totalPages} page{totalPages > 1 ? 's' : ''} • {totalRecipes} recette{totalRecipes > 1 ? 's' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Saisie directe du numéro */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Saisir directement :</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={inputVal}
                    onChangeText={(t) => {
                      setInputVal(t);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    keyboardType="number-pad"
                    placeholder={`Page (ex: ${currentPage})`}
                    placeholderTextColor={colors.textMuted}
                    maxLength={4}
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleValidateInput}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitBtnText}>Valider</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              </View>

              {/* Raccourcis début / fin */}
              <View style={styles.quickNavRow}>
                <TouchableOpacity
                  style={[styles.quickNavBtn, currentPage === 1 && styles.quickNavBtnDisabled]}
                  onPress={() => handleSelect(1)}
                  disabled={currentPage === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-skip-back-outline" size={14} color={currentPage === 1 ? colors.textMuted : colors.textPrimary} />
                  <Text style={[styles.quickNavBtnText, currentPage === 1 && styles.quickNavBtnTextDisabled]}>
                    Première (1)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickNavBtn, currentPage === totalPages && styles.quickNavBtnDisabled]}
                  onPress={() => handleSelect(totalPages)}
                  disabled={currentPage === totalPages}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickNavBtnText, currentPage === totalPages && styles.quickNavBtnTextDisabled]}>
                    Dernière ({totalPages})
                  </Text>
                  <Ionicons name="play-skip-forward-outline" size={14} color={currentPage === totalPages ? colors.textMuted : colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Grille de sélection directe de toutes les pages */}
              <Text style={styles.gridLabel}>Toutes les pages :</Text>
              <ScrollView
                style={styles.scrollList}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={true}
              >
                {pagesList.map((pageNum) => {
                  const isCurrent = pageNum === currentPage;
                  return (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.pageBox,
                        isCurrent && styles.pageBoxCurrent,
                      ]}
                      onPress={() => handleSelect(pageNum)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pageBoxText,
                          isCurrent && styles.pageBoxTextCurrent,
                        ]}
                      >
                        {pageNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTexts: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  quickNavBtnDisabled: {
    opacity: 0.4,
  },
  quickNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickNavBtnTextDisabled: {
    color: colors.textMuted,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scrollList: {
    maxHeight: 200,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  pageBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBoxCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pageBoxText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pageBoxTextCurrent: {
    color: '#FFFFFF',
  },
}));
