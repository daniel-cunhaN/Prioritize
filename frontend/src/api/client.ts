/**
 * client.ts — Cliente HTTP Axios com interceptor de token JWT
 *
 * Prioriza token da memória (via módulo validacao.ts) antes de
 * recorrer ao armazenamento persistente (SecureStore no mobile ou localStorage na Web).
 * Inclui interceptor de resposta para invalidação e limpeza automática de sessão em caso de erro 401.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { obterToken, encerrarSessao } from '../utils/validacao';

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
 * Ordem de prioridade: memória > SecureStore (nativo) > localStorage/sessionStorage (web).
 */
client.interceptors.request.use(async (config) => {
  /* 1. Tenta recuperar token da memória (mais seguro e rápido) */
  let token = obterToken();

  /* 2. Fallback para armazenamento persistente da plataforma */
  if (!token) {
    if (Platform.OS === 'web') {
      token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    } else {
      token = await SecureStore.getItemAsync('access_token');
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Interceptor de resposta — trata expiração ou rejeição de credenciais (401 Unauthorized).
 * Em rotas protegidas, encerra a sessão pendente e notifica a aplicação para redirecionar ao login.
 */
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Se o status for 401 e não for rota pública de autenticação, limpa o token expirado
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      await encerrarSessao();

      // Dispara evento na Web para notificar componentes ativos
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prioritize:sessao-expirada'));
      }
    }

    return Promise.reject(error);
  }
);

export default client;
