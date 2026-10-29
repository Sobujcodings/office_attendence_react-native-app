import type { EventSource } from './types';

export const GEOFENCE_TASK = 'office-geofence-task';
export const RECONCILE_TASK = 'office-reconcile-task';
export const OFFICE_REGION_ID = 'office';

export const DEFAULT_RADIUS_M = 150;
export const RADIUS_OPTIONS_M = [100, 150, 200, 300];

/** Extra distance beyond the radius before a periodic check calls it an exit. */
export const EXIT_BUFFER_M = 50;
/** Periodic check interval; Android won't run background work more often than 15 min. */
export const RECONCILE_INTERVAL_MIN = 15;

/**
 * Coming back within this window of an exit cancels that exit (GPS drift or a
 * quick step out). Non-GPS signals are only seen every ~15 min, so they get longer.
 */
export const MERGE_WINDOW_GPS_MS = 10 * 60 * 1000;
export const MERGE_WINDOW_CHECK_MS = 40 * 60 * 1000;

/** Local hours [start, end) when a "location is off" reminder may be shown. */
export const LOCATION_REMINDER_HOURS = [8, 11] as const;

export const APP_VERSION = '1.1.0';

export const HISTORY_DAYS = 90;

/** Known office public IP; more get learned automatically on the office WiFi. */
export const DEFAULT_OFFICE_PUBLIC_IPS = ['103.91.128.38'];
export const MAX_OFFICE_PUBLIC_IPS = 20;
export const PUBLIC_IP_URL = 'https://api.ipify.org?format=json';

export const SOURCE_LABEL: Record<EventSource, string> = {
  GPS: 'Location',
  WIFI: 'Office WiFi',
  CHECK: 'Auto check',
  MANUAL: 'Manual',
};

export const GRACE_OPTIONS_MIN = [0, 5, 10, 15, 30];
export const TARGET_OPTIONS_MIN = [7 * 60, 8 * 60, 9 * 60, 10 * 60];
