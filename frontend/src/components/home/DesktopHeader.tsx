import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsDark, useTheme, typography } from '../../theme';
import { NAV_ITEMS, HomeTab } from './BottomNav';

interface Props {
  active: HomeTab;
  userEmail: string;
  onSelect: (tab: HomeTab) => void;
  onAddPress: () => void;
  children: React.ReactNode; // barra de busca
}

/** Header tradicional para desktop: Logo oficial do app + busca + navegação + CTA. */
export default function DesktopHeader({ active, userEmail, onSelect, onAddPress, children }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const fg = isDark ? theme.foreground : '#0F1111';

  return (
    <View style={styles.row}>
      {/* Logotipo oficial idêntico ao da tela de login */}
      <Pressable
        onPress={() => onSelect('home')}
        style={styles.brand}
        accessibilityRole="link"
        accessibilityLabel="Prioritize - Início"
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
          accessibilityLabel="Logotipo Prioritize"
        />
      </Pressable>

      <View style={styles.search}>{children}</View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.key;
          const color = isActive ? theme.primary : fg;
          return (
            <Pressable
              key={item.key}
              nativeID={`header-nav-${item.key}`}
              onPress={() => onSelect(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ hovered, pressed }: any) => [
                styles.navItem,
                {
                  backgroundColor: hovered || isActive ? (isDark ? theme.card : '#F2EEE8') : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name={item.icon} size={20} color={color} />
              <View>
                {item.key === 'account' && (
                  <Text numberOfLines={1} style={[styles.navHint, { color: theme.mutedForeground }]}>
                    Olá, {userEmail.split('@')[0]}
                  </Text>
                )}
                <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          nativeID="header-add-wish"
          onPress={onAddPress}
          accessibilityRole="button"
          accessibilityLabel="Novo desejo"
          style={({ hovered, pressed }: any) => [
            styles.cta,
            { backgroundColor: theme.primary, transform: [{ scale: pressed ? 0.96 : hovered ? 1.03 : 1 }] },
          ]}
        >
          <Feather name="plus" size={18} color={theme.primaryForeground} />
          <Text style={[styles.ctaText, { color: theme.primaryForeground }]}>Novo desejo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 140, height: 44 },
  search: { flex: 1, maxWidth: 720 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  navHint: { fontFamily: typography.fonts.sans, fontSize: 11, maxWidth: 110 },
  navLabel: { fontFamily: typography.fonts.sans, fontSize: 14, fontWeight: typography.weights.bold },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, height: 44, borderRadius: 22, marginLeft: 8 },
  ctaText: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: 14 },
});
