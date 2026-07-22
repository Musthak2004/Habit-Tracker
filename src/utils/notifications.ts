import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Not supported on web
}

let initialized = false;

export async function initNotifications(): Promise<boolean> {
  if (initialized) return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Android requires notification channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        description: 'Daily reminders to complete your habits',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 100, 100],
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync('coaching-nudges', {
        name: 'Coach Nudges',
        description: 'Personalized coaching messages from your habit coach',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 100, 100],
        enableVibrate: true,
      });
    }

    // Cancel all existing scheduled notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    initialized = true;
    return true;
  } catch (e) {
    console.warn('Failed to initialize notifications', e);
    return false;
  }
}

export async function scheduleDailyReminder(
  time: string, // "HH:mm" format
  habitNames: string[]
): Promise<void> {
  try {
    const [hours, minutes] = time.split(':').map(Number);

    if (habitNames.length === 0) {
      // Generic reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Habit Check-in',
          body: 'Hey! Time to check in on your habits. What have you done today?',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    } else if (habitNames.length <= 3) {
      // Personalized reminder
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Don\'t Forget!',
          body: `You still have habits to do: ${habitNames.join(', ')}. Take 2 minutes!`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    } else {
      // General reminder with habit count
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Habit Check-in',
          body: `You have ${habitNames.length} habits waiting for you today. Let\'s go! 💪`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  } catch (e) {
    console.warn('Failed to schedule reminder', e);
  }
}

// ── Per-habit notification scheduling ──────────────────────
export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  time: string // "HH:mm"
): Promise<void> {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${habitName}`,
        body: `Time to work on "${habitName}"! You've got this! 💪`,
        sound: true,
        data: { habitId, type: 'habit' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  } catch (e) {
    console.warn('Failed to schedule habit reminder', e);
  }
}

// ── Schedule all per-habit reminders ───────────────────────
export async function scheduleAllHabitReminders(
  habits: Array<{ id: string; name: string; notificationTime?: string }>,
  defaultTime: string
): Promise<void> {
  // Cancel all existing first
  await cancelAllNotifications();
  // Schedule each habit with its own time, or use default
  for (const habit of habits) {
    const time = habit.notificationTime || defaultTime;
    await scheduleHabitReminder(habit.id, habit.name, time);
  }
}

// ── Challenge-specific notifications ──────────────────────
export async function scheduleChallengeReminder(
  challengeId: string,
  challengeName: string,
  daysRemaining: number
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏆 Challenge Alert!',
        body: `"${challengeName}" — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining! Keep it up!`,
        sound: true,
        data: { challengeId, type: 'challenge' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3600, // 1 hour later
      },
    });
  } catch (e) {
    console.warn('Failed to schedule challenge reminder', e);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel notifications', e);
  }
}

// ── Coaching nudge push notification ────────────────────────
// Tracks the last-scheduled coaching notification ID so we can
// cancel-and-replace when a fresh nudge is generated.
let coachingNotifId: string | null = null;

export async function scheduleCoachingNudgeNotification(
  body: string,
  time: string // "HH:mm"
): Promise<void> {
  try {
    const [hours, minutes] = time.split(':').map(Number);

    // Cancel the previous coaching notification so we don't stack duplicates
    if (coachingNotifId) {
      await Notifications.cancelScheduledNotificationAsync(coachingNotifId);
    }

    // Ensure the Android channel exists
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('coaching-nudges', {
        name: 'Coach Nudges',
        description: 'Personalized coaching messages from your habit coach',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 100, 100, 100],
        enableVibrate: true,
      }).catch(() => {}); // Ignore if it already exists
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧠 Habit Coach',
        body,
        sound: true,
        data: { type: 'coaching' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    coachingNotifId = id;
  } catch (e) {
    console.warn('Failed to schedule coaching notification', e);
  }
}

export async function cancelCoachingNotification(): Promise<void> {
  if (coachingNotifId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(coachingNotifId);
      coachingNotifId = null;
    } catch (e) {
      console.warn('Failed to cancel coaching notification', e);
    }
  }
}
