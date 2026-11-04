/**
 * KanbanBoard.tsx — Matriz / Quadro Kanban Monocromático por Importância
 *
 * No Desktop: Exibe as 3 colunas simultaneamente lado a lado com alto contraste.
 * No Mobile: Seletor segmentado em formato pílula para alternância fluida.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';
import { WishlistItem } from '../../types';
import ProductListItem from './ProductListItem';

interface Props {
  items: WishlistItem[];
  idsConcluidos?: string[];
  onToggleCheck?: (item: WishlistItem) => void;
  onEdit?: (item: WishlistItem) => void;
  onDelete?: (id: string, title?: string | null) => void;
  isDesktop: boolean;
  modoSelecao?: boolean;
  idsSelecionados?: string[];
  onToggleSelecionar?: (id: string) => void;
}

const COLUNAS_KANBAN: { prioridade: number; label: string; subtitulo: string; icon: string; destaque: boolean }[] = [
  { prioridade: 3, label: 'Alta Prioridade', subtitulo: 'Prioritário · Imediato', icon: '●', destaque: true },
  { prioridade: 2, label: 'Média Prioridade', subtitulo: 'Desejável · Planejado', icon: '◐', destaque: false },
  { prioridade: 1, label: 'Baixa Prioridade', subtitulo: 'Pode esperar · Futuro', icon: '○', destaque: false },
];

export default function KanbanBoard({
  items,
  idsConcluidos = [],
  onToggleCheck,
  onEdit,
  onDelete,
  isDesktop,
  modoSelecao = false,
  idsSelecionados = [],
  onToggleSelecionar,
}: Props) {
  const theme = useTheme();
  const [colunaAtivaMobile, setColunaAtivaMobile] = useState<number>(3);

  // Agrupa os itens nas 3 colunas preservando a ordenação recebida
  const itensPorColuna = useMemo(() => {
    return {
      3: items.filter((i) => i.priority === 3),
      2: items.filter((i) => i.priority === 2),
      1: items.filter((i) => i.priority === 1),
    };
  }, [items]);

  // Renderiza uma coluna individual da matriz Kanban
  const renderColuna = (coluna: typeof COLUNAS_KANBAN[0]) => {
    const lista = itensPorColuna[coluna.prioridade as 1 | 2 | 3] || [];

    return (
      <View
        key={`col-${coluna.prioridade}`}
        style={[
          styles.coluna,
          {
            backgroundColor: theme.card,
            borderColor: coluna.destaque ? theme.primary : theme.border,
            borderWidth: coluna.destaque ? 1.5 : 1,
          },
        ]}
      >
        {/* Cabeçalho Monocromático da Coluna */}
        <View
          style={[
            styles.cabecalhoColuna,
            {
              backgroundColor: theme.background,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.tituloColunaWrapper}>
            <View style={styles.tituloColunaContainer}>
              <Text style={[styles.iconeColuna, { color: theme.foreground }]}>{coluna.icon}</Text>
              <Text style={[styles.tituloColuna, { color: theme.foreground }]}>
                {coluna.label}
              </Text>
            </View>
            <Text style={[styles.subtituloColuna, { color: theme.mutedForeground }]}>
              {coluna.subtitulo}
            </Text>
          </View>

          <View
            style={[
              styles.badgeContador,
              {
                backgroundColor: coluna.destaque ? theme.primary : theme.secondary,
                borderColor: coluna.destaque ? theme.primary : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.textoContador,
                {
                  color: coluna.destaque ? theme.primaryForeground : theme.foreground,
                },
              ]}
            >
              {String(lista.length).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Lista de Itens */}
        <View style={styles.conteudoColuna}>
          {lista.length === 0 ? (
            <View style={styles.colunaVazia}>
              <Feather
                name="inbox"
                size={24}
                color={theme.mutedForeground}
                style={{ opacity: 0.6, marginBottom: 8 }}
              />
              <Text style={[styles.textoColunaVazia, { color: theme.mutedForeground }]}>
                Nenhum item em {coluna.label.toLowerCase()}
              </Text>
            </View>
          ) : (
            lista.map((item) => (
              <ProductListItem
                key={`kanban-${item.id}`}
                item={item}
                concluido={idsConcluidos.includes(item.id)}
                onToggleCheck={onToggleCheck ? () => onToggleCheck(item) : undefined}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onDelete={onDelete ? () => onDelete(item.id, item.title) : undefined}
                modoSelecao={modoSelecao}
                selecionado={idsSelecionados.includes(item.id)}
                onToggleSelecionar={
                  onToggleSelecionar ? () => onToggleSelecionar(item.id) : undefined
                }
              />
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Abas em pílula no Mobile */}
      {!isDesktop && (
        <View
          style={[
            styles.abasMobile,
            { backgroundColor: theme.secondary, borderColor: theme.border },
          ]}
        >
          {COLUNAS_KANBAN.map((coluna) => {
            const ativo = colunaAtivaMobile === coluna.prioridade;
            const total = (itensPorColuna[coluna.prioridade as 1 | 2 | 3] || []).length;

            return (
              <TouchableOpacity
                key={`tab-${coluna.prioridade}`}
                onPress={() => setColunaAtivaMobile(coluna.prioridade)}
                activeOpacity={0.8}
                style={[
                  styles.abaMobile,
                  {
                    backgroundColor: ativo ? theme.primary : 'transparent',
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={`${coluna.label}: ${total} itens`}
              >
                <Text
                  style={[
                    styles.abaLabel,
                    {
                      color: ativo ? theme.primaryForeground : theme.mutedForeground,
                      fontWeight: ativo ? '700' : '600',
                    },
                  ]}
                >
                  {coluna.icon} {coluna.label.split(' ')[0]} ({total})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {isDesktop ? (
        <View style={styles.gradeColunasDesktop}>
          {COLUNAS_KANBAN.map((coluna) => renderColuna(coluna))}
        </View>
      ) : (
        <View style={styles.containerColunaMobile}>
          {renderColuna(
            COLUNAS_KANBAN.find((c) => c.prioridade === colunaAtivaMobile) || COLUNAS_KANBAN[0]
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
  },
  abasMobile: {
    flexDirection: 'row',
    borderRadius: radius.full,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  abaMobile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  abaLabel: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
  },
  gradeColunasDesktop: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  containerColunaMobile: {
    width: '100%',
  },
  coluna: {
    flex: 1,
    minWidth: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  cabecalhoColuna: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tituloColunaWrapper: {
    gap: 2,
  },
  tituloColunaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconeColuna: {
    fontSize: 12,
    fontWeight: '800',
  },
  tituloColuna: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.fonts.sans,
    letterSpacing: -0.3,
  },
  subtituloColuna: {
    fontSize: 11,
    fontFamily: typography.fonts.mono,
  },
  badgeContador: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoContador: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fonts.mono,
  },
  conteudoColuna: {
    padding: 10,
  },
  colunaVazia: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  textoColunaVazia: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: typography.fonts.sans,
  },
});
