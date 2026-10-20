/**
 * Testes de Integração das Rotas da API REST Express
 * Cobre autenticação (/auth/register, /auth/login) e wishlist (/wishlist/preview, /, /:id).
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { criarApp } from '../src/app.js';
import { fecharBanco } from '../src/db/database.js';

describe('Rotas da API Prioritize (Integração Express)', () => {
  let servidor;
  let urlBase;
  let tokenAcesso;
  let idDesejoCriado;
  const emailAleatorio = `usuario-${Date.now()}@teste.com`;
  const senhaTeste = 'senha123456';

  before(async () => {
    const app = criarApp();
    await new Promise((resolve) => {
      // Inicia servidor em porta dinâmica livre
      servidor = app.listen(0, '127.0.0.1', () => {
        const endereco = servidor.address();
        urlBase = `http://127.0.0.1:${endereco.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (servidor) {
      await new Promise((resolve) => servidor.close(resolve));
    }
    fecharBanco();
  });

  test('GET / deve retornar mensagem de boas-vindas com status 200', async () => {
    const res = await fetch(`${urlBase}/`);
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(dados.message.includes('Wishlist Centralizer API'));
  });

  test('POST /api/v1/auth/register deve cadastrar usuário e retornar token Bearer', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAleatorio, password: senhaTeste }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 201);
    assert.ok(dados.access_token);
    assert.strictEqual(dados.token_type, 'bearer');
    tokenAcesso = dados.access_token;
  });

  test('POST /api/v1/auth/register deve rejeitar e-mail duplicado com status 400', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAleatorio, password: senhaTeste }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(dados.code, 'EMAIL_ALREADY_EXISTS');
  });

  test('POST /api/v1/auth/login deve autenticar com credenciais corretas', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAleatorio, password: senhaTeste }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(dados.access_token);
  });

  test('POST /api/v1/auth/login deve rejeitar credenciais incorretas com status 401 e mensagem padronizada', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAleatorio, password: 'senha-incorreta' }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(dados.code, 'INVALID_CREDENTIALS');
    assert.strictEqual(dados.message, 'Credenciais de login incorretas.');
  });

  test('GET /api/v1/auth/me deve retornar dados do perfil do usuário autenticado', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(dados.id);
    assert.strictEqual(dados.email, emailAleatorio);
    assert.ok(dados.created_at);
  });

  test('GET /api/v1/auth/me deve rejeitar requisição sem token com status 401', async () => {
    const res = await fetch(`${urlBase}/api/v1/auth/me`, {
      method: 'GET',
    });

    assert.strictEqual(res.status, 401);
  });

  test('POST /api/v1/wishlist/preview deve responder prévia de metadados da URL', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAcesso}`,
      },
      body: JSON.stringify({ url: 'https://exemplo-loja.com/produto' }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(dados.url);
    assert.ok(dados.titulo);
  });

  test('POST /api/v1/wishlist deve persistir novo desejo com prioridade (1, 2 ou 3)', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAcesso}`,
      },
      body: JSON.stringify({
        url: 'https://exemplo.com/teclado-mecanico',
        titulo: 'Teclado Mecânico RGB',
        imagem_url: 'https://exemplo.com/teclado.jpg',
        prioridade: 3, // Alta
        price: 199.90,
      }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 201);
    assert.ok(dados.id);
    assert.strictEqual(dados.title, 'Teclado Mecânico RGB');
    assert.strictEqual(dados.priority, 3);
    assert.strictEqual(dados.price, 199.90);
    idDesejoCriado = dados.id;
  });

  test('GET /api/v1/wishlist deve listar desejos cadastrados do usuário', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(dados));
    assert.ok(dados.length >= 1);
    assert.ok(dados.some((item) => item.id === idDesejoCriado));
  });

  test('GET /api/v1/wishlist com filtro por prioridade deve retornar apenas a prioridade solicitada', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist?prioridade=3`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(dados));
    assert.ok(dados.every((item) => item.priority === 3));
  });

  test('GET /api/v1/wishlist com busca textual deve filtrar itens correspondentes', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist?busca=Teclado`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(dados));
    assert.ok(dados.some((item) => item.id === idDesejoCriado));
  });

  test('GET /api/v1/wishlist com ordenação alfabética deve responder com status 200', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist?ordem=alfabetica_az`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(dados));
  });

  test('PUT /api/v1/wishlist/:id deve atualizar o valor do produto e dados cadastrados', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist/${idDesejoCriado}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAcesso}`,
      },
      body: JSON.stringify({
        titulo: 'Teclado Mecânico RGB Pro',
        price: 249.90,
      }),
    });
    const dados = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(dados.title, 'Teclado Mecânico RGB Pro');
    assert.strictEqual(dados.price, 249.90);
  });

  test('DELETE /api/v1/wishlist/:id deve excluir o item com status 204', async () => {
    const res = await fetch(`${urlBase}/api/v1/wishlist/${idDesejoCriado}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenAcesso}`,
      },
    });

    assert.strictEqual(res.status, 204);
  });
});
