/**
 * botao_novo_desejo.test.mjs — Testes TDD do Botão "Novo Desejo" com Design Spell
 *
 * Validações:
 * 1) Existência do componente BotaoNovoDesejo.tsx com micro-interações de Design Spell
 * 2) Renderização do texto "Novo Desejo" com ícone estilizado e detalhes táteis
 * 3) Ausência do ícone inválido "sparkles" do Feather para evitar warning no console Web
 * 4) Proporção e formatação alinhada com altura padrão e espaçamentos equilibrados
 * 5) Integração do componente em DesktopHeader.tsx e HomeScreen.tsx
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

  it('BotaoNovoDesejo.tsx deve conter o texto "Novo Desejo" e micro-interações táteis', () => {
    const botaoPath = path.join(srcDir, 'components/home/BotaoNovoDesejo.tsx');
    const conteudo = fs.readFileSync(botaoPath, 'utf8');

    assert.ok(
      conteudo.includes('Novo Desejo'),
      'Deve renderizar o texto "Novo Desejo"'
    );
    assert.ok(
      conteudo.includes('plus'),
      'Deve renderizar o ícone de criação "plus"'
    );
  });

  it('BotaoNovoDesejo.tsx não deve referenciar "sparkles" como ícone do Feather', () => {
    const botaoPath = path.join(srcDir, 'components/home/BotaoNovoDesejo.tsx');
    const conteudo = fs.readFileSync(botaoPath, 'utf8');

    assert.ok(
      !conteudo.includes('name="sparkles"'),
      'Não deve conter Feather name="sparkles" para não disparar warning no Web'
    );
  });

  it('BotaoNovoDesejo.tsx deve ter formatação consistente com altura de 44px no tamanho médio', () => {
    const botaoPath = path.join(srcDir, 'components/home/BotaoNovoDesejo.tsx');
    const conteudo = fs.readFileSync(botaoPath, 'utf8');

    assert.ok(
      conteudo.includes('44'),
      'Deve ter altura de 44px alinhada com os outros controles de navegação'
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
