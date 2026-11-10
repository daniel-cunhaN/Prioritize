/**
 * Testes Unitários (TDD) — Modal de Recuperação de Senha em 2 Etapas (Frontend)
 * Valida a existência do RecuperarSenhaModal.tsx, etapas 'solicitar' e 'redefinir',
 * exibição do token híbrido e integração com o botão "Esqueceu?" em LoginScreen.tsx.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caminhoModal = path.join(__dirname, '..', 'src', 'components', 'RecuperarSenhaModal.tsx');
const caminhoLogin = path.join(__dirname, '..', 'src', 'screens', 'LoginScreen.tsx');

describe('Recuperação de Senha em 2 Etapas (Frontend UI)', () => {
  test('1. deve existir o componente RecuperarSenhaModal.tsx', () => {
    assert.strictEqual(
      fs.existsSync(caminhoModal),
      true,
      'O arquivo RecuperarSenhaModal.tsx deve existir em src/components/'
    );
  });

  test('2. RecuperarSenhaModal.tsx deve conter as 2 etapas (/auth/forgot-password e /auth/reset-password) e card híbrido de token', () => {
    const conteudo = fs.readFileSync(caminhoModal, 'utf-8');
    assert.ok(
      conteudo.includes('/auth/forgot-password'),
      'Deve chamar o endpoint /auth/forgot-password na Etapa 1'
    );
    assert.ok(
      conteudo.includes('/auth/reset-password'),
      'Deve chamar o endpoint /auth/reset-password na Etapa 2'
    );
    assert.ok(
      conteudo.includes('reset_token_preview'),
      'Deve exibir o token híbrido retornado pelo backend para testes e apresentações'
    );
    assert.ok(
      conteudo.includes('Cadastrar nova senha'),
      'Deve possuir botão de confirmação para cadastrar a nova senha'
    );
  });

  test('3. LoginScreen.tsx deve abrir o RecuperarSenhaModal ao clicar em "Esqueceu?"', () => {
    const conteudoLogin = fs.readFileSync(caminhoLogin, 'utf-8');
    assert.ok(
      conteudoLogin.includes('RecuperarSenhaModal'),
      'LoginScreen.tsx deve importar e renderizar RecuperarSenhaModal'
    );
    assert.ok(
      conteudoLogin.includes('setModalRecuperarVisivel(true)'),
      'O link "Esqueceu?" deve acionar setModalRecuperarVisivel(true)'
    );
    assert.strictEqual(
      conteudoLogin.includes('A recuperação de senha estará disponível em breve.'),
      false,
      'Não deve mais exibir a mensagem provisória antiga'
    );
  });
});
