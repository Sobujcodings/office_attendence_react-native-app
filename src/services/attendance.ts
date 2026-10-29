import * as Location from 'expo-location';
import {
  EXIT_BUFFER_M,
  LOCATION_REMINDER_HOURS,
  MERGE_WINDOW_CHECK_MS,
  MERGE_WINDOW_GPS_MS,
  SOURCE_LABEL,
} from '../constants';
import { getLastEvent, insertEvent, voidEvent } from '../db/events';
import type { EventSource, EventType, OfficeConfig } from '../types';
import { createSerialQueue, withTimeout } from '../utils/async';
import { formatTime, toDateKey } from '../utils/date';
import { distanceMeters } from '../utils/geo';
import { emitChange } from './bus';
import { refreshGeofence } from './geofence';
import { notify } from './notify';
import { learnOfficePublicIp } from './setup';
import {
  getLocationReminderDate,
  getOffice,
  getOfficeWifiSeenAt,
  getSettings,
  setLocationReminderDate,
  setOfficeWifiSeenAt,
} from './store';
import { isStrongMatch, matchOfficeWifi } from './wifi';

export interface Signal {
  kind: 'ENTER' | 'EXIT';
  source: EventSource;
  timestamp: number;
}

const enqueue = createSerialQueue();

/**
 * The single place where IN/OUT events get written. Every detector (geofence,
 * WiFi, periodic check) reports a raw signal here and this decides what it means.
 * Returns the event type recorded, or null if the signal was ignored.
 */
export function handleSignal(signal: Signal): Promise<EventType | null> {
  return enqueue(() => processSignal(signal));
}

async function processSignal({ kind, source, timestamp }: Signal): Promise<EventType | null> {
  const office = await getOffice();
  if (!office) return null;

  const last = await getLastEvent();
  const date = toDateKey(timestamp);
  // An IN left over from a previous day (missed exit) doesn't count as inside today.
  const inside = last?.type === 'IN' && last.date === date;

  if (kind === 'ENTER') {
    if (inside) return null;

    // Back soon after an exit: GPS drift, a WiFi blip or a quick step out, so undo the exit.
    const mergeWindow = source === 'GPS' ? MERGE_WINDOW_GPS_MS : MERGE_WINDOW_CHECK_MS;
    if (last?.type === 'OUT' && last.date === date && timestamp - last.timestamp < mergeWindow) {
      await voidEvent(last.id);
      emitChange();
      return null;
    }

    await insertEvent('IN', source, timestamp);
    emitChange();
    await notify('Checked in', `${formatTime(timestamp)} · ${SOURCE_LABEL[source]}`);
    return 'IN';
  }

  if (!inside || timestamp < last.timestamp) return null;
  // Still on office WiFi means the GPS exit was a false alarm.
  if (source !== 'WIFI' && isStrongMatch(await matchOfficeWifi(office))) return null;

  await insertEvent('OUT', source, timestamp);
  emitChange();
  await notify('Checked out', `${formatTime(timestamp)} · ${SOURCE_LABEL[source]}`);
  return 'OUT';
}

async function currentPosition(): Promise<Location.LocationObject | null> {
  try {
    const recent = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 100 });
    if (recent) return recent;
    return await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      20_000,
    );
  } catch {
    return null;
  }
}

/**
 * Runs every ~15 min in the background, on app open and whenever WiFi changes
 * while the app is alive. Office WiFi works with location off; GPS needs it on.
 */
export async function reconcile(): Promise<void> {
  const office = await getOffice();
  if (!office) return;

  const now = Date.now();
  const wifi = await matchOfficeWifi(office);
  const onOfficeWifi = wifi !== null && wifi !== 'none';

  if (onOfficeWifi) {
    await setOfficeWifiSeenAt(now);
    await handleSignal({ kind: 'ENTER', source: 'WIFI', timestamp: now });
    // Confirmed by name, so this connection's public IP is the office's: remember it for location-off days.
    if (wifi === 'ssid') await learnOfficePublicIp().catch((err) => console.warn('[reconcile] learn ip', err));
  }

  const servicesOn = await Location.hasServicesEnabledAsync().catch(() => false);
  if (!servicesOn) {
    // WiFi is the only signal left, so its disappearance is the exit.
    if (wifi === 'none') await exitByLostWifi();
    await remindLocationOff(now);
    return;
  }

  await refreshGeofence(office).catch((err) => console.warn('[reconcile] geofence', err));
  if (onOfficeWifi) return;
  await checkByPosition(office, now);
}

async function checkByPosition(office: OfficeConfig, now: number): Promise<void> {
  const pos = await currentPosition();
  if (!pos) return;

  const accuracy = pos.coords.accuracy ?? office.radius;
  const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, office.latitude, office.longitude);

  // Only act when the reading is clearly inside or clearly outside.
  if (dist <= office.radius && accuracy <= office.radius) {
    await handleSignal({ kind: 'ENTER', source: 'CHECK', timestamp: now });
  } else if (dist - accuracy > office.radius + EXIT_BUFFER_M) {
    await handleSignal({ kind: 'EXIT', source: 'CHECK', timestamp: now });
  }
}

/** Location off and office WiFi gone: check out at the last time WiFi was seen. */
async function exitByLostWifi(): Promise<void> {
  const [last, seenAt] = await Promise.all([getLastEvent(), getOfficeWifiSeenAt()]);
  if (last?.type !== 'IN' || seenAt === null || toDateKey(seenAt) !== last.date) return;
  await handleSignal({ kind: 'EXIT', source: 'WIFI', timestamp: seenAt });
}

/** At most once a day, in the morning, and only if nothing was detected yet. */
async function remindLocationOff(now: number): Promise<void> {
  const hour = new Date(now).getHours();
  const [start, end] = LOCATION_REMINDER_HOURS;
  if (hour < start || hour >= end) return;

  const today = toDateKey(now);
  const [settings, remindedOn, last] = await Promise.all([getSettings(), getLocationReminderDate(), getLastEvent()]);
  if (!settings.locationReminder || remindedOn === today || last?.date === today) return;

  await setLocationReminderDate(today);
  await notify('Location is off', 'Turn on location at the office so your attendance is detected correctly.');
}
