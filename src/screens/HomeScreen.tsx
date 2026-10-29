import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { DayFlags } from '../components/DayFlags';
import { DaySheet } from '../components/DaySheet';
import { EventList } from '../components/EventList';
import { WeekChart } from '../components/WeekChart';
import { Button, Card, ProgressBar, Screen, SectionHeader, Stat, toneColors, type IconName, type Tone } from '../components/ui';
import type { AttendanceData } from '../hooks/useAttendance';
import { usePermissions } from '../hooks/usePermissions';
import { reconcile } from '../services/attendance';
import { openAppSettings } from '../services/permissions';
import { matchOfficeWifi, type WifiMatch } from '../services/wifi';
import { font, radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { AppSettings, OfficeConfig, Profile } from '../types';
import { formatClock, formatDateLong, formatDuration, formatHours, formatTime, todayKey } from '../utils/date';
import { lastSevenDays, periodStats } from '../utils/stats';

interface Props {
  profile: Profile;
  office: OfficeConfig;
  settings: AppSettings;
  data: AttendanceData;
  onOpenSettings: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({ profile, office, settings, data, onOpenSettings }: Props) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const { today, todayEvents, history, refresh } = data;
  const { permissions } = usePermissions();
  const [checking, setChecking] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const wifi = useOfficeWifi(office);

  const checkNow = async () => {
    setChecking(true);
    try {
      await reconcile();
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  const state: { label: string; tone: Tone; icon: IconName } = today.stillInside
    ? { label: 'In office', tone: 'success', icon: 'business' }
    : today.firstIn
      ? { label: 'Left office', tone: 'info', icon: 'home-outline' }
      : { label: 'Not checked in', tone: 'neutral', icon: 'time-outline' };
  const t = toneColors(c, state.tone);

  const insideMin = today.insideMs / 60000;
  const remaining = settings.targetMinutes - insideMin;
  const week = lastSevenDays(history);
  const weekStats = periodStats(week.flatMap((d) => (d.day ? [d.day] : [])), settings);

  const problem = !permissions
    ? null
    : !permissions.backgroundLocation
      ? 'Location is not set to "Allow all the time", so attendance can\'t be detected in the background.'
      : !permissions.locationServices
        ? 'Location is off. Only office WiFi will be used for detection.'
        : null;

  return (
    <Screen refreshing={checking} onRefresh={checkNow}>
      {/* Avatar sits on the left: the top-right corner is kept clear of floating overlays. */}
      <View style={s.header}>
        <Pressable
          onPress={onOpenSettings}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={8}
          style={({ pressed }) => [s.avatar, pressed && s.pressed]}
        >
          <Text style={s.avatarText}>{profile.name.trim().charAt(0).toUpperCase()}</Text>
          <View style={s.avatarBadge}>
            <Ionicons name="settings-sharp" size={11} color={c.muted} />
          </View>
        </Pressable>
        <View style={s.flex}>
          <Text style={s.date}>{formatDateLong(Date.now())}</Text>
          <Text style={s.greeting} numberOfLines={1}>
            {greeting()}, {profile.name.split(' ')[0]}
          </Text>
        </View>
      </View>

      <Card style={s.hero}>
        <View style={s.heroTop}>
          <View style={[s.statusChip, { backgroundColor: t.bg }]}>
            <Ionicons name={state.icon} size={14} color={t.fg} />
            <Text style={[s.statusText, { color: t.fg }]}>{state.label}</Text>
          </View>
          <Text style={s.target}>Target {formatHours(settings.targetMinutes)}</Text>
        </View>

        <Text style={s.timer}>{formatDuration(today.insideMs)}</Text>
        <Text style={s.timerLabel}>in office today</Text>

        <View style={s.progress}>
          <ProgressBar value={insideMin / settings.targetMinutes} color={remaining <= 0 ? c.success : c.primary} />
          <Text style={s.progressText}>
            {!today.firstIn
              ? `Office start ${formatClock(settings.workStartMinutes)}`
              : remaining > 0
                ? `${formatDuration(remaining * 60000)} to go`
                : `Target complete · +${formatDuration(-remaining * 60000)}`}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.stats}>
          <Stat label="Check-in" value={today.firstIn ? formatTime(today.firstIn) : '—'} />
          <Stat
            label="Check-out"
            value={today.lastOut ? formatTime(today.lastOut) : today.stillInside ? 'Running' : '—'}
          />
        </View>
        {today.firstIn ? (
          <View style={s.flags}>
            <DayFlags day={today} settings={settings} detailed />
          </View>
        ) : null}
      </Card>

      {problem ? (
        <Card style={s.warning}>
          <View style={s.warningRow}>
            <Ionicons name="warning-outline" size={20} color={c.warning} />
            <Text style={s.warningText}>{problem}</Text>
          </View>
          <Button title="Open settings" variant="ghost" compact onPress={openAppSettings} style={s.warningBtn} />
        </Card>
      ) : null}

      <SectionHeader title="Detection" />
      <Card style={s.healthCard}>
        <Health icon="navigate-outline" label="Location" ok={!!permissions?.locationServices} value={permissions?.locationServices ? 'On' : 'Off'} />
        <Health
          icon="wifi-outline"
          label="Office WiFi"
          ok={wifi !== null && wifi !== 'none'}
          value={wifi === null ? 'Not set' : wifi === 'none' ? 'Not connected' : 'Connected'}
        />
        <Health
          icon="shield-checkmark-outline"
          label="Background"
          ok={!!permissions?.backgroundLocation}
          value={permissions?.backgroundLocation ? 'Allowed' : 'Off'}
        />
      </Card>

      <SectionHeader title="Last 7 days" />
      <Card>
        <View style={s.weekStats}>
          <Stat label="Total" value={formatDuration(weekStats.totalMinutes * 60000)} />
          <Stat label="Avg check-in" value={weekStats.avgCheckIn !== null ? formatClock(weekStats.avgCheckIn) : '—'} />
          <Stat label="Late" value={`${weekStats.lateDays} ${weekStats.lateDays === 1 ? 'day' : 'days'}`} />
        </View>
        <WeekChart days={week} settings={settings} />
      </Card>

      <SectionHeader title="Today's activity" />
      <Card>
        <EventList
          events={todayEvents}
          emptyText="No entries yet today. They'll be added automatically when you arrive."
          onEventPress={() => setSheetOpen(true)}
        />
        <Button
          title="Edit today's entries"
          icon="create-outline"
          variant="secondary"
          compact
          onPress={() => setSheetOpen(true)}
          style={s.editBtn}
        />
      </Card>

      <Text style={s.footnote}>Pull down to check your location and WiFi now.</Text>

      {sheetOpen ? <DaySheet date={todayKey()} settings={settings} onClose={() => setSheetOpen(false)} /> : null}
    </Screen>
  );
}

/** Current office-WiFi status, re-checked when the app comes back to the foreground. */
function useOfficeWifi(office: OfficeConfig): WifiMatch | null {
  const [match, setMatch] = useState<WifiMatch | null>('none');
  const check = useCallback(() => {
    matchOfficeWifi(office).then(setMatch).catch(() => setMatch('none'));
  }, [office]);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, [check]);
  return match;
}

function Health({ icon, label, value, ok }: { icon: IconName; label: string; value: string; ok: boolean }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const t = toneColors(c, ok ? 'success' : 'warning');
  return (
    <View style={s.health}>
      <View style={[s.healthIcon, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <Text style={s.healthLabel}>{label}</Text>
      <Text style={[s.healthValue, { color: t.fg }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    pressed: { opacity: 0.7 },
    avatarBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    date: { ...font.small, color: c.muted },
    greeting: { ...font.title, color: c.text, marginTop: 2 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.primaryText, fontSize: 18, fontWeight: '700' },
    hero: { padding: spacing.xl },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    statusText: { fontSize: 13, fontWeight: '700' },
    target: { ...font.small, color: c.muted },
    timer: { ...font.hero, fontSize: 44, color: c.text, marginTop: spacing.lg, fontVariant: ['tabular-nums'] },
    timerLabel: { ...font.small, color: c.muted },
    progress: { marginTop: spacing.lg, gap: spacing.sm },
    progressText: { ...font.small, color: c.muted },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.lg },
    stats: { flexDirection: 'row', gap: spacing.md },
    flags: { marginTop: spacing.md },
    warning: { backgroundColor: c.warningSoft, borderColor: c.warningSoft },
    warningRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    warningText: { flex: 1, ...font.small, color: c.text, lineHeight: 19 },
    warningBtn: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingHorizontal: 0 },
    healthCard: { flexDirection: 'row', paddingVertical: spacing.md },
    health: { flex: 1, alignItems: 'center', gap: 6 },
    healthIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    healthLabel: { fontSize: 12, color: c.muted },
    healthValue: { fontSize: 13, fontWeight: '700' },
    weekStats: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    editBtn: { marginTop: spacing.md },
    footnote: { fontSize: 12, color: c.faint, textAlign: 'center', marginTop: spacing.sm },
  });
