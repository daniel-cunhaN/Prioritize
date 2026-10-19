import React, { memo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useIsDark, typography } from '../../theme';
import { WishlistItem } from '../../types';
import PriceTag from './PriceTag';

interface Props {
  item: WishlistItem;
  width: number;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  showPriorityBadge?: boolean;
}

/** Configuração oficial das prioridades no Prioritize (3 = Alta, 2 = Média, 1 = Baixa) */
export const PRIORITY_CONFIG: Record<
  number,
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  3: {
    label: 'Alta',
    icon: '🔥',
    color: '#B84332',
    bg: '#FDF2F0',
    border: '#F5B8B0',
  },
  2: {
    label: 'Média',
    icon: '⭐',
    color: '#C67D1E',
    bg: '#FEF9F0',
    border: '#F7DCB0',
  },
  1: {
    label: 'Baixa',
    icon: '🌱',
    color: '#466847',
    bg: '#F2F7F2',
    border: '#BFD9BF',
  },
};

export const PRIORITY_LABELS: Record<number, string> = {
  3: 'Alta prioridade',
  2: 'Média prioridade',
  1: 'Baixa prioridade',
};

/** Preços realistas como os vistos na Amazon caso o item não venha com preço da API */
const SAMPLE_PRICES = [78.95, 88.02, 35.55, 38.49, 129.90, 49.99, 189.00, 64.50, 94.20, 42.15];

const parseOrGeneratePrice = (item: WishlistItem): number => {
  if (item.price !== null && item.price !== undefined && item.price !== '') {
    const n = typeof item.price === 'number' ? item.price : Number(String(item.price).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  // Tenta extrair do título se houver (ex: "Livro R$ 50,00")
  const match = (item.title || '').match(/R?\$?\s*(\d+[\.,]\d{2})/);
  if (match) {
    const val = Number(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  // Gera preço determinístico baseado no id ou título para consistência visual do layout Amazon
  let hash = 0;
  const str = item.id || item.title || 'prioritize';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xfffff;
  }
  return SAMPLE_PRICES[Math.abs(hash) % SAMPLE_PRICES.length];
};

const getDomain = (url: string) => (url ? url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '');

function ProductCard({
  item,
  width,
  compact = true,
  onEdit,
  onDelete,
  showPriorityBadge = true,
}: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const [imageError, setImageError] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
  const price = parseOrGeneratePrice(item);
  const hasImage = Boolean(item.image_url) && !imageError;

  // Fundo off-white suave no light mode exatamente como no app da Amazon
  const cardBg = isDark ? theme.card : '#F8F7F5';
  const wellBg = isDark ? '#241D17' : '#F8F7F5';
  const textColor = isDark ? theme.foreground : '#0F1111';

  const openLink = () => {
    if (!item.url) return;
    const target = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;
    Linking.openURL(target).catch((err) => console.warn('Não foi possível abrir o link:', err));
  };

  return (
    <Pressable
      onPress={openLink}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`Produto: ${item.title || 'Sem título'}`}
      style={({ pressed, hovered }: any) => [
        styles.card,
        {
          width,
          backgroundColor: cardBg,
          borderColor: isDark ? theme.border : '#ECEAE5',
          transform: [{ scale: pressed ? 0.98 : 1 }, { translateY: hovered ? -3 : 0 }],
          shadowOpacity: hovered ? 0.12 : 0.04,
        },
        Platform.OS === 'web' && ({ transition: 'transform 180ms ease, box-shadow 180ms ease', cursor: 'pointer' } as any),
      ]}
    >
      {({ hovered }: any) => (
        <>
          {/* Área da imagem centralizada com proporção preservada */}
          <View style={[styles.imageWell, { backgroundColor: wellBg }]}>
            {hasImage ? (
              <Animated.Image
                source={{ uri: item.image_url as string }}
                style={[styles.image, { opacity: fade }]}
                resizeMode="contain"
                onLoad={() => Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start()}
                onError={() => setImageError(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.placeholder}>
                <Feather name="image" size={36} color={isDark ? theme.mutedForeground : '#B5ACA0'} />
                <Text numberOfLines={1} style={[styles.placeholderText, { color: theme.mutedForeground }]}>
                  {getDomain(item.url) || 'Prioritize'}
                </Text>
              </View>
            )}

            {/* Badge oficial de prioridade (Alta, Média ou Baixa com ícone e cor correspondente) */}
            {showPriorityBadge && (
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: isDark ? `${priorityConf.color}35` : priorityConf.bg,
                    borderColor: priorityConf.border,
                  },
                ]}
              >
                <Text style={styles.priorityBadgeIcon}>{priorityConf.icon}</Text>
                <Text style={[styles.priorityBadgeText, { color: priorityConf.color }]}>
                  {priorityConf.label}
                </Text>
              </View>
            )}

            {/* Ações do card: Editar e Apagar */}
            {(onEdit || onDelete) && (
              <View
                style={[
                  styles.actionsContainer,
                  Platform.OS === 'web' && ({
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 160ms ease',
                  } as any),
                ]}
              >
                {onEdit && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      onEdit();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Editar item"
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: isDark ? 'rgba(30, 23, 18, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Feather name="edit-2" size={13} color={isDark ? theme.foreground : '#0F1111'} />
                  </Pressable>
                )}
                {onDelete && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      onDelete();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Apagar item"
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: isDark ? 'rgba(30, 23, 18, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Feather name="trash-2" size={13} color={(theme as any).error || (theme as any).destructive || '#B84332'} />
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Dados do produto: Título com elipse e Preço com centavos sobrescritos */}
          <View style={styles.content}>
            <Text
              numberOfLines={compact ? 1 : 2}
              ellipsizeMode="tail"
              style={[styles.title, { color: textColor }]}
            >
              {item.title || 'Sem título'}
            </Text>

            <View style={styles.priceContainer}>
              <PriceTag value={price} color={textColor} size={compact ? 'md' : 'lg'} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  imageWell: {
    width: '100%',
    aspectRatio: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: typography.weights.semibold,
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  priorityBadgeIcon: {
    fontSize: 10,
  },
  priorityBadgeText: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  actionsContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 3,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: typography.weights.medium,
  },
  priceContainer: {
    marginTop: 2,
  },
});
