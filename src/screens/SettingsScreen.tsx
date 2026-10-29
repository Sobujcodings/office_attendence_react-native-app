import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chips,
  ListRow,
  Screen,
  SectionHeader,
  StatusIcon,
  TextField,
  Toggle,
} from '../components/ui';
import { APP_VERSION, GRACE_OPTIONS_MIN, RADIUS_OPTIONS_M, TARGET_OPTIONS_MIN } from '../constants';
import { deleteAllEvents } from '../db/events';
import { usePermissions } from '../hooks/usePermissions';
import { emitChange } from '../services/bus';
import {
  openAppSettings,
  openBatteryOptimizationSettings,
  requestLocationPermissions,
  requestNotificationPermission,
} from '../services/permissions';
import { captureOfficeHere, startBackgroundServices, updateOffice, withIp } from '../services/setup';
import { setProfile } from '../services/store';
import { COMMON_SUBNETS, getPublicIp, getWifiInfo, isValidIpEntry } from '../services/wifi';
import { font, spacing, useStyles, type Palette } from '../theme';
import type { AppSettings, OfficeConfig, Profile } from '../types';
import { formatClock, formatHours, WEEKDAYS } from '../utils/date';
import { pickTime } from '../utils/pickTime';

interface Props {
  profile: Profile;
  office: OfficeConfig;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => Promise<void>;
  onProfileChange: (p: Profile) => void;
  onOfficeChange: (o: OfficeConfig) => void;
}

export function SettingsScreen({ profile, office, settings, onSettingsChange, onProfileChange, onOfficeChange }: Props) {
  const s = useStyles(makeStyles);
  const { permissions, refreshPermissions } = usePermissions();
  const [name, setName] = useState(profile.name);
  const savedIps = (office.publicIps ?? []).join(', ');
  const [publicIps, setPublicIps] = useState(savedIps);
  const [busy, setBusy] = useState<'office' | 'wifi' | 'ip' | null>(null);

  useEffect(() => setPublicIps(savedIps), [savedIps]);

  const run = async (key: NonNullable<typeof busy>, job: () => Promise<void>) => {
    setBusy(key);
    try {
      await job();
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const applyOffice = async (patch: Partial<OfficeConfig>) => {
    const next = await updateOffice(patch);
    if (next) onOfficeChange(next);
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile.name) return setName(profile.name);
    await setProfile({ name: trimmed });
    onProfileChange({ name: trimmed });
  };

  const pickStart = async () => {
    const initial = new Date();
    initial.setHours(Math.floor(settings.workStartMinutes / 60), settings.workStartMinutes % 60, 0, 0);
    const picked = await pickTime(initial);
    if (picked) await onSettingsChange({ workStartMinutes: picked.getHours() * 60 + picked.getMinutes() });
  };

  const toggleWeekend = (day: number) => {
    const set = new Set(settings.weekendDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onSettingsChange({ weekendDays: [...set].sort() });
  };

  const recaptureOffice = () => {
    Alert.alert('Office location update', 'Are you at the office right now? Your current location will be saved as the office.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, update',
        onPress: () =>
          run('office', async () => {
            const { office: next } = await captureOfficeHere(office.radius);
            onOfficeChange(next);
          }),
      },
    ]);
  };

  const captureWifi = () =>
    run('wifi', async () => {
      const wifi = await getWifiInfo();
      if (!wifi?.ssid) throw new Error('Connect to the office WiFi with Location on, then try again.');
      const ip = await getPublicIp();
      await applyOffice({
        wifiSsid: wifi.ssid,
        wifiSubnet: wifi.subnet,
        publicIps: withIp(office.publicIps ?? [], ip),
      });
    });

  const savePublicIps = async () => {
    const entries = publicIps.split(/[,\s]+/).filter(Boolean);
    if (entries.join(', ') === savedIps) return;
    const invalid = entries.filter((e) => !isValidIpEntry(e));
    if (invalid.length) {
      Alert.alert('Invalid IP', `${invalid.join(', ')}\n\nUse a format like 103.91.128.38 or 103.91.128.32/28`);
      setPublicIps(savedIps);
      return;
    }
    await applyOffice({ publicIps: entries });
  };

  const addCurrentIp = () =>
    run('ip', async () => {
      const ip = await getPublicIp();
      if (!ip) throw new Error('Check your internet connection and try again.');
      await applyOffice({ publicIps: withIp(office.publicIps ?? [], ip) });
    });

  const toggleNotifications = async (value: boolean) => {
    if (value && !permissions?.notifications) await requestNotificationPermission();
    await onSettingsChange({ notifications: value });
    refreshPermissions();
  };

  const fixLocation = async () => {
    await requestLocationPermissions();
    await refreshPermissions();
    await startBackgroundServices().catch(() => undefined);
  };

  const confirmDelete = () => {
    Alert.alert('Delete all records?', 'All check-in and check-out history will be erased. This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAllEvents();
          emitChange();
        },
      },
    ]);
  };

  const bgOk = permissions?.backgroundLocation ?? false;
  const servicesOk = permissions?.locationServices ?? false;

  return (
    <Screen title="Settings">
      <SectionHeader title="Profile" />
      <Card>
        <Text style={s.fieldLabel}>Name</Text>
        <TextField
          value={name}
          onChangeText={setName}
          onEndEditing={saveName}
          placeholder="Your name"
        />
      </Card>

      <SectionHeader title="Work schedule" />
      <Card style={s.listCard}>
        <ListRow
          icon="alarm-outline"
          title="Office start"
          subtitle="Check-ins after this plus grace time are late"
          right={<Text style={s.value}>{formatClock(settings.workStartMinutes)}</Text>}
          onPress={pickStart}
        />
        <View style={s.block}>
          <Text style={s.fieldLabel}>Grace time</Text>
          <Chips
            options={GRACE_OPTIONS_MIN.map((m) => ({ value: m, label: m ? `${m} min` : 'None' }))}
            isActive={(m) => settings.graceMinutes === m}
            onPress={(m) => onSettingsChange({ graceMinutes: m })}
          />
        </View>
        <View style={s.block}>
          <Text style={s.fieldLabel}>Daily target</Text>
          <Chips
            options={TARGET_OPTIONS_MIN.map((m) => ({ value: m, label: formatHours(m) }))}
            isActive={(m) => settings.targetMinutes === m}
            onPress={(m) => onSettingsChange({ targetMinutes: m })}
          />
        </View>
        <View style={[s.block, s.blockLast]}>
          <Text style={s.fieldLabel}>Weekend</Text>
          <Chips
            options={WEEKDAYS.map((d, i) => ({ value: i, label: d }))}
            isActive={(d) => settings.weekendDays.includes(d)}
            onPress={toggleWeekend}
          />
        </View>
      </Card>

      <SectionHeader title="Office" />
      <Card style={s.listCard}>
        <ListRow
          icon="location-outline"
          title="Office location"
          subtitle={`${office.latitude.toFixed(5)}, ${office.longitude.toFixed(5)}`}
          right={
            <Button title="Update" compact variant="secondary" loading={busy === 'office'} onPress={recaptureOffice} />
          }
        />
        <View style={s.block}>
          <Text style={s.fieldLabel}>Radius</Text>
          <Chips
            options={RADIUS_OPTIONS_M.map((r) => ({ value: r, label: `${r}m` }))}
            isActive={(r) => office.radius === r}
            onPress={(r) => applyOffice({ radius: r })}
          />
        </View>
        <ListRow
          icon="wifi-outline"
          title={office.wifiSsid ?? 'Office WiFi not set'}
          subtitle={
            office.wifiSubnet
              ? `Network ${office.wifiSubnet}${
                  COMMON_SUBNETS.includes(office.wifiSubnet) && !office.publicIps?.length
                    ? ' · common range, may cause false matches'
                    : ''
                }`
              : 'Set this while connected to the office WiFi'
          }
          right={
            <Button title="Use current" compact variant="secondary" loading={busy === 'wifi'} onPress={captureWifi} />
          }
        />
        {office.wifiSsid ? (
          <Button
            title="Remove WiFi"
            variant="ghost"
            compact
            onPress={() => applyOffice({ wifiSsid: null, wifiSubnet: null })}
            style={s.inlineBtn}
          />
        ) : null}
        <View style={[s.block, s.blockLast]}>
          <Text style={s.fieldLabel}>Office public IP</Text>
          <View style={s.ipRow}>
            <TextField
              value={publicIps}
              onChangeText={setPublicIps}
              onEndEditing={savePublicIps}
              keyboardType="numbers-and-punctuation"
              placeholder="103.91.128.38, 103.91.128.39"
              multiline
              style={s.flex}
            />
            <Button title="Add current" compact variant="secondary" loading={busy === 'ip'} onPress={addCurrentIp} />
          </View>
          <Text style={s.help}>
            Used to confirm the office WiFi when location is off. New IPs are added automatically while you're on the office WiFi with location on.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Detection" />
      <Card style={s.listCard}>
        <ListRow
          icon="navigate-outline"
          tone={bgOk ? 'success' : 'warning'}
          title="Location: Allow all the time"
          subtitle={bgOk ? 'Detecting in the background' : 'Without this, nothing is detected while the app is closed'}
          right={bgOk ? <StatusIcon ok /> : <Button title="Fix" compact onPress={fixLocation} />}
        />
        <ListRow
          icon="locate-outline"
          tone={servicesOk ? 'success' : 'warning'}
          title="Phone location"
          subtitle={servicesOk ? 'On' : 'Off · only WiFi will be used'}
          right={servicesOk ? <StatusIcon ok /> : <Button title="Open" compact onPress={openAppSettings} />}
        />
        <ListRow
          icon="battery-charging-outline"
          tone="warning"
          title="Battery optimization off"
          subtitle="Important on Xiaomi, Oppo, Vivo and Samsung"
          onPress={openBatteryOptimizationSettings}
        />
        <ListRow
          icon="notifications-outline"
          title="Check-in/out notification"
          right={<Toggle value={settings.notifications} onChange={toggleNotifications} />}
        />
        <ListRow
          icon="alert-circle-outline"
          title="Location off reminder"
          subtitle="One reminder between 8 and 11 AM if location is off"
          right={<Toggle value={settings.locationReminder} onChange={(v) => onSettingsChange({ locationReminder: v })} />}
          last
        />
      </Card>

      <SectionHeader title="Data" />
      <Card style={s.listCard}>
        <ListRow
          icon="phone-portrait-outline"
          tone="info"
          title="All data stays on this phone"
          subtitle="Nothing is sent to the cloud. Export a CSV from History."
        />
        <ListRow icon="trash-outline" tone="danger" title="Delete all records" onPress={confirmDelete} last />
      </Card>

      <Text style={s.version}>Office Attendance · v{APP_VERSION}</Text>
    </Screen>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    listCard: { paddingVertical: spacing.xs },
    block: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    blockLast: { borderBottomWidth: 0 },
    fieldLabel: { ...font.small, fontWeight: '600', color: c.muted, marginBottom: spacing.sm },
    value: { fontSize: 15, fontWeight: '700', color: c.primary },
    ipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    help: { fontSize: 12, color: c.faint, marginTop: spacing.sm, lineHeight: 17 },
    inlineBtn: { alignSelf: 'flex-start', paddingHorizontal: 0 },
    version: { textAlign: 'center', fontSize: 12, color: c.faint, marginTop: spacing.lg },
  });
