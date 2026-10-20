/**
 * Testes Unitários do Serviço de Scraping de Metadados
 * Validação de extração de OpenGraph, Twitter Cards, tags HTML e fallbacks.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { extrairMetadadosDeHtml, extrairMetadadosUrl } from '../src/services/scraper.js';

describe('Serviço de Scraping de Metadados (Cheerio)', () => {
  test('deve extrair og:title e og:image prioritariamente de documento HTML', () => {
    // Arrange
    const htmlMock = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Título HTML Básico</title>
          <meta property="og:title" content="Fone Bluetooth Pro" />
          <meta property="og:image" content="https://exemplo.com/fone.png" />
          <meta name="twitter:title" content="Título Twitter" />
        </head>
        <body></body>
      </html>
    `;
    const urlBase = 'https://exemplo.com/produto';

    // Act
    const metadados = extrairMetadadosDeHtml(htmlMock, urlBase);

    // Assert
    assert.strictEqual(metadados.titulo, 'Fone Bluetooth Pro');
    assert.strictEqual(metadados.imagem_url, 'https://exemplo.com/fone.png');
  });

  test('deve resolver URLs de imagens relativas para URLs absolutas', () => {
    // Arrange
    const htmlMock = `
      <html>
        <head>
          <meta property="og:image" content="/imagens/relogio.jpg" />
        </head>
      </html>
    `;
    const urlBase = 'https://loja.com/produtos/relogio';

    // Act
    const metadados = extrairMetadadosDeHtml(htmlMock, urlBase);

    // Assert
    assert.strictEqual(metadados.imagem_url, 'https://loja.com/imagens/relogio.jpg');
  });

  test('deve usar tag <title> se não houver og:title nem twitter:title', () => {
    // Arrange
    const htmlMock = `
      <html>
        <head>
          <title>Camisa Casual de Algodão</title>
        </head>
      </html>
    `;
    const urlBase = 'https://moda.com/camisa';

    // Act
    const metadados = extrairMetadadosDeHtml(htmlMock, urlBase);

    // Assert
    assert.strictEqual(metadados.titulo, 'Camisa Casual de Algodão');
    assert.strictEqual(metadados.imagem_url, null);
  });

  test('deve gerar fallback com domínio amigável para URLs inacessíveis', async () => {
    // Arrange
    const urlInacessivel = 'https://dominio-inexistente-123456789.com/produto';

    // Act
    const resultado = await extrairMetadadosUrl(urlInacessivel);

    // Assert
    assert.ok(resultado.titulo.includes('dominio-inexistente-123456789.com'));
    assert.strictEqual(resultado.imagem_url, null);
  });

  test('deve extrair preco de meta tag product:price:amount ou og:price:amount', () => {
    // Arrange
    const htmlMock = `
      <html>
        <head>
          <title>Kindle Paperwhite</title>
          <meta property="product:price:amount" content="499.90" />
        </head>
      </html>
    `;

    // Act
    const metadados = extrairMetadadosDeHtml(htmlMock, 'https://amazon.com.br/dp/123');

    // Assert
    assert.strictEqual(metadados.price, 499.9);
  });

  test('deve extrair preco de JSON-LD schema.org/Product com offers', () => {
    // Arrange
    const htmlMock = `
      <html>
        <head>
          <title>Principia Sérum</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": "Principia Sérum",
              "offers": {
                "@type": "Offer",
                "price": "88.02",
                "priceCurrency": "BRL"
              }
            }
          </script>
        </head>
      </html>
    `;

    // Act
    const metadados = extrairMetadadosDeHtml(htmlMock, 'https://shopee.com.br/serum');

    // Assert
    assert.strictEqual(metadados.price, 88.02);
  });
});
