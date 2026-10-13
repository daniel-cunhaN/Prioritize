/**
 * wishlist.js — Rotas de Gerenciamento da Lista de Desejos
 * Fornece endpoints para pré-visualização de links via scraping,
 * criação de desejos com prioridade (1: Baixa, 2: Média, 3: Alta),
 * listagem com filtros e exclusão de itens.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { obterBanco } from '../../db/database.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.js';
import { extrairMetadadosUrl } from '../../services/scraper.js';

const router = Router();

// Aplica o middleware de autenticação em todos os endpoints de wishlist
router.use(exigirAutenticacao);

/**
 * POST /api/v1/wishlist/preview
 * Recebe a URL de um produto e extrai automaticamente título e imagem via Cheerio.
 */
router.post('/preview', async (req, res) => {
  const { url } = req.body || {};

  // Validação de URL informada
  if (!url || !url.trim()) {
    return res.status(400).json({
      codigo: 'URL_INVALIDA',
      mensagem: 'A URL fornecida não pode estar vazia.',
    });
  }

  // Executa extração de metadados OpenGraph
  const metadados = await extrairMetadadosUrl(url);

  return res.status(200).json({
    url: metadados.url,
    titulo: metadados.titulo,
    imagem_url: metadados.imagem_url,
  });
});

/**
 * POST /api/v1/wishlist
 * Cadastra um novo desejo para o usuário logado com escala de importância (1, 2 ou 3).
 */
router.post('/', (req, res) => {
  const { url, titulo, imagem_url, prioridade } = req.body || {};

  // Validação dos dados essenciais do produto
  if (!url || !titulo || prioridade === undefined || prioridade === null) {
    return res.status(400).json({
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'URL, título e prioridade são obrigatórios.',
    });
  }

  const prioridadeNum = parseInt(prioridade, 10);
  if (![1, 2, 3].includes(prioridadeNum)) {
    return res.status(400).json({
      codigo: 'PRIORIDADE_INVALIDA',
      mensagem: 'A prioridade deve ser 1 (Baixa), 2 (Média) ou 3 (Alta).',
    });
  }

  const db = obterBanco();
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();

  // Insere novo item associado ao usuário autenticado
  const insertStmt = db.prepare(`
    INSERT INTO wishlist_items (id, user_id, url, title, image_url, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    id,
    req.usuario.id,
    url.trim(),
    titulo.trim(),
    imagem_url ? imagem_url.trim() : null,
    prioridadeNum,
    agora,
    agora
  );

  // Retorna os dados do item compatíveis com o modelo do frontend
  return res.status(201).json({
    id,
    user_id: req.usuario.id,
    url: url.trim(),
    title: titulo.trim(),
    image_url: imagem_url ? imagem_url.trim() : null,
    priority: prioridadeNum,
    created_at: agora,
    updated_at: agora,
  });
});

/**
 * GET /api/v1/wishlist
 * Retorna os itens de desejo do usuário autenticado, com suporte a filtro por prioridade.
 */
router.get('/', (req, res) => {
  const { prioridade } = req.query;
  const db = obterBanco();

  let sql = 'SELECT * FROM wishlist_items WHERE user_id = ?';
  const parametros = [req.usuario.id];

  // Aplica filtro por prioridade específica se fornecido
  if (prioridade) {
    const prioridadeNum = parseInt(prioridade, 10);
    if ([1, 2, 3].includes(prioridadeNum)) {
      sql += ' AND priority = ?';
      parametros.push(prioridadeNum);
    }
  }

  sql += ' ORDER BY created_at DESC';

  const stmt = db.prepare(sql);
  const itens = stmt.all(...parametros);

  return res.status(200).json(itens);
});

/**
 * DELETE /api/v1/wishlist/:item_id
 * Exclui um item da lista de desejos caso pertença ao usuário logado.
 */
router.delete('/:item_id', (req, res) => {
  const { item_id } = req.params;
  const db = obterBanco();

  // Verifica existência e posse do item
  const consulta = db.prepare('SELECT id FROM wishlist_items WHERE id = ? AND user_id = ?');
  const item = consulta.get(item_id, req.usuario.id);

  if (!item) {
    return res.status(404).json({
      codigo: 'DESEJO_NAO_ENCONTRADO',
      mensagem: 'Item de desejo não encontrado.',
    });
  }

  // Executa remoção
  const deleteStmt = db.prepare('DELETE FROM wishlist_items WHERE id = ?');
  deleteStmt.run(item_id);

  return res.status(204).send();
});

export default router;
