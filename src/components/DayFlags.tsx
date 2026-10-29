import { StyleSheet, View } from 'react-native';
import type { AppSettings, DaySummary } from '../types';
import { formatDuration } from '../utils/date';
import { dayFlags, minutesLate, type DayFlag } from '../utils/stats';
import { Badge, type IconName, type Tone } from './ui';

const FLAG: Record<DayFlag, { label: string; tone: Tone; icon: IconName }> = {
  late: { label: 'Late', tone: 'warning', icon: 'alarm-outline' },
  short: { label: 'Short', tone: 'danger', icon: 'trending-down-outline' },
  overtime: { label: 'Overtime', tone: 'info', icon: 'trending-up-outline' },
  missed: { label: 'Check-out missed', tone: 'danger', icon: 'help-circle-outline' },
};

export function DayFlags({ day, settings, detailed }: { day: DaySummary; settings: AppSettings; detailed?: boolean }) {
  const flags = dayFlags(day, settings);
  if (flags.length === 0) return null;
  return (
    <View style={styles.row}>
      {flags.map((f) => (
        <Badge
          key={f}
          tone={FLAG[f].tone}
          icon={FLAG[f].icon}
          text={
            detailed && f === 'late' ? `Late ${formatDuration(minutesLate(day, settings) * 60000)}` : FLAG[f].label
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
