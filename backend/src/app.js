/**
 * app.js — Configuração da Aplicação Express
 * Registra middlewares de CORS, parser de JSON, showcase estático e roteadores da API REST.
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { obterBanco } from './db/database.js';
import authRoutes from './api/routes/auth.js';
import wishlistRoutes from './api/routes/wishlist.js';

// Resolve o caminho absoluto para o diretório da página interativa de UI/UX Showcase
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const caminhoShowcase = path.resolve(__dirname, '../../showcase');

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

  // Serve estaticamente a prancha interativa de UI/UX Showcase em /showcase
  app.use('/showcase', express.static(caminhoShowcase));

  // Registro das rotas da API sob o prefixo /api/v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/wishlist', wishlistRoutes);

  // Rota de status e boas-vindas da API
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Wishlist Centralizer API (Node.js/Express)' });
  });

  return app;
}
