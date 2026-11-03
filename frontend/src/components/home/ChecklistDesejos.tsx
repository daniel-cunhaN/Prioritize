/**
 * ChecklistDesejos.tsx — Tela de Checklist Focado (Focused Task/Wish Checklist)
 *
 * Permite marcar itens como concluídos/adquiridos com interações limpas de checkbox,
 * barra de progresso de alto contraste e filtros rápidos em formato pílula.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius, shadows } from '../../theme';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import PriceTag from './PriceTag';

interface Props {
  itens: WishlistItem[];
  idsConcluidos: string[];
  aoAlternarConclusao: (item: WishlistItem) => void;
  aoAbrirModalCriar: () => void;
}

type FiltroStatusChecklist = 'todos' | 'pendentes' | 'concluidos';

export default function ChecklistDesejos({
  itens,
  idsConcluidos,
  aoAlternarConclusao,
  aoAbrirModalCriar,
}: Props) {
  const theme = useTheme();
  const [filtro, setFiltro] = useState<FiltroStatusChecklist>('todos');

  // Calcula progresso de conclusão da lista
  const resumo = useMemo(() => {
    const total = itens.length;
    const concluidos = itens.filter((i) => idsConcluidos.includes(i.id)).length;
    const pendentes = total - concluidos;
    const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    return { total, concluidos, pendentes, percentual };
  }, [itens, idsConcluidos]);

  // Filtra e ordena itens colocando prioridades altas primeiro
  const itensExibidos = useMemo(() => {
    return itens
      .filter((item) => {
        const marcado = idsConcluidos.includes(item.id);
        if (filtro === 'pendentes') return !marcado;
        if (filtro === 'concluidos') return marcado;
        return true;
      })
      .sort((a, b) => Number(b.priority) - Number(a.priority));
  }, [itens, idsConcluidos, filtro]);

  const abrirUrlExterna = (url: string) => {
    if (!url) return;
    const destino = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    Linking.openURL(destino).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Cabeçalho e Progresso Monocromático */}
      <View
        style={[
          styles.cardProgresso,
          { backgroundColor: theme.primary, borderColor: theme.primary },
          shadows.md,
        ]}
      >
        <View style={styles.topoProgresso}>
          <View>
            <Text style={[styles.rotuloProgresso, { color: '#A1A1AA' }]}>
              CHECKLIST FOCADO
            </Text>
            <Text style={[styles.tituloProgresso, { color: theme.primaryForeground }]}>
              {resumo.concluidos} de {resumo.total} concluídos
            </Text>
          </View>
          <Text style={[styles.percentualGrande, { color: theme.primaryForeground }]}>
            {resumo.percentual}%
          </Text>
        </View>

        <View style={styles.trilhaProgresso}>
          <View
            style={[
              styles.preenchimentoProgresso,
              {
                width: `${resumo.percentual}%`,
                backgroundColor: theme.primaryForeground,
              },
            ]}
          />
        </View>
      </View>

      {/* Filtros em formato Pílula */}
      <View style={styles.linhaFiltros}>
        {(
          [
            { id: 'todos', label: `Todos (${resumo.total})` },
            { id: 'pendentes', label: `Pendentes (${resumo.pendentes})` },
            { id: 'concluidos', label: `Concluídos (${resumo.concluidos})` },
          ] as { id: FiltroStatusChecklist; label: string }[]
        ).map((op) => {
          const ativo = filtro === op.id;
          return (
            <TouchableOpacity
              key={op.id}
              onPress={() => setFiltro(op.id)}
              activeOpacity={0.8}
              style={[
                styles.pilulaFiltro,
                {
                  backgroundColor: ativo ? theme.primary : theme.secondary,
                  borderColor: ativo ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.textoPilulaFiltro,
                  { color: ativo ? theme.primaryForeground : theme.foreground },
                ]}
              >
                {op.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista de Checkboxes Minimalistas */}
      {itensExibidos.length === 0 ? (
        <View style={[styles.vazioCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="check-circle" size={32} color={theme.mutedForeground} />
          <Text style={[styles.vazioTitulo, { color: theme.foreground }]}>
            Nenhum item neste filtro
          </Text>
          <TouchableOpacity
            onPress={aoAbrirModalCriar}
            style={[styles.botaoVazio, { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.textoBotaoVazio, { color: theme.primaryForeground }]}>
              + Adicionar Item
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.lista}>
          {itensExibidos.map((item) => {
            const concluido = idsConcluidos.includes(item.id);
            const conf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[2];
            const precoNumerico =
              item.price !== null && item.price !== undefined && Number(item.price) > 0
                ? Number(item.price)
                : null;

            return (
              <Pressable
                key={item.id}
                onPress={() => aoAlternarConclusao(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: concluido }}
                style={({ pressed }) => [
                  styles.linhaChecklist,
                  {
                    backgroundColor: concluido ? theme.card : theme.background,
                    borderColor: concluido ? theme.border : theme.input,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Checkbox Quadrado Arredondado de Alto Contraste */}
                <View
                  style={[
                    styles.caixaCheck,
                    {
                      backgroundColor: concluido ? theme.primary : theme.background,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  {concluido && (
                    <Feather name="check" size={14} color={theme.primaryForeground} />
                  )}
                </View>

                {/* Título e Metadados */}
                <View style={styles.colunaTexto}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.tituloItem,
                      {
                        color: concluido ? theme.mutedForeground : theme.foreground,
                        textDecorationLine: concluido ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {item.title || 'Item sem título'}
                  </Text>
                  <View style={styles.metaLinha}>
                    <View
                      style={[
                        styles.tagPrioridadeMini,
                        {
                          backgroundColor:
                            item.priority === 3 ? theme.primary : theme.secondary,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.textoTagMini,
                          {
                            color:
                              item.priority === 3
                                ? theme.primaryForeground
                                : theme.foreground,
                          },
                        ]}
                      >
                        {conf.icon} {conf.label}
                      </Text>
                    </View>
                    {precoNumerico !== null && (
                      <PriceTag value={precoNumerico} size="sm" color={theme.foreground} />
                    )}
                  </View>
                </View>

                {/* Atalho para abrir o link original */}
                <TouchableOpacity
                  onPress={() => abrirUrlExterna(item.url)}
                  hitSlop={8}
                  style={[styles.botaoLink, { backgroundColor: theme.secondary }]}
                  accessibilityLabel="Abrir link externo"
                >
                  <Feather name="arrow-up-right" size={16} color={theme.foreground} />
                </TouchableOpacity>
              </Pressable>
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
    gap: 14,
  },
  cardProgresso: {
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 14,
  },
  topoProgresso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotuloProgresso: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tituloProgresso: {
    fontFamily: typography.fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  percentualGrande: {
    fontFamily: typography.fonts.sans,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  trilhaProgresso: {
    height: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  preenchimentoProgresso: {
    height: '100%',
    borderRadius: radius.full,
  },
  linhaFiltros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pilulaFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoPilulaFiltro: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  lista: {
    gap: 8,
  },
  linhaChecklist: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  caixaCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colunaTexto: {
    flex: 1,
    gap: 6,
  },
  tituloItem: {
    fontFamily: typography.fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  metaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tagPrioridadeMini: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoTagMini: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: '700',
  },
  botaoLink: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazioCard: {
    padding: 36,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  vazioTitulo: {
    fontFamily: typography.fonts.sans,
    fontSize: 16,
    fontWeight: '700',
  },
  botaoVazio: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 4,
  },
  textoBotaoVazio: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
});
