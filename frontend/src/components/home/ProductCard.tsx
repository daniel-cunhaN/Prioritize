/**
 * ProductCard.tsx — Cartão Minimalista Monocromático de Produto / Prioridade
 */

import React, { memo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';
import { WishlistItem } from '../../types';
import PriceTag from './PriceTag';

interface Props {
  item: WishlistItem;
  width: number;
  compact?: boolean;
  concluido?: boolean;
  onToggleCheck?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showPriorityBadge?: boolean;
}

/** Configuração monocromática das prioridades (3 = Alta, 2 = Média, 1 = Baixa) */
export const PRIORITY_CONFIG: Record<
  number,
  { label: string; icon: string; color: string; bg: string; border: string; inverted?: boolean }
> = {
  3: {
    label: 'Alta',
    icon: '●',
    color: '#FFFFFF',
    bg: '#09090B',
    border: '#09090B',
    inverted: true,
  },
  2: {
    label: 'Média',
    icon: '◐',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#09090B',
    inverted: false,
  },
  1: {
    label: 'Baixa',
    icon: '○',
    color: '#52525B',
    bg: '#FFFFFF',
    border: '#D4D4D8',
    inverted: false,
  },
};

export const PRIORITY_LABELS: Record<number, string> = {
  3: 'Alta prioridade',
  2: 'Média prioridade',
  1: 'Baixa prioridade',
};

const SAMPLE_PRICES = [78.95, 88.02, 35.55, 38.49, 129.9, 49.99, 189.0, 64.5, 94.2, 42.15];

const parseOrGeneratePrice = (item: WishlistItem): number => {
  if (item.price !== null && item.price !== undefined && item.price !== '') {
    const n =
      typeof item.price === 'number'
        ? item.price
        : Number(
            String(item.price)
              .replace(/[^\d,.-]/g, '')
              .replace(/\.(?=\d{3})/g, '')
              .replace(',', '.')
          );
    if (Number.isFinite(n) && n > 0) return n;
  }
  const match = (item.title || '').match(/R?\$?\s*(\d+[\.,]\d{2})/);
  if (match) {
    const val = Number(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
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
  concluido = false,
  onToggleCheck,
  onEdit,
  onDelete,
  showPriorityBadge = true,
}: Props) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
  const price = parseOrGeneratePrice(item);
  const hasImage = Boolean(item.image_url) && !imageError;

  const openLink = () => {
    if (!item.url) return;
    const target = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;
    Linking.openURL(target).catch((err) => console.warn('Não foi possível abrir o link:', err));
  };

  return (
    <Pressable
      onPress={openLink}
      onLongPress={onDelete}
      accessibilityLabel={`Produto: ${item.title || 'Sem título'}`}
      style={({ pressed, hovered }: any) => [
        styles.card,
        {
          width,
          backgroundColor: theme.background,
          borderColor: hovered ? theme.primary : theme.border,
          transform: [{ scale: pressed ? 0.985 : 1 }, { translateY: hovered ? -3 : 0 }],
          ...(Platform.OS === 'web'
            ? { boxShadow: hovered ? '0px 6px 16px rgba(9, 9, 11, 0.1)' : '0px 2px 6px rgba(9, 9, 11, 0.03)' }
            : { shadowOpacity: hovered ? 0.1 : 0.03 }),
        },
        Platform.OS === 'web' &&
          ({
            transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
            cursor: 'pointer',
          } as any),
      ]}
    >
      {({ hovered }: any) => (
        <>
          {/* Área da imagem minimalista sobre superfície sutil */}
          <View style={[styles.imageWell, { backgroundColor: theme.card }]}>
            {hasImage ? (
              <Animated.Image
                source={{ uri: item.image_url as string }}
                style={[styles.image, { opacity: fade }]}
                resizeMode="contain"
                onLoad={() =>
                  Animated.timing(fade, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: Platform.OS !== 'web',
                  }).start()
                }
                onError={() => setImageError(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.placeholder}>
                <Feather name="shopping-bag" size={30} color={theme.mutedForeground} />
                <Text
                  numberOfLines={1}
                  style={[styles.placeholderText, { color: theme.mutedForeground }]}
                >
                  {getDomain(item.url) || 'Prioritize'}
                </Text>
              </View>
            )}

            {/* Tag Pílula de Prioridade */}
            {showPriorityBadge && (
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: priorityConf.inverted ? theme.primary : theme.background,
                    borderColor: priorityConf.inverted ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityBadgeText,
                    {
                      color: priorityConf.inverted ? theme.primaryForeground : theme.foreground,
                    },
                  ]}
                >
                  {priorityConf.icon} {priorityConf.label}
                </Text>
              </View>
            )}

            {/* Ações flutuantes do card (Concluir, Editar e Excluir) */}
            {(onToggleCheck || onEdit || onDelete) && (
              <View
                style={[
                  styles.actionsContainer,
                  Platform.OS === 'web' &&
                    ({
                      opacity: hovered || concluido ? 1 : 0,
                      transition: 'opacity 160ms ease',
                    } as any),
                ]}
              >
                {onToggleCheck && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      onToggleCheck();
                    }}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: concluido }}
                    accessibilityLabel="Marcar conclusão"
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: concluido ? theme.primary : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name="check"
                      size={13}
                      color={concluido ? theme.primaryForeground : theme.foreground}
                    />
                  </Pressable>
                )}

                {onEdit && (
                  <Pressable
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      onEdit();
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Editar item"
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="edit-2" size={13} color={theme.foreground} />
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
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Feather name="trash-2" size={13} color={theme.foreground} />
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Informações tipográficas limpas */}
          <View style={[styles.content, { borderTopColor: theme.border }]}>
            {getDomain(item.url) ? (
              <Text numberOfLines={1} style={[styles.domainLabel, { color: theme.mutedForeground }]}>
                {getDomain(item.url)}
              </Text>
            ) : null}

            <Text
              numberOfLines={compact ? 1 : 2}
              ellipsizeMode="tail"
              style={[
                styles.title,
                {
                  color: concluido ? theme.mutedForeground : theme.foreground,
                  textDecorationLine: concluido ? 'line-through' : 'none',
                },
              ]}
            >
              {item.title || 'Sem título'}
            </Text>

            <View style={styles.priceContainer}>
              <PriceTag
                value={price}
                color={concluido ? theme.mutedForeground : theme.foreground}
                size={compact ? 'sm' : 'md'}
              />
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
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(9, 9, 11, 0.04)',
      },
      default: {
        shadowColor: '#09090B',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },
  imageWell: {
    width: '100%',
    aspectRatio: 1,
    padding: 16,
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
    gap: 8,
  },
  placeholderText: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  priorityBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actionsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 10,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  domainLabel: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priceContainer: {
    marginTop: 4,
  },
});
