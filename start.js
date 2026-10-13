/**
 * start.js — Inicializador Multiplataforma do Prioritize
 * Executa concorrentemente o backend Express e o frontend Expo em JavaScript puro.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

console.log('==========================================');
console.log('    Iniciando Prioritize (Fullstack JS)   ');
console.log('==========================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Inicia o Backend Node.js Express na porta 8000
console.log('[1/2] Iniciando Backend Express (Porta 8000)...');
const backend = spawn(npmCmd, ['--prefix', 'backend', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Inicia o Frontend Expo
console.log('[2/2] Iniciando Frontend Expo...');
const frontend = spawn(npmCmd, ['--prefix', 'frontend', 'start'], {
  stdio: 'inherit',
  shell: true,
});

// Encerramento ordenado dos processos
process.on('SIGINT', () => {
  console.log('\nFinalizando servicos...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
