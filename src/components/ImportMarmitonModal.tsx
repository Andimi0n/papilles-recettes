import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createDynamicStyles } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { MarmitonService, MarmitonSearchResult } from '../services/marmitonService';
import { WebRecipeService } from '../services/webRecipeService';
import { Recipe } from '../types/recipe';

interface ImportMarmitonModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeImported: (recipe: Recipe) => void;
}

type TabMode = 'url' | 'search';

const POPULAR_PLATFORMS = [
  'CuisineAZ',
  '750g',
  'Marmiton',
  'Jow',
  'Chefclub',
  'BBC Good Food',
  'Blogs WordPress',
  'Schema.org (95% du Web)',
];

export const ImportMarmitonModal: React.FC<ImportMarmitonModalProps> = ({
  visible,
  onClose,
  onRecipeImported,
}) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabMode>('url');
  const [urlInput, setUrlInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarmitonSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStepText, setImportStepText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setUrlInput('');
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setIsImporting(false);
    setImportStepText('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  // Importation universelle depuis une URL Web (Schema.org JSON-LD & Fallback IA)
  const handleImportUrl = async (urlToImport: string) => {
    if (!urlToImport.trim()) {
      setErrorMessage('Veuillez renseigner un lien web de recette.');
      return;
    }

    try {
      setErrorMessage(null);
      setIsImporting(true);
      setImportStepText('1/3 - Téléchargement de la page web...');

      await new Promise((resolve) => setTimeout(resolve, 250));
      setImportStepText('2/3 - Extraction Schema.org JSON-LD & normalisation...');

      const recipe = await WebRecipeService.importRecipeFromUrl(urlToImport.trim());

      const imgCount = recipe.availableImages?.length || (recipe.imageUrl ? 1 : 0);
      setImportStepText(
        `3/3 - ${recipe.title} (${recipe.ingredients.length} ingr., ${imgCount} photo(s)), ouverture...`
      );
      await new Promise((resolve) => setTimeout(resolve, 350));

      resetState();
      onRecipeImported(recipe);
    } catch (err: any) {
      console.error('Erreur import recette web:', err);
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'importation.");
    } finally {
      setIsImporting(false);
      setImportStepText('');
    }
  };

  // Recherche sur Marmiton
  const handleSearchMarmiton = async () => {
    if (!searchQuery.trim()) return;

    try {
      setErrorMessage(null);
      setIsSearching(true);
      const results = await MarmitonService.searchRecipes(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setErrorMessage('Aucune recette trouvée sur Marmiton pour cette recherche.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors de la recherche sur Marmiton.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.webIconBadge}>
                <Ionicons name="globe-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerTitlesCol}>
                <Text style={styles.modalTitle}>Importer une recette Web</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  JSON-LD Schema.org universel & Marmiton
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={isImporting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Onglets : Lien direct ou Recherche Marmiton */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'url' && styles.tabBtnActive]}
              onPress={() => {
                setTab('url');
                setErrorMessage(null);
              }}
              disabled={isImporting}
            >
              <Ionicons
                name="link"
                size={16}
                color={tab === 'url' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'url' && styles.tabTextActive]}>
                Coller un lien web
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'search' && styles.tabBtnActive]}
              onPress={() => {
                setTab('search');
                setErrorMessage(null);
              }}
              disabled={isImporting}
            >
              <Ionicons
                name="search"
                size={16}
                color={tab === 'search' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>
                Chercher Marmiton
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Chargement pendant l'importation */}
          {isImporting ? (
            <View style={styles.importingBox}>
              <ActivityIndicator size="large" color={colors.primary} style={styles.importSpinner} />
              <Text style={styles.importingTitle}>Importation en cours...</Text>
              <Text style={styles.importingStepText}>{importStepText}</Text>
              <Text style={styles.importingHintText}>
                Extraction haute vitesse sans publicité, prête à cuisiner.
              </Text>
            </View>
          ) : (
            <>
              {/* Contenu Tab 1 : Coller un lien */}
              {tab === 'url' && (
                <ScrollView
                  style={styles.urlTabScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.fieldLabel}>URL de la recette :</Text>
                  <View style={styles.urlInputWrapper}>
                    <Ionicons name="link-outline" size={18} color={colors.textMuted} style={styles.urlIcon} />
                    <TextInput
                      style={styles.urlInput}
                      value={urlInput}
                      onChangeText={setUrlInput}
                      placeholder="https://... (ex: CuisineAZ, 750g, Marmiton, Jow, blog...)"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                    {urlInput.length > 0 && (
                      <TouchableOpacity onPress={() => setUrlInput('')} style={styles.clearIconBtn}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Puces des sites compatibles */}
                  <View style={styles.platformsContainer}>
                    <Text style={styles.platformsTitle}>Sites compatibles instantanés :</Text>
                    <View style={styles.platformsChipsRow}>
                      {POPULAR_PLATFORMS.map((site) => (
                        <View key={site} style={styles.platformChip}>
                          <Text style={styles.platformChipText}>{site}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.specRulesBox}>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="flash" size={14} color={colors.primary} />
                      <Text style={styles.specRuleText}>
                        Parser universel JSON-LD Schema.org (<Text style={{ fontWeight: '700' }}>instantané & gratuit</Text>)
                      </Text>
                    </View>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
                      <Text style={styles.specRuleText}>
                        Portions, ingrédients normalisés et étapes structurées
                      </Text>
                    </View>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="images" size={14} color={colors.secondary} />
                      <Text style={styles.specRuleText}>
                        Sélection automatique des photos haute résolution
                      </Text>
                    </View>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={styles.specRuleText}>
                        Fallback automatique IA Gemini 3.8 Flash si nécessaire
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.importBtn, !urlInput.trim() && styles.importBtnDisabled]}
                    onPress={() => handleImportUrl(urlInput)}
                    disabled={!urlInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.importBtnText}>Importer la recette</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Contenu Tab 2 : Recherche Marmiton */}
              {tab === 'search' && (
                <View style={styles.searchTabContent}>
                  <View style={styles.searchBarWrapper}>
                    <Ionicons name="search" size={18} color={colors.textMuted} style={styles.urlIcon} />
                    <TextInput
                      style={styles.urlInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Ex: Tarte aux pommes, Quiche, Lasagnes..."
                      placeholderTextColor={colors.textMuted}
                      onSubmitEditing={handleSearchMarmiton}
                      returnKeyType="search"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.searchSubmitBtn}
                      onPress={handleSearchMarmiton}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.searchSubmitBtnText}>Chercher</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Liste des résultats de recherche */}
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.url}
                    style={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <View style={styles.searchResultRow}>
                        <View style={styles.searchResultTextContainer}>
                          <Text style={styles.searchResultTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={styles.searchResultUrl} numberOfLines={1}>
                            marmiton.org
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.importRowBtn}
                          onPress={() => handleImportUrl(item.url)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="download" size={14} color="#FFFFFF" />
                          <Text style={styles.importRowBtnText}>Importer</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    ListEmptyComponent={
                      !isSearching ? (
                        <View style={styles.searchEmptyBox}>
                          <Ionicons name="fast-food-outline" size={36} color={colors.textMuted} />
                          <Text style={styles.searchEmptyText}>
                            Entrez un plat pour explorer Marmiton et l&apos;importer en un clic.
                          </Text>
                        </View>
                      ) : undefined
                    }
                  />
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '90%',
    ...shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  headerTitlesCol: {
    flex: 1,
  },
  webIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.cardBackground,
    ...shadows.small,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
  importingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importSpinner: {
    marginBottom: 16,
  },
  importingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  importingStepText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  importingHintText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  urlTabScroll: {
    maxHeight: 460,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  urlIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.textPrimary,
    height: 48,
  },
  clearIconBtn: {
    padding: 4,
  },
  platformsContainer: {
    marginBottom: 14,
  },
  platformsTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  platformsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  platformChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  specRulesBox: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  specRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specRuleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  importBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginBottom: 10,
    ...shadows.small,
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchTabContent: {
    maxHeight: 380,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingLeft: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchSubmitBtn: {
    backgroundColor: colors.primary,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  resultsList: {
    maxHeight: 280,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchResultTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  searchResultUrl: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  importRowBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  importRowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchEmptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}));
