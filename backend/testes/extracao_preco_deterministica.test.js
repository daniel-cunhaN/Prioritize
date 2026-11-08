/**
 * extracao_preco_deterministica.test.js
 * Testes TDD (RED -> GREEN -> REFACTOR) para garantir extração precisa e 100%
 * determinística de preços em múltiplas extrações do mesmo link.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarPreco,
  extrairMetadadosDeHtml,
  extrairMetadadosUrl,
  obterChaveCanonicaUrl,
  limparCacheMetadados,
} from '../src/services/scraper.js';

function criarRespostaMock({ status = 200, html = '', url = '', contentType = 'text/html' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: {
      get: (nome) => (nome.toLowerCase() === 'content-type' ? contentType : null),
    },
    text: async () => html,
    arrayBuffer: async () => new ArrayBuffer(html.length || 0),
  };
}

describe('🔴 TDD: Precisão e Determinismo na Extração de Preços', () => {
  beforeEach(() => {
    if (typeof limparCacheMetadados === 'function') {
      limparCacheMetadados();
    }
  });

  it('deve normalizar corretamente preços na casa dos milhares sem centavos (ex: R$ 3.299 e 1.250)', () => {
    // Antes da correção, "R$ 3.299" retornava 3.29 e "1.250" retornava 1.25
    assert.equal(normalizarPreco('R$ 3.299'), 3299.0);
    assert.equal(normalizarPreco('R$ 1.499'), 1499.0);
    assert.equal(normalizarPreco('1.250'), 1250.0);
    assert.equal(normalizarPreco('12.500'), 12500.0);
    assert.equal(normalizarPreco('R$ 3.299,00'), 3299.0);
    assert.equal(normalizarPreco('189.9'), 189.9);
    assert.equal(normalizarPreco('85,4'), 85.4);
  });

  it('deve priorizar o preço real da buybox da Amazon (.a-price-whole + .a-price-fraction) sobre .a-offscreen de carrosséis patrocinados ou usados', () => {
    // Simula página da Amazon onde há um banner/carrossel patrocinado ou link de usado com .a-offscreen preenchido,
    // enquanto a buybox principal (#corePriceDisplay_desktop_feature_div) possui .a-offscreen vazio e whole+fraction preenchidos.
    const htmlAmazonComCarrossel = `
      <!DOCTYPE html>
      <html>
        <head><title>Echo Dot 5ª Geração | Amazon.com.br</title></head>
        <body>
          <!-- Banner patrocinado no topo do DOM que muda a cada refresh -->
          <div id="CardInstanceBannerTopo" class="a-carousel-card">
            <span class="a-price"><span class="a-offscreen">R$ 89,90</span></span>
          </div>

          <!-- Buybox Principal do Produto -->
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price priceToPay">
              <span class="a-offscreen"> </span>
              <span class="a-price-whole">584<span class="a-price-decimal">,</span></span>
              <span class="a-price-fraction">09</span>
            </span>
          </div>

          <!-- Oferta de usados mais abaixo -->
          <div id="aod-ingress-link">
            <span class="a-price"><span class="a-offscreen">R$ 34,90</span></span>
          </div>
        </body>
      </html>
    `;

    const metadados = extrairMetadadosDeHtml(
      htmlAmazonComCarrossel,
      'https://www.amazon.com.br/dp/B09B8VGCR8'
    );

    assert.equal(
      metadados.price,
      584.09,
      'Deve extrair 584.09 da buybox principal e nunca 89.90 ou 34.90 dos widgets secundários'
    );
  });

  it('deve extrair o preço à vista do Mercado Livre na casa dos milhares sem centavos ignorando parcelas e carrosséis', () => {
    const htmlMercadoLivre = `
      <!DOCTYPE html>
      <html>
        <head><title>Notebook Gamer | Mercado Livre</title></head>
        <body>
          <div class="ui-recommendations-carousel">
            <span class="andes-money-amount" aria-label="199 reais">
              <span class="andes-money-amount__fraction">199</span>
            </span>
          </div>
          <div class="ui-pdp-price">
            <div class="ui-pdp-price__second-line">
              <span class="andes-money-amount">
                <span class="andes-money-amount__currency-symbol">R$</span>
                <span class="andes-money-amount__fraction">3.499</span>
              </span>
            </div>
            <div class="ui-pdp-price__subtitles">
              <span class="andes-money-amount" aria-label="349 reais com 90 centavos">
                <span class="andes-money-amount__fraction">349</span>
                <span class="andes-money-amount__cents">90</span>
              </span>
            </div>
          </div>
        </body>
      </html>
    `;

    const metadados = extrairMetadadosDeHtml(
      htmlMercadoLivre,
      'https://www.mercadolivre.com.br/notebook-gamer/p/MLB987654'
    );

    assert.equal(
      metadados.price,
      3499.0,
      'Deve extrair 3499.00 do preço à vista e ignorar 199 do carrossel e 349.90 da parcela'
    );
  });

  it('deve filtrar acessórios na busca de preço e retornar exatamente o mesmo valor independentemente da ordem dos anúncios', async () => {
    const urlProduto =
      'https://www.mercadolivre.com.br/furadeira-parafusadeira-eletrica-sem-fio-12v-lorben/p/MLB28014524';

    const htmlBloqueioMl = `
      <html>
        <head>
          <meta property="og:title" content="Mercado Livre" />
          <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/pt_logo_large_plus@2x.webp" />
        </head>
        <body></body>
      </html>
    `;

    // Página de busca 1: acessório ("Bateria...") aparece primeiro, seguido dos produtos reais em uma ordem
    const htmlBuscaOrdem1 = `
      <html>
        <body>
          <div data-testid="product-card">
            <h2>Bateria recarregavel 12v parafusadeira furadeira</h2>
            <span data-testid="product-card::price">R$ 48,84</span>
          </div>
          <div data-testid="product-card">
            <h2>Maleta para furadeira parafusadeira 12v</h2>
            <span data-testid="product-card::price">R$ 35,00</span>
          </div>
          <div data-testid="product-card">
            <h2>Furadeira Parafusadeira Elétrica Sem Fio 12V Lorben</h2>
            <span data-testid="product-card::price">R$ 189,90</span>
          </div>
          <div data-testid="product-card">
            <h2>Furadeira / Parafusadeira a Bateria 12V Bosch GSB</h2>
            <span data-testid="product-card::price">R$ 1.110,56</span>
          </div>
        </body>
      </html>
    `;

    // Página de busca 2: os mesmos cartões em ordem invertida/embaralhada
    const htmlBuscaOrdem2 = `
      <html>
        <body>
          <div data-testid="product-card">
            <h2>Furadeira / Parafusadeira a Bateria 12V Bosch GSB</h2>
            <span data-testid="product-card::price">R$ 1.110,56</span>
          </div>
          <div data-testid="product-card">
            <h2>Furadeira Parafusadeira Elétrica Sem Fio 12V Lorben</h2>
            <span data-testid="product-card::price">R$ 189,90</span>
          </div>
          <div data-testid="product-card">
            <h2>Bateria recarregavel 12v parafusadeira furadeira</h2>
            <span data-testid="product-card::price">R$ 48,84</span>
          </div>
        </body>
      </html>
    `;

    const res1 = await extrairMetadadosUrl(urlProduto, {
      fetchFn: async (u) =>
        u.includes('buscape.com.br') || u.includes('search.yahoo.com')
          ? criarRespostaMock({ html: htmlBuscaOrdem1, url: u })
          : criarRespostaMock({ html: htmlBloqueioMl, url: urlProduto }),
    });

    limparCacheMetadados();

    const res2 = await extrairMetadadosUrl(urlProduto, {
      fetchFn: async (u) =>
        u.includes('buscape.com.br') || u.includes('search.yahoo.com')
          ? criarRespostaMock({ html: htmlBuscaOrdem2, url: u })
          : criarRespostaMock({ html: htmlBloqueioMl, url: urlProduto }),
    });

    assert.equal(res1.price, 189.9, 'Deve ignorar a bateria de R$ 48,84 e o Bosch de R$ 1.110,56, extraindo 189,90');
    assert.equal(res2.price, 189.9, 'Deve retornar exatamente o mesmo preço mesmo com os cartões embaralhados');
  });

  it('deve retornar exatamente o mesmo valor ao extrair o mesmo link repetidas vezes (cache canônico anti-oscilação)', async () => {
    const urlClick1 =
      'https://shopee.com.br/Mouse-Gamer-Logitech-G203-RGB-i.300000.400000?sp_atk=token_click_1';
    const urlClick2 =
      'https://shopee.com.br/Mouse-Gamer-Logitech-G203-RGB-i.300000.400000?sp_atk=token_click_2&xptdk=abc';

    // Verifica que ambas as URLs geram a mesma chave canônica de produto
    assert.equal(obterChaveCanonicaUrl(urlClick1), obterChaveCanonicaUrl(urlClick2));

    let chamadaBusca = 0;
    const fetchVariavel = async (u) => {
      if (u.includes('buscape.com.br') || u.includes('search.yahoo.com')) {
        chamadaBusca++;
        // Na 1ª chamada retorna R$ 149,90; na 2ª retornaria R$ 99,90 se não houvesse estabilização
        const precoSimulado = chamadaBusca === 1 ? 'R$ 149,90' : 'R$ 99,90';
        return criarRespostaMock({
          html: `<html><body><div class="first current-price">${precoSimulado}</div></body></html>`,
          url: u,
        });
      }
      return criarRespostaMock({
        html: `<html><head><meta property="og:title" content="Mouse Gamer Logitech G203 RGB | Shopee Brasil" /><meta property="og:image" content="https://down-br.img.susercontent.com/file/br-mouse-g203" /></head></html>`,
        url: u,
      });
    };

    const extracao1 = await extrairMetadadosUrl(urlClick1, { fetchFn: fetchVariavel });
    const extracao2 = await extrairMetadadosUrl(urlClick2, { fetchFn: fetchVariavel });
    const extracao3 = await extrairMetadadosUrl(urlClick1, { fetchFn: fetchVariavel });

    assert.equal(extracao1.price, 149.9);
    assert.equal(extracao2.price, 149.9, 'A 2ª extração do mesmo produto deve retornar exatamente 149.9');
    assert.equal(extracao3.price, 149.9, 'A 3ª extração do mesmo produto deve retornar exatamente 149.9');
  });
});
