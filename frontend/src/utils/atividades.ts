/**
 * atividades.ts — Utilitário de Consolidação e Desduplicação do Registro de Atividades
 *
 * Responsável por:
 * - Unificar a nomenclatura e verbos de ações (usando sempre "Adicionou" para inclusão de itens)
 * - Desduplicar eventos entre a sessão volátil em memória e a persistência do banco de dados SQLite
 * - Ordenar cronologicamente a linha do tempo (eventos mais recentes no topo)
 */

import type { EventoAtividade, WishlistItem } from '../types/index.ts';

const ROTULOS_PRIORIDADE: Record<number, string> = {
  3: 'Alta',
  2: 'Média',
  1: 'Baixa',
};

/**
 * Mescla os eventos em tempo real da sessão com os itens persistidos no banco de dados,
 * desduplicando ações de criação e padronizando o verbo para "Adicionou".
 *
 * @param eventosSessao Ações registradas durante a sessão ativa (edições, exclusões, inclusões recentes)
 * @param itens Itens salvos na lista de desejos vindos do banco de dados
 * @returns Linha do tempo unificada e ordenada cronologicamente
 */
export function mesclarEventosLinhaDoTempo(
  eventosSessao: EventoAtividade[],
  itens: WishlistItem[]
): EventoAtividade[] {
  // Identifica itens que já possuem evento de adição registrado na sessão ativa
  const chavesAdicionadasSessao = new Set<string>();

  for (const ev of eventosSessao) {
    if (ev.simbolo === '+') {
      if (ev.itemId) {
        chavesAdicionadasSessao.add(ev.itemId);
      }
      chavesAdicionadasSessao.add(ev.titulo);
    }
  }

  // Gera o histórico de adição apenas para itens que não foram adicionados nesta mesma sessão
  const eventosHistoricos: EventoAtividade[] = itens
    .filter((item) => {
      if (item.id && chavesAdicionadasSessao.has(item.id)) {
        return false;
      }
      const tituloFormatado = `Adicionou "${item.title || 'Item sem título'}"`;
      if (chavesAdicionadasSessao.has(tituloFormatado)) {
        return false;
      }
      return true;
    })
    .map((item) => {
      const prioridadeNum = Number(item.priority) || 2;
      const rotuloPrioridade = ROTULOS_PRIORIDADE[prioridadeNum] || 'Média';
      return {
        id: `hist-${item.id}`,
        itemId: item.id,
        simbolo: '+',
        destaque: prioridadeNum === 3,
        titulo: `Adicionou "${item.title || 'Item sem título'}"`,
        detalhe: `Classificado como ${rotuloPrioridade} Prioridade`,
        dataIso: item.created_at,
      };
    });

  // Concatena eventos da sessão com o histórico deduplicado e ordena do mais recente para o mais antigo
  return [...eventosSessao, ...eventosHistoricos].sort(
    (a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime()
  );
}
