import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../../types/folder';
import { FolderService } from '../../services/folderService';
import { StorageService } from '../../services/storageService';
import { CreateEditFolderModal } from './CreateEditFolderModal';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

export interface FolderAssignmentBottomSheetProps {
  visible: boolean;
  recipeIds: string[];
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const FolderAssignmentBottomSheet: React.FC<FolderAssignmentBottomSheetProps> = ({
  visible,
  recipeIds,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Pattern React 19 : Ajustement d'état synchronisé lors de l'ouverture
  const [prevVisible, setPrevVisible] = useState(visible);
  if (!prevVisible && visible) {
    setPrevVisible(true);
    setIsLoading(true);
  } else if (prevVisible && !visible) {
    setPrevVisible(false);
  }

  const isSingleRecipe = recipeIds.length === 1;

  // Chargement asynchrone des dossiers existants et des liaisons initiales
  useEffect(() => {
    if (!visible) return;
    let isCancelled = false;

    FolderService.getAllFolders()
      .then(async (allFolders) => {
        if (isCancelled) return;
        setFolders(allFolders);

        if (recipeIds.length === 1) {
          const existingFolderIds = await FolderService.getFolderIdsForRecipe(recipeIds[0]);
          if (isCancelled) return;
          setSelectedFolderIds(new Set(existingFolderIds));
        } else {
          setSelectedFolderIds(new Set());
        }
      })
      .catch((err) => {
        console.error('Erreur lors du chargement des dossiers :', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [visible, recipeIds]);

  // Écouter les modifications de dossiers (ex: création d'un dossier)
  useEffect(() => {
    const unsub = StorageService.onFoldersChange(() => {
      FolderService.getAllFolders().then((updated) => setFolders(updated));
    });
    return unsub;
  }, []);

  const handleToggleFolder = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (recipeIds.length === 0) {
      onClose();
      return;
    }

    if (!isSingleRecipe && selectedFolderIds.size === 0) {
      Alert.alert(
        'Aucun dossier sélectionné',
        'Veuillez cocher au moins un dossier de destination pour ces recettes.'
      );
      return;
    }

    setIsSaving(true);
    try {
      if (isSingleRecipe) {
        await FolderService.setRecipeFolders(recipeIds[0], Array.from(selectedFolderIds));
        onSuccess?.('Rangement de la recette mis à jour');
      } else {
        await FolderService.addRecipesToFolders(recipeIds, Array.from(selectedFolderIds));
        const count = recipeIds.length;
        const folderCount = selectedFolderIds.size;
        onSuccess?.(
          `${count} recette${count > 1 ? 's' : ''} ajoutée${count > 1 ? 's' : ''} à ${folderCount} dossier${folderCount > 1 ? 's' : ''}`
        );
      }
      onClose();
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement des dossiers :', err);
      Alert.alert('Erreur', 'Impossible de mettre à jour le rangement des recettes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFolderSave = async (data: { name: string; icon: string }) => {
    try {
      const created = await FolderService.createFolder(data.name, data.icon);
      // Auto-cocher le dossier fraîchement créé
      setSelectedFolderIds((prev) => new Set(prev).add(created.id));
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Erreur lors de la création du dossier :', err);
      Alert.alert('Erreur', 'Impossible de créer le dossier.');
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop touchable pour fermer */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
          />

          {/* Panneau Bottom Sheet */}
          <View style={styles.sheetContainer}>
            {/* Poignée supérieure */}
            <View style={styles.handleBar} />

            {/* En-tête */}
            <View style={styles.header}>
              <View style={styles.headerTitleCol}>
                <Text style={styles.headerTitle}>
                  {isSingleRecipe ? 'Ranger la recette' : `Ranger ${recipeIds.length} recettes`}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {isSingleRecipe
                    ? 'Cochez ou décochez les dossiers associés'
                    : 'Mode additif : sélectionnez les dossiers de destination'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Fermer la fenêtre de rangement"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Bouton création rapide de dossier */}
            <TouchableOpacity
              onPress={() => setIsCreateModalOpen(true)}
              style={styles.newFolderButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Créer un nouveau dossier"
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.newFolderButtonText}>Créer un nouveau dossier</Text>
            </TouchableOpacity>

            {/* Contenu / Liste des dossiers */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : folders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aucun dossier créé pour le moment.</Text>
                <Text style={styles.emptySubtext}>
                  Créez votre premier dossier ci-dessus pour y ranger vos recettes.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.folderList}
                contentContainerStyle={styles.folderListContent}
                showsVerticalScrollIndicator={false}
              >
                {folders.map((folder) => {
                  const isChecked = selectedFolderIds.has(folder.id);
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={[
                        styles.folderRow,
                        isChecked && styles.folderRowChecked,
                      ]}
                      onPress={() => handleToggleFolder(folder.id)}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isChecked }}
                      accessibilityLabel={`Dossier ${folder.name}`}
                    >
                      <View style={styles.folderRowLeft}>
                        <Text style={styles.folderEmoji}>{folder.icon || '📁'}</Text>
                        <Text style={styles.folderName} numberOfLines={1}>
                          {folder.name}
                        </Text>
                      </View>

                      {/* Indicateur Checkbox */}
                      <View
                        style={[
                          styles.checkbox,
                          isChecked ? styles.checkboxChecked : styles.checkboxUnchecked,
                        ]}
                      >
                        {isChecked && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Boutons d'action inférieurs */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelButton}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Annuler"
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving || folders.length === 0}
                style={[
                  styles.saveButton,
                  (isSaving || folders.length === 0) && styles.saveButtonDisabled,
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer le rangement"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale de création d'un nouveau dossier à la volée */}
      <CreateEditFolderModal
        visible={isCreateModalOpen}
        onSave={handleCreateFolderSave}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '80%',
    ...shadows.large,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  headerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  newFolderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  folderList: {
    maxHeight: 260,
  },
  folderListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  folderRowChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.isDark ? 'rgba(30, 48, 38, 0.4)' : 'rgba(235, 248, 240, 0.6)',
  },
  folderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  folderEmoji: {
    fontSize: 20,
  },
  folderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
    ...shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
