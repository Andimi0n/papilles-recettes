import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { ALLERGEN_FAMILIES, AllergenFamily } from '../types/vocabulary';

interface AllergenFamilyPickerModalProps {
  visible: boolean;
  ingredientName: string;
  currentFamily?: AllergenFamily | null;
  onSelectFamily: (family: AllergenFamily | null) => void;
  onClose: () => void;
}

export const AllergenFamilyPickerModal: React.FC<AllergenFamilyPickerModalProps> = ({
  visible,
  ingredientName,
  currentFamily,
  onSelectFamily,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');

  // Hauteur fixe et généreuse (82% de l'écran, plafonné à 640px) garantissant que le contenu ne s'effondre jamais
  const modalHeight = Math.min(640, Math.round(windowHeight * 0.82));

  const filteredFamilies = ALLERGEN_FAMILIES.filter((fam) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      fam.name.toLowerCase().includes(q) ||
      fam.description.toLowerCase().includes(q)
    );
  });

  const suggestedFamilyObj = currentFamily
    ? ALLERGEN_FAMILIES.find((f) => f.id === currentFamily)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalContainer,
            { height: modalHeight, backgroundColor: colors.cardBackground },
          ]}
        >
          {/* Poignée visuelle */}
          <View style={[styles.handleBar, { backgroundColor: colors.borderMedium }]} />

          {/* En-tête */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.headerTitleContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Classer cet allergène
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  À quelle famille appartient{' '}
                  <Text style={{ fontWeight: '700', color: colors.primary }}>
                    « {ingredientName} »
                  </Text>{' '}
                  ?
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Si une famille est déjà détectée par défaut, proposition rapide en 1 clic */}
          {suggestedFamilyObj && (
            <View style={[styles.suggestedBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <View style={styles.suggestedBannerLeft}>
                <Text style={styles.suggestedEmoji}>{suggestedFamilyObj.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestedTitle, { color: colors.primary }]}>
                    Famille suggérée : {suggestedFamilyObj.name}
                  </Text>
                  <Text style={[styles.suggestedSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    Détecté selon la norme européenne INCO
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.suggestedConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onSelectFamily(suggestedFamilyObj.id);
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.suggestedConfirmBtnText}>Valider</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recherche rapide parmi les familles */}
          <View
            style={[
              styles.searchBarContainer,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une famille (lait, gluten, noix...)"
              placeholderTextColor={colors.textMuted}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Liste déroulante des familles */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Option "Autre / Aucun des 14" */}
            <TouchableOpacity
              style={[
                styles.familyCard,
                {
                  backgroundColor: currentFamily === null ? colors.primaryLight : colors.cardBackground,
                  borderColor: currentFamily === null ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={() => {
                onSelectFamily(null);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.familyCardLeft}>
                <Text style={styles.familyEmoji}>❓</Text>
                <View style={styles.familyTextContainer}>
                  <View style={styles.familyNameRow}>
                    <Text style={[styles.familyName, { color: colors.textPrimary }]}>
                      Autre allergie
                    </Text>
                    <View style={[styles.pillBadge, { backgroundColor: colors.surfaceAlt }]}>
                      <Text style={[styles.pillBadgeText, { color: colors.textSecondary }]}>
                        Hors 14 majeurs
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.familyDescription, { color: colors.textMuted }]}>
                    Allergie spécifique (ex: Fraise, Kiwi, Avocat, Pomme...)
                  </Text>
                </View>
              </View>
              {currentFamily === null ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            <View style={styles.sectionDivider}>
              <Text style={[styles.sectionDividerText, { color: colors.textMuted }]}>
                OU L&apos;UNE DES 14 FAMILLES MAJEURES (RÈGLEMENT INCO)
              </Text>
            </View>

            {/* 14 familles */}
            {filteredFamilies.map((fam) => {
              const isSelected = currentFamily === fam.id;
              return (
                <TouchableOpacity
                  key={fam.id}
                  style={[
                    styles.familyCard,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.cardBackground,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                    },
                  ]}
                  onPress={() => {
                    onSelectFamily(fam.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.familyCardLeft}>
                    <Text style={styles.familyEmoji}>{fam.emoji}</Text>
                    <View style={styles.familyTextContainer}>
                      <View style={styles.familyNameRow}>
                        <Text style={[styles.familyName, { color: colors.textPrimary }]}>
                          {fam.name}
                        </Text>
                      </View>
                      <Text style={[styles.familyDescription, { color: colors.textMuted }]}>
                        {fam.description}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Padding bordure basse Safe Area */}
          <SafeAreaView edges={['bottom']} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  suggestedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  suggestedEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  suggestedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestedSub: {
    fontSize: 11,
    marginTop: 1,
  },
  suggestedConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestedConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  familyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  familyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  familyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  familyTextContainer: {
    flex: 1,
  },
  familyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  familyDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionDivider: {
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
