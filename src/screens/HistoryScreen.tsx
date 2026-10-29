import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DayFlags } from '../components/DayFlags';
import { DaySheet } from '../components/DaySheet';
import { Badge, Button, Card, EmptyState, IconButton, Screen, SectionHeader, Stat } from '../components/ui';
import { getFirstEventDate } from '../db/events';
import { useMonth } from '../hooks/useMonth';
import { subscribe } from '../services/bus';
import { exportMonthCsv } from '../services/export';
import { font, radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { AppSettings, DaySummary } from '../types';
import {
  addDays,
  currentMonth,
  dayOfMonth,
  formatClock,
  formatDuration,
  formatMonth,
  formatTime,
  monthBounds,
  shiftMonth,
  todayKey,
  weekdayOf,
  type MonthRef,
} from '../utils/date';
import { isWeekend, periodStats } from '../utils/stats';

type Row = { date: string; day: DaySummary | null };

export function HistoryScreen({ settings }: { settings: AppSettings }) {
  const s = useStyles(makeStyles);
  const [month, setMonth] = useState<MonthRef>(currentMonth);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { days, refresh } = useMonth(month);
  const firstDate = useFirstEventDate();

  const now = currentMonth();
  const isCurrent = month.year === now.year && month.month === now.month;
  const stats = periodStats(days, settings);

  // Every day of the month from the first record up to today, so absences show too.
  const rows = useMemo<Row[]>(() => {
    if (!firstDate) return [];
    const { start, end } = monthBounds(month);
    const today = todayKey();
    const from = start > firstDate ? start : firstDate;
    const to = end < today ? end : today;
    const byDate = new Map(days.map((d) => [d.date, d]));
    const out: Row[] = [];
    for (let d = to; d >= from; d = addDays(d, -1)) out.push({ date: d, day: byDate.get(d) ?? null });
    return out;
  }, [days, firstDate, month]);

  const workdays = rows.filter((r) => !isWeekend(r.date, settings)).length;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await exportMonthCsv(month, settings);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen title="History" onRefresh={refresh}>
      {/* Month switcher is centered so nothing sits in the top-right corner, where overlays float. */}
      <View style={s.monthBar}>
        <IconButton icon="chevron-back" label="Previous month" onPress={() => setMonth((m) => shiftMonth(m, -1))} />
        <Text style={s.monthText}>{formatMonth(month)}</Text>
        <IconButton
          icon="chevron-forward"
          label="Next month"
          disabled={isCurrent}
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
        />
      </View>

      <Card>
        <View style={s.statsRow}>
          <Stat label="Present" value={`${stats.presentDays}${workdays ? `/${workdays}` : ''}`} hint="days" />
          <Stat label="Total" value={formatDuration(stats.totalMinutes * 60000)} />
          <Stat label="Avg / day" value={formatDuration(stats.avgMinutes * 60000)} />
        </View>
        <View style={[s.statsRow, s.statsRowGap]}>
          <Stat label="Avg in" value={stats.avgCheckIn !== null ? formatClock(stats.avgCheckIn) : '—'} />
          <Stat label="Avg out" value={stats.avgCheckOut !== null ? formatClock(stats.avgCheckOut) : '—'} />
          <Stat label="Late" value={`${stats.lateDays} ${stats.lateDays === 1 ? 'day' : 'days'}`} />
        </View>
        <Button
          title="Export month as CSV"
          icon="share-outline"
          variant="secondary"
          compact
          loading={exporting}
          onPress={exportCsv}
          style={s.exportBtn}
        />
      </Card>

      <SectionHeader title="Days" />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="No records yet"
            text="Your first entry will appear here automatically when you arrive at the office."
          />
        </Card>
      ) : (
        <Card style={s.listCard}>
          {rows.map((r, i) => (
            <DayRow
              key={r.date}
              row={r}
              settings={settings}
              last={i === rows.length - 1}
              onPress={() => setOpenDate(r.date)}
            />
          ))}
        </Card>
      )}

      {openDate ? <DaySheet date={openDate} settings={settings} onClose={() => setOpenDate(null)} /> : null}
    </Screen>
  );
}

function DayRow({ row, settings, last, onPress }: { row: Row; settings: AppSettings; last: boolean; onPress: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const { date, day } = row;
  const weekend = isWeekend(date, settings);
  const today = date === todayKey();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.track }}
      style={({ pressed }) => [s.rowPress, pressed && s.pressed]}
    >
      <View style={[s.row, !last && s.rowDivider]}>
      <View style={[s.dateBox, today && s.dateBoxToday]}>
        <Text style={[s.dateNum, today && s.dateToday]}>{dayOfMonth(date)}</Text>
        <Text style={[s.dateDay, today && s.dateToday]}>{weekdayOf(date)}</Text>
      </View>

      <View style={s.flex}>
        {day?.firstIn ? (
          <>
            <Text style={s.times}>
              {formatTime(day.firstIn)}
              <Text style={s.arrow}>  →  </Text>
              {day.lastOut ? formatTime(day.lastOut) : today && day.stillInside ? 'Now' : '—'}
            </Text>
            <View style={s.flagRow}>
              <DayFlags day={day} settings={settings} />
            </View>
          </>
        ) : weekend ? (
          <Text style={s.offText}>Weekend</Text>
        ) : (
          <Badge text={today ? 'Not in yet' : 'Absent'} tone={today ? 'neutral' : 'danger'} />
        )}
      </View>

      {day?.firstIn ? <Text style={s.hours}>{formatDuration(day.insideMs)}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={c.faint} />
      </View>
    </Pressable>
  );
}

function useFirstEventDate(): string | null {
  const [date, setDate] = useState<string | null>(null);
  useEffect(() => {
    const load = () => getFirstEventDate().then(setDate).catch(() => undefined);
    load();
    return subscribe(load);
  }, []);
  return date;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, gap: 4 },
    rowPress: { marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
    monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    monthText: { ...font.heading, color: c.text, minWidth: 140, textAlign: 'center' },
    exportBtn: { marginTop: spacing.lg },
    statsRow: { flexDirection: 'row', gap: spacing.md },
    statsRowGap: { marginTop: spacing.lg },
    listCard: { paddingVertical: spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    pressed: { backgroundColor: c.cardAlt },
    dateBox: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      backgroundColor: c.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateBoxToday: { backgroundColor: c.primary },
    dateNum: { fontSize: 17, fontWeight: '700', color: c.text, lineHeight: 20 },
    dateDay: { fontSize: 11, fontWeight: '600', color: c.muted },
    dateToday: { color: c.primaryText },
    times: { fontSize: 15, fontWeight: '600', color: c.text, fontVariant: ['tabular-nums'] },
    arrow: { color: c.faint, fontWeight: '400' },
    flagRow: { minHeight: 0 },
    offText: { ...font.small, color: c.faint },
    hours: { fontSize: 14, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  });
