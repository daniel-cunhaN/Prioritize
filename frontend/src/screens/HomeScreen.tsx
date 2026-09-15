/**
 * HomeScreen.tsx — Tela Principal da Lista de Desejos (Menu Principal)
 *
 * Exibe o resumo das prioridades, a listagem dos desejos cadastrados
 * ou estado vazio amigável caso não haja itens, e integra o modal
 * de adicionar novo desejo com classificação de importância.
 *
 * Cores e design integrados à paleta Claude Amber.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useTheme, spacing, radius, shadows, typography } from '../theme';
import client from '../api/client';
import AdicionarDesejoModal, { DesejoItem } from '../components/AdicionarDesejoModal';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();

  // ─── Estados da Tela Principal ──────────────────────────────────────────────
  const [modalVisivel, setModalVisivel] = useState(false);
  const [desejos, setDesejos] = useState<DesejoItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  // ─── Carregamento Inicial dos Desejos do Usuário ───────────────────────────
  const carregarDesejos = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await client.get('/wishlist/');
      setDesejos(resposta.data || []);
    } catch (erro) {
      console.warn('Falha ao carregar lista de desejos:', erro);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDesejos();
  }, [carregarDesejos]);

  // Abre o modal de adicionar desejo
  const handleAbrirModal = () => {
    setModalVisivel(true);
  };

  // Callback acionado quando um novo desejo é criado no modal
  const handleDesejoCriado = (novoDesejo: DesejoItem) => {
    setDesejos((prev) => [novoDesejo, ...prev]);
  };

  // ─── Exclusão de um Desejo da Lista ─────────────────────────────────────────
  const handleExcluirDesejo = async (id: string) => {
    const confirmarExclusao = async () => {
      try {
        await client.delete(`/wishlist/${id}`);
        setDesejos((prev) => prev.filter((item) => item.id !== id));
      } catch (erro) {
        console.error('Erro ao excluir desejo:', erro);
        Alert.alert('Erro', 'Não foi possível excluir o item.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja remover este item da sua lista?')) {
        await confirmarExclusao();
      }
    } else {
      Alert.alert(
        'Excluir Desejo',
        'Tem certeza que deseja remover este item da sua lista?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: confirmarExclusao },
        ]
      );
    }
  };

  // Abre o link do produto no navegador
  const handleAbrirLink = async (url: string) => {
    try {
      const linkSuportado = await Linking.canOpenURL(url);
      if (linkSuportado) {
        await Linking.openURL(url);
      }
    } catch (erro) {
      console.warn('Não foi possível abrir o link:', erro);
    }
  };

  // ─── Cálculo das Métricas dos Cards do Topo ─────────────────────────────────
  const totalItens = desejos.length;
  const altaPrioridadeItens = desejos.filter((d) => d.priority === 3).length;
  const mediaPrioridadeItens = desejos.filter((d) => d.priority === 2).length;

  // ─── Helper de Badge de Prioridade ──────────────────────────────────────────
  const obterBadgePrioridade = (prioridade: number) => {
    switch (prioridade) {
      case 3:
        return {
          texto: 'Alta',
          icone: '🔥',
          corFundo: `${theme.primary}20`,
          corBorda: theme.primary,
          corTexto: theme.primary,
        };
      case 2:
        return {
          texto: 'Média',
          icone: '⭐',
          corFundo: `${theme.chart1}20`,
          corBorda: theme.chart1,
          corTexto: theme.chart1,
        };
      case 1:
      default:
        return {
          texto: 'Baixa',
          icone: '🌱',
          corFundo: `${theme.chart2}20`,
          corBorda: theme.chart2,
          corTexto: theme.chart2,
        };
    }
  };

  /* ── Estilos Dinâmicos do Tema Claude Amber ── */
  const dynamicStyles = {
    safeArea: {
      backgroundColor: theme.background,
    },
    headerBar: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.foreground,
    },
    headerSubtitle: {
      color: theme.mutedForeground,
    },
    emptyCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    emptyIconCircle: {
      backgroundColor: theme.muted,
    },
    emptyIconText: {
      color: theme.primary,
    },
    emptyTitle: {
      color: theme.foreground,
    },
    emptyDescription: {
      color: theme.mutedForeground,
    },
    fab: {
      backgroundColor: theme.primary,
    },
    fabText: {
      color: theme.primaryForeground,
    },
    statsCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    statsValue: {
      color: theme.primary,
    },
    statsLabel: {
      color: theme.mutedForeground,
    },
    desejoCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    desejoTitulo: {
      color: theme.foreground,
    },
    desejoUrl: {
      color: theme.mutedForeground,
    },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      {/* ── Barra de Cabeçalho Superior ── */}
      <View style={[styles.headerBar, dynamicStyles.headerBar, shadows.sm]}>
        <View style={styles.headerContent}>
          <View>
            <Text
              style={[styles.headerTitle, dynamicStyles.headerTitle]}
              accessibilityRole="header"
            >
              Meus Desejos
            </Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>
              Organize e priorize o que importa
            </Text>
          </View>
          {/* Avatar do Usuário */}
          <View
            style={[styles.avatarCircle, { backgroundColor: theme.secondary }]}
            accessibilityLabel="Perfil do usuário"
          >
            <Text style={[styles.avatarText, { color: theme.secondaryForeground }]}>
              U
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cards de Estatísticas Rápidas ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>
              {totalItens}
            </Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>Total</Text>
          </View>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>
              {altaPrioridadeItens}
            </Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>
              Alta prioridade
            </Text>
          </View>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>
              {mediaPrioridadeItens}
            </Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>
              Média prioridade
            </Text>
          </View>
        </View>

        {/* ── Indicador de Carregamento ── */}
        {carregando && (
          <View style={styles.containerCarregando}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.textoCarregando, { color: theme.mutedForeground }]}>
              Carregando desejos...
            </Text>
          </View>
        )}

        {/* ── Estado Vazio (Quando Não Há Desejos Cadastrados) ── */}
        {!carregando && desejos.length === 0 && (
          <View style={[styles.emptyCard, dynamicStyles.emptyCard, shadows.md]}>
            <View style={[styles.emptyIconCircle, dynamicStyles.emptyIconCircle]}>
              <Text style={[styles.emptyIconText, dynamicStyles.emptyIconText]}>
                ★
              </Text>
            </View>
            <Text
              style={[styles.emptyTitle, dynamicStyles.emptyTitle]}
              accessibilityRole="header"
            >
              Nenhum desejo cadastrado
            </Text>
            <Text style={[styles.emptyDescription, dynamicStyles.emptyDescription]}>
              Comece adicionando seu primeiro desejo.{'\n'}
              Cole um link e classifique a importância.
            </Text>

            {/* Botão de Ação do Estado Vazio */}
            <TouchableOpacity
              style={[styles.inlineButton, { backgroundColor: theme.secondary }]}
              onPress={handleAbrirModal}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Adicionar primeiro desejo"
            >
              <Text style={[styles.inlineButtonText, { color: theme.primary }]}>
                + Adicionar desejo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Listagem dos Cards de Desejos Persistidos ── */}
        {!carregando && desejos.length > 0 && (
          <View style={styles.listaDesejos}>
            <Text style={[styles.secaoTitulo, { color: theme.foreground }]}>
              Produtos Salvos ({desejos.length})
            </Text>

            {desejos.map((item) => {
              const badge = obterBadgePrioridade(item.priority);
              return (
                <View
                  key={item.id}
                  style={[styles.desejoCard, dynamicStyles.desejoCard, shadows.sm]}
                >
                  {/* Imagem do Produto ou Placeholder */}
                  <View style={[styles.desejoImagemContainer, { backgroundColor: theme.muted }]}>
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.desejoImagem}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.desejoImagemPlaceholder}>🛍️</Text>
                    )}
                  </View>

                  {/* Informações Textuais do Produto */}
                  <View style={styles.desejoInfo}>
                    <View style={styles.desejoLinhaSuperior}>
                      {/* Badge de Prioridade: Baixa, Média, Alta */}
                      <View
                        style={[
                          styles.badgePrioridade,
                          {
                            backgroundColor: badge.corFundo,
                            borderColor: badge.corBorda,
                          },
                        ]}
                      >
                        <Text style={styles.badgeIcone}>{badge.icone}</Text>
                        <Text
                          style={[
                            styles.badgeTexto,
                            { color: badge.corTexto },
                          ]}
                        >
                          {badge.texto}
                        </Text>
                      </View>

                      {/* Botão de Exclusão */}
                      <TouchableOpacity
                        onPress={() => handleExcluirDesejo(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Excluir este desejo"
                      >
                        <Text style={[styles.botaoExcluirTexto, { color: theme.mutedForeground }]}>
                          🗑️
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Título do Produto */}
                    <Text
                      style={[styles.desejoTitulo, dynamicStyles.desejoTitulo]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {/* Link para Abrir o Produto */}
                    <TouchableOpacity
                      onPress={() => handleAbrirLink(item.url)}
                      style={styles.desejoLinkContainer}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.desejoUrl, dynamicStyles.desejoUrl]}
                        numberOfLines={1}
                      >
                        🔗 {item.url}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Botão Flutuante (FAB) para Adicionar Novo Desejo ── */}
      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab, shadows.lg]}
        onPress={handleAbrirModal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Registrar novo desejo"
        accessibilityHint="Abre o formulário para adicionar um novo desejo à lista"
      >
        <Text style={[styles.fabIcon, dynamicStyles.fabText]}>+</Text>
        <Text style={[styles.fabText, dynamicStyles.fabText]}>
          Novo Desejo
        </Text>
      </TouchableOpacity>

      {/* ── Componente do Modal de Adicionar Desejo ── */}
      <AdicionarDesejoModal
        visivel={modalVisivel}
        aoFechar={() => setModalVisivel(false)}
        aoSalvarSucesso={handleDesejoCriado}
      />
    </SafeAreaView>
  );
}

/* ── Estilos Estáticos ── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* Header */
  headerBar: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xxs,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing['2xl'],
    paddingBottom: 120, // Espaço para não cobrir pelo FAB
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statsCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
  },
  statsLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  /* Estado de Carregamento */
  containerCarregando: {
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  textoCarregando: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },

  /* Estado Vazio */
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing['2xl'],
  },
  inlineButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  inlineButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },

  /* Lista de Desejos */
  listaDesejos: {
    gap: spacing.md,
  },
  secaoTitulo: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.xs,
  },
  desejoCard: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  desejoImagemContainer: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desejoImagem: {
    width: '100%',
    height: '100%',
  },
  desejoImagemPlaceholder: {
    fontSize: 28,
  },
  desejoInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  desejoLinhaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  badgePrioridade: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 4,
  },
  badgeIcone: {
    fontSize: 10,
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  botaoExcluirTexto: {
    fontSize: 14,
    padding: 2,
  },
  desejoTitulo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  desejoLinkContainer: {
    marginTop: 2,
  },
  desejoUrl: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    textDecorationLine: 'underline',
  },

  /* Botão Flutuante (FAB) */
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing['2xl'],
    left: spacing['2xl'],
    height: 56,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fabIcon: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  fabText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
});
