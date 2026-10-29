import { useCallback, useEffect, useState } from 'react';
import { getDaySummariesBetween } from '../db/events';
import { subscribe } from '../services/bus';
import type { DaySummary } from '../types';
import { monthBounds, type MonthRef } from '../utils/date';

/** Day summaries for one month, newest first; reloads when attendance changes. */
export function useMonth(month: MonthRef) {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { year, month: m } = month;

  const load = useCallback(async () => {
    try {
      const { start, end } = monthBounds({ year, month: m });
      setDays(await getDaySummariesBetween(start, end));
    } catch (err) {
      console.warn('[useMonth]', err);
    } finally {
      setLoading(false);
    }
  }, [year, m]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribe(load);
  }, [load]);

  return { days, loading, refresh: load };
}
