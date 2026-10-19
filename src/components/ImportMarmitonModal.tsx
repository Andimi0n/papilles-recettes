import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../theme/colors';
import { MarmitonService, MarmitonSearchResult } from '../services/marmitonService';
import { Recipe } from '../types/recipe';

interface ImportMarmitonModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeImported: (recipe: Recipe) => void;
}

type TabMode = 'url' | 'search';

export const ImportMarmitonModal: React.FC<ImportMarmitonModalProps> = ({
  visible,
  onClose,
  onRecipeImported,
}) => {
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

  // Importation depuis une URL Marmiton
  const handleImportUrl = async (urlToImport: string) => {
    if (!urlToImport.trim()) {
      setErrorMessage('Veuillez renseigner un lien Marmiton valide.');
      return;
    }

    try {
      setErrorMessage(null);
      setIsImporting(true);
      setImportStepText('1/3 - Récupération du HTML Marmiton...');

      // Petite pause pour afficher la progression
      await new Promise((resolve) => setTimeout(resolve, 300));
      setImportStepText('2/3 - Extraction & structuration IA (Gemini 3.8 Flash)...');

      const recipe = await MarmitonService.importRecipeFromUrl(urlToImport.trim());

      setImportStepText('3/3 - Enregistrement de la recette (0 étoile)...');
      await new Promise((resolve) => setTimeout(resolve, 200));

      resetState();
      onRecipeImported(recipe);
    } catch (err: any) {
      console.error('Erreur import Marmiton:', err);
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
              <View style={styles.marmitonIconBadge}>
                <Ionicons name="globe-outline" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Bot Import Marmiton</Text>
                <Text style={styles.modalSubtitle}>Extraction HTML & Structuration IA</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={isImporting}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Onglets : Lien direct ou Recherche */}
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
                color={tab === 'url' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'url' && styles.tabTextActive]}>
                Coller un lien
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
                color={tab === 'search' ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>
                Chercher sur Marmiton
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Loading pendant l'importation IA */}
          {isImporting ? (
            <View style={styles.importingBox}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.importSpinner} />
              <Text style={styles.importingTitle}>Importation en cours...</Text>
              <Text style={styles.importingStepText}>{importStepText}</Text>
              <Text style={styles.importingHintText}>
                La recette sera créée sans photo et initialisée à 0 étoile.
              </Text>
            </View>
          ) : (
            <>
              {/* Contenu Tab 1 : Coller un lien */}
              {tab === 'url' && (
                <View style={styles.urlTabContent}>
                  <Text style={styles.fieldLabel}>URL de la recette Marmiton :</Text>
                  <View style={styles.urlInputWrapper}>
                    <Ionicons name="link-outline" size={18} color={Colors.textMuted} style={styles.urlIcon} />
                    <TextInput
                      style={styles.urlInput}
                      value={urlInput}
                      onChangeText={setUrlInput}
                      placeholder="https://www.marmiton.org/recettes/recette_..."
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                    {urlInput.length > 0 && (
                      <TouchableOpacity onPress={() => setUrlInput('')} style={styles.clearIconBtn}>
                        <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.specRulesBox}>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.secondary} />
                      <Text style={styles.specRuleText}>Pas besoin de photos (carte épurée)</Text>
                    </View>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.secondary} />
                      <Text style={styles.specRuleText}>Par défaut à 0 étoile (à noter après cuisson)</Text>
                    </View>
                    <View style={styles.specRuleRow}>
                      <Ionicons name="sparkles" size={14} color={Colors.primary} />
                      <Text style={styles.specRuleText}>Extraction IA Gemini 3.8 Flash des portions & ingrédients</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.importBtn, !urlInput.trim() && styles.importBtnDisabled]}
                    onPress={() => handleImportUrl(urlInput)}
                    disabled={!urlInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.importBtnText}>Lancer le bot d'import</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Contenu Tab 2 : Recherche Marmiton */}
              {tab === 'search' && (
                <View style={styles.searchTabContent}>
                  <View style={styles.searchBarWrapper}>
                    <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.urlIcon} />
                    <TextInput
                      style={styles.urlInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Ex: Tarte aux pommes, Quiche, Lasagnes..."
                      placeholderTextColor={Colors.textMuted}
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
                          <Ionicons name="fast-food-outline" size={36} color={Colors.textMuted} />
                          <Text style={styles.searchEmptyText}>
                            Entrez un plat pour explorer Marmiton et l'importer en un clic.
                          </Text>
                        </View>
                      ) : null
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '85%',
    ...Shadows.large,
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
  },
  marmitonIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
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
    backgroundColor: Colors.cardBackground,
    ...Shadows.small,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.danger,
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  importingStepText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  importingHintText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  urlTabContent: {
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  urlInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  urlIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    height: 48,
  },
  clearIconBtn: {
    padding: 4,
  },
  specRulesBox: {
    backgroundColor: Colors.surfaceAlt,
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
    gap: 8,
  },
  specRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specRuleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  importBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    ...Shadows.small,
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
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    paddingLeft: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  searchSubmitBtn: {
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchResultTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  searchResultUrl: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  importRowBtn: {
    backgroundColor: Colors.primary,
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
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
