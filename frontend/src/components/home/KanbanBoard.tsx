import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useIsDark, typography, radius } from '../../theme';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import ProductListItem from './ProductListItem';

interface Props {
  items: WishlistItem[];
  onEdit?: (item: WishlistItem) => void;
  onDelete?: (id: string, title?: string | null) => void;
  isDesktop: boolean;
}

const COLUNAS_KANBAN: { prioridade: number; label: string; icon: string }[] = [
  { prioridade: 3, label: 'Alta Prioridade', icon: '🔥' },
  { prioridade: 2, label: 'Média Prioridade', icon: '⭐' },
  { prioridade: 1, label: 'Baixa Prioridade', icon: '🌱' },
];

/**
 * KanbanBoard — Visualização em colunas por escala de importância (Alta, Média, Baixa)
 *
 * No Desktop: Exibe 3 colunas lado a lado simultaneamente.
 * No Mobile: Fornece abas táteis rápidas e alternância fluida entre as colunas.
 */
export default function KanbanBoard({
  items,
  onEdit,
  onDelete,
  isDesktop,
}: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const [colunaAtivaMobile, setColunaAtivaMobile] = useState<number>(3);

  const textStrong = isDark ? theme.foreground : '#0F1111';
  const cardBg = isDark ? theme.card : '#FFFFFF';
  const borda = isDark ? theme.border : '#E2DFD8';

  // Agrupa os itens por prioridade mantendo a ordenação já calculada
  const itensPorColuna = useMemo(() => {
    return {
      3: items.filter((i) => i.priority === 3),
      2: items.filter((i) => i.priority === 2),
      1: items.filter((i) => i.priority === 1),
    };
  }, [items]);

  // Renderiza o conteúdo individual de uma coluna Kanban
  const renderColuna = (coluna: typeof COLUNAS_KANBAN[0]) => {
    const lista = itensPorColuna[coluna.prioridade as 1 | 2 | 3] || [];
    const conf = PRIORITY_CONFIG[coluna.prioridade];

    return (
      <View
        key={`col-${coluna.prioridade}`}
        style={[
          styles.coluna,
          {
            backgroundColor: isDark ? '#1C1611' : '#F9F8F5',
            borderColor: borda,
          },
        ]}
      >
        {/* Cabeçalho da Coluna com Faixa Colorida de Prioridade */}
        <View
          style={[
            styles.cabecalhoColuna,
            {
              borderTopColor: conf?.color || theme.primary,
              backgroundColor: cardBg,
              borderColor: borda,
            },
          ]}
        >
          <View style={styles.tituloColunaContainer}>
            <Text style={styles.iconeColuna}>{coluna.icon}</Text>
            <Text style={[styles.tituloColuna, { color: textStrong }]}>
              {coluna.label}
            </Text>
          </View>
          <View
            style={[
              styles.badgeContador,
              {
                backgroundColor: isDark
                  ? `${conf?.color}33`
                  : conf?.bg,
                borderColor: conf?.border,
              },
            ]}
          >
            <Text
              style={[
                styles.textoContador,
                { color: isDark ? theme.foreground : conf?.color },
              ]}
            >
              {lista.length}
            </Text>
          </View>
        </View>

        {/* Lista de Itens na Coluna */}
        <View style={styles.conteudoColuna}>
          {lista.length === 0 ? (
            <View style={styles.colunaVazia}>
              <Feather
                name="inbox"
                size={28}
                color={theme.mutedForeground}
                style={{ opacity: 0.6, marginBottom: 8 }}
              />
              <Text
                style={[
                  styles.textoColunaVazia,
                  { color: theme.mutedForeground },
                ]}
              >
                Nenhum item com {coluna.label.toLowerCase()}
              </Text>
            </View>
          ) : (
            lista.map((item) => (
              <ProductListItem
                key={`kanban-${item.id}`}
                item={item}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onDelete={onDelete ? () => onDelete(item.id, item.title) : undefined}
              />
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Abas no Mobile para navegação rápida entre colunas */}
      {!isDesktop && (
        <View style={styles.abasMobile}>
          {COLUNAS_KANBAN.map((coluna) => {
            const ativo = colunaAtivaMobile === coluna.prioridade;
            const conf = PRIORITY_CONFIG[coluna.prioridade];
            const total = (itensPorColuna[coluna.prioridade as 1 | 2 | 3] || []).length;

            return (
              <TouchableOpacity
                key={`tab-${coluna.prioridade}`}
                onPress={() => setColunaAtivaMobile(coluna.prioridade)}
                activeOpacity={0.75}
                style={[
                  styles.abaMobile,
                  {
                    backgroundColor: ativo
                      ? isDark
                        ? '#2B231A'
                        : '#FFFFFF'
                      : 'transparent',
                    borderColor: ativo
                      ? conf?.color || theme.primary
                      : 'transparent',
                  },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={`${coluna.label}: ${total} itens`}
              >
                <Text style={styles.abaIcone}>{coluna.icon}</Text>
                <Text
                  style={[
                    styles.abaLabel,
                    {
                      color: ativo ? textStrong : theme.mutedForeground,
                      fontWeight: ativo ? '700' : '500',
                    },
                  ]}
                >
                  {coluna.label.split(' ')[0]} ({total})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Exibição Desktop (3 colunas lado a lado) ou Mobile (coluna ativa selecionada) */}
      {isDesktop ? (
        <View style={styles.gradeColunasDesktop}>
          {COLUNAS_KANBAN.map((coluna) => renderColuna(coluna))}
        </View>
      ) : (
        <View style={styles.containerColunaMobile}>
          {renderColuna(
            COLUNAS_KANBAN.find((c) => c.prioridade === colunaAtivaMobile) ||
              COLUNAS_KANBAN[0]
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 10,
  },
  abasMobile: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 4,
  },
  abaMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 6,
  },
  abaIcone: {
    fontSize: 14,
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
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  cabecalhoColuna: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 4,
    borderBottomWidth: 1,
  },
  tituloColunaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconeColuna: {
    fontSize: 16,
  },
  tituloColuna: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  badgeContador: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  textoContador: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fonts.sans,
  },
  conteudoColuna: {
    padding: 10,
    gap: 6,
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
