import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsDark, useTheme, typography } from '../../theme';

export type HomeTab = 'home' | 'account' | 'explore';

export const NAV_ITEMS: { key: HomeTab; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'home', label: 'Início', icon: 'home' },
  { key: 'account', label: 'Conta', icon: 'user' },
  { key: 'explore', label: 'Explorar', icon: 'menu' },
];

export const BOTTOM_NAV_HEIGHT = 62;

interface Props {
  active: HomeTab;
  bottomInset: number;
  onSelect: (tab: HomeTab) => void;
}

/** Navegação inferior fixa para dispositivos móveis (Início com smile, Conta e Explorar) */
export default function BottomNav({ active, bottomInset, onSelect }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fg = isDark ? theme.foreground : '#0F1111';

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(bottomInset, 6),
          height: BOTTOM_NAV_HEIGHT + Math.max(bottomInset, 6),
          backgroundColor: isDark ? ((theme as any).surface || theme.card) : '#FFFFFF',
          borderTopColor: isDark ? theme.border : '#D5D9D9',
        },
      ]}
      accessibilityRole="tablist"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const color = isActive ? theme.primary : fg;
        return (
          <Pressable
            key={item.key}
            nativeID={`bottom-nav-${item.key}`}
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={[styles.indicator, { backgroundColor: isActive ? theme.primary : 'transparent' }]} />
            <Feather name={item.icon} size={25} color={color} />
            {item.key === 'home' ? (
              <View style={[styles.smile, { borderColor: color }]} />
            ) : (
              <Text style={[styles.label, { color, fontWeight: isActive ? '700' : '600' }]}>{item.label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  indicator: { position: 'absolute', top: 0, width: 56, height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  label: { fontFamily: typography.fonts.sans, fontSize: 12 },
  smile: {
    width: 26,
    height: 8,
    marginTop: 1,
    borderBottomWidth: 2.2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
