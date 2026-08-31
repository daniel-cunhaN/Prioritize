import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import client from '../api/client';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await client.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('access_token', access_token);
      } else {
        await SecureStore.setItemAsync('access_token', access_token);
      }

      if (Platform.OS === 'web') {
        window.alert('Login realizado com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Login realizado com sucesso!');
      }
      // Navigate to main app (Feed/Wishlist) - To be implemented
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.detail?.message || error.response?.data?.detail || 'Erro ao realizar login.';
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
      <Text style={styles.title}>Login</Text>
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
      <Button title={loading ? "Entrando..." : "Entrar"} onPress={handleLogin} disabled={loading} />
      
      <View style={styles.registerContainer}>
        <Text>Não tem uma conta?</Text>
        <Button title="Cadastre-se" onPress={() => navigation.navigate('Register')} />
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
  registerContainer: {
    marginTop: 20,
    alignItems: 'center',
  }
});
