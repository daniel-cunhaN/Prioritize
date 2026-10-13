/**
 * configuracao.js — Configurações centrais do backend Prioritize
 * Gerencia portas, segredos de criptografia JWT e caminho do banco de dados SQLite.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Obtém o diretório atual em ambiente de módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Objeto de configuração da aplicação
export const config = {
  // Porta do servidor HTTP (padrão 8000 para manter compatibilidade com o frontend)
  porta: Number(process.env.PORT) || 8000,
  // Host de vinculação
  host: process.env.HOST || '0.0.0.0',
  // Chave secreta para assinatura dos tokens JWT
  jwtSecret: process.env.SECRET_KEY || 'super_secret_key_for_dev_only_wishlist_app_2026',
  // Tempo de expiração do token de acesso
  jwtExpiresIn: '7d',
  // Caminho do arquivo SQLite local
  caminhoBanco: path.resolve(__dirname, '../../wishlist.db'),
};
