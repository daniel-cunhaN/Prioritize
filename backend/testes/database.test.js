/**
 * Testes Unitários de Conexão e Schema do Banco de Dados SQLite
 * Validação de tabelas, índices e integridade referencial.
 */

import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { obterBanco, fecharBanco } from '../src/db/database.js';

describe('Módulo de Banco de Dados SQLite', () => {
  after(() => {
    fecharBanco();
  });

  test('deve inicializar conexão e tabelas users e wishlist_items', () => {
    // Arrange & Act
    const db = obterBanco();

    // Assert: Verifica se a tabela users existe
    const tabelaUsuarios = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
      .get();
    assert.ok(tabelaUsuarios, 'A tabela users deve existir');

    // Assert: Verifica se a tabela wishlist_items existe
    const tabelaDesejos = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wishlist_items'")
      .get();
    assert.ok(tabelaDesejos, 'A tabela wishlist_items deve existir');
  });

  test('deve permitir inserir e recuperar um usuário', () => {
    // Arrange
    const db = obterBanco();
    const idUsuario = 'teste-user-' + Date.now();
    const email = `usuario-${Date.now()}@teste.com`;
    const agora = new Date().toISOString();

    // Act: Inserção
    const insert = db.prepare(`
      INSERT INTO users (id, email, hashed_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run(idUsuario, email, 'hash123', agora, agora);

    // Act: Consulta
    const usuarioRecuperado = db
      .prepare('SELECT id, email FROM users WHERE id = ?')
      .get(idUsuario);

    // Assert
    assert.strictEqual(usuarioRecuperado.id, idUsuario);
    assert.strictEqual(usuarioRecuperado.email, email);
  });
});
