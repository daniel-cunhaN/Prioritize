import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useIsDark, useTheme, typography } from '../../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

/** Barra de busca arredondada com ícone de lupa à esquerda e botão de limpar */
export default function SearchBar({ value, onChangeText, placeholder = 'Pesquisar em Prioritize' }: Props) {
  const theme = useTheme();
  const isDark = useIsDark();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: isDark ? ((theme as any).surface || theme.card) : '#FFFFFF',
          borderColor: focused ? theme.primary : isDark ? theme.border : '#8D9096',
          shadowColor: focused ? theme.primary : '#000',
          shadowOpacity: focused ? 0.25 : 0.06,
        },
        Platform.OS === 'web' && ({ transition: 'border-color 160ms ease, box-shadow 160ms ease' } as any),
      ]}
    >
      <Feather name="search" size={22} color={isDark ? theme.foreground : '#0F1111'} />
      <TextInput
        nativeID="home-search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? theme.mutedForeground : '#5F6368'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        style={[
          styles.input,
          { color: isDark ? theme.foreground : '#0F1111' },
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        ]}
        accessibilityLabel="Pesquisar desejos"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Limpar busca" style={styles.iconBtn}>
          <Feather name="x" size={18} color={theme.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 26,
    borderWidth: 1.2,
    paddingHorizontal: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  input: { flex: 1, height: '100%', fontFamily: typography.fonts.sans, fontSize: 16 },
  iconBtn: { padding: 2 },
});
