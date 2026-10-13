/**
 * Testes Unitários de Segurança e Criptografia
 * Validação de hash de senhas (bcryptjs) e tokens JWT (jsonwebtoken).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  gerarHashSenha,
  verificarSenha,
  criarTokenAcesso,
  verificarTokenAcesso,
} from '../src/utils/seguranca.js';

describe('Módulo de Segurança e Autenticação', () => {
  test('deve gerar hash de senha e validar com sucesso senha correta', async () => {
    // Arrange
    const senhaPlana = 'minhasenha123';

    // Act
    const hash = await gerarHashSenha(senhaPlana);
    const senhaValida = await verificarSenha(senhaPlana, hash);
    const senhaInvalida = await verificarSenha('outrasenha', hash);

    // Assert
    assert.ok(hash !== senhaPlana, 'O hash deve ser diferente da senha original');
    assert.strictEqual(senhaValida, true, 'A senha correta deve ser confirmada');
    assert.strictEqual(senhaInvalida, false, 'A senha incorreta deve ser rejeitada');
  });

  test('deve criar e decodificar token JWT contendo payload do usuário', () => {
    // Arrange
    const dados = { sub: 'usuario-uuid-123', email: 'teste@exemplo.com' };

    // Act
    const token = criarTokenAcesso(dados);
    const payload = verificarTokenAcesso(token);

    // Assert
    assert.ok(typeof token === 'string', 'O token gerado deve ser uma string');
    assert.strictEqual(payload.sub, dados.sub, 'O ID do usuário no payload deve coincidir');
    assert.strictEqual(payload.email, dados.email, 'O e-mail no payload deve coincidir');
  });

  test('deve lançar erro ao tentar verificar token inválido', () => {
    // Arrange
    const tokenInvalido = 'token.totalmente.invalido';

    // Act & Assert
    assert.throws(() => {
      verificarTokenAcesso(tokenInvalido);
    }, 'Token inválido deve disparar exceção');
  });
});
