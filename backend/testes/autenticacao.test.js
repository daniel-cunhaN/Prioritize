/**
 * Testes Unitários do Middleware de Autenticação Bearer JWT
 * Validação de autorização, injeção de req.usuario e respostas de erro.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { obterBanco, fecharBanco } from '../src/db/database.js';
import { criarTokenAcesso } from '../src/utils/seguranca.js';
import { exigirAutenticacao } from '../src/api/middlewares/autenticacao.js';

describe('Middleware de Autenticação JWT', () => {
  const idUsuarioTeste = 'user-auth-middleware-test';
  const emailTeste = 'middleware@teste.com';

  before(() => {
    const db = obterBanco();
    const agora = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, hashed_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(idUsuarioTeste, emailTeste, 'hash', agora, agora);
  });

  after(() => {
    fecharBanco();
  });

  test('deve rejeitar requisição sem cabeçalho Authorization com status 401', () => {
    // Arrange
    const req = { headers: {} };
    let statusRetornado = null;
    let jsonRetornado = null;
    const res = {
      status: (codigo) => {
        statusRetornado = codigo;
        return {
          json: (dados) => {
            jsonRetornado = dados;
          },
        };
      },
    };
    let nextChamado = false;
    const next = () => {
      nextChamado = true;
    };

    // Act
    exigirAutenticacao(req, res, next);

    // Assert
    assert.strictEqual(statusRetornado, 401);
    assert.strictEqual(jsonRetornado.codigo, 'CREDENCIAIS_INVALIDAS');
    assert.strictEqual(nextChamado, false);
  });

  test('deve autenticar e preencher req.usuario para token válido', () => {
    // Arrange
    const token = criarTokenAcesso({ sub: idUsuarioTeste });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let nextChamado = false;
    const res = {
      status: () => ({ json: () => {} }),
    };
    const next = () => {
      nextChamado = true;
    };

    // Act
    exigirAutenticacao(req, res, next);

    // Assert
    assert.strictEqual(nextChamado, true);
    assert.ok(req.usuario, 'req.usuario deve ser definido');
    assert.strictEqual(req.usuario.id, idUsuarioTeste);
    assert.strictEqual(req.usuario.email, emailTeste);
  });
});
