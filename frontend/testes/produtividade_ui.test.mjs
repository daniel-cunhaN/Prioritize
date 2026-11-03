/**
 * produtividade_ui.test.mjs — Testes unitários do Design System Monocromático e Telas de Produtividade
 *
 * Valida:
 * 1) Cálculo de progresso e alternância de itens no Checklist Focado (ChecklistDesejos)
 * 2) Ordenação cronológica e mesclagem de eventos na Linha do Tempo (RegistroAtividades)
 * 3) Geração dos 7 pontos semanais do Gráfico de Evolução (PainelMetricasGrafico)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

const itensMock = [
  {
    id: 'w-1',
    user_id: 'u-1',
    url: 'https://amazon.com.br/monitor',
    title: 'Monitor 4K Minimal',
    image_url: null,
    priority: 3,
    price: 2100.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'w-2',
    user_id: 'u-1',
    url: 'https://mercadolivre.com.br/teclado',
    title: 'Teclado Mecânico Low Profile',
    image_url: null,
    priority: 2,
    price: 650.0,
    created_at: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'w-3',
    user_id: 'u-1',
    url: 'https://shopee.com.br/suporte',
    title: 'Suporte Articulado Alumínio',
    image_url: null,
    priority: 1,
    price: 180.0,
    created_at: '2026-03-02T14:00:00.000Z',
  },
];

/** Calcula o resumo de conclusão do Checklist Focado */
function calcularResumoChecklist(itens, idsConcluidos) {
  const total = itens.length;
  const concluidos = itens.filter((i) => idsConcluidos.includes(i.id)).length;
  const pendentes = total - concluidos;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  return { total, concluidos, pendentes, percentual };
}

/** Alterna o ID de um item na lista de concluídos */
function alternarConclusaoId(idsAtuais, idAlvo) {
  return idsAtuais.includes(idAlvo)
    ? idsAtuais.filter((id) => id !== idAlvo)
    : [...idsAtuais, idAlvo];
}

/** Mescla e ordena eventos da sessão com eventos históricos */
function mesclarLinhaDoTempo(eventosSessao, itens) {
  const historicos = itens.map((item) => ({
    id: `hist-${item.id}`,
    simbolo: '+',
    destaque: Number(item.priority) === 3,
    titulo: `Adicionou "${item.title}"`,
    dataIso: item.created_at,
  }));
  return [...eventosSessao, ...historicos].sort(
    (a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime()
  );
}

/** Calcula série semanal de 7 dias para o gráfico do Dashboard */
function gerarSerieSemanalTeste(itens, totalConcluidos) {
  const nomesDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const hoje = new Date();
  const serie = [];

  for (let deslocamento = 6; deslocamento >= 0; deslocamento--) {
    const dataAlvo = new Date(hoje);
    dataAlvo.setDate(hoje.getDate() - deslocamento);
    const indiceDiaSemana = (dataAlvo.getDay() + 6) % 7;

    const adicionadosNoDia = itens.filter((item) => {
      const d = new Date(item.created_at);
      return (
        d.getFullYear() === dataAlvo.getFullYear() &&
        d.getMonth() === dataAlvo.getMonth() &&
        d.getDate() === dataAlvo.getDate()
      );
    }).length;

    const concluidosEstimados =
      deslocamento === 0 ? Math.max(totalConcluidos, adicionadosNoDia) : adicionadosNoDia;

    serie.push({
      rotulo: nomesDias[indiceDiaSemana],
      concluidos: concluidosEstimados,
      adicionados: adicionadosNoDia,
    });
  }
  return serie;
}

describe('Telas Monocromáticas de Produtividade (Dashboard, Checklist e Activity Log)', () => {
  describe('Checklist Focado — Alternância e Progresso', () => {
    it('deve marcar e desmarcar um item como concluído de forma idempotente', () => {
      let concluidos = [];
      concluidos = alternarConclusaoId(concluidos, 'w-1');
      assert.deepStrictEqual(concluidos, ['w-1']);

      concluidos = alternarConclusaoId(concluidos, 'w-2');
      assert.deepStrictEqual(concluidos, ['w-1', 'w-2']);

      concluidos = alternarConclusaoId(concluidos, 'w-1');
      assert.deepStrictEqual(concluidos, ['w-2']);
    });

    it('deve calcular corretamente percentual, pendentes e concluídos', () => {
      const resumoParcial = calcularResumoChecklist(itensMock, ['w-1', 'w-3']);
      assert.strictEqual(resumoParcial.total, 3);
      assert.strictEqual(resumoParcial.concluidos, 2);
      assert.strictEqual(resumoParcial.pendentes, 1);
      assert.strictEqual(resumoParcial.percentual, 67);

      const resumoVazio = calcularResumoChecklist([], []);
      assert.strictEqual(resumoVazio.percentual, 0);
    });
  });

  describe('Activity Log — Linha do Tempo Minimalista', () => {
    it('deve ordenar eventos recentes no topo acima do histórico antigo', () => {
      const eventoRecente = {
        id: 'evt-sessao-1',
        simbolo: '✓',
        destaque: true,
        titulo: 'Concluiu "Monitor 4K Minimal"',
        dataIso: new Date(Date.now() + 5000).toISOString(),
      };

      const timeline = mesclarLinhaDoTempo([eventoRecente], itensMock);
      assert.strictEqual(timeline.length, 4);
      assert.strictEqual(timeline[0].id, 'evt-sessao-1');
      assert.strictEqual(timeline[0].simbolo, '✓');
    });
  });

  describe('Gráfico Semanal de Conclusão (7D)', () => {
    it('deve retornar exatamente 7 dias consecutivos encerrando no dia atual', () => {
      const serie = gerarSerieSemanalTeste(itensMock, 2);
      assert.strictEqual(serie.length, 7);
      assert.strictEqual(serie[6].adicionados, 1);
      assert.strictEqual(serie[6].concluidos, 2);
    });
  });
});
