import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useIsDark, typography } from '../../theme';

interface Props {
  value: number;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { main: 20, small: 11, offset: 1 },
  md: { main: 25, small: 13, offset: 2 },
  lg: { main: 30, small: 15, offset: 3 },
};

/**
 * Preço no estilo Amazon:
 * "R$" alinhado no topo, valor inteiro grande em negrito, centavos sobrescritos sem vírgula (ex: R$78⁹⁵)
 * Adota automaticamente a cor do tema (claro ou escuro) quando `color` não for explicitamente fornecido.
 */
export default function PriceTag({ value, color, size = 'md' }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const s = SIZES[size];
  const [intPart, cents] = Math.abs(value).toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const corTexto = color || (isDark ? theme.foreground : '#0F1111');

  return (
    <View style={styles.row} accessibilityLabel={`R$ ${formattedInt},${cents}`}>
      <Text style={[styles.currency, { color: corTexto, fontSize: s.small, marginTop: s.offset + 1 }]}>
        R$
      </Text>
      <Text style={[styles.main, { color: corTexto, fontSize: s.main, lineHeight: s.main + 1 }]}>
        {formattedInt}
      </Text>
      <Text style={[styles.cents, { color: corTexto, fontSize: s.small, marginTop: s.offset }]}>
        {cents}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currency: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    marginRight: 1,
  },
  main: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  cents: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    marginLeft: 1,
  },
});
