import type { AttendanceEvent, DaySummary, EventSource, EventType } from '../types';
import { toDateKey } from '../utils/date';
import { getDb } from './database';

interface EventRow {
  id: number;
  type: string;
  source: string;
  timestamp: number;
  date: string;
  voided: number;
}

const toEvent = (r: EventRow): AttendanceEvent => ({
  id: r.id,
  type: r.type as EventType,
  source: r.source as EventSource,
  timestamp: r.timestamp,
  date: r.date,
  voided: r.voided === 1,
});

export async function insertEvent(type: EventType, source: EventSource, timestamp: number): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO events (type, source, timestamp, date) VALUES (?, ?, ?, ?)',
    [type, source, timestamp, toDateKey(timestamp)],
  );
  return res.lastInsertRowId;
}

export async function voidEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE events SET voided = 1 WHERE id = ?', [id]);
}

export async function getLastEvent(): Promise<AttendanceEvent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>(
    'SELECT * FROM events WHERE voided = 0 ORDER BY timestamp DESC, id DESC LIMIT 1',
  );
  return row ? toEvent(row) : null;
}

export async function getEventsForDate(date: string): Promise<AttendanceEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    'SELECT * FROM events WHERE voided = 0 AND date = ? ORDER BY timestamp ASC, id ASC',
    [date],
  );
  return rows.map(toEvent);
}

/** Summaries for the most recent `days` days that have any activity, newest first. */
export async function getDaySummaries(days: number): Promise<DaySummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    `SELECT * FROM events
     WHERE voided = 0 AND date IN (
       SELECT DISTINCT date FROM events WHERE voided = 0 ORDER BY date DESC LIMIT ?
     )
     ORDER BY timestamp ASC, id ASC`,
    [days],
  );

  return summarizeRows(rows);
}

/** Summaries for days with activity in [start, end] (inclusive date keys), newest first. */
export async function getDaySummariesBetween(start: string, end: string): Promise<DaySummary[]> {
  return summarizeRows(await getRowsBetween(start, end));
}

export async function getEventsBetween(start: string, end: string): Promise<AttendanceEvent[]> {
  return (await getRowsBetween(start, end)).map(toEvent);
}

async function getRowsBetween(start: string, end: string): Promise<EventRow[]> {
  const db = await getDb();
  return db.getAllAsync<EventRow>(
    'SELECT * FROM events WHERE voided = 0 AND date BETWEEN ? AND ? ORDER BY timestamp ASC, id ASC',
    [start, end],
  );
}

function summarizeRows(rows: EventRow[]): DaySummary[] {
  const byDate = new Map<string, AttendanceEvent[]>();
  for (const row of rows) {
    const list = byDate.get(row.date) ?? [];
    list.push(toEvent(row));
    byDate.set(row.date, list);
  }

  const now = Date.now();
  return [...byDate.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => summarizeDay(date, byDate.get(date)!, now));
}

/** Moves an event to a new time; it becomes a manual entry. */
export async function updateEventTime(id: number, timestamp: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE events SET timestamp = ?, date = ?, source = 'MANUAL' WHERE id = ?", [
    timestamp,
    toDateKey(timestamp),
    id,
  ]);
}

export function summarizeDay(date: string, events: AttendanceEvent[], now = Date.now()): DaySummary {
  let firstIn: number | null = null;
  let lastOut: number | null = null;
  let openIn: number | null = null;
  let insideMs = 0;

  for (const e of events) {
    if (e.type === 'IN') {
      firstIn ??= e.timestamp;
      openIn ??= e.timestamp;
    } else {
      lastOut = e.timestamp;
      if (openIn !== null) {
        insideMs += e.timestamp - openIn;
        openIn = null;
      }
    }
  }

  const stillInside = openIn !== null;
  if (openIn !== null && date === toDateKey(now)) insideMs += now - openIn;

  return {
    date,
    firstIn,
    lastOut: stillInside ? null : lastOut,
    insideMs,
    stillInside,
    eventCount: events.length,
  };
}

/** Date key of the earliest recorded event, or null when there are none. */
export async function getFirstEventDate(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ date: string | null }>('SELECT MIN(date) AS date FROM events WHERE voided = 0');
  return row?.date ?? null;
}

export async function deleteAllEvents(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events');
}
