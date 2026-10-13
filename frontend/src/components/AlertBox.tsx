/**
 * AlertBox.tsx — Componente de Caixa de Alerta customizado
 *
 * Fornece feedback visual integrado (erro, sucesso, aviso e info)
 * utilizando estritamente a paleta de cores e tipografia Claude Amber.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, spacing, radius, typography } from '../theme';

export type TipoAlerta = 'erro' | 'sucesso' | 'aviso' | 'info';

interface AlertBoxProps {
  tipo: TipoAlerta;
  mensagem: string;
  onFechar?: () => void;
  style?: object;
}

export default function AlertBox({ tipo, mensagem, onFechar, style }: AlertBoxProps) {
  const tema = useTheme();

  if (!mensagem) return null;

  /* Mapeamento de configurações e cores por tipo de feedback */
  const obterConfiguracao = () => {
    switch (tipo) {
      case 'erro':
        return {
          fundo: `${tema.destructive}15`,
          borda: tema.destructive,
          texto: tema.destructive,
          icone: '✕',
        };
      case 'sucesso':
        return {
          fundo: '#27ae6018',
          borda: '#27ae60',
          texto: '#27ae60',
          icone: '✓',
        };
      case 'aviso':
        return {
          fundo: `${tema.chart1}20`,
          borda: tema.chart1,
          texto: tema.chart1,
          icone: '!',
        };
      case 'info':
      default:
        return {
          fundo: `${tema.secondary}`,
          borda: tema.border,
          texto: tema.foreground,
          icone: 'ℹ',
        };
    }
  };

  const config = obterConfiguracao();

  return (
    <View
      style={[
        estilos.container,
        {
          backgroundColor: config.fundo,
          borderColor: config.borda,
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <View style={estilos.linhaConteudo}>
        {/* Ícone indicativo circular */}
        <View style={[estilos.circuloIcone, { borderColor: config.borda }]}>
          <Text style={[estilos.iconeTexto, { color: config.texto }]}>{config.icone}</Text>
        </View>

        {/* Mensagem do alerta */}
        <Text style={[estilos.mensagem, { color: config.texto }]}>
          {mensagem}
        </Text>

        {/* Botão de fechar opcional */}
        {onFechar && (
          <TouchableOpacity
            onPress={onFechar}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={estilos.botaoFechar}
            accessibilityLabel="Fechar alerta"
          >
            <Text style={[estilos.textoFechar, { color: config.texto }]}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  linhaConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circuloIcone: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconeTexto: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    lineHeight: 14,
  },
  mensagem: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    lineHeight: 18,
  },
  botaoFechar: {
    paddingLeft: spacing.xs,
  },
  textoFechar: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
  },
});
