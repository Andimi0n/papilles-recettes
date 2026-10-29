/**
 * OnboardingScreen — Écran d'accueil et configuration initiale au premier lancement
 *
 * Deux étapes sobres et fluides :
 *  1. Welcome  — Présentation sobre de Papilles et de son fonctionnement local
 *  2. ApiKey   — Configuration optionnelle de la clé Gemini API (BYOK)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { RecipeAiService } from '../services/recipeAiService';

type Step = 'welcome' | 'apiKey';
type KeyStatus = 'idle' | 'checking' | 'ok' | 'error';

interface Props {
  onComplete: () => void;
}

const AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

const FEATURES = [
  {
    icon: 'book-outline',
    title: 'Carnet culinaire',
    description: 'Conservez, organisez et ajustez vos recettes en un geste.',
  },
  {
    icon: 'basket-outline',
    title: 'Étagères & Courses',
    description: 'Suivez votre stock et compilez vos listes intelligentes.',
  },
  {
    icon: 'calendar-outline',
    title: 'Planning des repas',
    description: 'Anticipez votre semaine et préparez vos menus sereinement.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Assistant culinaire IA',
    description: 'Scan photo, import web et suggestions selon votre frigo.',
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<Step>('welcome');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleValidateKey = useCallback(async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;

    setKeyStatus('checking');
    setErrorMessage('');

    try {
      const result = await RecipeAiService.checkConnection(trimmed);
      if (result.ok) {
        await RecipeAiService.setApiKey(trimmed);
        setKeyStatus('ok');
        // Courte temporisation pour confirmer visuellement la validation
        setTimeout(() => {
          onComplete();
        }, 650);
      } else {
        setKeyStatus('error');
        setErrorMessage(
          result.message || 'La clé renseignée est invalide ou la connexion a échoué.'
        );
      }
    } catch {
      setKeyStatus('error');
      setErrorMessage('Impossible de vérifier la clé. Vérifiez votre connexion internet.');
    }
  }, [apiKeyInput, onComplete]);

  const handleOpenAiStudio = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(AI_STUDIO_URL);
      if (canOpen) {
        await Linking.openURL(AI_STUDIO_URL);
      }
    } catch {
      // Ignorer silencieusement si l'ouverture du lien échoue
    }
  }, []);

  // ─── Indicateur d'étapes (Sobre) ──────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorRow}>
      <View
        style={[
          styles.stepDot,
          step === 'welcome' ? styles.stepDotActive : styles.stepDotInactive,
          { backgroundColor: step === 'welcome' ? colors.primary : colors.borderMedium },
        ]}
      />
      <View
        style={[
          styles.stepDot,
          step === 'apiKey' ? styles.stepDotActive : styles.stepDotInactive,
          { backgroundColor: step === 'apiKey' ? colors.primary : colors.borderMedium },
        ]}
      />
    </View>
  );

  // ─── Étape 1 : Bienvenue ──────────────────────────────────────────────────

  if (step === 'welcome') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderStepIndicator()}

          {/* Logo sobre & En-tête */}
          <View style={styles.heroSection}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="restaurant-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>Papilles</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              Vos recettes, vos étagères, vos courses — simplement.
            </Text>
          </View>

          {/* Cartes fonctionnalités sobres */}
          <View style={styles.featuresContainer}>
            {FEATURES.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <View style={[styles.featureIconBubble, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions & Mention hors-ligne */}
          <View style={styles.actionFooter}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => setStep('apiKey')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continuer vers la configuration"
            >
              <Text style={styles.primaryButtonText}>Continuer</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            </TouchableOpacity>

            <View style={styles.offlineNoticeRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.offlineNoticeText, { color: colors.textMuted }]}>
                100 % hors-ligne · Vos données restent sur votre appareil
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Étape 2 : Configuration Clé Gemini ───────────────────────────────────

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Barre supérieure avec bouton Retour */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setStep('welcome');
              setErrorMessage('');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retour à l'étape précédente"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Retour</Text>
          </TouchableOpacity>

          {renderStepIndicator()}

          {/* Espace vide d'équilibrage pour centrer l'indicateur */}
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainerApiKey}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* En-tête de section */}
          <View style={styles.heroSection}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="sparkles-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.appTitle, { color: colors.textPrimary }]}>
              Assistant IA Gemini
            </Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>
              Optionnelle, pour le scan de recettes, l’import intelligent et les idées de repas.
            </Text>
          </View>

          {/* Encadré informatif sobre */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <Ionicons name="key-outline" size={18} color={colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                Google met à disposition une clé <Text style={styles.boldText}>gratuite</Text> pour
                votre usage personnel. Elle est conservée dans le trousseau sécurisé de votre
                appareil.
              </Text>
            </View>
          </View>

          {/* Lien externe vers AI Studio */}
          <TouchableOpacity
            style={[styles.linkCard, { borderColor: colors.borderMedium, backgroundColor: colors.cardBackground }]}
            onPress={handleOpenAiStudio}
            activeOpacity={0.75}
            accessibilityRole="link"
            accessibilityLabel="Obtenir une clé gratuite sur Google AI Studio"
          >
            <View style={styles.linkLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={[styles.linkText, { color: colors.primary }]}>
                Obtenir une clé sur Google AI Studio
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
          </TouchableOpacity>

          {/* Champ de saisie de la clé */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Votre clé API Gemini
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor:
                    keyStatus === 'ok'
                      ? colors.primary
                      : keyStatus === 'error'
                      ? colors.danger
                      : colors.borderMedium,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="AIzaSy..."
                placeholderTextColor={colors.textMuted}
                value={apiKeyInput}
                onChangeText={(text) => {
                  setApiKeyInput(text);
                  if (keyStatus !== 'idle') setKeyStatus('idle');
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                secureTextEntry={!showApiKey}
                returnKeyType="done"
                onSubmitEditing={handleValidateKey}
                accessibilityLabel="Champ de saisie de la clé API Gemini"
              />

              {/* Bouton effacer le texte */}
              {apiKeyInput.length > 0 && (
                <TouchableOpacity
                  style={styles.inputActionIcon}
                  onPress={() => {
                    setApiKeyInput('');
                    setKeyStatus('idle');
                    setErrorMessage('');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Effacer la saisie"
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}

              {/* Bouton afficher/masquer */}
              <TouchableOpacity
                style={styles.inputActionIcon}
                onPress={() => setShowApiKey(!showApiKey)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={showApiKey ? 'Masquer la clé' : 'Afficher la clé'}
              >
                <Ionicons
                  name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Retour visuel d'état */}
            {keyStatus === 'ok' && (
              <View style={styles.statusFeedbackRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={[styles.statusFeedbackOk, { color: colors.primary }]}>
                  Clé vérifiée et enregistrée avec succès.
                </Text>
              </View>
            )}

            {keyStatus === 'error' && !!errorMessage && (
              <View style={styles.statusFeedbackRow}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.statusFeedbackError, { color: colors.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            )}
          </View>

          {/* Boutons d'action */}
          <View style={styles.actionFooterApiKey}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  opacity: apiKeyInput.trim() && keyStatus !== 'checking' ? 1 : 0.6,
                },
              ]}
              onPress={handleValidateKey}
              disabled={!apiKeyInput.trim() || keyStatus === 'checking' || keyStatus === 'ok'}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Valider la clé API"
            >
              {keyStatus === 'checking' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Valider et continuer</Text>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onComplete}
              activeOpacity={0.7}
              style={styles.skipButton}
              accessibilityRole="button"
              accessibilityLabel="Passer et continuer sans clé d'IA"
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                Continuer sans IA pour l’instant
              </Text>
              <Text style={[styles.skipButtonSubtext, { color: colors.textMuted }]}>
                Vous pourrez configurer votre clé à tout moment dans les Paramètres.
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles sobres et unifiés ───────────────────────────────────────────────

const styles = createDynamicStyles((colors, shadows) => ({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  scrollContainerApiKey: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },

  // Navigation supérieure
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 2,
  },
  topBarSpacer: {
    minWidth: 80,
  },

  // Indicateur d'étape
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 22,
  },
  stepDotInactive: {
    width: 6,
  },

  // En-tête visuel sobre
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },

  // Liste de fonctionnalités
  featuresContainer: {
    gap: 12,
    marginVertical: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...shadows.small,
  },
  featureIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Encadré info
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  boldText: {
    fontWeight: '700',
  },

  // Lien externe
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Champ de saisie
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingVertical: 0,
  },
  inputActionIcon: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  statusFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusFeedbackOk: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusFeedbackError: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },

  // Boutons et pied de page
  actionFooter: {
    alignItems: 'center',
    marginTop: 20,
    gap: 14,
  },
  actionFooterApiKey: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  offlineNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineNoticeText: {
    fontSize: 12,
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  skipButtonSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
}));
