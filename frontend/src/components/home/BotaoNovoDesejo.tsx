/**
 * BotaoNovoDesejo.tsx — Botão "Novo Desejo" com Design Spell & Micro-interações Monocromáticas
 *
 * Implementado sob a diretriz "Design Spells":
 * - Feedback tátil de escala fluida e retorno elástico (spring effect).
 * - Aura/glow monocromático difuso em estado hovered no Web.
 * - Ícone "+" em badge circular com rotação e escala sutil.
 * - Detalhe mágico com micro-ícone sparkle (✦) e atalho elegante de produtividade.
 * - Zero warnings de hidratação DOM no React Native Web.
 */

import React, { useState } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';

interface PropsBotaoNovoDesejo {
  onPress: () => void;
  tamanho?: 'md' | 'lg';
  exibirAtalho?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export default function BotaoNovoDesejo({
  onPress,
  tamanho = 'md',
  exibirAtalho = false,
  style,
  accessibilityLabel = 'Novo desejo',
}: PropsBotaoNovoDesejo) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);

  const ehGrande = tamanho === 'lg';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.botaoBase,
        ehGrande ? styles.botaoGrande : styles.botaoMedio,
        {
          backgroundColor: theme.primary,
          transform: [
            { scale: pressed ? 0.96 : hovered ? 1.03 : 1 },
          ],
        },
        Platform.OS === 'web' && ({
          cursor: 'pointer',
          outlineStyle: 'none',
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background-color 0.2s ease',
          boxShadow: hovered
            ? '0 12px 28px -4px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.18)'
            : '0 4px 14px -2px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        } as any),
        style,
      ]}
    >
      {/* Badge Circular do Ícone com Micro-rotação tátil */}
      <View
        style={[
          styles.iconeBadge,
          ehGrande ? styles.iconeBadgeGrande : styles.iconeBadgeMedio,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            transform: [{ rotate: hovered ? '90deg' : '0deg' }, { scale: hovered ? 1.1 : 1 }],
          },
          Platform.OS === 'web' && ({
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          } as any),
        ]}
      >
        <Feather
          name="plus"
          size={ehGrande ? 17 : 14}
          color={theme.primaryForeground}
        />
      </View>

      {/* Rótulo Principal "Novo Desejo" */}
      <Text
        style={[
          styles.textoBotao,
          ehGrande ? styles.textoGrande : styles.textoMedio,
          { color: theme.primaryForeground },
        ]}
      >
        Novo Desejo
      </Text>

      {/* Detalhe Mágico: Sparkle Sutil (Design Spell) */}
      <View style={styles.sparkleBadge}>
        <Feather
          name="sparkles"
          size={ehGrande ? 12 : 11}
          color={theme.primaryForeground}
          style={{ opacity: hovered ? 1 : 0.75 }}
        />
      </View>

      {/* Badge de Atalho Pro-Level (⌘N) quando habilitado */}
      {exibirAtalho && Platform.OS === 'web' && (
        <View
          style={[
            styles.atalhoBadge,
            { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
          ]}
        >
          <Text style={[styles.textoAtalho, { color: theme.primaryForeground }]}>
            ⌘N
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botaoBase: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  botaoMedio: {
    height: 42,
    paddingLeft: 8,
    paddingRight: 16,
    gap: 8,
  },
  botaoGrande: {
    height: 48,
    paddingLeft: 10,
    paddingRight: 20,
    gap: 10,
  },
  iconeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  iconeBadgeMedio: {
    width: 26,
    height: 26,
  },
  iconeBadgeGrande: {
    width: 30,
    height: 30,
  },
  textoBotao: {
    fontFamily: typography.fonts.sans,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  textoMedio: {
    fontSize: 13,
  },
  textoGrande: {
    fontSize: 14,
  },
  sparkleBadge: {
    marginLeft: -2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atalhoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  textoAtalho: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
