/**
 * EditarDesejoModal.tsx — Bottom Sheet Monocromático para Edição de Item
 */

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
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import client from '../../api/client';
import { useTheme, typography, radius, shadows } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { WishlistItem } from '../../types';
import { PRIORITY_CONFIG } from './ProductCard';
import PriceTag from './PriceTag';
import { formatarPrecoParaInput, converterInputParaNumero } from '../AdicionarDesejoModal';

interface Props {
  visivel: boolean;
  item: WishlistItem | null;
  aoFechar: () => void;
  aoSalvarSucesso: (itemAtualizado: WishlistItem) => void;
}

export default function EditarDesejoModal({ visivel, item, aoFechar, aoSalvarSucesso }: Props) {
  const theme = useTheme();
  const r = useResponsive();

  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [preco, setPreco] = useState<string>('');
  const [prioridade, setPrioridade] = useState<number>(2);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (item && visivel) {
      setTitulo(item.title || '');
      setUrl(item.url || '');
      setImagemUrl(item.image_url || null);
      setPreco(item.price ? formatarPrecoParaInput(item.price) : '');
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

      const valorNumerico = converterInputParaNumero(preco);

      const payload = {
        title: titulo.trim(),
        titulo: titulo.trim(),
        url: urlFormatada,
        image_url: imgFormatada,
        imagem_url: imgFormatada,
        priority: prioridade,
        prioridade: prioridade,
        price: valorNumerico,
        preco: valorNumerico,
      };

      const resposta = await client.put(`/wishlist/${item.id}`, payload);
      const itemAtualizado: WishlistItem = {
        ...item,
        ...resposta.data,
        title: titulo.trim(),
        url: urlFormatada,
        image_url: imgFormatada,
        priority: prioridade,
        price: valorNumerico,
      };

      aoSalvarSucesso(itemAtualizado);
      aoFechar();
    } catch (err: any) {
      console.error('Erro ao atualizar desejo:', err);
      const msg =
        err.response?.data?.mensagem ||
        err.response?.data?.detail?.message ||
        'Não foi possível salvar as alterações.';
      setErro(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro ao Salvar', msg);
      }
    } finally {
      setSalvando(false);
    }
  };

  if (!visivel || !item) return null;

  return (
    <Modal
      visible={visivel}
      animationType="slide"
      transparent
      onRequestClose={aoFechar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          { justifyContent: r.isDesktop ? 'center' : 'flex-end' },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={aoFechar} />

        <View
          style={[
            styles.modalContainer,
            r.isDesktop ? styles.sheetDesktop : styles.sheetMobile,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            shadows.lg,
          ]}
        >
          <View style={[styles.alcaArraste, { backgroundColor: theme.input }]} />

          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>EDITAR ITEM</Text>
              <Text numberOfLines={1} style={[styles.title, { color: theme.foreground }]}>
                Atualizar Prioridade
              </Text>
            </View>
            <TouchableOpacity
              onPress={aoFechar}
              style={[styles.closeBtn, { backgroundColor: theme.secondary }]}
              hitSlop={8}
            >
              <Feather name="x" size={16} color={theme.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {erro && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.secondary, borderColor: theme.primary },
                ]}
              >
                <Feather name="alert-circle" size={15} color={theme.foreground} />
                <Text style={[styles.errorText, { color: theme.foreground }]}>{erro}</Text>
              </View>
            )}

            {imagemUrl ? (
              <View
                style={[
                  styles.imagePreviewWrapper,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Image source={{ uri: imagemUrl }} style={styles.imagePreview} resizeMode="contain" />
              </View>
            ) : null}

            {/* Tags de Prioridade em Pílula */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.foreground }]}>IMPORTÂNCIA</Text>
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
                          backgroundColor: ativo ? theme.primary : theme.card,
                          borderColor: ativo ? theme.primary : theme.border,
                        },
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color: ativo ? theme.primaryForeground : theme.foreground,
                            fontWeight: ativo ? '800' : '600',
                          },
                        ]}
                      >
                        {conf.icon} {conf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.foreground }]}>TÍTULO DO PRODUTO</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TextInput
                  value={titulo}
                  onChangeText={setTitulo}
                  placeholder="Nome do produto"
                  placeholderTextColor={theme.mutedForeground}
                  style={[
                    styles.input,
                    { color: theme.foreground },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.foreground }]}>LINK DA LOJA</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Feather name="link-2" size={15} color={theme.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://exemplo.com/produto"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { color: theme.foreground },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.foreground }]}>LINK DA IMAGEM</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Feather name="image" size={15} color={theme.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  value={imagemUrl || ''}
                  onChangeText={setImagemUrl}
                  placeholder="https://exemplo.com/foto.jpg"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    { color: theme.foreground },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.label, { color: theme.foreground }]}>VALOR DO PRODUTO</Text>
                {converterInputParaNumero(preco) !== null && (
                  <PriceTag
                    value={converterInputParaNumero(preco)!}
                    color={theme.foreground}
                    size="sm"
                  />
                )}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={{ fontWeight: '700', color: theme.mutedForeground, marginRight: 8 }}>R$</Text>
                <TextInput
                  value={preco}
                  onChangeText={(texto) => setPreco(texto.replace(/[^\d,.]/g, ''))}
                  onBlur={() => {
                    const n = converterInputParaNumero(preco);
                    if (n !== null) setPreco(formatarPrecoParaInput(n));
                  }}
                  placeholder="0,00"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    { color: theme.foreground },
                    Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                  ]}
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={aoFechar}
                style={[
                  styles.cancelBtn,
                  { backgroundColor: theme.secondary, borderColor: theme.border },
                ]}
                disabled={salvando}
              >
                <Text style={[styles.cancelBtnText, { color: theme.foreground }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSalvar}
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: salvando ? 0.7 : 1 }]}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color={theme.primaryForeground} size="small" />
                ) : (
                  <Text style={[styles.saveBtnText, { color: theme.primaryForeground }]}>
                    Salvar Alterações
                  </Text>
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
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.45)',
  },
  modalContainer: {
    width: '100%',
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  sheetDesktop: {
    maxWidth: 520,
    borderRadius: radius.xl,
    margin: 16,
  },
  sheetMobile: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 0,
  },
  alcaArraste: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: typography.fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontFamily: typography.fonts.sans,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 112,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    padding: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily: typography.fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  priorityText: {
    fontFamily: typography.fonts.sans,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
});
