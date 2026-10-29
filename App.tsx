import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar, type TabKey } from './src/components/TabBar';
import { useAttendance } from './src/hooks/useAttendance';
import { useSettings } from './src/hooks/useSettings';
import { useWifiWatcher } from './src/hooks/useWifiWatcher';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { reconcile } from './src/services/attendance';
import { startBackgroundServices } from './src/services/setup';
import { getOffice, getProfile } from './src/services/store';
import { useTheme } from './src/theme';
import type { OfficeConfig, Profile } from './src/types';

type Boot = { status: 'loading' } | { status: 'onboarding' } | { status: 'ready'; profile: Profile; office: OfficeConfig };

export default function App() {
  const c = useTheme();
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => undefined);
  }, [c.bg]);

  const load = async () => {
    const [profile, office] = await Promise.all([getProfile(), getOffice()]);
    if (!profile || !office) {
      setBoot({ status: 'onboarding' });
      return;
    }
    setBoot({ status: 'ready', profile, office });
    // Re-arm background detection and catch up on anything missed while closed.
    startBackgroundServices()
      .then(reconcile)
      .catch((err) => console.warn('[boot]', err));
  };

  useEffect(() => {
    load().catch((err) => {
      console.warn('[boot]', err);
      setBoot({ status: 'onboarding' });
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      {boot.status === 'loading' ? (
        <View style={[styles.center, { backgroundColor: c.bg }]}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : boot.status === 'onboarding' ? (
        <OnboardingScreen onDone={load} />
      ) : (
        <MainTabs
          profile={boot.profile}
          office={boot.office}
          onProfileChange={(profile) => setBoot({ ...boot, profile })}
          onOfficeChange={(office) => setBoot({ ...boot, office })}
        />
      )}
    </SafeAreaProvider>
  );
}

interface MainTabsProps {
  profile: Profile;
  office: OfficeConfig;
  onProfileChange: (p: Profile) => void;
  onOfficeChange: (o: OfficeConfig) => void;
}

function MainTabs({ profile, office, onProfileChange, onOfficeChange }: MainTabsProps) {
  const c = useTheme();
  const [tab, setTab] = useState<TabKey>('home');
  const data = useAttendance();
  const { settings, updateSettings } = useSettings();
  useWifiWatcher();

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.root}>
        {tab === 'home' && (
          <HomeScreen
            profile={profile}
            office={office}
            settings={settings}
            data={data}
            onOpenSettings={() => setTab('settings')}
          />
        )}
        {tab === 'history' && <HistoryScreen settings={settings} />}
        {tab === 'settings' && (
          <SettingsScreen
            profile={profile}
            office={office}
            settings={settings}
            onSettingsChange={updateSettings}
            onProfileChange={onProfileChange}
            onOfficeChange={onOfficeChange}
          />
        )}
      </View>
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
