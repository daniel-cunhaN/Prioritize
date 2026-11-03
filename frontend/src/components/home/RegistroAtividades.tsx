/**
 * RegistroAtividades.tsx — Linha do Tempo Minimalista (Activity Log with Timeline Bubbles)
 *
 * Apresenta o histórico cronológico das ações do usuário (itens adicionados,
 * concluídos, editados ou removidos) com bolhas circulares minimalistas.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography, radius } from '../../theme';
import { EventoAtividade, WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';

interface Props {
  eventosSessao: EventoAtividade[];
  itens: WishlistItem[];
}

/** Formata data ISO para horário ou data curta legível em pt-BR */
function formatarHorarioRelativo(dataIso: string): string {
  try {
    const data = new Date(dataIso);
    const agora = new Date();
    const diffMin = Math.floor((agora.getTime() - data.getTime()) / 60000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `${diffHoras}h`;

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

export default function RegistroAtividades({ eventosSessao, itens }: Props) {
  const theme = useTheme();

  // Mescla os eventos em tempo real da sessão com o histórico de criação dos itens salvos
  const linhaDoTempo = useMemo(() => {
    const eventosHistoricos: EventoAtividade[] = itens.map((item) => {
      const conf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
      return {
        id: `hist-${item.id}`,
        simbolo: '+',
        destaque: Number(item.priority) === 3,
        titulo: `Adicionou "${item.title || 'Item sem título'}"`,
        detalhe: `Classificado como ${conf.label} Prioridade`,
        dataIso: item.created_at,
      };
    });

    return [...eventosSessao, ...eventosHistoricos].sort(
      (a, b) => new Date(b.dataIso).getTime() - new Date(a.dataIso).getTime()
    );
  }, [eventosSessao, itens]);

  return (
    <View style={styles.container}>
      {/* Cabeçalho da Linha do Tempo */}
      <View style={styles.cabecalho}>
        <View>
          <Text style={[styles.subtituloTopo, { color: theme.mutedForeground }]}>
            HISTÓRICO CRONOLÓGICO
          </Text>
          <Text style={[styles.tituloTopo, { color: theme.foreground }]}>
            Registro de Atividades
          </Text>
        </View>
        <View style={[styles.badgeContador, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
          <Text style={[styles.textoContador, { color: theme.foreground }]}>
            {linhaDoTempo.length} eventos
          </Text>
        </View>
      </View>

      {linhaDoTempo.length === 0 ? (
        <View style={[styles.cardVazio, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.textoVazio, { color: theme.mutedForeground }]}>
            Nenhuma atividade registrada ainda. Adicione ou conclua prioridades para iniciar sua linha do tempo.
          </Text>
        </View>
      ) : (
        <View style={styles.listaTimeline}>
          {linhaDoTempo.map((ev, idx) => {
            const ultimo = idx === linhaDoTempo.length - 1;
            return (
              <View key={ev.id} style={styles.linhaEvento}>
                {/* Coluna Esquerda: Bolha Circular + Linha Conectora Vertical */}
                <View style={styles.colunaEixo}>
                  <View
                    style={[
                      styles.bolhaCircular,
                      {
                        backgroundColor: ev.destaque ? theme.primary : theme.background,
                        borderColor: ev.destaque ? theme.primary : theme.input,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.simboloBolha,
                        { color: ev.destaque ? theme.primaryForeground : theme.foreground },
                      ]}
                    >
                      {ev.simbolo}
                    </Text>
                  </View>
                  {!ultimo && (
                    <View style={[styles.linhaVertical, { backgroundColor: theme.border }]} />
                  )}
                </View>

                {/* Coluna Central: Bolha de Conteúdo */}
                <View
                  style={[
                    styles.cardBolhaEvento,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.topoBolha}>
                    <Text style={[styles.tituloEvento, { color: theme.foreground }]}>
                      {ev.titulo}
                    </Text>
                    <Text style={[styles.horarioEvento, { color: theme.mutedForeground }]}>
                      {formatarHorarioRelativo(ev.dataIso)}
                    </Text>
                  </View>
                  <Text style={[styles.detalheEvento, { color: theme.mutedForeground }]}>
                    {ev.detalhe}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtituloTopo: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tituloTopo: {
    fontFamily: typography.fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  badgeContador: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoContador: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
  },
  listaTimeline: {
    paddingTop: 4,
  },
  linhaEvento: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  colunaEixo: {
    width: 30,
    alignItems: 'center',
  },
  bolhaCircular: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  simboloBolha: {
    fontFamily: typography.fonts.mono,
    fontSize: 12,
    fontWeight: '800',
  },
  linhaVertical: {
    flex: 1,
    width: 1,
    marginVertical: 2,
  },
  cardBolhaEvento: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  topoBolha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tituloEvento: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  horarioEvento: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '600',
  },
  detalheEvento: {
    fontFamily: typography.fonts.sans,
    fontSize: 12,
  },
  cardVazio: {
    padding: 28,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  textoVazio: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
