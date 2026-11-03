/**
 * theme.ts — Design System Monocromático Minimalista do Prioritize
 *
 * Estética de alto contraste em preto e branco com cartões cinza-claros sutis,
 * divisores precisos, cantos arredondados estilo iOS e tipografia SF Pro Display.
 */

import { Platform, useColorScheme } from 'react-native';

/* ─────────────────────────────────────────────
 * Paletas de Cores Monocromáticas (Claro e Escuro)
 * ───────────────────────────────────────────── */

/** Paleta clara — Fundo branco puro, superfícies cinza-claras sutis e tinta preta de alto contraste */
export const lightColors = {
  background: '#FFFFFF',
  foreground: '#09090B',

  card: '#FAFAFA',
  cardForeground: '#09090B',

  popover: '#FFFFFF',
  popoverForeground: '#09090B',

  primary: '#09090B',
  primaryForeground: '#FFFFFF',

  secondary: '#F4F4F5',
  secondaryForeground: '#18181B',

  muted: '#F4F4F5',
  mutedForeground: '#71717A',

  accent: '#F4F4F5',
  accentForeground: '#09090B',

  destructive: '#18181B',
  destructiveForeground: '#FFFFFF',

  border: '#E4E4E7',
  input: '#D4D4D8',
  ring: '#09090B',

  // Tons acromáticos escalonados para visualização de dados e badges
  chart1: '#09090B',
  chart2: '#3F3F46',
  chart3: '#71717A',
  chart4: '#A1A1AA',
  chart5: '#D4D4D8',

  // Navegação e barras laterais
  sidebar: '#FAFAFA',
  sidebarForeground: '#09090B',
  sidebarPrimary: '#09090B',
  sidebarPrimaryForeground: '#FFFFFF',
  sidebarAccent: '#F4F4F5',
  sidebarAccentForeground: '#09090B',
  sidebarBorder: '#E4E4E7',
  sidebarRing: '#09090B',
} as const;

/** Paleta escura — Obsidiana profunda com cartões elevados e tipografia branca nítida */
export const darkColors = {
  background: '#09090B',
  foreground: '#FAFAFA',

  card: '#121215',
  cardForeground: '#FAFAFA',

  popover: '#121215',
  popoverForeground: '#FAFAFA',

  primary: '#FAFAFA',
  primaryForeground: '#09090B',

  secondary: '#18181B',
  secondaryForeground: '#E4E4E7',

  muted: '#18181B',
  mutedForeground: '#A1A1AA',

  accent: '#27272A',
  accentForeground: '#FAFAFA',

  destructive: '#F4F4F5',
  destructiveForeground: '#09090B',

  border: '#27272A',
  input: '#3F3F46',
  ring: '#FAFAFA',

  chart1: '#FAFAFA',
  chart2: '#D4D4D8',
  chart3: '#A1A1AA',
  chart4: '#52525B',
  chart5: '#27272A',

  sidebar: '#121215',
  sidebarForeground: '#FAFAFA',
  sidebarPrimary: '#FAFAFA',
  sidebarPrimaryForeground: '#09090B',
  sidebarAccent: '#18181B',
  sidebarAccentForeground: '#FAFAFA',
  sidebarBorder: '#27272A',
  sidebarRing: '#FAFAFA',
} as const;

export type ThemeColors = { readonly [K in keyof typeof lightColors]: string };

/* ─────────────────────────────────────────────
 * Tokens de Espaçamento (Grade espacial de 4pt / 8pt)
 * ───────────────────────────────────────────── */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/* ─────────────────────────────────────────────
 * Raios de Borda Contínuos (Estilo iOS / Pílula)
 * ───────────────────────────────────────────── */
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999,
} as const;

/* ─────────────────────────────────────────────
 * Presets de Sombra Minimalistas
 * Compatibilizados com boxShadow para Web (eliminando warnings de depreciação)
 * e props nativas de sombra para iOS/Android
 * ───────────────────────────────────────────── */
export const shadows = Platform.select({
  web: {
    sm: {
      boxShadow: '0px 1px 3px rgba(9, 9, 11, 0.04)',
    },
    md: {
      boxShadow: '0px 4px 12px rgba(9, 9, 11, 0.06)',
    },
    lg: {
      boxShadow: '0px 12px 28px rgba(9, 9, 11, 0.14)',
    },
  },
  default: {
    sm: {
      shadowColor: '#09090B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#09090B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    lg: {
      shadowColor: '#09090B',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
      elevation: 8,
    },
  },
}) as {
  readonly sm: any;
  readonly md: any;
  readonly lg: any;
};

/* ─────────────────────────────────────────────
 * Tipografia (SF Pro Display / Sistema + Mono Tabular)
 * ───────────────────────────────────────────── */
const familiaSans =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Plus Jakarta Sans", system-ui, sans-serif'
    : 'System';

const familiaMono =
  Platform.OS === 'web'
    ? '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace'
    : Platform.OS === 'ios'
      ? 'Menlo'
      : 'monospace';

export const typography = {
  fonts: {
    sans: familiaSans,
    mono: familiaMono,
    serif: familiaSans,
  },

  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
  },

  lineHeights: {
    tight: 1.15,
    normal: 1.45,
    relaxed: 1.7,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  letterSpacing: {
    tight: -0.6,
    normal: -0.2,
    wide: 0.6,
  },
} as const;

/**
 * Retorna a paleta monocromática ativa conforme o esquema de cores do dispositivo.
 */
export function useTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkColors : lightColors;
}

/**
 * Indica se o sistema está em modo escuro.
 */
export function useIsDark(): boolean {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark';
}
