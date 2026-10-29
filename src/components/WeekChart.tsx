import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { AppSettings, DaySummary } from '../types';
import { todayKey, weekdayOf } from '../utils/date';
import { isLate, isWeekend } from '../utils/stats';

interface Props {
  days: { date: string; day: DaySummary | null }[];
  settings: AppSettings;
}

const CHART_HEIGHT = 110;

/** Hours per day for the last week, with the daily target as a dashed line. */
export function WeekChart({ days, settings }: Props) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const today = todayKey();
  const maxMinutes = Math.max(settings.targetMinutes, ...days.map((d) => (d.day?.insideMs ?? 0) / 60000)) * 1.1;
  const targetY = (settings.targetMinutes / maxMinutes) * CHART_HEIGHT;

  return (
    <View>
      <View style={[s.plot, { height: CHART_HEIGHT }]}>
        <View style={[s.target, { bottom: targetY }]} />
        <Text style={[s.targetLabel, { bottom: targetY + 2 }]}>{settings.targetMinutes / 60}h</Text>
        {days.map(({ date, day }) => {
          const minutes = (day?.insideMs ?? 0) / 60000;
          const h = Math.max(minutes > 0 ? 4 : 0, (minutes / maxMinutes) * CHART_HEIGHT);
          const color = !day
            ? c.track
            : date === today
              ? c.primary
              : isLate(day, settings)
                ? c.warning
                : minutes >= settings.targetMinutes - 15
                  ? c.success
                  : c.faint;
          return (
            <View key={date} style={s.col}>
              {minutes > 0 ? <Text style={s.value}>{(minutes / 60).toFixed(1)}</Text> : null}
              <View style={[s.bar, { height: h, backgroundColor: color }]} />
            </View>
          );
        })}
      </View>
      <View style={s.labels}>
        {days.map(({ date }) => (
          <Text
            key={date}
            style={[s.label, date === today && s.labelToday, isWeekend(date, settings) && s.labelWeekend]}
          >
            {weekdayOf(date)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    plot: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, position: 'relative' },
    target: {
      position: 'absolute',
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.faint,
    },
    targetLabel: { position: 'absolute', right: 0, fontSize: 10, fontWeight: '600', color: c.faint },
    col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '70%', borderRadius: radius.sm, minWidth: 12 },
    value: { fontSize: 10, fontWeight: '600', color: c.muted, fontVariant: ['tabular-nums'] },
    labels: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    label: { flex: 1, textAlign: 'center', fontSize: 11, color: c.muted, fontWeight: '500' },
    labelToday: { color: c.primary, fontWeight: '700' },
    labelWeekend: { color: c.faint },
  });
