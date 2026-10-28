import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecipeStep } from '../../types/recipe';
import { Colors } from '../../theme/colors';
import { extractTimersFromText, formatTimerSeconds } from '../../utils/helpers';
import { styles } from '../../screens/RecipeDetailScreen.styles';

export interface InlineStepTimer {
  id: string;
  stepId: string;
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export interface RecipeInstructionsListProps {
  steps: RecipeStep[];
  checkedSteps: Record<string, boolean>;
  onToggleStepCheck: (stepId: string) => void;
  inlineTimers: Record<string, InlineStepTimer>;
  onStartInlineTimer: (
    stepId: string,
    index: number,
    timerId: string,
    label: string,
    totalSeconds: number
  ) => void;
  onToggleInlineTimerPause: (timerKey: string) => void;
  onAddMinuteToInlineTimer: (timerKey: string) => void;
  onStopInlineTimer: (timerKey: string) => void;
}

export const RecipeInstructionsList: React.FC<RecipeInstructionsListProps> = ({
  steps,
  checkedSteps,
  onToggleStepCheck,
  inlineTimers,
  onStartInlineTimer,
  onToggleInlineTimerPause,
  onAddMinuteToInlineTimer,
  onStopInlineTimer,
}) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.stepsHeaderRow}>
          <Text style={styles.sectionTitle}>
            Préparation ({steps.length} étapes)
          </Text>
        </View>
      </View>

      {steps.map((step, index) => {
        const isChecked = !!checkedSteps[step.id];
        const stepTimers = extractTimersFromText(step.instruction);

        return (
          <View
            key={step.id}
            style={[styles.stepItemContainer, isChecked && styles.rowChecked]}
          >
            <TouchableOpacity
              style={styles.stepRow}
              onPress={() => onToggleStepCheck(step.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.stepNumberBadge, isChecked && styles.stepNumberChecked]}>
                <Text style={[styles.stepNumberText, isChecked && styles.stepNumberTextChecked]}>
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepInstruction,
                  isChecked && styles.textChecked,
                ]}
              >
                {step.instruction}
              </Text>
            </TouchableOpacity>

            {stepTimers.length > 0 && (
              <View style={styles.inlineTimerChipsRow}>
                {stepTimers.map((t) => {
                  const timerKey = `${step.id}_${t.id}`;
                  const activeTimer = inlineTimers[timerKey];

                  if (!activeTimer) {
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.inlineStartTimerBtn}
                        onPress={() =>
                          onStartInlineTimer(
                            step.id,
                            index,
                            t.id,
                            t.label,
                            t.totalSeconds
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={12} color="#FFFFFF" />
                        <Text style={styles.inlineStartTimerBtnText}>
                          Lancer minuteur ({t.label})
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  const progressPercent = Math.min(
                    100,
                    Math.max(
                      0,
                      (activeTimer.remainingSeconds / activeTimer.totalSeconds) * 100
                    )
                  );
                  const isFinished = activeTimer.remainingSeconds === 0;

                  return (
                    <View
                      key={t.id}
                      style={[
                        styles.inlineActiveTimerBox,
                        isFinished && styles.inlineActiveTimerBoxFinished,
                      ]}
                    >
                      <View style={styles.inlineActiveTimerHeader}>
                        <View style={styles.inlineTimerTitleRow}>
                          <Ionicons
                            name={
                              isFinished
                                ? 'alarm'
                                : activeTimer.isRunning
                                ? 'timer'
                                : 'pause-circle'
                            }
                            size={15}
                            color={isFinished ? '#FFFFFF' : Colors.primary}
                          />
                          <Text
                            style={[
                              styles.inlineTimerDigits,
                              isFinished && styles.inlineTimerDigitsFinished,
                            ]}
                          >
                            {formatTimerSeconds(activeTimer.remainingSeconds)}
                          </Text>
                          <Text
                            style={[
                              styles.inlineTimerLabel,
                              isFinished && styles.inlineTimerLabelFinished,
                            ]}
                          >
                            {isFinished ? '• Temps écoulé !' : `(${activeTimer.label})`}
                          </Text>
                        </View>

                        {/* Actions de contrôle */}
                        <View style={styles.inlineTimerActionsRow}>
                          {!isFinished ? (
                            <>
                              <TouchableOpacity
                                style={styles.inlineTimerSmallBtn}
                                onPress={() => onToggleInlineTimerPause(timerKey)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={activeTimer.isRunning ? 'pause' : 'play'}
                                  size={13}
                                  color={Colors.primary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.inlineTimerSmallBtn}
                                onPress={() => onAddMinuteToInlineTimer(timerKey)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.inlineTimerAddText}>+1m</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.inlineTimerSmallBtn, styles.inlineTimerStopBtn]}
                                onPress={() => onStopInlineTimer(timerKey)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="close" size={13} color={Colors.textSecondary} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <TouchableOpacity
                              style={styles.inlineTimerStopAlarmBtn}
                              onPress={() => onStopInlineTimer(timerKey)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                              <Text style={styles.inlineTimerStopAlarmText}>Arrêter</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Jauge d'avancement horizontale */}
                      <View style={styles.inlineProgressBarTrack}>
                        <View
                          style={[
                            styles.inlineProgressBarFill,
                            { width: `${progressPercent}%` },
                            isFinished && styles.inlineProgressBarFillFinished,
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};
