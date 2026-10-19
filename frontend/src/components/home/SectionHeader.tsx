import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsDark, useTheme, typography } from '../../theme';

interface Props {
  title: string;
  onMorePress?: () => void;
  moreLabel?: string;
  expanded?: boolean;
}

export default function SectionHeader({ title, onMorePress, moreLabel, expanded }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const color = isDark ? theme.foreground : '#0F1111';

  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, { color }]}>
        {title}
      </Text>
      {onMorePress && (
        <Pressable
          onPress={onMorePress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={moreLabel || 'Ver mais'}
          style={({ pressed, hovered }: any) => [styles.more, { opacity: pressed ? 0.6 : 1, backgroundColor: hovered ? theme.secondary : 'transparent' }]}
        >
          {moreLabel ? <Text style={[styles.moreLabel, { color: theme.primary }]}>{moreLabel}</Text> : null}
          <Feather name={expanded ? 'chevron-up' : 'chevron-right'} size={26} color={moreLabel ? theme.primary : color} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  title: { flex: 1, fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: 21, letterSpacing: -0.3 },
  more: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingLeft: 8, paddingVertical: 2 },
  moreLabel: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.semibold, fontSize: 14 },
});
