/**
 * BarraAcoesLote.tsx — Barra Monocromática de Ações em Lote (Bulk Actions)
 *
 * Exibida quando o usuário ativa o modo de seleção múltipla de desejos.
 * Permite marcar/desmarcar todos os itens, visualizar a contagem de selecionados,
 * cancelar o modo de seleção e disparar a exclusão em massa com confirmação.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius, spacing, shadows } from '../../theme';

interface PropsBarraAcoesLote {
  totalSelecionados: number;
  totalItens: number;
  aoAlternarSelecionarTodos: () => void;
  aoCancelar: () => void;
  aoConfirmarExcluirEmLote: () => void;
  todosSelecionados: boolean;
  carregando?: boolean;
}

export default function BarraAcoesLote({
  totalSelecionados,
  totalItens,
  aoAlternarSelecionarTodos,
  aoCancelar,
  aoConfirmarExcluirEmLote,
  todosSelecionados,
  carregando = false,
}: PropsBarraAcoesLote) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
        shadows.lg,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Barra de ações em lote para seleção de itens"
    >
      {/* Indicador de Contagem e Botão Selecionar Todos */}
      <View style={styles.secaoEsquerda}>
        <View
          style={[
            styles.badgeContagem,
            {
              backgroundColor: totalSelecionados > 0 ? theme.primary : theme.secondary,
              borderColor: totalSelecionados > 0 ? theme.primary : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.textoContagem,
              {
                color: totalSelecionados > 0 ? theme.primaryForeground : theme.foreground,
              },
            ]}
          >
            {totalSelecionados}
          </Text>
        </View>

        <TouchableOpacity
          onPress={aoAlternarSelecionarTodos}
          style={[
            styles.botaoSecundario,
            {
              backgroundColor: theme.secondary,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={
            todosSelecionados ? 'Desmarcar todos os itens' : 'Selecionar todos os itens'
          }
        >
          <Feather
            name={todosSelecionados ? 'check-square' : 'square'}
            size={13}
            color={theme.foreground}
          />
          <Text style={[styles.textoBotaoSecundario, { color: theme.foreground }]}>
            {todosSelecionados ? 'Desmarcar' : 'Todos'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botões de Ação: Cancelar e Excluir */}
      <View style={styles.secaoDireita}>
        <TouchableOpacity
          onPress={aoCancelar}
          style={[
            styles.botaoSecundario,
            {
              backgroundColor: theme.secondary,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Cancelar modo de seleção"
        >
          <Feather name="x" size={13} color={theme.mutedForeground} />
          <Text style={[styles.textoBotaoSecundario, { color: theme.mutedForeground }]}>
            Cancelar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={aoConfirmarExcluirEmLote}
          disabled={totalSelecionados === 0 || carregando}
          style={[
            styles.botaoExcluir,
            {
              backgroundColor: theme.primary,
              opacity: totalSelecionados === 0 || carregando ? 0.4 : 1,
            },
          ]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Excluir ${totalSelecionados} desejos selecionados`}
        >
          <Feather name="trash-2" size={13} color={theme.primaryForeground} />
          <Text style={[styles.textoBotaoExcluir, { color: theme.primaryForeground }]}>
            Excluir {totalSelecionados > 0 ? `(${totalSelecionados})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 24px -4px rgba(9, 9, 11, 0.12)',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  secaoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeContagem: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  textoContagem: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    fontWeight: '800',
  },
  secaoDireita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoBotaoSecundario: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  botaoExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  textoBotaoExcluir: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
