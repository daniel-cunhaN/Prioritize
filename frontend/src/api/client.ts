/**
 * client.ts — Cliente HTTP Axios com interceptor de token JWT
 *
 * Prioriza token da memória (via módulo validacao.ts) antes de
 * recorrer ao armazenamento persistente (SecureStore ou sessionStorage).
 * Evita localStorage para tokens sensíveis.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { obterToken } from '../utils/validacao';

/* Resolve a URL base de acordo com a plataforma */
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1'; // Localhost para web e iOS
};

const client = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor de requisição — injeta o token Bearer no header Authorization.
 * Ordem de prioridade: memória > SecureStore (nativo) > sessionStorage (web).
 */
client.interceptors.request.use(async (config) => {
  /* 1. Tenta recuperar token da memória (mais seguro) */
  let token = obterToken();

  /* 2. Fallback para armazenamento persistente da plataforma */
  if (!token) {
    if (Platform.OS === 'web') {
      token = sessionStorage.getItem('access_token');
    } else {
      token = await SecureStore.getItemAsync('access_token');
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
