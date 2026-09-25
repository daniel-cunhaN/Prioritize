import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

export default function Input({ label, error, icon, ...props }: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return theme.error;
    if (isFocused) return theme.borderFocus;
    return theme.border;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      
      <View 
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: getBorderColor(),
          }
        ]}
      >
        {icon && (
          <Feather 
            name={icon} 
            size={20} 
            color={isFocused ? theme.borderFocus : theme.mutedForeground} 
            style={styles.icon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: theme.foreground }
          ]}
          placeholderTextColor={theme.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={14} color={theme.error} />
          <Text style={[styles.error, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: typography.spacing.md,
    width: '100%',
  },
  label: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
    marginBottom: typography.spacing.xs + 2,
    marginLeft: typography.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderRadius: typography.radii.md,
    paddingHorizontal: typography.spacing.md,
  },
  icon: {
    marginRight: typography.spacing.sm,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: typography.spacing.xs,
    marginLeft: typography.spacing.xs,
    gap: 4,
  },
  error: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.xs,
  },
});