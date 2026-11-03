/**
 * GerenciarContaModal.tsx — Modal Minimalista Monocromático de Conta e Sessão
 *
 * Integra diálogo estilizado de confirmação de logout (ConfirmarLogoutModal)
 * eliminando alertas nativos do navegador por uma experiência de alto contraste.
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, spacing, radius, shadows, typography } from '../theme';
import ConfirmarLogoutModal from './ConfirmarLogoutModal';

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
  const [modalLogoutVisivel, setModalLogoutVisivel] = useState(false);

  const inicialUsuario =
    emailUsuario && emailUsuario.trim().length > 0
      ? emailUsuario.trim().charAt(0).toUpperCase()
      : 'U';

  // Abre o diálogo monocromático estilizado de confirmação de saída
  const handleAbrirConfirmacaoLogout = () => {
    setModalLogoutVisivel(true);
  };

  // Encerra a sessão atual com segurança após confirmação no modal
  const handleExecutarLogout = async () => {
    setProcessando(true);
    try {
      await aoDeslogar();
      setModalLogoutVisivel(false);
      aoFechar();
    } catch (erro) {
      console.error('Erro ao deslogar usuário:', erro);
    } finally {
      setProcessando(false);
    }
  };

  const handleCriarNovaConta = () => {
    aoFechar();
    aoCriarNovaConta();
  };

  return (
    <>
      <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
        {/* Backdrop semi-transparente com clique para fechar */}
        <Pressable style={styles.backdrop} onPress={aoFechar}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card || theme.background,
                borderColor: theme.border,
              },
              shadows.lg,
            ]}
            onPress={(e) => {
              // Evita que o clique no corpo do modal feche acidentalmente o modal
              e?.stopPropagation?.();
            }}
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
                  onPress={handleAbrirConfirmacaoLogout}
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Monocromático Estilizado de Confirmação de Saída */}
      <ConfirmarLogoutModal
        visivel={modalLogoutVisivel}
        emailUsuario={emailUsuario}
        carregando={processando}
        aoFechar={() => setModalLogoutVisivel(false)}
        aoConfirmar={handleExecutarLogout}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.lg,
  },
  modalTitulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatarGrande: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGrandeTexto: {
    fontFamily: typography.fonts.sans,
    fontSize: 20,
    fontWeight: '800',
  },
  perfilInfo: {
    flex: 1,
  },
  perfilEmail: {
    fontFamily: typography.fonts.mono,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeSessao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePontoAtivo: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeSessaoTexto: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingTexto: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
  },
  acoesContainer: {
    gap: spacing.sm,
  },
  opcaoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  opcaoIconeContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoTextoContainer: {
    flex: 1,
  },
  opcaoTitulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  opcaoDescricao: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
  },
});
