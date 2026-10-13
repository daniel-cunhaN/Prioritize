/**
 * compartilhamento.ts — Utilitário de Extração e Tratamento de Conteúdo Compartilhado
 *
 * Responsável por:
 * - Extrair links HTTP/HTTPS válidos a partir de textos brutos compartilhados por outros apps
 * - Suportar formatos de deep link (ex: prioritize://share?url=...)
 * - Higienizar pontuações e caracteres anexados às URLs em mensagens de compartilhamento
 * - Manter estado temporário de URL pendente caso o usuário precise autenticar antes de salvar
 */

/**
 * Regex para localização de links com protocolo HTTP ou HTTPS
 */
const REGEX_URL_HTTP = /(https?:\/\/[^\s"'<>\`]+)/i;

/**
 * Caracteres de pontuação que comumente ficam grudados no final de URLs
 * quando compartilhadas a partir de apps de mensagens ou redes sociais.
 */
const CARACTERES_PONTUACAO_FINAL = /[.,;:!?)\]}>"']+$/;

/**
 * Extrai a primeira URL HTTP/HTTPS válida presente em uma string.
 *
 * Exemplos tratados com sucesso:
 * - "https://www.amazon.com.br/dp/B08N5WRWNW"
 * - "Olha que legal: https://mercadolivre.com/p/123! Comprei ontem."
 * - "prioritize://share?url=https%3A%2F%2Floja.com%2Fproduto"
 *
 * @param conteudo Texto bruto recebido do intent de compartilhamento ou deep link
 * @returns A URL limpa e válida ou null se nenhuma URL for identificada
 */
export function extrairUrlValida(conteudo?: string | null): string | null {
  if (!conteudo || typeof conteudo !== 'string') {
    return null;
  }

  const texto = conteudo.trim();
  if (!texto) {
    return null;
  }

  // 1. Tratamento para esquemas de Deep Link (prioritize://...)
  if (texto.startsWith('prioritize://')) {
    try {
      // Substitui o esquema customizado por https:// para utilizar a API nativa de URL
      const urlFicticia = texto.replace(/^prioritize:\/\//, 'https://dummy.local/');
      const objetoUrl = new URL(urlFicticia);
      const parametroUrl = objetoUrl.searchParams.get('url') || objetoUrl.searchParams.get('text');

      if (parametroUrl) {
        return extrairUrlValida(decodeURIComponent(parametroUrl));
      }
    } catch (erro) {
      console.warn('Falha ao processar deep link prioritize://:', erro);
    }
  }

  // 2. Busca pela primeira ocorrência de URL com protocolo HTTP/HTTPS
  const correspondencia = texto.match(REGEX_URL_HTTP);
  if (!correspondencia || !correspondencia[0]) {
    return null;
  }

  let urlCandidata = correspondencia[0];

  // 3. Remove pontuações acidentais anexadas ao final da URL
  urlCandidata = urlCandidata.replace(CARACTERES_PONTUACAO_FINAL, '');

  // 4. Validação final da integridade da URL
  try {
    const urlValidada = new URL(urlCandidata);
    if (urlValidada.protocol === 'http:' || urlValidada.protocol === 'https:') {
      return urlValidada.toString();
    }
  } catch {
    return null;
  }

  return null;
}

// ─── Gerenciamento em Memória de URL Compartilhada Pendente ───────────────────
// Usado quando o usuário recebe um compartilhamento enquanto está deslogado,
// permitindo abrir o modal automaticamente logo após o Login ou Cadastro.

let urlCompartilhadaPendente: string | null = null;

/**
 * Define uma URL pendente para ser consumida após autenticação
 */
export function definirUrlCompartilhadaPendente(url: string | null): void {
  urlCompartilhadaPendente = url;
}

/**
 * Obtém a URL pendente sem limpá-la
 */
export function obterUrlCompartilhadaPendente(): string | null {
  return urlCompartilhadaPendente;
}

/**
 * Retorna e limpa a URL compartilhada pendente (consumo único)
 */
export function consumirUrlCompartilhadaPendente(): string | null {
  const url = urlCompartilhadaPendente;
  urlCompartilhadaPendente = null;
  return url;
}
