import React, { useEffect, useRef, useState } from 'react';
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
import { register, checkEmailAvailable } from '../api';

type EmailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function RequirementRow({
  met,
  label,
  idle,
}: {
  met: boolean;
  label: string;
  idle: boolean;
}) {
  const theme = useTheme();
  const color = idle
    ? theme.mutedForeground
    : met
    ? theme.success
    : theme.error;

  return (
    <View style={styles.reqRow}>
      <Feather
        name={idle ? 'circle' : met ? 'check-circle' : 'x-circle'}
        size={14}
        color={color}
      />
      <Text style={[styles.reqText, { color }]}>{label}</Text>
    </View>
  );
}

export default function RegisterScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | undefined>();
  const [emailSuccess, setEmailSuccess] = useState<string | undefined>();
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [confirmSuccess, setConfirmSuccess] = useState<string | undefined>();
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  const emailCheckSeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEmailFormatValid = (val: string) => EMAIL_REGEX.test(val.trim());
  const passwordOk = password.length >= MIN_PASSWORD;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const clearEmailFeedback = () => {
    setEmailError(undefined);
    setEmailSuccess(undefined);
    setEmailStatus('idle');
  };

  const runEmailCheck = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      clearEmailFeedback();
      return;
    }
    if (!isEmailFormatValid(trimmed)) {
      setEmailStatus('invalid');
      setEmailError('Formato de e-mail inválido.');
      setEmailSuccess(undefined);
      return;
    }

    const seq = ++emailCheckSeq.current;
    setEmailStatus('checking');
    setEmailError(undefined);
    setEmailSuccess(undefined);

    try {
      const result = await checkEmailAvailable(trimmed);
      if (seq !== emailCheckSeq.current) return;

      if (result.available) {
        setEmailStatus('available');
        setEmailError(undefined);
        setEmailSuccess('E-mail disponível.');
      } else {
        setEmailStatus('taken');
        setEmailSuccess(undefined);
        setEmailError(result.message);
      }
    } catch {
      if (seq !== emailCheckSeq.current) return;
      // Sem bloquear o registo se a verificação falhar — valida no submit
      setEmailStatus('idle');
      setEmailError(undefined);
      setEmailSuccess(undefined);
    }
  };

  const scheduleEmailCheck = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runEmailCheck(value), 550);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!touchedPassword && !password) return;
    if (!password) {
      setPasswordError('A senha é obrigatória.');
    } else if (!passwordOk) {
      setPasswordError(`Mínimo de ${MIN_PASSWORD} caracteres.`);
    } else {
      setPasswordError(undefined);
    }
  }, [password, passwordOk, touchedPassword]);

  useEffect(() => {
    if (!touchedConfirm && !confirmPassword) return;
    if (!confirmPassword) {
      setConfirmError('Confirme a sua senha.');
      setConfirmSuccess(undefined);
    } else if (!passwordsMatch) {
      setConfirmError('As senhas não coincidem.');
      setConfirmSuccess(undefined);
    } else {
      setConfirmError(undefined);
      setConfirmSuccess('As senhas coincidem.');
    }
  }, [confirmPassword, passwordsMatch, touchedConfirm]);

  const handleRegister = async () => {
    let hasError = false;
    setTouchedPassword(true);
    setTouchedConfirm(true);

    if (!email.trim()) {
      setEmailError('O e-mail é obrigatório.');
      setEmailStatus('invalid');
      hasError = true;
    } else if (!isEmailFormatValid(email)) {
      setEmailError('Formato de e-mail inválido.');
      setEmailStatus('invalid');
      hasError = true;
    } else if (emailStatus === 'taken') {
      hasError = true;
    } else if (emailStatus === 'checking') {
      Alert.alert('Aguarde', 'Ainda estamos a verificar o e-mail.');
      return;
    }

    if (!password) {
      setPasswordError('A senha é obrigatória.');
      hasError = true;
    } else if (!passwordOk) {
      setPasswordError(`Mínimo de ${MIN_PASSWORD} caracteres.`);
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmError('Confirme a sua senha.');
      setConfirmSuccess(undefined);
      hasError = true;
    } else if (!passwordsMatch) {
      setConfirmError('As senhas não coincidem.');
      setConfirmSuccess(undefined);
      hasError = true;
    }

    if (hasError) return;

    try {
      setLoading(true);
      await register(email, password);
      navigation.replace('Home');
    } catch (error: any) {
      console.warn('Erro ao registar:', error?.response?.data || error.message);
      const detail = error?.response?.data?.detail;
      const code = typeof detail === 'object' ? detail?.code : undefined;
      const errorMsg =
        typeof detail === 'string'
          ? detail
          : detail?.message
          ? detail.message
          : Array.isArray(detail)
          ? detail[0]?.msg
          : 'Não foi possível criar a conta. Tente novamente.';

      if (code === 'EMAIL_ALREADY_EXISTS') {
        setEmailStatus('taken');
        setEmailSuccess(undefined);
        setEmailError(errorMsg);
        return;
      }

      Alert.alert('Erro ao Criar Conta', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !!email.trim() &&
    isEmailFormatValid(email) &&
    emailStatus !== 'taken' &&
    emailStatus !== 'checking' &&
    emailStatus !== 'invalid' &&
    passwordOk &&
    passwordsMatch &&
    !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Feather
            name="arrow-left"
            size={18}
            color={theme.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.backText, { color: theme.primary }]}>Voltar</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            Criar Conta
          </Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            Comece a organizar e a priorizar os seus desejos de compra.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              clearEmailFeedback();
              scheduleEmailCheck(val);
            }}
            onBlur={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              runEmailCheck(email);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            icon="mail"
            error={emailError}
            success={emailSuccess}
            status={
              emailStatus === 'checking'
                ? 'checking'
                : emailStatus === 'available'
                ? 'success'
                : 'default'
            }
          />

          {emailStatus === 'taken' ? (
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={[
                styles.emailTakenBanner,
                { backgroundColor: theme.errorSoft, borderColor: theme.error },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ir para o login"
            >
              <Feather name="log-in" size={16} color={theme.error} />
              <Text style={[styles.emailTakenText, { color: theme.error }]}>
                Já tem conta com este e-mail?{' '}
                <Text style={{ fontWeight: typography.weights.bold }}>
                  Entrar
                </Text>
              </Text>
            </Pressable>
          ) : null}

          <Input
            label="Senha"
            placeholder="Crie uma senha"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setTouchedPassword(true);
            }}
            onBlur={() => setTouchedPassword(true)}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            icon="lock"
            error={passwordError}
            hint={
              !touchedPassword && !password
                ? `Mínimo de ${MIN_PASSWORD} caracteres`
                : undefined
            }
          />

          <View style={styles.reqList}>
            <RequirementRow
              idle={!touchedPassword && !password}
              met={passwordOk}
              label={`Pelo menos ${MIN_PASSWORD} caracteres`}
            />
          </View>

          <Input
            label="Confirmar Senha"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              setTouchedConfirm(true);
            }}
            onBlur={() => setTouchedConfirm(true)}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            icon="check-circle"
            error={confirmError}
            success={confirmSuccess}
          />

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: canSubmit
                  ? theme.primary
                  : theme.mutedForeground,
                shadowColor: theme.shadow,
                opacity: pressed || loading ? 0.82 : canSubmit ? 1 : 0.55,
              },
            ]}
            onPress={handleRegister}
            disabled={loading || emailStatus === 'taken'}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
          >
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator
                  color={theme.primaryForeground}
                  size="small"
                />
                <Text
                  style={[styles.btnText, { color: theme.primaryForeground }]}
                >
                  A criar conta...
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.btnText, { color: theme.primaryForeground }]}
              >
                Criar Conta
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.footerLink}
          accessibilityRole="button"
          accessibilityLabel="Já tem conta? Entrar"
        >
          <Text style={[styles.footerText, { color: theme.mutedForeground }]}>
            Já tem conta?{' '}
            <Text
              style={{
                color: theme.primary,
                fontWeight: typography.weights.bold,
              }}
            >
              Entrar
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: typography.spacing.lg,
    paddingVertical: typography.spacing.lg,
    justifyContent: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: typography.spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: typography.spacing.xs,
  },
  backText: {
    fontFamily: typography.fonts.sans,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.sm,
  },
  header: { marginBottom: typography.spacing.xl },
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
    marginBottom: typography.spacing.lg,
  },
  emailTakenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: typography.radii.sm,
    borderWidth: 1,
    marginTop: -8,
    marginBottom: typography.spacing.md,
  },
  emailTakenText: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
  reqList: {
    marginTop: -8,
    marginBottom: typography.spacing.md,
    marginLeft: typography.spacing.xs,
    gap: 6,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqText: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
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
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
