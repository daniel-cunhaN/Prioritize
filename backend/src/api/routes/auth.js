/**
 * auth.js — Rotas de Autenticação (Cadastro, Login e Recuperação de Senha)
 * Implementa endpoints para registro de novos usuários, emissão de tokens JWT
 * e fluxo completo de recuperação de senha com token temporário de uso único.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { obterBanco } from '../../db/database.js';
import {
  gerarHashSenha,
  verificarSenha,
  criarTokenAcesso,
  gerarTokenRecuperacao,
  gerarHashTokenRecuperacao,
} from '../../utils/seguranca.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.js';
import { enviarEmailRecuperacao } from '../../services/emailRecuperacao.js';

const router = Router();

// Tempo padrão de expiração do token de recuperação em minutos
const VALIDADE_TOKEN_MINUTOS = 15;

/**
 * POST /api/v1/auth/register
 * Cadastra um novo usuário no sistema. Valida se o e-mail já existe.
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};

  // Validação dos campos obrigatórios
  if (!email || !password) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'E-mail e senha são obrigatórios.',
    });
  }

  const db = obterBanco();

  // Verifica se o e-mail já está cadastrado
  const usuarioExistente = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (usuarioExistente) {
    return res.status(400).json({
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Este e-mail já está em uso.',
    });
  }

  // Gera identificador único e hash seguro da senha
  const id = crypto.randomUUID();
  const senhaHasheada = await gerarHashSenha(password);
  const dataAtual = new Date().toISOString();

  // Insere o novo usuário no banco SQLite
  const stmt = db.prepare(`
    INSERT INTO users (id, email, hashed_password, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, email, senhaHasheada, dataAtual, dataAtual);

  // Gera o token de acesso Bearer JWT
  const token = criarTokenAcesso({ sub: id });

  return res.status(201).json({
    access_token: token,
    token_type: 'bearer',
  });
});

/**
 * POST /api/v1/auth/login
 * Autentica o usuário validando e-mail e hash da senha.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  // Validação de entrada
  if (!email || !password) {
    return res.status(400).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou senha incorretos.',
    });
  }

  const db = obterBanco();

  // Localiza usuário pelo e-mail
  const usuario = db.prepare('SELECT id, hashed_password FROM users WHERE email = ?').get(email);
  if (!usuario) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciais de login incorretas.',
    });
  }

  // Compara o hash da senha
  const senhaCorreta = await verificarSenha(password, usuario.hashed_password);
  if (!senhaCorreta) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'Credenciais de login incorretas.',
    });
  }

  // Emite o token de autenticação
  const token = criarTokenAcesso({ sub: usuario.id });

  return res.status(200).json({
    access_token: token,
    token_type: 'bearer',
  });
});

/**
 * POST /api/v1/auth/forgot-password
 * Gera um token temporário de 6 dígitos para recuperação de senha e o envia
 * em modo híbrido (SMTP caso configurado + retorno simulado para ambiente de demonstração).
 */
router.post('/forgot-password', async (req, res) => {
  const emailBruto = req.body?.email;
  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';

  // Valida se o e-mail foi informado
  if (!email) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Informe o endereço de e-mail para recuperação.',
    });
  }

  const db = obterBanco();

  // Localiza o usuário cadastrado pelo endereço de e-mail
  const usuario = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = ?').get(email);
  if (!usuario) {
    return res.status(404).json({
      code: 'USER_NOT_FOUND',
      message: 'Nenhuma conta encontrada com este endereço de e-mail.',
    });
  }

  // Invalida eventuais tokens anteriores ainda ativos deste usuário
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(
    usuario.id
  );

  // Gera novo token numérico de 6 dígitos e calcula seu hash SHA-256
  const tokenPuro = gerarTokenRecuperacao();
  const tokenHash = gerarHashTokenRecuperacao(tokenPuro);
  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + VALIDADE_TOKEN_MINUTOS * 60 * 1000).toISOString();
  const idRegistro = crypto.randomUUID();

  // Salva apenas o hash do token na tabela password_reset_tokens
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(idRegistro, usuario.id, tokenHash, expiraEm, agora.toISOString());

  // Aciona o serviço híbrido de envio de token (console/tela + SMTP opcional)
  const resultadoEntrega = await enviarEmailRecuperacao(
    usuario.email,
    tokenPuro,
    VALIDADE_TOKEN_MINUTOS
  );

  return res.status(200).json({
    message: 'Token de recuperação gerado com sucesso.',
    expires_in_minutes: VALIDADE_TOKEN_MINUTOS,
    delivery_mode: resultadoEntrega.modoEntrega,
    reset_token_preview: resultadoEntrega.tokenPreview,
  });
});

/**
 * POST /api/v1/auth/reset-password
 * Valida o token de recuperação de 6 dígitos e atualiza a senha do usuário.
 */
router.post('/reset-password', async (req, res) => {
  const emailBruto = req.body?.email;
  const tokenBruto = req.body?.token;
  const novaSenha = req.body?.new_password || req.body?.password;

  const email = typeof emailBruto === 'string' ? emailBruto.trim().toLowerCase() : '';
  const token = typeof tokenBruto === 'string' ? tokenBruto.trim() : '';

  // Validação dos campos obrigatórios da redefinição
  if (!email || !token || !novaSenha) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'E-mail, token de recuperação e nova senha são obrigatórios.',
    });
  }

  // Valida comprimento mínimo de segurança da nova senha
  if (typeof novaSenha !== 'string' || novaSenha.length < 6) {
    return res.status(400).json({
      code: 'WEAK_PASSWORD',
      message: 'A nova senha deve possuir pelo menos 6 caracteres.',
    });
  }

  const db = obterBanco();

  // Verifica se o usuário existe
  const usuario = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  if (!usuario) {
    return res.status(404).json({
      code: 'USER_NOT_FOUND',
      message: 'Conta não encontrada para o e-mail informado.',
    });
  }

  // Busca o token ativo correspondente ao hash SHA-256
  const tokenHash = gerarHashTokenRecuperacao(token);
  const registroToken = db
    .prepare(
      `SELECT id, expires_at, used
       FROM password_reset_tokens
       WHERE user_id = ? AND token_hash = ? AND used = 0
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(usuario.id, tokenHash);

  if (!registroToken) {
    return res.status(400).json({
      code: 'INVALID_OR_EXPIRED_TOKEN',
      message: 'Token de recuperação inválido ou já utilizado.',
    });
  }

  // Verifica se o token não ultrapassou o prazo de validade de 15 minutos
  const dataExpiracao = new Date(registroToken.expires_at);
  if (Number.isNaN(dataExpiracao.getTime()) || dataExpiracao <= new Date()) {
    // Marca como expirado/usado para limpeza
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(registroToken.id);
    return res.status(400).json({
      code: 'INVALID_OR_EXPIRED_TOKEN',
      message: 'O token de recuperação expirou. Solicite um novo código.',
    });
  }

  // Gera o novo hash bcrypt da senha e atualiza o cadastro do usuário
  const novaSenhaHasheada = await gerarHashSenha(novaSenha);
  const dataAtual = new Date().toISOString();

  db.prepare('UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?').run(
    novaSenhaHasheada,
    dataAtual,
    usuario.id
  );

  // Marca o token como consumido (uso único)
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(registroToken.id);

  return res.status(200).json({
    message: 'Senha redefinida com sucesso! Agora você pode entrar com sua nova senha.',
  });
});

/**
 * GET /api/v1/auth/me
 * Retorna os dados cadastrais do usuário autenticado a partir do token Bearer JWT.
 */
router.get('/me', exigirAutenticacao, (req, res) => {
  // Retorna os dados do usuário extraídos e validados pelo middleware
  return res.status(200).json({
    id: req.usuario.id,
    email: req.usuario.email,
    created_at: req.usuario.created_at,
  });
});

export default router;
