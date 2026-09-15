/**
 * AdicionarDesejoModal.tsx — Modal para adicionar novo desejo à lista
 *
 * Permite ao usuário herdar e cadastrar:
 * - Link do produto (com extração automática de metadados)
 * - Imagem do produto (OpenGraph / preview)
 * - Título do produto (herdado automaticamente e editável)
 * - Classificação de importância ("Baixa", "Média", "Alta")
 *
 * Totalmente integrado ao design system Claude Amber do Prioritize.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import client from '../api/client';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

// ─── Tipagem do Item de Desejo Retornado pela API ─────────────────────────────
export interface DesejoItem {
  id: string;
  user_id: string;
  url: string;
  title: string;
  image_url: string | null;
  priority: number;
  created_at: string;
  updated_at?: string | null;
}

// ─── Níveis de Prioridade / Importância Conforme Escala do Projeto ────────────
export type NivelPrioridade = 1 | 2 | 3; // 1 = Baixa, 2 = Média, 3 = Alta

interface PropsModalAdicionarDesejo {
  visivel: boolean;
  aoFechar: () => void;
  aoSalvarSucesso: (novoDesejo: DesejoItem) => void;
  urlInicial?: string;
}

export default function AdicionarDesejoModal({
  visivel,
  aoFechar,
  aoSalvarSucesso,
  urlInicial = '',
}: PropsModalAdicionarDesejo) {
  const theme = useTheme();

  // ─── Estados do Formulário ──────────────────────────────────────────────────
  const [url, setUrl] = useState(urlInicial);
  const [titulo, setTitulo] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<NivelPrioridade>(2); // Padrão: Média

  // ─── Estados de Carregamento e Foco ─────────────────────────────────────────
  const [carregandoMetadados, setCarregandoMetadados] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [urlFocada, setUrlFocada] = useState(false);
  const [tituloFocado, setTituloFocado] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Preenche a URL inicial sempre que o modal for aberto com uma URL informada
  useEffect(() => {
    if (visivel) {
      if (urlInicial) {
        setUrl(urlInicial);
        buscarMetadados(urlInicial);
      } else {
        limparFormulario();
      }
    }
  }, [visivel, urlInicial]);

  // Limpa todos os campos ao fechar ou reabrir
  const limparFormulario = () => {
    setUrl('');
    setTitulo('');
    setImagemUrl(null);
    setPrioridade(2);
    setMensagemErro(null);
  };

  // ─── Função de Extração de Metadados (OpenGraph) ─────────────────────────────
  // Disparada para herdar automaticamente título e imagem do link
  const buscarMetadados = async (urlParaBuscar?: string) => {
    const alvoUrl = (urlParaBuscar || url).trim();

    if (!alvoUrl) {
      setMensagemErro('Informe o link do produto antes de buscar.');
      return;
    }

    setCarregandoMetadados(true);
    setMensagemErro(null);

    try {
      // Chama o endpoint de pré-visualização do backend
      const resposta = await client.post('/wishlist/preview', { url: alvoUrl });
      const { titulo: tituloExtraido, imagem_url: imagemExtraida } = resposta.data;

      if (tituloExtraido) {
        setTitulo(tituloExtraido);
      }
      if (imagemExtraida) {
        setImagemUrl(imagemExtraida);
      }
    } catch (erro: any) {
      console.warn('Erro ao extrair metadados do link:', erro);
      // Fallback: não impede o usuário de preencher o título manualmente
      if (!titulo) {
        try {
          const dominio = new URL(alvoUrl.startsWith('http') ? alvoUrl : `https://${alvoUrl}`).hostname;
          setTitulo(`Item de ${dominio.replace('www.', '')}`);
        } catch {
          // Mantém o título vazio caso a URL seja inválida
        }
      }
    } finally {
      setCarregandoMetadados(false);
    }
  };

  // ─── Função de Validação e Envio do Desejo ───────────────────────────────────
  const handleSalvar = async () => {
    const urlLimpa = url.trim();
    const tituloLimpo = titulo.trim();

    if (!urlLimpa) {
      setMensagemErro('O link do produto é obrigatório.');
      return;
    }
    if (!tituloLimpo) {
      setMensagemErro('O título do produto é obrigatório.');
      return;
    }

    setSalvando(true);
    setMensagemErro(null);

    try {
      // Envia o novo desejo com classificação de importância para a API
      const resposta = await client.post('/wishlist/', {
        url: urlLimpa,
        titulo: tituloLimpo,
        imagem_url: imagemUrl,
        prioridade: prioridade,
      });

      const desejoSalvo: DesejoItem = resposta.data;
      limparFormulario();
      aoSalvarSucesso(desejoSalvo);
      aoFechar();

      if (Platform.OS === 'web') {
        window.alert('Desejo adicionado com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Desejo adicionado com sucesso!');
      }
    } catch (erro: any) {
      console.error('Erro ao salvar desejo:', erro);
      const msg =
        erro.response?.data?.detail?.mensagem ||
        'Não foi possível salvar o desejo. Tente novamente.';
      setMensagemErro(msg);
    } finally {
      setSalvando(false);
    }
  };

  // ─── Estilos Dinâmicos Vinculados ao Tema Claude Amber ──────────────────────
  const dynamicStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    modalContainer: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    tituloModal: {
      color: theme.foreground,
    },
    subtituloModal: {
      color: theme.mutedForeground,
    },
    input: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      color: theme.foreground,
    },
    inputFocado: {
      borderColor: theme.ring,
    },
    label: {
      color: theme.foreground,
    },
    botaoPrimario: {
      backgroundColor: theme.primary,
    },
    botaoPrimarioTexto: {
      color: theme.primaryForeground,
    },
    botaoSecundario: {
      backgroundColor: theme.secondary,
    },
    botaoSecundarioTexto: {
      color: theme.secondaryForeground,
    },
    previewCard: {
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    placeholderImagem: {
      backgroundColor: theme.muted,
      borderColor: theme.border,
    },
  };

  return (
    <Modal
      visible={visivel}
      animationType="fade"
      transparent={true}
      onRequestClose={aoFechar}
    >
      <KeyboardAvoidingView
        style={[styles.overlay, dynamicStyles.overlay]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, dynamicStyles.modalContainer, shadows.lg]}>
          {/* ─── Cabeçalho do Modal ─── */}
          <View style={styles.cabecalho}>
            <View style={styles.titulosContainer}>
              <Text style={[styles.tituloModal, dynamicStyles.tituloModal]}>
                Adicionar Desejo
              </Text>
              <Text style={[styles.subtituloModal, dynamicStyles.subtituloModal]}>
                Herde informações de links e defina a prioridade
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.botaoFechar, { backgroundColor: theme.muted }]}
              onPress={aoFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal"
            >
              <Text style={[styles.textoBotaoFechar, { color: theme.mutedForeground }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollConteudo}
          >
            {/* ─── Alerta de Erro ─── */}
            {mensagemErro && (
              <View style={[styles.cardErro, { backgroundColor: `${theme.destructive}15`, borderColor: theme.destructive }]}>
                <Text style={[styles.textoErro, { color: theme.destructive }]}>
                  {mensagemErro}
                </Text>
              </View>
            )}

            {/* ─── Campo 1: Link do Produto ─── */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, dynamicStyles.label]}>
                Link do Produto *
              </Text>
              <View style={styles.linhaInputLink}>
                <TextInput
                  style={[
                    styles.input,
                    dynamicStyles.input,
                    urlFocada && dynamicStyles.inputFocado,
                    styles.inputLink,
                  ]}
                  placeholder="Cole aqui a URL (ex: https://loja.com/item)"
                  placeholderTextColor={theme.mutedForeground}
                  value={url}
                  onChangeText={(texto) => {
                    setUrl(texto);
                    if (mensagemErro) setMensagemErro(null);
                  }}
                  onFocus={() => setUrlFocada(true)}
                  onBlur={() => {
                    setUrlFocada(false);
                    // Dispara a busca automática ao sair do campo se houver link
                    if (url.trim() && !titulo && !carregandoMetadados) {
                      buscarMetadados(url);
                    }
                  }}
                  autoCapitalize="none"
                  keyboardType="url"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.botaoBuscar,
                    dynamicStyles.botaoSecundario,
                    carregandoMetadados && { opacity: 0.7 },
                  ]}
                  onPress={() => buscarMetadados()}
                  disabled={carregandoMetadados || !url.trim()}
                  activeOpacity={0.8}
                  accessibilityLabel="Buscar dados do link"
                >
                  {carregandoMetadados ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text style={[styles.textoBotaoBuscar, { color: theme.primary }]}>
                      Buscar
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ─── Indicador de Carregamento de Metadados ─── */}
            {carregandoMetadados && (
              <View style={styles.linhaStatusCarregamento}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.textoStatusCarregamento, { color: theme.mutedForeground }]}>
                  Obtendo título e imagem do produto...
                </Text>
              </View>
            )}

            {/* ─── Card de Pré-visualização da Imagem Herdada ─── */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, dynamicStyles.label]}>
                Pré-visualização do Produto
              </Text>
              <View style={[styles.cardPreview, dynamicStyles.previewCard]}>
                {imagemUrl ? (
                  <Image
                    source={{ uri: imagemUrl }}
                    style={styles.imagemProduto}
                    resizeMode="contain"
                    accessibilityLabel="Imagem do produto"
                  />
                ) : (
                  <View style={[styles.placeholderImagem, dynamicStyles.placeholderImagem]}>
                    <Text style={[styles.textoIconePlaceholder, { color: theme.mutedForeground }]}>
                      🛍️
                    </Text>
                    <Text style={[styles.textoPlaceholder, { color: theme.mutedForeground }]}>
                      {carregandoMetadados ? 'Buscando imagem...' : 'Nenhuma imagem capturada'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ─── Campo 2: Título do Produto (Herdado e Editável) ─── */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, dynamicStyles.label]}>
                Título do Produto *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  dynamicStyles.input,
                  tituloFocado && dynamicStyles.inputFocado,
                ]}
                placeholder="Nome ou descrição do produto"
                placeholderTextColor={theme.mutedForeground}
                value={titulo}
                onChangeText={(texto) => {
                  setTitulo(texto);
                  if (mensagemErro) setMensagemErro(null);
                }}
                onFocus={() => setTituloFocado(true)}
                onBlur={() => setTituloFocado(false)}
              />
            </View>

            {/* ─── Campo 3: Classificação de Importância (Baixa, Média, Alta) ─── */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, dynamicStyles.label]}>
                Classificação de Importância *
              </Text>
              <View style={styles.containerPrioridades}>
                {/* Opção 1: Baixa */}
                <TouchableOpacity
                  style={[
                    styles.cardPrioridade,
                    {
                      backgroundColor: prioridade === 1 ? `${theme.chart2}25` : theme.background,
                      borderColor: prioridade === 1 ? theme.chart2 : theme.border,
                    },
                  ]}
                  onPress={() => setPrioridade(1)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: prioridade === 1 }}
                >
                  <Text style={[styles.iconePrioridade]}>🌱</Text>
                  <Text
                    style={[
                      styles.tituloPrioridade,
                      { color: prioridade === 1 ? theme.foreground : theme.mutedForeground },
                      prioridade === 1 && styles.textoPrioridadeAtiva,
                    ]}
                  >
                    Baixa
                  </Text>
                  <Text style={[styles.subtextoPrioridade, { color: theme.mutedForeground }]}>
                    Pode esperar
                  </Text>
                </TouchableOpacity>

                {/* Opção 2: Média */}
                <TouchableOpacity
                  style={[
                    styles.cardPrioridade,
                    {
                      backgroundColor: prioridade === 2 ? `${theme.chart1}25` : theme.background,
                      borderColor: prioridade === 2 ? theme.chart1 : theme.border,
                    },
                  ]}
                  onPress={() => setPrioridade(2)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: prioridade === 2 }}
                >
                  <Text style={[styles.iconePrioridade]}>⭐</Text>
                  <Text
                    style={[
                      styles.tituloPrioridade,
                      { color: prioridade === 2 ? theme.foreground : theme.mutedForeground },
                      prioridade === 2 && styles.textoPrioridadeAtiva,
                    ]}
                  >
                    Média
                  </Text>
                  <Text style={[styles.subtextoPrioridade, { color: theme.mutedForeground }]}>
                    Desejável
                  </Text>
                </TouchableOpacity>

                {/* Opção 3: Alta */}
                <TouchableOpacity
                  style={[
                    styles.cardPrioridade,
                    {
                      backgroundColor: prioridade === 3 ? `${theme.primary}25` : theme.background,
                      borderColor: prioridade === 3 ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setPrioridade(3)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: prioridade === 3 }}
                >
                  <Text style={[styles.iconePrioridade]}>🔥</Text>
                  <Text
                    style={[
                      styles.tituloPrioridade,
                      { color: prioridade === 3 ? theme.foreground : theme.mutedForeground },
                      prioridade === 3 && styles.textoPrioridadeAtiva,
                    ]}
                  >
                    Alta
                  </Text>
                  <Text style={[styles.subtextoPrioridade, { color: theme.mutedForeground }]}>
                    Prioritário
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* ─── Botões de Ação do Rodapé ─── */}
          <View style={[styles.rodapeAcoes, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.botaoAcao, dynamicStyles.botaoSecundario]}
              onPress={aoFechar}
              disabled={salvando}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={[styles.textoBotaoAcao, dynamicStyles.botaoSecundarioTexto]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoAcao,
                dynamicStyles.botaoPrimario,
                (salvando || carregandoMetadados) && { opacity: 0.75 },
              ]}
              onPress={handleSalvar}
              disabled={salvando || carregandoMetadados}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Salvar Desejo"
            >
              {salvando ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.textoBotaoAcao, dynamicStyles.botaoPrimarioTexto]}>
                  Salvar Desejo
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Estilos Estáticos do Modal ───────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  titulosContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  tituloModal: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtituloModal: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xxs,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoFechar: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  scrollConteudo: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  cardErro: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textoErro: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
  },
  grupoCampo: {
    gap: spacing.xs,
  },
  rotuloCampo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
  },
  linhaInputLink: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  inputLink: {
    flex: 1,
  },
  botaoBuscar: {
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoBuscar: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  linhaStatusCarregamento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  textoStatusCarregamento: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
  cardPreview: {
    height: 140,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagemProduto: {
    width: '100%',
    height: '100%',
  },
  placeholderImagem: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textoIconePlaceholder: {
    fontSize: 32,
  },
  textoPlaceholder: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
  containerPrioridades: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardPrioridade: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  iconePrioridade: {
    fontSize: 20,
    marginBottom: spacing.xxs,
  },
  tituloPrioridade: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  textoPrioridadeAtiva: {
    fontWeight: typography.weights.bold,
  },
  subtextoPrioridade: {
    fontSize: 10,
    fontFamily: typography.fonts.sans,
  },
  rodapeAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
  },
  botaoAcao: {
    minWidth: 110,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  textoBotaoAcao: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
});
