import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';
import Input from '../components/Input';
import { login } from '../api';

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleLogin = async () => {
    let hasError = false;
    setEmailError(undefined);
    setPasswordError(undefined);

    if (!email.trim()) {
      setEmailError('O e-mail é obrigatório.');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Formato de e-mail inválido.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('A senha é obrigatória.');
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);
      await login(email, password);
      navigation.replace('Home');
    } catch (error: any) {
      console.warn('Erro ao realizar login:', error?.response?.data || error.message);
      const detail = error?.response?.data?.detail;
      const errorMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message
          ? detail.message
          : Array.isArray(detail)
          ? detail[0]?.msg
          : 'Credenciais inválidas ou erro no servidor.';
      Alert.alert('Erro ao Entrar', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBadge}>
          <Feather name="layers" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.brandBadgeText, { color: theme.primary }]}>PRIORITIZE</Text>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>A sua Wishlist</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Organize os seus desejos de compra com sofisticação e prioridade.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (emailError) setEmailError(undefined);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={emailError}
          />

          <Input
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (passwordError) setPasswordError(undefined);
            }}
            secureTextEntry
            icon="lock"
            error={passwordError}
          />

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: theme.primary,
                shadowColor: theme.shadow,
                opacity: pressed || loading ? 0.82 : 1,
              },
            ]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Entrar"
          >
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color={theme.primaryForeground} size="small" />
                <Text style={[styles.btnText, { color: theme.primaryForeground }]}>
                  Entrando...
                </Text>
              </View>
            ) : (
              <Text style={[styles.btnText, { color: theme.primaryForeground }]}>
                Entrar
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Register')}
          style={styles.footerLink}
          accessibilityRole="button"
          accessibilityLabel="Criar conta"
        >
          <Text style={[styles.footerText, { color: theme.mutedForeground }]}>
            Ainda não tem conta?{' '}
            <Text style={{ color: theme.primary, fontWeight: typography.weights.bold }}>
              Registe-se
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: typography.spacing.lg,
    paddingVertical: typography.spacing.xl,
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: typography.spacing.xs,
  },
  brandBadgeText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xs,
    letterSpacing: 2,
  },
  header: {
    marginBottom: typography.spacing.xl,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xxl,
    marginBottom: typography.spacing.xs,
  },
  subtitle: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  card: {
    padding: typography.spacing.lg,
    borderRadius: typography.radii.lg,
    borderWidth: 1.2,
    marginBottom: typography.spacing.xl,
  },
  btn: {
    height: 54,
    borderRadius: typography.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: typography.spacing.sm,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
  footerLink: {
    alignItems: 'center',
    paddingVertical: typography.spacing.md,
  },
  footerText: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.sm,
  },
});