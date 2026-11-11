/**
 * Types pour le système de minuteurs de cuisine avec notifications locales et persistance temporelle.
 */

export interface ActiveCookingTimer {
  id: string;
  stepId?: string;
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  targetTimestamp?: number;
  notificationId?: string;
}
