/**
 * confirmar_exclusao.test.mjs — Testes TDD do Modal Estilizado de Exclusão de Produtos
 *
 * Validações:
 * 1) Existência do componente ConfirmarExclusaoModal.tsx
 * 2) Exibição estilizada da mensagem "Deseja mesmo excluir esse produto"
 * 3) Integração em HomeScreen.tsx substituindo window.confirm / Alert.alert nativo
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Modal Estilizado de Confirmação de Exclusão (TDD)', () => {
  it('deve existir o componente ConfirmarExclusaoModal.tsx no diretório de componentes', () => {
    const modalPath = path.join(srcDir, 'components/ConfirmarExclusaoModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'ConfirmarExclusaoModal.tsx deve existir');
  });

  it('ConfirmarExclusaoModal deve renderizar a pergunta "Deseja mesmo excluir esse produto" e opções de Cancelar e Excluir', () => {
    const modalPath = path.join(srcDir, 'components/ConfirmarExclusaoModal.tsx');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('Deseja mesmo excluir esse produto'),
      'Deve conter o texto exato "Deseja mesmo excluir esse produto"'
    );
    assert.ok(
      conteudo.includes('Cancelar'),
      'Deve conter botão de ação para Cancelar'
    );
    assert.ok(
      conteudo.includes('Excluir'),
      'Deve conter botão de confirmação para Excluir'
    );
  });

  it('HomeScreen.tsx deve utilizar ConfirmarExclusaoModal em vez de window.confirm nativo na exclusão', () => {
    const homeScreenPath = path.join(srcDir, 'screens/HomeScreen.tsx');
    const conteudo = fs.readFileSync(homeScreenPath, 'utf8');

    assert.ok(
      conteudo.includes('ConfirmarExclusaoModal'),
      'HomeScreen.tsx deve importar e renderizar ConfirmarExclusaoModal'
    );
    assert.ok(
      !conteudo.includes('window.confirm'),
      'HomeScreen.tsx não deve utilizar window.confirm cru'
    );
  });
});
