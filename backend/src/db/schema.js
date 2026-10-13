/**
 * schema.js — Definição das tabelas do banco de dados SQLite
 * Contém os comandos SQL DDL para criação das tabelas users e wishlist_items,
 * preservando a mesma estrutura e tipos utilizados pela aplicação.
 */

// Criação da tabela de usuários com índice no e-mail
export const TABELA_USUARIOS = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

// Criação da tabela de itens de lista de desejos com chave estrangeira e índice
export const TABELA_DESEJOS = `
  CREATE TABLE IF NOT EXISTS wishlist_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    image_url TEXT,
    priority INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);
`;
