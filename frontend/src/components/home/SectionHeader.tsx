/**
 * SectionHeader.tsx — Cabeçalho Tipográfico de Seção em Alto Contraste
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';

interface Props {
  title: string;
  onMorePress?: () => void;
  moreLabel?: string;
  expanded?: boolean;
}

export default function SectionHeader({ title, onMorePress, moreLabel, expanded }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text
        accessibilityRole="header"
        numberOfLines={2}
        style={[styles.title, { color: theme.foreground }]}
      >
        {title}
      </Text>
      {onMorePress && (
        <Pressable
          onPress={onMorePress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={moreLabel || 'Ver mais'}
          style={({ pressed }: any) => [
            styles.more,
            {
              backgroundColor: theme.secondary,
              borderColor: theme.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          {moreLabel ? (
            <Text style={[styles.moreLabel, { color: theme.foreground }]}>{moreLabel}</Text>
          ) : null}
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-right'}
            size={16}
            color={theme.foreground}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.5,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moreLabel: {
    fontFamily: typography.fonts.sans,
    fontWeight: '700',
    fontSize: 12,
  },
});
