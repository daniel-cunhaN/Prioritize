import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';

interface EmptyStateProps {
  iconName?: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
}

export default function EmptyState({ iconName = 'shopping-bag', title, description }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.iconCircle, 
          { 
            backgroundColor: theme.card, 
            borderColor: theme.border 
          }
        ]}
      >
        <Feather name={iconName} size={36} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: theme.mutedForeground }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: typography.spacing.xxl,
    paddingHorizontal: typography.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: typography.radii.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: typography.spacing.lg,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md + 2,
    marginBottom: typography.spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
});
