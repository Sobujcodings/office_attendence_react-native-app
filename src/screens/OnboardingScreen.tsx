import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ListRow, StatusIcon, TextField } from '../components/ui';
import { usePermissions } from '../hooks/usePermissions';
import {
  openBatteryOptimizationSettings,
  requestLocationPermissions,
  requestNotificationPermission,
} from '../services/permissions';
import { captureOfficeHere, startBackgroundServices } from '../services/setup';
import { setProfile } from '../services/store';
import { font, radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { OfficeConfig } from '../types';

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const { permissions, refreshPermissions } = usePermissions();
  const [name, setName] = useState('');
  const [office, setOffice] = useState<OfficeConfig | null>(null);
  const [batteryOpened, setBatteryOpened] = useState(false);
  const [busy, setBusy] = useState<'location' | 'office' | 'finish' | null>(null);

  const fgGranted = permissions?.foregroundLocation ?? false;
  const bgGranted = permissions?.backgroundLocation ?? false;
  const notifGranted = permissions?.notifications ?? false;
  const canFinish = name.trim().length > 0 && office !== null && bgGranted;

  const askLocation = async () => {
    setBusy('location');
    try {
      if (!(await requestLocationPermissions())) {
        Alert.alert('Permission needed', 'In Settings, set Location to "Allow all the time".');
      }
    } finally {
      await refreshPermissions();
      setBusy(null);
    }
  };

  const askNotifications = async () => {
    await requestNotificationPermission();
    await refreshPermissions();
  };

  const openBattery = async () => {
    await openBatteryOptimizationSettings();
    setBatteryOpened(true);
  };

  const setOfficeHere = async () => {
    setBusy('office');
    try {
      const { office: captured, accuracy } = await captureOfficeHere();
      setOffice(captured);
      if (accuracy !== null && accuracy > 100) {
        Alert.alert('Low GPS accuracy', `Accuracy is about ${Math.round(accuracy)}m. Try again near a window for a better fix.`);
      }
    } catch (err) {
      Alert.alert('Could not set office', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    setBusy('finish');
    try {
      await setProfile({ name: name.trim() });
      await startBackgroundServices();
      onDone();
    } catch (err) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <View style={s.logo}>
            <Ionicons name="location" size={30} color={c.primaryText} />
          </View>
          <Text style={s.title}>Office Attendance</Text>
          <Text style={s.subtitle}>
            Set up once and your arrival and departure times are saved automatically. All data stays on this phone.
          </Text>
        </View>

        <Step n={1} title="Your name" done={name.trim().length > 0}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
        </Step>

        <Step n={2} title="Permissions" done={bgGranted}>
          <ListRow
            icon="navigate-outline"
            title="Location: Allow all the time"
            subtitle="Needed to detect attendance while the app is closed"
            right={bgGranted ? <StatusIcon ok /> : <Button title="Allow" compact loading={busy === 'location'} onPress={askLocation} />}
          />
          <ListRow
            icon="notifications-outline"
            title="Notification"
            subtitle="Get notified on check-in and check-out (optional)"
            right={notifGranted ? <StatusIcon ok /> : <Button title="Allow" compact variant="secondary" onPress={askNotifications} />}
          />
          <ListRow
            icon="battery-charging-outline"
            tone="warning"
            title="Battery optimization off"
            subtitle="Find this app in the list → 'Don't optimize' / 'No restrictions'"
            right={batteryOpened ? <StatusIcon ok /> : <Button title="Open" compact variant="secondary" onPress={openBattery} />}
            last
          />
        </Step>

        <Step n={3} title="Office location" done={office !== null}>
          <Text style={s.help}>
            Tap this at the office while connected to the office WiFi. Location, WiFi and network are saved together.
          </Text>
          {office ? (
            <View style={s.officeInfo}>
              <Ionicons name="checkmark-circle" size={18} color={c.success} />
              <Text style={s.officeText}>
                {office.wifiSsid ? `WiFi: ${office.wifiSsid}` : 'No WiFi found, only GPS will be used'}
              </Text>
            </View>
          ) : null}
          <Button
            title={office ? 'Set again' : "I'm at the office now"}
            icon="business-outline"
            variant={office ? 'secondary' : 'primary'}
            disabled={!fgGranted}
            loading={busy === 'office'}
            onPress={setOfficeHere}
          />
          {!fgGranted ? <Text style={s.hint}>Allow location access first.</Text> : null}
        </Step>

        <Button title="Get started" icon="arrow-forward" onPress={finish} disabled={!canFinish} loading={busy === 'finish'} />
        {!canFinish ? <Text style={s.hint}>Name, "Allow all the time" and office location are required.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <Card>
      <View style={s.stepHeader}>
        <View style={[s.stepNum, done && s.stepNumDone]}>
          {done ? (
            <Ionicons name="checkmark" size={16} color={c.primaryText} />
          ) : (
            <Text style={s.stepNumText}>{n}</Text>
          )}
        </View>
        <Text style={s.stepTitle}>{title}</Text>
      </View>
      <View style={s.stepBody}>{children}</View>
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    hero: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { ...font.title, color: c.text },
    subtitle: { ...font.small, color: c.muted, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumDone: { backgroundColor: c.success },
    stepNumText: { fontSize: 14, fontWeight: '700', color: c.primary },
    stepTitle: { ...font.heading, color: c.text },
    stepBody: { marginTop: spacing.md, gap: spacing.sm },
    help: { ...font.small, color: c.muted, lineHeight: 19 },
    officeInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    officeText: { ...font.small, color: c.text, fontWeight: '500' },
    hint: { fontSize: 12, color: c.faint, textAlign: 'center' },
  });
