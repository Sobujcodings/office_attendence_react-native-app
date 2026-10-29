import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, radius, spacing, useStyles, useTheme, type Palette } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export function toneColors(c: Palette, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'primary':
      return { fg: c.primary, bg: c.primarySoft };
    case 'success':
      return { fg: c.success, bg: c.successSoft };
    case 'danger':
      return { fg: c.danger, bg: c.dangerSoft };
    case 'warning':
      return { fg: c.warning, bg: c.warningSoft };
    case 'info':
      return { fg: c.info, bg: c.infoSoft };
    default:
      return { fg: c.muted, bg: c.cardAlt };
  }
}

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useTheme();
  return <Ionicons name={name} size={size} color={color ?? c.text} />;
}

interface ScreenProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}

/** Page shell: safe area, large title header and a scrolling body. */
export function Screen({ title, subtitle, right, children, refreshing, onRefresh, scroll = true }: ScreenProps) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const header = title ? (
    <View style={s.header}>
      <View style={s.flex}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />
            ) : undefined
          }
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, s.flex]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles(makeStyles);
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title.toUpperCase()}</Text>
      {action}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, compact, style }: ButtonProps) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const fg = { primary: c.primaryText, secondary: c.primary, danger: c.danger, ghost: c.primary }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      android_ripple={{ color: variant === 'primary' ? 'rgba(255,255,255,0.2)' : c.track }}
      style={({ pressed }) => [
        s.button,
        compact && s.buttonCompact,
        s[`button_${variant}`],
        inactive && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={fg} /> : null}
          <Text style={[s.buttonText, compact && s.buttonTextCompact, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
}

export function IconButton({ icon, onPress, label, disabled, loading }: IconButtonProps) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      android_ripple={{ color: c.track, borderless: true }}
      style={({ pressed }) => [s.iconButton, disabled && s.disabled, pressed && s.pressed]}
    >
      {loading ? <ActivityIndicator size="small" color={c.primary} /> : <Ionicons name={icon} size={20} color={c.text} />}
    </Pressable>
  );
}

/** Text input with a focus ring. */
export function TextField({ style, onFocus, onBlur, ...props }: TextInputProps) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.faint}
      selectionColor={c.primary}
      cursorColor={c.primary}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[s.input, focused && s.inputFocused, style]}
    />
  );
}

export function Badge({ text, tone, icon }: { text: string; tone: Tone; icon?: IconName }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const t = toneColors(c, tone);
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={[s.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const s = useStyles(makeStyles);
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={s.statHint}>{hint}</Text> : null}
    </View>
  );
}

interface ListRowProps {
  icon?: IconName;
  tone?: Tone;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}

/** Settings-style row: tinted icon, title/subtitle, and a trailing element or chevron. */
export function ListRow({ icon, tone = 'primary', title, subtitle, right, onPress, last }: ListRowProps) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const t = toneColors(c, tone);
  const body = (
    <View style={[s.row, !last && s.rowDivider]}>
      {icon ? (
        <View style={[s.rowIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={18} color={t.fg} />
        </View>
      ) : null}
      <View style={s.flex}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.faint} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: c.track }}
      style={({ pressed }) => [s.rowPress, pressed && s.pressedRow]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={s.rowPress}>{body}</View>
  );
}

export function StatusIcon({ ok }: { ok: boolean }) {
  const c = useTheme();
  return <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={22} color={ok ? c.success : c.warning} />;
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.track, true: c.primary }}
      thumbColor={c.primaryText}
    />
  );
}

interface ChipsProps<T> {
  options: { value: T; label: string }[];
  isActive: (value: T) => boolean;
  onPress: (value: T) => void;
}

export function Chips<T extends string | number>({ options, isActive, onPress }: ChipsProps<T>) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const active = isActive(o.value);
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onPress(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [s.chip, active && s.chipActive, pressed && s.pressed]}
          >
            {active ? <Ionicons name="checkmark" size={14} color={c.primaryText} /> : null}
            <Text style={[s.chipText, active && s.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct}%`, backgroundColor: color ?? c.primary }]} />
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  const s = useStyles(makeStyles);
  const c = useTheme();
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={26} color={c.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
    title: { ...font.title, color: c.text },
    subtitle: { ...font.small, color: c.muted, marginTop: 2 },
    card: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      // A soft lift in light mode; dark mode relies on the surface contrast instead.
      ...(c.dark
        ? null
        : {
            elevation: 1,
            shadowColor: '#0F172A',
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
          }),
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    sectionTitle: { ...font.caption, color: c.muted },
    button: {
      minHeight: 50,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      overflow: 'hidden',
    },
    buttonCompact: { minHeight: 36, paddingHorizontal: 14, borderRadius: radius.md, gap: 6 },
    button_primary: { backgroundColor: c.primary },
    button_secondary: { backgroundColor: c.primarySoft },
    button_danger: { backgroundColor: c.dangerSoft },
    button_ghost: { backgroundColor: 'transparent' },
    buttonText: { fontSize: 15, fontWeight: '600' },
    buttonTextCompact: { fontSize: 14 },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.75 },
    pressedRow: { backgroundColor: c.cardAlt },
    // Bleeds into the card padding so the press highlight is a rounded tile, not a hard band.
    rowPress: {
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      overflow: 'hidden',
    },
    input: {
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.cardAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 11,
      fontSize: 16,
      color: c.text,
    },
    inputFocused: { borderColor: c.primary, backgroundColor: c.card },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    badgeText: { fontSize: 12, fontWeight: '600' },
    stat: { flex: 1, minWidth: 0 },
    statLabel: { ...font.small, color: c.muted, marginBottom: 2 },
    statValue: { fontSize: 18, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
    statHint: { fontSize: 12, color: c.faint, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
    rowIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { ...font.body, fontWeight: '500', color: c.text },
    rowSubtitle: { ...font.small, color: c.muted, marginTop: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 34,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: c.cardAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary, paddingLeft: 10 },
    chipText: { fontSize: 13, fontWeight: '500', color: c.text },
    chipTextActive: { color: c.primaryText, fontWeight: '700' },
    track: { height: 8, borderRadius: radius.pill, backgroundColor: c.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill },
    empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { ...font.heading, color: c.text },
    emptyText: { ...font.small, color: c.muted, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  });
