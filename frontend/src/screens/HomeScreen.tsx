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
import { useResponsive } from '../hooks/useResponsive';
import { WishlistItem } from '../types';

const APP_NAME = 'Prioritize';

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
  const [itemParaEditar, setItemParaEditar] = useState<WishlistItem | null>(null);
  const [urlCompartilhadaModal, setUrlCompartilhadaModal] = useState('');

  // Filtros e busca
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');
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

  // Classificação correta: maior prioridade primeiro (3: Alta > 2: Média > 1: Baixa), depois mais recente
  const byPriority = useCallback((a: WishlistItem, b: WishlistItem) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }, []);

  // Filtragem e busca
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return wishlistItems
      .filter((i) => selectedFilter === 'ALL' || i.priority === selectedFilter)
      .filter((i) => !q || (i.title || '').toLowerCase().includes(q) || (i.url || '').toLowerCase().includes(q))
      .sort(byPriority);
  }, [wishlistItems, selectedFilter, query, byPriority]);

  // Separação inteligente para o layout estilo Amazon
  const { topPicks, offers, categoryTitle } = useMemo(() => {
    if (selectedFilter !== 'ALL') {
      const label = PRIORITY_CONFIG[selectedFilter]?.label.toLowerCase() || 'prioridade';
      return {
        topPicks: filteredItems,
        offers: [],
        categoryTitle: `${label} prioridade`,
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
  }, [filteredItems, selectedFilter]);

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
      // Cicla entre os filtros ao clicar em Explorar: ALL -> Alta -> Média -> Baixa -> ALL
      setSelectedFilter((prev) => {
        if (prev === 'ALL') return 3;
        if (prev === 3) return 2;
        if (prev === 2) return 1;
        return 'ALL';
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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

  const renderChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -r.horizontalPadding, marginBottom: 12 }}
      contentContainerStyle={[styles.chips, { paddingHorizontal: r.horizontalPadding }]}
    >
      {priorityOptions.map((opt) => {
        const active = selectedFilter === opt.value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            onPress={() => setSelectedFilter(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? opt.activeBg : isDark ? theme.card : '#F5F3EF',
                borderColor: active ? opt.color : isDark ? theme.border : '#E3DED6',
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: active ? '#FFFFFF' : textStrong,
                  fontWeight: active ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderHomeContent = () => {
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

    if (isSearching) {
      return (
        <View style={styles.section}>
          <SectionHeader title={`Resultados para “${query.trim()}” (${filteredItems.length})`} />
          {filteredItems.length ? (
            renderGrid(filteredItems, 'search')
          ) : (
            <Text style={{ color: theme.mutedForeground, textAlign: 'center', marginVertical: 32 }}>
              Nenhum item encontrado para esta busca.
            </Text>
          )}
        </View>
      );
    }

    return (
      <>
        {/* Seção Principal: Melhores escolhas de [Categoria/Prioridade] para você */}
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

        {/* Seção 2: Ofertas que podem te interessar > */}
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
            {desejos.length > 0 && renderChips()}
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
