/**
 * GerenciarContaModal.tsx — Modal para Gerenciamento de Conta do Usuário
 *
 * Permite ao usuário visualizar as informações do seu perfil atual,
 * deslogar da aplicação com encerramento seguro de sessão,
 * trocar de conta (mudar de usuário) ou navegar para o cadastro de uma nova conta.
 *
 * Cores, tipografia e espaçamentos integrados à paleta Claude Amber.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

/** Propriedades recebidas pelo componente de Gerenciamento de Conta */
interface GerenciarContaModalProps {
  visivel: boolean;
  aoFechar: () => void;
  emailUsuario?: string;
  aoDeslogar: () => Promise<void> | void;
  aoTrocarConta: () => Promise<void> | void;
  aoCriarNovaConta: () => void;
}

export default function GerenciarContaModal({
  visivel,
  aoFechar,
  emailUsuario,
  aoDeslogar,
  aoTrocarConta,
  aoCriarNovaConta,
}: GerenciarContaModalProps) {
  const theme = useTheme();

  // Estado para indicar processamento de saída/deslogar
  const [processando, setProcessando] = useState(false);

  // Extrai a primeira letra do e-mail para o avatar, ou usa 'U' como fallback
  const inicialUsuario = (emailUsuario && emailUsuario.trim().length > 0)
    ? emailUsuario.trim().charAt(0).toUpperCase()
    : 'U';

  /**
   * Executa confirmação e encerramento de sessão para Logout
   */
  const handleConfirmarDeslogar = async () => {
    const executarSaida = async () => {
      setProcessando(true);
      try {
        await aoDeslogar();
      } catch (erro) {
        console.error('Erro ao deslogar usuário:', erro);
      } finally {
        setProcessando(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja deslogar e sair da sua conta?')) {
        await executarSaida();
      }
    } else {
      Alert.alert(
        'Sair da Conta',
        'Tem certeza que deseja encerrar a sua sessão neste dispositivo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Deslogar', style: 'destructive', onPress: executarSaida },
        ]
      );
    }
  };

  /**
   * Executa confirmação para Mudar de Conta
   */
  const handleConfirmarTrocarConta = async () => {
    const executarTroca = async () => {
      setProcessando(true);
      try {
        await aoTrocarConta();
      } catch (erro) {
        console.error('Erro ao trocar de conta:', erro);
      } finally {
        setProcessando(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja sair da conta atual para entrar com outro usuário?')) {
        await executarTroca();
      }
    } else {
      Alert.alert(
        'Mudar de Conta',
        'Deseja sair da conta atual para entrar com outro usuário?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Mudar de Conta', onPress: executarTroca },
        ]
      );
    }
  };

  /**
   * Redireciona para o cadastro de uma nova conta
   */
  const handleCriarNovaConta = () => {
    aoFechar();
    aoCriarNovaConta();
  };

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={aoFechar}
    >
      {/* Backdrop semi-transparente com clique para fechar */}
      <TouchableWithoutFeedback onPress={aoFechar}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
                shadows.lg,
              ]}
              accessibilityRole="summary"
              accessibilityLabel="Gerenciamento de Conta do Usuário"
            >
              {/* ── Cabeçalho do Modal ── */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text
                  style={[
                    styles.modalTitulo,
                    { color: theme.foreground },
                  ]}
                  accessibilityRole="header"
                >
                  Minha Conta
                </Text>

                <TouchableOpacity
                  onPress={aoFechar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[styles.botaoFechar, { backgroundColor: theme.muted }]}
                  accessibilityLabel="Fechar janela de gerenciamento de conta"
                >
                  <Text style={[styles.botaoFecharTexto, { color: theme.foreground }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* ── Cartão Informativo do Usuário ── */}
              <View style={[styles.perfilCard, { backgroundColor: theme.secondary }]}>
                <View
                  style={[
                    styles.avatarGrande,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.avatarGrandeTexto, { color: theme.primaryForeground }]}>
                    {inicialUsuario}
                  </Text>
                </View>

                <View style={styles.perfilInfo}>
                  <Text
                    style={[styles.perfilEmail, { color: theme.secondaryForeground }]}
                    numberOfLines={1}
                  >
                    {emailUsuario || 'Usuário Conectado'}
                  </Text>

                  <View style={styles.badgeSessao}>
                    <View style={styles.badgePontoAtivo} />
                    <Text style={[styles.badgeSessaoTexto, { color: theme.mutedForeground }]}>
                      Sessão ativa
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Indicador de Processamento ── */}
              {processando ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingTexto, { color: theme.mutedForeground }]}>
                    Processando saída...
                  </Text>
                </View>
              ) : (
                /* ── Lista de Ações de Gerenciamento ── */
                <View style={styles.acoesContainer}>
                  {/* Opção: Mudar de Conta */}
                  <TouchableOpacity
                    style={[
                      styles.opcaoBotao,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleConfirmarTrocarConta}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Mudar de conta"
                    accessibilityHint="Desconecta a conta atual e abre o formulário de login para outro usuário"
                  >
                    <View style={[styles.opcaoIconeContainer, { backgroundColor: `${theme.primary}18` }]}>
                      <Text style={styles.opcaoIcone}>🔄</Text>
                    </View>
                    <View style={styles.opcaoTextoContainer}>
                      <Text style={[styles.opcaoTitulo, { color: theme.foreground }]}>
                        Mudar de conta
                      </Text>
                      <Text style={[styles.opcaoDescricao, { color: theme.mutedForeground }]}>
                        Entrar com outro e-mail
                      </Text>
                    </View>
                    <Text style={[styles.opcaoSeta, { color: theme.mutedForeground }]}>›</Text>
                  </TouchableOpacity>

                  {/* Opção: Criar Nova Conta */}
                  <TouchableOpacity
                    style={[
                      styles.opcaoBotao,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleCriarNovaConta}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Cadastrar nova conta"
                    accessibilityHint="Abre a tela de cadastro para registrar um novo usuário"
                  >
                    <View style={[styles.opcaoIconeContainer, { backgroundColor: `${theme.chart1}18` }]}>
                      <Text style={styles.opcaoIcone}>➕</Text>
                    </View>
                    <View style={styles.opcaoTextoContainer}>
                      <Text style={[styles.opcaoTitulo, { color: theme.foreground }]}>
                        Criar outra conta
                      </Text>
                      <Text style={[styles.opcaoDescricao, { color: theme.mutedForeground }]}>
                        Registrar novo usuário
                      </Text>
                    </View>
                    <Text style={[styles.opcaoSeta, { color: theme.mutedForeground }]}>›</Text>
                  </TouchableOpacity>

                  {/* Opção: Deslogar (Sair da Conta) */}
                  <TouchableOpacity
                    style={[
                      styles.opcaoBotao,
                      styles.opcaoBotaoSair,
                      {
                        backgroundColor: `${theme.destructive}12`,
                        borderColor: `${theme.destructive}40`,
                      },
                    ]}
                    onPress={handleConfirmarDeslogar}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Deslogar da aplicação"
                    accessibilityHint="Encerra a sessão atual e retorna à tela de autenticação"
                  >
                    <View
                      style={[
                        styles.opcaoIconeContainer,
                        { backgroundColor: `${theme.destructive}20` },
                      ]}
                    >
                      <Text style={styles.opcaoIcone}>🚪</Text>
                    </View>
                    <View style={styles.opcaoTextoContainer}>
                      <Text style={[styles.opcaoTitulo, { color: theme.destructive }]}>
                        Deslogar
                      </Text>
                      <Text style={[styles.opcaoDescricao, { color: theme.mutedForeground }]}>
                        Sair desta conta com segurança
                      </Text>
                    </View>
                    <Text style={[styles.opcaoSeta, { color: theme.destructive }]}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitulo: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botaoFecharTexto: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  avatarGrande: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGrandeTexto: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
  },
  perfilInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  perfilEmail: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  badgeSessao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePontoAtivo: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#10B981', // Verde de status ativo
  },
  badgeSessaoTexto: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingTexto: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  acoesContainer: {
    gap: spacing.sm,
  },
  opcaoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  opcaoBotaoSair: {
    marginTop: spacing.xs,
  },
  opcaoIconeContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcaoIcone: {
    fontSize: 18,
  },
  opcaoTextoContainer: {
    flex: 1,
    gap: 2,
  },
  opcaoTitulo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  opcaoDescricao: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
  opcaoSeta: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },
});
