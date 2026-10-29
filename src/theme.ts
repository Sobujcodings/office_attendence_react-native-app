import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export interface Palette {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  faint: string;
  border: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  track: string;
  scrim: string;
}

const light: Palette = {
  dark: false,
  bg: '#F3F5F9',
  card: '#FFFFFF',
  cardAlt: '#F7F8FB',
  text: '#0F172A',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E3E8F0',
  primary: '#2563EB',
  primarySoft: '#E6EEFE',
  primaryText: '#FFFFFF',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#C2410C',
  dangerSoft: '#FFEDD5',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  info: '#0E7490',
  infoSoft: '#CFFAFE',
  track: '#E8ECF3',
  scrim: 'rgba(15, 23, 42, 0.45)',
};

const dark: Palette = {
  dark: true,
  bg: '#0B1120',
  card: '#131B2E',
  cardAlt: '#18223A',
  text: '#E7ECF5',
  muted: '#94A0B8',
  faint: '#64708A',
  border: '#222E47',
  primary: '#5B8DEF',
  primarySoft: '#1B2A4D',
  primaryText: '#FFFFFF',
  success: '#4ADE80',
  successSoft: '#12301F',
  danger: '#FB923C',
  dangerSoft: '#3A2312',
  warning: '#FBBF24',
  warningSoft: '#3A2D0E',
  info: '#22D3EE',
  infoSoft: '#0E2E36',
  track: '#222E47',
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const font = {
  hero: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15 },
  small: { fontSize: 13 },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Builds a theme-aware stylesheet once per palette. Define the factory outside the component. */
export function useStyles<T>(factory: (c: Palette) => T): T {
  const c = useTheme();
  return useMemo(() => factory(c), [c, factory]);
}
