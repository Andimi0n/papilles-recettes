import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FolderSummary, UNCATEGORIZED_FOLDER_ID } from '../../types/folder';
import { FolderService } from '../../services/folderService';
import { StorageService } from '../../services/storageService';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';
import { FolderCard } from './FolderCard';

export const NEW_FOLDER_ITEM_ID = '__NEW_FOLDER__';

export interface FolderGridItem {
  id: string;
  isNewFolderButton?: boolean;
  folder?: FolderSummary;
}

/**
 * Prépare les éléments affichés dans la grille 2 colonnes :
 * - Tuile « + Nouveau dossier » en premier
 * - Suivie des résumés de dossiers (dont « Non classées »)
 */
export function prepareFolderGridItems(summaries: FolderSummary[]): FolderGridItem[] {
  const items: FolderGridItem[] = [
    {
      id: NEW_FOLDER_ITEM_ID,
      isNewFolderButton: true,
    },
  ];

  for (const summary of summaries) {
    items.push({
      id: summary.id,
      folder: summary,
    });
  }

  return items;
}

export interface FoldersGridViewProps {
  /**
   * Action appelée lors du clic sur un dossier
   */
  onSelectFolder: (folderId: string) => void;
  /**
   * Action ouvrant la modale de création d'un nouveau dossier
   */
  onCreateFolder: () => void;
  /**
   * Action optionnelle pour modifier un dossier
   */
  onEditFolder?: (folder: FolderSummary) => void;
  /**
   * Action optionnelle pour supprimer un dossier
   */
  onDeleteFolder?: (folder: FolderSummary) => void;
  /**
   * Résumés initiaux (ex: tests ou SSR)
   */
  initialSummaries?: FolderSummary[];
  /**
   * Style personnalisé pour le conteneur de liste
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Marge inférieure pour éviter la superposition de la barre d'onglets
   */
  bottomInset?: number;
  /**
   * Callback de défilement pour synchronisation d'en-tête / filtres
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const FoldersGridViewComponent: React.FC<FoldersGridViewProps> = ({
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  initialSummaries,
  contentContainerStyle,
  bottomInset = 80,
  onScroll,
}) => {
  const { themeId } = useTheme();
  const styles = dynamicStyles;
  const [summaries, setSummaries] = useState<FolderSummary[]>(initialSummaries || []);

  useEffect(() => {
    let isMounted = true;
    const fetchSummaries = async () => {
      try {
        const data = await FolderService.getFolderSummaries();
        if (isMounted) {
          setSummaries(data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des dossiers :', err);
      }
    };
    fetchSummaries();
    const unsubscribe = StorageService.onFoldersChange(fetchSummaries);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const gridItems = useMemo(() => prepareFolderGridItems(summaries), [summaries]);

  const renderGridItem = useCallback(
    ({ item }: { item: FolderGridItem }) => {
      if (item.isNewFolderButton) {
        return (
          <View style={styles.gridItemWrapper}>
            <FolderCard isNewFolderButton onPress={onCreateFolder} />
          </View>
        );
      }

      if (!item.folder) return null;

      const isUncategorized = item.folder.id === UNCATEGORIZED_FOLDER_ID;

      return (
        <View style={styles.gridItemWrapper}>
          <FolderCard
            folder={item.folder}
            onPress={() => onSelectFolder(item.folder!.id)}
            onEdit={!isUncategorized && onEditFolder ? () => onEditFolder(item.folder!) : undefined}
            onDelete={!isUncategorized && onDeleteFolder ? () => onDeleteFolder(item.folder!) : undefined}
            onLongPress={!isUncategorized && onEditFolder ? () => onEditFolder(item.folder!) : undefined}
          />
        </View>
      );
    },
    [onCreateFolder, onSelectFolder, onEditFolder, onDeleteFolder, styles]
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={gridItems}
        extraData={`${themeId}_${summaries.length}`}
        keyExtractor={(item) => item.id}
        numColumns={2}
        getItemType={(item) => (item.isNewFolderButton ? 'new' : 'folder')}
        renderItem={renderGridItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomInset },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
    </View>
  );
};

FoldersGridViewComponent.displayName = 'FoldersGridView';
export const FoldersGridView = React.memo(FoldersGridViewComponent);

const dynamicStyles = createDynamicStyles(() => ({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 14,
  },
  gridItemWrapper: {
    flex: 1,
    paddingHorizontal: 6,
  },
}));
