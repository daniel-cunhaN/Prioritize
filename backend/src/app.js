/**
 * app.js — Configuração da Aplicação Express
 * Registra middlewares de CORS, parser de JSON e roteadores da API REST.
 */

import express from 'express';
import cors from 'cors';
import { obterBanco } from './db/database.js';
import authRoutes from './api/routes/auth.js';
import wishlistRoutes from './api/routes/wishlist.js';

/**
 * Cria e configura uma instância do aplicativo Express.
 * Permite inicialização tanto pelo servidor principal quanto pela suíte de testes.
 */
export function criarApp() {
  const app = express();

  // Configuração de CORS para suportar chamadas do Expo e aplicações Web
  app.use(cors({ origin: true, credentials: true }));

  // Parser para requisições com corpo JSON
  app.use(express.json());

  // Inicialização prévia das tabelas SQLite
  obterBanco();

  // Registro das rotas da API sob o prefixo /api/v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/wishlist', wishlistRoutes);

  // Rota de status e boas-vindas da API
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Wishlist Centralizer API (Node.js/Express)' });
  });

  return app;
}
