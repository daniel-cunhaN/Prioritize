/**
 * compartilhamento.test.mjs — Testes unitários do utilitário de compartilhamento
 *
 * Valida extração de URLs de produtos, higienização de deep links e
 * proteção contra abertura indevida em recarregamentos na Web (F5 / reload).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  extrairUrlValida,
  definirUrlCompartilhadaPendente,
  obterUrlCompartilhadaPendente,
  consumirUrlCompartilhadaPendente,
} from '../src/utils/compartilhamento.ts';

describe('Utilitário de Compartilhamento (compartilhamento.ts)', () => {
  beforeEach(() => {
    // Garante que o estado em memória comece limpo antes de cada teste
    consumirUrlCompartilhadaPendente();
    // Limpa mock global do window se houver
    if (globalThis.window) {
      delete globalThis.window;
    }
  });

  describe('Extração de links válidos de e-commerce e produtos', () => {
    it('deve extrair URL direta de produto com protocolo HTTPS', () => {
      // Arrange
      const input = 'https://www.amazon.com.br/dp/B08N5WRWNW';

      // Act
      const resultado = extrairUrlValida(input);

      // Assert
      assert.strictEqual(resultado, 'https://www.amazon.com.br/dp/B08N5WRWNW');
    });

    it('deve extrair URL contida no meio de uma mensagem de compartilhamento', () => {
      // Arrange
      const input = 'Olha esse tênis incrível: https://loja.com.br/tenis-corrida! Vale a pena conferir.';

      // Act
      const resultado = extrairUrlValida(input);

      // Assert
      assert.strictEqual(resultado, 'https://loja.com.br/tenis-corrida');
    });

    it('deve extrair parâmetro de URL de deep link com esquema prioritize://', () => {
      // Arrange
      const input = 'prioritize://share?url=https%3A%2F%2Floja.com%2Fproduto';

      // Act
      const resultado = extrairUrlValida(input);

      // Assert
      assert.strictEqual(resultado, 'https://loja.com/produto');
    });
  });

  describe('Proteção contra abertura indevida no recarregamento da Web (F5 / reload)', () => {
    it('não deve considerar a URL base local do app (localhost:8081) como link de produto', () => {
      // Arrange
      const urlAppLocal = 'http://localhost:8081/';

      // Act
      const resultado = extrairUrlValida(urlAppLocal);

      // Assert: a URL do próprio aplicativo em desenvolvimento NÃO pode ser tratada como produto
      assert.strictEqual(
        resultado,
        null,
        'A URL base do app (localhost) não deve ser tratada como produto a ser adicionado'
      );
    });

    it('não deve considerar a URL base local com IP de loopback (127.0.0.1:8081) como link de produto', () => {
      // Arrange
      const urlLoopback = 'http://127.0.0.1:8081/';

      // Act
      const resultado = extrairUrlValida(urlLoopback);

      // Assert
      assert.strictEqual(
        resultado,
        null,
        'A URL de loopback da aplicação não deve ser tratada como produto'
      );
    });

    it('não deve considerar a URL da própria aplicação Web (window.location.origin) como produto', () => {
      // Arrange: simula ambiente do navegador onde window.location aponta para o app
      globalThis.window = {
        location: {
          origin: 'https://prioritize.app',
          href: 'https://prioritize.app/',
          pathname: '/',
          search: '',
        },
      };

      // Act
      const resultado = extrairUrlValida('https://prioritize.app/');

      // Assert
      assert.strictEqual(
        resultado,
        null,
        'A URL da própria origem da aplicação Web não deve ser tratada como produto'
      );
    });

    it('deve extrair produto quando a URL da aplicação Web contiver o parâmetro ?url=...', () => {
      // Arrange: acessou a aplicação Web trazendo um link de produto no parâmetro de busca
      const urlComParametro = 'http://localhost:8081/?url=https%3A%2F%2Fwww.amazon.com.br%2Fdp%2FB08N5WRWNW';

      // Act
      const resultado = extrairUrlValida(urlComParametro);

      // Assert
      assert.strictEqual(resultado, 'https://www.amazon.com.br/dp/B08N5WRWNW');
    });
  });

  describe('Gerenciamento de URL Compartilhada Pendente em Memória', () => {
    it('deve armazenar e consumir a URL pendente apenas uma vez', () => {
      // Arrange
      const urlProduto = 'https://loja.com/produto-123';
      definirUrlCompartilhadaPendente(urlProduto);

      // Act & Assert 1: leitura sem consumo
      assert.strictEqual(obterUrlCompartilhadaPendente(), urlProduto);

      // Act & Assert 2: consumo único
      const consumida = consumirUrlCompartilhadaPendente();
      assert.strictEqual(consumida, urlProduto);

      // Act & Assert 3: após consumo, deve estar nula
      assert.strictEqual(obterUrlCompartilhadaPendente(), null);
      assert.strictEqual(consumirUrlCompartilhadaPendente(), null);
    });
  });
});
