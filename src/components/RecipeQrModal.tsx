import React, { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { Recipe } from '../types/recipe';
import { RecipeShareService } from '../services/recipeShareService';

interface RecipeQrModalProps {
  visible: boolean;
  recipe: Recipe | null;
  servings?: number;
  onClose: () => void;
}

export const RecipeQrModal: React.FC<RecipeQrModalProps> = ({
  visible,
  recipe,
  servings,
  onClose,
}) => {
  const { colors } = useTheme();

  const qrUri = useMemo(() => {
    if (!recipe || !visible) return null;
    return RecipeShareService.generateRecipeQrCodeBmp(recipe);
  }, [recipe, visible]);

  if (!recipe) return null;

  const handleShareSystem = async () => {
    await RecipeShareService.shareRecipeViaSystem(recipe, servings);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="share-social" size={22} color={colors.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {recipe.title}
              </Text>
              <Text style={styles.subtitle}>{"Partager la recette (QR Code & Lien)"}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Affichage du QR Code */}
          <View style={styles.qrContainer}>
            {qrUri ? (
              <View style={styles.qrWhiteBox}>
                <Image
                  source={{ uri: qrUri }}
                  style={styles.qrImage}
                  contentFit="contain"
                  cachePolicy="none"
                />
              </View>
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Génération du QR code...</Text>
              </View>
            )}
          </View>

          {/* Explication */}
          <Text style={styles.instruction}>
            {"Votre ami peut scanner ce QR code depuis l'onglet "}
            <Text style={styles.instructionBold}>Scanner &gt; QR Code</Text>
            {" de Papilles pour ajouter cette recette en 1 seconde, "}
            <Text style={styles.instructionBold}>100 % hors-ligne</Text>.
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.shareLinkBtn}
              onPress={handleShareSystem}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.shareLinkBtnText}>Partager le lien</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  qrWhiteBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  loadingBox: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  instruction: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  instructionBold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  shareLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
  },
  shareLinkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  dismissBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
}));
