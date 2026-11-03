/**
 * ModalOrdenacao.tsx — Modal Monocromático para Seleção de Critério de Ordenação
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius, shadows } from '../../theme';
import { TipoOrdenacao, OpcaoOrdenacao } from '../../types';

interface Props {
  visivel: boolean;
  ordemAtual: TipoOrdenacao;
  onSelecionar: (ordem: TipoOrdenacao) => void;
  onFechar: () => void;
}

export const OPCOES_ORDENACAO: OpcaoOrdenacao[] = [
  {
    id: 'prioridade_desc',
    label: 'Maior Prioridade',
    icon: 'arrow-down',
    descricao: 'Itens mais importantes primeiro (Alta ● → Baixa ○)',
  },
  {
    id: 'prioridade_asc',
    label: 'Menor Prioridade',
    icon: 'arrow-up',
    descricao: 'Itens de menor urgência primeiro (Baixa ○ → Alta ●)',
  },
  {
    id: 'recentes',
    label: 'Mais Recentes',
    icon: 'clock',
    descricao: 'Desejos adicionados recentemente no topo',
  },
  {
    id: 'antigos',
    label: 'Mais Antigos',
    icon: 'calendar',
    descricao: 'Primeiros desejos adicionados no topo',
  },
  {
    id: 'alfabetica_az',
    label: 'Alfabética (A - Z)',
    icon: 'type',
    descricao: 'Ordenação alfabética pelo título do produto',
  },
  {
    id: 'alfabetica_za',
    label: 'Alfabética (Z - A)',
    icon: 'type',
    descricao: 'Ordenação alfabética inversa pelo título',
  },
];

export default function ModalOrdenacao({
  visivel,
  ordemAtual,
  onSelecionar,
  onFechar,
}: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.backdrop} onPress={onFechar}>
        <Pressable
          style={[
            styles.conteudoModal,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            shadows.lg,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.cabecalho, { borderBottomColor: theme.border }]}>
            <View style={styles.tituloLinha}>
              <Feather name="sliders" size={18} color={theme.foreground} />
              <Text style={[styles.titulo, { color: theme.foreground }]}>
                Ordenar prioridades
              </Text>
            </View>
            <TouchableOpacity
              onPress={onFechar}
              hitSlop={8}
              style={[styles.botaoFechar, { backgroundColor: theme.secondary }]}
              accessibilityRole="button"
              accessibilityLabel="Fechar ordenação"
            >
              <Feather name="x" size={16} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.listaOpcoes}>
            {OPCOES_ORDENACAO.map((opcao) => {
              const ativo = ordemAtual === opcao.id;
              return (
                <TouchableOpacity
                  key={opcao.id}
                  onPress={() => {
                    onSelecionar(opcao.id);
                    onFechar();
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.itemOpcao,
                    {
                      backgroundColor: ativo ? theme.primary : theme.card,
                      borderColor: ativo ? theme.primary : theme.border,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={`${opcao.label}. ${opcao.descricao}`}
                >
                  <Feather
                    name={opcao.icon as any}
                    size={17}
                    color={ativo ? theme.primaryForeground : theme.mutedForeground}
                  />

                  <View style={styles.textosOpcao}>
                    <Text
                      style={[
                        styles.labelOpcao,
                        {
                          color: ativo ? theme.primaryForeground : theme.foreground,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {opcao.label}
                    </Text>
                    <Text
                      style={[
                        styles.descricaoOpcao,
                        {
                          color: ativo ? theme.primaryForeground : theme.mutedForeground,
                          opacity: ativo ? 0.78 : 1,
                        },
                      ]}
                    >
                      {opcao.descricao}
                    </Text>
                  </View>

                  {ativo && <Feather name="check" size={18} color={theme.primaryForeground} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  conteudoModal: {
    width: '100%',
    maxWidth: 460,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 20,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titulo: {
    fontSize: 18,
    fontFamily: typography.fonts.sans,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  botaoFechar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listaOpcoes: {
    paddingTop: 12,
    gap: 7,
  },
  itemOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  textosOpcao: {
    flex: 1,
  },
  labelOpcao: {
    fontSize: 14,
    fontFamily: typography.fonts.sans,
  },
  descricaoOpcao: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    marginTop: 2,
  },
});
