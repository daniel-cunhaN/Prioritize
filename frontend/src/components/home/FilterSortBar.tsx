import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useIsDark, typography, radius } from '../../theme';
import { TipoOrdenacao } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import { OPCOES_ORDENACAO } from './ModalOrdenacao';

interface OpcaoPrioridade {
  value: number | 'ALL';
  label: string;
  color: string;
  activeBg: string;
}

interface LojaContador {
  dominio: string;
  total: number;
}

interface Props {
  prioridadeSelecionada: number | 'ALL';
  onSelecionarPrioridade: (prioridade: number | 'ALL') => void;
  opcoesPrioridade: OpcaoPrioridade[];
  lojaSelecionada: string | 'ALL';
  onSelecionarLoja: (loja: string | 'ALL') => void;
  lojasDisponiveis: LojaContador[];
  ordemAtual: TipoOrdenacao;
  onAbrirModalOrdenacao: () => void;
  totalFiltrosAtivos: number;
  onLimparFiltros: () => void;
  horizontalPadding?: number;
}

/**
 * FilterSortBar — Barra de controle de filtros e ordenação
 *
 * Fornece acesso rápido a:
 * - Botão de ordenação com indicador do critério atual
 * - Chips de prioridade (Todos, Alta, Média, Baixa)
 * - Chips dinâmicos de lojas/domínios dos produtos salvos
 * - Botão de limpeza de filtros com contador
 */
export default function FilterSortBar({
  prioridadeSelecionada,
  onSelecionarPrioridade,
  opcoesPrioridade,
  lojaSelecionada,
  onSelecionarLoja,
  lojasDisponiveis,
  ordemAtual,
  onAbrirModalOrdenacao,
  totalFiltrosAtivos,
  onLimparFiltros,
  horizontalPadding = 16,
}: Props) {
  const theme = useTheme();
  const isDark = useIsDark();

  const textStrong = isDark ? theme.foreground : '#0F1111';
  const opcaoOrdem = OPCOES_ORDENACAO.find((o) => o.id === ordemAtual);
  const ordemModificada = ordemAtual !== 'prioridade_desc';

  return (
    <View style={styles.container}>
      {/* Linha Superior: Botão de Ordenação + Ação de Limpar Filtros */}
      <View style={styles.linhaControles}>
        <TouchableOpacity
          onPress={onAbrirModalOrdenacao}
          activeOpacity={0.75}
          style={[
            styles.botaoOrdenar,
            {
              backgroundColor: isDark ? theme.card : '#FFFFFF',
              borderColor: ordemModificada
                ? theme.primary
                : isDark
                ? theme.border
                : '#D8D4CC',
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar por: ${opcaoOrdem?.label || 'Prioridade'}`}
        >
          <Feather
            name="sliders"
            size={15}
            color={ordemModificada ? theme.primary : textStrong}
          />
          <Text
            style={[
              styles.textoBotaoOrdenar,
              {
                color: ordemModificada ? theme.primary : textStrong,
                fontWeight: ordemModificada ? '700' : '600',
              },
            ]}
          >
            {opcaoOrdem?.label || 'Ordenar'}
          </Text>
          <Feather
            name="chevron-down"
            size={14}
            color={theme.mutedForeground}
          />
        </TouchableOpacity>

        {totalFiltrosAtivos > 0 && (
          <TouchableOpacity
            onPress={onLimparFiltros}
            activeOpacity={0.7}
            style={[
              styles.botaoLimpar,
              {
                backgroundColor: isDark ? '#2D1B1B' : '#FDF0EE',
                borderColor: isDark ? '#6B2F2F' : '#F5B8B0',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Limpar todos os filtros"
          >
            <Feather name="x" size={13} color="#B84332" />
            <Text style={styles.textoBotaoLimpar}>
              Limpar ({totalFiltrosAtivos})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Linha de Chips com Scroll Horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -horizontalPadding, marginBottom: 8 }}
        contentContainerStyle={[
          styles.scrollChips,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        {/* Chips de Prioridade */}
        {opcoesPrioridade.map((opt) => {
          const ativo = prioridadeSelecionada === opt.value;
          return (
            <TouchableOpacity
              key={`prio-${String(opt.value)}`}
              onPress={() => onSelecionarPrioridade(opt.value)}
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  backgroundColor: ativo
                    ? opt.activeBg
                    : isDark
                    ? theme.card
                    : '#F5F3EF',
                  borderColor: ativo
                    ? opt.color
                    : isDark
                    ? theme.border
                    : '#E3DED6',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por prioridade: ${opt.label}`}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: ativo ? '#FFFFFF' : textStrong,
                    fontWeight: ativo ? '700' : '500',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Separador entre Prioridade e Lojas (se houver lojas) */}
        {lojasDisponiveis.length > 0 && (
          <View
            style={[
              styles.divisorVertical,
              { backgroundColor: isDark ? theme.border : '#E5E1D8' },
            ]}
          />
        )}

        {/* Chips Dinâmicos de Lojas / Domínios */}
        {lojasDisponiveis.map((loja) => {
          const ativa = lojaSelecionada === loja.dominio;
          return (
            <TouchableOpacity
              key={`loja-${loja.dominio}`}
              onPress={() =>
                onSelecionarLoja(ativa ? 'ALL' : loja.dominio)
              }
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  backgroundColor: ativa
                    ? theme.primary
                    : isDark
                    ? theme.card
                    : '#F5F3EF',
                  borderColor: ativa
                    ? theme.primary
                    : isDark
                    ? theme.border
                    : '#E3DED6',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por loja: ${loja.dominio} (${loja.total})`}
            >
              <Feather
                name="shopping-bag"
                size={12}
                color={ativa ? '#FFFFFF' : theme.mutedForeground}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: ativa ? '#FFFFFF' : textStrong,
                    fontWeight: ativa ? '700' : '500',
                  },
                ]}
              >
                {loja.dominio} ({loja.total})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 8,
  },
  linhaControles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  botaoOrdenar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textoBotaoOrdenar: {
    fontSize: 13,
    fontFamily: typography.fonts.sans,
  },
  botaoLimpar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textoBotaoLimpar: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B84332',
    fontFamily: typography.fonts.sans,
  },
  scrollChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: typography.fonts.sans,
  },
  divisorVertical: {
    width: 1,
    height: 22,
    marginHorizontal: 4,
  },
});
