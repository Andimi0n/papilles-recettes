import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem, ShoppingAisle } from '../types/shopping';
import { AISLE_CONFIGS, ALL_AISLES } from '../utils/aisleClassifier';
import { useTheme } from '../theme/ThemeContext';
import { createDynamicStyles } from '../theme/colors';
import { UnitQuickPicker } from './UnitQuickPicker';
import { UnitPickerModal } from './UnitPickerModal';

interface EditShoppingItemModalProps {
  visible: boolean;
  item: ShoppingItem | null;
  onClose: () => void;
  onSave: (updatedItem: ShoppingItem) => void;
}

export const EditShoppingItemModal: React.FC<EditShoppingItemModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
}) => {
  const { colors, isDark } = useTheme();

  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item?.unit || '');
  const [aisle, setAisle] = useState<ShoppingAisle>(item?.aisle || 'Autre');
  const [isUnitModalVisible, setIsUnitModalVisible] = useState(false);

  // Pattern React 19 : Ajustement d'état synchronisé au changement d'item
  const [prevItem, setPrevItem] = useState(item);
  if (prevItem !== item) {
    setPrevItem(item);
    setName(item?.name || '');
    setQuantity(item?.quantity ? String(item.quantity) : '');
    setUnit(item?.unit || '');
    setAisle(item?.aisle || 'Autre');
  }

  if (!item) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Nom requis', "Veuillez saisir un nom pour l'article.");
      return;
    }

    const cleanQty = quantity.trim();

    onSave({
      ...item,
      name: trimmedName,
      quantity: cleanQty || undefined,
      unit: unit.trim() || undefined,
      aisle,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalCard}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBox}>
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Modifier l&apos;article</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formContent}
          >
            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de l&apos;article</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Ex : Carottes, Lait, Pâtes..."
                placeholderTextColor={colors.textMuted}
                autoFocus={false}
              />
            </View>

            {/* Quantité & Unité */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quantité</Text>
                <TextInput
                  style={styles.textInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Ex : 500, 2..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1.4 }]}>
                <Text style={styles.label}>Unité</Text>
                <TouchableOpacity
                  style={styles.unitSelectorBtn}
                  onPress={() => setIsUnitModalVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.unitSelectorText,
                      !unit && { color: colors.textMuted },
                    ]}
                  >
                    {unit || 'Aucune unité'}
                  </Text>
                  {unit ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setUnit('');
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Puces rapides d'unités */}
            <View style={styles.quickUnitsContainer}>
              <UnitQuickPicker
                value={unit}
                onChangeUnit={(u) => setUnit(u)}
                onOpenFullPicker={() => setIsUnitModalVisible(true)}
                compact
              />
            </View>

            {/* Rayon */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rayon de supermarché</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.aislesScroll}
              >
                {ALL_AISLES.map((a) => {
                  const cfg = AISLE_CONFIGS[a];
                  const isSelected = aisle === a;
                  return (
                    <TouchableOpacity
                      key={a}
                      style={[
                        styles.aisleChip,
                        isSelected && {
                          borderColor: cfg.color,
                          backgroundColor: isDark ? cfg.color + '26' : cfg.bgColor,
                        },
                      ]}
                      onPress={() => setAisle(a)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cfg.iconName as any}
                        size={14}
                        color={isSelected ? cfg.color : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.aisleChipText,
                          isSelected && { color: cfg.color, fontWeight: '700' },
                        ]}
                      >
                        {a}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={17} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <UnitPickerModal
        visible={isUnitModalVisible}
        currentUnit={unit}
        onSelectUnit={(u) => setUnit(u)}
        onClose={() => setIsUnitModalVisible(false)}
        title="Choisir une unité"
      />
    </Modal>
  );
};

const styles = createDynamicStyles((colors, shadows) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: colors.cardBackground,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
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
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContent: {
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  unitSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  unitSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickUnitsContainer: {
    marginBottom: 14,
  },
  aislesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  aisleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  aisleChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    ...shadows.small,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
}));
