/**
 * unificacao_log_atividades.test.mjs
 * Suíte de testes TDD (RED -> GREEN -> REFACTOR) para a unificação e desduplicação
 * dos eventos da linha do tempo no Registro de Atividades (RegistroAtividades.tsx e atividades.ts).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('🔴 TDD: Unificação e Desduplicação da Linha do Tempo (Registro de Atividades)', () => {
  it('1. HomeScreen.tsx deve registrar a criação com o verbo unificado "Adicionou" e vincular o itemId', () => {
    const homeScreenPath = path.join(srcDir, 'screens/HomeScreen.tsx');
    const conteudo = fs.readFileSync(homeScreenPath, 'utf8');

    // Não deve mais conter o verbo 'Criou' solto para criação de desejos
    const temVerboCriou = /titulo:\s*`Criou\s*"/m.test(conteudo);
    assert.equal(
      temVerboCriou,
      false,
      'HomeScreen.tsx não deve usar o verbo "Criou"; deve usar o verbo unificado "Adicionou"'
    );

    // Deve usar o verbo unificado "Adicionou" no handleDesejoCriado
    const temVerboAdicionouNoDesejoCriado = /titulo:\s*`Adicionou\s*"/m.test(conteudo);
    assert.equal(
      temVerboAdicionouNoDesejoCriado,
      true,
      'HomeScreen.tsx deve registrar novo desejo com `Adicionou "..."`'
    );

    // Deve vincular o itemId no evento registrado
    const vinculaItemId = /itemId:\s*novoDesejo\.id/m.test(conteudo);
    assert.equal(
      vinculaItemId,
      true,
      'HomeScreen.tsx deve passar itemId: novoDesejo.id ao registrar evento'
    );
  });

  it('2. mesclarEventosLinhaDoTempo não deve duplicar o evento quando um item foi adicionado na sessão e já consta nos itens', async () => {
    // Importa a função pura de manipulação de linha do tempo
    const { mesclarEventosLinhaDoTempo } = await import('../src/utils/atividades.ts');

    assert.equal(
      typeof mesclarEventosLinhaDoTempo,
      'function',
      'atividades.ts deve exportar a função pura mesclarEventosLinhaDoTempo'
    );

    const agora = new Date().toISOString();
    const itemRecemCriado = {
      id: 'item-echo-dot-123',
      user_id: 'user-1',
      url: 'https://amazon.com.br/dp/B09B8VGCR8',
      title: 'Echo Dot 5ª Geração Amazon, Com Alexa, Smart Speaker, Preto',
      image_url: 'https://m.media-amazon.com/images/I/71.jpg',
      priority: 2,
      price: 384.09,
      created_at: agora,
    };

    // Evento em tempo real registrado na sessão pelo modal
    const eventoSessao = {
      id: 'evt-1794320129924',
      itemId: 'item-echo-dot-123',
      simbolo: '+',
      destaque: false,
      titulo: 'Adicionou "Echo Dot 5ª Geração Amazon, Com Alexa, Smart Speaker, Preto"',
      detalhe: 'Classificado como Média Prioridade',
      dataIso: agora,
    };

    // Ao mesclar eventos da sessão com os itens salvos, o mesmo produto NÃO pode aparecer 2 vezes
    const resultado = mesclarEventosLinhaDoTempo([eventoSessao], [itemRecemCriado]);

    assert.equal(
      resultado.length,
      1,
      `Esperado apenas 1 evento unificado na linha do tempo, mas foram retornados ${resultado.length} eventos.`
    );
    assert.equal(
      resultado[0].titulo,
      'Adicionou "Echo Dot 5ª Geração Amazon, Com Alexa, Smart Speaker, Preto"'
    );
  });

  it('3. mesclarEventosLinhaDoTempo deve preservar histórico antigo de itens já existentes e novos eventos de edição sem duplicar a adição', async () => {
    const { mesclarEventosLinhaDoTempo } = await import('../src/utils/atividades.ts');

    const dataAntiga = '2026-03-01T10:00:00.000Z';
    const dataEdicao = '2026-03-01T12:00:00.000Z';

    const itemExistente = {
      id: 'item-fone-456',
      user_id: 'user-1',
      url: 'https://mercadolivre.com.br/fone',
      title: 'Fone Bluetooth Noise Cancelling',
      image_url: null,
      priority: 3,
      price: 289.9,
      created_at: dataAntiga,
    };

    // Evento de edição ocorrido na sessão
    const eventoEdicao = {
      id: 'evt-edit-789',
      itemId: 'item-fone-456',
      simbolo: '✎',
      destaque: false,
      titulo: 'Atualizou "Fone Bluetooth Noise Cancelling"',
      detalhe: 'Prioridade definida para Alta',
      dataIso: dataEdicao,
    };

    const resultado = mesclarEventosLinhaDoTempo([eventoEdicao], [itemExistente]);

    // Deve exibir 2 eventos: a edição recente no topo E o histórico de adição abaixo
    assert.equal(resultado.length, 2);
    assert.equal(resultado[0].titulo, 'Atualizou "Fone Bluetooth Noise Cancelling"');
    assert.equal(resultado[0].simbolo, '✎');
    assert.equal(resultado[1].titulo, 'Adicionou "Fone Bluetooth Noise Cancelling"');
    assert.equal(resultado[1].simbolo, '+');
  });

  it('4. RegistroAtividades.tsx deve utilizar mesclarEventosLinhaDoTempo para renderizar a linha do tempo', () => {
    const registroPath = path.join(srcDir, 'components/home/RegistroAtividades.tsx');
    const conteudo = fs.readFileSync(registroPath, 'utf8');

    assert.ok(
      conteudo.includes('mesclarEventosLinhaDoTempo'),
      'RegistroAtividades.tsx deve importar e utilizar mesclarEventosLinhaDoTempo'
    );
  });
});
