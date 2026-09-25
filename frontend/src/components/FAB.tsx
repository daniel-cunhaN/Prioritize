import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';

interface Props {
  onPress: () => void;
  label?: string;
}

export default function FAB({ onPress, label }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: theme.primary,
          shadowColor: theme.shadow,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label || 'Adicionar novo desejo'}
      accessibilityHint="Abre o painel para cadastrar um novo item na lista de desejos"
    >
      <Feather name="plus" size={28} color={theme.primaryForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: typography.spacing.lg + 4,
    right: typography.spacing.lg,
    width: 62,
    height: 62,
    borderRadius: typography.radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    zIndex: 99,
  },
});