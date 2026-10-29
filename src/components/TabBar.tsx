import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, useStyles, useTheme, type Palette } from '../theme';
import type { IconName } from './ui';

export type TabKey = 'home' | 'history' | 'settings';

const TABS: { key: TabKey; label: string; icon: IconName; activeIcon: IconName }[] = [
  { key: 'home', label: 'Today', icon: 'time-outline', activeIcon: 'time' },
  { key: 'history', label: 'History', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={s.tab}
            onPress={() => onChange(tab.key)}
            android_ripple={{ color: c.track, borderless: true, radius: 36 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <View style={[s.pill, selected && s.pillActive]}>
              <Ionicons name={selected ? tab.activeIcon : tab.icon} size={22} color={selected ? c.primary : c.muted} />
            </View>
            <Text style={[s.label, selected && s.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
    },
    tab: { flex: 1, alignItems: 'center', gap: 4 },
    pill: { paddingHorizontal: 18, paddingVertical: 4, borderRadius: radius.pill },
    pillActive: { backgroundColor: c.primarySoft },
    label: { fontSize: 12, color: c.muted, fontWeight: '500' },
    labelActive: { color: c.primary, fontWeight: '700' },
  });
