/**
 * auth.js — Rotas de Autenticação (Cadastro e Login)
 * Implementa endpoints para registro de novos usuários e emissão de tokens JWT.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { obterBanco } from '../../db/database.js';
import { gerarHashSenha, verificarSenha, criarTokenAcesso } from '../../utils/seguranca.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.js';

const router = Router();

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
