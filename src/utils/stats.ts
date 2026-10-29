import type { AppSettings, DaySummary } from '../types';
import { addDays, minutesOfDay, todayKey, weekdayIndex } from './date';

export type DayFlag = 'late' | 'short' | 'overtime' | 'missed';

/** Check-in after start + grace. */
export function isLate(day: DaySummary, s: AppSettings): boolean {
  return day.firstIn !== null && minutesOfDay(day.firstIn) > s.workStartMinutes + s.graceMinutes;
}

export function minutesLate(day: DaySummary, s: AppSettings): number {
  return day.firstIn === null ? 0 : Math.max(0, minutesOfDay(day.firstIn) - s.workStartMinutes);
}

/** Badges for a day. Short/overtime only once the day is over, since today is still running. */
export function dayFlags(day: DaySummary, s: AppSettings): DayFlag[] {
  const flags: DayFlag[] = [];
  if (isLate(day, s)) flags.push('late');
  const finished = day.date !== todayKey();
  if (finished && day.stillInside) flags.push('missed');
  else if (finished && day.firstIn !== null) {
    const minutes = day.insideMs / 60000;
    if (minutes < s.targetMinutes - 15) flags.push('short');
    else if (minutes > s.targetMinutes + 30) flags.push('overtime');
  }
  return flags;
}

export const isWeekend = (date: string, s: AppSettings) => s.weekendDays.includes(weekdayIndex(date));

export interface PeriodStats {
  presentDays: number;
  totalMinutes: number;
  avgMinutes: number;
  /** Average check-in as minutes after midnight, or null when there is none. */
  avgCheckIn: number | null;
  avgCheckOut: number | null;
  lateDays: number;
}

export function periodStats(days: DaySummary[], s: AppSettings): PeriodStats {
  const present = days.filter((d) => d.firstIn !== null);
  const outs = present.filter((d) => d.lastOut !== null);
  const totalMinutes = present.reduce((sum, d) => sum + d.insideMs / 60000, 0);
  const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  return {
    presentDays: present.length,
    totalMinutes,
    avgMinutes: present.length ? totalMinutes / present.length : 0,
    avgCheckIn: avg(present.map((d) => minutesOfDay(d.firstIn!))),
    avgCheckOut: avg(outs.map((d) => minutesOfDay(d.lastOut!))),
    lateDays: present.filter((d) => isLate(d, s)).length,
  };
}

/** The last 7 days ending today, oldest first, with empty days filled in. */
export function lastSevenDays(history: DaySummary[]): { date: string; day: DaySummary | null }[] {
  const byDate = new Map(history.map((d) => [d.date, d]));
  const today = todayKey();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, day: byDate.get(date) ?? null };
  });
}
