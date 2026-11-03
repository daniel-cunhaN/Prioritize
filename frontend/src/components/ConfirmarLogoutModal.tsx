/**
 * ConfirmarLogoutModal.tsx — Diálogo Estilizado de Confirmação de Logout
 *
 * Substitui o window.confirm nativo do navegador e o alerta padrão do sistema por
 * um modal monocromático refinado, responsivo e alinhado ao Design System do Prioritize.
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

interface PropsConfirmarLogoutModal {
  visivel: boolean;
  emailUsuario?: string | null;
  carregando?: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}

export default function ConfirmarLogoutModal({
  visivel,
  emailUsuario,
  carregando = false,
  aoFechar,
  aoConfirmar,
}: PropsConfirmarLogoutModal) {
  const theme = useTheme();

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
            <Feather name="log-out" size={22} color={theme.foreground} />
          </View>

          {/* Rótulo e Título da Ação */}
          <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>
            ENCERRAR SESSÃO
          </Text>
          <Text style={[styles.titulo, { color: theme.foreground }]}>
            Tem certeza que deseja deslogar e sair da sua conta?
          </Text>

          {/* Prévia da Conta Conectada */}
          <View
            style={[
              styles.cardConta,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="user" size={15} color={theme.mutedForeground} />
            <Text
              style={[styles.textoConta, { color: theme.foreground }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {emailUsuario || 'Usuário atual'}
            </Text>
          </View>

          <Text style={[styles.descricaoAviso, { color: theme.mutedForeground }]}>
            Você precisará digitar suas credenciais de acesso novamente para visualizar ou adicionar desejos à sua conta.
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
                styles.botaoLogout,
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
                <ActivityIndicator
                  size="small"
                  color={theme.primaryForeground}
                />
              ) : (
                <Text style={[styles.textoLogout, { color: theme.primaryForeground }]}>
                  Sair da conta
                </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
    zIndex: 1,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  titulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  cardConta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  textoConta: {
    fontFamily: typography.fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  descricaoAviso: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  botoesContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  botao: {
    flex: 1,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          outlineStyle: 'none',
          userSelect: 'none',
        } as any)
      : {}),
  },
  botaoCancelar: {
    borderWidth: 1,
  },
  botaoLogout: {
    borderWidth: 0,
  },
  textoCancelar: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  textoLogout: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
  },
});
