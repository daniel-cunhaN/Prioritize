import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../../api/client';
import { useTheme, useIsDark, typography } from '../../theme';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';

interface Props {
  visivel: boolean;
  item: WishlistItem | null;
  aoFechar: () => void;
  aoSalvarSucesso: (itemAtualizado: WishlistItem) => void;
}

export default function EditarDesejoModal({ visivel, item, aoFechar, aoSalvarSucesso }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();

  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [prioridade, setPrioridade] = useState<number>(2);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (item && visivel) {
      setTitulo(item.title || '');
      setUrl(item.url || '');
      setImagemUrl(item.image_url || null);
      setPrioridade(Number(item.priority) || 2);
      setErro(null);
    }
  }, [item, visivel]);

  const handleSalvar = async () => {
    if (!item) return;

    if (!titulo.trim()) {
      setErro('O título do produto é obrigatório.');
      return;
    }

    if (!url.trim()) {
      setErro('A URL da loja é obrigatória.');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      let urlFormatada = url.trim();
      if (!/^https?:\/\//i.test(urlFormatada)) {
        urlFormatada = `https://${urlFormatada}`;
      }

      let imgFormatada = imagemUrl?.trim() || null;
      if (imgFormatada && !/^https?:\/\//i.test(imgFormatada)) {
        imgFormatada = `https://${imgFormatada}`;
      }

      const payload = {
        title: titulo.trim(),
        titulo: titulo.trim(),
        url: urlFormatada,
        image_url: imgFormatada,
        imagem_url: imgFormatada,
        priority: prioridade,
        prioridade: prioridade,
      };

      const resposta = await client.put(`/wishlist/${item.id}`, payload);
      const itemAtualizado: WishlistItem = {
        ...item,
        ...resposta.data,
        title: titulo.trim(),
        url: urlFormatada,
        image_url: imgFormatada,
        priority: prioridade,
      };

      aoSalvarSucesso(itemAtualizado);
      aoFechar();
    } catch (err: any) {
      console.error('Erro ao atualizar desejo:', err);
      const msg = err.response?.data?.mensagem || err.response?.data?.detail?.message || 'Não foi possível salvar as alterações.';
      setErro(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro ao Salvar', msg);
      }
    } finally {
      setSalvando(false);
    }
  };

  if (!visivel || !item) return null;

  const bgModal = isDark ? theme.background : '#FFFFFF';
  const inputBg = isDark ? theme.card : '#F8F7F5';
  const textColor = isDark ? theme.foreground : '#0F1111';

  return (
    <Modal
      visible={visivel}
      animationType="fade"
      transparent
      onRequestClose={aoFechar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={aoFechar}
        />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: bgModal,
              borderColor: isDark ? theme.border : '#E5E0D8',
            },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>EDITAR ITEM</Text>
              <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
                Atualizar Desejo
              </Text>
            </View>
            <TouchableOpacity
              onPress={aoFechar}
              style={[styles.closeBtn, { backgroundColor: isDark ? theme.card : '#EFECE6' }]}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mensagem de Erro */}
            {erro && (
              <View style={[styles.errorBox, { backgroundColor: '#FDF2F0', borderColor: '#F5B8B0' }]}>
                <Feather name="alert-circle" size={15} color="#B84332" />
                <Text style={styles.errorText}>{erro}</Text>
              </View>
            )}

            {/* Preview da Imagem */}
            {imagemUrl ? (
              <View style={[styles.imagePreviewWrapper, { backgroundColor: inputBg }]}>
                <Image source={{ uri: imagemUrl }} style={styles.imagePreview} resizeMode="contain" />
              </View>
            ) : null}

            {/* Campo: Título */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textColor }]}>Título do Produto *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isDark ? theme.border : '#DDD7CD' }]}>
                <TextInput
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Nome do produto"
                  placeholderTextColor={theme.mutedForeground}
                  style={[styles.input, { color: textColor }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                />
              </View>
            </View>

            {/* Campo: URL */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textColor }]}>Link da Loja *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isDark ? theme.border : '#DDD7CD' }]}>
                <Feather name="link-2" size={16} color={theme.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://exemplo.com/produto"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[styles.input, { color: textColor }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                />
              </View>
            </View>

            {/* Campo: Imagem URL */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textColor }]}>Link da Imagem</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isDark ? theme.border : '#DDD7CD' }]}>
                <Feather name="image" size={16} color={theme.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  value={imagemUrl || ''}
                  onChangeText={setImagemUrl}
                  placeholder="https://exemplo.com/foto.jpg"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[styles.input, { color: textColor }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
                />
              </View>
            </View>

            {/* Seletor de Prioridade Oficial (3: Alta, 2: Média, 1: Baixa) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: textColor }]}>Classificação de Importância</Text>
              <View style={styles.priorityRow}>
                {[3, 2, 1].map((lvl) => {
                  const conf = PRIORITY_CONFIG[lvl];
                  const ativo = prioridade === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() => setPrioridade(lvl)}
                      style={[
                        styles.priorityCard,
                        {
                          backgroundColor: ativo ? (isDark ? `${conf.color}35` : conf.bg) : inputBg,
                          borderColor: ativo ? conf.color : isDark ? theme.border : '#DDD7CD',
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.priorityIcon}>{conf.icon}</Text>
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color: ativo ? conf.color : textColor,
                            fontWeight: ativo ? '700' : '500',
                          },
                        ]}
                      >
                        {conf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Ações */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={aoFechar}
                style={[styles.cancelBtn, { borderColor: isDark ? theme.border : '#DDD7CD' }]}
                disabled={salvando}
              >
                <Text style={[styles.cancelBtnText, { color: textColor }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSalvar}
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: salvando ? 0.7 : 1 }]}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color={theme.primaryForeground} size="small" />
                ) : (
                  <>
                    <Feather name="check" size={16} color={theme.primaryForeground} style={{ marginRight: 6 }} />
                    <Text style={[styles.saveBtnText, { color: theme.primaryForeground }]}>Salvar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: typography.fonts.sans,
    fontSize: 11,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    color: '#B84332',
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    flex: 1,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    height: '100%',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityIcon: {
    fontSize: 14,
  },
  priorityText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fonts.sans,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
  },
  saveBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: typography.fonts.sans,
    fontSize: 15,
    fontWeight: typography.weights.bold,
  },
});
