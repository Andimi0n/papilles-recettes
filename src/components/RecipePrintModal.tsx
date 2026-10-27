import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { RecipePdfService } from '../services/recipePdfService';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

interface RecipePrintModalProps {
  visible: boolean;
  recipe: Recipe;
  initialServings?: number;
  onClose: () => void;
}

interface InnerPrintModalProps {
  recipe: Recipe;
  initialServings?: number;
  onClose: () => void;
}

const InnerPrintModal: React.FC<InnerPrintModalProps> = ({
  recipe,
  initialServings,
  onClose,
}) => {
  const { colors } = useTheme();

  const [servings, setServings] = useState<number>(
    initialServings || recipe.servings || 4
  );

  const hasPhoto = Boolean(recipe.imageUrl && recipe.imageUrl.trim().length > 0);
  const [includePhoto, setIncludePhoto] = useState<boolean>(hasPhoto);
  const [includeNotesLines, setIncludeNotesLines] = useState<boolean>(true);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<'print' | 'export' | null>(null);

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      setLoadingAction('print');
      await RecipePdfService.printRecipe(recipe, {
        servings,
        includePhoto: hasPhoto && includePhoto,
        includeNotesLines,
        includeQrCode,
      });
      onClose();
    } catch (e) {
      console.error('[RecipePrintModal] Erreur impression:', e);
      Alert.alert(
        'Erreur d\'impression',
        'Une erreur est survenue lors du lancement de l\'impression.'
      );
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsLoading(true);
      setLoadingAction('export');
      await RecipePdfService.exportPdf(recipe, {
        servings,
        includePhoto: hasPhoto && includePhoto,
        includeNotesLines,
        includeQrCode,
      });
      onClose();
    } catch (e) {
      console.error('[RecipePrintModal] Erreur export PDF:', e);
      Alert.alert(
        'Erreur d\'export',
        'Une erreur est survenue lors de la création ou du partage du fichier PDF.'
      );
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <View style={styles.modalCard}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="print" size={22} color={colors.primary} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.modalTitle}>Imprimer la recette</Text>
          <Text style={styles.modalSubtitle} numberOfLines={1}>
            {recipe.title}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Fermer la fenêtre d'impression"
          disabled={isLoading}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        {/* Tag format A4 */}
        <View style={styles.a4BadgeRow}>
          <View style={styles.a4Badge}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={styles.a4BadgeText}>Format A4 optimisé pour le frigo & classeur</Text>
          </View>
        </View>

        {/* Stepper de portions */}
        <View style={styles.settingCard}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingLabel}>Nombre de convives</Text>
            <Text style={styles.settingSub}>
              {"Recalcule automatiquement les quantités d'ingrédients"}
            </Text>
          </View>

          <View style={styles.stepperWrap}>
            <TouchableOpacity
              onPress={() => setServings((prev) => Math.max(1, prev - 1))}
              style={styles.stepBtn}
              disabled={servings <= 1 || isLoading}
              accessibilityLabel="Diminuer le nombre de convives"
            >
              <Ionicons
                name="remove"
                size={16}
                color={servings <= 1 ? colors.textMuted : colors.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{servings}</Text>
            <TouchableOpacity
              onPress={() => setServings((prev) => Math.min(50, prev + 1))}
              style={styles.stepBtn}
              disabled={servings >= 50 || isLoading}
              accessibilityLabel="Augmenter le nombre de convives"
            >
              <Ionicons
                name="add"
                size={16}
                color={servings >= 50 ? colors.textMuted : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Options de personnalisation */}
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsSectionTitle}>Options de la fiche</Text>

          {/* Option Photo */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <View style={styles.toggleTitleRow}>
                <Ionicons name="image-outline" size={17} color={colors.textPrimary} />
                <Text style={styles.toggleTitle}>Inclure la photo</Text>
              </View>
              <Text style={styles.toggleSub}>
                {hasPhoto
                  ? "Désactiver pour économiser l'encre de l'imprimante"
                  : 'Aucune photo enregistrée sur cette recette'}
              </Text>
            </View>
            <Switch
              value={includePhoto && hasPhoto}
              onValueChange={setIncludePhoto}
              disabled={!hasPhoto || isLoading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          {/* Option Lignes manuscrites */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <View style={styles.toggleTitleRow}>
                <Ionicons name="create-outline" size={17} color={colors.textPrimary} />
                <Text style={styles.toggleTitle}>Lignes de notes manuelles</Text>
              </View>
              <Text style={styles.toggleSub}>
                Espace en pointillés pour annoter au stylo dans le classeur
              </Text>
            </View>
            <Switch
              value={includeNotesLines}
              onValueChange={setIncludeNotesLines}
              disabled={isLoading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          {/* Option QR Code */}
          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleTextCol}>
              <View style={styles.toggleTitleRow}>
                <Ionicons name="qr-code-outline" size={17} color={colors.textPrimary} />
                <Text style={styles.toggleTitle}>{"QR code d'importation Papilles"}</Text>
              </View>
              <Text style={styles.toggleSub}>
                Permet de scanner la feuille de papier pour récupérer la recette
              </Text>
            </View>
            <Switch
              value={includeQrCode}
              onValueChange={setIncludeQrCode}
              disabled={isLoading}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action */}
      <View style={styles.actionsWrap}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, isLoading && styles.btnDisabled]}
          onPress={handlePrint}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityLabel="Lancer l'impression"
        >
          {isLoading && loadingAction === 'print' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="print-outline" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionText}>Imprimer la recette</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryActionBtn, isLoading && styles.btnDisabled]}
          onPress={handleExportPdf}
          disabled={isLoading}
          activeOpacity={0.85}
          accessibilityLabel="Partager ou enregistrer le PDF"
        >
          {isLoading && loadingAction === 'export' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name="share-outline"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.secondaryActionText}>Partager ou Enregistrer le PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const RecipePrintModal: React.FC<RecipePrintModalProps> = ({
  visible,
  recipe,
  initialServings,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {visible ? (
          <InnerPrintModal
            recipe={recipe}
            initialServings={initialServings}
            onClose={onClose}
          />
        ) : null}
      </View>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  scrollBody: {
    paddingBottom: 8,
  },
  a4BadgeRow: {
    marginBottom: 14,
  },
  a4Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  a4BadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  optionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    ...shadows.small,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
}));
