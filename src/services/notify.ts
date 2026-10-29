import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSettings } from './store';

// Expo routes notifications without an explicit channel to the "default" channel.
const CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Attendance',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelReady = true;
}

export async function notify(title: string, body: string): Promise<void> {
  try {
    if (!(await getSettings()).notifications) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch (err) {
    console.warn('[notify]', err);
  }
}
