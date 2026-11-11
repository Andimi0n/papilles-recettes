import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { Recipe } from '../../types/recipe';
import { RecipeShareService } from '../../services/recipeShareService';

export interface RecipeShareModalProps {
  visible: boolean;
  recipe: Recipe | null;
  servings?: number;
  onClose: () => void;
}

type ShareModalView = 'menu' | 'qrcode';

export const RecipeShareModal: React.FC<RecipeShareModalProps> = ({
  visible,
  recipe,
  servings,
  onClose,
}) => {
  const { colors } = useTheme();
  const [activeView, setActiveView] = useState<ShareModalView>('menu');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoyage du timer à la destruction du composant
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setActiveView('menu');
    setCopiedFeedback(false);
    onClose();
  };

  const effectiveServings = servings || recipe?.servings || 4;

  const qrUri = useMemo(() => {
    if (!recipe || !visible) return null;
    return RecipeShareService.generateRecipeQrCodeBmp(recipe);
  }, [recipe, visible]);

  if (!recipe) return null;

  const handleShareMessage = async () => {
    await RecipeShareService.shareRecipeViaSystem(recipe, effectiveServings);
    handleClose();
  };

  const handleCopyIngredients = async () => {
    const success = await RecipeShareService.copyIngredientsToClipboard(
      recipe,
      effectiveServings
    );
    if (success) {
      setCopiedFeedback(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => {
        setCopiedFeedback(false);
      }, 2500);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {activeView === 'menu' ? (
            <>
              {/* En-tête Menu */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Ionicons name="share-social" size={22} color={colors.primary} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title} numberOfLines={1}>
                    Partager la recette
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {recipe.title} • {effectiveServings} pers.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  accessibilityLabel="Fermer"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Actions de partage */}
              <ScrollView
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Envoyer par message / WhatsApp */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={handleShareMessage}
                  activeOpacity={0.7}
                  accessibilityLabel="Envoyer la recette par message ou WhatsApp"
                  accessibilityRole="button"
                >
                  <View style={[styles.optionIconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={styles.optionTitle}>Envoyer par message</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* 2. Flasher le QR Code hors-ligne */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setActiveView('qrcode')}
                  activeOpacity={0.7}
                  accessibilityLabel="Afficher le QR code pour un transfert hors-ligne"
                  accessibilityRole="button"
                >
                  <View style={[styles.optionIconBox, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text style={styles.optionTitle}>Flasher le QR Code hors-ligne</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* 3. Copier les ingrédients */}
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    copiedFeedback && styles.optionRowSuccess,
                  ]}
                  onPress={handleCopyIngredients}
                  activeOpacity={0.7}
                  accessibilityLabel="Copier la liste des ingrédients dans le presse-papier"
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      {
                        backgroundColor: copiedFeedback
                          ? '#DCFCE7'
                          : colors.backgroundSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={copiedFeedback ? 'checkmark-circle' : 'copy-outline'}
                      size={22}
                      color={copiedFeedback ? '#16A34A' : colors.textPrimary}
                    />
                  </View>
                  <View style={styles.optionTextBox}>
                    <Text
                      style={[
                        styles.optionTitle,
                        copiedFeedback && { color: '#16A34A' },
                      ]}
                    >
                      {copiedFeedback
                        ? '✓ Ingrédients copiés !'
                        : 'Copier les ingrédients'}
                    </Text>
                  </View>
                  {copiedFeedback ? (
                    <Ionicons name="checkmark" size={18} color="#16A34A" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </ScrollView>
            </>
          ) : (
            <>
              {/* En-tête QR Code avec retour */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => setActiveView('menu')}
                  style={styles.backBtn}
                  accessibilityLabel="Retour aux options de partage"
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title} numberOfLines={1}>
                    QR Code hors-ligne
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {recipe.title}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  accessibilityLabel="Fermer"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Rendu du QR Code */}
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

              <Text style={styles.instruction}>
                {"Votre ami peut scanner ce QR code depuis l'onglet "}
                <Text style={styles.instructionBold}>Scanner &gt; QR Code</Text>
                {" de Papilles pour ajouter cette recette en 1 seconde, "}
                <Text style={styles.instructionBold}>100 % hors-ligne</Text>.
              </Text>

              {/* Actions QR Code */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.shareLinkBtn}
                  onPress={handleShareMessage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.shareLinkBtnText}>Partager par message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => setActiveView('menu')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissBtnText}>Retour</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    maxWidth: 380,
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  optionsList: {
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 10,
  },
  optionRowSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextBox: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
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
    width: 200,
    height: 200,
  },
  loadingBox: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  instruction: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 12,
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
    marginTop: 6,
  },
  shareLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  shareLinkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
}));
