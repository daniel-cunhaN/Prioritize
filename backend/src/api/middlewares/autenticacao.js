/**
 * autenticacao.js — Middleware para validação do cabeçalho Bearer Token
 * Protege rotas restritas extraindo e validando a assinatura do token JWT.
 */

import { verificarTokenAcesso } from '../../utils/seguranca.js';
import { obterBanco } from '../../db/database.js';

/**
 * Middleware que intercepta a requisição e valida o token Bearer.
 * Injeta o registro completo do usuário autenticado em req.usuario.
 */
export function exigirAutenticacao(req, res, next) {
  const authHeader = req.headers.authorization;

  // Verifica se o cabeçalho Authorization está presente no padrão Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      codigo: 'CREDENCIAIS_INVALIDAS',
      mensagem: 'Token de autenticação ausente ou mal formatado.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Decodifica e valida assinatura e expiração do JWT
    const payload = verificarTokenAcesso(token);
    const db = obterBanco();

    // Consulta o usuário correspondente no banco SQLite
    const stmt = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
    const usuario = stmt.get(payload.sub);

    if (!usuario) {
      return res.status(404).json({
        codigo: 'USUARIO_NAO_ENCONTRADO',
        mensagem: 'Usuário associado ao token não foi encontrado.',
      });
    }

    // Anexa dados do usuário autenticado no objeto req
    req.usuario = usuario;
    return next();
  } catch (erro) {
    return res.status(401).json({
      codigo: 'CREDENCIAIS_INVALIDAS',
      mensagem: 'Token inválido ou expirado.',
    });
  }
}
