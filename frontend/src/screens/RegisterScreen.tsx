import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await client.post('/auth/register', { email, password });
      const { access_token } = response.data;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('access_token', access_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
      }
      
      if (Platform.OS === 'web') {
        window.alert('Conta criada com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Conta criada com sucesso!');
      }
      // Navigate to main app (Feed/Wishlist) - To be implemented
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail?.message || error.response?.data?.detail || 'Erro ao criar conta.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Erro', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar Conta</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title={loading ? "Cadastrando..." : "Cadastrar"} onPress={handleRegister} disabled={loading} />
      
      <View style={styles.loginContainer}>
        <Text>Já tem uma conta?</Text>
        <Button title="Faça Login" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  loginContainer: {
    marginTop: 20,
    alignItems: 'center',
  }
});
