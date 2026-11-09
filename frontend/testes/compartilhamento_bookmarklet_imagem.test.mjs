/**
 * compartilhamento_bookmarklet_imagem.test.mjs
 * Suíte de testes TDD (RED -> GREEN -> REFACTOR) para garantir que a função
 * "Compartilhar com Prioritize":
 *   javascript:(function(){window.open('http://localhost:8081/?url='+encodeURIComponent(window.location.href),'_blank');})();
 * preserve integralmente URLs complexas (como Shopee com extraParams JSON e image_ids)
 * sem truncar nas aspas ou chaves decodificadas.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extrairUrlValida,
  consumirUrlCompartilhadaPendente,
} from '../src/utils/compartilhamento.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('🔴 TDD: Bookmarklet "Compartilhar com Prioritize" — Preservação de Imagem e URL', () => {
  beforeEach(() => {
    consumirUrlCompartilhadaPendente();
    if (globalThis.window) {
      delete globalThis.window;
    }
  });

  it('1. deve preservar integralmente a URL da Shopee (incluindo extraParams e image_ids) quando enviada pelo bookmarklet ?url=encodeURIComponent(window.location.href)', () => {
    // Arrange: URL real da barra de endereços da Shopee quando o usuário clica no bookmarklet
    const windowLocationHrefShopee =
      'https://shopee.com.br/Bike-bicicleta-moto-scooter-El%C3%A9trica-1000w-Bateria-Chumbo-Sem-CNH-32km-Sobe-Ladeira-Forte-i.827442875.45067707635?extraParams=%7B%22display_model_id%22%3A224749101970%2C%22model_selection_logic%22%3A3%7D&image_ids=br-11134207-820mb-mu55gcaha2gz51&incoming_source=Search';

    // Simula exatamente a execução do bookmarklet:
    // javascript:(function(){window.open('http://localhost:8081/?url='+encodeURIComponent(window.location.href),'_blank');})();
    const urlAbertaPeloBookmarklet =
      'http://localhost:8081/?url=' + encodeURIComponent(windowLocationHrefShopee);

    // Act
    const urlExtraida = extrairUrlValida(urlAbertaPeloBookmarklet);

    // Assert: não deve truncar na aspa dupla de extraParams={"display_model_id"...}
    assert.ok(urlExtraida, 'Deve retornar uma URL válida');
    assert.ok(
      urlExtraida.includes('image_ids=br-11134207-820mb-mu55gcaha2gz51'),
      `A URL extraída deve preservar image_ids para permitir extração da imagem. Recebido: ${urlExtraida}`
    );
    assert.ok(
      urlExtraida.includes('incoming_source=Search'),
      `A URL extraída deve preservar todos os parâmetros finais. Recebido: ${urlExtraida}`
    );
  });

  it('2. deve preservar a URL completa mesmo se as chaves/aspas de extraParams já vierem decodificadas', () => {
    // Arrange: URL onde decodeURIComponent já transformou %7B%22 em {"
    const urlComJsonDecodificado =
      'https://shopee.com.br/Bike-bicicleta-moto-scooter-Elétrica-1000w-Bateria-Chumbo-Sem-CNH-32km-Sobe-Ladeira-Forte-i.827442875.45067707635?extraParams={"display_model_id":224749101970,"model_selection_logic":3}&image_ids=br-11134207-820mb-mu55gcaha2gz51&incoming_source=Search';

    // Act
    const urlExtraida = extrairUrlValida(urlComJsonDecodificado);

    // Assert
    assert.ok(urlExtraida, 'Deve retornar uma URL válida');
    assert.ok(
      urlExtraida.includes('image_ids=br-11134207-820mb-mu55gcaha2gz51'),
      `Não deve truncar na aspa de extraParams. Recebido: ${urlExtraida}`
    );
    assert.ok(
      !urlExtraida.includes('"'),
      `As aspas internas devem estar codificadas na URL final. Recebido: ${urlExtraida}`
    );
  });

  it('3. useCompartilhamento.ts não deve aplicar decodeURIComponent destrutivo quando urlWebBruta já iniciar com http:// ou https://', () => {
    const hookPath = path.join(srcDir, 'hooks/useCompartilhamento.ts');
    const codigoHook = fs.readFileSync(hookPath, 'utf8');

    // Não deve conter o padrão antigo `if (urlDecodificada.includes('%')) { urlDecodificada = decodeURIComponent(urlDecodificada); }`
    // que corrompia parâmetros codificados (%7B%22 -> {") de URLs já iniciadas por https://
    const temDecodeIncondicionalPorPorcentagem =
      /if\s*\(\s*urlDecodificada\.includes\(\s*['"]%['"]\s*\)\s*\)\s*\{\s*urlDecodificada\s*=\s*decodeURIComponent/m.test(
        codigoHook
      );

    assert.equal(
      temDecodeIncondicionalPorPorcentagem,
      false,
      'useCompartilhamento.ts só deve usar decodeURIComponent se o protocolo http/https ainda estiver codificado'
    );
  });
});
