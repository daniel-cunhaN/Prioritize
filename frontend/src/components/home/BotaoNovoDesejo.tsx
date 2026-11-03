/**
 * BotaoNovoDesejo.tsx — Botão "Novo Desejo" com Design Spell & Micro-interações Monocromáticas
 *
 * Implementado sob a diretriz "Design Spells":
 * - Feedback tátil de escala fluida e retorno elástico (spring effect).
 * - Halo difuso monocromático em estado hovered no Web (boxShadow de alto contraste).
 * - Ícone "+" em badge circular com micro-rotação de 90° e escala suave.
 * - Tipografia limpa, equilibrada e alinhada à altura padrão da barra (44px).
 * - Badge de atalho (⌘N) em formato de tecla "kbd" minimalista.
 * - Totalmente livre de ícones inválidos (sem warnings no console Web) e com zero erros de hidratação.
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
            { scale: pressed ? 0.96 : hovered ? 1.02 : 1 },
          ],
        },
        Platform.OS === 'web' && ({
          cursor: 'pointer',
          outlineStyle: 'none',
          userSelect: 'none',
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background-color 0.2s ease',
          boxShadow: hovered
            ? '0 10px 24px -4px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 255, 255, 0.16)'
            : '0 2px 8px -2px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        } as any),
        style,
      ]}
    >
      {/* Badge Circular do Ícone "+" com Micro-rotação fluida */}
      <View
        style={[
          styles.iconeBadge,
          ehGrande ? styles.iconeBadgeGrande : styles.iconeBadgeMedio,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            transform: [
              { rotate: hovered ? '90deg' : '0deg' },
              { scale: hovered ? 1.08 : 1 },
            ],
          },
          Platform.OS === 'web' && ({
            transition: 'transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
          } as any),
        ]}
      >
        <Feather
          name="plus"
          size={ehGrande ? 17 : 15}
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

      {/* Badge de Atalho de Teclado (⌘N) elegante no Desktop */}
      {exibirAtalho && Platform.OS === 'web' && (
        <View
          style={[
            styles.atalhoBadge,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.18)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
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
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  // Altura de 44px para sincronia com os outros controles e abas da navegação
  botaoMedio: {
    height: 44,
    paddingLeft: 12,
    paddingRight: 16,
    gap: 8,
  },
  botaoGrande: {
    height: 48,
    paddingLeft: 16,
    paddingRight: 22,
    gap: 10,
  },
  iconeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  iconeBadgeMedio: {
    width: 24,
    height: 24,
  },
  iconeBadgeGrande: {
    width: 28,
    height: 28,
  },
  textoBotao: {
    fontFamily: typography.fonts.sans,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textoMedio: {
    fontSize: 13,
  },
  textoGrande: {
    fontSize: 14,
  },
  atalhoBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  textoAtalho: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
