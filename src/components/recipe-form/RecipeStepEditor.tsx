import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeStep } from '../../types/recipe';
import { useTheme } from '../../theme/ThemeContext';
import { Colors } from '../../theme/colors';
import { styles } from '../../screens/RecipeFormScreen.styles';

interface DraggableStepRowProps {
  step: RecipeStep;
  index: number;
  totalSteps: number;
  onUpdate: (val: string) => void;
  onRemove: () => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
  setIsDraggingStep: (isDragging: boolean) => void;
}

function createStepPanResponder(
  panY: Animated.Value,
  index: number,
  totalSteps: number,
  onMoveStep: (from: number, to: number) => void,
  setIsDraggingStep: (isDragging: boolean) => void,
  setIsBeingDragged: (isDragging: boolean) => void
) {
  let lastDy = 0;
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
    onPanResponderGrant: () => {
      setIsBeingDragged(true);
      setIsDraggingStep(true);
      lastDy = 0;
      panY.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      const dy = gestureState.dy;
      const delta = dy - lastDy;
      panY.setValue(delta);

      const THRESHOLD = 46;
      if (delta > THRESHOLD && index < totalSteps - 1) {
        onMoveStep(index, index + 1);
        lastDy = dy;
        panY.setValue(0);
      } else if (delta < -THRESHOLD && index > 0) {
        onMoveStep(index, index - 1);
        lastDy = dy;
        panY.setValue(0);
      }
    },
    onPanResponderRelease: () => {
      setIsBeingDragged(false);
      setIsDraggingStep(false);
      Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => {
      setIsBeingDragged(false);
      setIsDraggingStep(false);
      Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
    },
  });
}

const DraggableStepRow: React.FC<DraggableStepRowProps> = ({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveStep,
  setIsDraggingStep,
}) => {
  const { colors } = useTheme();
  const [panY] = useState(() => new Animated.Value(0));
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  const panResponder = useMemo(
    () =>
      createStepPanResponder(
        panY,
        index,
        totalSteps,
        onMoveStep,
        setIsDraggingStep,
        setIsBeingDragged
      ),
    [index, totalSteps, onMoveStep, setIsDraggingStep, panY]
  );

  return (
    <Animated.View
      style={[
        styles.stepEditRow,
        isBeingDragged && [
          styles.stepRowDragging,
          {
            transform: [{ translateY: panY }],
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.primary,
          },
        ],
      ]}
    >
      {/* Poignée de glissement direct (Drag Handle) */}
      <View
        {...panResponder.panHandlers}
        style={styles.dragHandle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`Glisser pour réordonner l'étape ${index + 1}`}
      >
        <Ionicons
          name="reorder-two-outline"
          size={24}
          color={isBeingDragged ? colors.primary : colors.textMuted}
        />
      </View>

      <View style={styles.stepNumBadge}>
        <Text style={styles.stepNumText}>{index + 1}</Text>
      </View>

      <TextInput
        style={[styles.textInput, styles.stepInput]}
        value={step.instruction}
        onChangeText={onUpdate}
        placeholder={`Description de l'étape ${index + 1}...`}
        placeholderTextColor={colors.textMuted}
        multiline
      />

      {totalSteps > 1 && (
        <View style={styles.stepQuickReorderCol}>
          <TouchableOpacity
            style={[styles.stepQuickArrowBtn, index === 0 && styles.stepQuickArrowDisabled]}
            onPress={() => onMoveStep(index, index - 1)}
            disabled={index === 0}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityLabel="Monter l'étape"
          >
            <Ionicons
              name="chevron-up"
              size={13}
              color={index === 0 ? colors.borderLight : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepQuickArrowBtn, index === totalSteps - 1 && styles.stepQuickArrowDisabled]}
            onPress={() => onMoveStep(index, index + 1)}
            disabled={index === totalSteps - 1}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            accessibilityLabel="Descendre l'étape"
          >
            <Ionicons
              name="chevron-down"
              size={13}
              color={index === totalSteps - 1 ? colors.borderLight : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={onRemove}
        style={styles.deleteRowBtn}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityLabel="Supprimer cette étape"
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export interface RecipeStepEditorProps {
  steps: RecipeStep[];
  onAddStep: () => void;
  onUpdateStep: (index: number, instruction: string) => void;
  onRemoveStep: (index: number) => void;
  onMoveStep: (fromIndex: number, toIndex: number) => void;
  setIsDraggingStep: (isDragging: boolean) => void;
}

export const RecipeStepEditor: React.FC<RecipeStepEditorProps> = ({
  steps,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onMoveStep,
  setIsDraggingStep,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Étapes ({steps.length})</Text>
        <TouchableOpacity onPress={onAddStep} style={styles.addItemBtn}>
          <Ionicons name="add-circle" size={18} color={Colors.primary} />
          <Text style={styles.addItemBtnText}>Ajouter une étape</Text>
        </TouchableOpacity>
      </View>

      {steps.map((step, index) => (
        <DraggableStepRow
          key={step.id}
          step={step}
          index={index}
          totalSteps={steps.length}
          onUpdate={(val) => onUpdateStep(index, val)}
          onRemove={() => onRemoveStep(index)}
          onMoveStep={onMoveStep}
          setIsDraggingStep={setIsDraggingStep}
        />
      ))}
    </View>
  );
};
