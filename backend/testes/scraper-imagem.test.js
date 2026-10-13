/**
 * Testes de Regressão: Extração de Imagem em Lojas com Proteção Anti-bot
 *
 * Cenários reproduzidos a partir de diagnóstico real:
 * - Mercado Livre devolve página de "verificação de conta" (sem og:image) para
 *   User-Agent de navegador, mas devolve og:image para crawlers de prévia (Twitterbot).
 * - Algumas lojas expõem a imagem apenas via JSON-LD (schema.org/Product),
 *   itemprop="image", link rel="image_src" ou variações de og:image.
 * - Amazon bloqueia o HTML com captcha, mas a imagem pode ser obtida pelo ASIN.
 *
 * Todos os testes usam um fetch simulado (injetado) para não depender da rede.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  extrairMetadadosDeHtml,
  extrairMetadadosUrl,
  extrairAsinAmazon,
} from '../src/services/scraper.js';

// ─── Utilitário: cria uma resposta HTTP simulada compatível com fetch ─────────
function respostaFalsa({ status = 200, html = '', url, contentType = 'text/html' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (nome) => (nome.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => html,
    arrayBuffer: async () => new ArrayBuffer(html.length || 0),
  };
}

// Página de bloqueio anti-bot típica (sem metadados do produto)
const HTML_BLOQUEIO = '<html><head><title>Mercado Libre</title></head><body>Verificação</body></html>';

// Página real do produto, servida apenas para crawlers de prévia
const HTML_PRODUTO_ML = `
  <html><head>
    <title>Apple iPhone 15 | Mercado Livre</title>
    <meta property="og:title" content="Apple iPhone 15 (256 GB) - Preto" />
    <meta property="og:image" content="https://http2.mlstatic.com/D_NQ_NP_841858-O.jpg" />
  </head></html>
`;

describe('Extração de imagem: fontes alternativas no HTML', () => {
  test('deve extrair imagem de JSON-LD do tipo Product (image como string)', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Tênis Corrida","image":"https://loja.com/tenis.jpg"}
        </script>
      </head></html>`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://loja.com/tenis.jpg');
  });

  test('deve extrair imagem de JSON-LD com image em array e dentro de @graph', () => {
    const html = `
      <script type="application/ld+json">
        {"@graph":[{"@type":"WebPage"},{"@type":"Product","image":["/img/a.jpg","/img/b.jpg"]}]}
      </script>`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://loja.com/img/a.jpg');
  });

  test('deve extrair imagem de JSON-LD com image como ImageObject ({ url })', () => {
    const html = `
      <script type="application/ld+json">
        [{"@type":"Product","image":{"@type":"ImageObject","url":"https://cdn.loja.com/x.png"}}]
      </script>`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://cdn.loja.com/x.png');
  });

  test('deve ignorar JSON-LD malformado sem lançar erro', () => {
    const html = `<script type="application/ld+json">{ isto não é json </script>`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, null);
  });

  test('deve aceitar og:image declarado com atributo name em vez de property', () => {
    const html = `<meta name="og:image" content="https://loja.com/name.jpg" />`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://loja.com/name.jpg');
  });

  test('deve aceitar og:image:secure_url', () => {
    const html = `<meta property="og:image:secure_url" content="https://loja.com/seguro.jpg" />`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://loja.com/seguro.jpg');
  });

  test('deve aceitar itemprop="image" e link rel="image_src"', () => {
    const htmlItemprop = `<img itemprop="image" src="/produto.webp" />`;
    const htmlLink = `<link rel="image_src" href="https://loja.com/link.jpg" />`;

    assert.strictEqual(
      extrairMetadadosDeHtml(htmlItemprop, 'https://loja.com/p/1').imagem_url,
      'https://loja.com/produto.webp'
    );
    assert.strictEqual(
      extrairMetadadosDeHtml(htmlLink, 'https://loja.com/p/1').imagem_url,
      'https://loja.com/link.jpg'
    );
  });

  test('deve manter og:image com prioridade sobre JSON-LD', () => {
    const html = `
      <meta property="og:image" content="https://loja.com/og.jpg" />
      <script type="application/ld+json">{"@type":"Product","image":"https://loja.com/ld.jpg"}</script>`;

    const metadados = extrairMetadadosDeHtml(html, 'https://loja.com/p/1');

    assert.strictEqual(metadados.imagem_url, 'https://loja.com/og.jpg');
  });
});

describe('Extração de imagem: lojas com bloqueio anti-bot', () => {
  test('deve tentar novamente com User-Agent de crawler de prévia quando a página vem sem imagem', async () => {
    // Arrange: simula o Mercado Livre (bloqueia navegador, libera Twitterbot)
    const urlProduto = 'https://www.mercadolivre.com.br/apple-iphone-15/p/MLB1027172669';
    const agentesUsados = [];
    const fetchFalso = async (url, opcoes) => {
      const ua = opcoes.headers['User-Agent'];
      agentesUsados.push(ua);
      if (/Twitterbot/i.test(ua)) {
        return respostaFalsa({ html: HTML_PRODUTO_ML, url: urlProduto });
      }
      return respostaFalsa({ html: HTML_BLOQUEIO, url: `${urlProduto}?verificacao` });
    };

    // Act
    const resultado = await extrairMetadadosUrl(urlProduto, { fetchFn: fetchFalso });

    // Assert
    assert.strictEqual(resultado.imagem_url, 'https://http2.mlstatic.com/D_NQ_NP_841858-O.jpg');
    assert.strictEqual(resultado.titulo, 'Apple iPhone 15 (256 GB) - Preto');
    assert.ok(agentesUsados.length >= 2, 'Deve ter feito mais de uma tentativa');
  });

  test('não deve fazer novas tentativas quando a primeira já traz imagem', async () => {
    let chamadas = 0;
    const fetchFalso = async (url) => {
      chamadas++;
      return respostaFalsa({ html: HTML_PRODUTO_ML, url });
    };

    await extrairMetadadosUrl('https://loja.com/p/1', { fetchFn: fetchFalso });

    assert.strictEqual(chamadas, 1);
  });

  test('deve continuar tentando quando uma tentativa lança erro (timeout/rede)', async () => {
    const fetchFalso = async (url, opcoes) => {
      if (!/Twitterbot/i.test(opcoes.headers['User-Agent'])) {
        throw new Error('The operation was aborted due to timeout');
      }
      return respostaFalsa({ html: HTML_PRODUTO_ML, url });
    };

    const resultado = await extrairMetadadosUrl('https://loja.com/p/1', { fetchFn: fetchFalso });

    assert.strictEqual(resultado.imagem_url, 'https://http2.mlstatic.com/D_NQ_NP_841858-O.jpg');
  });

  test('deve retornar fallback de domínio quando todas as tentativas falham', async () => {
    const fetchFalso = async (url) => respostaFalsa({ status: 403, html: HTML_BLOQUEIO, url });

    const resultado = await extrairMetadadosUrl('https://www.lojabloqueada.com/p/1', {
      fetchFn: fetchFalso,
    });

    assert.strictEqual(resultado.imagem_url, null);
    assert.strictEqual(resultado.titulo, 'Produto em lojabloqueada.com');
  });
});

describe('Extração de imagem: fallback da Amazon por ASIN', () => {
  test('deve extrair o ASIN dos formatos de URL mais comuns da Amazon', () => {
    assert.strictEqual(extrairAsinAmazon('https://www.amazon.com.br/dp/B0CHX1W1XY'), 'B0CHX1W1XY');
    assert.strictEqual(
      extrairAsinAmazon('https://www.amazon.com.br/Echo-Dot/dp/B09B8V1LZ3/ref=sr_1_1?k=echo'),
      'B09B8V1LZ3'
    );
    assert.strictEqual(
      extrairAsinAmazon('https://www.amazon.com/gp/product/B07FZ8S74R?th=1'),
      'B07FZ8S74R'
    );
  });

  test('deve retornar null para URLs que não são da Amazon ou sem ASIN', () => {
    assert.strictEqual(extrairAsinAmazon('https://www.kabum.com.br/dp/B0CHX1W1XY'), null);
    assert.strictEqual(extrairAsinAmazon('https://www.amazon.com.br/'), null);
  });

  test('deve usar a imagem do ASIN quando o HTML da Amazon estiver bloqueado', async () => {
    const urlAmazon = 'https://www.amazon.com.br/Echo-Dot/dp/B09B8V1LZ3';
    const fetchFalso = async (url) => {
      if (url.includes('m.media-amazon.com')) {
        return respostaFalsa({ url, contentType: 'image/jpeg', html: 'x'.repeat(5000) });
      }
      return respostaFalsa({ html: '<html><title>Amazon.com.br</title></html>', url });
    };

    const resultado = await extrairMetadadosUrl(urlAmazon, { fetchFn: fetchFalso });

    assert.strictEqual(
      resultado.imagem_url,
      'https://m.media-amazon.com/images/P/B09B8V1LZ3.01._SCLZZZZZZZ_.jpg'
    );
  });

  test('deve descartar o pixel GIF de 1x1 que a Amazon devolve para ASIN inexistente', async () => {
    const fetchFalso = async (url) => {
      if (url.includes('m.media-amazon.com')) {
        return respostaFalsa({ url, contentType: 'image/gif', html: 'x'.repeat(43) });
      }
      return respostaFalsa({ html: '<html><title>Amazon.com.br</title></html>', url });
    };

    const resultado = await extrairMetadadosUrl('https://www.amazon.com.br/dp/B000000000', {
      fetchFn: fetchFalso,
    });

    assert.strictEqual(resultado.imagem_url, null);
  });
});
