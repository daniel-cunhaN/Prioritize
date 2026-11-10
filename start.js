/**
 * start.js — Inicializador Multiplataforma do Prioritize
 * Verifica/instala dependências automaticamente, executa concorrentemente o backend Express
 * e o frontend Expo Web, e abre a aplicação diretamente no navegador Mozilla Firefox.
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve o diretório raiz do projeto de forma compatível com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('==========================================');
console.log('    Iniciando Prioritize (Fullstack JS)   ');
console.log('==========================================');

const ehWindows = process.platform === 'win32';
const comandoNpm = ehWindows ? 'npm.cmd' : 'npm';
const urlFrontend = 'http://localhost:8081';

/**
 * Verifica se a pasta node_modules existe em cada subprojeto (backend e frontend)
 * e instala as dependências automaticamente caso necessário.
 */
function instalarDependenciasSeNecessario() {
  const projetos = ['backend', 'frontend'];

  for (const pasta of projetos) {
    const caminhoNodeModules = path.join(__dirname, pasta, 'node_modules');
    if (!fs.existsSync(caminhoNodeModules)) {
      console.log(`[Setup] Instalando dependências ausentes em "${pasta}"...`);
      const resultado = spawnSync(comandoNpm, ['--prefix', pasta, 'install'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true,
      });

      if (resultado.status !== 0) {
        console.error(`[Erro] Falha ao instalar dependências em "${pasta}".`);
        process.exit(1);
      }
    } else {
      console.log(`[Setup] Dependências de "${pasta}" já instaladas.`);
    }
  }
}

/**
 * Localiza o executável do Mozilla Firefox no sistema operacional e abre a URL informada.
 * @param {string} url Endereço web a ser aberto no Firefox.
 */
function abrirNoFirefox(url) {
  console.log(`[Navegador] Abrindo ${url} no Mozilla Firefox...`);

  if (ehWindows) {
    // Caminhos padrões de instalação do Mozilla Firefox no Windows
    const caminhosFirefox = [
      'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
      'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Mozilla Firefox', 'firefox.exe'),
    ];

    const executavelFirefox = caminhosFirefox.find((caminho) => fs.existsSync(caminho));

    if (executavelFirefox) {
      const processoFirefox = spawn(executavelFirefox, [url], {
        detached: true,
        stdio: 'ignore',
      });
      processoFirefox.unref();
      return;
    }

    // Fallback via comando start do Windows caso não esteja nos diretórios padrões
    const fallbackFirefox = spawn('cmd.exe', ['/c', 'start', 'firefox', url], {
      detached: true,
      stdio: 'ignore',
    });
    fallbackFirefox.unref();
    return;
  }

  // Suporte para sistemas macOS e Linux
  const comando = process.platform === 'darwin' ? 'open' : 'firefox';
  const argumentos = process.platform === 'darwin' ? ['-a', 'Firefox', url] : [url];
  const processoUnix = spawn(comando, argumentos, {
    detached: true,
    stdio: 'ignore',
  });
  processoUnix.unref();
}

/**
 * Aguarda o servidor web do Expo responder na porta 8081 antes de acionar o Firefox.
 * @param {string} url URL do servidor frontend para verificação de disponibilidade.
 * @param {number} tentativasMaximas Número máximo de verificações (1 por segundo).
 */
async function aguardarServidorEAbrirFirefox(url, tentativasMaximas = 60) {
  for (let tentativa = 1; tentativa <= tentativasMaximas; tentativa++) {
    try {
      const resposta = await fetch(url);
      if (resposta.ok || resposta.status < 500) {
        abrirNoFirefox(url);
        return;
      }
    } catch {
      // Servidor ainda em inicialização; aguarda 1 segundo para nova tentativa
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.warn(`[Aviso] O servidor em ${url} demorou para responder, tentando abrir o Firefox mesmo assim...`);
  abrirNoFirefox(url);
}

// 1. Garante que todas as dependências estejam instaladas antes de iniciar
instalarDependenciasSeNecessario();

// 2. Inicia o Backend Node.js Express na porta 8000
console.log('[1/2] Iniciando Backend Express (Porta 8000)...');
const backend = spawn(`${comandoNpm} --prefix backend run dev`, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

// 3. Inicia o Frontend Expo em modo Web (Porta 8081), desativando o navegador padrão para abrir no Firefox
console.log('[2/2] Iniciando Frontend Expo Web (Porta 8081)...');
const frontend = spawn(`${comandoNpm} --prefix frontend run web`, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    BROWSER: 'none',
  },
});

// 4. Monitora a disponibilidade do Frontend e abre automaticamente no Firefox
aguardarServidorEAbrirFirefox(urlFrontend);

// Encerramento ordenado dos processos filhos ao receber SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nFinalizando serviços...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
