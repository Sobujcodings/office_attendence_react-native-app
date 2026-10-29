import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SOURCE_LABEL } from '../constants';
import { getDaySummariesBetween, getEventsBetween } from '../db/events';
import type { AppSettings } from '../types';
import { formatDateKey, formatDuration, formatTime, monthBounds, type MonthRef, weekdayOf } from '../utils/date';
import { dayFlags } from '../utils/stats';

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csvRow = (cells: string[]) => cells.map(csvCell).join(',');

/** Writes the month's attendance to a CSV (summary rows, then every event) and opens the share sheet. */
export async function exportMonthCsv(month: MonthRef, settings: AppSettings): Promise<void> {
  const { start, end } = monthBounds(month);
  const [days, events] = await Promise.all([getDaySummariesBetween(start, end), getEventsBetween(start, end)]);
  if (days.length === 0) throw new Error('There are no records for this month.');

  const lines = [
    csvRow(['Date', 'Day', 'Check-in', 'Check-out', 'Time in office', 'Minutes', 'Flags']),
    ...[...days].reverse().map((d) =>
      csvRow([
        d.date,
        weekdayOf(d.date),
        d.firstIn ? formatTime(d.firstIn) : '',
        d.lastOut ? formatTime(d.lastOut) : '',
        formatDuration(d.insideMs),
        String(Math.round(d.insideMs / 60000)),
        dayFlags(d, settings).join(' '),
      ]),
    ),
    '',
    csvRow(['Date', 'Time', 'Event', 'Detected by']),
    ...events.map((e) =>
      csvRow([formatDateKey(e.date), formatTime(e.timestamp), e.type === 'IN' ? 'Check-in' : 'Check-out', SOURCE_LABEL[e.source]]),
    ),
  ];

  const file = new File(Paths.cache, `attendance-${start.slice(0, 7)}.csv`);
  if (file.exists) file.delete();
  file.create();
  await file.write(lines.join('\n'));

  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Attendance export' });
}
