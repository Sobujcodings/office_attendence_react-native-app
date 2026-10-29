import * as Location from 'expo-location';
import { DEFAULT_OFFICE_PUBLIC_IPS, DEFAULT_RADIUS_M, MAX_OFFICE_PUBLIC_IPS } from '../constants';
import type { OfficeConfig } from '../types';
import { withTimeout } from '../utils/async';
import { registerReconcileTask } from './background';
import { refreshGeofence } from './geofence';
import { getOffice, setOffice } from './store';
import { getPublicIp, getWifiInfo, ipInList } from './wifi';

export interface CapturedOffice {
  office: OfficeConfig;
  accuracy: number | null;
}

/** Captures the current position (and WiFi, if connected) as the office. Call while at the office. */
export async function captureOfficeHere(radius = DEFAULT_RADIUS_M): Promise<CapturedOffice> {
  const pos = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
    30_000,
  );
  if (!pos) throw new Error('Could not get your location. Make sure Location is on and try again.');

  // Not on WiFi right now: keep whatever office WiFi was saved before.
  const [wifi, previous] = await Promise.all([getWifiInfo(), getOffice()]);
  const detectedIp = wifi ? await getPublicIp() : null;
  const office: OfficeConfig = {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    radius,
    wifiSsid: wifi ? wifi.ssid : (previous?.wifiSsid ?? null),
    wifiSubnet: wifi ? wifi.subnet : (previous?.wifiSubnet ?? null),
    publicIps: withIp(previous?.publicIps ?? DEFAULT_OFFICE_PUBLIC_IPS, detectedIp),
  };
  await saveOffice(office);
  return { office, accuracy: pos.coords.accuracy ?? null };
}

export async function updateOffice(patch: Partial<OfficeConfig>): Promise<OfficeConfig | null> {
  const current = await getOffice();
  if (!current) return null;
  const next = { ...current, ...patch };
  await saveOffice(next);
  return next;
}

/** Adds an IP to the list unless it's already covered; newest kept when the list is full. */
export function withIp(list: string[], ip: string | null): string[] {
  if (!ip || ipInList(ip, list)) return list;
  return [...list, ip].slice(-MAX_OFFICE_PUBLIC_IPS);
}

/** Called when the office WiFi is confirmed by name, so its current public IP is trustworthy. */
export async function learnOfficePublicIp(): Promise<void> {
  const [office, ip] = await Promise.all([getOffice(), getPublicIp()]);
  if (!office || !ip) return;
  const list = office.publicIps ?? [];
  const next = withIp(list, ip);
  if (next !== list) await setOffice({ ...office, publicIps: next });
}

async function saveOffice(office: OfficeConfig): Promise<void> {
  await setOffice(office);
  await refreshGeofence(office);
}

/** Idempotent; safe to call on every app start. */
export async function startBackgroundServices(): Promise<void> {
  const office = await getOffice();
  if (!office) return;
  await refreshGeofence(office);
  await registerReconcileTask();
}
