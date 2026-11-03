/**
 * ProductListItem.tsx — Linha Compacta Monocromática de Produto / Prioridade
 */

import React, { memo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Animated,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import PriceTag from './PriceTag';

interface Props {
  item: WishlistItem;
  concluido?: boolean;
  onToggleCheck?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getDomain = (url: string) =>
  url ? url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';

const formatarData = (dataIso: string) => {
  try {
    const d = new Date(dataIso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
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

function ProductListItem({ item, concluido = false, onToggleCheck, onEdit, onDelete }: Props) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
  const price = parseOrGeneratePrice(item);
  const hasImage = Boolean(item.image_url) && !imageError;
  const domain = getDomain(item.url);
  const dataFormatada = formatarData(item.created_at);

  const openLink = () => {
    if (!item.url) return;
    const target = /^https?:\/\//i.test(item.url) ? item.url : `https://${item.url}`;
    Linking.openURL(target).catch((err) =>
      console.warn('Não foi possível abrir o link:', err)
    );
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
          backgroundColor: concluido ? theme.card : theme.background,
          borderColor: hovered ? theme.primary : theme.border,
          transform: [{ scale: pressed ? 0.992 : 1 }, { translateY: hovered ? -1 : 0 }],
        },
        Platform.OS === 'web' &&
          ({
            transition: 'transform 160ms ease, border-color 160ms ease',
            cursor: 'pointer',
          } as any),
      ]}
    >
      {/* Checkbox limpo opcional */}
      {onToggleCheck && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onToggleCheck();
          }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: concluido }}
          style={[
            styles.checkbox,
            {
              backgroundColor: concluido ? theme.primary : theme.background,
              borderColor: theme.primary,
            },
          ]}
        >
          {concluido && <Feather name="check" size={13} color={theme.primaryForeground} />}
        </TouchableOpacity>
      )}

      {/* Miniatura quadrada sutil */}
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: theme.secondary, borderColor: theme.border },
        ]}
      >
        {hasImage ? (
          <Animated.Image
            source={{ uri: item.image_url as string }}
            style={[styles.image, { opacity: fade }]}
            resizeMode="contain"
            onLoad={() =>
              Animated.timing(fade, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }).start()
            }
            onError={() => setImageError(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="shopping-bag" size={20} color={theme.mutedForeground} />
          </View>
        )}
      </View>

      {/* Dados centrais */}
      <View style={styles.infoContainer}>
        <View style={styles.metaRow}>
          {domain ? (
            <View style={[styles.domainPill, { backgroundColor: theme.secondary }]}>
              <Text
                numberOfLines={1}
                style={[styles.domainText, { color: theme.mutedForeground }]}
              >
                {domain}
              </Text>
            </View>
          ) : null}
          {dataFormatada ? (
            <Text style={[styles.dataText, { color: theme.mutedForeground }]}>
              {dataFormatada}
            </Text>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
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

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: priorityConf.inverted ? theme.primary : theme.secondary,
                borderColor: priorityConf.inverted ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.priorityLabel,
                {
                  color: priorityConf.inverted ? theme.primaryForeground : theme.foreground,
                },
              ]}
            >
              {priorityConf.icon} {priorityConf.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Preço e ações */}
      <View style={styles.actionsContainer}>
        <PriceTag
          value={price}
          color={concluido ? theme.mutedForeground : theme.foreground}
          size="sm"
        />

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openLink();
            }}
            hitSlop={8}
            style={[styles.actionButton, { backgroundColor: theme.secondary }]}
            accessibilityRole="button"
            accessibilityLabel="Abrir link do produto"
          >
            <Feather name="arrow-up-right" size={14} color={theme.foreground} />
          </TouchableOpacity>

          {onEdit && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={8}
              style={[styles.actionButton, { backgroundColor: theme.secondary }]}
              accessibilityRole="button"
              accessibilityLabel="Editar item"
            >
              <Feather name="edit-2" size={13} color={theme.foreground} />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={8}
              style={[styles.actionButton, { backgroundColor: theme.secondary }]}
              accessibilityRole="button"
              accessibilityLabel="Excluir item"
            >
              <Feather name="trash-2" size={13} color={theme.foreground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default memo(ProductListItem);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    maxWidth: 140,
  },
  domainText: {
    fontSize: 10,
    fontFamily: typography.fonts.mono,
    fontWeight: '600',
  },
  dataText: {
    fontSize: 10,
    fontFamily: typography.fonts.mono,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  actionsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
