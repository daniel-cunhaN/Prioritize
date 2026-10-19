import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, useIsDark, typography, radius } from '../../theme';
import { TipoOrdenacao, OpcaoOrdenacao } from '../../types';

interface Props {
  visivel: boolean;
  ordemAtual: TipoOrdenacao;
  onSelecionar: (ordem: TipoOrdenacao) => void;
  onFechar: () => void;
}

/** Configuração detalhada das opções de ordenação disponíveis */
export const OPCOES_ORDENACAO: OpcaoOrdenacao[] = [
  {
    id: 'prioridade_desc',
    label: 'Maior Prioridade',
    icon: 'arrow-down',
    descricao: 'Itens com maior importância (Alta 🔥 → Baixa 🌱)',
  },
  {
    id: 'prioridade_asc',
    label: 'Menor Prioridade',
    icon: 'arrow-up',
    descricao: 'Itens com menor importância (Baixa 🌱 → Alta 🔥)',
  },
  {
    id: 'recentes',
    label: 'Mais Recentes',
    icon: 'clock',
    descricao: 'Desejos cadastrados recentemente no topo',
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

/**
 * ModalOrdenacao — Componente modal responsivo para seleção do critério de ordenação
 */
export default function ModalOrdenacao({
  visivel,
  ordemAtual,
  onSelecionar,
  onFechar,
}: Props) {
  const theme = useTheme();
  const isDark = useIsDark();

  const bgCard = isDark ? theme.card : '#FFFFFF';
  const textoPrincipal = isDark ? theme.foreground : '#0F1111';
  const borda = isDark ? theme.border : '#E5E1D8';

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={onFechar}
    >
      <Pressable style={styles.backdrop} onPress={onFechar}>
        <Pressable
          style={[
            styles.conteudoModal,
            {
              backgroundColor: bgCard,
              borderColor: borda,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho do Modal */}
          <View style={[styles.cabecalho, { borderBottomColor: borda }]}>
            <View style={styles.tituloLinha}>
              <Feather name="sliders" size={20} color={theme.primary} />
              <Text style={[styles.titulo, { color: textoPrincipal }]}>
                Ordenar desejos por
              </Text>
            </View>
            <TouchableOpacity
              onPress={onFechar}
              hitSlop={8}
              style={styles.botaoFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar ordenação"
            >
              <Feather name="x" size={20} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Lista de Opções de Ordenação */}
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
                  activeOpacity={0.7}
                  style={[
                    styles.itemOpcao,
                    {
                      backgroundColor: ativo
                        ? isDark
                          ? '#2C231A'
                          : '#FDF6EC'
                        : 'transparent',
                      borderColor: ativo ? theme.primary : 'transparent',
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                  accessibilityLabel={`${opcao.label}. ${opcao.descricao}`}
                >
                  <View style={styles.iconeContainer}>
                    <Feather
                      name={opcao.icon as any}
                      size={18}
                      color={ativo ? theme.primary : theme.mutedForeground}
                    />
                  </View>

                  <View style={styles.textosOpcao}>
                    <Text
                      style={[
                        styles.labelOpcao,
                        {
                          color: ativo ? theme.primary : textoPrincipal,
                          fontWeight: ativo ? '700' : '600',
                        },
                      ]}
                    >
                      {opcao.label}
                    </Text>
                    <Text
                      style={[
                        styles.descricaoOpcao,
                        { color: theme.mutedForeground },
                      ]}
                    >
                      {opcao.descricao}
                    </Text>
                  </View>

                  {ativo && (
                    <View style={styles.checkContainer}>
                      <Feather name="check" size={20} color={theme.primary} />
                    </View>
                  )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
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
    fontWeight: '700',
  },
  botaoFechar: {
    padding: 4,
  },
  listaOpcoes: {
    paddingTop: 8,
    gap: 6,
  },
  itemOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: 12,
  },
  iconeContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textosOpcao: {
    flex: 1,
  },
  labelOpcao: {
    fontSize: 15,
    fontFamily: typography.fonts.sans,
  },
  descricaoOpcao: {
    fontSize: 12,
    fontFamily: typography.fonts.sans,
    marginTop: 2,
  },
  checkContainer: {
    marginLeft: 8,
  },
});
