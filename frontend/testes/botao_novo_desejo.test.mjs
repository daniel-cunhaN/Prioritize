/**
 * botao_novo_desejo.test.mjs — Testes TDD do Botão "Novo Desejo" com Design Spell
 *
 * Validações:
 * 1) Existência do componente BotaoNovoDesejo.tsx com micro-interações de Design Spell
 * 2) Renderização do texto "Novo Desejo" com ícone estilizado e detalhes táteis
 * 3) Integração do componente em DesktopHeader.tsx e HomeScreen.tsx
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Botão "Novo Desejo" com Design Spell (TDD)', () => {
  it('deve existir o componente BotaoNovoDesejo.tsx no diretório de componentes home', () => {
    const botaoPath = path.join(srcDir, 'components/home/BotaoNovoDesejo.tsx');
    assert.ok(fs.existsSync(botaoPath), 'BotaoNovoDesejo.tsx deve existir');
  });

  it('BotaoNovoDesejo.tsx deve conter o texto "Novo Desejo" e elementos táteis de Design Spell', () => {
    const botaoPath = path.join(srcDir, 'components/home/BotaoNovoDesejo.tsx');
    const conteudo = fs.readFileSync(botaoPath, 'utf8');

    assert.ok(
      conteudo.includes('Novo Desejo'),
      'Deve renderizar o texto "Novo Desejo"'
    );
    assert.ok(
      conteudo.includes('sparkle') || conteudo.includes('✦') || conteudo.includes('sparkles'),
      'Deve incorporar detalhe mágico de micro-interação (sparkle/brilho)'
    );
  });

  it('DesktopHeader.tsx deve utilizar BotaoNovoDesejo em vez de botão comum', () => {
    const headerPath = path.join(srcDir, 'components/home/DesktopHeader.tsx');
    const conteudo = fs.readFileSync(headerPath, 'utf8');

    assert.ok(
      conteudo.includes('BotaoNovoDesejo'),
      'DesktopHeader.tsx deve importar e renderizar BotaoNovoDesejo'
    );
  });

  it('HomeScreen.tsx deve utilizar BotaoNovoDesejo no estado vazio', () => {
    const homePath = path.join(srcDir, 'screens/HomeScreen.tsx');
    const conteudo = fs.readFileSync(homePath, 'utf8');

    assert.ok(
      conteudo.includes('BotaoNovoDesejo'),
      'HomeScreen.tsx deve utilizar BotaoNovoDesejo'
    );
  });
});
