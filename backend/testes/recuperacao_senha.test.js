/**
 * Testes Automatizados (TDD) — Fluxo de Recuperação de Senha ("Esqueci minha senha")
 * Valida geração de token de 6 dígitos, hash SHA-256, expiração, uso único e atualização de senha.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { obterBanco, fecharBanco } from '../src/db/database.js';
import {
  gerarHashSenha,
  verificarSenha,
  gerarTokenRecuperacao,
  gerarHashTokenRecuperacao,
} from '../src/utils/seguranca.js';
import authRouter from '../src/api/routes/auth.js';

/**
 * Utilitário auxiliar para invocar uma rota de um Router Express diretamente em memória,
 * sem necessidade de abrir socket TCP.
 */
async function invocarRota(router, metodo, caminho, body = {}) {
  const camada = router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === caminho &&
      layer.route.methods[metodo.toLowerCase()]
  );

  if (!camada) {
    throw new Error(`Rota ${metodo} ${caminho} não encontrada no router.`);
  }

  const handler = camada.route.stack[camada.route.stack.length - 1].handle;
  let statusCode = 200;
  let payloadJson = null;

  const req = { body, headers: {} };
  const res = {
    status(codigo) {
      statusCode = codigo;
      return this;
    },
    json(dados) {
      payloadJson = dados;
      return this;
    },
  };

  await handler(req, res, () => {});
  return { status: statusCode, body: payloadJson };
}

describe('Fluxo de Recuperação de Senha (Forgot & Reset Password)', () => {
  const idUsuario = 'user-reset-password-test-01';
  const emailUsuario = 'recuperacao@prioritize.com';
  const senhaAntiga = 'SenhaAntiga123';
  const senhaNova = 'NovaSenhaForte99!';

  before(async () => {
    const db = obterBanco(':memory:');
    const agora = new Date().toISOString();
    const hashInicial = await gerarHashSenha(senhaAntiga);

    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, hashed_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(idUsuario, emailUsuario, hashInicial, agora, agora);
  });

  after(() => {
    fecharBanco();
  });

  test('1. deve gerar token numérico de 6 dígitos e calcular hash SHA-256 determinístico', () => {
    const token = gerarTokenRecuperacao();
    assert.match(token, /^\d{6}$/, 'O token deve conter exatamente 6 dígitos numéricos');

    const hash1 = gerarHashTokenRecuperacao(token);
    const hash2 = gerarHashTokenRecuperacao(token);
    assert.strictEqual(hash1, hash2, 'O hash SHA-256 deve ser determinístico');
    assert.notStrictEqual(hash1, token, 'O hash não deve expor o token em texto puro');
  });

  test('2. POST /forgot-password deve rejeitar requisição sem e-mail (400) ou e-mail inexistente (404)', async () => {
    const semEmail = await invocarRota(authRouter, 'POST', '/forgot-password', {});
    assert.strictEqual(semEmail.status, 400);
    assert.strictEqual(semEmail.body.code, 'VALIDATION_ERROR');

    const inexistente = await invocarRota(authRouter, 'POST', '/forgot-password', {
      email: 'naoexiste@prioritize.com',
    });
    assert.strictEqual(inexistente.status, 404);
    assert.strictEqual(inexistente.body.code, 'USER_NOT_FOUND');
  });

  test('3. POST /forgot-password deve gerar token de 6 dígitos, persistir hash no banco e retornar preview híbrido', async () => {
    const resposta = await invocarRota(authRouter, 'POST', '/forgot-password', {
      email: emailUsuario,
    });

    assert.strictEqual(resposta.status, 200);
    assert.strictEqual(resposta.body.expires_in_minutes, 15);
    assert.match(resposta.body.reset_token_preview, /^\d{6}$/);

    // Verifica se o hash foi salvo na tabela password_reset_tokens
    const db = obterBanco();
    const registro = db
      .prepare('SELECT token_hash, used FROM password_reset_tokens WHERE user_id = ? AND used = 0')
      .get(idUsuario);

    assert.ok(registro, 'Deve existir registro ativo na tabela password_reset_tokens');
    assert.strictEqual(
      registro.token_hash,
      gerarHashTokenRecuperacao(resposta.body.reset_token_preview)
    );
  });

  test('4. POST /reset-password deve rejeitar token incorreto e permitir redefinir senha com o token válido', async () => {
    // Solicita um novo token
    const solicitacao = await invocarRota(authRouter, 'POST', '/forgot-password', {
      email: emailUsuario,
    });
    const tokenValido = solicitacao.body.reset_token_preview;

    // Tentativa com token incorreto
    const tentativaInvalida = await invocarRota(authRouter, 'POST', '/reset-password', {
      email: emailUsuario,
      token: '000000',
      new_password: senhaNova,
    });
    assert.strictEqual(tentativaInvalida.status, 400);
    assert.strictEqual(tentativaInvalida.body.code, 'INVALID_OR_EXPIRED_TOKEN');

    // Redefinição com o token válido
    const redefinicao = await invocarRota(authRouter, 'POST', '/reset-password', {
      email: emailUsuario,
      token: tokenValido,
      new_password: senhaNova,
    });
    assert.strictEqual(redefinicao.status, 200);

    // Garante que o mesmo token não pode ser reutilizado (uso único)
    const reuso = await invocarRota(authRouter, 'POST', '/reset-password', {
      email: emailUsuario,
      token: tokenValido,
      new_password: 'OutraSenhaQualquer123',
    });
    assert.strictEqual(reuso.status, 400);
    assert.strictEqual(reuso.body.code, 'INVALID_OR_EXPIRED_TOKEN');

    // Confirma que a nova senha foi persistida com hash válido no banco
    const db = obterBanco();
    const usuarioAtualizado = db
      .prepare('SELECT hashed_password FROM users WHERE id = ?')
      .get(idUsuario);
    const senhaNovaConfere = await verificarSenha(senhaNova, usuarioAtualizado.hashed_password);
    assert.strictEqual(senhaNovaConfere, true, 'A nova senha deve autenticar o usuário');
  });
});
