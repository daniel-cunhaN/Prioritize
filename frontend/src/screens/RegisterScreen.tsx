/**
 * RegisterScreen.tsx — Account creation screen
 *
 * Themed with Claude Amber palette, visually consistent with
 * LoginScreen. Card-based form layout with styled inputs,
 * focus states, and accessible action buttons.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';
import { useTheme, spacing, radius, shadows, typography } from '../theme';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const theme = useTheme();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await client.post('/auth/register', { email, password });
      const { access_token } = response.data;

      if (Platform.OS === 'web') {
        localStorage.setItem('access_token', access_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
      }

      if (Platform.OS === 'web') {
        window.alert('Conta criada com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
      }
      // Redireciona para a Home
      navigation.replace('Home');
    } catch (error: any) {
      console.error(error);
      const rawDetail = error.response?.data?.detail;
      let message = 'Erro ao criar conta.';

      if (rawDetail?.message) {
        message = rawDetail.message;
      } else if (typeof rawDetail === 'string') {
        message = rawDetail;
      } else if (Array.isArray(rawDetail) && rawDetail.length > 0) {
        message = rawDetail[0]?.msg || 'Dados inválidos.';
      } else if (error.message === 'Network Error' || !error.response) {
        message = 'Não foi possível conectar ao servidor backend (porta 8000). Verifique se o backend está rodando.';
      }
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Erro', message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Dynamic styles based on theme ── */
  const dynamicStyles = {
    container: {
      backgroundColor: theme.background,
    },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    brandText: {
      color: theme.foreground,
    },
    subtitle: {
      color: theme.mutedForeground,
    },
    title: {
      color: theme.foreground,
    },
    input: (focused: boolean) => ({
      backgroundColor: theme.background,
      borderColor: focused ? theme.ring : theme.border,
      color: theme.foreground,
    }),
    placeholderColor: theme.mutedForeground,
    primaryButton: {
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      color: theme.primaryForeground,
    },
    linkText: {
      color: theme.mutedForeground,
    },
    linkHighlight: {
      color: theme.primary,
    },
    divider: {
      backgroundColor: theme.border,
    },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand / Logo ── */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/iconeapp.png')}
            style={styles.logo}
            accessibilityLabel="Prioritize logo"
          />
          <Text
            style={[styles.brandText, dynamicStyles.brandText]}
            accessibilityRole="header"
          >
            Prioritize
          </Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
            Crie sua conta e comece a priorizar
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={[styles.formCard, dynamicStyles.card, shadows.md]}>
          <Text
            style={[styles.title, dynamicStyles.title]}
            accessibilityRole="header"
          >
            Criar Conta
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.foreground }]}>
              E-mail
            </Text>
            <TextInput
              style={[styles.input, dynamicStyles.input(emailFocused)]}
              placeholder="seu@email.com"
              placeholderTextColor={dynamicStyles.placeholderColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              accessibilityLabel="Campo de e-mail"
              accessibilityHint="Digite seu endereço de e-mail para cadastro"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.foreground }]}>
              Senha
            </Text>
            <TextInput
              style={[styles.input, dynamicStyles.input(passwordFocused)]}
              placeholder="••••••••"
              placeholderTextColor={dynamicStyles.placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              accessibilityLabel="Campo de senha"
              accessibilityHint="Crie uma senha segura"
            />
          </View>

          {/* Primary Action — Register Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              dynamicStyles.primaryButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Cadastrando' : 'Cadastrar'}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={theme.primaryForeground} size="small" />
            ) : (
              <Text style={[styles.primaryButtonText, dynamicStyles.primaryButtonText]}>
                Cadastrar
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer — Login Link ── */}
        <View style={styles.footerContainer}>
          <View style={[styles.divider, dynamicStyles.divider]} />
          <View style={styles.loginRow}>
            <Text style={[styles.footerText, dynamicStyles.linkText]}>
              Já tem uma conta?
            </Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Voltar para login"
            >
              <Text style={[styles.linkText, dynamicStyles.linkHighlight]}>
                Faça Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── Static Styles ── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },

  /* Brand */
  brandContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  logo: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
    marginBottom: spacing.sm,
  },
  brandText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
  },

  /* Form Card */
  formCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },

  /* Inputs */
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
  },

  /* Buttons */
  primaryButton: {
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  buttonDisabled: {
    opacity: 0.7,
  },

  /* Footer */
  footerContainer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.xl,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  linkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
});
