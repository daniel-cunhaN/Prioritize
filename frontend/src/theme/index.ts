import { useColorScheme } from 'react-native';

export const typography = {
  fonts: {
    sans: 'System',
    serif: 'System',
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    display: 40,
  },
  radii: {
    xs: 8,
    sm: 14,
    md: 20,
    lg: 28,
    xl: 36,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

/**
 * Paleta Claude Amber - Rústico com Moderno
 * Tons terrosos, madeira acolhedora, âmbar queimado, linho e ocre suave.
 */
const lightPalette = {
  // Fundos & Estrutura
  background: '#FAF7F2',        // Bege quente orgânico (linho claro)
  foreground: '#382819',        // Madeira nobre escura (alta legibilidade)
  card: '#F2ECE1',              // Ocre cerâmico suave
  cardForeground: '#382819',
  surface: '#FFFFFF',           // Cerâmica branca para inputs e destaques
  border: '#E3D7C5',            // Linho terroso suave
  borderFocus: '#C96442',       // Âmbar focado

  // Destaques / Ações
  primary: '#C96442',           // Âmbar queimado autêntico
  primarySoft: '#F3A96A',       // Ocre âmbar luminoso
  primaryForeground: '#FFFDF9', // Marfim suave para contraste sobre o primário

  // Secundários & Neutros
  secondary: '#ECE4D4',         // Areia quente
  secondaryForeground: '#4F3D2A',
  muted: '#E6DCcb',
  mutedForeground: '#8C7764',   // Argila / castanho médio
  
  // Feedback
  error: '#B84332',             // Terracota avermelhada
  errorSoft: '#F7D6D0',
  success: '#587B59',           // Verde sálvia rústico
  successSoft: '#D8E6D9',

  // Prioridades
  priority1: '#B84332',         // Urgente: Terracota vivo
  priority2: '#C96442',         // Alta: Âmbar queimado
  priority3: '#D6943C',         // Média: Ocre dourado
  priority4: '#8C9A5B',         // Moderada: Oliva terroso
  priority5: '#587B59',         // Baixa/Futuro: Verde sálvia

  // Auxiliares
  overlay: 'rgba(38, 28, 18, 0.45)', // Sombra quente em vez de preto puro
  shadow: '#382819',
};

const darkPalette = {
  // Fundos & Estrutura
  background: '#18130E',        // Madeira muito escura / ébano quente
  foreground: '#F5EFE6',        // Linho creme suave
  card: '#241D17',              // Marrom café profundo
  cardForeground: '#F5EFE6',
  surface: '#1E1712',           // Madeira rústica profunda
  border: '#3D3126',            // Madeira envelhecida
  borderFocus: '#E07A55',

  // Destaques / Ações
  primary: '#E07A55',           // Âmbar luminoso no escuro
  primarySoft: '#C2623C',
  primaryForeground: '#18130E', // Contraste nítido

  // Secundários & Neutros
  secondary: '#2E241D',
  secondaryForeground: '#DDD3C4',
  muted: '#2C231B',
  mutedForeground: '#A19180',
  
  // Feedback
  error: '#E86653',
  errorSoft: '#3C201C',
  success: '#7DA57E',
  successSoft: '#1D2F1E',

  // Prioridades
  priority1: '#E86653',
  priority2: '#E07A55',
  priority3: '#E2A955',
  priority4: '#A6B577',
  priority5: '#7DA57E',

  // Auxiliares
  overlay: 'rgba(0, 0, 0, 0.70)',
  shadow: '#000000',
};

export type ThemeColors = typeof lightPalette;

export function useIsDark(): boolean {
  const scheme = useColorScheme();
  return scheme === 'dark';
}

export function useTheme(): ThemeColors {
  const isDark = useIsDark();
  return isDark ? darkPalette : lightPalette;
}

export { lightPalette, darkPalette };