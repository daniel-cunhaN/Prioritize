<<<<<<< Updated upstream
import React, { useState } from 'react';
=======
/**
 * LoginScreen.tsx — Tela de autenticação refatorada
 *
 * Características de UI/UX e Segurança:
 * - Cabeçalho limpo com logo e branding
 * - Botão de login social (apenas Google, sem Apple conforme requisitos)
 * - Divisor visual "ou"
 * - Campos de input com ícones discretos e profissionais
 * - Toggle de visibilidade com ícones profissionais (sem emojis de macaco)
 * - Caixa de alerta (AlertBox) com feedback inline integrado ao tema
 * - Validação estrita do lado do cliente (Regex e obrigatoriedade)
 * - Sanitização anti-XSS nos inputs
 * - Tokens JWT gerenciados em memória
 * - Layout responsivo Mobile-First
 *
 * Paleta: Claude Amber (theme.ts)
 */

import React, { useState, useRef, useCallback } from 'react';
>>>>>>> Stashed changes
import {
  View,
  Text,
  StyleSheet,
<<<<<<< Updated upstream
  Pressable,
  Alert,
=======
  Platform,
  Image,
  TouchableOpacity,
>>>>>>> Stashed changes
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
<<<<<<< Updated upstream
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
=======
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';
import { useTheme, spacing, radius, shadows, typography } from '../theme';
import AlertBox, { TipoAlerta } from '../components/AlertBox';
import {
  validarEmail,
  sanitizarInput,
  removerHTML,
  definirToken,
} from '../utils/validacao';

/* Largura máxima do card para telas desktop e tablets */
const LARGURA_MAXIMA_FORM = 420;

export default function LoginScreen({ navigation }: any) {
  /* ── Estados do formulário ── */
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  /* ── Feedback de Alerta (AlertBox) ── */
  const [alerta, setAlerta] = useState<{ tipo: TipoAlerta; mensagem: string } | null>(null);
>>>>>>> Stashed changes

  /* ── Estados de foco e validação de campo ── */
  const [emailFocado, setEmailFocado] = useState(false);
  const [senhaFocada, setSenhaFocada] = useState(false);
  const [erroEmail, setErroEmail] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  const refInputSenha = useRef<TextInput>(null);
  const tema = useTheme();

  /* ── Manipulação e sanitização do e-mail ── */
  const handleAlterarEmail = useCallback((texto: string) => {
    const textoLimpo = removerHTML(texto);
    setEmail(textoLimpo);
    if (erroEmail) setErroEmail('');
    if (alerta) setAlerta(null);
  }, [erroEmail, alerta]);

  /* ── Manipulação e sanitização da senha ── */
  const handleAlterarSenha = useCallback((texto: string) => {
    const textoLimpo = removerHTML(texto);
    setSenha(textoLimpo);
    if (erroSenha) setErroSenha('');
    if (alerta) setAlerta(null);
  }, [erroSenha, alerta]);

  /* ── Validação estrita dos campos ── */
  const validarFormulario = (): boolean => {
    let valido = true;

    const resEmail = validarEmail(email);
    if (!resEmail.valido) {
      setErroEmail(resEmail.erro || 'E-mail inválido.');
      valido = false;
    }

    if (!senha.trim()) {
      setErroSenha('Informe sua senha.');
      valido = false;
    }

    return valido;
  };

  /* ── Processo de Login seguro ── */
  const handleLogin = async () => {
<<<<<<< Updated upstream
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
=======
    setAlerta(null);

    if (!validarFormulario()) {
      setAlerta({
        tipo: 'erro',
        mensagem: 'Por favor, corrija os campos indicados abaixo.',
      });
      return;
    }

    setCarregando(true);
    try {
      /* Sanitização básica anti-XSS antes do envio */
      const payload = {
        email: sanitizarInput(email.trim().toLowerCase()),
        password: senha,
      };

      const resposta = await client.post('/auth/login', payload);
      const { access_token } = resposta.data;

      /* Armazena token JWT prioritariamente em memória */
      definirToken(access_token);

      /* Persistência condicional segura */
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('access_token', access_token);
      } else {
        sessionStorage.setItem('access_token', access_token);
      }

      setAlerta({
        tipo: 'sucesso',
        mensagem: 'Autenticação realizada com sucesso!',
      });

      /* Redirecionamento após breve transição */
      setTimeout(() => {
        navigation.replace('Home');
      }, 500);
    } catch (erro: any) {
      console.error(erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem = 'Não foi possível realizar o login. Verifique suas credenciais.';

      if (detalhe?.message) {
        mensagem = detalhe.message;
      } else if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length > 0) {
        mensagem = detalhe[0]?.msg || 'Dados incorretos.';
      } else if (erro.message === 'Network Error' || !erro.response) {
        mensagem = 'Falha de comunicação com o servidor. Verifique se o serviço está ativo.';
      }

      setAlerta({ tipo: 'erro', mensagem });
>>>>>>> Stashed changes
    } finally {
      setCarregando(false);
    }
  };

<<<<<<< Updated upstream
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
=======
  /* ── Login Social com Google (sem Apple) ── */
  const handleLoginGoogle = () => {
    setAlerta({
      tipo: 'info',
      mensagem: 'A integração com Google está em fase de ativação.',
    });
  };

  /* ── Estilos dinâmicos orientados ao tema Claude Amber ── */
  const estilosDinamicos = {
    container: { backgroundColor: tema.background },
    card: { backgroundColor: tema.card, borderColor: tema.border },
    textoMarca: { color: tema.foreground },
    subtitulo: { color: tema.mutedForeground },
    titulo: { color: tema.foreground },
    input: (focado: boolean, comErro: boolean) => ({
      backgroundColor: tema.background,
      borderColor: comErro
        ? tema.destructive
        : focado
          ? tema.ring
          : tema.border,
      color: tema.foreground,
    }),
    corPlaceholder: tema.mutedForeground,
    botaoPrimario: { backgroundColor: tema.primary },
    textoBotaoPrimario: { color: tema.primaryForeground },
    textoLink: { color: tema.mutedForeground },
    destaqueLink: { color: tema.primary },
    divisor: { backgroundColor: tema.border },
    botaoSocial: {
      backgroundColor: tema.background,
      borderColor: tema.border,
    },
    textoBotaoSocial: { color: tema.foreground },
    textoErro: { color: tema.destructive },
    corIconeInput: (focado: boolean) => (focado ? tema.ring : tema.mutedForeground),
  };

  return (
    <KeyboardAvoidingView
      style={[estilos.root, estilosDinamicos.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={estilos.scrollContent}
        keyboardShouldPersistTaps="handled"
>>>>>>> Stashed changes
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
<<<<<<< Updated upstream
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
=======
        <View style={estilos.conteudoCentralizado}>
          {/* ── Branding e Cabeçalho ── */}
          <View style={estilos.containerMarca}>
            <Image
              source={require('../../assets/logo.png')}
              style={estilos.logo}
              accessibilityLabel="Logotipo Prioritize"
            />
            <Text
              style={[estilos.textoMarca, estilosDinamicos.textoMarca]}
              accessibilityRole="header"
            >
              Prioritize
            </Text>
            <Text style={[estilos.subtitulo, estilosDinamicos.subtitulo]}>
              Organize seus desejos com prioridade
            </Text>
          </View>

          {/* ── Card Principal ── */}
          <View style={[estilos.cardFormulario, estilosDinamicos.card, shadows.md]}>
            <Text
              style={[estilos.titulo, estilosDinamicos.titulo]}
              accessibilityRole="header"
            >
              Entrar
            </Text>
            <Text style={[estilos.descricaoTitulo, estilosDinamicos.subtitulo]}>
              Acesse sua conta para visualizar seus itens
            </Text>

            {/* ── Caixa de Alerta (Feedback visual) ── */}
            {alerta && (
              <AlertBox
                tipo={alerta.tipo}
                mensagem={alerta.mensagem}
                onFechar={() => setAlerta(null)}
              />
            )}

            {/* ── Botão de Login Social (Apenas Google) ── */}
            <TouchableOpacity
              style={[estilos.botaoSocial, estilosDinamicos.botaoSocial]}
              onPress={handleLoginGoogle}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Entrar com o Google"
            >
              <Text style={estilos.iconeSocial}>G</Text>
              <Text style={[estilos.textoBotaoSocial, estilosDinamicos.textoBotaoSocial]}>
                Continuar com Google
              </Text>
            </TouchableOpacity>

            {/* ── Divisor Visual "ou" ── */}
            <View style={estilos.containerDivisor}>
              <View style={[estilos.linhaDivisor, estilosDinamicos.divisor]} />
              <Text style={[estilos.textoDivisor, estilosDinamicos.subtitulo]}>
                ou com e-mail
              </Text>
              <View style={[estilos.linhaDivisor, estilosDinamicos.divisor]} />
            </View>

            {/* ── Campo E-mail ── */}
            <View style={estilos.grupoInput}>
              <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                E-mail
              </Text>
              <View
                style={[
                  estilos.containerInput,
                  estilosDinamicos.input(emailFocado, !!erroEmail),
                ]}
              >
                <Text
                  style={[
                    estilos.iconeInput,
                    { color: estilosDinamicos.corIconeInput(emailFocado) },
                  ]}
                >
                  ✉
                </Text>
                <TextInput
                  style={[estilos.campoTexto, { color: tema.foreground }]}
                  placeholder="seu@email.com"
                  placeholderTextColor={estilosDinamicos.corPlaceholder}
                  value={email}
                  onChangeText={handleAlterarEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => refInputSenha.current?.focus()}
                  onFocus={() => setEmailFocado(true)}
                  onBlur={() => {
                    setEmailFocado(false);
                    if (email.trim()) {
                      const res = validarEmail(email);
                      if (!res.valido) setErroEmail(res.erro || '');
                    }
                  }}
                  accessibilityLabel="Campo de e-mail"
                />
              </View>
              {!!erroEmail && (
                <Text style={[estilos.textoErro, estilosDinamicos.textoErro]}>
                  {erroEmail}
                </Text>
              )}
            </View>

            {/* ── Campo Senha ── */}
            <View style={estilos.grupoInput}>
              <View style={estilos.linhaRotuloSenha}>
                <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                  Senha
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setAlerta({
                      tipo: 'info',
                      mensagem: 'A recuperação de senha estará disponível em breve.',
                    })
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[estilos.linkEsqueciSenha, estilosDinamicos.destaqueLink]}>
                    Esqueceu?
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  estilos.containerInput,
                  estilosDinamicos.input(senhaFocada, !!erroSenha),
                ]}
              >
                <Text
                  style={[
                    estilos.iconeInput,
                    { color: estilosDinamicos.corIconeInput(senhaFocada) },
                  ]}
                >
                  🔒
                </Text>
                <TextInput
                  ref={refInputSenha}
                  style={[estilos.campoTexto, { color: tema.foreground }]}
                  placeholder="Sua senha de acesso"
                  placeholderTextColor={estilosDinamicos.corPlaceholder}
                  value={senha}
                  onChangeText={handleAlterarSenha}
                  secureTextEntry={!senhaVisivel}
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setSenhaFocada(true)}
                  onBlur={() => setSenhaFocada(false)}
                  accessibilityLabel="Campo de senha"
                />
                {/* Toggle minimalista e profissional: Ícones de olho aberto / fechado com corte */}
                <TouchableOpacity
                  onPress={() => setSenhaVisivel(!senhaVisivel)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Exibir senha'}
                  style={estilos.botaoToggle}
                >
                  <Text style={[estilos.iconeToggle, { color: tema.mutedForeground }]}>
                    {senhaVisivel ? '👁' : '⊘'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!!erroSenha && (
                <Text style={[estilos.textoErro, estilosDinamicos.textoErro]}>
                  {erroSenha}
                </Text>
              )}
            </View>

            {/* ── Botão de Ação Primária ── */}
            <TouchableOpacity
              style={[
                estilos.botaoPrimario,
                estilosDinamicos.botaoPrimario,
                carregando && estilos.botaoDesabilitado,
              ]}
              onPress={handleLogin}
              disabled={carregando}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={carregando ? 'Validando' : 'Entrar'}
            >
              {carregando ? (
                <ActivityIndicator color={tema.primaryForeground} size="small" />
              ) : (
                <Text style={[estilos.textoBotaoPrimario, estilosDinamicos.textoBotaoPrimario]}>
                  Entrar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Rodapé com Link para Cadastro ── */}
          <View style={estilos.containerRodape}>
            <View style={estilos.linhaRegistro}>
              <Text style={[estilos.textoRodape, estilosDinamicos.textoLink]}>
                Não tem uma conta?
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Ir para cadastro"
              >
                <Text style={[estilos.textoLinkDestaque, estilosDinamicos.destaqueLink]}>
                  Cadastre-se
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
>>>>>>> Stashed changes
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

<<<<<<< Updated upstream
const styles = StyleSheet.create({
  container: {
=======
const estilos = StyleSheet.create({
  root: {
>>>>>>> Stashed changes
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: typography.spacing.lg,
    paddingVertical: typography.spacing.xl,
    justifyContent: 'center',
<<<<<<< Updated upstream
  },
  brandBadge: {
=======
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  conteudoCentralizado: {
    width: '100%',
    maxWidth: LARGURA_MAXIMA_FORM,
    alignSelf: 'center',
  },
  containerMarca: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: 120,
    height: 65,
    resizeMode: 'contain',
    marginBottom: spacing.sm,
  },
  textoMarca: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
    letterSpacing: typography.letterSpacing.tight,
  },
  subtitulo: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  cardFormulario: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
  },
  titulo: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    textAlign: 'center',
  },
  descricaoTitulo: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  botaoSocial: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconeSocial: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  textoBotaoSocial: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
  },
  containerDivisor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  linhaDivisor: {
    flex: 1,
    height: 1,
  },
  textoDivisor: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    paddingHorizontal: spacing.md,
  },
  grupoInput: {
    marginBottom: spacing.lg,
  },
  rotulo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
  },
  linhaRotuloSenha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkEsqueciSenha: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
  },
  containerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  iconeInput: {
    fontSize: 16,
    marginRight: spacing.sm,
    width: 22,
    textAlign: 'center',
  },
  campoTexto: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
    paddingVertical: 0,
  },
  botaoToggle: {
    paddingLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconeToggle: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  textoErro: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
  },
  botaoPrimario: {
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  textoBotaoPrimario: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  containerRodape: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  linhaRegistro: {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  footerText: {
    fontFamily: typography.fonts.sans,
=======
  textoRodape: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  textoLinkDestaque: {
>>>>>>> Stashed changes
    fontSize: typography.sizes.sm,
  },
});