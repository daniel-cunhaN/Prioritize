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
import { useTheme, useIsDark, typography } from '../theme';
import client from '../api/client';
import AdicionarDesejoModal, { DesejoItem } from '../components/AdicionarDesejoModal';
import GerenciarContaModal from '../components/GerenciarContaModal';
import { encerrarSessao } from '../utils/validacao';
import SearchBar from '../components/home/SearchBar';
import SectionHeader from '../components/home/SectionHeader';
import ProductCard, { PRIORITY_CONFIG, PRIORITY_LABELS } from '../components/home/ProductCard';
import EditarDesejoModal from '../components/home/EditarDesejoModal';
import BottomNav, { BOTTOM_NAV_HEIGHT, HomeTab } from '../components/home/BottomNav';
import DesktopHeader from '../components/home/DesktopHeader';
import FilterSortBar from '../components/home/FilterSortBar';
import ModalOrdenacao, { OPCOES_ORDENACAO } from '../components/home/ModalOrdenacao';
import KanbanBoard from '../components/home/KanbanBoard';
import ProductListItem from '../components/home/ProductListItem';
import { useResponsive } from '../hooks/useResponsive';
import { WishlistItem, TipoOrdenacao, ModoVisualizacao } from '../types';

const APP_NAME = 'Prioritize';
const STORAGE_KEY_MODO_VISUALIZACAO = 'prioritize_view_mode';

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

/** Confirmação compatível com Mobile e Web */
const confirmAction = (title: string, message: string, confirmText: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const scrollRef = useRef<ScrollView>(null);

  // Estados de dados da API
  const [desejos, setDesejos] = useState<WishlistItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState<string>('');

  // Modais existentes
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
  const [modalOrdenacaoVisivel, setModalOrdenacaoVisivel] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<WishlistItem | null>(null);
  const [urlCompartilhadaModal, setUrlCompartilhadaModal] = useState('');

  // Filtros, ordenação, busca e tipo de visualização
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');
  const [selectedLoja, setSelectedLoja] = useState<string | 'ALL'>('ALL');
  const [ordem, setOrdem] = useState<TipoOrdenacao>('prioridade_desc');
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>(obterModoVisualizacaoInicial);
  const [view, setView] = useState<HomeTab>('home');
  const [offersExpanded, setOffersExpanded] = useState(false);

  // 1. Carregamento dos Desejos via API
  const carregarDesejos = useCallback(async () => {
    try {
      const resposta = await client.get('/wishlist/');
      setDesejos(resposta.data || []);
    } catch (erro) {
      console.warn('Erro ao carregar lista de desejos:', erro);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  // 2. Carregamento do Perfil do Usuário
  const carregarPerfil = useCallback(async () => {
    try {
      const resposta = await client.get('/auth/me');
      if (resposta.data && resposta.data.email) {
        setUsuarioEmail(resposta.data.email);
      }
    } catch (erro) {
      console.warn('Falha ao obter perfil do usuário atual:', erro);
    }
  }, []);

  useEffect(() => {
    carregarDesejos();
    carregarPerfil();
  }, [carregarDesejos, carregarPerfil]);

  const onRefresh = useCallback(() => {
    setAtualizando(true);
    carregarDesejos();
  }, [carregarDesejos]);

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

  // Ações de Adicionar Desejo
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
  };

  // Ação de Exclusão de Desejo via API
  const handleExcluirDesejo = async (id: string, titulo?: string | null) => {
    confirmAction(
      'Apagar Desejo',
      `Deseja apagar "${titulo || 'este item'}" da sua lista?`,
      'Apagar',
      async () => {
        try {
          await client.delete(`/wishlist/${id}`);
          setDesejos((prev) => prev.filter((item) => item.id !== id));
        } catch (erro) {
          console.error('Erro ao excluir desejo:', erro);
          Alert.alert('Erro', 'Não foi possível excluir o item.');
        }
      }
    );
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

  // Comparador robusto e configurável para ordenação dos itens
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

  // Separação inteligente para o layout estilo Amazon (ou unificada quando filtros estão ativos)
  const { topPicks, offers, categoryTitle } = useMemo(() => {
    // Se o usuário filtrou ou ordenou especificamente, exibe em grade única
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

  // Lista oficial de filtros por prioridade (3: Alta, 2: Média, 1: Baixa)
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
        label: `🔥 Alta (${countAlta})`,
        color: PRIORITY_CONFIG[3].color,
        activeBg: PRIORITY_CONFIG[3].color,
      },
      {
        value: 2,
        label: `⭐ Média (${countMedia})`,
        color: PRIORITY_CONFIG[2].color,
        activeBg: PRIORITY_CONFIG[2].color,
      },
      {
        value: 1,
        label: `🌱 Baixa (${countBaixa})`,
        color: PRIORITY_CONFIG[1].color,
        activeBg: PRIORITY_CONFIG[1].color,
      },
    ];
  }, [desejos, theme.primary]);

  // Navegação por abas / atalhos
  const handleNav = (tab: HomeTab) => {
    if (tab === 'home') {
      setView('home');
      setSelectedFilter('ALL');
      setQuery('');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'account') {
      handleAbrirModalConta();
    } else if (tab === 'explore') {
      // Abre o modal de ordenação dos itens
      setModalOrdenacaoVisivel(true);
    }
  };

  const pageBg = isDark ? theme.background : '#FFFFFF';
  const textStrong = isDark ? theme.foreground : '#0F1111';
  const isSearching = query.trim().length > 0;
  const bottomSpace = r.isDesktop ? 48 : BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 6) + 85;

  const renderGrid = (data: WishlistItem[], keyPrefix: string) => (
    <View style={[styles.grid, { gap: r.gap }]}>
      {data.map((item) => (
        <ProductCard
          key={`${keyPrefix}-${item.id}`}
          item={item}
          width={r.cardWidth}
          compact={!r.isDesktop}
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
            onEdit={() => handleAbrirEditar(item)}
            onDelete={() => handleExcluirDesejo(item.id, item.title)}
          />
        ))}
      </ScrollView>
    );

  // Renderizador para o modo de lista compacta
  const renderList = (data: WishlistItem[], keyPrefix: string) => (
    <View style={styles.listaContainer}>
      {data.map((item) => (
        <ProductListItem
          key={`${keyPrefix}-${item.id}`}
          item={item}
          onEdit={() => handleAbrirEditar(item)}
          onDelete={() => handleExcluirDesejo(item.id, item.title)}
        />
      ))}
    </View>
  );

  const renderHomeContent = () => {
    // 1. Estado quando o usuário não possui nenhum desejo cadastrado
    if (desejos.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="shopping-bag" size={48} color={theme.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: textStrong }]}>Nenhum desejo salvo</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
            Cole um link da loja e classifique a prioridade para começar sua lista.
          </Text>
          <TouchableOpacity
            onPress={handleAbrirModal}
            style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={18} color={theme.primaryForeground} />
            <Text style={[styles.emptyBtnText, { color: theme.primaryForeground }]}>Adicionar Desejo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 2. Estado quando os filtros ou busca não encontram nenhum item correspondente
    if (filteredItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="filter" size={42} color={theme.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: textStrong }]}>Nenhum desejo encontrado</Text>
          <Text style={[styles.emptySubtitle, { color: theme.mutedForeground }]}>
            Não encontramos itens correspondentes aos filtros ou busca aplicados.
          </Text>
          <TouchableOpacity
            onPress={handleLimparFiltros}
            style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="rotate-ccw" size={16} color={theme.primaryForeground} />
            <Text style={[styles.emptyBtnText, { color: theme.primaryForeground }]}>Limpar Filtros e Busca</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 3. Visualização em Quadro KANBAN agrupado por prioridades (Alta, Média, Baixa)
    if (modoVisualizacao === 'kanban') {
      const tituloKanban = isSearching
        ? `Quadro Kanban — Resultados para “${query.trim()}”`
        : 'Quadro Kanban por Prioridade';

      return (
        <View style={styles.section}>
          <SectionHeader title={tituloKanban} />
          <KanbanBoard
            items={filteredItems}
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
          tituloSecao = `${conf?.label || ''} prioridade (${filteredItems.length})`;
        } else if (selectedLoja !== 'ALL') {
          tituloSecao = `Produtos de ${selectedLoja} (${filteredItems.length})`;
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
            <SectionHeader
              title={`Melhores escolhas de ${categoryTitle} para você`}
            />
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
                title="Ofertas do seu interesse"
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

    // 5. Visualização padrão em GRADE (Grid) com cartões verticais
    if (isSearching || selectedFilter !== 'ALL' || selectedLoja !== 'ALL' || ordem !== 'prioridade_desc') {
      let tituloSecao = `Itens filtrados (${filteredItems.length})`;
      if (isSearching) {
        tituloSecao = `Resultados para “${query.trim()}” (${filteredItems.length})`;
      } else if (selectedFilter !== 'ALL') {
        const conf = PRIORITY_CONFIG[selectedFilter];
        tituloSecao = `${conf?.label || ''} prioridade (${filteredItems.length})`;
      } else if (selectedLoja !== 'ALL') {
        tituloSecao = `Produtos de ${selectedLoja} (${filteredItems.length})`;
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
        {/* Seção Principal: Melhores escolhas para você */}
        <View style={styles.section}>
          <SectionHeader
            title={`Melhores escolhas de ${categoryTitle} para você`}
          />
          {topPicks.length > 0 ? (
            renderGrid(topPicks, 'top')
          ) : (
            <Text style={{ color: theme.mutedForeground, marginVertical: 16 }}>
              Nenhum item com essa prioridade.
            </Text>
          )}
        </View>

        {/* Seção 2: Ofertas que podem te interessar */}
        {offers.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Ofertas do seu interesse"
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

  const searchBar = (
    <SearchBar
      value={query}
      onChangeText={setQuery}
      placeholder={`Pesquisar em ${APP_NAME}`}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      {/* Cabeçalho Fixo com Busca */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (r.isDesktop ? 14 : 10),
            backgroundColor: pageBg,
            borderBottomColor: isDark ? theme.border : '#E7E3DC',
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
            searchBar
          )}
        </View>
      </View>

      {carregando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.mutedForeground, marginTop: 16 }}>Carregando seus desejos...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: bottomSpace }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <View style={{ width: r.contentWidth, paddingHorizontal: r.horizontalPadding, paddingTop: 14 }}>
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
            {renderHomeContent()}
          </View>
        </ScrollView>
      )}

      {/* FAB Flutuante para Adicionar Desejo */}
      {!r.isDesktop && (
        <TouchableOpacity
          onPress={handleAbrirModal}
          style={[
            styles.fab,
            {
              backgroundColor: theme.primary,
              bottom: BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 6) + 16,
            },
          ]}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={26} color={theme.primaryForeground} />
        </TouchableOpacity>
      )}

      {/* Barra de Navegação Inferior (Mobile: Início, Conta, Explorar) */}
      {!r.isDesktop && (
        <BottomNav
          active={view}
          bottomInset={insets.bottom}
          onSelect={handleNav}
        />
      )}

      {/* Modal Existente de Adicionar Desejo */}
      <AdicionarDesejoModal
        visivel={modalVisivel}
        aoFechar={handleFecharModalDesejo}
        aoSalvarSucesso={handleDesejoCriado}
        urlInicial={urlCompartilhadaModal}
      />

      {/* Modal de Editar Desejo */}
      <EditarDesejoModal
        visivel={modalEditarVisivel}
        item={itemParaEditar}
        aoFechar={handleFecharModalEditar}
        aoSalvarSucesso={handleDesejoAtualizado}
      />

      {/* Modal Existente de Gerenciar Conta */}
      <GerenciarContaModal
        visivel={modalContaVisivel}
        aoFechar={handleFecharModalConta}
        emailUsuario={usuarioEmail}
        aoDeslogar={handleDeslogar}
        aoCriarNovaConta={handleCriarNovaConta}
        aoMudarDeConta={handleMudarDeConta}
      />

      {/* Modal de Ordenação dos Desejos */}
      <ModalOrdenacao
        visivel={modalOrdenacaoVisivel}
        ordemAtual={ordem}
        onSelecionar={setOrdem}
        onFechar={() => setModalOrdenacaoVisivel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  chipText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
  },
  section: { marginTop: 20 },
  listaContainer: { width: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: 18, marginBottom: 8 },
  emptySubtitle: { fontFamily: typography.fonts.sans, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, height: 48, borderRadius: 24 },
  emptyBtnText: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 90,
  },
});
