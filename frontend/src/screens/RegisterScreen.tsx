<<<<<<< Updated upstream
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
=======
/**
 * RegisterScreen.tsx — Tela de criação de conta refatorada
 *
 * Características de UI/UX e Segurança:
 * - Cabeçalho consistente com o tema e branding
 * - Botão de registro com Google (sem Apple conforme diretrizes)
 * - Divisor visual padronizado
 * - Campos de input com ícones minimalistas
 * - Toggle de visibilidade com ícones profissionais (sem emojis de macaco)
 * - Indicador de força de senha em tempo real com barra progressiva
 * - Componente AlertBox integrado para feedbacks claros
 * - Validação estrita do lado do cliente e sanitização anti-XSS
 * - Armazenamento de token JWT em memória
 * - Responsivo e Mobile-First
 *
 * Paleta: Claude Amber (theme.ts)
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
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
import AlertBox, { TipoAlerta } from '../components/AlertBox';
import {
  validarEmail,
  validarForcaSenha,
  sanitizarInput,
  removerHTML,
  definirToken,
  type ResultadoForcaSenha,
} from '../utils/validacao';

/* Largura máxima centralizada para desktop/tablet */
const LARGURA_MAXIMA_FORM = 420;

export default function RegisterScreen({ navigation }: any) {
  /* ── Estados do formulário ── */
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);

  /* ── Feedback de Alerta (AlertBox) ── */
  const [alerta, setAlerta] = useState<{ tipo: TipoAlerta; mensagem: string } | null>(null);

  /* ── Estados de foco e erros locais ── */
  const [emailFocado, setEmailFocado] = useState(false);
  const [senhaFocada, setSenhaFocada] = useState(false);
  const [confirmarSenhaFocada, setConfirmarSenhaFocada] = useState(false);

  const [erroEmail, setErroEmail] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [erroConfirmarSenha, setErroConfirmarSenha] = useState('');

  const refInputSenha = useRef<TextInput>(null);
  const refInputConfirmarSenha = useRef<TextInput>(null);

  const tema = useTheme();

  /* ── Cálculo em tempo real da força da senha ── */
  const forcaSenha: ResultadoForcaSenha = useMemo(() => {
    if (!senha) {
      return {
        valido: false,
        forca: 'fraca',
        criterios: {
          comprimentoMinimo: false,
          temMaiuscula: false,
          temMinuscula: false,
          temNumero: false,
          temEspecial: false,
        },
      };
    }
    return validarForcaSenha(senha);
  }, [senha]);

  /* ── Handlers de input com sanitização anti-XSS ── */
  const handleAlterarEmail = useCallback((texto: string) => {
    const textoLimpo = removerHTML(texto);
    setEmail(textoLimpo);
    if (erroEmail) setErroEmail('');
    if (alerta) setAlerta(null);
  }, [erroEmail, alerta]);

  const handleAlterarSenha = useCallback((texto: string) => {
    const textoLimpo = removerHTML(texto);
    setSenha(textoLimpo);
    if (erroSenha) setErroSenha('');
    if (erroConfirmarSenha) setErroConfirmarSenha('');
    if (alerta) setAlerta(null);
  }, [erroSenha, erroConfirmarSenha, alerta]);

  const handleAlterarConfirmarSenha = useCallback((texto: string) => {
    const textoLimpo = removerHTML(texto);
    setConfirmarSenha(textoLimpo);
    if (erroConfirmarSenha) setErroConfirmarSenha('');
    if (alerta) setAlerta(null);
  }, [erroConfirmarSenha, alerta]);

  /* ── Validação estrita do formulário ── */
  const validarFormulario = (): boolean => {
    let valido = true;

    const resEmail = validarEmail(email);
    if (!resEmail.valido) {
      setErroEmail(resEmail.erro || 'E-mail inválido.');
      valido = false;
    }

    if (!forcaSenha.valido) {
      setErroSenha(forcaSenha.erro || 'A senha não atende aos requisitos mínimos.');
      valido = false;
    }

    if (senha !== confirmarSenha) {
      setErroConfirmarSenha('As senhas não coincidem.');
      valido = false;
    }

    return valido;
  };

  /* ── Submissão de Registro seguro ── */
  const handleRegistro = async () => {
    setAlerta(null);

    if (!validarFormulario()) {
      setAlerta({
        tipo: 'erro',
        mensagem: 'Verifique as informações preenchidas antes de prosseguir.',
      });
      return;
    }

    setCarregando(true);
    try {
      /* Sanitiza antes de enviar */
      const payload = {
        email: sanitizarInput(email.trim().toLowerCase()),
        password: senha,
      };

      const resposta = await client.post('/auth/register', payload);
      const { access_token } = resposta.data;

      definirToken(access_token);

      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync('access_token', access_token);
      } else {
        sessionStorage.setItem('access_token', access_token);
      }

      setAlerta({
        tipo: 'sucesso',
        mensagem: 'Conta registrada com sucesso! Entrando...',
      });

      setTimeout(() => {
        navigation.replace('Home');
      }, 500);
    } catch (erro: any) {
      console.error(erro);
      const detalhe = erro.response?.data?.detail;
      let mensagem = 'Não foi possível concluir o cadastro.';

      if (detalhe?.message) {
        mensagem = detalhe.message;
      } else if (typeof detalhe === 'string') {
        mensagem = detalhe;
      } else if (Array.isArray(detalhe) && detalhe.length > 0) {
        mensagem = detalhe[0]?.msg || 'Dados inválidos.';
      } else if (erro.message === 'Network Error' || !erro.response) {
        mensagem = 'Falha de comunicação com o servidor backend.';
      }

      setAlerta({ tipo: 'erro', mensagem });
>>>>>>> Stashed changes
    } finally {
      setCarregando(false);
    }
  };
<<<<<<< Updated upstream
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
=======

  /* ── Registro com Google (sem Apple) ── */
  const handleRegistroGoogle = () => {
    setAlerta({
      tipo: 'info',
      mensagem: 'Cadastro via conta Google em implementação.',
    });
  };

  /* ── Identificadores visuais da força de senha ── */
  const obterCorForca = () => {
    switch (forcaSenha.forca) {
      case 'forte':
        return '#27ae60';
      case 'media':
        return '#f39c12';
      case 'fraca':
      default:
        return tema.destructive;
    }
  };

  const obterLarguraForca = () => {
    switch (forcaSenha.forca) {
      case 'forte':
        return '100%';
      case 'media':
        return '66%';
      case 'fraca':
      default:
        return '33%';
    }
  };

  const obterTextoForca = () => {
    switch (forcaSenha.forca) {
      case 'forte':
        return 'Senha forte ✓';
      case 'media':
        return 'Senha média';
      case 'fraca':
      default:
        return 'Senha fraca';
    }
  };

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
        showsVerticalScrollIndicator={false}
      >
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
              Crie sua conta e organize seus desejos
            </Text>
          </View>

          {/* ── Card do Formulário ── */}
          <View style={[estilos.cardFormulario, estilosDinamicos.card, shadows.md]}>
            <Text
              style={[estilos.titulo, estilosDinamicos.titulo]}
              accessibilityRole="header"
            >
              Criar Conta
            </Text>
            <Text style={[estilos.descricaoTitulo, estilosDinamicos.subtitulo]}>
              Cadastre-se rapidamente para começar
            </Text>

            {/* ── Caixa de Alerta (Feedback visual) ── */}
            {alerta && (
              <AlertBox
                tipo={alerta.tipo}
                mensagem={alerta.mensagem}
                onFechar={() => setAlerta(null)}
              />
            )}

            {/* ── Botão Social Google (Sem Apple) ── */}
            <TouchableOpacity
              style={[estilos.botaoSocial, estilosDinamicos.botaoSocial]}
              onPress={handleRegistroGoogle}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Registrar com Google"
            >
              <Text style={estilos.iconeSocial}>G</Text>
              <Text style={[estilos.textoBotaoSocial, estilosDinamicos.textoBotaoSocial]}>
                Cadastrar com Google
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

            {/* ── Campo Senha com Força ── */}
            <View style={estilos.grupoInput}>
              <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                Senha
              </Text>
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
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor={estilosDinamicos.corPlaceholder}
                  value={senha}
                  onChangeText={handleAlterarSenha}
                  secureTextEntry={!senhaVisivel}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => refInputConfirmarSenha.current?.focus()}
                  onFocus={() => setSenhaFocada(true)}
                  onBlur={() => setSenhaFocada(false)}
                  accessibilityLabel="Campo de senha"
                />
                {/* Toggle profissional (olho aberto / fechado com corte) */}
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

              {/* Indicador de barra de progresso */}
              {senha.length > 0 && (
                <View style={estilos.containerForcaSenha}>
                  <View style={[estilos.barraForcaFundo, { backgroundColor: tema.muted }]}>
                    <View
                      style={[
                        estilos.barraForcaPreenchimento,
                        {
                          width: obterLarguraForca() as any,
                          backgroundColor: obterCorForca(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[estilos.textoForcaSenha, { color: obterCorForca() }]}>
                    {obterTextoForca()}
                  </Text>
                </View>
              )}

              {/* Critérios dinâmicos */}
              {senha.length > 0 && !forcaSenha.valido && (
                <View style={estilos.containerCriterios}>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.comprimentoMinimo ? '#27ae60' : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.comprimentoMinimo ? '✓' : '•'} 8+ caracteres
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temMaiuscula ? '#27ae60' : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temMaiuscula ? '✓' : '•'} Letra maiúscula
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temMinuscula ? '#27ae60' : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temMinuscula ? '✓' : '•'} Letra minúscula
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temNumero ? '#27ae60' : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temNumero ? '✓' : '•'} Número
                  </Text>
                </View>
              )}

              {!!erroSenha && (
                <Text style={[estilos.textoErro, estilosDinamicos.textoErro]}>
                  {erroSenha}
                </Text>
              )}
            </View>

            {/* ── Campo Confirmar Senha ── */}
            <View style={estilos.grupoInput}>
              <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                Confirmar Senha
              </Text>
              <View
                style={[
                  estilos.containerInput,
                  estilosDinamicos.input(confirmarSenhaFocada, !!erroConfirmarSenha),
                ]}
              >
                <Text
                  style={[
                    estilos.iconeInput,
                    { color: estilosDinamicos.corIconeInput(confirmarSenhaFocada) },
                  ]}
                >
                  🔒
                </Text>
                <TextInput
                  ref={refInputConfirmarSenha}
                  style={[estilos.campoTexto, { color: tema.foreground }]}
                  placeholder="Repita sua senha"
                  placeholderTextColor={estilosDinamicos.corPlaceholder}
                  value={confirmarSenha}
                  onChangeText={handleAlterarConfirmarSenha}
                  secureTextEntry={!confirmarSenhaVisivel}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleRegistro}
                  onFocus={() => setConfirmarSenhaFocada(true)}
                  onBlur={() => {
                    setConfirmarSenhaFocada(false);
                    if (confirmarSenha && senha !== confirmarSenha) {
                      setErroConfirmarSenha('As senhas não coincidem.');
                    }
                  }}
                  accessibilityLabel="Campo de confirmação de senha"
                />
                <TouchableOpacity
                  onPress={() => setConfirmarSenhaVisivel(!confirmarSenhaVisivel)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={confirmarSenhaVisivel ? 'Ocultar confirmação' : 'Exibir confirmação'}
                  style={estilos.botaoToggle}
                >
                  <Text style={[estilos.iconeToggle, { color: tema.mutedForeground }]}>
                    {confirmarSenhaVisivel ? '👁' : '⊘'}
                  </Text>
                </TouchableOpacity>
              </View>
              {confirmarSenha.length > 0 && senha === confirmarSenha && (
                <Text style={estilos.textoSucesso}>✓ Senhas coincidem</Text>
              )}
              {!!erroConfirmarSenha && (
                <Text style={[estilos.textoErro, estilosDinamicos.textoErro]}>
                  {erroConfirmarSenha}
                </Text>
              )}
            </View>

            {/* ── Botão Primário ── */}
            <TouchableOpacity
              style={[
                estilos.botaoPrimario,
                estilosDinamicos.botaoPrimario,
                carregando && estilos.botaoDesabilitado,
              ]}
              onPress={handleRegistro}
              disabled={carregando}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={carregando ? 'Cadastrando' : 'Cadastrar'}
            >
              {carregando ? (
                <ActivityIndicator color={tema.primaryForeground} size="small" />
              ) : (
                <Text style={[estilos.textoBotaoPrimario, estilosDinamicos.textoBotaoPrimario]}>
                  Cadastrar
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Rodapé ── */}
          <View style={estilos.containerRodape}>
            <View style={estilos.linhaLogin}>
              <Text style={[estilos.textoRodape, estilosDinamicos.textoLink]}>
                Já tem uma conta?
              </Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Voltar para login"
              >
                <Text style={[estilos.textoLinkDestaque, estilosDinamicos.destaqueLink]}>
                  Faça Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
>>>>>>> Stashed changes
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
<<<<<<< Updated upstream
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
=======

const estilos = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
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
    marginBottom: spacing.md,
  },
  rotulo: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
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
  containerForcaSenha: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  barraForcaFundo: {
    flex: 1,
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barraForcaPreenchimento: {
    height: '100%',
    borderRadius: radius.full,
  },
  textoForcaSenha: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    fontFamily: typography.fonts.sans,
    minWidth: 90,
    textAlign: 'right',
  },
  containerCriterios: {
    marginTop: spacing.sm,
    gap: spacing.xxs,
  },
  textoCriterio: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
  },
  textoErro: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
  },
  textoSucesso: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
    color: '#27ae60',
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
  linhaLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textoRodape: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  textoLinkDestaque: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
  },
});
>>>>>>> Stashed changes
