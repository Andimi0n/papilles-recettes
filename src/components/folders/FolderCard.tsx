import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FolderSummary, UNCATEGORIZED_FOLDER_ID } from '../../types/folder';
import { useTheme } from '../../theme/ThemeContext';
import { createDynamicStyles } from '../../theme/colors';
import { FolderMosaic } from './FolderMosaic';

export interface FolderCardProps {
  /**
   * Résumé du dossier (optionnel si isNewFolderButton est actif)
   */
  folder?: FolderSummary;
  /**
   * Afficher la carte sous la forme d'un bouton « + Nouveau dossier »
   */
  isNewFolderButton?: boolean;
  /**
   * Action au tap simple
   */
  onPress: () => void;
  /**
   * Action à l'appui long
   */
  onLongPress?: () => void;
  /**
   * Action de modification (renommage / emoji)
   */
  onEdit?: () => void;
  /**
   * Action de suppression du dossier
   */
  onDelete?: () => void;
  /**
   * Style personnalisé pour la carte
   */
  style?: StyleProp<ViewStyle>;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  isNewFolderButton = false,
  onPress,
  onLongPress,
  onEdit,
  onDelete,
  style,
}) => {
  const { colors, shadows } = useTheme();
  const styles = dynamicStyles;

  // 1. Variante Carte « + Nouveau dossier »
  if (isNewFolderButton) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.card,
          styles.newFolderCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.primary,
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Créer un nouveau dossier de recettes"
      >
        <View style={styles.newFolderContent}>
          <View style={[styles.newFolderIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="add" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.newFolderTitle, { color: colors.primary }]}>
            Nouveau dossier
          </Text>
          <Text style={[styles.newFolderSubtitle, { color: colors.textMuted }]}>
            Organiser vos recettes
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // 2. Variante Normale de Dossier
  if (!folder) {
    return null;
  }

  const isUncategorized = folder.id === UNCATEGORIZED_FOLDER_ID;
  const count = folder.recipeCount;
  const countLabel =
    count === 0
      ? '0 recette'
      : count === 1
        ? '1 recette'
        : `${count} recettes`;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: isUncategorized ? colors.borderMedium : colors.borderLight,
        },
        shadows.small,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Dossier ${folder.name}, ${countLabel}`}
    >
      {/* Mosaïque 2x2 des 4 premières photos */}
      <View style={styles.mosaicWrapper}>
        <FolderMosaic
          images={folder.recipeImages}
          borderRadius={12}
          fallbackIcon={isUncategorized ? 'file-tray-outline' : 'restaurant-outline'}
        />

        {/* Badge spécial « Non classées » */}
        {isUncategorized && (
          <View style={[styles.uncategorizedBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name="archive-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.uncategorizedBadgeText, { color: colors.textSecondary }]}>
              Automatique
            </Text>
          </View>
        )}
      </View>

      {/* Métadonnées : Icône/Emoji, Titre et Compteur */}
      <View style={styles.metaContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.iconEmoji}>{folder.icon || '📁'}</Text>
          <Text
            style={[styles.folderName, { color: colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {folder.name}
          </Text>

          {/* Boutons d'action contextuelle (si non virtuel) */}
          {!isUncategorized && (onEdit || onDelete) && (
            <View style={styles.actionButtonsRow}>
              {onEdit && (
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier le dossier ${folder.name}`}
                  style={styles.actionIconButton}
                >
                  <Ionicons name="pencil-sharp" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {countLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const dynamicStyles = createDynamicStyles((colors, shadows) => ({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mosaicWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: 10,
  },
  uncategorizedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  uncategorizedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaContainer: {
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  iconEmoji: {
    fontSize: 18,
  },
  folderName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
    marginLeft: 24, // Aligné sous le nom en tenant compte de l'icône
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIconButton: {
    padding: 4,
    borderRadius: 6,
  },
  newFolderCard: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  newFolderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  newFolderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  newFolderTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  newFolderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
}));
