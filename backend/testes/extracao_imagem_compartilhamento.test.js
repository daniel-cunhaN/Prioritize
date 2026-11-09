/**
 * extracao_imagem_compartilhamento.test.js
 * Suíte de testes TDD (RED -> GREEN -> REFACTOR) para garantir a extração de imagem
 * na função "Compartilhar com Prioritize" (bookmarklet ?url=... e links com bloqueio anti-bot).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extrairMetadadosDeHtml,
  extrairMetadadosUrl,
  extrairUrlDeTexto,
  extrairImagemDaUrl,
  obterImagemCatalogoReferencia,
  limparCacheMetadados,
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

describe('🔴 TDD: Extração de Imagem na Função "Compartilhar com Prioritize"', () => {
  beforeEach(() => {
    limparCacheMetadados();
  });

  it('1. não deve truncar URL da Shopee com extraParams JSON decodificado e deve preservar image_ids', async () => {
    // Arrange: URL real da Shopee após passar por decodeURIComponent no bookmarklet
    const urlShopeeDecodificada =
      'https://shopee.com.br/Bike-bicicleta-moto-scooter-Elétrica-1000w-Bateria-Chumbo-Sem-CNH-32km-Sobe-Ladeira-Forte-i.827442875.45067707635?extraParams={"display_model_id":224749101970,"model_selection_logic":3}&image_ids=br-11134207-820mb-mu55gcaha2gz51&incoming_source=Search';

    // Act 1: extrairUrlDeTexto deve preservar toda a query string (incluindo image_ids) sem parar na 1ª aspa dupla
    const urlExtraida = extrairUrlDeTexto(urlShopeeDecodificada);
    assert.ok(urlExtraida, 'Deve extrair uma URL válida');
    assert.ok(
      urlExtraida.includes('image_ids=br-11134207-820mb-mu55gcaha2gz51'),
      `A URL extraída não pode truncar antes de image_ids. Recebido: ${urlExtraida}`
    );

    // Act 2: extrairMetadadosUrl deve extrair a imagem mesmo quando o HTML da Shopee falhar ou vier vazio
    const htmlShopeeVazio = '<html><head><title>Shopee Brasil</title></head><body></body></html>';
    const fetchMock = async (urlReq) => criarRespostaMock({ html: htmlShopeeVazio, url: urlReq });

    const metadados = await extrairMetadadosUrl(urlShopeeDecodificada, { fetchFn: fetchMock });

    // Assert
    assert.equal(
      metadados.imagem_url,
      'https://down-br.img.susercontent.com/file/br-11134207-820mb-mu55gcaha2gz51'
    );
    assert.equal(metadados.price, 3299.0);
  });

  it('2. deve extrair imagem diretamente de image_ids da Shopee ou parâmetro ?imagem= na URL via extrairImagemDaUrl', () => {
    assert.equal(typeof extrairImagemDaUrl, 'function', 'extrairImagemDaUrl deve ser exportada');

    // Caso A: Parâmetro image_ids nativo das URLs da Shopee
    const urlComImageIds =
      'https://shopee.com.br/Produto-Teste-i.123.456?image_ids=br-11134207-820mb-mu55gcaha2gz51,br-11134207-secundaria';
    assert.equal(
      extrairImagemDaUrl(urlComImageIds),
      'https://down-br.img.susercontent.com/file/br-11134207-820mb-mu55gcaha2gz51'
    );

    // Caso B: Parâmetro explícito ?imagem= enviado pelo simulador ou bookmarklet
    const urlComParamImagem =
      'https://www.mercadolivre.com.br/produto/p/MLB123?imagem=https%3A%2F%2Fhttp2.mlstatic.com%2FD_NQ_NP_123-O.webp';
    assert.equal(
      extrairImagemDaUrl(urlComParamImagem),
      'https://http2.mlstatic.com/D_NQ_NP_123-O.webp'
    );
  });

  it('3. deve extrair imagem do catálogo de referência para itens de demonstração quando a loja bloquear o HTML', async () => {
    assert.equal(
      typeof obterImagemCatalogoReferencia,
      'function',
      'obterImagemCatalogoReferencia deve ser exportada'
    );

    const urlFoneMl =
      'https://www.mercadolivre.com.br/fone-bluetooth-cancelamento-ruido/p/MLB1928374';
    const htmlBloqueioMl = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="og:title" content="Mercado Livre" />
          <meta property="og:image" content="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/pt_logo_large_plus@2x.webp" />
        </head>
        <body></body>
      </html>
    `;

    const fetchMock = async () => criarRespostaMock({ html: htmlBloqueioMl, url: urlFoneMl });
    const metadados = await extrairMetadadosUrl(urlFoneMl, { fetchFn: fetchMock });

    assert.ok(metadados.imagem_url, 'A imagem do Fone Bluetooth ML não deve ser nula');
    assert.ok(
      metadados.imagem_url.startsWith('https://'),
      `A imagem deve ser uma URL https válida. Recebido: ${metadados.imagem_url}`
    );
    assert.equal(metadados.price, 289.9);
  });

  it('4. deve recuperar a imagem do produto via pesquisa web (Buscapé / Yahoo) quando Mercado Livre ou Shopee bloquearem o HTML', async () => {
    // Arrange: Produto arbitrário do Mercado Livre bloqueado pelo bot-interceptor-muralla
    const urlFuradeiraMl =
      'https://www.mercadolivre.com.br/furadeira-parafusadeira-sem-fio-12v-bateria-carregador-bivolt-13-acessorios-10nm-lorben/p/MLB28014524';

    const htmlBloqueioMl = `
      <html>
        <head>
          <title>Mercado Livre</title>
          <meta property="og:image" content="https://http2.mlstatic.com/static/org-img/homesnw/mercado-livre.png?v=2" />
        </head>
        <body><script src="/_bm/bot-interceptor-muralla.js"></script></body>
      </html>
    `;

    // Página de busca estruturada contendo um acessório barato e o produto real com sua imagem
    const htmlBuscaBuscape = `
      <html>
        <body>
          <div data-testid="product-card">
            <img src="https://image.zst.com.br/bateria-avulsa-12v.jpg" />
            <h2 data-testid="product-card::name">Bateria recarregavel 12v parafusadeira furadeira lorben</h2>
            <div data-testid="product-card::price">R$ 58,28</div>
          </div>
          <div data-testid="product-card">
            <img src="https://image.zst.com.br/furadeira-parafusadeira-12v-lorben-real.jpg" />
            <h2 data-testid="product-card::name">Parafusadeira Furadeira 12V Bivolt 10Nm 13 Peças Lorben</h2>
            <div data-testid="product-card::price">R$ 175,90</div>
          </div>
        </body>
      </html>
    `;

    const fetchMock = async (urlRequisitada) => {
      if (urlRequisitada.includes('buscape.com.br')) {
        return criarRespostaMock({ html: htmlBuscaBuscape, url: urlRequisitada });
      }
      return criarRespostaMock({ html: htmlBloqueioMl, url: urlFuradeiraMl });
    };

    // Act
    const resultado = await extrairMetadadosUrl(urlFuradeiraMl, { fetchFn: fetchMock });

    // Assert: deve recuperar tanto o preço quanto a imagem do card do produto principal (e não da bateria avulsa)
    assert.equal(resultado.price, 175.9);
    assert.equal(
      resultado.imagem_url,
      'https://image.zst.com.br/furadeira-parafusadeira-12v-lorben-real.jpg'
    );
  });

  it('5. deve extrair imagem de scripts JSON de hidratação (__PRELOADED_STATE__ do ML e __NEXT_DATA__ da Shopee) quando og:image for omitida', () => {
    // Caso A: Mercado Livre com __PRELOADED_STATE__ contendo pictures
    const htmlMlScript = `
      <html>
        <head><title>Cadeira Ergonômica Mesh</title></head>
        <body>
          <script>
            window.__PRELOADED_STATE__ = {"initialState":{"components":{"gallery":{"pictures":[{"id":"998877-MLB","url":"https://http2.mlstatic.com/D_NQ_NP_998877-MLB-cadeira.webp"}]}}}};
          </script>
        </body>
      </html>
    `;
    const metaMl = extrairMetadadosDeHtml(
      htmlMlScript,
      'https://www.mercadolivre.com.br/cadeira/p/MLB998877'
    );
    assert.equal(
      metaMl.imagem_url,
      'https://http2.mlstatic.com/D_NQ_NP_998877-MLB-cadeira.webp'
    );

    // Caso B: Shopee com __NEXT_DATA__ contendo o hash da imagem em "image":"br-11134207-..."
    const htmlShopeeScript = `
      <html>
        <head><title>Fone Gamer RGB</title></head>
        <body>
          <script id="__NEXT_DATA__" type="application/json">
            {"props":{"pageProps":{"item":{"itemid":123,"image":"br-11134207-7r98o-fonegamerrgb"}}}}
          </script>
        </body>
      </html>
    `;
    const metaShopee = extrairMetadadosDeHtml(
      htmlShopeeScript,
      'https://shopee.com.br/Fone-Gamer-i.111.222'
    );
    assert.equal(
      metaShopee.imagem_url,
      'https://down-br.img.susercontent.com/file/br-11134207-7r98o-fonegamerrgb'
    );
  });
});
