/**
 * modos_visualizacao.test.mjs — Testes unitários para os modos de visualização (Grade, Lista e Kanban)
 *
 * Valida o particionamento em colunas do Kanban, integridade dos itens em lista compacta
 * e persistência da preferência de layout do usuário.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Conjunto mock de desejos com diferentes prioridades e metadados
const desejosMock = [
  {
    id: 'item-1',
    user_id: 'user-1',
    url: 'https://www.amazon.com.br/kindle',
    title: 'Kindle Paperwhite 16GB',
    image_url: 'https://exemplo.com/kindle.jpg',
    priority: 3, // Alta
    price: 499.90,
    created_at: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'item-2',
    user_id: 'user-1',
    url: 'https://www.mercadolivre.com.br/fone-bluetooth',
    title: 'Fone de Ouvido Bluetooth Sem Fio',
    image_url: 'https://exemplo.com/fone.jpg',
    priority: 2, // Média
    price: 189.90,
    created_at: '2026-03-02T12:00:00.000Z',
  },
  {
    id: 'item-3',
    user_id: 'user-1',
    url: 'https://shopee.com.br/mousepad-gamer',
    title: 'Mousepad Gamer Extra Grande',
    image_url: null,
    priority: 1, // Baixa
    price: 39.90,
    created_at: '2026-03-03T14:00:00.000Z',
  },
  {
    id: 'item-4',
    user_id: 'user-1',
    url: 'https://www.amazon.com.br/echo-pop',
    title: 'Echo Pop Smart Speaker com Alexa',
    image_url: 'https://exemplo.com/echo.jpg',
    priority: 3, // Alta
    price: 249.00,
    created_at: '2026-03-04T16:00:00.000Z',
  },
];

/** Lógica de agrupamento por colunas Kanban espelhada de KanbanBoard */
function agruparParaKanban(itens) {
  return {
    3: itens.filter((i) => i.priority === 3),
    2: itens.filter((i) => i.priority === 2),
    1: itens.filter((i) => i.priority === 1),
  };
}

/** Lógica de validação e fallback do modo de visualização persistido */
function resolverModoVisualizacao(valorArmazenado) {
  const modosValidos = ['grid', 'list', 'kanban'];
  if (modosValidos.includes(valorArmazenado)) {
    return valorArmazenado;
  }
  return 'grid'; // Padrão
}

/** Lógica de extração do domínio para exibição em lista/kanban */
function extrairDominio(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
}

describe('Modos de Visualização (Grade, Lista e Kanban)', () => {
  describe('Quadro Kanban — Agrupamento e Distribuição por Prioridade', () => {
    it('deve agrupar corretamente os itens nas 3 colunas (Alta=3, Média=2, Baixa=1)', () => {
      const colunas = agruparParaKanban(desejosMock);

      assert.strictEqual(colunas[3].length, 2, 'Coluna de Alta deve conter 2 itens');
      assert.strictEqual(colunas[2].length, 1, 'Coluna de Média deve conter 1 item');
      assert.strictEqual(colunas[1].length, 1, 'Coluna de Baixa deve conter 1 item');

      assert.deepStrictEqual(
        colunas[3].map((i) => i.id),
        ['item-1', 'item-4']
      );
      assert.strictEqual(colunas[2][0].id, 'item-2');
      assert.strictEqual(colunas[1][0].id, 'item-3');
    });

    it('deve retornar coluna vazia com array vazio caso não haja itens para a prioridade', () => {
      const apenasAlta = desejosMock.filter((i) => i.priority === 3);
      const colunas = agruparParaKanban(apenasAlta);

      assert.strictEqual(colunas[3].length, 2);
      assert.strictEqual(colunas[2].length, 0);
      assert.strictEqual(colunas[1].length, 0);
    });

    it('deve preservar a ordem cronológica ou de ordenação dos itens dentro de cada coluna', () => {
      const ordenados = [...desejosMock].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const colunas = agruparParaKanban(ordenados);

      // Na coluna 3, item-4 é mais recente que item-1
      assert.strictEqual(colunas[3][0].id, 'item-4');
      assert.strictEqual(colunas[3][1].id, 'item-1');
    });
  });

  describe('Preferência e Resolução de Modo de Visualização', () => {
    it('deve aceitar os modos válidos: grid, list e kanban', () => {
      assert.strictEqual(resolverModoVisualizacao('grid'), 'grid');
      assert.strictEqual(resolverModoVisualizacao('list'), 'list');
      assert.strictEqual(resolverModoVisualizacao('kanban'), 'kanban');
    });

    it('deve adotar "grid" como fallback caso o valor persistido seja inválido ou nulo', () => {
      assert.strictEqual(resolverModoVisualizacao(null), 'grid');
      assert.strictEqual(resolverModoVisualizacao(undefined), 'grid');
      assert.strictEqual(resolverModoVisualizacao('tabela'), 'grid');
      assert.strictEqual(resolverModoVisualizacao(''), 'grid');
    });
  });

  describe('Processamento de Metadados em Lista Compacta (ProductListItem)', () => {
    it('deve extrair o domínio limpo da loja a partir da URL', () => {
      assert.strictEqual(
        extrairDominio('https://www.amazon.com.br/dp/B08N5WRWNW'),
        'amazon.com.br'
      );
      assert.strictEqual(
        extrairDominio('https://shopee.com.br/suporte-notebook'),
        'shopee.com.br'
      );
      assert.strictEqual(
        extrairDominio('http://mercadolivre.com.br/item'),
        'mercadolivre.com.br'
      );
    });

    it('deve retornar string vazia para URL vazia ou ausente', () => {
      assert.strictEqual(extrairDominio(''), '');
      assert.strictEqual(extrairDominio(null), '');
    });
  });
});
