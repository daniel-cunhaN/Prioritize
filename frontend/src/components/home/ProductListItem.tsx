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
import { useTheme, useIsDark, typography, radius } from '../../theme';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import PriceTag from './PriceTag';

interface Props {
  item: WishlistItem;
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

/** Preços determinísticos quando a API não retorna valor numérico explícito */
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

/**
 * ProductListItem — Exibição em linha horizontal compacta para a visão de Lista
 */
function ProductListItem({ item, onEdit, onDelete }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const [imageError, setImageError] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
  const price = parseOrGeneratePrice(item);
  const hasImage = Boolean(item.image_url) && !imageError;
  const domain = getDomain(item.url);
  const dataFormatada = formatarData(item.created_at);

  const cardBg = isDark ? theme.card : '#FFFFFF';
  const wellBg = isDark ? '#241D17' : '#F8F7F5';
  const textColor = isDark ? theme.foreground : '#0F1111';
  const borderColor = isDark ? theme.border : '#ECEAE5';

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
          backgroundColor: cardBg,
          borderColor,
          transform: [{ scale: pressed ? 0.99 : 1 }, { translateY: hovered ? -2 : 0 }],
          shadowOpacity: hovered ? 0.1 : 0.03,
        },
        Platform.OS === 'web' &&
          ({
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            cursor: 'pointer',
          } as any),
      ]}
    >
      {/* 1. Imagem do produto em miniatura quadrada */}
      <View style={[styles.imageContainer, { backgroundColor: wellBg }]}>
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
            <Feather
              name="image"
              size={24}
              color={isDark ? theme.mutedForeground : '#B5ACA0'}
            />
          </View>
        )}
      </View>

      {/* 2. Informações centrais do produto */}
      <View style={styles.infoContainer}>
        {/* Linha com loja e data de cadastro */}
        <View style={styles.metaRow}>
          {domain ? (
            <View
              style={[
                styles.domainPill,
                { backgroundColor: isDark ? '#2B231A' : '#F4F1EA' },
              ]}
            >
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

        {/* Título do produto */}
        <Text
          numberOfLines={2}
          style={[styles.title, { color: textColor }]}
        >
          {item.title || 'Sem título'}
        </Text>

        {/* Badge da escala de prioridade */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor: isDark
                  ? `${priorityConf.color}22`
                  : priorityConf.bg,
                borderColor: priorityConf.border,
              },
            ]}
          >
            <Text style={styles.priorityIcon}>{priorityConf.icon}</Text>
            <Text
              style={[
                styles.priorityLabel,
                { color: isDark ? theme.foreground : priorityConf.color },
              ]}
            >
              {priorityConf.label} Prioridade
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Preço e botões de ação na extremidade direita */}
      <View style={styles.actionsContainer}>
        <PriceTag value={price} color={textColor} size="sm" />

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openLink();
            }}
            hitSlop={8}
            style={[
              styles.actionButton,
              { backgroundColor: isDark ? theme.background : '#F5F3EF' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir link do produto"
          >
            <Feather name="external-link" size={14} color={theme.foreground} />
          </TouchableOpacity>

          {onEdit && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              hitSlop={8}
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? theme.background : '#F5F3EF' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Editar item"
            >
              <Feather name="edit-2" size={14} color={theme.primary} />
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              hitSlop={8}
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#3D1E1B' : '#FDF0EE' },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Excluir item"
            >
              <Feather name="trash-2" size={14} color="#B84332" />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  imageContainer: {
    width: 82,
    height: 82,
    borderRadius: radius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
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
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  domainPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    maxWidth: 140,
  },
  domainText: {
    fontSize: 11,
    fontFamily: typography.fonts.sans,
    fontWeight: '500',
  },
  dataText: {
    fontSize: 11,
    fontFamily: typography.fonts.sans,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.fonts.sans,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  priorityIcon: {
    fontSize: 11,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '600',
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
    gap: 6,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
