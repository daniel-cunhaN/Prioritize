import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Alert, Text,
  Pressable, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';
import { WishlistItem } from '../types';
import {
  fetchWishlist,
  addWishlistItem,
  deleteWishlistItem,
  clearAuthToken,
  getUserEmailFromToken,
  previewWishlistUrl,
  enrichWishlistItem,
} from '../api';
import WishlistCard from '../components/WishlistCard';
import FAB from '../components/FAB';
import BottomSheet from '../components/BottomSheet';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';

type ImageExtractStatus = 'idle' | 'loading' | 'found' | 'missing' | 'error';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');

  const [userEmail, setUserEmail] = useState<string>('A Carregar Perfil...');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const [imageStatus, setImageStatus] = useState<ImageExtractStatus>('idle');
  const [imageHint, setImageHint] = useState<string | undefined>();
  const [titleAutoFilled, setTitleAutoFilled] = useState(false);
  const [imageAutoFilled, setImageAutoFilled] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const previewSeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const tokenEmail = await getUserEmailFromToken();
      if (tokenEmail) setUserEmail(tokenEmail);

      const data = await fetchWishlist();
      setItems(data);

      // Itens antigos sem imagem: tenta herdar do link em background
      const missing = data.filter((item) => !item.image_url && item.url);
      if (missing.length > 0) {
        void (async () => {
          for (const item of missing.slice(0, 5)) {
            try {
              const enriched = await enrichWishlistItem(item.id);
              if (enriched.image_url) {
                setItems((prev) =>
                  prev.map((row) => (row.id === enriched.id ? enriched : row))
                );
              }
            } catch (error) {
              console.warn('Falha ao enriquecer imagem:', item.id, error);
            }
          }
        })();
      }
    } catch (error) {
      console.warn('Erro ao carregar ecrã:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarDados();
  }, [carregarDados]);

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setImageUrl('');
    setPriority(2);
    setTitleError(undefined);
    setUrlError(undefined);
    setImageStatus('idle');
    setImageHint(undefined);
    setTitleAutoFilled(false);
    setImageAutoFilled(false);
    setPreviewError(false);
    previewSeq.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const closeCreateModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleLogout = () => {
    Alert.alert('Terminar Sessão', 'Deseja realmente sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive',
        onPress: async () => {
          await clearAuthToken();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const confirmDelete = (item: WishlistItem) => {
    Alert.alert('Apagar Desejo', `Deseja apagar "${item.title || 'este item'}" da sua lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive',
        onPress: async () => {
          try {
            await deleteWishlistItem(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível remover o item.');
          }
        },
      },
    ]);
  };

  const validateUrl = (testUrl: string): boolean => {
    const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
    return pattern.test(testUrl.trim());
  };

  const ensureHttp = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const runImageExtraction = async (rawUrl: string, titleForHint?: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setImageStatus('idle');
      setImageHint(undefined);
      return;
    }
    if (!validateUrl(trimmed)) {
      setImageStatus('idle');
      setImageHint(undefined);
      return;
    }

    const seq = ++previewSeq.current;
    setImageStatus('loading');
    setImageHint('A extrair imagem do produto...');
    setPreviewError(false);

    try {
      const preview = await previewWishlistUrl(
        ensureHttp(trimmed),
        titleForHint?.trim() || title.trim() || undefined
      );
      if (seq !== previewSeq.current) return;

      if (preview.found_title && (!title.trim() || titleAutoFilled)) {
        setTitle(preview.title || '');
        setTitleAutoFilled(true);
        setTitleError(undefined);
      }

      if (preview.found_image && preview.image_url) {
        if (!imageUrl.trim() || imageAutoFilled) {
          setImageUrl(preview.image_url);
          setImageAutoFilled(true);
          setPreviewError(false);
        }
        setImageStatus('found');
        setImageHint(preview.message);
      } else {
        if (imageAutoFilled) {
          setImageUrl('');
          setImageAutoFilled(false);
        }
        setImageStatus('missing');
        setImageHint(preview.message);
      }
    } catch (error) {
      if (seq !== previewSeq.current) return;
      console.warn('Falha na extração de imagem:', error);
      setImageStatus('error');
      setImageHint('Não foi possível analisar o link. Cole a imagem manualmente.');
    }
  };

  const scheduleImageExtraction = (rawUrl: string, titleForHint?: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => runImageExtraction(rawUrl, titleForHint),
      700
    );
  };

  const handleAddItem = async () => {
    let hasError = false;
    setTitleError(undefined);
    setUrlError(undefined);
    if (!title.trim()) { setTitleError('O título é obrigatório.'); hasError = true; }
    if (!url.trim()) { setUrlError('A URL é obrigatória.'); hasError = true; }
    else if (!validateUrl(url)) { setUrlError('Link inválido.'); hasError = true; }
    if (hasError) return;

    const formattedUrl = ensureHttp(url);
    const formattedImageUrl = imageUrl.trim() ? ensureHttp(imageUrl) : '';

    try {
      setSubmitting(true);
      const newItem = await addWishlistItem({
        title: title.trim(),
        url: formattedUrl,
        image_url: formattedImageUrl || null,
        priority,
      });
      setItems((prev) => [newItem, ...prev]);
      closeCreateModal();
    } catch (error) {
      Alert.alert('Erro ao Salvar', 'Verifique os dados preenchidos.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(
    () => (selectedFilter === 'ALL' ? items : items.filter((item) => item.priority === selectedFilter)),
    [items, selectedFilter]
  );
  const highPriorityCount = useMemo(
    () => items.filter((i) => i.priority === 1 || i.priority === 2).length,
    [items]
  );
  const priorityOptions = [
    { value: 1, label: 'P1', color: theme.priority1 },
    { value: 2, label: 'P2', color: theme.priority2 },
    { value: 3, label: 'P3', color: theme.priority3 },
    { value: 4, label: 'P4', color: theme.priority4 },
    { value: 5, label: 'P5', color: theme.priority5 },
  ];

  const imageFieldStatus =
    imageStatus === 'loading'
      ? 'checking'
      : imageStatus === 'found' && imageUrl
      ? 'success'
      : 'default';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.logoIconWrapper, { backgroundColor: theme.primarySoft }]}>
            <Feather name="layers" size={24} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.brandEyebrow, { color: theme.primary }]}>PRIORITIZE</Text>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{userEmail}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="log-out" size={14} color={theme.error} />
        </Pressable>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="heart" size={16} color={theme.primary} style={styles.statIcon} />
          <Text style={[styles.statValue, { color: theme.primary }]}>{items.length}</Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Total Desejos</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="alert-triangle" size={16} color={theme.priority1} style={styles.statIcon} />
          <Text style={[styles.statValue, { color: theme.priority1 }]}>{highPriorityCount}</Text>
          <Text style={[styles.statLabel, { color: theme.mutedForeground }]}>Prioridade Alta</Text>
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            onPress={() => setSelectedFilter('ALL')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'ALL' ? theme.primary : theme.card,
                borderColor: selectedFilter === 'ALL' ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: selectedFilter === 'ALL' ? theme.primaryForeground : theme.foreground },
              ]}
            >
              Todos ({items.length})
            </Text>
          </Pressable>
          {priorityOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSelectedFilter(opt.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedFilter === opt.value ? opt.color : theme.card,
                  borderColor: selectedFilter === opt.value ? opt.color : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      selectedFilter === opt.value ? theme.primaryForeground : theme.foreground,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.mutedForeground, marginTop: 16 }}>A carregar perfil...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          renderItem={({ item }) => (
            <WishlistCard
              item={item}
              onLongPress={() => confirmDelete(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName={selectedFilter === 'ALL' ? 'shopping-bag' : 'filter'}
              title={selectedFilter === 'ALL' ? 'Nenhum desejo guardado' : 'Filtro vazio'}
              description={
                selectedFilter === 'ALL'
                  ? 'Adicione o seu primeiro item no botão abaixo.'
                  : 'Não tem produtos neste nível de prioridade.'
              }
            />
          }
        />
      )}

      <FAB onPress={openCreateModal} />

      <BottomSheet visible={modalVisible} onClose={closeCreateModal}>
        <Text style={[styles.sheetTitle, { color: theme.foreground }]}>Novo Desejo</Text>

        <Input
          label="URL da Loja *"
          placeholder="https://loja.com/produto"
          value={url}
          onChangeText={(val) => {
            setUrl(val);
            if (urlError) setUrlError(undefined);
            scheduleImageExtraction(val, title);
          }}
          onBlur={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            runImageExtraction(url, title);
          }}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          icon="link-2"
          error={urlError}
          hint={!url.trim() ? 'Cole o link do produto para obter a imagem automaticamente.' : undefined}
        />

        <Input
          label="Título do Produto *"
          placeholder="Ex: Cadeira Ergonómica"
          value={title}
          onChangeText={(val) => {
            setTitle(val);
            setTitleAutoFilled(false);
            if (titleError) setTitleError(undefined);
            // Se ainda não há imagem, usa o título para refinar a busca
            if (url.trim() && (!imageUrl.trim() || imageAutoFilled)) {
              scheduleImageExtraction(url, val);
            }
          }}
          icon="tag"
          error={titleError}
          success={titleAutoFilled && title.trim() ? 'Título obtido do link' : undefined}
        />

        {(imageStatus === 'loading' || imageUrl.trim()) ? (
          <View
            style={[
              styles.imagePreviewCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {imageStatus === 'loading' ? (
              <View style={styles.imagePreviewPlaceholder}>
                <ActivityIndicator color={theme.primary} />
                <Text style={[styles.imagePreviewCaption, { color: theme.mutedForeground }]}>
                  A procurar imagem...
                </Text>
              </View>
            ) : imageUrl.trim() && !previewError ? (
              <Image
                source={{ uri: ensureHttp(imageUrl) }}
                style={styles.imagePreview}
                resizeMode="cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <View style={styles.imagePreviewPlaceholder}>
                <Feather name="image-off" size={22} color={theme.mutedForeground} />
                <Text style={[styles.imagePreviewCaption, { color: theme.mutedForeground }]}>
                  Pré-visualização indisponível
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <Input
          label="Link da Imagem"
          placeholder="Preenchido automaticamente ou cole manualmente"
          value={imageUrl}
          onChangeText={(val) => {
            setImageUrl(val);
            setImageAutoFilled(false);
            setPreviewError(false);
            if (val.trim()) {
              setImageStatus('found');
              setImageHint('Imagem definida manualmente.');
            } else if (imageStatus !== 'loading') {
              setImageStatus('idle');
              setImageHint(undefined);
            }
          }}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          icon="image"
          status={imageFieldStatus}
          success={
            imageStatus === 'found' && imageAutoFilled && imageUrl.trim()
              ? 'Imagem herdada do link do produto'
              : undefined
          }
          hint={
            imageStatus === 'missing' || imageStatus === 'error' || imageStatus === 'loading'
              ? imageHint
              : !imageUrl.trim()
              ? 'Opcional — extraímos do link quando possível.'
              : undefined
          }
        />

        <View style={styles.prioritySelectorContainer}>
          <Text style={[styles.priorityLabel, { color: theme.foreground }]}>Prioridade:</Text>
          <View style={styles.priorityButtonsRow}>
            {priorityOptions.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setPriority(opt.value)}
                style={[
                  styles.priorityChoiceBtn,
                  {
                    backgroundColor: priority === opt.value ? opt.color : theme.surface,
                    borderColor: priority === opt.value ? opt.color : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: priority === opt.value ? theme.primaryForeground : theme.foreground,
                    fontWeight: 'bold',
                  }}
                >
                  P{opt.value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: theme.primary, opacity: pressed || submitting ? 0.8 : 1 },
          ]}
          onPress={handleAddItem}
          disabled={submitting || imageStatus === 'loading'}
        >
          {submitting ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={[styles.submitText, { color: theme.primaryForeground }]}>Guardar</Text>
          )}
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: typography.spacing.lg,
    paddingTop: typography.spacing.md,
    paddingBottom: typography.spacing.sm,
  },
  logoIconWrapper: { padding: 8, borderRadius: 12 },
  brandEyebrow: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.sm,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: typography.spacing.lg,
    marginTop: typography.spacing.xs,
    marginBottom: typography.spacing.sm,
    gap: typography.spacing.sm + 2,
  },
  statCard: {
    flex: 1,
    paddingVertical: typography.spacing.sm + 2,
    paddingHorizontal: typography.spacing.md,
    borderRadius: typography.radii.md,
    borderWidth: 1,
    position: 'relative',
  },
  statIcon: { position: 'absolute', top: 12, right: 12, opacity: 0.2 },
  statValue: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.lg,
  },
  statLabel: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  filterWrapper: { marginBottom: typography.spacing.sm },
  filterScroll: { paddingHorizontal: typography.spacing.lg, gap: typography.spacing.xs + 2 },
  filterChip: {
    paddingHorizontal: typography.spacing.md,
    paddingVertical: typography.spacing.xs + 2,
    borderRadius: typography.radii.full,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: typography.spacing.md, paddingBottom: 110 },
  sheetTitle: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xl,
    marginBottom: typography.spacing.lg,
  },
  imagePreviewCard: {
    height: 140,
    borderRadius: typography.radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: typography.spacing.md,
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePreviewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePreviewCaption: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
  },
  prioritySelectorContainer: { marginBottom: typography.spacing.lg },
  priorityLabel: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    marginBottom: 8,
  },
  priorityButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  priorityChoiceBtn: {
    flex: 1,
    height: 44,
    borderRadius: typography.radii.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    height: 56,
    borderRadius: typography.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: typography.spacing.xs,
  },
  submitText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
});
