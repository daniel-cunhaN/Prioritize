/**
 * GerenciarContaModal.tsx — Modal Minimalista Monocromático de Conta e Sessão
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
import { Feather } from '@expo/vector-icons';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

interface GerenciarContaModalProps {
  visivel: boolean;
  aoFechar: () => void;
  emailUsuario?: string;
  aoDeslogar: () => Promise<void> | void;
  aoCriarNovaConta: () => void;
  aoMudarDeConta?: () => void;
}

export default function GerenciarContaModal({
  visivel,
  aoFechar,
  emailUsuario,
  aoDeslogar,
  aoCriarNovaConta,
}: GerenciarContaModalProps) {
  const theme = useTheme();
  const [processando, setProcessando] = useState(false);

  const inicialUsuario =
    emailUsuario && emailUsuario.trim().length > 0
      ? emailUsuario.trim().charAt(0).toUpperCase()
      : 'U';

  // Solicita confirmação e encerra a sessão atual com segurança
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

  const handleCriarNovaConta = () => {
    aoFechar();
    aoCriarNovaConta();
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <TouchableWithoutFeedback onPress={aoFechar}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
                shadows.lg,
              ]}
              accessibilityRole="summary"
              accessibilityLabel="Gerenciamento de Conta do Usuário"
            >
              {/* Cabeçalho */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitulo, { color: theme.foreground }]} accessibilityRole="header">
                  Minha Conta
                </Text>

                <TouchableOpacity
                  onPress={aoFechar}
                  hitSlop={10}
                  style={[styles.botaoFechar, { backgroundColor: theme.secondary }]}
                  accessibilityLabel="Fechar janela de gerenciamento de conta"
                >
                  <Feather name="x" size={16} color={theme.foreground} />
                </TouchableOpacity>
              </View>

              {/* Cartão do Usuário */}
              <View
                style={[
                  styles.perfilCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={[styles.avatarGrande, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.avatarGrandeTexto, { color: theme.primaryForeground }]}>
                    {inicialUsuario}
                  </Text>
                </View>

                <View style={styles.perfilInfo}>
                  <Text
                    style={[styles.perfilEmail, { color: theme.foreground }]}
                    numberOfLines={1}
                  >
                    {emailUsuario || 'Usuário Conectado'}
                  </Text>

                  <View style={styles.badgeSessao}>
                    <View style={[styles.badgePontoAtivo, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.badgeSessaoTexto, { color: theme.mutedForeground }]}>
                      Sessão autenticada
                    </Text>
                  </View>
                </View>
              </View>

              {processando ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingTexto, { color: theme.mutedForeground }]}>
                    Encerrando sessão...
                  </Text>
                </View>
              ) : (
                <View style={styles.acoesContainer}>
                  <TouchableOpacity
                    style={[
                      styles.opcaoBotao,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={handleCriarNovaConta}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Cadastrar nova conta"
                  >
                    <View style={[styles.opcaoIconeContainer, { backgroundColor: theme.secondary }]}>
                      <Feather name="user-plus" size={16} color={theme.foreground} />
                    </View>
                    <View style={styles.opcaoTextoContainer}>
                      <Text style={[styles.opcaoTitulo, { color: theme.foreground }]}>
                        Criar outra conta
                      </Text>
                      <Text style={[styles.opcaoDescricao, { color: theme.mutedForeground }]}>
                        Registrar novo perfil de acesso
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.mutedForeground} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.opcaoBotao,
                      {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={handleConfirmarDeslogar}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Deslogar da aplicação"
                  >
                    <View
                      style={[
                        styles.opcaoIconeContainer,
                        { backgroundColor: 'rgba(255,255,255,0.14)' },
                      ]}
                    >
                      <Feather name="log-out" size={16} color={theme.primaryForeground} />
                    </View>
                    <View style={styles.opcaoTextoContainer}>
                      <Text style={[styles.opcaoTitulo, { color: theme.primaryForeground }]}>
                        Deslogar
                      </Text>
                      <Text
                        style={[
                          styles.opcaoDescricao,
                          { color: theme.primaryForeground, opacity: 0.75 },
                        ]}
                      >
                        Sair desta conta com segurança
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.primaryForeground} />
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
    backgroundColor: 'rgba(9, 9, 11, 0.48)',
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.fonts.sans,
    letterSpacing: -0.4,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  avatarGrande: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGrandeTexto: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: typography.fonts.sans,
  },
  perfilInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  perfilEmail: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  badgeSessao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePontoAtivo: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  badgeSessaoTexto: {
    fontSize: 11,
    fontFamily: typography.fonts.mono,
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
    gap: 10,
  },
  opcaoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  opcaoIconeContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcaoTextoContainer: {
    flex: 1,
    gap: 2,
  },
  opcaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  opcaoDescricao: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
  },
});
