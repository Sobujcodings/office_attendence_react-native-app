import { getValue, setValue } from '../db/kv';
import type { AppSettings, OfficeConfig, Profile } from '../types';
import { emitChange } from './bus';

const KEYS = {
  profile: 'profile',
  office: 'office',
  settings: 'settings',
  officeWifiSeenAt: 'officeWifiSeenAt',
  locationReminderDate: 'locationReminderDate',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  locationReminder: true,
  workStartMinutes: 9 * 60,
  graceMinutes: 10,
  targetMinutes: 9 * 60,
  weekendDays: [5],
};

export const getProfile = () => getValue<Profile>(KEYS.profile);
export const setProfile = (profile: Profile) => setValue(KEYS.profile, profile);

export const getOffice = () => getValue<OfficeConfig>(KEYS.office);
export const setOffice = (office: OfficeConfig) => setValue(KEYS.office, office);

export async function getSettings(): Promise<AppSettings> {
  return { ...DEFAULT_SETTINGS, ...(await getValue<AppSettings>(KEYS.settings)) };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch };
  await setValue(KEYS.settings, next);
  emitChange();
  return next;
}

/** Last time the phone was confirmed on office WiFi; the leave time when location is off. */
export const getOfficeWifiSeenAt = () => getValue<number>(KEYS.officeWifiSeenAt);
export const setOfficeWifiSeenAt = (ts: number) => setValue(KEYS.officeWifiSeenAt, ts);

export const getLocationReminderDate = () => getValue<string>(KEYS.locationReminderDate);
export const setLocationReminderDate = (date: string) => setValue(KEYS.locationReminderDate, date);
