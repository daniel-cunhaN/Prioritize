/**
 * confirmar_logout.test.mjs — Testes TDD do Modal Estilizado de Confirmação de Logout
 *
 * Validações:
 * 1) Existência do componente ConfirmarLogoutModal.tsx
 * 2) Renderização da mensagem "Tem certeza que deseja deslogar e sair da sua conta?"
 * 3) Presença de opções de Cancelar e Confirmar saída com design monocromático
 * 4) Integração em GerenciarContaModal.tsx em substituição a window.confirm / Alert.alert nativo
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Modal Estilizado de Confirmação de Logout (TDD)', () => {
  it('deve existir o componente ConfirmarLogoutModal.tsx no diretório de componentes', () => {
    const modalPath = path.join(srcDir, 'components/ConfirmarLogoutModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'ConfirmarLogoutModal.tsx deve existir');
  });

  it('ConfirmarLogoutModal deve renderizar a pergunta "Tem certeza que deseja deslogar e sair da sua conta?" e opções de ação', () => {
    const modalPath = path.join(srcDir, 'components/ConfirmarLogoutModal.tsx');
    assert.ok(fs.existsSync(modalPath), 'Arquivo deve existir');
    const conteudo = fs.readFileSync(modalPath, 'utf8');

    assert.ok(
      conteudo.includes('Tem certeza que deseja deslogar e sair da sua conta?'),
      'Deve conter a pergunta exata exigida pelo usuário'
    );
    assert.ok(
      conteudo.includes('Cancelar'),
      'Deve conter botão Cancelar'
    );
    assert.ok(
      conteudo.includes('Sair') || conteudo.includes('Deslogar'),
      'Deve conter botão de confirmação para sair ou deslogar'
    );
    assert.ok(
      conteudo.includes('log-out') || conteudo.includes('power'),
      'Deve conter ícone temático de saída/logout'
    );
  });

  it('GerenciarContaModal.tsx deve utilizar ConfirmarLogoutModal em vez de window.confirm ou Alert.alert', () => {
    const gerenciarPath = path.join(srcDir, 'components/GerenciarContaModal.tsx');
    const conteudo = fs.readFileSync(gerenciarPath, 'utf8');

    assert.ok(
      conteudo.includes('ConfirmarLogoutModal'),
      'GerenciarContaModal deve importar e utilizar ConfirmarLogoutModal'
    );
    assert.ok(
      !conteudo.includes('window.confirm'),
      'Não deve utilizar mais o window.confirm cru do navegador'
    );
  });
});
