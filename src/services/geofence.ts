import * as Location from 'expo-location';
import { GEOFENCE_TASK, OFFICE_REGION_ID } from '../constants';
import type { OfficeConfig } from '../types';

/** Registers (or replaces) the office geofence with the OS. */
export async function startGeofence(office: OfficeConfig): Promise<void> {
  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: OFFICE_REGION_ID,
      latitude: office.latitude,
      longitude: office.longitude,
      radius: office.radius,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}

/**
 * Android silently drops geofences when location is turned off, on reboot and
 * sometimes after updates, while Expo still reports the task as started. So this
 * re-registers unconditionally; replacing an existing geofence is cheap.
 */
export async function refreshGeofence(office: OfficeConfig): Promise<boolean> {
  const [bg, servicesOn] = await Promise.all([
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);
  if (!bg.granted || !servicesOn) return false;
  await startGeofence(office);
  return true;
}
