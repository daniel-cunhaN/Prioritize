import { Router } from 'express';
import crypto from 'node:crypto';
import { obterBanco } from '../../db/database.js';
import { exigirAutenticacao } from '../middlewares/autenticacao.js';
import { extrairMetadadosUrl } from '../../services/scraper.js';

const router = Router();

// Aplica o middleware de autenticacao em todos os endpoints de wishlist
router.use(exigirAutenticacao);

/**
 * POST /api/v1/wishlist/preview
 * Recebe a URL de um produto e extrai automaticamente titulo e imagem via Cheerio.
 */
router.post('/preview', async (req, res) => {
  const { url } = req.body || {};

  // Validacao de URL informada
  if (!url || !url.trim()) {
    return res.status(400).json({
      codigo: 'URL_INVALIDA',
      mensagem: 'A URL fornecida nao pode estar vazia.',
    });
  }

  try {
    // Realiza scraping de titulo e imagem
    const metadados = await extrairMetadadosUrl(url.trim());
    return res.status(200).json(metadados);
  } catch (erro) {
    console.error('Erro ao extrair metadados para preview:', erro.message);
    return res.status(422).json({
      codigo: 'FALHA_SCRAPING',
      mensagem: 'Nao foi possivel obter informacoes do produto a partir da URL informada.',
    });
  }
});

/**
 * POST /api/v1/wishlist
 * Cadastra um novo desejo para o usuario logado com escala de importancia (1, 2 ou 3).
 */
router.post('/', (req, res) => {
  const { url, titulo, title, imagem_url, image_url, prioridade, priority } = req.body || {};
  const finalTitle = titulo || title;
  const finalUrl = url;
  const finalPriority = prioridade !== undefined ? prioridade : priority;
  const finalImageUrl = imagem_url !== undefined ? imagem_url : image_url;

  // Validacao dos dados essenciais do produto
  if (!finalUrl || !finalTitle || finalPriority === undefined || finalPriority === null) {
    return res.status(400).json({
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'URL, titulo e prioridade sao obrigatorios.',
    });
  }

  const prioridadeNum = parseInt(finalPriority, 10);
  if (![1, 2, 3].includes(prioridadeNum)) {
    return res.status(400).json({
      codigo: 'PRIORIDADE_INVALIDA',
      mensagem: 'A prioridade deve ser 1 (Baixa), 2 (Media) ou 3 (Alta).',
    });
  }

  const db = obterBanco();
  const id = crypto.randomUUID();
  const agora = new Date().toISOString();

  // Insere novo item associado ao usuario autenticado
  const insertStmt = db.prepare(`
    INSERT INTO wishlist_items (id, user_id, url, title, image_url, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    id,
    req.usuario.id,
    finalUrl.trim(),
    finalTitle.trim(),
    finalImageUrl ? String(finalImageUrl).trim() : null,
    prioridadeNum,
    agora,
    agora
  );

  return res.status(201).json({
    id,
    user_id: req.usuario.id,
    url: finalUrl.trim(),
    title: finalTitle.trim(),
    image_url: finalImageUrl ? String(finalImageUrl).trim() : null,
    priority: prioridadeNum,
    created_at: agora,
    updated_at: agora,
  });
});

/**
 * GET /api/v1/wishlist
 * Retorna os itens de desejo do usuario autenticado, com suporte a filtro por prioridade.
 */
router.get('/', (req, res) => {
  const { prioridade } = req.query;
  const db = obterBanco();

  let sql = 'SELECT * FROM wishlist_items WHERE user_id = ?';
  const parametros = [req.usuario.id];

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
 * PUT /api/v1/wishlist/:item_id
 * Atualiza um item da lista de desejos.
 */
router.put('/:item_id', (req, res) => {
  const { item_id } = req.params;
  const { url, titulo, title, imagem_url, image_url, prioridade, priority } = req.body || {};
  const db = obterBanco();

  const consulta = db.prepare('SELECT * FROM wishlist_items WHERE id = ? AND user_id = ?');
  const item = consulta.get(item_id, req.usuario.id);

  if (!item) {
    return res.status(404).json({
      codigo: 'DESEJO_NAO_ENCONTRADO',
      mensagem: 'Item de desejo nao encontrado.',
    });
  }

  const finalTitle = (titulo !== undefined ? titulo : title !== undefined ? title : item.title)?.trim();
  const finalUrl = (url !== undefined ? url : item.url)?.trim();
  const finalImageUrl = imagem_url !== undefined ? imagem_url : image_url !== undefined ? image_url : item.image_url;
  const rawPriority = prioridade !== undefined ? prioridade : priority !== undefined ? priority : item.priority;
  const finalPriority = parseInt(rawPriority, 10) || item.priority;
  const agora = new Date().toISOString();

  const updateStmt = db.prepare(`
    UPDATE wishlist_items
    SET title = ?, url = ?, image_url = ?, priority = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `);

  updateStmt.run(
    finalTitle,
    finalUrl,
    finalImageUrl ? String(finalImageUrl).trim() : null,
    finalPriority,
    agora,
    item_id,
    req.usuario.id
  );

  const atualizado = db.prepare('SELECT * FROM wishlist_items WHERE id = ?').get(item_id);
  return res.status(200).json(atualizado);
});

/**
 * DELETE /api/v1/wishlist/:item_id
 * Exclui um item da lista de desejos.
 */
router.delete('/:item_id', (req, res) => {
  const { item_id } = req.params;
  const db = obterBanco();

  const consulta = db.prepare('SELECT id FROM wishlist_items WHERE id = ? AND user_id = ?');
  const item = consulta.get(item_id, req.usuario.id);

  if (!item) {
    return res.status(404).json({
      codigo: 'DESEJO_NAO_ENCONTRADO',
      mensagem: 'Item de desejo nao encontrado.',
    });
  }

  const deleteStmt = db.prepare('DELETE FROM wishlist_items WHERE id = ?');
  deleteStmt.run(item_id);

  return res.status(204).send();
});

export default router;
