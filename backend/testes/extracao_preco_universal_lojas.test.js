/**
 * extracao_preco_universal_lojas.test.js
 * Suíte de testes TDD (RED -> GREEN -> REFACTOR) para extração universal de preços
 * e metadados em links arbitrários da Shopee, Mercado Livre e Amazon.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extrairMetadadosDeHtml,
  extrairMetadadosUrl,
  obterPerfisParaUrl,
  ehUrlAmazon,
  ehUrlMercadoLivre,
  extrairTituloDeSlugUrl,
  buscarPrecoPorPesquisaWeb,
} from '../src/services/scraper.js';

/**
 * Cria uma resposta HTTP simulada compatível com a API fetch nativa.
 */
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

describe('🔴 TDD: Extração Universal de Preço (Shopee, Mercado Livre e Amazon)', () => {
  it('deve identificar URLs da Amazon e Mercado Livre e priorizar perfil WhatsApp para Amazon', () => {
    // Arrange & Act & Assert: identificação de URLs da Amazon
    assert.equal(ehUrlAmazon('https://www.amazon.com.br/dp/B09B8VGCR8'), true);
    assert.equal(ehUrlAmazon('https://amazon.com/gp/product/B09B8VGCR8'), true);
    assert.equal(ehUrlAmazon('https://a.co/d/1234567'), true);
    assert.equal(ehUrlAmazon('https://amzn.to/3xyzABC'), true);
    assert.equal(ehUrlAmazon('https://shopee.com.br/item'), false);

    // Identificação de URLs do Mercado Livre
    assert.equal(
      ehUrlMercadoLivre('https://www.mercadolivre.com.br/furadeira-12v/p/MLB28014524'),
      true
    );
    assert.equal(
      ehUrlMercadoLivre('https://produto.mercadolivre.com.br/MLB-123456-cadeira-_JM'),
      true
    );
    assert.equal(ehUrlMercadoLivre('https://meli.la/1a2b3c'), true);
    assert.equal(ehUrlMercadoLivre('https://www.amazon.com.br/dp/B09B8VGCR8'), false);

    // Perfil do WhatsApp deve ser o 1º para Amazon (evita WAF/Captcha do Chrome sem JS)
    const perfisAmazon = obterPerfisParaUrl('https://www.amazon.com.br/dp/B09B8VGCR8');
    assert.ok(
      /WhatsApp/i.test(perfisAmazon[0]['User-Agent']),
      'O 1º perfil para a Amazon deve ser o do WhatsApp para evitar bloqueio de WAF'
    );
  });

  it('deve extrair preço e imagem da Amazon quando .a-offscreen estiver vazio usando .a-price-whole + .a-price-fraction ou input oculto', () => {
    // Arrange: HTML realístico da Amazon onde .a-offscreen vem vazio, mas whole + fraction e #landingImage estão preenchidos
    const htmlAmazon = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Echo Dot 5ª geração | Amazon.com.br</title>
        </head>
        <body>
          <img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/71xoR4A6q-L._AC_SL1000_.jpg" src="https://m.media-amazon.com/images/I/71xoR4A6q-L._AC_SX300_.jpg" />
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price a-text-price" data-a-strike="true">
              <span class="a-offscreen">R$ 499,00</span>
            </span>
            <span class="a-price priceToPay">
              <span class="a-offscreen"></span>
              <span aria-hidden="true">
                <span class="a-price-symbol">R$</span>
                <span class="a-price-whole">384<span class="a-price-decimal">,</span></span>
                <span class="a-price-fraction">09</span>
              </span>
            </span>
          </div>
        </body>
      </html>
    `;

    // Act
    const metadados = extrairMetadadosDeHtml(htmlAmazon, 'https://www.amazon.com.br/dp/B09B8VGCR8');

    // Assert
    assert.equal(metadados.price, 384.09);
    assert.equal(
      metadados.imagem_url,
      'https://m.media-amazon.com/images/I/71xoR4A6q-L._AC_SL1000_.jpg'
    );

    // Arrange 2: HTML da Amazon com input hidden #twister-plus-price-data-price
    const htmlAmazonTwister = `
      <html>
        <head><title>Kindle 16GB</title></head>
        <body>
          <input type="hidden" id="twister-plus-price-data-price" value="449.10" />
        </body>
      </html>
    `;
    const metadadosTwister = extrairMetadadosDeHtml(
      htmlAmazonTwister,
      'https://www.amazon.com.br/dp/B09SWW583J'
    );
    assert.equal(metadadosTwister.price, 449.10);
  });

  it('deve ignorar logo e título genérico de bloqueio do Mercado Livre e extrair título limpo pelo slug da URL', async () => {
    // Arrange: página de bloqueio real do Mercado Livre (bot-interceptor-muralla) que contém og:image da logo institucional
    const urlMl =
      'https://www.mercadolivre.com.br/furadeira-parafusadeira-eletrica-sem-fio-de-impacto-12v/p/MLB28014524';
    const htmlBloqueioComLogoMl = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mercado Livre</title>
          <meta property="og:title" content="Mercado Livre" />
          <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/pt_logo_large_plus@2x.webp" />
        </head>
        <body><script src="/_bm/bot-interceptor-muralla.js"></script></body>
      </html>
    `;

    // Na 2ª tentativa (ex: Twitterbot), o ML entrega o produto real com preço em .poly-price__current
    const htmlProdutoRealMl = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Furadeira Parafusadeira Elétrica Sem Fio De Impacto 12v" />
          <meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_998877-MLB.webp" />
        </head>
        <body>
          <div class="poly-price__current">
            <span class="andes-money-amount__fraction">189</span>
            <span class="andes-money-amount__cents">48</span>
          </div>
        </body>
      </html>
    `;

    let tentativa = 0;
    const fetchMock = async (urlRequisitada) => {
      tentativa++;
      if (tentativa === 1) {
        return criarRespostaMock({ html: htmlBloqueioComLogoMl, url: urlMl });
      }
      return criarRespostaMock({ html: htmlProdutoRealMl, url: urlMl });
    };

    // Act
    const resultado = await extrairMetadadosUrl(urlMl, { fetchFn: fetchMock });

    // Assert: não deve ter parado na 1ª tentativa com a logo institucional pt_logo_large_plus
    assert.ok(tentativa >= 2, 'Deve ignorar a logo institucional de bloqueio e tentar o próximo perfil');
    assert.equal(resultado.titulo, 'Furadeira Parafusadeira Elétrica Sem Fio De Impacto 12v');
    assert.equal(resultado.imagem_url, 'https://http2.mlstatic.com/D_NQ_NP_998877-MLB.webp');
    assert.equal(resultado.price, 189.48);

    // Também valida extrairTituloDeSlugUrl diretamente para ML, Shopee e Amazon
    assert.equal(
      extrairTituloDeSlugUrl(urlMl),
      'Furadeira Parafusadeira Eletrica Sem Fio De Impacto 12v'
    );
    assert.equal(
      extrairTituloDeSlugUrl(
        'https://produto.mercadolivre.com.br/MLB-3658492012-cadeira-escritorio-ergonomica-preta-_JM'
      ),
      'Cadeira Escritorio Ergonomica Preta'
    );
    assert.equal(
      extrairTituloDeSlugUrl(
        'https://shopee.com.br/Teclado-Mecanico-Gamer-RGB-Switch-Blue-i.123456.654321'
      ),
      'Teclado Mecanico Gamer RGB Switch Blue'
    );
  });

  it('deve extrair preço de scripts JSON embutidos na Shopee (formato decimal ou subunidade 100000x) e no Mercado Livre', () => {
    // Arrange 1: Shopee com JSON embutido em subunidades (15990000 = R$ 159,90)
    const htmlShopeeScript = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Mouse Gamer Sem Fio 16000 DPI | Shopee Brasil" />
          <meta property="og:image" content="https://down-br.img.susercontent.com/file/br-11134207-mouse" />
        </head>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            {"props":{"pageProps":{"item":{"itemid":999,"price_min":15990000,"price_max":15990000}}}}
          </script>
        </body>
      </html>
    `;

    // Act 1
    const resShopee = extrairMetadadosDeHtml(
      htmlShopeeScript,
      'https://shopee.com.br/Mouse-Gamer-i.111.222'
    );

    // Assert 1
    assert.equal(resShopee.price, 159.90);

    // Arrange 2: Mercado Livre com __PRELOADED_STATE__ embutido em script
    const htmlMlScript = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Monitor Gamer 144Hz" />
          <meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_112233-O.jpg" />
        </head>
        <body>
          <script>
            window.__PRELOADED_STATE__ = {"initialState":{"components":{"price":{"price":{"amount":849.90,"currency_id":"BRL"}}}}};
          </script>
        </body>
      </html>
    `;

    // Act 2
    const resMl = extrairMetadadosDeHtml(
      htmlMlScript,
      'https://www.mercadolivre.com.br/monitor-gamer/p/MLB112233'
    );

    // Assert 2
    assert.equal(resMl.price, 849.90);
  });

  it('deve buscar preço via pesquisa web dinâmica quando o HTML de produto arbitrário da Shopee ou Mercado Livre não contiver preço', async () => {
    // Arrange: produto arbitrário da Shopee (NÃO existente no catálogo estático)
    const urlShopeeArbitraria =
      'https://shopee.com.br/Teclado-Mecanico-Gamer-RGB-Switch-Blue-ABNT2-i.999888777.111222333';

    const htmlSsrShopeeSemPreco = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Teclado Mecânico Gamer RGB Switch Blue ABNT2 | Shopee Brasil" />
          <meta property="og:image" content="https://down-br.img.susercontent.com/file/br-11134207-teclado" />
          <meta property="og:description" content="Compre Teclado Mecânico Gamer RGB Switch Blue ABNT2 na Shopee Brasil! Frete grátis acima de R$ 19." />
        </head>
        <body></body>
      </html>
    `;

    // Simula página de resultados do Yahoo Search BR com ruídos ("frete grátis acima de R$ 19", "10x de R$ 21,99") e o preço real do produto (R$ 219,90)
    const htmlBuscaYahoo = `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="algo">
            <h3>Teclado Mecânico Gamer RGB Switch Blue ABNT2 | Shopee Brasil</h3>
            <p>Aproveite cupom de R$ 10 e frete grátis acima de R$ 19. Compre agora por R$ 219,90 em até 10x de R$ 21,99 sem juros.</p>
          </div>
          <div class="first current-price">R$ 219,90</div>
        </body>
      </html>
    `;

    const fetchMock = async (urlRequisitada) => {
      if (urlRequisitada.includes('search.yahoo.com')) {
        return criarRespostaMock({ html: htmlBuscaYahoo, url: urlRequisitada });
      }
      return criarRespostaMock({ html: htmlSsrShopeeSemPreco, url: urlShopeeArbitraria });
    };

    // Act
    const metadados = await extrairMetadadosUrl(urlShopeeArbitraria, { fetchFn: fetchMock });

    // Assert: deve ignorar "R$ 10" (cupom), "R$ 19" (frete grátis) e "R$ 21,99" (parcela 10x), extraindo R$ 219,90
    assert.equal(metadados.imagem_url, 'https://down-br.img.susercontent.com/file/br-11134207-teclado');
    assert.equal(metadados.price, 219.90);

    // Arrange 2: produto arbitrário do Mercado Livre totalmente bloqueado pelo bot-interceptor-muralla
    const urlMlArbitraria =
      'https://www.mercadolivre.com.br/cadeira-de-escritorio-ergonomica-presidente-tela-mesh/p/MLB44556677';
    const htmlBloqueioMl = `
      <html>
        <head>
          <meta property="og:title" content="Mercado Livre" />
          <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/pt_logo_large_plus@2x.webp" />
        </head>
        <body></body>
      </html>
    `;
    const htmlBuscaMlYahoo = `
      <html>
        <body>
          <div class="first current-price"> R$ 649,90 </div>
          <div class="algo">
            <p>Cadeira De Escritório Ergonômica Presidente Tela Mesh - R$ 649,90 em 10x de R$ 64,99</p>
          </div>
        </body>
      </html>
    `;

    const fetchMockMl = async (urlRequisitada) => {
      if (urlRequisitada.includes('search.yahoo.com')) {
        return criarRespostaMock({ html: htmlBuscaMlYahoo, url: urlRequisitada });
      }
      return criarRespostaMock({ html: htmlBloqueioMl, url: urlMlArbitraria });
    };

    const metadadosMl = await extrairMetadadosUrl(urlMlArbitraria, { fetchFn: fetchMockMl });
    assert.equal(
      metadadosMl.titulo,
      'Cadeira De Escritorio Ergonomica Presidente Tela Mesh'
    );
    assert.equal(metadadosMl.price, 649.90);
  });
});
