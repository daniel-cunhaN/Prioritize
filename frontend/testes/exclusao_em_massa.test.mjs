/**
 * exclusao_em_massa.test.mjs — Testes TDD da Seleção e Exclusão em Lote no Frontend
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Seleção Múltipla e Exclusão em Lote (Frontend TDD)', () => {
  it('ConfirmarExclusaoModal.tsx deve suportar exclusão de múltiplos itens com contagem dinâmica', () => {
    const modalPath = path.join(srcDir, 'components/ConfirmarExclusaoModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'ConfirmarExclusaoModal.tsx deve existir');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('quantidadeItens') || conteudo.includes('idsParaExcluir') || conteudo.includes('itensParaExcluir'),
      'ConfirmarExclusaoModal deve aceitar quantidade ou lista de múltiplos itens'
    );
  });

  it('HomeScreen.tsx deve possuir estado de modo de seleção e botões de ação em lote', () => {
    const homePath = path.join(srcDir, 'screens/HomeScreen.tsx');
    const conteudo = fs.readFileSync(homePath, 'utf8');

    assert.ok(
      conteudo.includes('modoSelecao') || conteudo.includes('selecionados') || conteudo.includes('itensSelecionados'),
      'HomeScreen deve gerenciar estado de seleção de itens'
    );
    assert.ok(
      conteudo.includes('excluirSelecionados') || conteudo.includes('handleExcluirEmLote'),
      'HomeScreen deve conter função para disparar exclusão em lote'
    );
  });
});
