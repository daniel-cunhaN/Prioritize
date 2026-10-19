/**
 * filtro_ordenacao.test.mjs — Testes unitários do sistema de filtro e ordenação
 *
 * Valida os algoritmos de ordenação por prioridade, data, ordem alfabética,
 * filtros por loja/domínio e busca textual combinada.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Conjunto mock de itens para validação dos algoritmos
const itensExemplo = [
  {
    id: '1',
    user_id: 'u1',
    url: 'https://www.amazon.com.br/dp/B08N5WRWNW',
    title: 'Kindle Paperwhite 16GB',
    image_url: 'https://exemplo.com/kindle.jpg',
    priority: 3, // Alta
    created_at: '2026-01-10T10:00:00.000Z',
  },
  {
    id: '2',
    user_id: 'u1',
    url: 'https://www.mercadolivre.com.br/tenis-corrida',
    title: 'Tênis Esportivo Amortecedor',
    image_url: 'https://exemplo.com/tenis.jpg',
    priority: 1, // Baixa
    created_at: '2026-02-15T15:00:00.000Z',
  },
  {
    id: '3',
    user_id: 'u1',
    url: 'https://www.amazon.com.br/echo-dot',
    title: 'Echo Dot 5ª Geração',
    image_url: 'https://exemplo.com/echo.jpg',
    priority: 2, // Média
    created_at: '2026-03-01T12:00:00.000Z',
  },
  {
    id: '4',
    user_id: 'u1',
    url: 'https://shopee.com.br/suporte-notebook',
    title: 'Apoio e Suporte Articulado',
    image_url: null,
    priority: 3, // Alta
    created_at: '2026-03-10T18:00:00.000Z',
  },
];

// Função de ordenação espelhada do componente
function ordenarItens(itens, ordem) {
  return [...itens].sort((a, b) => {
    switch (ordem) {
      case 'prioridade_asc':
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

      case 'recentes':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

      case 'antigos':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

      case 'alfabetica_az':
        return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });

      case 'alfabetica_za':
        return (b.title || '').localeCompare(a.title || '', 'pt-BR', { sensitivity: 'base' });

      case 'prioridade_desc':
      default:
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

// Função de filtragem espelhada do componente
function filtrarItens(itens, { prioridade = 'ALL', loja = 'ALL', query = '' }) {
  const q = query.trim().toLowerCase();
  return itens.filter((i) => {
    const atendePrioridade = prioridade === 'ALL' || i.priority === prioridade;
    const dom = (i.url || '')
      .replace(/^https?:\/\/(www\.)?/, '')
      .split('/')[0]
      .toLowerCase();
    const atendeLoja = loja === 'ALL' || dom.includes(loja.toLowerCase());
    const atendeBusca =
      !q ||
      (i.title || '').toLowerCase().includes(q) ||
      (i.url || '').toLowerCase().includes(q);

    return atendePrioridade && atendeLoja && atendeBusca;
  });
}

describe('Sistema de Ordenação e Filtragem (Front-end)', () => {
  describe('Critérios de Ordenação', () => {
    it('deve ordenar por maior prioridade (Alta 3 -> Média 2 -> Baixa 1)', () => {
      const resultado = ordenarItens(itensExemplo, 'prioridade_desc');
      assert.strictEqual(resultado[0].priority, 3);
      assert.strictEqual(resultado[1].priority, 3);
      assert.strictEqual(resultado[2].priority, 2);
      assert.strictEqual(resultado[3].priority, 1);
      // Desempate por mais recente entre os de prioridade 3
      assert.strictEqual(resultado[0].id, '4'); // cadastrado em 10/03 vs 10/01
    });

    it('deve ordenar por menor prioridade (Baixa 1 -> Média 2 -> Alta 3)', () => {
      const resultado = ordenarItens(itensExemplo, 'prioridade_asc');
      assert.strictEqual(resultado[0].priority, 1);
      assert.strictEqual(resultado[1].priority, 2);
      assert.strictEqual(resultado[2].priority, 3);
      assert.strictEqual(resultado[3].priority, 3);
    });

    it('deve ordenar por mais recentes (data de criação decrescente)', () => {
      const resultado = ordenarItens(itensExemplo, 'recentes');
      assert.strictEqual(resultado[0].id, '4'); // 10/03/2026
      assert.strictEqual(resultado[1].id, '3'); // 01/03/2026
      assert.strictEqual(resultado[2].id, '2'); // 15/02/2026
      assert.strictEqual(resultado[3].id, '1'); // 10/01/2026
    });

    it('deve ordenar por mais antigos (data de criação crescente)', () => {
      const resultado = ordenarItens(itensExemplo, 'antigos');
      assert.strictEqual(resultado[0].id, '1'); // 10/01/2026
      assert.strictEqual(resultado[1].id, '2'); // 15/02/2026
      assert.strictEqual(resultado[2].id, '3'); // 01/03/2026
      assert.strictEqual(resultado[3].id, '4'); // 10/03/2026
    });

    it('deve ordenar alfabeticamente A-Z', () => {
      const resultado = ordenarItens(itensExemplo, 'alfabetica_az');
      assert.strictEqual(resultado[0].title, 'Apoio e Suporte Articulado');
      assert.strictEqual(resultado[1].title, 'Echo Dot 5ª Geração');
      assert.strictEqual(resultado[2].title, 'Kindle Paperwhite 16GB');
      assert.strictEqual(resultado[3].title, 'Tênis Esportivo Amortecedor');
    });

    it('deve ordenar alfabeticamente Z-A', () => {
      const resultado = ordenarItens(itensExemplo, 'alfabetica_za');
      assert.strictEqual(resultado[0].title, 'Tênis Esportivo Amortecedor');
      assert.strictEqual(resultado[1].title, 'Kindle Paperwhite 16GB');
      assert.strictEqual(resultado[2].title, 'Echo Dot 5ª Geração');
      assert.strictEqual(resultado[3].title, 'Apoio e Suporte Articulado');
    });
  });

  describe('Filtros Combinados', () => {
    it('deve filtrar itens apenas da loja Amazon', () => {
      const resultado = filtrarItens(itensExemplo, { loja: 'amazon.com.br' });
      assert.strictEqual(resultado.length, 2);
      assert.ok(resultado.every((i) => i.url.includes('amazon.com.br')));
    });

    it('deve filtrar por prioridade Alta (3)', () => {
      const resultado = filtrarItens(itensExemplo, { prioridade: 3 });
      assert.strictEqual(resultado.length, 2);
      assert.ok(resultado.every((i) => i.priority === 3));
    });

    it('deve filtrar combinando loja Amazon e prioridade Alta', () => {
      const resultado = filtrarItens(itensExemplo, {
        loja: 'amazon.com.br',
        prioridade: 3,
      });
      assert.strictEqual(resultado.length, 1);
      assert.strictEqual(resultado[0].id, '1');
    });

    it('deve filtrar por busca textual no título', () => {
      const resultado = filtrarItens(itensExemplo, { query: 'Kindle' });
      assert.strictEqual(resultado.length, 1);
      assert.strictEqual(resultado[0].id, '1');
    });

    it('deve retornar vazio quando nenhum item corresponder aos filtros', () => {
      const resultado = filtrarItens(itensExemplo, {
        loja: 'mercadolivre.com.br',
        prioridade: 3,
      });
      assert.strictEqual(resultado.length, 0);
    });
  });
});
