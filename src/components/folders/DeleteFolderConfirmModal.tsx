import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder, FolderSummary } from '../../types/folder';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';

export interface DeleteFolderConfirmModalProps {
  visible: boolean;
  folder: Folder | FolderSummary | null;
  onConfirmDelete: () => Promise<void> | void;
  onClose: () => void;
}

export const DeleteFolderConfirmModal: React.FC<DeleteFolderConfirmModalProps> = ({
  visible,
  folder,
  onConfirmDelete,
  onClose,
}) => {
  const { colors, shadows } = useTheme();
  const styles = dynamicStyles;
  const [isDeleting, setIsDeleting] = useState(false);

  if (!folder) return null;

  const recipeCount = 'recipeCount' in folder ? folder.recipeCount : 0;
  const countLabel =
    recipeCount === 0
      ? '0 recette'
      : recipeCount === 1
        ? '1 recette'
        : `${recipeCount} recettes`;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete();
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de supprimer le dossier.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,
            shadows.medium,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderLight,
            },
          ]}
        >
          {/* Icône d'alerte */}
          <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
            <Ionicons name="trash-outline" size={28} color={colors.danger} />
          </View>

          {/* Titre & Message */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Supprimer ce dossier ?
          </Text>

          <Text style={[styles.targetFolderName, { color: colors.textSecondary }]}>
            {folder.icon ? `${folder.icon} ` : ''}{folder.name} ({countLabel})
          </Text>

          {/* Encadré d'assurance Règle d'or de préservation */}
          <View
            style={[
              styles.preservationNoticeBox,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.preservationNoticeHeader}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={[styles.preservationNoticeTitle, { color: colors.primary }]}>
                {"Règle d'or de préservation"}
              </Text>
            </View>
            <Text style={[styles.preservationNoticeText, { color: colors.textSecondary }]}>
              Vos recettes ne seront pas supprimées. Elles resteront intactes et accessibles
              dans « Toutes les recettes » et dans le dossier automatique « Non classées ».
            </Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel="Annuler la suppression"
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: colors.danger },
                isDeleting && { opacity: 0.6 },
              ]}
              onPress={handleDelete}
              activeOpacity={0.85}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityLabel={`Confirmer la suppression du dossier ${folder.name}`}
            >
              <Ionicons name="trash" size={17} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const dynamicStyles = createDynamicStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  targetFolderName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  preservationNoticeBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  preservationNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  preservationNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  preservationNoticeText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
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
  deleteBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
