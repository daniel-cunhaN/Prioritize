/**
 * index.js — Ponto de Entrada do Servidor HTTP Prioritize Backend
 * Inicia a aplicação Express escutando na porta e host configurados.
 */

import { criarApp } from './app.js';
import { config } from './config/configuracao.js';

const app = criarApp();

// Inicia escuta HTTP
app.listen(config.porta, config.host, () => {
  console.log('==================================================');
  console.log(`[Prioritize Backend] Rodando em http://${config.host}:${config.porta}`);
  console.log(`[Prioritize Backend] Modo: Node.js (JavaScript ES Modules)`);
  console.log('==================================================');
});
