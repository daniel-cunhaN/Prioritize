/**
 * extracao_preco_melhorada.test.js — Testes TDD da Extração Robusta de Preço
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extrairMetadadosDeHtml } from '../src/services/scraper.js';

describe('Extração Robusta de Preço de E-Commerces (TDD)', () => {
  it('deve extrair preço do Mercado Livre quando formatado com andes-money-amount e aria-label', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fone Bluetooth Sem Fio</title>
        </head>
        <body>
          <div class="ui-pdp-price">
            <span class="andes-money-amount" role="img" aria-label="189 reais com 90 centavos">
              <span class="andes-money-amount__currency-symbol">R$</span>
              <span class="andes-money-amount__fraction">189</span>
              <span class="andes-money-amount__cents">90</span>
            </span>
          </div>
        </body>
      </html>
    `;

    const res = extrairMetadadosDeHtml(html, 'https://www.mercadolivre.com.br/p/MLB123');
    assert.strictEqual(res.price, 189.90);
  });

  it('deve extrair preço da Amazon mesmo quando há elementos .a-price com espaços vazios', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Livro de Teste | Amazon.com.br</title>
        </head>
        <body>
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price"><span class="a-offscreen"> </span></span>
            <span class="a-price"><span class="a-offscreen">R$ 59,90</span></span>
          </div>
        </body>
      </html>
    `;

    const res = extrairMetadadosDeHtml(html, 'https://www.amazon.com.br/dp/B000');
    assert.strictEqual(res.price, 59.90);
  });

  it('deve extrair preço de meta tags open graph e product:price:amount com vírgula ou ponto', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="product:price:amount" content="349,99" />
          <meta property="og:title" content="Monitor Gamer 24" />
        </head>
      </html>
    `;

    const res = extrairMetadadosDeHtml(html, 'https://kabum.com.br/produto/123');
    assert.strictEqual(res.price, 349.99);
  });
});
