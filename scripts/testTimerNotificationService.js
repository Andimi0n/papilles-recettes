#!/usr/bin/env node

/**
 * Test unitaire TimerNotificationService (Calculs d'horodatage, programmation, annulation et synchro)
 */
const assert = require('assert');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const tmpDir = path.join(__dirname, '../.tmp_test_timer_service');

  try {
    const tscBin = path.join(__dirname, '../node_modules/.bin/tsc');
    execSync(
      `"${tscBin}" src/services/timerNotificationService.ts src/types/timer.ts --outDir "${tmpDir}" --module commonjs --target es2020 --skipLibCheck --esModuleInterop --ignoreConfig`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error('Erreur lors de la compilation :', err.message);
    process.exit(1);
  }

  // Mocks pour l'environnement Node CLI
  require.cache[require.resolve('react-native')] = {
    exports: {
      Platform: { OS: 'android', select: (obj) => obj.android || obj.default },
    },
  };

  const timerService = require(path.join(tmpDir, 'services/timerNotificationService.js'));

  console.log('🧪 Lancement des tests de TimerNotificationService...');

  // Mock Expo Notifications
  let scheduledList = [];
  let cancelledList = [];
  let channelCreated = null;
  let notificationHandler = null;

  const mockNotifications = {
    AndroidImportance: { MAX: 5 },
    AndroidNotificationPriority: { MAX: 2 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationHandler: (handler) => {
      notificationHandler = handler;
    },
    setNotificationChannelAsync: async (channelId, config) => {
      channelCreated = { channelId, config };
    },
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    scheduleNotificationAsync: async ({ content, trigger }) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      scheduledList.push({ id, content, trigger });
      return id;
    },
    cancelScheduledNotificationAsync: async (id) => {
      cancelledList.push(id);
    },
  };

  timerService.setNotificationsModuleForTesting(mockNotifications);

  // 1. Initialisation
  console.log('  1. Initialisation du handler et du canal de notification Android...');
  await timerService.initTimerNotifications();
  assert(notificationHandler !== null, 'Le notification handler doit être configuré');
  assert(channelCreated !== null, 'Le canal Android doit être configuré');
  assert.strictEqual(channelCreated.channelId, 'cooking_timers');
  assert.strictEqual(channelCreated.config.importance, 5);
  console.log('  ✓ Initialisation et canal validés');

  // 2. Calculs temporels
  console.log('  2. Calculs de timestamps cibles et décompte...');
  const now = Date.now();
  const targetTs = timerService.calculateTargetTimestamp(60);
  assert(targetTs >= now + 59000 && targetTs <= now + 61000, 'calculateTargetTimestamp doit renvoyer now + 60s');

  const remaining = timerService.calculateRemainingSeconds(targetTs);
  assert(remaining === 60 || remaining === 59, 'calculateRemainingSeconds doit renvoyer ~60s');

  const zeroRemaining = timerService.calculateRemainingSeconds(now - 1000);
  assert.strictEqual(zeroRemaining, 0, 'Un timestamp passé doit renvoyer 0');

  const fallbackRemaining = timerService.calculateRemainingSeconds(undefined, 42);
  assert.strictEqual(fallbackRemaining, 42, 'Sans timestamp cible, utilise le fallback');
  console.log('  ✓ Calculs temporels précis validés');

  // 3. Programmation de notification
  console.log('  3. Programmation d\'une notification de minuteur...');
  const notifId = await timerService.scheduleTimerNotification({
    label: 'Cuisson des pâtes',
    stepIndex: 1,
    seconds: 480,
  });
  assert(typeof notifId === 'string' && notifId.startsWith('notif_'), 'Doit renvoyer un notificationId valide');
  assert.strictEqual(scheduledList.length, 1);
  assert.strictEqual(scheduledList[0].trigger.seconds, 480);
  assert(scheduledList[0].content.body.includes('Cuisson des pâtes'));
  assert(scheduledList[0].content.body.includes('Étape 2'));
  console.log('  ✓ Programmation validée');

  // 4. Annulation de notification
  console.log('  4. Annulation d\'une notification programmée...');
  await timerService.cancelTimerNotification(notifId);
  assert.strictEqual(cancelledList.length, 1);
  assert.strictEqual(cancelledList[0], notifId);
  console.log('  ✓ Annulation validée');

  // 5. Synchro du tick et AppState
  console.log('  5. Synchronisation de tick (syncTimerTick)...');
  const runningTimer = {
    id: 'test_1',
    stepIndex: 0,
    label: 'Mijotage',
    totalSeconds: 300,
    remainingSeconds: 300,
    isRunning: true,
    targetTimestamp: Date.now() + 150 * 1000, // Il reste 150s
    notificationId: notifId,
  };

  const sync1 = timerService.syncTimerTick(runningTimer);
  assert.strictEqual(sync1.hasFinished, false);
  assert(sync1.timer.remainingSeconds >= 149 && sync1.timer.remainingSeconds <= 150);

  // Timer qui vient de terminer
  const finishedTimer = {
    ...runningTimer,
    targetTimestamp: Date.now() - 500, // Expiré il y a 0.5s
  };
  const sync2 = timerService.syncTimerTick(finishedTimer);
  assert.strictEqual(sync2.hasFinished, true);
  assert.strictEqual(sync2.timer.remainingSeconds, 0);
  assert.strictEqual(sync2.timer.isRunning, false);
  assert.strictEqual(sync2.timer.targetTimestamp, undefined);
  console.log('  ✓ Synchronisation de tick et détection de fin validées');

  console.log('🎉 Tous les tests de TimerNotificationService sont passés avec succès !');

  // Nettoyage du dossier temporaire
  try {
    const fs = require('fs');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

main().catch((err) => {
  console.error('Échec des tests :', err);
  process.exit(1);
});
