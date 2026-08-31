import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1'; // Localhost for web and iOS
};

const client = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config) => {
  let token = null;
  if (Platform.OS === 'web') {
    token = localStorage.getItem('access_token');
  } else {
    token = await SecureStore.getItemAsync('access_token');
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
