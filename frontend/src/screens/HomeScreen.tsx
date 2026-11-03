/**
 * HomeScreen.tsx — Painel Principal Monocromático de Alto Contraste do Prioritize
 *
 * Integra as 4 visões e interações do novo Design System unificado:
 * 1) Dashboard com Gráfico Semanal de Conclusão, Métricas-Chave e Lista/Matriz Kanban
 * 2) Criação Rápida via Bottom Sheet com Tags Pílula de Prioridade (Baixa, Média, Alta)
 * 3) Checklist Focado (aba Foco) com interações limpas de checkbox e barra de progresso
 * 4) Registro de Atividades (aba Log) com bolhas minimalistas de linha do tempo
 *
 * Navegação mobile via Floating Pill Navigation Bar (BottomNav) e DesktopHeader responsivo.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../theme';
import client from '../api/client';
import AdicionarDesejoModal from '../components/AdicionarDesejoModal';
import GerenciarContaModal from '../components/GerenciarContaModal';
import ConfirmarExclusaoModal from '../components/ConfirmarExclusaoModal';
import { encerrarSessao } from '../utils/validacao';
import SearchBar from '../components/home/SearchBar';
import SectionHeader from '../components/home/SectionHeader';
import ProductCard, { PRIORITY_CONFIG } from '../components/home/ProductCard';
import EditarDesejoModal from '../components/home/EditarDesejoModal';
import BottomNav, { BOTTOM_NAV_HEIGHT, HomeTab } from '../components/home/BottomNav';
import DesktopHeader from '../components/home/DesktopHeader';
import BotaoNovoDesejo from '../components/home/BotaoNovoDesejo';
import FilterSortBar from '../components/home/FilterSortBar';
import ModalOrdenacao, { OPCOES_ORDENACAO } from '../components/home/ModalOrdenacao';
import KanbanBoard from '../components/home/KanbanBoard';
import ProductListItem from '../components/home/ProductListItem';
import PainelMetricasGrafico from '../components/home/PainelMetricasGrafico';
import ChecklistDesejos from '../components/home/ChecklistDesejos';
import RegistroAtividades from '../components/home/RegistroAtividades';
import { useResponsive } from '../hooks/useResponsive';
import { useCompartilhamento } from '../hooks/useCompartilhamento';
import { WishlistItem, TipoOrdenacao, ModoVisualizacao, EventoAtividade } from '../types';

const APP_NAME = 'Prioritize';
const STORAGE_KEY_MODO_VISUALIZACAO = 'prioritize_view_mode';
const STORAGE_KEY_CONCLUIDOS = 'prioritize_checklist_concluidos';

/** Obtém o modo de visualização inicial salvo em disco (Web) ou padrão (grade) */
const obterModoVisualizacaoInicial = (): ModoVisualizacao => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY_MODO_VISUALIZACAO);
      if (salvo === 'grid' || salvo === 'list' || salvo === 'kanban') {
        return salvo as ModoVisualizacao;
      }
    } catch {
      // Silencia falha em storage protegido
    }
  }
  return 'grid';
};

/** Recupera os IDs de itens marcados como concluídos no navegador (Web) */
const obterIdsConcluidosIniciais = (): string[] => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY_CONCLUIDOS);
      if (salvo) {
        const lista = JSON.parse(salvo);
        if (Array.isArray(lista)) return lista.map(String);
      }
    } catch {
      // Silencia erro de leitura no localStorage
    }
  }
  return [];
};

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const { urlCompartilhada, consumirUrl } = useCompartilhamento();

  // Estados de dados da API
  const [desejos, setDesejos] = useState<WishlistItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState<string>('');

  // Estados de produtividade: checklist concluídos e log de atividades da sessão
  const [idsConcluidos, setIdsConcluidos] = useState<string[]>(obterIdsConcluidosIniciais);
  const [eventosSessao, setEventosSessao] = useState<EventoAtividade[]>([]);

  // Modais e Bottom Sheets
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
  const [modalOrdenacaoVisivel, setModalOrdenacaoVisivel] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<WishlistItem | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<{ id: string; titulo?: string | null } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [urlCompartilhadaModal, setUrlCompartilhadaModal] = useState('');

  // Filtros, ordenação, busca e aba ativa
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');
  const [selectedLoja, setSelectedLoja] = useState<string | 'ALL'>('ALL');
  const [ordem, setOrdem] = useState<TipoOrdenacao>('prioridade_desc');
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>(obterModoVisualizacaoInicial);
  const [view, setView] = useState<HomeTab>('home');
  const [offersExpanded, setOffersExpanded] = useState(false);

  // Registra um novo evento na linha do tempo minimalista (Activity Log)
  const registrarEvento = useCallback(
    (evento: Omit<EventoAtividade, 'id' | 'dataIso'>) => {
      const novoEvento: EventoAtividade = {
        ...evento,
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dataIso: new Date().toISOString(),
      };
      setEventosSessao((prev) => [novoEvento, ...prev]);
    },
    []
  );

  // Escuta URLs compartilhadas de outros aplicativos e abre automaticamente o modal
  useEffect(() => {
    if (urlCompartilhada) {
      const linkExtraido = consumirUrl();
      if (linkExtraido) {
        setUrlCompartilhadaModal(linkExtraido);
        setModalVisivel(true);
      }
    }
  }, [urlCompartilhada, consumirUrl]);

  // 1. Carregamento dos Desejos via API com tratamento de expiração de token
  const carregarDesejos = useCallback(async () => {
    try {
      const resposta = await client.get('/wishlist/');
      setDesejos(resposta.data || []);
    } catch (erro: any) {
      if (erro?.response?.status === 401) {
        await encerrarSessao();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      console.warn('Erro ao carregar lista de desejos:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [navigation]);

  // 2. Carregamento do Perfil do Usuário
  const carregarPerfil = useCallback(async () => {
    try {
      const resposta = await client.get('/auth/me');
      if (resposta.data && resposta.data.email) {
        setUsuarioEmail(resposta.data.email);
      }
    } catch (erro: any) {
      if (erro?.response?.status === 401) {
        await encerrarSessao();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      console.warn('Falha ao obter perfil do usuário atual:', erro);
    }
  }, [navigation]);

  useEffect(() => {
    carregarDesejos();
    carregarPerfil();

    // Na Web, escuta evento global emitido pelo interceptor Axios caso a sessão expire
    const tratarSessaoExpirada = () => {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('prioritize:sessao-expirada', tratarSessaoExpirada);
    }

    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('prioritize:sessao-expirada', tratarSessaoExpirada);
      }
    };
  }, [carregarDesejos, carregarPerfil, navigation]);

  const onRefresh = useCallback(() => {
    setAtualizando(true);
    carregarDesejos();
  }, [carregarDesejos]);

  // Alterna o estado de conclusão (checkbox) de um item e grava no Activity Log
  const handleAlternarConclusao = useCallback(
    (item: WishlistItem) => {
      setIdsConcluidos((prev) => {
        const jaConcluido = prev.includes(item.id);
        const proximaLista = jaConcluido
          ? prev.filter((id) => id !== item.id)
          : [...prev, item.id];

        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(STORAGE_KEY_CONCLUIDOS, JSON.stringify(proximaLista));
          } catch {
            // Silencia erro de escrita no storage
          }
        }

        registrarEvento({
          simbolo: jaConcluido ? '↺' : '✓',
          destaque: !jaConcluido,
          titulo: jaConcluido
            ? `Reabriu "${item.title || 'Item sem título'}"`
            : `Concluiu "${item.title || 'Item sem título'}"`,
          detalhe: jaConcluido ? 'Movido novamente para pendentes' : 'Marcado como adquirido no checklist',
        });

        return proximaLista;
      });
    },
    [registrarEvento]
  );

  // Ações de Conta
  const handleAbrirModalConta = () => setModalContaVisivel(true);
  const handleFecharModalConta = () => setModalContaVisivel(false);

  const handleDeslogar = async () => {
    handleFecharModalConta();
    await encerrarSessao();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleCriarNovaConta = async () => {
    handleFecharModalConta();
    await encerrarSessao();
    navigation.reset({ index: 0, routes: [{ name: 'Register' }] });
  };

  const handleMudarDeConta = async () => {
    handleFecharModalConta();
    await encerrarSessao();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // Ações de Adicionar Desejo (Quick Creation Bottom Sheet)
  const handleAbrirModal = () => {
    setUrlCompartilhadaModal('');
    setModalVisivel(true);
  };

  const handleFecharModalDesejo = () => {
    setModalVisivel(false);
    setUrlCompartilhadaModal('');
  };

  const handleDesejoCriado = (novoDesejo: any) => {
    setDesejos((prev) => [novoDesejo, ...prev]);
    const conf = PRIORITY_CONFIG[Number(novoDesejo.priority) || 2];
    registrarEvento({
      simbolo: '+',
      destaque: Number(novoDesejo.priority) === 3,
      titulo: `Criou "${novoDesejo.title || 'Novo desejo'}"`,
      detalhe: `Classificado como ${conf?.label || 'Média'} Prioridade`,
    });
  };

  // Ações de Editar Desejo
  const handleAbrirEditar = (item: WishlistItem) => {
    setItemParaEditar(item);
    setModalEditarVisivel(true);
  };

  const handleFecharModalEditar = () => {
    setModalEditarVisivel(false);
    setItemParaEditar(null);
  };

  const handleDesejoAtualizado = (itemAtualizado: WishlistItem) => {
    setDesejos((prev) =>
      prev.map((d) => (d.id === itemAtualizado.id ? { ...d, ...itemAtualizado } : d))
    );
    const conf = PRIORITY_CONFIG[Number(itemAtualizado.priority) || 2];
    registrarEvento({
      simbolo: '✎',
      destaque: false,
      titulo: `Atualizou "${itemAtualizado.title || 'Desejo'}"`,
      detalhe: `Prioridade definida para ${conf?.label || 'Média'}`,
    });
  };

  // Ação de Exclusão de Desejo via Modal Estilizado de Confirmação
  const handleExcluirDesejo = (id: string, titulo?: string | null) => {
    setItemParaExcluir({ id, titulo });
  };

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    const { id, titulo } = itemParaExcluir;
    setExcluindo(true);
    try {
      await client.delete(`/wishlist/${id}`);
      setDesejos((prev) => prev.filter((item) => item.id !== id));
      registrarEvento({
        simbolo: '✕',
        destaque: false,
        titulo: `Removeu "${titulo || 'Item'}"`,
        detalhe: 'Excluído permanentemente da lista',
      });
      setItemParaExcluir(null);
    } catch (erro) {
      console.error('Erro ao excluir desejo:', erro);
      Alert.alert('Erro', 'Não foi possível excluir o item.');
    } finally {
      setExcluindo(false);
    }
  };

  // Conversão segura para o tipo WishlistItem
  const wishlistItems: WishlistItem[] = useMemo(() => {
    return desejos.map((d) => ({
      id: d.id,
      user_id: d.user_id,
      url: d.url,
      title: d.title,
      image_url: d.image_url,
      priority: Number(d.priority) || 2,
      price: d.price !== undefined ? d.price : null,
      created_at: d.created_at,
      updated_at: d.updated_at || undefined,
    }));
  }, [desejos]);

  // Extração de lojas / domínios únicos presentes na lista de desejos
  const lojasDisponiveis = useMemo(() => {
    const mapa = new Map<string, number>();
    wishlistItems.forEach((item) => {
      if (item.url) {
        try {
          const dom = item.url
            .replace(/^https?:\/\/(www\.)?/, '')
            .split('/')[0]
            .toLowerCase();
          if (dom) {
            mapa.set(dom, (mapa.get(dom) || 0) + 1);
          }
        } catch {
          // ignora url com parsing inválido
        }
      }
    });
    return Array.from(mapa.entries()).map(([dominio, total]) => ({
      dominio,
      total,
    }));
  }, [wishlistItems]);

  // Comparador configurável para ordenação dos itens
  const comparatorOrdenacao = useCallback(
    (a: WishlistItem, b: WishlistItem) => {
      switch (ordem) {
        case 'prioridade_asc':
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case 'recentes':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case 'antigos':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

        case 'alfabetica_az':
          return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });

        case 'alfabetica_za':
          return (b.title || '').localeCompare(a.title || '', 'pt-BR', { sensitivity: 'base' });

        case 'prioridade_desc':
        default:
          if (b.priority !== a.priority) {
            return b.priority - a.priority;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    },
    [ordem]
  );

  // Filtragem combinada por prioridade, loja/domínio e busca textual com ordenação aplicada
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wishlistItems
      .filter((i) => selectedFilter === 'ALL' || i.priority === selectedFilter)
      .filter((i) => {
        if (selectedLoja === 'ALL') return true;
        const dom = (i.url || '')
          .replace(/^https?:\/\/(www\.)?/, '')
          .split('/')[0]
          .toLowerCase();
        return dom.includes(selectedLoja.toLowerCase());
      })
      .filter(
        (i) =>
          !q ||
          (i.title || '').toLowerCase().includes(q) ||
          (i.url || '').toLowerCase().includes(q)
      )
      .sort(comparatorOrdenacao);
  }, [wishlistItems, selectedFilter, selectedLoja, query, comparatorOrdenacao]);

  // Contador de filtros aplicados
  const totalFiltrosAtivos = useMemo(() => {
    let cont = 0;
    if (selectedFilter !== 'ALL') cont++;
    if (selectedLoja !== 'ALL') cont++;
    if (ordem !== 'prioridade_desc') cont++;
    if (query.trim().length > 0) cont++;
    return cont;
  }, [selectedFilter, selectedLoja, ordem, query]);

  // Reseta todos os filtros para o estado padrão
  const handleLimparFiltros = useCallback(() => {
    setSelectedFilter('ALL');
    setSelectedLoja('ALL');
    setOrdem('prioridade_desc');
    setQuery('');
  }, []);

  // Altera o modo de visualização e persiste a escolha no navegador (Web)
  const handleAlterarModoVisualizacao = useCallback((novoModo: ModoVisualizacao) => {
    setModoVisualizacao(novoModo);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_MODO_VISUALIZACAO, novoModo);
      } catch {
        // Silencia em ambientes com storage inacessível
      }
    }
  }, []);

  // Separação inteligente por destaque de prioridade
  const { topPicks, offers, categoryTitle } = useMemo(() => {
    if (selectedFilter !== 'ALL' || selectedLoja !== 'ALL' || ordem !== 'prioridade_desc') {
      let rotulo = 'produtos';
      if (selectedFilter !== 'ALL') {
        const label = PRIORITY_CONFIG[selectedFilter]?.label.toLowerCase() || 'prioridade';
        rotulo = `${label} prioridade`;
      } else if (selectedLoja !== 'ALL') {
        rotulo = selectedLoja;
      }
      return {
        topPicks: filteredItems,
        offers: [],
        categoryTitle: rotulo,
      };
    }

    const hasAlta = filteredItems.some((i) => i.priority === 3);
    const hasMedia = filteredItems.some((i) => i.priority === 2);

    if (hasAlta) {
      const alta = filteredItems.filter((i) => i.priority === 3);
      const restantes = filteredItems.filter((i) => i.priority < 3);
      return {
        topPicks: alta,
        offers: restantes,
        categoryTitle: 'alta prioridade',
      };
    }

    if (hasMedia) {
      const media = filteredItems.filter((i) => i.priority === 2);
      const baixa = filteredItems.filter((i) => i.priority === 1);
      return {
        topPicks: media,
        offers: baixa,
        categoryTitle: 'média prioridade',
      };
    }

    return {
      topPicks: filteredItems,
      offers: [],
      categoryTitle: 'produtos',
    };
  }, [filteredItems, selectedFilter, selectedLoja, ordem]);

  // Lista monocromática de filtros em formato pílula (3: Alta, 2: Média, 1: Baixa)
  const priorityOptions = useMemo(() => {
    const countAlta = desejos.filter((d) => Number(d.priority) === 3).length;
    const countMedia = desejos.filter((d) => Number(d.priority) === 2).length;
    const countBaixa = desejos.filter((d) => Number(d.priority) === 1).length;

    return [
      {
        value: 'ALL' as const,
        label: `Todos (${desejos.length})`,
        color: theme.primary,
        activeBg: theme.primary,
      },
      {
        value: 3,
        label: `● Alta (${countAlta})`,
        color: theme.primary,
        activeBg: theme.primary,
      },
      {
        value: 2,
        label: `◐ Média (${countMedia})`,
        color: theme.primary,
        activeBg: theme.primary,
      },
      {
        value: 1,
        label: `○ Baixa (${countBaixa})`,
        color: theme.primary,
        activeBg: theme.primary,
      },
    ];
  }, [desejos, theme.primary]);

  // Navegação unificada entre Dashboard, Checklist Focado, Activity Log e Modais
  const handleNav = (tab: HomeTab) => {
    if (tab === 'home') {
      setView('home');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'checklist') {
      setView('checklist');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'activity') {
      setView('activity');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'account') {
      handleAbrirModalConta();
    } else if (tab === 'explore') {
      setModalOrdenacaoVisivel(true);
    }
  };

  const isSearching = query.trim().length > 0;
  const bottomSpace = r.isDesktop ? 56 : BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 14) + 32;

  const renderGrid = (data: WishlistItem[], keyPrefix: string) => (
    <View style={[styles.grid, { gap: r.gap }]}>
      {data.map((item) => (
        <ProductCard
          key={`${keyPrefix}-${item.id}`}
          item={item}
          width={r.cardWidth}
          compact={!r.isDesktop}
          concluido={idsConcluidos.includes(item.id)}
          onToggleCheck={() => handleAlternarConclusao(item)}
          onEdit={() => handleAbrirEditar(item)}
          onDelete={() => handleExcluirDesejo(item.id, item.title)}
        />
      ))}
    </View>
  );

  const renderCarousel = (data: WishlistItem[]) =>
    r.isDesktop || offersExpanded ? (
      renderGrid(offersExpanded ? data : data.slice(0, r.columns), 'offer')
    ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={r.carouselCardWidth + r.gap}
        snapToAlignment="start"
        style={{ marginHorizontal: -r.horizontalPadding }}
        contentContainerStyle={{ paddingHorizontal: r.horizontalPadding, gap: r.gap }}
      >
        {data.map((item) => (
          <ProductCard
            key={`offer-${item.id}`}
            item={item}
            width={r.carouselCardWidth}
            concluido={idsConcluidos.includes(item.id)}
            onToggleCheck={() => handleAlternarConclusao(item)}
            onEdit={() => handleAbrirEditar(item)}
            onDelete={() => handleExcluirDesejo(item.id, item.title)}
          />
        ))}
      </ScrollView>
    );

  // Renderizador para o modo de lista horizontal minimalista
  const renderList = (data: WishlistItem[], keyPrefix: string) => (
    <View style={styles.listaContainer}>
      {data.map((item) => (
        <ProductListItem
          key={`${keyPrefix}-${item.id}`}
          item={item}
          concluido={idsConcluidos.includes(item.id)}
          onToggleCheck={() => handleAlternarConclusao(item)}
          onEdit={() => handleAbrirEditar(item)}
          onDelete={() => handleExcluirDesejo(item.id, item.title)}
        />
      ))}
    </View>
  );

  // Renderiza o conteúdo principal do Dashboard (aba 'home')
  const renderDashboardContent = () => {
    // 1. Estado vazio inicial
    if (desejos.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.emptyIconBadge, { backgroundColor: theme.secondary }]}>
            <Feather name="layers" size={26} color={theme.foreground} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Sua lista está pronta para começar</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
            Compartilhe ou cole o link de um produto para herdar imagem, título e preço automaticamente e classificá-lo em Baixa, Média ou Alta prioridade.
          </Text>
          <BotaoNovoDesejo
            onPress={handleAbrirModal}
            tamanho="lg"
          />
        </View>
      );
    }

    // 2. Estado sem resultados para o filtro/busca atual
    if (filteredItems.length === 0) {
      return (
        <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.emptyIconBadge, { backgroundColor: theme.secondary }]}>
            <Feather name="sliders" size={24} color={theme.foreground} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Nenhum item correspondente</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
            Não encontramos desejos para os filtros ou termos pesquisados.
          </Text>
          <TouchableOpacity
            onPress={handleLimparFiltros}
            style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="rotate-ccw" size={16} color={theme.primaryForeground} />
            <Text style={[styles.emptyBtnText, { color: theme.primaryForeground }]}>Limpar Filtros</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 3. Visualização em Matriz / Quadro KANBAN por Prioridade (Alta, Média, Baixa)
    if (modoVisualizacao === 'kanban') {
      const tituloKanban = isSearching
        ? `Matriz Kanban — “${query.trim()}”`
        : 'Matriz de Prioridades Kanban';

      return (
        <View style={styles.section}>
          <SectionHeader title={tituloKanban} />
          <KanbanBoard
            items={filteredItems}
            idsConcluidos={idsConcluidos}
            onToggleCheck={handleAlternarConclusao}
            onEdit={handleAbrirEditar}
            onDelete={handleExcluirDesejo}
            isDesktop={r.isDesktop}
          />
        </View>
      );
    }

    // 4. Visualização em LISTA horizontal compacta
    if (modoVisualizacao === 'list') {
      if (isSearching || selectedFilter !== 'ALL' || selectedLoja !== 'ALL' || ordem !== 'prioridade_desc') {
        let tituloSecao = `Itens filtrados (${filteredItems.length})`;
        if (isSearching) {
          tituloSecao = `Resultados para “${query.trim()}” (${filteredItems.length})`;
        } else if (selectedFilter !== 'ALL') {
          const conf = PRIORITY_CONFIG[selectedFilter];
          tituloSecao = `${conf?.label || ''} Prioridade (${filteredItems.length})`;
        } else if (selectedLoja !== 'ALL') {
          tituloSecao = `Loja ${selectedLoja} (${filteredItems.length})`;
        } else {
          const confOrdem = OPCOES_ORDENACAO.find((o) => o.id === ordem);
          tituloSecao = `Ordenado por ${confOrdem?.label.toLowerCase() || 'prioridade'} (${filteredItems.length})`;
        }

        return (
          <View style={styles.section}>
            <SectionHeader title={tituloSecao} />
            {renderList(filteredItems, 'list-filtered')}
          </View>
        );
      }

      return (
        <>
          <View style={styles.section}>
            <SectionHeader title={`Foco Principal · ${categoryTitle}`} />
            {topPicks.length > 0 ? (
              renderList(topPicks, 'list-top')
            ) : (
              <Text style={{ color: theme.mutedForeground, marginVertical: 16 }}>
                Nenhum item com essa prioridade.
              </Text>
            )}
          </View>

          {offers.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Demais itens na fila"
                expanded={offersExpanded}
                moreLabel={r.isDesktop ? (offersExpanded ? 'Ver menos' : 'Ver tudo') : undefined}
                onMorePress={() => setOffersExpanded((v) => !v)}
              />
              {renderList(offersExpanded ? offers : offers.slice(0, 4), 'list-offer')}
            </View>
          )}
        </>
      );
    }

    // 5. Visualização em GRADE (Grid) minimalista
    if (isSearching || selectedFilter !== 'ALL' || selectedLoja !== 'ALL' || ordem !== 'prioridade_desc') {
      let tituloSecao = `Itens filtrados (${filteredItems.length})`;
      if (isSearching) {
        tituloSecao = `Resultados para “${query.trim()}” (${filteredItems.length})`;
      } else if (selectedFilter !== 'ALL') {
        const conf = PRIORITY_CONFIG[selectedFilter];
        tituloSecao = `${conf?.label || ''} Prioridade (${filteredItems.length})`;
      } else if (selectedLoja !== 'ALL') {
        tituloSecao = `Loja ${selectedLoja} (${filteredItems.length})`;
      } else {
        const confOrdem = OPCOES_ORDENACAO.find((o) => o.id === ordem);
        tituloSecao = `Ordenado por ${confOrdem?.label.toLowerCase() || 'prioridade'} (${filteredItems.length})`;
      }

      return (
        <View style={styles.section}>
          <SectionHeader title={tituloSecao} />
          {renderGrid(filteredItems, 'filtered')}
        </View>
      );
    }

    return (
      <>
        <View style={styles.section}>
          <SectionHeader title={`Foco Principal · ${categoryTitle}`} />
          {topPicks.length > 0 ? (
            renderGrid(topPicks, 'top')
          ) : (
            <Text style={{ color: theme.mutedForeground, marginVertical: 16 }}>
              Nenhum item com essa prioridade.
            </Text>
          )}
        </View>

        {offers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Demais itens planejados"
              expanded={offersExpanded}
              moreLabel={r.isDesktop ? (offersExpanded ? 'Ver menos' : 'Ver tudo') : undefined}
              onMorePress={() => setOffersExpanded((v) => !v)}
            />
            {renderCarousel(offers)}
          </View>
        )}
      </>
    );
  };

  // Alterna entre as 3 telas principais (Dashboard, Checklist Focado, Activity Log)
  const renderActiveTabContent = () => {
    if (view === 'checklist') {
      return (
        <ChecklistDesejos
          itens={wishlistItems}
          idsConcluidos={idsConcluidos}
          aoAlternarConclusao={handleAlternarConclusao}
          aoAbrirModalCriar={handleAbrirModal}
        />
      );
    }

    if (view === 'activity') {
      return <RegistroAtividades eventosSessao={eventosSessao} itens={wishlistItems} />;
    }

    return (
      <>
        {/* Painel de Métricas-Chave e Gráfico Semanal de Conclusão (7D) */}
        <PainelMetricasGrafico
          itens={wishlistItems}
          idsConcluidos={idsConcluidos}
          isDesktop={r.isDesktop}
        />

        {/* Barra de Filtros em Pílula + Alternador Grade / Lista / Kanban */}
        {desejos.length > 0 && (
          <FilterSortBar
            prioridadeSelecionada={selectedFilter}
            onSelecionarPrioridade={setSelectedFilter}
            opcoesPrioridade={priorityOptions}
            lojaSelecionada={selectedLoja}
            onSelecionarLoja={setSelectedLoja}
            lojasDisponiveis={lojasDisponiveis}
            ordemAtual={ordem}
            onAbrirModalOrdenacao={() => setModalOrdenacaoVisivel(true)}
            totalFiltrosAtivos={totalFiltrosAtivos}
            onLimparFiltros={handleLimparFiltros}
            modoVisualizacao={modoVisualizacao}
            onAlterarModoVisualizacao={handleAlterarModoVisualizacao}
            isDesktop={r.isDesktop}
            horizontalPadding={r.horizontalPadding}
          />
        )}

        {renderDashboardContent()}
      </>
    );
  };

  const searchBar = (
    <SearchBar
      value={query}
      onChangeText={(texto) => {
        setQuery(texto);
        if (view !== 'home' && texto.trim().length > 0) {
          setView('home');
        }
      }}
      placeholder={`Pesquisar em ${APP_NAME}...`}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Cabeçalho Fixo Monocromático com Branding e Busca */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (r.isDesktop ? 14 : 10),
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={{ width: r.contentWidth, paddingHorizontal: r.horizontalPadding, alignSelf: 'center' }}>
          {r.isDesktop ? (
            <DesktopHeader
              active={view}
              userEmail={usuarioEmail || 'usuario@prioritize.com'}
              onSelect={handleNav}
              onAddPress={handleAbrirModal}
            >
              {searchBar}
            </DesktopHeader>
          ) : (
            <View style={styles.mobileHeaderStack}>
              <View style={styles.mobileBrandRow}>
                <View style={styles.mobileBrandLeft}>
                  <View style={[styles.monogramBadge, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.monogramText, { color: theme.primaryForeground }]}>P.</Text>
                  </View>
                  <View>
                    <Text style={[styles.mobileBrandTitle, { color: theme.foreground }]}>{APP_NAME}</Text>
                    <Text style={[styles.mobileBrandSub, { color: theme.mutedForeground }]}>
                      {view === 'home'
                        ? 'Painel & Matriz'
                        : view === 'checklist'
                          ? 'Checklist Focado'
                          : 'Registro de Atividades'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleAbrirModalConta}
                  style={[styles.mobileAvatarBtn, { backgroundColor: theme.secondary, borderColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Gerenciar conta"
                >
                  <Feather name="user" size={16} color={theme.foreground} />
                </TouchableOpacity>
              </View>
              {view === 'home' && searchBar}
            </View>
          )}
        </View>
      </View>

      {carregando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.mutedForeground }]}>
            Sincronizando prioridades...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: bottomSpace }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        >
          <View style={{ width: r.contentWidth, paddingHorizontal: r.horizontalPadding, paddingTop: 18 }}>
            {renderActiveTabContent()}
          </View>
        </ScrollView>
      )}

      {/* Barra de Navegação Flutuante em Pílula (Mobile) com Botão + Integrado */}
      {!r.isDesktop && (
        <BottomNav
          active={view}
          bottomInset={insets.bottom}
          onSelect={handleNav}
          onAddPress={handleAbrirModal}
        />
      )}

      {/* Quick Creation Bottom Sheet com Tags Pílula de Prioridade */}
      <AdicionarDesejoModal
        visivel={modalVisivel}
        aoFechar={handleFecharModalDesejo}
        aoSalvarSucesso={handleDesejoCriado}
        urlInicial={urlCompartilhadaModal}
      />

      {/* Bottom Sheet de Edição de Desejo */}
      <EditarDesejoModal
        visivel={modalEditarVisivel}
        item={itemParaEditar}
        aoFechar={handleFecharModalEditar}
        aoSalvarSucesso={handleDesejoAtualizado}
      />

      {/* Modal Monocromático de Gerenciamento de Conta */}
      <GerenciarContaModal
        visivel={modalContaVisivel}
        aoFechar={handleFecharModalConta}
        emailUsuario={usuarioEmail}
        aoDeslogar={handleDeslogar}
        aoCriarNovaConta={handleCriarNovaConta}
        aoMudarDeConta={handleMudarDeConta}
      />

      {/* Bottom Sheet de Ordenação */}
      <ModalOrdenacao
        visivel={modalOrdenacaoVisivel}
        ordemAtual={ordem}
        onSelecionar={setOrdem}
        onFechar={() => setModalOrdenacaoVisivel(false)}
      />

      {/* Diálogo Monocromático Estilizado de Confirmação de Exclusão */}
      <ConfirmarExclusaoModal
        visivel={!!itemParaExcluir}
        tituloProduto={itemParaExcluir?.titulo}
        carregando={excluindo}
        aoFechar={() => setItemParaExcluir(null)}
        aoConfirmar={handleConfirmarExclusao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 20,
  },
  mobileHeaderStack: {
    gap: 10,
  },
  mobileBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monogramBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontFamily: typography.fonts.sans,
    fontSize: 15,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  mobileBrandTitle: {
    fontFamily: typography.fonts.sans,
    fontSize: 18,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  mobileBrandSub: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  mobileAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 14,
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: typography.weights.medium,
  },
  section: { marginTop: 22 },
  listaContainer: { width: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: 12,
  },
  emptyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.extrabold,
    fontSize: 18,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
    marginBottom: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    height: 46,
    borderRadius: radius.full,
  },
  emptyBtnText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: 14,
  },
});
