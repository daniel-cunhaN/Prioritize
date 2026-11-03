/**
 * BottomNav.tsx — Barra de Navegação Flutuante em Formato Pílula (Floating Pill Nav Bar)
 *
 * Navegação mobile minimalista monocromática com abas em pílula de alto contraste
 * e gatilho central circular (+) para abertura rápida do Quick Creation Sheet.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius, shadows } from '../../theme';

export type HomeTab = 'home' | 'checklist' | 'activity' | 'account' | 'explore';

export const NAV_ITEMS: {
  key: HomeTab;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
}[] = [
  { key: 'home', label: 'Início', icon: 'grid' },
  { key: 'checklist', label: 'Foco', icon: 'check-square' },
  { key: 'activity', label: 'Log', icon: 'activity' },
  { key: 'account', label: 'Conta', icon: 'user' },
];

export const BOTTOM_NAV_HEIGHT = 68;

interface Props {
  active: HomeTab;
  bottomInset: number;
  onSelect: (tab: HomeTab) => void;
  onAddPress?: () => void;
}

export default function BottomNav({ active, bottomInset, onSelect, onAddPress }: Props) {
  const theme = useTheme();

  return (
    <View
      pointerEvents={Platform.OS === 'web' ? undefined : 'box-none'}
      style={[
        styles.wrapperExterno,
        { bottom: Math.max(bottomInset, 14) },
        Platform.OS === 'web' && ({ pointerEvents: 'box-none' } as any),
      ]}
    >
      <View
        style={[
          styles.pilulaFlutuante,
          {
            backgroundColor: theme.popover,
            borderColor: theme.border,
          },
          shadows.lg,
          Platform.OS === 'web' &&
            ({
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any),
        ]}
        accessibilityRole="tablist"
      >
        {NAV_ITEMS.map((item) => {
          const ativo = active === item.key;
          return (
            <Pressable
              key={item.key}
              nativeID={`bottom-nav-${item.key}`}
              onPress={() => onSelect(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.abaPilula,
                {
                  backgroundColor: ativo ? theme.primary : 'transparent',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather
                name={item.icon}
                size={17}
                color={ativo ? theme.primaryForeground : theme.mutedForeground}
              />
              {ativo && (
                <Text
                  style={[
                    styles.rotuloAtivo,
                    { color: theme.primaryForeground },
                  ]}
                >
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}

        {/* Botão circular integrado para abrir o Quick Creation Bottom Sheet */}
        {onAddPress && (
          <Pressable
            onPress={onAddPress}
            accessibilityRole="button"
            accessibilityLabel="Adicionar novo desejo"
            style={({ pressed }) => [
              styles.botaoCircularAdicionar,
              {
                backgroundColor: theme.primary,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <Feather name="plus" size={20} color={theme.primaryForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperExterno: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 60,
  },
  pilulaFlutuante: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 4,
  },
  abaPilula: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.full,
  },
  rotuloAtivo: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  botaoCircularAdicionar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
