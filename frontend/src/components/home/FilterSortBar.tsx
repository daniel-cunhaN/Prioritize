/**
 * FilterSortBar.tsx — Barra Monocromática de Filtros em Pílula, Ordenação e Modos de Visão
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';
import { TipoOrdenacao, ModoVisualizacao } from '../../types';
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
  modoVisualizacao: ModoVisualizacao;
  onAlterarModoVisualizacao: (modo: ModoVisualizacao) => void;
  modoSelecao?: boolean;
  onAlternarModoSelecao?: () => void;
  totalSelecionados?: number;
  isDesktop?: boolean;
  horizontalPadding?: number;
}

const OPCOES_MODO: { id: ModoVisualizacao; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'grid', label: 'Grade', icon: 'grid' },
  { id: 'list', label: 'Lista', icon: 'list' },
  { id: 'kanban', label: 'Kanban', icon: 'columns' },
];

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
  modoVisualizacao,
  onAlterarModoVisualizacao,
  modoSelecao = false,
  onAlternarModoSelecao,
  totalSelecionados = 0,
  isDesktop = false,
  horizontalPadding = 16,
}: Props) {
  const theme = useTheme();
  const opcaoOrdem = OPCOES_ORDENACAO.find((o) => o.id === ordemAtual);
  const ordemModificada = ordemAtual !== 'prioridade_desc';

  return (
    <View style={styles.container}>
      {/* Linha Superior: Ordenação + Limpar + Seletor Segmentado em Pílula */}
      <View style={styles.linhaControles}>
        <View style={styles.grupoEsquerda}>
          {onAlternarModoSelecao && (
            <TouchableOpacity
              onPress={onAlternarModoSelecao}
              activeOpacity={0.75}
              style={[
                styles.botaoOrdenar,
                {
                  backgroundColor: modoSelecao ? theme.primary : theme.background,
                  borderColor: modoSelecao ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                modoSelecao ? 'Sair do modo de seleção' : 'Selecionar múltiplos desejos'
              }
            >
              <Feather
                name={modoSelecao ? 'check-square' : 'square'}
                size={14}
                color={modoSelecao ? theme.primaryForeground : theme.foreground}
              />
              <Text
                style={[
                  styles.textoBotaoOrdenar,
                  {
                    color: modoSelecao ? theme.primaryForeground : theme.foreground,
                    fontWeight: '700',
                  },
                ]}
              >
                {modoSelecao
                  ? totalSelecionados > 0
                    ? `${totalSelecionados} sel.`
                    : 'Selecionando'
                  : 'Selecionar'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onAbrirModalOrdenacao}
            activeOpacity={0.75}
            style={[
              styles.botaoOrdenar,
              {
                backgroundColor: ordemModificada ? theme.primary : theme.background,
                borderColor: ordemModificada ? theme.primary : theme.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Ordenar por: ${opcaoOrdem?.label || 'Prioridade'}`}
          >
            <Feather
              name="sliders"
              size={14}
              color={ordemModificada ? theme.primaryForeground : theme.foreground}
            />
            <Text
              style={[
                styles.textoBotaoOrdenar,
                {
                  color: ordemModificada ? theme.primaryForeground : theme.foreground,
                  fontWeight: '700',
                },
              ]}
            >
              {opcaoOrdem?.label || 'Ordenar'}
            </Text>
            <Feather
              name="chevron-down"
              size={14}
              color={ordemModificada ? theme.primaryForeground : theme.mutedForeground}
            />
          </TouchableOpacity>

          {totalFiltrosAtivos > 0 && (
            <TouchableOpacity
              onPress={onLimparFiltros}
              activeOpacity={0.75}
              style={[
                styles.botaoLimpar,
                {
                  backgroundColor: theme.secondary,
                  borderColor: theme.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Limpar todos os filtros"
            >
              <Feather name="x" size={13} color={theme.foreground} />
              <Text style={[styles.textoBotaoLimpar, { color: theme.foreground }]}>
                Limpar ({totalFiltrosAtivos})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Seletor Segmentado em Pílula (Grade / Lista / Kanban) */}
        <View
          style={[
            styles.seletorModo,
            {
              backgroundColor: theme.secondary,
              borderColor: theme.border,
            },
          ]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Modo de visualização dos itens"
        >
          {OPCOES_MODO.map((opcao) => {
            const ativo = modoVisualizacao === opcao.id;
            return (
              <TouchableOpacity
                key={`modo-${opcao.id}`}
                onPress={() => onAlterarModoVisualizacao(opcao.id)}
                activeOpacity={0.8}
                style={[
                  styles.botaoModo,
                  ativo && { backgroundColor: theme.primary },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativo }}
                accessibilityLabel={`Visualização em ${opcao.label}`}
              >
                <Feather
                  name={opcao.icon}
                  size={14}
                  color={ativo ? theme.primaryForeground : theme.mutedForeground}
                />
                {isDesktop && (
                  <Text
                    style={[
                      styles.textoModo,
                      {
                        color: ativo ? theme.primaryForeground : theme.mutedForeground,
                        fontWeight: ativo ? '700' : '600',
                      },
                    ]}
                  >
                    {opcao.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Linha de Tags Pílula Horizontais */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -horizontalPadding, marginBottom: 8 }}
        contentContainerStyle={[
          styles.scrollChips,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        {opcoesPrioridade.map((opt) => {
          const ativo = prioridadeSelecionada === opt.value;
          return (
            <TouchableOpacity
              key={`prio-${String(opt.value)}`}
              onPress={() => onSelecionarPrioridade(opt.value)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: ativo ? theme.primary : theme.background,
                  borderColor: ativo ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por prioridade: ${opt.label}`}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: ativo ? theme.primaryForeground : theme.foreground,
                    fontWeight: ativo ? '700' : '600',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {lojasDisponiveis.length > 0 && (
          <View
            style={[
              styles.divisorVertical,
              { backgroundColor: theme.border },
            ]}
          />
        )}

        {lojasDisponiveis.map((loja) => {
          const ativa = lojaSelecionada === loja.dominio;
          return (
            <TouchableOpacity
              key={`loja-${loja.dominio}`}
              onPress={() => onSelecionarLoja(ativa ? 'ALL' : loja.dominio)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: ativa ? theme.primary : theme.secondary,
                  borderColor: ativa ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por loja: ${loja.dominio} (${loja.total})`}
            >
              <Feather
                name="globe"
                size={12}
                color={ativa ? theme.primaryForeground : theme.mutedForeground}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color: ativa ? theme.primaryForeground : theme.foreground,
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
    marginBottom: 10,
  },
  linhaControles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  grupoEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  seletorModo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  botaoModo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    gap: 5,
  },
  textoModo: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
  },
  botaoOrdenar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoBotaoOrdenar: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
  },
  botaoLimpar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  textoBotaoLimpar: {
    fontSize: 12,
    fontWeight: '700',
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
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
  },
  divisorVertical: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
});
