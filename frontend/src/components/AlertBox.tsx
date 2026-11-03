/**
 * AlertBox.tsx — Componente Minimalista Monocromático de Feedback Contextual
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

  // Configuração monocromática de alto contraste conforme o tipo de alerta
  const obterConfiguracao = () => {
    switch (tipo) {
      case 'sucesso':
        return {
          fundo: tema.primary,
          borda: tema.primary,
          texto: tema.primaryForeground,
          icone: '✓',
        };
      case 'erro':
        return {
          fundo: tema.card,
          borda: tema.primary,
          texto: tema.foreground,
          icone: '!',
        };
      case 'aviso':
      case 'info':
      default:
        return {
          fundo: tema.secondary,
          borda: tema.border,
          texto: tema.foreground,
          icone: '•',
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
        <View style={[estilos.circuloIcone, { borderColor: config.texto }]}>
          <Text style={[estilos.iconeTexto, { color: config.texto }]}>{config.icone}</Text>
        </View>

        <Text style={[estilos.mensagem, { color: config.texto }]}>{mensagem}</Text>

        {onFechar && (
          <TouchableOpacity
            onPress={onFechar}
            hitSlop={8}
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
    borderWidth: 1.5,
    borderRadius: radius.lg,
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
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconeTexto: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  mensagem: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fonts.sans,
    lineHeight: 18,
  },
  botaoFechar: {
    paddingLeft: spacing.xs,
  },
  textoFechar: {
    fontSize: 18,
    fontWeight: '800',
  },
});
