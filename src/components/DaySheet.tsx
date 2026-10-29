import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getEventsForDate, summarizeDay } from '../db/events';
import { subscribe } from '../services/bus';
import { addManualEvent, changeEventTime, removeEvent } from '../services/edits';
import { font, radius, spacing, useStyles, type Palette } from '../theme';
import type { AppSettings, AttendanceEvent, EventType } from '../types';
import { atTime, formatDateKey, formatDuration, formatTime, todayKey, weekdayOf } from '../utils/date';
import { pickTime } from '../utils/pickTime';
import { DayFlags } from './DayFlags';
import { EventList } from './EventList';
import { Button, Card, IconButton, Stat } from './ui';

interface Props {
  date: string | null;
  settings: AppSettings;
  onClose: () => void;
}

/** Bottom sheet with one day's summary and timeline, where entries can be corrected. */
export function DaySheet({ date, settings, onClose }: Props) {
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<AttendanceEvent[]>([]);

  useEffect(() => {
    if (!date) return;
    const load = () => getEventsForDate(date).then(setEvents).catch((err) => console.warn('[DaySheet]', err));
    setEvents([]);
    load();
    return subscribe(load);
  }, [date]);

  if (!date) return null;
  const day = summarizeDay(date, events);
  const isToday = date === todayKey();

  const chooseTime = async (initial: Date) => {
    const picked = await pickTime(initial);
    return picked ? atTime(date, picked.getHours(), picked.getMinutes()) : null;
  };

  const editEvent = (e: AttendanceEvent) => {
    const label = e.type === 'IN' ? 'Check-in' : 'Check-out';
    Alert.alert(`${label} · ${formatTime(e.timestamp)}`, 'What would you like to do with this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeEvent(e.id),
      },
      {
        text: 'Change time',
        onPress: async () => {
          const ts = await chooseTime(new Date(e.timestamp));
          if (ts !== null) await changeEventTime(e.id, ts);
        },
      },
    ]);
  };

  const addEntry = () => {
    const add = async (type: EventType) => {
      const base = isToday ? new Date() : new Date(atTime(date, type === 'IN' ? 9 : 18, 0));
      const ts = await chooseTime(base);
      if (ts === null) return;
      if (ts > Date.now()) {
        Alert.alert('Time is in the future', 'You can only add entries for times that have already passed.');
        return;
      }
      await addManualEvent(type, ts);
    };
    Alert.alert('Add entry', 'Which entry was missed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Check-out', onPress: () => add('OUT') },
      { text: 'Check-in', onPress: () => add('IN') },
    ]);
  };

  const outValue = day.lastOut ? formatTime(day.lastOut) : day.stillInside ? (isToday ? 'In office' : 'Missed') : '—';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={s.grabber} />
        <View style={s.header}>
          <View style={s.flex}>
            <Text style={s.weekday}>{weekdayOf(date)}</Text>
            <Text style={s.title}>{formatDateKey(date)}</Text>
          </View>
          <IconButton icon="close" onPress={onClose} label="Close" />
        </View>

        <ScrollView contentContainerStyle={s.body}>
          <Card>
            <View style={s.stats}>
              <Stat label="Check-in" value={day.firstIn ? formatTime(day.firstIn) : '—'} />
              <Stat label="Check-out" value={outValue} />
              <Stat label="In office" value={formatDuration(day.insideMs)} />
            </View>
            {day.firstIn ? (
              <View style={s.flags}>
                <DayFlags day={day} settings={settings} detailed />
              </View>
            ) : null}
          </Card>

          <Card>
            <EventList events={events} emptyText="No entries on this day." onEventPress={editEvent} />
            <Text style={s.hint}>Tap an entry to change its time or delete it.</Text>
          </Card>

          <Button title="Add missed entry" icon="add-circle-outline" variant="secondary" onPress={addEntry} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: c.scrim },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '88%',
      backgroundColor: c.bg,
      borderTopLeftRadius: radius.lg + 6,
      borderTopRightRadius: radius.lg + 6,
      paddingTop: spacing.sm,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.border,
      marginBottom: spacing.sm,
    },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    weekday: { ...font.caption, color: c.primary },
    title: { ...font.title, fontSize: 22, color: c.text },
    body: { paddingHorizontal: spacing.lg, gap: spacing.md },
    stats: { flexDirection: 'row', gap: spacing.md },
    flags: { marginTop: spacing.md },
    hint: { fontSize: 12, color: c.faint, marginTop: spacing.xs },
  });
