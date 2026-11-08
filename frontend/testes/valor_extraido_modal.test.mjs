/**
 * valor_extraido_modal.test.mjs — Testes TDD da Exibição do Valor Extraído no Modal Quick Creation Sheet
 *
 * Validações:
 * 1) Existência e renderização explícita da seção "VALOR EXTRAÍDO DO LINK"
 * 2) Exibição do valor detectado com feedback visual e badge de identificação automática
 * 3) Disponibilização da opção de edição do valor com preservação da informação original
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Exibição do Valor Extraído no Modal Quick Creation Sheet (TDD)', () => {
  it('AdicionarDesejoModal.tsx deve conter seção dedicada e rótulo "VALOR EXTRAÍDO DO LINK"', () => {
    const modalPath = path.join(srcDir, 'components/AdicionarDesejoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('VALOR EXTRAÍDO DO LINK') || conteudo.includes('Valor extraído do link'),
      'AdicionarDesejoModal.tsx deve informar explicitamente "Valor extraído do link"'
    );
  });

  it('AdicionarDesejoModal.tsx deve armazenar e exibir o precoOriginalExtraido', () => {
    const modalPath = path.join(srcDir, 'components/AdicionarDesejoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('precoOriginalExtraido'),
      'Deve manter estado precoOriginalExtraido para rastrear o valor obtido da URL'
    );
  });

  it('AdicionarDesejoModal.tsx deve indicar quando o link não informa valor público', () => {
    const modalPath = path.join(srcDir, 'components/AdicionarDesejoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('não informado') || conteudo.includes('não detectado'),
      'Deve conter feedback amigável quando o valor não for detectado na página'
    );
  });

  it('AdicionarDesejoModal.tsx deve proteger contra respostas fora de ordem (race condition) em múltiplas extrações', () => {
    const modalPath = path.join(srcDir, 'components/AdicionarDesejoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('requisicaoExtracaoRef'),
      'Deve controlar o identificador da requisição ativa via requisicaoExtracaoRef para evitar oscilação de preço por concorrência'
    );
  });
});
