/**
 * database.js — Gerenciador de conexão com o banco SQLite
 * Utiliza o módulo nativo node:sqlite (Node v24+) para alto desempenho,
 * sem exigir dependências compiladas em C++ no ambiente Windows.
 */

import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/configuracao.js';
import { TABELA_USUARIOS, TABELA_DESEJOS } from './schema.js';

let dbInstancia = null;

/**
 * Retorna a instância ativa do banco de dados SQLite.
 * Se a conexão ainda não foi inicializada, cria a conexão e executa o schema.
 */
export function obterBanco(caminhoPersonalizado = null) {
  if (!dbInstancia) {
    const caminho = caminhoPersonalizado || config.caminhoBanco;
    dbInstancia = new DatabaseSync(caminho);

    // Ativa suporte a chaves estrangeiras no SQLite
    dbInstancia.exec('PRAGMA foreign_keys = ON;');

    // Inicializa as tabelas se ainda não existirem
    dbInstancia.exec(TABELA_USUARIOS);
    dbInstancia.exec(TABELA_DESEJOS);
  }
  return dbInstancia;
}

/**
 * Fecha a conexão com o banco de dados caso esteja aberta.
 * Útil para ciclos de teste e encerramento de processos.
 */
export function fecharBanco() {
  if (dbInstancia) {
    try {
      dbInstancia.close();
    } catch {
      // Ignora se já estiver fechado
    }
    dbInstancia = null;
  }
}
