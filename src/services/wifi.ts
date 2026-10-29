import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { PUBLIC_IP_URL } from '../constants';
import type { OfficeConfig } from '../types';

export interface WifiInfo {
  /** null when Android hides it, which it does whenever location is off. */
  ssid: string | null;
  /** Network address in CIDR form (e.g. 192.168.10.0/24). Readable even with location off. */
  subnet: string | null;
}

/**
 * 'ssid' = matched by name, 'ip' = matched by public IP (both reliable);
 * 'subnet' = matched by local network address only, used when offline with location off.
 */
export type WifiMatch = 'ssid' | 'ip' | 'subnet' | 'none';

export const isStrongMatch = (m: WifiMatch | null) => m === 'ssid' || m === 'ip';

/** Router defaults shared by many homes and cafes, so a subnet-only match on these is weak. */
export const COMMON_SUBNETS = ['192.168.0.0/24', '192.168.1.0/24', '192.168.8.0/24', '10.0.0.0/24'];

const normalizeSsid = (ssid: string) => ssid.replace(/^"|"$/g, '').trim();

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts[0] * 16777216 + parts[1] * 65536 + parts[2] * 256 + parts[3];
}

const intToIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

function networkAddress(ip: string, mask: string): string | null {
  const addr = ipToInt(ip);
  const bits = ipToInt(mask);
  if (addr === null || !bits) return null;
  const prefix = bits.toString(2).replace(/0+$/, '').length;
  return `${intToIp((addr & bits) >>> 0)}/${prefix}`;
}

/** Current WiFi details, or null when not connected to WiFi. */
export async function getWifiInfo(): Promise<WifiInfo | null> {
  try {
    const state = await NetInfo.fetch();
    if (state.type !== NetInfoStateType.wifi || !state.isConnected) return null;
    const d = state.details;
    const ssid = d?.ssid && d.ssid !== '<unknown ssid>' ? normalizeSsid(d.ssid) : null;
    const subnet = d?.ipAddress && d.subnet ? networkAddress(d.ipAddress, d.subnet) : null;
    return { ssid, subnet };
  } catch {
    return null;
  }
}

export const isValidIpv4 = (ip: string) => ipToInt(ip.trim()) !== null;

/** A single IPv4 address or a CIDR range like 103.91.128.32/28. */
export function isValidIpEntry(entry: string): boolean {
  const [ip, prefix, ...rest] = entry.trim().split('/');
  if (rest.length || !isValidIpv4(ip)) return false;
  return prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= 32);
}

function ipInEntry(ip: string, entry: string): boolean {
  const [base, prefixStr] = entry.trim().split('/');
  const a = ipToInt(ip);
  const b = ipToInt(base);
  if (a === null || b === null) return false;
  const prefix = prefixStr === undefined ? 32 : Number(prefixStr);
  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return ((a & mask) >>> 0) === ((b & mask) >>> 0);
}

export const ipInList = (ip: string, list: string[]) => list.some((entry) => ipInEntry(ip, entry));

/** The internet-facing IP of the current connection, or null when offline. */
export async function getPublicIp(timeoutMs = 8000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(PUBLIC_IP_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const { ip } = (await res.json()) as { ip?: string };
    return ip && isValidIpv4(ip) ? ip : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** null when no office WiFi is configured. */
export async function matchOfficeWifi(office: OfficeConfig): Promise<WifiMatch | null> {
  const publicIps = office.publicIps ?? [];
  if (!office.wifiSsid && !office.wifiSubnet && publicIps.length === 0) return null;
  const info = await getWifiInfo();
  if (!info) return 'none';
  if (info.ssid && office.wifiSsid && info.ssid === normalizeSsid(office.wifiSsid)) return 'ssid';

  // Name hidden (location off) or a different band of the office WiFi: check the addresses.
  if (office.wifiSubnet && info.subnet !== office.wifiSubnet) return 'none';
  if (publicIps.length > 0) {
    const ip = await getPublicIp();
    if (ip) return ipInList(ip, publicIps) ? 'ip' : 'none';
  }
  // No public IP to confirm with: the subnet alone counts only when the name is hidden.
  return !info.ssid && office.wifiSubnet ? 'subnet' : 'none';
}
