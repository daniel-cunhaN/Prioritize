/**
 * SearchBar.tsx — Barra de Busca Minimalista em Formato Pílula
 */

import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme, typography, radius } from '../../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Pesquisar em Prioritize...',
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: focused ? theme.background : theme.secondary,
          borderColor: focused ? theme.primary : theme.border,
        },
        Platform.OS === 'web' &&
          ({ transition: 'border-color 160ms ease, background-color 160ms ease' } as any),
      ]}
    >
      <Feather
        name="search"
        size={18}
        color={focused ? theme.foreground : theme.mutedForeground}
      />
      <TextInput
        nativeID="home-search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        style={[
          styles.input,
          { color: theme.foreground },
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
        ]}
        accessibilityLabel="Pesquisar desejos"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityLabel="Limpar busca"
          style={[styles.iconBtn, { backgroundColor: theme.border }]}
        >
          <Feather name="x" size={13} color={theme.foreground} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: typography.fonts.sans,
    fontSize: 14,
    fontWeight: '500',
  },
  iconBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
