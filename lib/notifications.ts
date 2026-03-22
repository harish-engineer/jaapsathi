import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert } from 'react-native';

// Set up foreground notification behaviour safely
// (setNotificationHandler can throw in Expo Go SDK 53+ if push infra is missing)
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
} catch (_) {
  // Expo Go — gracefully ignore
}

/** Request permission and return whether it was granted */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) return true; // Simulator — pretend OK

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Cancel all previously scheduled daily reminders */
export async function cancelDailyReminder() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.type === 'daily_reminder') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // Silently ignore — Expo Go limitation
  }
}

/**
 * Schedule (or reschedule) a daily repeating notification at the given time.
 * @param timeStr  "HH:MM" 24-hour format, e.g. "06:00"
 * @param userName Used to personalise the notification body
 */
export async function scheduleDailyReminder(
  timeStr: string,
  userName: string
): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    // Cancel the old one first
    await cancelDailyReminder();

    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your Jaap 🪔',
        body: `Namaste ${userName}! Your daily mantra practice awaits.`,
        sound: 'default',
        data: { type: 'daily_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    return id;
  } catch (err: any) {
    // Local notifications may fail in Expo Go on Android SDK 53+
    console.warn('scheduleDailyReminder failed (likely Expo Go limitation):', err?.message ?? err);
    Alert.alert(
      'Notifications Unavailable',
      'Daily reminders require a development build. In Expo Go, local notifications are limited on Android SDK 53+.',
      [{ text: 'OK' }]
    );
    return null;
  }
}
