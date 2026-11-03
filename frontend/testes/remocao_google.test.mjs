/**
 * remocao_google.test.mjs — Testes TDD da Remoção do Botão Google no Aplicativo
 *
 * Validações:
 * 1) RegisterScreen.tsx não deve conter o botão "Continuar com o google", "Cadastrar com Google", nem divisores sociais
 * 2) LoginScreen.tsx não deve conter o botão "Continuar com Google", nem divisores sociais
 * 3) As telas devem manter apenas formulários diretos e monocromáticos de autenticação
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

describe('Remoção do Botão Google do Aplicativo (TDD)', () => {
  it('RegisterScreen.tsx não deve conter botão ou menção ao Google', () => {
    const registerPath = path.join(srcDir, 'screens/RegisterScreen.tsx');
    const conteudo = fs.readFileSync(registerPath, 'utf8');

    assert.ok(
      !conteudo.toLowerCase().includes('google'),
      'RegisterScreen não deve conter qualquer menção ao Google'
    );
    assert.ok(
      !conteudo.includes('handleRegistroGoogle'),
      'Não deve conter handler de registro com o Google'
    );
    assert.ok(
      !conteudo.includes('ou com e-mail'),
      'Não deve conter divisor social "ou com e-mail"'
    );
  });

  it('LoginScreen.tsx não deve conter botão ou menção ao Google', () => {
    const loginPath = path.join(srcDir, 'screens/LoginScreen.tsx');
    const conteudo = fs.readFileSync(loginPath, 'utf8');

    assert.ok(
      !conteudo.toLowerCase().includes('google'),
      'LoginScreen não deve conter qualquer menção ao Google'
    );
    assert.ok(
      !conteudo.includes('handleLoginGoogle'),
      'Não deve conter handler de login com o Google'
    );
    assert.ok(
      !conteudo.includes('ou com e-mail'),
      'Não deve conter divisor social "ou com e-mail"'
    );
  });
});
