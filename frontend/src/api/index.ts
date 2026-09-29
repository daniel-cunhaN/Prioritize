import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { WishlistItem, WishlistPayload, AuthResponse } from '../types';
const TOKEN_KEY = 'access_token';
const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});
export const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.warn('Erro ao obter token:', error);
    return null;
  }
};
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.warn('Erro ao salvar token:', error);
  }
};
export const clearAuthToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.warn('Erro ao limpar token:', error);
  }
};
// Decodifica o payload do JWT para extrair o e-mail do utilizador na HomeScreen
export const getUserEmailFromToken = async (): Promise<string | null> => {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    const payloadBase64Url = token.split('.')[1];
    if (!payloadBase64Url) return null;
    
    const base64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.sub || null; // O FastAPI geralmente guarda o e-mail no "sub"
  } catch (error) {
    console.warn('Erro ao decodificar JWT local:', error);
    return null;
  }
};
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  if (response.data?.access_token) await setAuthToken(response.data.access_token);
  return response.data;
};
export const register = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', {
    email: email.trim().toLowerCase(),
    password,
  });
  if (response.data?.access_token) await setAuthToken(response.data.access_token);
  return response.data;
};

export type EmailCheckResult = {
  email: string;
  available: boolean;
  message: string;
};

export const checkEmailAvailable = async (
  email: string
): Promise<EmailCheckResult> => {
  const response = await api.get<EmailCheckResult>('/auth/check-email', {
    params: { email: email.trim().toLowerCase() },
  });
  return response.data;
};
export const fetchWishlist = async (): Promise<WishlistItem[]> => {
  const response = await api.get<WishlistItem[]>('/wishlist');
  return response.data;
};
export const addWishlistItem = async (item: WishlistPayload): Promise<WishlistItem> => {
  const response = await api.post<WishlistItem>('/wishlist', {
    title: item.title.trim(),
    url: item.url.trim(),
    image_url: item.image_url?.trim() || null,
    priority: Number(item.priority) || 1,
  });
  return response.data;
};
export const updateWishlistItem = async (id: string, item: Partial<WishlistPayload>): Promise<WishlistItem> => {
  const response = await api.put<WishlistItem>(`/wishlist/${id}`, item);
  return response.data;
};
export const deleteWishlistItem = async (id: string): Promise<void> => {
  await api.delete(`/wishlist/${id}`);
};
export default api;