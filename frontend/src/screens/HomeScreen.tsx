/**
 * HomeScreen.tsx — Main wishlist screen (Menu Principal)
 *
 * Themed with Claude Amber palette. Features a branded header,
 * an empty state illustration when no wishes exist, and a
 * prominent "registrar desejo" action button. Inspired by the
 * Uizard Smart POS template's clean, card-based layout.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const theme = useTheme();

  const handleRegisterWish = () => {
    console.log('Registrar desejo clicado');
  };

  /* ── Dynamic styles based on theme ── */
  const dynamicStyles = {
    safeArea: {
      backgroundColor: theme.background,
    },
    headerBar: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.foreground,
    },
    headerSubtitle: {
      color: theme.mutedForeground,
    },
    emptyCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    emptyIconCircle: {
      backgroundColor: theme.muted,
    },
    emptyIconText: {
      color: theme.primary,
    },
    emptyTitle: {
      color: theme.foreground,
    },
    emptyDescription: {
      color: theme.mutedForeground,
    },
    fab: {
      backgroundColor: theme.primary,
    },
    fabText: {
      color: theme.primaryForeground,
    },
    statsCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    statsValue: {
      color: theme.primary,
    },
    statsLabel: {
      color: theme.mutedForeground,
    },
  };

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      {/* ── Header Bar ── */}
      <View style={[styles.headerBar, dynamicStyles.headerBar, shadows.sm]}>
        <View style={styles.headerContent}>
          <View>
            <Text
              style={[styles.headerTitle, dynamicStyles.headerTitle]}
              accessibilityRole="header"
            >
              Meus Desejos
            </Text>
            <Text style={[styles.headerSubtitle, dynamicStyles.headerSubtitle]}>
              Organize e priorize o que importa
            </Text>
          </View>
          {/* Avatar / settings placeholder */}
          <View
            style={[styles.avatarCircle, { backgroundColor: theme.secondary }]}
            accessibilityLabel="Perfil do usuário"
          >
            <Text style={[styles.avatarText, { color: theme.secondaryForeground }]}>
              U
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Quick Stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>0</Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>Total</Text>
          </View>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>0</Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>Alta prioridade</Text>
          </View>
          <View style={[styles.statsCard, dynamicStyles.statsCard, shadows.sm]}>
            <Text style={[styles.statsValue, dynamicStyles.statsValue]}>0</Text>
            <Text style={[styles.statsLabel, dynamicStyles.statsLabel]}>Recentes</Text>
          </View>
        </View>

        {/* ── Empty State ── */}
        <View style={[styles.emptyCard, dynamicStyles.emptyCard, shadows.md]}>
          {/* Icon placeholder — star/wish icon using text */}
          <View style={[styles.emptyIconCircle, dynamicStyles.emptyIconCircle]}>
            <Text style={[styles.emptyIconText, dynamicStyles.emptyIconText]}>
              ★
            </Text>
          </View>
          <Text
            style={[styles.emptyTitle, dynamicStyles.emptyTitle]}
            accessibilityRole="header"
          >
            Nenhum desejo cadastrado
          </Text>
          <Text style={[styles.emptyDescription, dynamicStyles.emptyDescription]}>
            Comece adicionando seu primeiro desejo.{'\n'}
            Toque no botão abaixo para registrar.
          </Text>

          {/* Inline CTA for empty state */}
          <TouchableOpacity
            style={[styles.inlineButton, { backgroundColor: theme.secondary }]}
            onPress={handleRegisterWish}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Adicionar primeiro desejo"
          >
            <Text style={[styles.inlineButtonText, { color: theme.primary }]}>
              + Adicionar desejo
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab, shadows.lg]}
        onPress={handleRegisterWish}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Registrar novo desejo"
        accessibilityHint="Abre o formulário para adicionar um novo desejo à lista"
      >
        <Text style={[styles.fabIcon, dynamicStyles.fabText]}>+</Text>
        <Text style={[styles.fabText, dynamicStyles.fabText]}>
          Novo Desejo
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ── Static Styles ── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  /* Header */
  headerBar: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['5xl'],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    letterSpacing: typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xxs,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing['2xl'],
    paddingBottom: 120, // space for FAB
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  statsCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
  },
  statsLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  /* Empty State */
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    textAlign: 'center',
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing['2xl'],
  },
  inlineButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  inlineButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: spacing['3xl'],
    right: spacing['2xl'],
    left: spacing['2xl'],
    height: 56,
    borderRadius: radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fabIcon: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  fabText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
});
