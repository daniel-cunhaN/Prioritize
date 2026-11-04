/**
 * ConfirmarExclusaoModal.tsx — Diálogo Estilizado de Confirmação de Exclusão
 *
 * Substitui o window.confirm nativo do navegador e o alerta padrão do sistema por
 * um modal monocromático de alto impacto, elegante e responsivo, alinhado ao Design System.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

interface PropsConfirmarExclusaoModal {
  visivel: boolean;
  tituloProduto?: string | null;
  quantidadeItens?: number;
  titulosItens?: string[];
  carregando?: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}

export default function ConfirmarExclusaoModal({
  visivel,
  tituloProduto,
  quantidadeItens,
  titulosItens,
  carregando = false,
  aoFechar,
  aoConfirmar,
}: PropsConfirmarExclusaoModal) {
  const theme = useTheme();

  const ehEmLote = typeof quantidadeItens === 'number' && quantidadeItens > 1;
  const textoTitulo = ehEmLote
    ? `Deseja mesmo excluir esses ${quantidadeItens} produtos?`
    : 'Deseja mesmo excluir esse produto?';
  const textoEyebrow = ehEmLote ? 'EXCLUIR EM LOTE' : 'EXCLUIR DESEJO';
  const textoBotao = ehEmLote ? `Excluir (${quantidadeItens})` : 'Excluir';
  const textoAviso = ehEmLote
    ? `Esta ação removerá os ${quantidadeItens} produtos permanentemente da sua lista e não poderá ser desfeita.`
    : 'Esta ação removerá o produto permanentemente da sua lista e não poderá ser desfeita.';

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={aoFechar}
      accessibilityRole="alertdialog"
    >
      <View style={styles.overlay}>
        {/* Backdrop para fechar ao clicar fora */}
        <Pressable style={styles.backdrop} onPress={aoFechar} />

        {/* Card do Diálogo de Confirmação */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            shadows.lg,
          ]}
        >
          {/* Badge de Ícone Monocromático no Topo */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: theme.secondary,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="trash-2" size={22} color={theme.foreground} />
          </View>

          {/* Rótulo e Título da Ação */}
          <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>
            {textoEyebrow}
          </Text>
          <Text style={[styles.titulo, { color: theme.foreground }]}>
            {textoTitulo}
          </Text>

          {/* Prévia do Item que será removido */}
          <View
            style={[
              styles.cardItem,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather
              name={ehEmLote ? 'check-square' : 'tag'}
              size={14}
              color={theme.mutedForeground}
              style={{ marginTop: 2 }}
            />
            <Text
              style={[styles.textoItem, { color: theme.foreground }]}
              numberOfLines={ehEmLote ? 3 : 2}
              ellipsizeMode="tail"
            >
              {ehEmLote
                ? titulosItens && titulosItens.length > 0
                  ? `${quantidadeItens} itens: ${titulosItens.slice(0, 3).join(', ')}${titulosItens.length > 3 ? '...' : ''}`
                  : `${quantidadeItens} produtos selecionados`
                : tituloProduto || 'Este item da sua lista'}
            </Text>
          </View>

          <Text style={[styles.descricaoAviso, { color: theme.mutedForeground }]}>
            {textoAviso}
          </Text>

          {/* Botões de Ação em Formato Pílula */}
          <View style={styles.botoesContainer}>
            <TouchableOpacity
              style={[
                styles.botao,
                styles.botaoCancelar,
                {
                  backgroundColor: theme.secondary,
                  borderColor: theme.border,
                },
              ]}
              onPress={aoFechar}
              disabled={carregando}
              activeOpacity={0.8}
            >
              <Text style={[styles.textoCancelar, { color: theme.foreground }]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botao,
                styles.botaoExcluir,
                {
                  backgroundColor: theme.primary,
                  opacity: carregando ? 0.7 : 1,
                },
              ]}
              onPress={aoConfirmar}
              disabled={carregando}
              activeOpacity={0.88}
            >
              {carregando ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <View style={styles.linhaConteudoBotao}>
                  <Feather name="trash-2" size={15} color={theme.primaryForeground} />
                  <Text style={[styles.textoExcluir, { color: theme.primaryForeground }]}>
                    {textoBotao}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.35)',
        }
      : {}),
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  titulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  cardItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  textoItem: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  descricaoAviso: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  botoesContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  botao: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoCancelar: {
    borderWidth: 1,
  },
  textoCancelar: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  botaoExcluir: {},
  linhaConteudoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textoExcluir: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
