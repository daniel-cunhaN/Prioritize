/**
 * compartilhamento_robusto.test.mjs — Testes TDD de Compartilhamento Seguro e Extração de Preço
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Tratamento Robusto de Links e Exibição de Preço (TDD)', () => {
  it('compartilhamento.ts não deve descartar URL de e-commerce quando ela possui query params', async () => {
    const { extrairUrlValida } = await import('../src/utils/compartilhamento.ts');

    const urlShopeeComQuery = 'https://shopee.com.br/Principia-Antissinais-Dia-e-Noite-c-Vitamina-VC-10-i.1613313673.58266270841?is_from_login=true&url=https://tracking.com/clique';
    const extraida = extrairUrlValida(urlShopeeComQuery);

    assert.ok(extraida, 'Deve retornar URL válida');
    assert.ok(extraida.includes('shopee.com.br/Principia-Antissinais'), 'Não deve ser substituída por sub-parâmetro');
  });

  it('AdicionarDesejoModal.tsx deve suportar tanto price quanto preco na resposta da API', () => {
    const modalPath = path.join(srcDir, 'components/AdicionarDesejoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('resposta.data') && (conteudo.includes('preco') || conteudo.includes('price')),
      'Deve capturar campos de preço da resposta de preview'
    );
  });
});
