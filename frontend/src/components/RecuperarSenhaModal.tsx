/**
 * RecuperarSenhaModal.tsx — Modal Interativo em 2 Etapas para Recuperação de Senha
 *
 * Implementa o fluxo completo de "Esqueci minha senha" no Design System Monocromático:
 * - Etapa 1 (solicitar): O usuário informa o e-mail e solicita o token de 6 dígitos.
 * - Etapa 2 (redefinir): Exibe o token híbrido (para testes/apresentação), valida o código
 *   de 6 dígitos e permite cadastrar uma nova senha com indicador de força.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../api/client';
import { useTheme, spacing, radius, shadows, typography } from '../theme';
import AlertBox, { TipoAlerta } from './AlertBox';
import {
  validarEmail,
  validarForcaSenha,
  sanitizarInput,
  removerHTML,
} from '../utils/validacao';

interface PropsRecuperarSenhaModal {
  visivel: boolean;
  emailInicial?: string;
  aoFechar: () => void;
  aoSucessoRedefinicao: (emailRecuperado: string) => void;
}

type EtapaRecuperacao = 'solicitar' | 'redefinir';

export default function RecuperarSenhaModal({
  visivel,
  emailInicial = '',
  aoFechar,
  aoSucessoRedefinicao,
}: PropsRecuperarSenhaModal) {
  const tema = useTheme();

  /* ── Controle de etapa e carregamento ── */
  const [etapa, setEtapa] = useState<EtapaRecuperacao>('solicitar');
  const [carregando, setCarregando] = useState(false);
  const [alerta, setAlerta] = useState<{ tipo: TipoAlerta; mensagem: string } | null>(null);

  /* ── Dados do formulário ── */
  const [email, setEmail] = useState(emailInicial);
  const [token, setToken] = useState('');
  const [tokenDemonstracao, setTokenDemonstracao] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  // Sincroniza o e-mail inicial sempre que o modal é aberto
  useEffect(() => {
    if (visivel) {
      setEmail(emailInicial || '');
      setEtapa('solicitar');
      setToken('');
      setTokenDemonstracao(null);
      setNovaSenha('');
      setConfirmarSenha('');
      setAlerta(null);
    }
  }, [visivel, emailInicial]);

  /* ── Avaliação em tempo real da força da nova senha ── */
  const avaliacaoSenha = validarForcaSenha(novaSenha);

  /**
   * Etapa 1: Solicita a geração e o envio do token de recuperação para o e-mail informado.
   */
  const handleSolicitarToken = async () => {
    setAlerta(null);
    const emailLimpo = removerHTML(email).trim().toLowerCase();

    const validacao = validarEmail(emailLimpo);
    if (!validacao.valido) {
      setAlerta({
        tipo: 'erro',
        mensagem: validacao.erro || 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    setCarregando(true);
    try {
      const resposta = await client.post('/auth/forgot-password', {
        email: sanitizarInput(emailLimpo),
      });

      const preview = resposta.data?.reset_token_preview || null;
      const validade = resposta.data?.expires_in_minutes || 15;

      setTokenDemonstracao(preview);
      if (preview) {
        setToken(String(preview));
      }

      setEtapa('redefinir');
      setAlerta({
        tipo: 'sucesso',
        mensagem: `Token de recuperação gerado! Validade de ${validade} minutos.`,
      });
    } catch (erro: any) {
      const msgApi = erro.response?.data?.message;
      setAlerta({
        tipo: 'erro',
        mensagem:
          msgApi || 'Não foi possível gerar o token. Verifique se o e-mail está cadastrado.',
      });
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Etapa 2: Valida o token de 6 dígitos e persiste a nova senha cadastrada pelo usuário.
   */
  const handleRedefinirSenha = async () => {
    setAlerta(null);
    const emailLimpo = removerHTML(email).trim().toLowerCase();
    const tokenLimpo = removerHTML(token).trim();

    if (!emailLimpo || !validarEmail(emailLimpo).valido) {
      setAlerta({ tipo: 'erro', mensagem: 'Informe o e-mail válido da conta.' });
      return;
    }

    if (!tokenLimpo || tokenLimpo.length < 6) {
      setAlerta({
        tipo: 'erro',
        mensagem: 'Informe o token de recuperação de 6 dígitos.',
      });
      return;
    }

    if (novaSenha.length < 6) {
      setAlerta({
        tipo: 'erro',
        mensagem: 'A nova senha deve possuir pelo menos 6 caracteres.',
      });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setAlerta({
        tipo: 'erro',
        mensagem: 'A confirmação de senha não coincide com a nova senha.',
      });
      return;
    }

    setCarregando(true);
    try {
      await client.post('/auth/reset-password', {
        email: sanitizarInput(emailLimpo),
        token: tokenLimpo,
        new_password: novaSenha,
      });

      aoSucessoRedefinicao(emailLimpo);
    } catch (erro: any) {
      const msgApi = erro.response?.data?.message;
      setAlerta({
        tipo: 'erro',
        mensagem: msgApi || 'Token inválido ou expirado. Solicite um novo código.',
      });
    } finally {
      setCarregando(false);
    }
  };

  /* ── Rótulo monocromático de força de senha ── */
  const obterRotuloForca = () => {
    if (!novaSenha) return null;
    if (avaliacaoSenha.forca === 'forte') return '● Senha forte';
    if (avaliacaoSenha.forca === 'media') return '◐ Senha média';
    return '○ Senha fraca (recomendado: 8+ caracteres, maiúscula e número)';
  };

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={aoFechar}
      accessibilityRole="dialog"
    >
      <KeyboardAvoidingView
        style={estilos.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop para fechar ao clicar fora */}
        <Pressable style={estilos.backdrop} onPress={aoFechar} />

        <View
          style={[
            estilos.card,
            {
              backgroundColor: tema.background,
              borderColor: tema.border,
            },
            shadows.lg,
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={estilos.scrollInterno}
          >
            {/* Cabeçalho com Ícone e Indicador de Etapa */}
            <View style={estilos.cabecalho}>
              <View
                style={[
                  estilos.iconBadge,
                  {
                    backgroundColor: tema.secondary,
                    borderColor: tema.border,
                  },
                ]}
              >
                <Feather
                  name={etapa === 'solicitar' ? 'key' : 'unlock'}
                  size={20}
                  color={tema.foreground}
                />
              </View>

              <Text style={[estilos.eyebrow, { color: tema.mutedForeground }]}>
                {etapa === 'solicitar'
                  ? 'ETAPA 1 DE 2 · SOLICITAR TOKEN'
                  : 'ETAPA 2 DE 2 · NOVA SENHA'}
              </Text>

              <Text style={[estilos.titulo, { color: tema.foreground }]}>
                {etapa === 'solicitar' ? 'Esqueceu sua senha?' : 'Redefinir senha'}
              </Text>

              <Text style={[estilos.subtitulo, { color: tema.mutedForeground }]}>
                {etapa === 'solicitar'
                  ? 'Informe o e-mail da sua conta para gerar um código de recuperação de 6 dígitos.'
                  : 'Digite o token de 6 dígitos recebido e escolha sua nova senha de acesso.'}
              </Text>
            </View>

            {/* Feedback de Alerta */}
            {alerta && (
              <AlertBox
                tipo={alerta.tipo}
                mensagem={alerta.mensagem}
                onFechar={() => setAlerta(null)}
              />
            )}

            {etapa === 'solicitar' ? (
              /* ── ETAPA 1: Solicitar Token por E-mail ── */
              <View style={estilos.secaoFormulario}>
                <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                  E-mail da conta
                </Text>
                <View
                  style={[
                    estilos.containerInput,
                    {
                      backgroundColor: tema.background,
                      borderColor: tema.border,
                    },
                  ]}
                >
                  <Feather
                    name="mail"
                    size={16}
                    color={tema.mutedForeground}
                    style={estilos.iconeInput}
                  />
                  <TextInput
                    style={[estilos.campoTexto, { color: tema.foreground }]}
                    placeholder="seu@email.com"
                    placeholderTextColor={tema.mutedForeground}
                    value={email}
                    onChangeText={(txt) => setEmail(removerHTML(txt))}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="send"
                    onSubmitEditing={handleSolicitarToken}
                    accessibilityLabel="E-mail para recuperação de senha"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    estilos.botaoPrimario,
                    {
                      backgroundColor: tema.primary,
                      opacity: carregando ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSolicitarToken}
                  disabled={carregando}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar token de recuperação"
                >
                  {carregando ? (
                    <ActivityIndicator size="small" color={tema.primaryForeground} />
                  ) : (
                    <Text
                      style={[
                        estilos.textoBotaoPrimario,
                        { color: tema.primaryForeground },
                      ]}
                    >
                      Enviar token de recuperação
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={estilos.rodapeAcoes}>
                  <TouchableOpacity
                    onPress={() => {
                      setAlerta(null);
                      setEtapa('redefinir');
                    }}
                    style={estilos.botaoLinkSecundario}
                  >
                    <Text style={[estilos.textoLinkSecundario, { color: tema.foreground }]}>
                      Já possuo um código de recuperação
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={aoFechar}
                    style={[
                      estilos.botaoSecundario,
                      {
                        backgroundColor: tema.secondary,
                        borderColor: tema.border,
                      },
                    ]}
                  >
                    <Text style={[estilos.textoBotaoSecundario, { color: tema.foreground }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── ETAPA 2: Informar Token + Cadastrar Nova Senha ── */
              <View style={estilos.secaoFormulario}>
                {/* Card Híbrido com o Token Gerado (para uso imediato em testes/apresentação) */}
                {tokenDemonstracao && (
                  <View
                    style={[
                      estilos.cardTokenDemo,
                      {
                        backgroundColor: tema.secondary,
                        borderColor: tema.border,
                      },
                    ]}
                  >
                    <View style={estilos.linhaTopoTokenDemo}>
                      <Text style={[estilos.eyebrowTokenDemo, { color: tema.mutedForeground }]}>
                        ● TOKEN DE RECUPERAÇÃO GERADO
                      </Text>
                      <TouchableOpacity
                        onPress={() => setToken(tokenDemonstracao)}
                        style={[
                          estilos.badgeUsarToken,
                          { backgroundColor: tema.primary },
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoBadgeUsarToken,
                            { color: tema.primaryForeground },
                          ]}
                        >
                          Preenchido ✓
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[estilos.codigoTokenDemo, { color: tema.foreground }]}>
                      {tokenDemonstracao}
                    </Text>
                    <Text style={[estilos.avisoTokenDemo, { color: tema.mutedForeground }]}>
                      Modo híbrido ativo: código preenchido automaticamente e enviado ao log do servidor.
                    </Text>
                  </View>
                )}

                {/* Campo Token de 6 dígitos */}
                <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                  Token de Recuperação (6 dígitos)
                </Text>
                <View
                  style={[
                    estilos.containerInput,
                    {
                      backgroundColor: tema.background,
                      borderColor: tema.border,
                    },
                  ]}
                >
                  <Feather
                    name="hash"
                    size={16}
                    color={tema.mutedForeground}
                    style={estilos.iconeInput}
                  />
                  <TextInput
                    style={[
                      estilos.campoTexto,
                      estilos.campoTokenMono,
                      { color: tema.foreground },
                    ]}
                    placeholder="000000"
                    placeholderTextColor={tema.mutedForeground}
                    value={token}
                    onChangeText={(txt) => setToken(txt.replace(/[^0-9a-zA-Z]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    accessibilityLabel="Token de recuperação de 6 dígitos"
                  />
                </View>

                {/* Campo Nova Senha */}
                <Text style={[estilos.rotulo, { color: tema.foreground }]}>
                  Nova Senha
                </Text>
                <View
                  style={[
                    estilos.containerInput,
                    {
                      backgroundColor: tema.background,
                      borderColor: tema.border,
                    },
                  ]}
                >
                  <Feather
                    name="lock"
                    size={16}
                    color={tema.mutedForeground}
                    style={estilos.iconeInput}
                  />
                  <TextInput
                    style={[estilos.campoTexto, { color: tema.foreground }]}
                    placeholder="Mínimo de 6 caracteres"
                    placeholderTextColor={tema.mutedForeground}
                    value={novaSenha}
                    onChangeText={(txt) => setNovaSenha(removerHTML(txt))}
                    secureTextEntry={!senhaVisivel}
                    autoCapitalize="none"
                    accessibilityLabel="Campo de nova senha"
                  />
                  <TouchableOpacity
                    onPress={() => setSenhaVisivel(!senhaVisivel)}
                    style={estilos.botaoToggleOlho}
                  >
                    <Feather
                      name={senhaVisivel ? 'eye' : 'eye-off'}
                      size={16}
                      color={tema.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                {!!novaSenha && (
                  <Text style={[estilos.indicadorForca, { color: tema.mutedForeground }]}>
                    {obterRotuloForca()}
                  </Text>
                )}

                {/* Campo Confirmar Nova Senha */}
                <Text style={[estilos.rotulo, { color: tema.foreground, marginTop: spacing.sm }]}>
                  Confirmar Nova Senha
                </Text>
                <View
                  style={[
                    estilos.containerInput,
                    {
                      backgroundColor: tema.background,
                      borderColor: tema.border,
                    },
                  ]}
                >
                  <Feather
                    name="check-circle"
                    size={16}
                    color={tema.mutedForeground}
                    style={estilos.iconeInput}
                  />
                  <TextInput
                    style={[estilos.campoTexto, { color: tema.foreground }]}
                    placeholder="Repita a nova senha"
                    placeholderTextColor={tema.mutedForeground}
                    value={confirmarSenha}
                    onChangeText={(txt) => setConfirmarSenha(removerHTML(txt))}
                    secureTextEntry={!senhaVisivel}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleRedefinirSenha}
                    accessibilityLabel="Confirmar nova senha"
                  />
                </View>

                {/* Botão Salvar Nova Senha */}
                <TouchableOpacity
                  style={[
                    estilos.botaoPrimario,
                    {
                      backgroundColor: tema.primary,
                      opacity: carregando ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleRedefinirSenha}
                  disabled={carregando}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Salvar nova senha"
                >
                  {carregando ? (
                    <ActivityIndicator size="small" color={tema.primaryForeground} />
                  ) : (
                    <Text
                      style={[
                        estilos.textoBotaoPrimario,
                        { color: tema.primaryForeground },
                      ]}
                    >
                      Cadastrar nova senha
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={estilos.linhaBotoesInferiores}>
                  <TouchableOpacity
                    style={[
                      estilos.botaoMetade,
                      {
                        backgroundColor: tema.secondary,
                        borderColor: tema.border,
                      },
                    ]}
                    onPress={() => {
                      setAlerta(null);
                      setEtapa('solicitar');
                    }}
                    disabled={carregando}
                  >
                    <Text style={[estilos.textoBotaoSecundario, { color: tema.foreground }]}>
                      Voltar / Reenviar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      estilos.botaoMetade,
                      {
                        backgroundColor: tema.secondary,
                        borderColor: tema.border,
                      },
                    ]}
                    onPress={aoFechar}
                    disabled={carregando}
                  >
                    <Text style={[estilos.textoBotaoSecundario, { color: tema.foreground }]}>
                      Fechar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    zIndex: 1,
  },
  scrollInterno: {
    flexGrow: 1,
  },
  cabecalho: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  titulo: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitulo: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  secaoFormulario: {
    width: '100%',
    marginTop: spacing.xs,
  },
  rotulo: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  containerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  iconeInput: {
    marginRight: spacing.sm,
  },
  campoTexto: {
    flex: 1,
    height: '100%',
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.sans,
    paddingVertical: 0,
  },
  campoTokenMono: {
    fontFamily: typography.fonts.mono,
    fontWeight: '700',
    letterSpacing: 3,
    fontSize: 17,
  },
  botaoToggleOlho: {
    paddingLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicadorForca: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    marginBottom: spacing.xs,
  },
  cardTokenDemo: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  linhaTopoTokenDemo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eyebrowTokenDemo: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeUsarToken: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  textoBadgeUsarToken: {
    fontFamily: typography.fonts.sans,
    fontSize: 10,
    fontWeight: '700',
  },
  codigoTokenDemo: {
    fontFamily: typography.fonts.mono,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    marginVertical: 2,
  },
  avisoTokenDemo: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },
  botaoPrimario: {
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  textoBotaoPrimario: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  rodapeAcoes: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  botaoLinkSecundario: {
    paddingVertical: 4,
  },
  textoLinkSecundario: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textDecorationLine: 'underline',
  },
  botaoSecundario: {
    width: '100%',
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoSecundario: {
    fontFamily: typography.fonts.sans,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
  linhaBotoesInferiores: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  botaoMetade: {
    flex: 1,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
