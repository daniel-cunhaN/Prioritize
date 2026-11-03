/**
 * DesktopHeader.tsx — Cabeçalho Minimalista Monocromático para Web / Desktop
 *
 * Unifica marca tipográfica em alto contraste, barra de busca em pílula,
 * seletor de navegação flutuante e botão primário de criação rápida com Design Spell.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';
import { NAV_ITEMS, HomeTab } from './BottomNav';
import BotaoNovoDesejo from './BotaoNovoDesejo';

interface Props {
  active: HomeTab;
  userEmail: string;
  onSelect: (tab: HomeTab) => void;
  onAddPress: () => void;
  children: React.ReactNode;
}

export default function DesktopHeader({ active, userEmail, onSelect, onAddPress, children }: Props) {
  const theme = useTheme();
  const nomeCurto = (userEmail || 'usuario').split('@')[0];

  return (
    <View style={styles.row}>
      {/* Identidade Visual Minimalista Monocromática */}
      <Pressable
        onPress={() => onSelect('home')}
        style={styles.brand}
        accessibilityRole="link"
        accessibilityLabel="Prioritize - Início"
      >
        <View style={[styles.simboloMarca, { backgroundColor: theme.primary }]}>
          <Text style={[styles.simboloTexto, { color: theme.primaryForeground }]}>P.</Text>
        </View>
        <Text style={[styles.textoMarca, { color: theme.foreground }]}>Prioritize</Text>
      </Pressable>

      {/* Barra de busca centralizada */}
      <View style={styles.search}>{children}</View>

      {/* Abas em formato pílula + Botão Primário com Design Spell */}
      <View style={styles.navContainer}>
        <View
          style={[
            styles.trilhaPilulas,
            { backgroundColor: theme.secondary, borderColor: theme.border },
          ]}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <Pressable
                key={item.key}
                nativeID={`header-nav-${item.key}`}
                onPress={() => onSelect(item.key)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }: any) => [
                  styles.navItem,
                  {
                    backgroundColor: isActive ? theme.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather
                  name={item.icon}
                  size={15}
                  color={isActive ? theme.primaryForeground : theme.mutedForeground}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: isActive ? theme.primaryForeground : theme.foreground,
                    },
                  ]}
                >
                  {item.key === 'account' ? nomeCurto : item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Botão Novo Desejo com Design Spell (aura tátil, rotação e sparkle) */}
        <BotaoNovoDesejo
          onPress={onAddPress}
          exibirAtalho
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  simboloMarca: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simboloTexto: {
    fontFamily: typography.fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  textoMarca: {
    fontFamily: typography.fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  search: {
    flex: 1,
    maxWidth: 520,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trilhaPilulas: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    height: 36,
    borderRadius: radius.full,
  },
  navLabel: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
});
