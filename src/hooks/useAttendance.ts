import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { HISTORY_DAYS } from '../constants';
import { getDaySummaries, getEventsForDate, summarizeDay } from '../db/events';
import { subscribe } from '../services/bus';
import type { AttendanceEvent, DaySummary } from '../types';
import { todayKey } from '../utils/date';

export interface AttendanceData {
  loading: boolean;
  today: DaySummary;
  todayEvents: AttendanceEvent[];
  history: DaySummary[];
  refresh: () => Promise<void>;
}

const REFRESH_MS = 30_000;

export function useAttendance(): AttendanceData {
  const [loading, setLoading] = useState(true);
  const [todayEvents, setTodayEvents] = useState<AttendanceEvent[]>([]);
  const [history, setHistory] = useState<DaySummary[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [events, summaries] = await Promise.all([getEventsForDate(todayKey()), getDaySummaries(HISTORY_DAYS)]);
      setTodayEvents(events);
      setHistory(summaries);
    } catch (err) {
      console.warn('[useAttendance]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribe(refresh);
    const appState = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    // Keeps "time in office" ticking and picks up writes from background tasks.
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      unsubscribe();
      appState.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  return { loading, today: summarizeDay(todayKey(), todayEvents), todayEvents, history, refresh };
}
