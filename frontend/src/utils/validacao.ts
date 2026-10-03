/**
 * validacao.ts — Módulo de validação, sanitização e gerenciamento de tokens
 *
 * Centraliza lógica de segurança do lado do cliente:
 * - Validação de e-mail via regex RFC 5322 simplificada
 * - Validação de força de senha com critérios mínimos
 * - Sanitização de inputs contra XSS
 * - Armazenamento seguro de tokens JWT em memória (não localStorage)
 */

/* ─────────────────────────────────────────────
 * Regex de validação de e-mail (RFC 5322 simplificada)
 * ───────────────────────────────────────────── */
const REGEX_EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Valida se o e-mail possui formato válido.
 * Retorna objeto com status e mensagem de erro (se aplicável).
 */
export function validarEmail(email: string): { valido: boolean; erro?: string } {
  const emailLimpo = email.trim();

  if (!emailLimpo) {
    return { valido: false, erro: 'O e-mail é obrigatório.' };
  }

  if (!REGEX_EMAIL.test(emailLimpo)) {
    return { valido: false, erro: 'Formato de e-mail inválido.' };
  }

  return { valido: true };
}

/* ─────────────────────────────────────────────
 * Critérios de força de senha
 * ───────────────────────────────────────────── */

/** Resultado detalhado da validação de senha */
export interface ResultadoForcaSenha {
  valido: boolean;
  erro?: string;
  forca: 'fraca' | 'media' | 'forte';
  criterios: {
    comprimentoMinimo: boolean;
    temMaiuscula: boolean;
    temMinuscula: boolean;
    temNumero: boolean;
    temEspecial: boolean;
  };
}

/**
 * Avalia a força de uma senha com critérios progressivos.
 * Mínimo: 8 caracteres, 1 maiúscula, 1 minúscula, 1 número.
 */
export function validarForcaSenha(senha: string): ResultadoForcaSenha {
  const criterios = {
    comprimentoMinimo: senha.length >= 8,
    temMaiuscula: /[A-Z]/.test(senha),
    temMinuscula: /[a-z]/.test(senha),
    temNumero: /[0-9]/.test(senha),
    temEspecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
  };

  /* Conta quantos critérios foram atendidos */
  const criteriosAtendidos = Object.values(criterios).filter(Boolean).length;

  /* Mínimo obrigatório: comprimento, maiúscula, minúscula e número */
  const valido =
    criterios.comprimentoMinimo &&
    criterios.temMaiuscula &&
    criterios.temMinuscula &&
    criterios.temNumero;

  /* Classificação de força */
  let forca: 'fraca' | 'media' | 'forte' = 'fraca';
  if (criteriosAtendidos >= 5) {
    forca = 'forte';
  } else if (criteriosAtendidos >= 4) {
    forca = 'media';
  }

  /* Mensagem de erro descritiva */
  let erro: string | undefined;
  if (!valido) {
    const pendentes: string[] = [];
    if (!criterios.comprimentoMinimo) pendentes.push('mínimo 8 caracteres');
    if (!criterios.temMaiuscula) pendentes.push('1 letra maiúscula');
    if (!criterios.temMinuscula) pendentes.push('1 letra minúscula');
    if (!criterios.temNumero) pendentes.push('1 número');
    erro = `A senha precisa ter: ${pendentes.join(', ')}.`;
  }

  return { valido, erro, forca, criterios };
}

/* ─────────────────────────────────────────────
 * Sanitização anti-XSS para inputs de texto
 * ───────────────────────────────────────────── */

/**
 * Remove caracteres HTML perigosos para prevenir XSS refletido.
 * Substitui <, >, ", ', & e / por entidades seguras.
 */
export function sanitizarInput(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove tags HTML e scripts de uma string.
 * Usado para sanitização mais agressiva antes de envio.
 */
export function removerHTML(texto: string): string {
  return texto.replace(/<[^>]*>/g, '').trim();
}

/* ─────────────────────────────────────────────
 * Gerenciamento seguro de tokens em memória
 *
 * Tokens JWT são armazenados apenas em variável de módulo
 * (closure), evitando localStorage/sessionStorage para
 * dados sensíveis. O SecureStore do Expo é usado em
 * plataformas nativas como camada persistente segura.
 * ───────────────────────────────────────────── */

/** Token armazenado em memória (closure do módulo) */
let tokenEmMemoria: string | null = null;

/** Salva o token de acesso em memória */
export function definirToken(token: string): void {
  tokenEmMemoria = token;
}

/** Recupera o token de acesso da memória */
export function obterToken(): string | null {
  return tokenEmMemoria;
}

/** Remove o token de acesso da memória (logout) */
export function limparToken(): void {
  tokenEmMemoria = null;
}
