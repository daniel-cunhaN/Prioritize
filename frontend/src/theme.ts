/**
 * theme.ts — Claude Amber Theme for Prioritize App
 *
 * Maps all CSS variables from the Claude Amber shadcn theme (21st.dev)
 * to React Native-compatible values. Provides light/dark palettes,
 * spacing tokens, border radii, shadow presets, and typography config.
 *
 * Usage:
 *   import { useTheme, spacing, radius } from '../theme';
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.background }} />
 */

import { useColorScheme } from 'react-native';

/* ─────────────────────────────────────────────
 * Color Palettes
 * ───────────────────────────────────────────── */

/** Light palette — Claude Amber (from shadcn / 21st.dev) */
export const lightColors = {
  background: '#faf9f5',
  foreground: '#3d3929',

  card: '#f5f4ef',
  cardForeground: '#141413',

  popover: '#ffffff',
  popoverForeground: '#28261b',

  primary: '#c96442',
  primaryForeground: '#ffffff',

  secondary: '#e9e6dc',
  secondaryForeground: '#535146',

  muted: '#ede9de',
  mutedForeground: '#5e5d58', // adjusted from #6e6d68 for WCAG AA (5.0:1)

  accent: '#e9e6dc',
  accentForeground: '#28261b',

  destructive: '#c0392b',
  destructiveForeground: '#ffffff',

  border: '#dad9d4',
  input: '#b4b2a7',
  ring: '#c96442',

  // Chart accent colors (for future data viz)
  chart1: '#b05730',
  chart2: '#9c87f5',
  chart3: '#ded8c4',
  chart4: '#dbd3f0',
  chart5: '#b4552d',

  // Sidebar / navigation
  sidebar: '#f5f4ee',
  sidebarForeground: '#3d3d3a',
  sidebarPrimary: '#c96442',
  sidebarPrimaryForeground: '#fbfbfb',
  sidebarAccent: '#e9e6dc',
  sidebarAccentForeground: '#343434',
  sidebarBorder: '#ebebeb',
  sidebarRing: '#b5b5b5',
} as const;

/** Dark palette — derived from Claude Amber with inverted luminance */
export const darkColors = {
  background: '#1a1914',
  foreground: '#e8e4d9',

  card: '#242318',
  cardForeground: '#ede9de',

  popover: '#1e1d17',
  popoverForeground: '#e8e4d9',

  primary: '#d4784e',
  primaryForeground: '#ffffff',

  secondary: '#2e2c24',
  secondaryForeground: '#c8c4b8',

  muted: '#2a2820',
  mutedForeground: '#a8a49a',

  accent: '#332f26',
  accentForeground: '#e8e4d9',

  destructive: '#e74c3c',
  destructiveForeground: '#ffffff',

  border: '#3a3830',
  input: '#4a4840',
  ring: '#d4784e',

  chart1: '#d4784e',
  chart2: '#b49df7',
  chart3: '#4a4538',
  chart4: '#3d3652',
  chart5: '#c9623a',

  sidebar: '#1e1d17',
  sidebarForeground: '#c8c4b8',
  sidebarPrimary: '#d4784e',
  sidebarPrimaryForeground: '#ffffff',
  sidebarAccent: '#2e2c24',
  sidebarAccentForeground: '#c8c4b8',
  sidebarBorder: '#3a3830',
  sidebarRing: '#5a5850',
} as const;

/* ─────────────────────────────────────────────
 * Type Definitions
 * ───────────────────────────────────────────── */

export type ThemeColors = { readonly [K in keyof typeof lightColors]: string };

/* ─────────────────────────────────────────────
 * Spacing Tokens
 * Base unit: 4px (equivalent to --spacing: 0.25rem)
 * ───────────────────────────────────────────── */
export const spacing = {
  /** 2px */
  xxs: 2,
  /** 4px — base unit */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  '2xl': 24,
  /** 32px */
  '3xl': 32,
  /** 40px */
  '4xl': 40,
  /** 48px */
  '5xl': 48,
} as const;

/* ─────────────────────────────────────────────
 * Border Radii
 * Base: --radius: 1rem (16px)
 * ───────────────────────────────────────────── */
export const radius = {
  /** 4px — pills, tags */
  xs: 4,
  /** 8px — small cards, chips */
  sm: 8,
  /** 12px — inputs, small buttons */
  md: 12,
  /** 16px — cards, buttons (--radius) */
  lg: 16,
  /** 24px — large cards, modals */
  xl: 24,
  /** Fully round */
  full: 9999,
} as const;

/* ─────────────────────────────────────────────
 * Shadow Presets
 * Based on --shadow-* variables:
 *   offset-x: 0, offset-y: 1px, blur: 3px,
 *   spread: 0, color: black, opacity: 0.1
 * ───────────────────────────────────────────── */
export const shadows = {
  /** Subtle elevation for inputs, small cards */
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  /** Default card elevation */
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  /** Prominent elevation for modals, FABs */
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

/* ─────────────────────────────────────────────
 * Typography
 * Fonts: Outfit (sans), Geist Mono (mono), ui-serif
 * Falls back to system fonts if custom fonts not loaded
 * ───────────────────────────────────────────── */
export const typography = {
  /** Font families — use system fallbacks by default */
  fonts: {
    sans: 'System',       // Will be 'Outfit' if expo-font loaded
    mono: 'monospace',    // Will be 'GeistMono' if expo-font loaded
    serif: 'System',      // System serif
  },

  /** Font sizes following a modular scale */
  sizes: {
    /** 11px — fine print, captions */
    xs: 11,
    /** 13px — secondary text, labels */
    sm: 13,
    /** 15px — body text */
    base: 15,
    /** 17px — emphasized body, list items */
    md: 17,
    /** 20px — section headers */
    lg: 20,
    /** 24px — screen titles */
    xl: 24,
    /** 30px — hero text, onboarding */
    '2xl': 30,
    /** 36px — display text */
    '3xl': 36,
  },

  /** Line heights */
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  /** Font weights (numeric for cross-platform) */
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  /** Letter spacing */
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const;

/* ─────────────────────────────────────────────
 * Theme Hook
 * Automatically selects light/dark palette
 * based on device system preference.
 * ───────────────────────────────────────────── */

/**
 * Returns the active color palette based on the device's
 * current color scheme (light/dark).
 *
 * @example
 * const theme = useTheme();
 * <View style={{ backgroundColor: theme.background }}>
 *   <Text style={{ color: theme.foreground }}>Hello</Text>
 * </View>
 */
export function useTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

/**
 * Returns true if device is in dark mode.
 */
export function useIsDark(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark';
}
