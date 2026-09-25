import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography } from '../theme';
import Input from '../components/Input';
import { register } from '../api';
export default function RegisterScreen({ navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const handleRegister = async () => {
    let hasError = false;
    setEmailError(undefined);
    setPasswordError(undefined);
    setConfirmError(undefined);
    if (!email.trim()) { setEmailError('O e-mail é obrigatório.'); hasError = true; }
    else if (!validateEmail(email)) { setEmailError('Formato inválido.'); hasError = true; }
    if (!password) { setPasswordError('A senha é obrigatória.'); hasError = true; }
    else if (password.length < 6) { setPasswordError('Mínimo 6 caracteres.'); hasError = true; }
    if (password !== confirmPassword) { setConfirmError('As senhas não coincidem.'); hasError = true; }
    if (hasError) return;
    try {
      setLoading(true);
      await register(email, password);
      
      // FIX 1: Feedback Visual e Redirecionamento Correto
      Alert.alert('Conta Criada!', 'A sua conta foi registada com sucesso.', [
        { text: 'Aceder (Login)', onPress: () => navigation.navigate('Login') },
      ]);
      
    } catch (error: any) {
      console.warn('Erro ao registar:', error?.response?.data || error.message);
      const detail = error?.response?.data?.detail;
      const errorMsg = typeof detail === 'string' ? detail : detail?.message ? detail.message : Array.isArray(detail) ? detail[0]?.msg : 'E-mail em uso ou erro no servidor.';
      Alert.alert('Erro ao Criar Conta', errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.backText, { color: theme.primary }]}>Voltar</Text>
        </Pressable>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>Criar Conta</Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>Comece a organizar e a priorizar os seus desejos de compra.</Text>
        </View>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={(val) => { setEmail(val); if (emailError) setEmailError(undefined); }} keyboardType="email-address" autoCapitalize="none" icon="mail" error={emailError} />
          <Input label="Senha (mínimo 6 caracteres)" placeholder="••••••••" value={password} onChangeText={(val) => { setPassword(val); if (passwordError) setPasswordError(undefined); }} secureTextEntry icon="lock" error={passwordError} />
          <Input label="Confirmar Senha" placeholder="••••••••" value={confirmPassword} onChangeText={(val) => { setConfirmPassword(val); if (confirmError) setConfirmError(undefined); }} secureTextEntry icon="check-circle" error={confirmError} />
          <Pressable style={({ pressed }) => [styles.btn, { backgroundColor: theme.primary, shadowColor: theme.shadow, opacity: pressed || loading ? 0.82 : 1 }]} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <View style={styles.btnContent}>
                <ActivityIndicator color={theme.primaryForeground} size="small" />
                <Text style={[styles.btnText, { color: theme.primaryForeground }]}>A Registar...</Text>
              </View>
            ) : (
              <Text style={[styles.btnText, { color: theme.primaryForeground }]}>Registar Conta</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: typography.spacing.lg, paddingVertical: typography.spacing.lg, justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: typography.spacing.md, alignSelf: 'flex-start', paddingVertical: typography.spacing.xs },
  backText: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: typography.sizes.sm },
  header: { marginBottom: typography.spacing.xl },
  title: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: typography.sizes.xxl, marginBottom: typography.spacing.xs },
  subtitle: { fontFamily: typography.fonts.sans, fontSize: typography.sizes.sm, lineHeight: 20 },
  card: { padding: typography.spacing.lg, borderRadius: typography.radii.lg, borderWidth: 1.2, marginBottom: typography.spacing.lg },
  btn: { height: 54, borderRadius: typography.radii.md, justifyContent: 'center', alignItems: 'center', marginTop: typography.spacing.sm, elevation: 3, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontFamily: typography.fonts.sans, fontWeight: typography.weights.bold, fontSize: typography.sizes.md },
});