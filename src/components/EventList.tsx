import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SOURCE_LABEL } from '../constants';
import { font, radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { AttendanceEvent } from '../types';
import { formatTime } from '../utils/date';
import type { IconName } from './ui';

const SOURCE_ICON: Record<AttendanceEvent['source'], IconName> = {
  GPS: 'location-outline',
  WIFI: 'wifi-outline',
  CHECK: 'pulse-outline',
  MANUAL: 'create-outline',
};

interface Props {
  events: AttendanceEvent[];
  emptyText: string;
  onEventPress?: (event: AttendanceEvent) => void;
}

/** Vertical timeline of check-ins and check-outs. */
export function EventList({ events, emptyText, onEventPress }: Props) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  if (events.length === 0) return <Text style={s.empty}>{emptyText}</Text>;

  return (
    <View>
      {events.map((e, i) => {
        const isIn = e.type === 'IN';
        const tint = isIn ? c.success : c.danger;
        const row = (
          <View style={s.row}>
            <View style={s.rail}>
              <View style={[s.node, { backgroundColor: isIn ? c.successSoft : c.dangerSoft }]}>
                <Ionicons name={isIn ? 'log-in-outline' : 'log-out-outline'} size={16} color={tint} />
              </View>
              {i < events.length - 1 ? <View style={s.line} /> : null}
            </View>
            <View style={s.body}>
              <View style={s.flex}>
                <Text style={s.type}>{isIn ? 'Check-in' : 'Check-out'}</Text>
                <View style={s.sourceRow}>
                  <Ionicons name={SOURCE_ICON[e.source]} size={12} color={c.muted} />
                  <Text style={s.source}>{SOURCE_LABEL[e.source]}</Text>
                </View>
              </View>
              <Text style={s.time}>{formatTime(e.timestamp)}</Text>
              {onEventPress ? <Ionicons name="ellipsis-vertical" size={16} color={c.faint} /> : null}
            </View>
          </View>
        );
        return onEventPress ? (
          <Pressable key={e.id} onPress={() => onEventPress(e)} style={({ pressed }) => pressed && s.pressed}>
            {row}
          </Pressable>
        ) : (
          <View key={e.id}>{row}</View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    row: { flexDirection: 'row', gap: spacing.md },
    rail: { alignItems: 'center', width: 32 },
    node: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    line: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 2 },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.lg,
      minHeight: 48,
    },
    type: { ...font.body, fontWeight: '600', color: c.text },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    source: { fontSize: 12, color: c.muted },
    time: { fontSize: 16, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
    empty: { ...font.small, color: c.muted, lineHeight: 19 },
    pressed: { opacity: 0.6 },
  });
