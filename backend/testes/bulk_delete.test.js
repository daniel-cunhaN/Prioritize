/**
 * bulk_delete.test.js — Testes TDD da Exclusão em Lote (Wishlist Bulk Delete)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { criarApp } from '../src/app.js';
import { obterBanco, fecharBanco } from '../src/db/database.js';
import { criarTokenAcesso } from '../src/utils/seguranca.js';

describe('Exclusão em Lote de Desejos (Bulk Delete API)', () => {
  let servidor;
  let urlBase;
  let tokenUsuario;
  let idUsuario;
  let idsItens = [];

  before(async () => {
    const app = criarApp();
    await new Promise((resolve) => {
      servidor = app.listen(0, '127.0.0.1', () => {
        const endereco = servidor.address();
        urlBase = `http://127.0.0.1:${endereco.port}`;
        resolve();
      });
    });

    const db = obterBanco();
    idUsuario = `user-bulk-${Date.now()}`;
    const agora = new Date().toISOString();
    db.prepare('INSERT INTO users (id, email, hashed_password, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      idUsuario,
      `bulk_${Date.now()}@teste.com`,
      'hash_teste',
      agora,
      agora
    );

    tokenUsuario = criarTokenAcesso({ sub: idUsuario, email: `bulk_${Date.now()}@teste.com` });

    // Insere 3 itens para testar exclusão em lote
    for (let i = 1; i <= 3; i++) {
      const id = `item-bulk-${Date.now()}-${i}`;
      db.prepare(`
        INSERT INTO wishlist_items (id, user_id, title, url, priority, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(id, idUsuario, `Produto Bulk ${i}`, `https://loja.com/p/${i}`, 3);
      idsItens.push(id);
    }
  });

  after(async () => {
    const db = obterBanco();
    db.prepare('DELETE FROM wishlist_items WHERE user_id = ?').run(idUsuario);
    db.prepare('DELETE FROM users WHERE id = ?').run(idUsuario);

    if (servidor) {
      await new Promise((resolve) => servidor.close(resolve));
    }
  });

  it('deve rejeitar requisição DELETE /api/v1/wishlist sem array de ids válido', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUsuario}`,
      },
      body: JSON.stringify({}),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(dados.codigo, 'IDS_INVALIDOS');
  });

  it('deve excluir múltiplos itens de uma só vez via DELETE /api/v1/wishlist', async () => {
    const idsParaExcluir = [idsItens[0], idsItens[1]];

    const res = await fetch(`${urlBase}/api/v1/wishlist`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUsuario}`,
      },
      body: JSON.stringify({ ids: idsParaExcluir }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(dados.excluidos, 2);

    // Verifica que os dois itens foram excluídos e o terceiro permaneceu
    const db = obterBanco();
    const restantes = db
      .prepare('SELECT id FROM wishlist_items WHERE user_id = ?')
      .all(idUsuario)
      .map((r) => r.id);

    assert.strictEqual(restantes.includes(idsItens[0]), false);
    assert.strictEqual(restantes.includes(idsItens[1]), false);
    assert.strictEqual(restantes.includes(idsItens[2]), true);
  });
});
