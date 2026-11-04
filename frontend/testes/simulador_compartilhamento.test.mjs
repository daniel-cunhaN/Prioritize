/**
 * simulador_compartilhamento.test.mjs — Testes do Simulador de Compartilhamento Externo
 *
 * Validações:
 * 1) Existência do arquivo showcase/simulador-compartilhamento.html
 * 2) Presença do parâmetro ?url= e do Bookmarklet de compartilhamento
 * 3) Integração com o formato de deep link do Prioritize
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const showcaseDir = path.resolve(__dirname, '../../showcase');

describe('Simulador de Compartilhamento Externo para Apresentação', () => {
  it('deve existir o arquivo simulador-compartilhamento.html no diretório showcase', () => {
    const filePath = path.join(showcaseDir, 'simulador-compartilhamento.html');
    assert.ok(fs.existsSync(filePath), 'simulador-compartilhamento.html deve existir');
  });

  it('deve conter botão de bookmarklet e função de envio para o Prioritize com ?url=', () => {
    const filePath = path.join(showcaseDir, 'simulador-compartilhamento.html');
    const conteudo = fs.readFileSync(filePath, 'utf8');

    assert.ok(
      conteudo.includes('?url='),
      'Deve redirecionar para a URL do Prioritize com o parâmetro query ?url='
    );
    assert.ok(
      conteudo.includes('Compartilhar no Prioritize'),
      'Deve conter os botões de compartilhamento'
    );
    assert.ok(
      conteudo.includes('prioritize://share?url='),
      'Deve conter instruções de deep link nativo'
    );
  });
});
