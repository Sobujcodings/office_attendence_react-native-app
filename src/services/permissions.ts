import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

export interface PermissionState {
  foregroundLocation: boolean;
  backgroundLocation: boolean;
  locationServices: boolean;
  notifications: boolean;
}

export async function getPermissionState(): Promise<PermissionState> {
  const [fg, bg, services, notif] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return {
    foregroundLocation: fg.granted,
    backgroundLocation: bg.granted,
    locationServices: services,
    notifications: notif.granted,
  };
}

/** Foreground first, then "Allow all the time" (Android sends the user to Settings for it). */
export async function requestLocationPermissions(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    await Linking.openSettings();
  }
}

export const openAppSettings = () => Linking.openSettings();
