/**
 * RegisterScreen.tsx — Tela de Criação de Conta Monocromática de Alto Contraste
 *
 * Características de UI/UX e Segurança:
 * - Estética minimalista monocromática com monograma P., tipografia bold e botões pílula
 * - Campos de input com ícones vetoriais Feather (mail, lock, eye / eye-off)
 * - Indicador progressivo monocromático de força de senha em tempo real
 * - Validação estrita do lado do cliente e sanitização anti-XSS
 * - Armazenamento seguro de token JWT
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
        localStorage.setItem('access_token', access_token);
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
    } finally {
      setCarregando(false);
    }
  };

  /* ── Registro com Google ── */
  const handleRegistroGoogle = () => {
    setAlerta({
      tipo: 'info',
      mensagem: 'Cadastro via conta Google em implementação.',
    });
  };

  /* ── Redirecionamento seguro para a tela de Login ── */
  const handleIrParaLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Login');
    }
  };

  /* ── Identificadores visuais monocromáticos da força de senha ── */
  const obterCorForca = () => {
    switch (forcaSenha.forca) {
      case 'forte':
        return tema.primary;
      case 'media':
        return tema.mutedForeground;
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
        return '● Senha forte';
      case 'media':
        return '◐ Senha média';
      case 'fraca':
      default:
        return '○ Senha fraca';
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
    corIconeInput: (focado: boolean) => (focado ? tema.foreground : tema.mutedForeground),
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
          {/* ── Monograma e Cabeçalho Monocromático ── */}
          <View style={estilos.containerMarca}>
            <View style={[estilos.monogramaBadge, { backgroundColor: tema.primary }]}>
              <Text style={[estilos.monogramaTexto, { color: tema.primaryForeground }]}>P.</Text>
            </View>
            <Text
              style={[estilos.textoMarca, estilosDinamicos.textoMarca]}
              accessibilityRole="header"
            >
              Prioritize
            </Text>
            <Text style={[estilos.subtitulo, estilosDinamicos.subtitulo]}>
              Crie sua conta e priorize o que realmente importa
            </Text>
          </View>

          {/* ── Card do Formulário ── */}
          <View style={[estilos.cardFormulario, estilosDinamicos.card, shadows.sm]}>
            <Text
              style={[estilos.titulo, estilosDinamicos.titulo]}
              accessibilityRole="header"
            >
              Criar Conta
            </Text>
            <Text style={[estilos.descricaoTitulo, estilosDinamicos.subtitulo]}>
              Cadastre-se em segundos para sincronizar sua lista
            </Text>

            {/* ── Caixa de Alerta (Feedback visual) ── */}
            {alerta && (
              <AlertBox
                tipo={alerta.tipo}
                mensagem={alerta.mensagem}
                onFechar={() => setAlerta(null)}
              />
            )}

            {/* ── Botão Social em Pílula (Google) ── */}
            <TouchableOpacity
              style={[estilos.botaoSocial, estilosDinamicos.botaoSocial]}
              onPress={handleRegistroGoogle}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Registrar com Google"
            >
              <Text style={[estilos.iconeSocial, { color: tema.foreground }]}>G</Text>
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
                <Feather
                  name="mail"
                  size={16}
                  color={estilosDinamicos.corIconeInput(emailFocado)}
                  style={estilos.iconeVetorial}
                />
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

            {/* ── Campo Senha com Força Monocromática ── */}
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
                <Feather
                  name="lock"
                  size={16}
                  color={estilosDinamicos.corIconeInput(senhaFocada)}
                  style={estilos.iconeVetorial}
                />
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
                <TouchableOpacity
                  onPress={() => setSenhaVisivel(!senhaVisivel)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Exibir senha'}
                  style={estilos.botaoToggle}
                >
                  <Feather
                    name={senhaVisivel ? 'eye' : 'eye-off'}
                    size={17}
                    color={tema.mutedForeground}
                  />
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
                      { color: forcaSenha.criterios.comprimentoMinimo ? tema.foreground : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.comprimentoMinimo ? '✓' : '○'} 8+ caracteres
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temMaiuscula ? tema.foreground : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temMaiuscula ? '✓' : '○'} Letra maiúscula
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temMinuscula ? tema.foreground : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temMinuscula ? '✓' : '○'} Letra minúscula
                  </Text>
                  <Text
                    style={[
                      estilos.textoCriterio,
                      { color: forcaSenha.criterios.temNumero ? tema.foreground : tema.mutedForeground },
                    ]}
                  >
                    {forcaSenha.criterios.temNumero ? '✓' : '○'} Número
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
                <Feather
                  name="lock"
                  size={16}
                  color={estilosDinamicos.corIconeInput(confirmarSenhaFocada)}
                  style={estilos.iconeVetorial}
                />
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
                  <Feather
                    name={confirmarSenhaVisivel ? 'eye' : 'eye-off'}
                    size={17}
                    color={tema.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
              {confirmarSenha.length > 0 && senha === confirmarSenha && (
                <Text style={[estilos.textoSucesso, { color: tema.foreground }]}>
                  ✓ Senhas coincidem
                </Text>
              )}
              {!!erroConfirmarSenha && (
                <Text style={[estilos.textoErro, estilosDinamicos.textoErro]}>
                  {erroConfirmarSenha}
                </Text>
              )}
            </View>

            {/* ── Botão Primário em Formato Pílula ── */}
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
                onPress={handleIrParaLogin}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Voltar para a tela de login"
              >
                <Text style={[estilos.textoLinkDestaque, estilosDinamicos.destaqueLink]}>
                  Faça Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
  monogramaBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  monogramaTexto: {
    fontSize: 22,
    fontWeight: typography.weights.extrabold,
    fontFamily: typography.fonts.sans,
    letterSpacing: -0.8,
  },
  textoMarca: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.extrabold,
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
    fontWeight: typography.weights.extrabold,
    fontFamily: typography.fonts.sans,
    letterSpacing: -0.4,
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
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconeSocial: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.extrabold,
  },
  textoBotaoSocial: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
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
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    marginBottom: spacing.sm,
  },
  containerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  iconeVetorial: {
    marginRight: spacing.sm,
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
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    minWidth: 96,
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
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fonts.sans,
    marginTop: spacing.xs,
  },
  botaoPrimario: {
    height: 50,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  textoBotaoPrimario: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
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
    gap: spacing.xs,
  },
  textoRodape: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.sans,
  },
  textoLinkDestaque: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.fonts.sans,
  },
});
