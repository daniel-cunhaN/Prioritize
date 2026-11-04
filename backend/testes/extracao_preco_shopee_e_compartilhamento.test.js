/**
 * extracao_preco_shopee_e_compartilhamento.test.js
 * Testes TDD para garantia de extração de valor em produtos da Shopee,
 * textos compartilhados de aplicativos e URLs com parâmetros de preço.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { extrairMetadadosUrl } from '../src/services/scraper.js';
import { criarApp } from '../src/app.js';
import { fecharBanco } from '../src/db/database.js';

describe('🔴 TDD: Extração de Preço Shopee e Compartilhamento de Apps', () => {
  let servidor;
  let urlBase;
  let tokenAcesso;

  before(async () => {
    const app = criarApp();
    await new Promise((resolve) => {
      servidor = app.listen(0, '127.0.0.1', () => {
        const endereco = servidor.address();
        urlBase = `http://127.0.0.1:${endereco.port}`;
        resolve();
      });
    });

    // Cadastra usuário e obtém token válido
    const resReg = await fetch(`${urlBase}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `teste-shopee-preco-${Date.now()}@prioritize.com`,
        password: 'senhaSegura123',
      }),
    });
    const dadosReg = await resReg.json();
    tokenAcesso = dadosReg.access_token;
  });

  after(async () => {
    if (servidor) {
      await new Promise((resolve) => servidor.close(resolve));
    }
    fecharBanco();
  });

  const URL_SCOOTER_SHOPEE =
    'https://shopee.com.br/Bike-bicicleta-moto-scooter-El%C3%A9trica-1000w-Bateria-Chumbo-Sem-CNH-32km-Sobe-Ladeira-Forte-i.827442875.45067707635?extraParams=%7B%22display_model_id%22%3A224749101970%2C%22model_selection_logic%22%3A3%7D&image_ids=br-11134207-820mb-mu55gcaha2gz51';
  
  const URL_PRINCIPIA_SHOPEE =
    'https://shopee.com.br/Principia-Antissinais-Dia-e-Noite-c-Vitamina-VC-10-S%C3%A9rum-Retinol-Rn-0-3-Vitamina-C-Para-o-Rosto-Serum-Facial-i.1613313673.58266270841?is_from_login=true';

  const URL_FONE_ML =
    'https://www.mercadolivre.com.br/fone-bluetooth-cancelamento-ruido/p/MLB1928374';

  it('deve extrair o preço da Scooter Elétrica da Shopee mesmo quando o SSR omitir meta tags de preço', async () => {
    // Simula resposta de SSR da Shopee que traz título e imagem, mas sem meta de preço
    const htmlMockShopee = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Bike/bicicleta moto scooter Elétrica 1000w Bateria Chumbo Sem CNH 32km Sobe Ladeira Forte | Shopee Brasil" />
        <meta property="og:image" content="https://down-br.img.susercontent.com/file/br-11134207-820mb-mu55gcaha2gz51" />
        <meta property="og:description" content="Compre Bike/bicicleta moto scooter Elétrica 1000w Bateria Chumbo Sem CNH 32km Sobe Ladeira Forte na Shopee Brasil! Potência e conforto para seu dia a dia." />
      </head>
      <body><div id="main"></div></body>
      </html>
    `;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      url: URL_SCOOTER_SHOPEE,
      text: async () => htmlMockShopee,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const metadados = await extrairMetadadosUrl(URL_SCOOTER_SHOPEE, { fetchFn: mockFetch });

    assert.ok(metadados, 'Metadados devem ser retornados');
    assert.equal(metadados.titulo.includes('Bike/bicicleta moto scooter'), true);
    assert.equal(metadados.imagem_url, 'https://down-br.img.susercontent.com/file/br-11134207-820mb-mu55gcaha2gz51');
    assert.notEqual(metadados.price, null, 'O preço não deve ser nulo para a scooter da Shopee');
    assert.equal(typeof metadados.price, 'number');
    assert.equal(metadados.price, 3299.00);
  });

  it('deve extrair o preço do Sérum Principia da Shopee através do catálogo de referência quando o SSR for bloqueado', async () => {
    const htmlMockShopee = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Principia Antissinais Dia e Noite c/ Vitamina VC-10 + Sérum Retinol Rn-0,3 | Shopee Brasil" />
        <meta property="og:image" content="https://down-br.img.susercontent.com/file/sg-11134201-825b8-mrwqjp841iio33" />
      </head>
      <body></body>
      </html>
    `;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      url: URL_PRINCIPIA_SHOPEE,
      text: async () => htmlMockShopee,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const metadados = await extrairMetadadosUrl(URL_PRINCIPIA_SHOPEE, { fetchFn: mockFetch });
    assert.equal(metadados.price, 88.00, 'Preço da Principia deve ser 88.00');
  });

  it('deve extrair o preço do Fone do Mercado Livre mesmo quando o crawler cair em página institucional', async () => {
    const htmlMockML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Mercado Livre" />
        <meta property="og:image" content="https://http2.mlstatic.com/logo.webp" />
      </head>
      <body></body>
      </html>
    `;

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      url: URL_FONE_ML,
      text: async () => htmlMockML,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const metadados = await extrairMetadadosUrl(URL_FONE_ML, { fetchFn: mockFetch });
    assert.equal(metadados.price, 289.90, 'Preço do fone no ML deve ser 289.90');
  });

  it('deve extrair preço passado na query string da URL (?preco= ou ?price=)', async () => {
    const urlComPrecoQuery = 'https://lojaqualquer.com/produto-exemplo?price=149.90';
    const htmlSimples = `
      <html><head><meta property="og:title" content="Produto Teste" /><meta property="og:image" content="https://img.com/p.jpg" /></head><body></body></html>
    `;
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      url: urlComPrecoQuery,
      text: async () => htmlSimples,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    const metadados = await extrairMetadadosUrl(urlComPrecoQuery, { fetchFn: mockFetch });
    assert.equal(metadados.price, 149.90);
  });

  it('deve extrair preço e URL de mensagem de compartilhamento de app enviada no corpo da requisição POST /preview', async () => {
    const mensagemCompartilhada =
      'Confira este produto incrível por R$ 2.499,00 na Shopee! https://shopee.com.br/produto-compartilhado-i.123.456';

    const res = await fetch(`${urlBase}/api/v1/wishlist/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenAcesso}`,
      },
      body: JSON.stringify({
        url: mensagemCompartilhada,
      }),
    });

    const corpo = await res.json();
    assert.equal(res.status, 200);
    assert.equal(corpo.price, 2499.00);
    assert.equal(corpo.preco, 2499.00);
    assert.equal(corpo.url, 'https://shopee.com.br/produto-compartilhado-i.123.456');
  });
});
