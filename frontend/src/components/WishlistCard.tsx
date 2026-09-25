import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';
import { WishlistItem } from '../types';

interface WishlistCardProps {
  item: WishlistItem;
  onLongPress: () => void;
  onDelete: () => void;
}

export default function WishlistCard({ item, onLongPress, onDelete }: WishlistCardProps) {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    if (item.url) {
      const targetUrl =
        item.url.startsWith('http://') || item.url.startsWith('https://')
          ? item.url
          : 'https://' + item.url;
      Linking.openURL(targetUrl).catch((err) => {
        console.warn('Nao foi possivel abrir o link:', err);
      });
    }
  };

  const getPriorityLabel = (p: number) => {
    const map: Record<number, { color: string; label: string }> = {
      1: { color: theme.priority1, label: 'P1' },
      2: { color: theme.priority2, label: 'P2' },
      3: { color: theme.priority3, label: 'P3' },
      4: { color: theme.priority4, label: 'P4' },
      5: { color: theme.priority5, label: 'P5' },
    };
    return map[p] || { color: theme.mutedForeground, label: 'P' + p };
  };

  const priorityInfo = getPriorityLabel(item.priority);
  const hasValidImage = Boolean(item.image_url) && !imageError;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={'Desejo: ' + (item.title || 'Sem titulo')}
    >
      <View style={styles.imageContainer}>
        {hasValidImage ? (
          <Image
            source={{ uri: item.image_url as string }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: theme.surface }]}>
            <Feather
              name="image"
              size={32}
              color={theme.primarySoft}
              style={styles.placeholderIcon}
            />
            <Text style={[styles.placeholderText, { color: theme.mutedForeground }]}>
              Sem Imagem
            </Text>
          </View>
        )}

        {/* Priority Badge */}
        <View style={[styles.badge, { backgroundColor: priorityInfo.color }]}>
          <Text style={[styles.badgeText, { color: theme.primaryForeground }]}>
            {priorityInfo.label}
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={onDelete}
          activeOpacity={0.6}
          style={[styles.deleteBtn, { backgroundColor: theme.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Apagar item"
        >
          <Feather name="trash-2" size={14} color={theme.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.foreground }]}>
          {item.title || 'Sem titulo'}
        </Text>

        <View style={styles.footerRow}>
          <Feather name="link-2" size={12} color={theme.mutedForeground} style={{ marginRight: 4 }} />
          <Text numberOfLines={1} style={[styles.urlText, { color: theme.mutedForeground }]}>
            {item.url ? item.url.replace(/^https?:\/\/(www\.)?/, '') : 'Ver produto'}
          </Text>
          <Feather name="external-link" size={14} color={theme.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: typography.spacing.xs + 2,
    borderRadius: typography.radii.lg,
    borderWidth: 1.2,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  imageContainer: {
    width: '100%',
    height: 165,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    marginBottom: typography.spacing.xs,
  },
  placeholderText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: typography.spacing.sm + 2,
    left: typography.spacing.sm + 2,
    paddingHorizontal: typography.spacing.sm + 2,
    paddingVertical: typography.spacing.xs,
    borderRadius: typography.radii.full,
    elevation: 2,
  },
  badgeText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  deleteBtn: {
    position: 'absolute',
    top: typography.spacing.sm + 2,
    right: typography.spacing.sm + 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  content: {
    padding: typography.spacing.md - 2,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    minHeight: 36,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: typography.spacing.xs + 2,
  },
  urlText: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs - 1,
    marginRight: typography.spacing.xs,
  },
});