import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';

type FieldStatus = 'default' | 'error' | 'success' | 'checking';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  success?: string;
  hint?: string;
  status?: FieldStatus;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

export default function Input({
  label,
  error,
  success,
  hint,
  status = 'default',
  icon,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const resolvedStatus: FieldStatus = error
    ? 'error'
    : success
    ? 'success'
    : status;

  const getBorderColor = () => {
    if (resolvedStatus === 'error') return theme.error;
    if (resolvedStatus === 'success') return theme.success;
    if (resolvedStatus === 'checking') return theme.borderFocus;
    if (isFocused) return theme.borderFocus;
    return theme.border;
  };

  const feedback =
    error ||
    success ||
    (resolvedStatus === 'checking' ? 'A verificar...' : hint);

  const feedbackColor =
    resolvedStatus === 'error'
      ? theme.error
      : resolvedStatus === 'success'
      ? theme.success
      : theme.mutedForeground;

  const feedbackIcon: React.ComponentProps<typeof Feather>['name'] | null =
    resolvedStatus === 'error'
      ? 'alert-circle'
      : resolvedStatus === 'success'
      ? 'check-circle'
      : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surface,
            borderColor: getBorderColor(),
          },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={20}
            color={
              isFocused || resolvedStatus === 'checking'
                ? theme.borderFocus
                : resolvedStatus === 'success'
                ? theme.success
                : resolvedStatus === 'error'
                ? theme.error
                : theme.mutedForeground
            }
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, { color: theme.foreground }]}
          placeholderTextColor={theme.mutedForeground}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {resolvedStatus === 'checking' ? (
          <ActivityIndicator size="small" color={theme.borderFocus} />
        ) : resolvedStatus === 'success' ? (
          <Feather name="check" size={18} color={theme.success} />
        ) : null}
      </View>

      {feedback ? (
        <View style={styles.feedbackContainer}>
          {feedbackIcon ? (
            <Feather name={feedbackIcon} size={14} color={feedbackColor} />
          ) : null}
          <Text style={[styles.feedback, { color: feedbackColor }]}>
            {feedback}
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
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: typography.spacing.xs,
    marginLeft: typography.spacing.xs,
    gap: 4,
  },
  feedback: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.medium,
    fontSize: typography.sizes.xs,
    lineHeight: 16,
  },
});
