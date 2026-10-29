export type EventType = 'IN' | 'OUT';

/** GPS = geofence, WIFI = office WiFi, CHECK = periodic location check, MANUAL = added/edited by the user. */
export type EventSource = 'GPS' | 'WIFI' | 'CHECK' | 'MANUAL';

export interface AttendanceEvent {
  id: number;
  type: EventType;
  source: EventSource;
  timestamp: number;
  /** Local date key, YYYY-MM-DD. */
  date: string;
  voided: boolean;
}

export interface OfficeConfig {
  latitude: number;
  longitude: number;
  radius: number;
  wifiSsid: string | null;
  /** Office network address (CIDR), used to recognise the WiFi when location is off. */
  wifiSubnet?: string | null;
  /**
   * Office internet's public IPs (single IPs or CIDR ranges). Confirms the subnet match
   * so a home router can't pass as office. Learned automatically while on office WiFi.
   */
  publicIps?: string[];
}

export interface Profile {
  name: string;
}

export interface AppSettings {
  notifications: boolean;
  /** Morning reminder when location is off and nothing was detected yet. */
  locationReminder: boolean;
  /** Office start, minutes after midnight. */
  workStartMinutes: number;
  /** Minutes after start before a check-in counts as late. */
  graceMinutes: number;
  /** Expected time in office per day. */
  targetMinutes: number;
  /** Weekend days, 0 = Sunday … 6 = Saturday. */
  weekendDays: number[];
}

export interface DaySummary {
  date: string;
  firstIn: number | null;
  lastOut: number | null;
  insideMs: number;
  /** Last event of the day is IN (still in office, or exit was missed). */
  stillInside: boolean;
  eventCount: number;
}
