/**
 * seguranca.js — Utilitários de criptografia e autenticação
 * Implementado 100% em JavaScript com bcryptjs e jsonwebtoken.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/configuracao.js';

/**
 * Gera um hash criptográfico seguro a partir da senha em texto puro.
 * Utiliza salt rounds de fator 10 do bcryptjs.
 */
export async function gerarHashSenha(senha) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(senha, salt);
}

/**
 * Compara uma senha fornecida em texto com o hash armazenado no banco.
 * Retorna true se a senha corresponder, ou false caso contrário.
 */
export async function verificarSenha(senhaPlana, senhaHasheada) {
  return bcrypt.compare(senhaPlana, senhaHasheada);
}

/**
 * Cria e assina digitalmente um token JWT contendo os dados do usuário.
 * O token possui expiração configurada para 7 dias.
 */
export function criarTokenAcesso(dados) {
  return jwt.sign(dados, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Valida a integridade e autenticidade de um token JWT.
 * Dispara uma exceção caso o token seja inválido ou esteja expirado.
 */
export function verificarTokenAcesso(token) {
  return jwt.verify(token, config.jwtSecret);
}
