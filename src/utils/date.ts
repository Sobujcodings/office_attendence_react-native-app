export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayKey = () => toDateKey(Date.now());

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d.getTime());
}

/** Timestamp for a clock time on a given local date. */
export function atTime(key: string, hours: number, minutes: number): number {
  const d = parseDateKey(key);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

export function minutesOfDay(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${h % 12 || 12}:${pad(Math.round(minutes % 60))} ${h >= 12 ? 'PM' : 'AM'}`;
}

export const formatTime = (ts: number) => formatClock(minutesOfDay(ts));

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function formatHours(minutes: number): string {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export const weekdayIndex = (key: string) => parseDateKey(key).getDay();
export const weekdayOf = (key: string) => WEEKDAYS[weekdayIndex(key)];

export function formatDateKey(key: string): string {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const dayOfMonth = (key: string) => parseDateKey(key).getDate();
export const monthShort = (key: string) => MONTHS[parseDateKey(key).getMonth()];

export function formatDateLong(ts: number): string {
  const key = toDateKey(ts);
  return `${weekdayOf(key)}, ${formatDateKey(key)}`;
}

export interface MonthRef {
  year: number;
  /** 0-based. */
  month: number;
}

export function currentMonth(): MonthRef {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthBounds({ year, month }: MonthRef): { start: string; end: string } {
  return {
    start: toDateKey(new Date(year, month, 1).getTime()),
    end: toDateKey(new Date(year, month + 1, 0).getTime()),
  };
}

export const formatMonth = ({ year, month }: MonthRef) => `${MONTHS_LONG[month]} ${year}`;
