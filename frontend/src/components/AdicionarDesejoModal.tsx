/**
 * AdicionarDesejoModal.tsx — Quick Creation Bottom Sheet Monocromático
 *
 * Folha inferior deslizante (Bottom Sheet) que herda automaticamente link,
 * imagem, título e preço do produto e permite classificar importância por
 * tags seletoras em formato pílula ("Baixa", "Média" e "Alta").
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
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../api/client';
import { useTheme, spacing, radius, shadows, typography } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import PriceTag from './home/PriceTag';

/** Converte valor numérico em string formatada em Real (ex: "88,02") */
export function formatarPrecoParaInput(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const num =
    typeof valor === 'number'
      ? valor
      : parseFloat(
          String(valor)
            .replace(/[^\d,.-]/g, '')
            .replace(/\.(?=\d{3})/g, '')
            .replace(',', '.')
        );
  if (!Number.isFinite(num) || num <= 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte texto digitado pelo usuário em número float */
export function converterInputParaNumero(texto: string): number | null {
  if (!texto || !texto.trim()) return null;
  const limpo = texto
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const num = parseFloat(limpo);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
}

export interface DesejoItem {
  id: string;
  user_id: string;
  url: string;
  title: string;
  image_url: string | null;
  priority: number;
  price?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export type NivelPrioridade = 1 | 2 | 3; // 1 = Baixa, 2 = Média, 3 = Alta

interface PropsModalAdicionarDesejo {
  visivel: boolean;
  aoFechar: () => void;
  aoSalvarSucesso: (novoDesejo: DesejoItem) => void;
  urlInicial?: string;
}

const OPCOES_TAGS_PILULA: { nivel: NivelPrioridade; simbolo: string; rotulo: string; subtitulo: string }[] = [
  { nivel: 3, simbolo: '●', rotulo: 'Alta', subtitulo: 'Prioritário' },
  { nivel: 2, simbolo: '◐', rotulo: 'Média', subtitulo: 'Desejável' },
  { nivel: 1, simbolo: '○', rotulo: 'Baixa', subtitulo: 'Pode esperar' },
];

export default function AdicionarDesejoModal({
  visivel,
  aoFechar,
  aoSalvarSucesso,
  urlInicial = '',
}: PropsModalAdicionarDesejo) {
  const theme = useTheme();
  const r = useResponsive();

  const [url, setUrl] = useState(urlInicial);
  const [titulo, setTitulo] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [preco, setPreco] = useState('');
  const [prioridade, setPrioridade] = useState<NivelPrioridade>(3);

  const [precoOriginalExtraido, setPrecoOriginalExtraido] = useState<number | null>(null);
  const [metadadosJaBuscados, setMetadadosJaBuscados] = useState(false);
  const [carregandoMetadados, setCarregandoMetadados] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [urlFocada, setUrlFocada] = useState(false);
  const [tituloFocado, setTituloFocado] = useState(false);
  const [precoFocado, setPrecoFocado] = useState(false);
  const [precoDetectado, setPrecoDetectado] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Inicializa o formulário ao abrir o Bottom Sheet (ou dispara extração para links compartilhados)
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

  const limparFormulario = () => {
    setUrl('');
    setTitulo('');
    setImagemUrl(null);
    setPreco('');
    setPrecoDetectado(false);
    setPrecoOriginalExtraido(null);
    setMetadadosJaBuscados(false);
    setPrioridade(3);
    setMensagemErro(null);
  };

  // Extrai automaticamente título, imagem e preço via scraping OpenGraph / JSON-LD
  const buscarMetadados = async (urlParaBuscar?: string) => {
    const alvoUrl = (urlParaBuscar || url).trim();

    if (!alvoUrl) {
      setMensagemErro('Informe o link do produto antes de buscar.');
      return;
    }

    setCarregandoMetadados(true);
    setMensagemErro(null);

    try {
      const resposta = await client.post('/wishlist/preview', { url: alvoUrl });
      const dados = resposta.data || {};
      const tituloExtraido = dados.titulo || dados.title;
      const imagemExtraida = dados.imagem_url || dados.image_url;
      // Extrai preço com fallback tanto para price quanto preco
      const precoExtraidoBruto = dados.price !== undefined && dados.price !== null ? dados.price : dados.preco;
      const precoExtraido =
        precoExtraidoBruto !== undefined && precoExtraidoBruto !== null && !isNaN(Number(precoExtraidoBruto))
          ? Number(precoExtraidoBruto)
          : null;

      if (tituloExtraido) setTitulo(tituloExtraido);
      if (imagemExtraida) setImagemUrl(imagemExtraida);
      if (precoExtraido !== null) {
        setPreco(formatarPrecoParaInput(precoExtraido));
        setPrecoDetectado(true);
        setPrecoOriginalExtraido(precoExtraido);
      } else {
        setPrecoOriginalExtraido(null);
      }
      setMetadadosJaBuscados(true);
    } catch (erro: any) {
      setMetadadosJaBuscados(true);
      if (erro?.response?.status === 401) {
        setMensagemErro('Sua sessão expirou. Por favor, faça login novamente para consultar produtos.');
      } else {
        console.warn('Erro ao extrair metadados do link:', erro);
      }
      if (!titulo) {
        try {
          const dominio = new URL(
            alvoUrl.startsWith('http') ? alvoUrl : `https://${alvoUrl}`
          ).hostname;
          setTitulo(`Item de ${dominio.replace('www.', '')}`);
        } catch {
          // Mantém título editável pelo usuário
        }
      }
    } finally {
      setCarregandoMetadados(false);
    }
  };

  // Persiste o novo desejo na API REST
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
      const valorNumerico = converterInputParaNumero(preco);

      const resposta = await client.post('/wishlist/', {
        url: urlLimpa,
        titulo: tituloLimpo,
        imagem_url: imagemUrl,
        prioridade,
        price: valorNumerico,
        preco: valorNumerico,
      });

      const desejoSalvo: DesejoItem = resposta.data;
      limparFormulario();
      aoSalvarSucesso(desejoSalvo);
      aoFechar();
    } catch (erro: any) {
      if (erro?.response?.status === 401) {
        setMensagemErro('Sua sessão expirou. Por favor, faça login novamente para salvar desejos.');
      } else {
        console.error('Erro ao salvar desejo:', erro);
        const msg =
          erro.response?.data?.detail?.mensagem ||
          'Não foi possível salvar o desejo. Tente novamente.';
        setMensagemErro(msg);
        if (Platform.OS !== 'web') {
          Alert.alert('Erro', msg);
        }
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={aoFechar}
    >
      <KeyboardAvoidingView
        style={[
          styles.overlay,
          { justifyContent: r.isDesktop ? 'center' : 'flex-end' },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={aoFechar} />

        <View
          style={[
            styles.sheetCard,
            r.isDesktop ? styles.sheetDesktop : styles.sheetMobile,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            shadows.lg,
          ]}
        >
          {/* Alça minimalista de arraste característica de Bottom Sheet iOS */}
          <View style={[styles.alcaArraste, { backgroundColor: theme.input }]} />

          {/* Cabeçalho */}
          <View style={styles.cabecalho}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>
                QUICK CREATION SHEET
              </Text>
              <Text style={[styles.tituloModal, { color: theme.foreground }]}>
                Novo Item Prioritário
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.botaoFechar, { backgroundColor: theme.secondary }]}
              onPress={aoFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar modal"
            >
              <Feather name="x" size={16} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollConteudo}
          >
            {mensagemErro && (
              <View
                style={[
                  styles.cardErro,
                  { backgroundColor: theme.secondary, borderColor: theme.primary },
                ]}
              >
                <Feather name="alert-circle" size={14} color={theme.foreground} />
                <Text style={[styles.textoErro, { color: theme.foreground }]}>
                  {mensagemErro}
                </Text>
              </View>
            )}

            {/* 1. Link do Produto + Extração Automática */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, { color: theme.foreground }]}>
                LINK DO PRODUTO
              </Text>
              <View style={styles.linhaInputLink}>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputLink,
                    {
                      backgroundColor: urlFocada ? theme.background : theme.card,
                      borderColor: urlFocada ? theme.primary : theme.border,
                      color: theme.foreground,
                    },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  placeholder="https://loja.com/produto"
                  placeholderTextColor={theme.mutedForeground}
                  value={url}
                  onChangeText={(texto) => {
                    setUrl(texto);
                    if (mensagemErro) setMensagemErro(null);
                  }}
                  onFocus={() => setUrlFocada(true)}
                  onBlur={() => {
                    setUrlFocada(false);
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
                    {
                      backgroundColor: theme.primary,
                      opacity: carregandoMetadados || !url.trim() ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => buscarMetadados()}
                  disabled={carregandoMetadados || !url.trim()}
                  activeOpacity={0.85}
                  accessibilityLabel="Buscar dados do link"
                >
                  {carregandoMetadados ? (
                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                  ) : (
                    <Text style={[styles.textoBotaoBuscar, { color: theme.primaryForeground }]}>
                      Extrair
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Tags Seletoras de Prioridade em Formato Pílula (Pill Priority Selector Tags) */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, { color: theme.foreground }]}>
                CLASSIFICAÇÃO DE IMPORTÂNCIA (TAGS PÍLULA)
              </Text>
              <View style={styles.gradePilulasPrioridade}>
                {OPCOES_TAGS_PILULA.map((op) => {
                  const selecionada = prioridade === op.nivel;
                  return (
                    <TouchableOpacity
                      key={op.nivel}
                      style={[
                        styles.pilulaPrioridade,
                        {
                          backgroundColor: selecionada ? theme.primary : theme.card,
                          borderColor: selecionada ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setPrioridade(op.nivel)}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selecionada }}
                    >
                      <Text
                        style={[
                          styles.textoPilulaTitulo,
                          {
                            color: selecionada ? theme.primaryForeground : theme.foreground,
                          },
                        ]}
                      >
                        {op.simbolo} {op.rotulo}
                      </Text>
                      <Text
                        style={[
                          styles.textoPilulaSub,
                          {
                            color: selecionada
                              ? theme.primaryForeground
                              : theme.mutedForeground,
                            opacity: selecionada ? 0.8 : 1,
                          },
                        ]}
                      >
                        {op.subtitulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Pré-visualização Compacta da Imagem Herdada */}
            <View
              style={[
                styles.cardPreview,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {imagemUrl ? (
                <Image
                  source={{ uri: imagemUrl }}
                  style={styles.imagemProduto}
                  resizeMode="contain"
                  accessibilityLabel="Imagem do produto"
                />
              ) : (
                <View style={styles.placeholderImagem}>
                  <Feather name="image" size={24} color={theme.mutedForeground} />
                  <Text style={[styles.textoPlaceholder, { color: theme.mutedForeground }]}>
                    {carregandoMetadados
                      ? 'Extraindo imagem e título...'
                      : 'A imagem herdada aparecerá aqui'}
                  </Text>
                </View>
              )}

              {converterInputParaNumero(preco) !== null && (
                <View
                  style={[
                    styles.tagPrecoFlutuante,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <PriceTag
                    value={converterInputParaNumero(preco)!}
                    color={theme.foreground}
                    size="sm"
                  />
                </View>
              )}
            </View>

            {/* 4. Seção Informativa: VALOR EXTRAÍDO DO LINK */}
            {metadadosJaBuscados && (
              <View
                style={[
                  styles.cardValorExtraido,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.linhaCabecalhoValorExtraido}>
                  <View style={styles.rotuloComIcone}>
                    <Feather name="tag" size={13} color={theme.foreground} />
                    <Text style={[styles.eyebrowValor, { color: theme.foreground }]}>
                      VALOR EXTRAÍDO DO LINK
                    </Text>
                  </View>

                  {precoOriginalExtraido !== null ? (
                    <View
                      style={[
                        styles.badgeAutomatico,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <Text style={[styles.textoBadgeAutomatico, { color: theme.primaryForeground }]}>
                        ● Automático
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.badgeManual,
                        { backgroundColor: theme.secondary, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.textoBadgeManual, { color: theme.mutedForeground }]}>
                        ○ Não detectado
                      </Text>
                    </View>
                  )}
                </View>

                {precoOriginalExtraido !== null ? (
                  <View style={styles.corpoValorExtraido}>
                    <View style={styles.linhaValorPrincipal}>
                      <PriceTag
                        value={precoOriginalExtraido}
                        color={theme.foreground}
                        size="md"
                      />
                      {converterInputParaNumero(preco) !== precoOriginalExtraido && (
                        <TouchableOpacity
                          onPress={() => {
                            setPreco(formatarPrecoParaInput(precoOriginalExtraido));
                            setPrecoDetectado(true);
                          }}
                          style={[
                            styles.botaoRestaurarPreco,
                            { backgroundColor: theme.secondary, borderColor: theme.border },
                          ]}
                          accessibilityLabel="Restaurar valor extraído do link"
                          activeOpacity={0.8}
                        >
                          <Feather name="rotate-ccw" size={11} color={theme.foreground} />
                          <Text style={[styles.textoRestaurar, { color: theme.foreground }]}>
                            Restaurar original
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.explicacaoValor, { color: theme.mutedForeground }]}>
                      Valor extraído do link do produto com sucesso. Você pode editá-lo no campo abaixo se desejar.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.corpoValorNaoDetectado}>
                    <Text style={[styles.explicacaoValor, { color: theme.mutedForeground }]}>
                      Valor não informado ou não detectado na página do produto. Digite o valor manualmente no campo abaixo se desejar acompanhá-lo.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 5. Título Editável */}
            <View style={styles.grupoCampo}>
              <Text style={[styles.rotuloCampo, { color: theme.foreground }]}>
                TÍTULO DO PRODUTO
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: tituloFocado ? theme.background : theme.card,
                    borderColor: tituloFocado ? theme.primary : theme.border,
                    color: theme.foreground,
                  },
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
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

            {/* 6. Edição do Valor em Reais */}
            <View style={styles.grupoCampo}>
              <View style={styles.linhaRotuloComBadge}>
                <Text style={[styles.rotuloCampo, { color: theme.foreground, marginBottom: 0 }]}>
                  VALOR ESTIMADO (OPCIONAL)
                </Text>
                {precoOriginalExtraido !== null && (
                  <View
                    style={[
                      styles.miniBadgeExtraido,
                      { backgroundColor: theme.secondary, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.textoMiniBadge, { color: theme.mutedForeground }]}>
                      Link: R$ {formatarPrecoParaInput(precoOriginalExtraido)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.inputPrecoContainer}>
                <View
                  style={[
                    styles.prefixoMoeda,
                    { backgroundColor: theme.secondary, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.textoPrefixoMoeda, { color: theme.foreground }]}>R$</Text>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputPreco,
                    {
                      backgroundColor: precoFocado ? theme.background : theme.card,
                      borderColor: precoFocado ? theme.primary : theme.border,
                      color: theme.foreground,
                    },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                  placeholder="0,00"
                  placeholderTextColor={theme.mutedForeground}
                  value={preco}
                  onChangeText={(texto) => {
                    setPreco(texto.replace(/[^\d,.]/g, ''));
                    setPrecoDetectado(false);
                  }}
                  onFocus={() => setPrecoFocado(true)}
                  onBlur={() => {
                    setPrecoFocado(false);
                    const n = converterInputParaNumero(preco);
                    if (n !== null) setPreco(formatarPrecoParaInput(n));
                  }}
                  keyboardType="numeric"
                />
              </View>
              {precoDetectado && (
                <Text style={[styles.ajudaPreco, { color: theme.mutedForeground }]}>
                  Valor preenchido automaticamente a partir da página do produto.
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Rodapé em Pílula */}
          <View style={[styles.rodapeAcoes, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.botaoSecundario,
                { backgroundColor: theme.secondary, borderColor: theme.border },
              ]}
              onPress={aoFechar}
              disabled={salvando}
            >
              <Text style={[styles.textoSecundario, { color: theme.foreground }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoPrimario,
                {
                  backgroundColor: theme.primary,
                  opacity: salvando || carregandoMetadados ? 0.7 : 1,
                },
              ]}
              onPress={handleSalvar}
              disabled={salvando || carregandoMetadados}
              activeOpacity={0.88}
            >
              {salvando ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.textoPrimario, { color: theme.primaryForeground }]}>
                  + Salvar na Lista
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.45)',
  },
  sheetCard: {
    width: '100%',
    maxHeight: '92%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetDesktop: {
    maxWidth: 520,
    borderRadius: radius.xl,
    margin: spacing.lg,
  },
  sheetMobile: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 0,
  },
  alcaArraste: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 10,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 14,
  },
  eyebrow: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tituloModal: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fonts.sans,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  botaoFechar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollConteudo: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 14,
  },
  cardErro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textoErro: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    fontWeight: '600',
  },
  grupoCampo: {
    gap: 7,
  },
  rotuloCampo: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.mono,
    letterSpacing: 0.5,
  },
  linhaInputLink: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: typography.fonts.sans,
  },
  inputLink: {
    flex: 1,
  },
  botaoBuscar: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoBuscar: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  gradePilulasPrioridade: {
    flexDirection: 'row',
    gap: 8,
  },
  pilulaPrioridade: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  textoPilulaTitulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  textoPilulaSub: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '500',
  },
  cardPreview: {
    height: 124,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  imagemProduto: {
    width: '100%',
    height: '100%',
  },
  placeholderImagem: {
    alignItems: 'center',
    gap: 6,
  },
  textoPlaceholder: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
  },
  tagPrecoFlutuante: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  cardValorExtraido: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 8,
  },
  linhaCabecalhoValorExtraido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotuloComIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowValor: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badgeAutomatico: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  textoBadgeAutomatico: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeManual: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoBadgeManual: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '600',
  },
  corpoValorExtraido: {
    gap: 4,
  },
  linhaValorPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botaoRestaurarPreco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoRestaurar: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  corpoValorNaoDetectado: {
    paddingVertical: 2,
  },
  explicacaoValor: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },
  linhaRotuloComBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  miniBadgeExtraido: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoMiniBadge: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '600',
  },
  inputPrecoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixoMoeda: {
    height: 46,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderWidth: 1.5,
    borderRightWidth: 0,
  },
  textoPrefixoMoeda: {
    fontFamily: typography.fonts.mono,
    fontSize: 13,
    fontWeight: '700',
  },
  inputPreco: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  ajudaPreco: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
  },
  rodapeAcoes: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  botaoSecundario: {
    flex: 1,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSecundario: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
  },
  botaoPrimario: {
    flex: 1.5,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPrimario: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
