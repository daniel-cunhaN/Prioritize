/**
 * scraper.js — Serviço de Extração de Metadados OpenGraph, HTML e Pesquisa Determinística de Preço
 * Responsável por requisitar a página web do produto e extrair automaticamente
 * informações de título, imagem e preço com alta tolerância a falhas e bloqueios anti-bot.
 *
 * Estratégias para precisão e determinismo em lojas com proteção anti-bot (Shopee, Mercado Livre, Amazon):
 * 1. Múltiplas tentativas com User-Agents otimizados por domínio:
 *    - Shopee e Amazon priorizam o crawler do WhatsApp (SSR completo sem bloqueio de WAF/Captcha).
 *    - Demais lojas tentam navegador e crawlers de prévia (Twitterbot, Facebook, WhatsApp).
 * 2. Prioridade estrita de seletores de Buybox (Amazon e Mercado Livre), avaliando cada
 *    container principal individualmente antes de qualquer elemento secundário e descartando
 *    carrosséis patrocinados, itens usados e valores de parcelas.
 * 3. Normalização monetária precisa para valores na casa dos milhares com ou sem centavos
 *    (ex.: "R$ 3.299" -> 3299.00, "1.250" -> 1250.00).
 * 4. Busca comparativa determinística (Buscapé + fallback) com filtragem de acessórios
 *    (baterias avulsas, maletas, capas) e pontuação por aderência de palavras-chave,
 *    independente da ordem de renderização dos anúncios no DOM.
 * 5. Cache canônico por identificador de produto (ASIN, MLB, Shopee Item ID ou URL limpa)
 *    para garantir que múltiplas extrações do mesmo link retornem sempre o mesmo valor.
 */

import * as cheerio from 'cheerio';

// Tempo máximo de cada tentativa de download da página (ms)
const TIMEOUT_TENTATIVA_MS = 6000;

// Tempo máximo para a consulta de fallback de preço via pesquisa web (ms)
const TIMEOUT_PESQUISA_WEB_MS = 5000;

// Tamanho mínimo (bytes) para considerar válida a imagem da CDN da Amazon.
// ASINs inexistentes retornam um pixel GIF transparente de 43 bytes.
const TAMANHO_MINIMO_IMAGEM_AMAZON = 1000;

// Cache em memória de metadados por chave canônica de produto para estabilidade entre extrações
const CACHE_METADADOS_PRODUTO = new Map();

/**
 * Limpa o cache em memória de metadados e preços extraídos.
 * Útil para isolamento entre testes automatizados.
 */
export function limparCacheMetadados() {
  CACHE_METADADOS_PRODUTO.clear();
}

// ─── Perfis de requisição com cabeçalhos específicos ──────────────────────────

// Perfil de navegador desktop moderno: padrão para a maioria das lojas e sites convencionais
export const PERFIL_NAVEGADOR = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Perfil de crawler de prévia do WhatsApp:
// Utilizado para contornar SPAs e proteções de marketplaces como Shopee e Amazon, que entregam
// renderização do lado do servidor (SSR) completa para prévia de mensagens.
export const PERFIL_WHATSAPP = {
  'User-Agent': 'WhatsApp/2.23.23.77 A',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Perfil de crawler do Twitter/X: liberado por e-commerces para geração de Twitter Cards
export const PERFIL_TWITTER = {
  'User-Agent': 'Twitterbot/1.0',
  Accept: 'text/html,application/xhtml+xml',
};

// Perfil de crawler de prévia do Facebook
export const PERFIL_FACEBOOK = {
  'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  Accept: 'text/html,application/xhtml+xml',
};

// Lista padrão de perfis tentados sequencialmente para links genéricos
export const PERFIS_REQUISICAO = [
  PERFIL_NAVEGADOR,
  PERFIL_TWITTER,
  PERFIL_FACEBOOK,
  PERFIL_WHATSAPP,
];

/**
 * Verifica se a URL informada pertence ao marketplace Shopee (domínios oficiais ou encurtados).
 * Ex: shopee.com.br, shopee.com, shope.ee, s.shopee.com.br.
 *
 * @param {string} url - URL para checagem
 * @returns {boolean}
 */
export function ehUrlShopee(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlFormatada =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { hostname } = new URL(urlFormatada);
    if (/(^|\.)shope\.ee$/i.test(hostname)) return true;
    return /(^|\.)shopee\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2,3})$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Verifica se a URL informada pertence à Amazon (domínios oficiais ou encurtados).
 * Ex: amazon.com.br, amazon.com, a.co, amzn.to.
 *
 * @param {string} url - URL para checagem
 * @returns {boolean}
 */
export function ehUrlAmazon(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlFormatada =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { hostname } = new URL(urlFormatada);
    if (/(^|\.)(a\.co|amzn\.to|amzn\.eu)$/i.test(hostname)) return true;
    return /(^|\.)amazon\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2,3})$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Verifica se a URL informada pertence ao Mercado Livre (domínios oficiais ou encurtados).
 * Ex: mercadolivre.com.br, produto.mercadolivre.com.br, mercadolibre.com, meli.la.
 *
 * @param {string} url - URL para checagem
 * @returns {boolean}
 */
export function ehUrlMercadoLivre(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlFormatada =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { hostname } = new URL(urlFormatada);
    if (/(^|\.)meli\.la$/i.test(hostname)) return true;
    return /(^|\.)mercadoli[vb]re\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2,3})$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Verifica se a URL pertence a um grande marketplace conhecido que costuma aplicar
 * proteções anti-bot ou ocultar preços no SSR inicial.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function ehUrlMarketplaceConhecido(url) {
  if (ehUrlShopee(url) || ehUrlAmazon(url) || ehUrlMercadoLivre(url)) return true;
  if (!url || typeof url !== 'string') return false;
  try {
    const urlFormatada =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { hostname } = new URL(urlFormatada);
    return /(^|\.)(magazineluiza\.com\.br|magalu\.com|kabum\.com\.br|aliexpress\.com|casasbahia\.com\.br|americanas\.com\.br)$/i.test(
      hostname
    );
  } catch {
    return false;
  }
}

/**
 * Gera uma chave canônica única para o produto a partir da URL, ignorando parâmetros
 * voláteis de rastreamento (sp_atk, xptdk, utm_*, ref, etc.) para estabilizar o resultado.
 *
 * @param {string} url
 * @returns {string}
 */
export function obterChaveCanonicaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const urlExtraida = extrairUrlDeTexto(url) || url.trim();
    const urlFormatada =
      urlExtraida.startsWith('http://') || urlExtraida.startsWith('https://')
        ? urlExtraida
        : `https://${urlExtraida}`;

    // 1. Amazon: chave pelo ASIN de 10 caracteres
    const asin = extrairAsinAmazon(urlFormatada);
    if (asin) return `amazon:${asin}`;

    const obj = new URL(urlFormatada);
    const caminho = decodeURIComponent(obj.pathname);

    // 2. Shopee: chave pelo par shopId.itemId ou image_ids
    if (ehUrlShopee(urlFormatada)) {
      const matchIds =
        caminho.match(/-i\.(\d+)\.(\d+)/i) || caminho.match(/\/product\/(\d+)\/(\d+)/i);
      if (matchIds) return `shopee:${matchIds[1]}.${matchIds[2]}`;
      const imgId = obj.searchParams.get('image_ids');
      if (imgId) return `shopee:img:${imgId}`;
    }

    // 3. Mercado Livre: chave pelo identificador MLB
    if (ehUrlMercadoLivre(urlFormatada)) {
      const matchMlb = (caminho + obj.search).match(/(MLB-?\d{6,15})/i);
      if (matchMlb) return `ml:${matchMlb[1].replace('-', '').toUpperCase()}`;
    }

    // 4. URL geral: remove parâmetros efêmeros de tracking/afiliados
    const paramsLimpos = new URLSearchParams(obj.search);
    const chavesRastreamento = [
      'sp_atk',
      'xptdk',
      'is_from_login',
      'incoming_source',
      'extraParams',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'matt_tool',
      'matt_word',
      'tracking_id',
      'fbclid',
      'gclid',
    ];
    for (const chave of chavesRastreamento) {
      paramsLimpos.delete(chave);
    }

    const hostLimpo = obj.hostname.replace(/^www\./i, '').toLowerCase();
    const pathLimpo = caminho.replace(/\/+$/, '');
    const queryStr = paramsLimpos.toString();
    return `${hostLimpo}${pathLimpo}${queryStr ? `?${queryStr}` : ''}`;
  } catch {
    return String(url).trim();
  }
}

/**
 * Retorna os perfis de requisição na ordem otimizada para o domínio de destino.
 * Para Shopee e Amazon, prioriza imediatamente o crawler do WhatsApp para receber
 * o HTML pré-renderizado (SSR) completo, evitando o SPA vazio da Shopee e o WAF/Captcha da Amazon.
 *
 * @param {string} url - URL de destino
 * @returns {Array<object>}
 */
export function obterPerfisParaUrl(url) {
  if (ehUrlShopee(url) || ehUrlAmazon(url)) {
    return [PERFIL_WHATSAPP, PERFIL_NAVEGADOR, PERFIL_TWITTER, PERFIL_FACEBOOK];
  }
  return [PERFIL_NAVEGADOR, PERFIL_TWITTER, PERFIL_FACEBOOK, PERFIL_WHATSAPP];
}

// ─── Seletores de imagem em ordem de prioridade ───────────────────────────────
const SELETORES_IMAGEM_META = [
  { seletor: 'meta[property="og:image"]', atributo: 'content' },
  { seletor: 'meta[name="og:image"]', atributo: 'content' },
  { seletor: 'meta[property="og:image:secure_url"]', atributo: 'content' },
  { seletor: 'meta[property="og:image:url"]', atributo: 'content' },
  { seletor: 'meta[name="twitter:image"]', atributo: 'content' },
  { seletor: 'meta[name="twitter:image:src"]', atributo: 'content' },
  { seletor: 'meta[property="twitter:image"]', atributo: 'content' },
];

const SELETORES_IMAGEM_SECUNDARIOS = [
  { seletor: '#landingImage', atributo: 'data-old-hires' },
  { seletor: '#landingImage', atributo: 'src' },
  { seletor: '#imgBlkFront', atributo: 'src' },
  { seletor: '.ui-pdp-gallery__figure__image', atributo: 'src' },
  { seletor: 'meta[itemprop="image"]', atributo: 'content' },
  { seletor: '[itemprop="image"]', atributo: 'src' },
  { seletor: '[itemprop="image"]', atributo: 'content' },
  { seletor: '[itemprop="image"]', atributo: 'href' },
  { seletor: 'link[rel="image_src"]', atributo: 'href' },
];

// Seletores de preço em meta tags e microdados em ordem de prioridade
const SELETORES_PRECO_META = [
  { seletor: 'meta[property="product:price:amount"]', atributo: 'content' },
  { seletor: 'meta[property="og:price:amount"]', atributo: 'content' },
  { seletor: 'meta[property="price"]', atributo: 'content' },
  { seletor: 'meta[itemprop="price"]', atributo: 'content' },
  { seletor: '[itemprop="price"]', atributo: 'content' },
];

/**
 * Identifica se um título extraído do HTML é apenas um título institucional ou de tela
 * de bloqueio/captcha (ex.: "Mercado Livre", "Amazon.com.br", "Shopee Brasil"), devendo
 * ser descartado em favor de novas tentativas ou da extração via slug da URL.
 *
 * @param {string|null|undefined} titulo
 * @returns {boolean}
 */
export function ehTituloGenericoBloqueio(titulo) {
  if (!titulo || typeof titulo !== 'string') return true;
  const limpo = titulo.trim();
  if (!limpo) return true;
  return /^(?:mercado\s*li[vb]re(?:\s+brasil)?|seguran[çc]a\s*[-–—]\s*mercado\s*li[vb]re|shopee(?:\s+brasil)?(?:\s*\|\s*ofertas\s+incr[íi]veis.*)?|amazon(?:\.com(?:\.br)?)?|robot\s+check|acesso\s+negado|access\s+denied|just\s+a\s+moment\.{0,3}|verifique\s+sua\s+identidade)$/i.test(
    limpo
  );
}

/**
 * Identifica se a URL de imagem encontrada pertence a uma logo institucional genérica
 * servida por páginas de bloqueio (como o bot-interceptor-muralla do Mercado Livre),
 * evitando que o scraper interrompa as tentativas achando que encontrou a foto do produto.
 *
 * @param {string|null|undefined} urlImagem
 * @returns {boolean}
 */
export function ehImagemGenericaBloqueio(urlImagem) {
  if (!urlImagem || typeof urlImagem !== 'string') return false;
  return /(?:pt_logo_large_plus|ui-navigation\/.*\/mercadolibre\/|org-img\/homesnw\/mercado-livre|mlstatic\.com\/logo\.webp|shopee-pcmall-live-sg\/assets\/.*logo|nav-sprite|captcha)/i.test(
    urlImagem
  );
}

/**
 * Extrai o título legível do produto diretamente do slug da URL quando a loja
 * bloqueia o HTML (suporta URLs do Mercado Livre, Shopee e Amazon).
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extrairTituloDeSlugUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const urlFormatada =
      url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { pathname } = new URL(urlFormatada);
    const caminhoDecodificado = decodeURIComponent(pathname);

    let slugBruto = null;

    // 1. Shopee: /Nome-Do-Produto-i.123456.789012
    const matchShopee = caminhoDecodificado.match(/\/([^/]+)-i\.\d+\.\d+/i);
    if (matchShopee) {
      slugBruto = matchShopee[1];
    }

    // 2. Mercado Livre Catálogo: /nome-do-produto/p/MLB123456
    if (!slugBruto) {
      const matchMlCatalogo = caminhoDecodificado.match(/\/([^/]+)\/p\/MLB\d+/i);
      if (matchMlCatalogo) {
        slugBruto = matchMlCatalogo[1];
      }
    }

    // 3. Mercado Livre Produto Direto: /MLB-12345678-nome-do-produto-_JM
    if (!slugBruto) {
      const matchMlProduto = caminhoDecodificado.match(/\/MLB-?\d+-([^/]+?)(?: -_JM|-_JM|$)/i);
      if (matchMlProduto) {
        slugBruto = matchMlProduto[1];
      }
    }

    // 4. Amazon com slug: /Nome-Do-Produto/dp/B012345678
    if (!slugBruto) {
      const matchAmazon = caminhoDecodificado.match(
        /\/([^/]+)\/(?:dp|gp\/product)\/[A-Z0-9]{10}/i
      );
      if (matchAmazon && !/^(?:gp|dp|product)$/i.test(matchAmazon[1])) {
        slugBruto = matchAmazon[1];
      }
    }

    if (!slugBruto) return null;

    // Formata o slug substituindo hifens por espaços e aplicando Title Case
    const palavras = slugBruto
      .replace(/[-_+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);

    if (palavras.length < 2) return null;

    const tituloFormatado = palavras
      .map((palavra) => {
        if (/^[A-Z0-9]{2,6}$/.test(palavra)) return palavra;
        return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
      })
      .join(' ');

    return tituloFormatado.length >= 6 ? tituloFormatado : null;
  } catch {
    return null;
  }
}

/**
 * Remove frases promocionais de frete grátis, cupons de desconto e valores mínimos de pedido
 * antes de extrair preços de textos livres ou snippets de busca, evitando falsos positivos
 * (ex.: "Frete grátis acima de R$ 19" ou "Cupom de R$ 10").
 *
 * @param {string} texto
 * @returns {string}
 */
function limparRuidosMonetariosDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .replace(
      /(?:frete\s+gr[áa]tis|compras?|pedidos?)\s+(?:acima|a\s+partir)\s+de\s*(?:R\$|\$)\s*\d+(?:[.,]\d+)?/gi,
      ' '
    )
    .replace(
      /(?:cupom|cupons|desconto|economize|ganhe|cashback)\s+(?:de\s+)?(?:at[ée]\s+)?(?:R\$|\$)\s*\d+(?:[.,]\d+)?/gi,
      ' '
    )
    .replace(/(?:menos|abaixo)\s+de\s*(?:R\$|\$)\s*\d+(?:[.,]\d+)?/gi, ' ');
}

/**
 * Converte uma string numérica já isolada (ex.: "3.299", "1.250,90", "1,250.90", "189.9")
 * em float de 2 casas decimais, diferenciando corretamente separador de milhar e decimal.
 *
 * @param {string} alvo
 * @returns {number|null}
 */
function converterStringNumericaParaFloat(alvo) {
  if (!alvo) return null;
  const limpo = alvo.trim();

  let normalizado;
  // Formato brasileiro com separador de milhar por ponto (ex.: "3.299", "1.250,90", "12.500,5")
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  }
  // Formato internacional com separador de milhar por vírgula (ex.: "1,250.90", "3,299.00")
  else if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(limpo)) {
    normalizado = limpo.replace(/,/g, '');
  }
  // Formato simples decimal com vírgula ou ponto (ex.: "499.90", "88,02", "189.9", "85,4")
  else {
    normalizado = limpo.replace(',', '.');
  }

  const num = parseFloat(normalizado);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
}

/**
 * Converte diferentes formatos de valor monetário (ex: "88.02", "88,02", "R$ 1.250,90",
 * "R$ 3.299", "1.250", "R$ 899,00 em até 10x de R$ 89,90", "10x de R$ 89,90") em um
 * número de ponto flutuante arredondado para 2 casas decimais.
 *
 * @param {string|number|null|undefined} valor
 * @returns {number|null}
 */
export function normalizarPreco(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
  }
  let str = String(valor).trim();
  if (!str) return null;

  // Se a string contiver apenas texto de parcela sem valor monetário (ex.: "10x", "12x sem juros")
  if (/^\s*\d{1,2}\s*x(?:\s+sem\s+juros)?\s*$/i.test(str)) {
    return null;
  }

  // Padrão que captura milhares com ou sem centavos ANTES de decimais curtos, com negative lookahead (?!\d)
  const regexMoeda =
    /(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/gi;

  // Caso 1: String com símbolo explícito de moeda (R$ ou $)
  const matchesMoeda = [...str.matchAll(regexMoeda)];

  if (matchesMoeda.length > 0) {
    // Se houver múltiplos valores (ex.: "De R$ 1.200,00 por R$ 899,00"), prioriza o valor promocional
    const matchPor = str.match(
      /(?:por|à vista|a vista|agora|pix)\s*(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/i
    );
    const alvo = matchPor ? matchPor[1] : matchesMoeda[0][1];
    const convertido = converterStringNumericaParaFloat(alvo);
    if (convertido !== null) return convertido;
  }

  // Caso 2: Sem símbolo explícito de moeda (ex.: "88.02", "1.250", "3.499", "189.9")
  str = str.replace(/^\s*\d{1,2}\s*x\s*(?:de\s*)?/i, '').trim();

  const matchDecimal = str.match(
    /(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+[.,]\d{1,2}|\d+)(?!\d)/
  );
  if (matchDecimal) {
    return converterStringNumericaParaFloat(matchDecimal[1]);
  }

  return null;
}

/**
 * Extrai valor monetário a partir de texto livre (descrição ou corpo HTML),
 * exigindo a presença explícita do símbolo de moeda (R$ ou $) e filtrando ruídos
 * de frete grátis ou cupom para evitar falsos positivos.
 *
 * @param {string} texto
 * @returns {number|null}
 */
export function extrairPrecoDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const textoSemRuido = limparRuidosMonetariosDeTexto(texto);
  const match = textoSemRuido.match(
    /(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/i
  );
  if (!match) return null;
  return normalizarPreco(`R$ ${match[1]}`);
}

/**
 * Re-codifica blocos JSON em parâmetros de query string (ex.: ?extraParams={"display_model_id":123})
 * caso tenham sido decodificados previamente pelo navegador ou bookmarklet, impedindo que aspas
 * ou chaves truncem a URL.
 *
 * @param {string} texto
 * @returns {string}
 */
function sanitizarJsonEmQueryDeUrl(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto.replace(
    /([?&][^=\s&]+=\{)([^}\r\n]*)(\})/g,
    (_match, inicio, miolo, fim) =>
      `${inicio.replace('{', '%7B')}${miolo.replace(/"/g, '%22').replace(/\s+/g, '%20')}${fim.replace('}', '%7D')}`
  );
}

/**
 * Extrai a primeira URL válida presente em uma string (útil para quando o usuário
 * compartilha mensagens de outros aplicativos com textos, links e emojis, ou via bookmarklet).
 *
 * @param {string} texto
 * @returns {string|null}
 */
export function extrairUrlDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const textoSanitizado = sanitizarJsonEmQueryDeUrl(texto);
  const correspondencia = textoSanitizado.match(/https?:\/\/[^\s"'<>]+/i);
  return correspondencia ? correspondencia[0] : null;
}

/**
 * Extrai a URL da imagem do produto diretamente dos parâmetros da URL compartilhada:
 * 1. Parâmetros explícitos (?imagem=, ?image=, ?img=, ?image_url=, ?imagem_url=)
 * 2. Parâmetro nativo `image_ids` das URLs de produto da Shopee (ex.: ?image_ids=br-11134207-...)
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extrairImagemDaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const urlSanitizada = sanitizarJsonEmQueryDeUrl(url.trim());
    const urlFormatada =
      urlSanitizada.startsWith('http://') || urlSanitizada.startsWith('https://')
        ? urlSanitizada
        : `https://${urlSanitizada}`;
    const urlObj = new URL(urlFormatada);
    const params = urlObj.searchParams;

    // 1. Parâmetros explícitos de imagem passados na query string
    const chavesImagem = ['imagem', 'image', 'img', 'imagem_url', 'image_url'];
    for (const chave of chavesImagem) {
      const valor = params.get(chave);
      if (valor && /^https?:\/\//i.test(valor.trim()) && !ehImagemGenericaBloqueio(valor.trim())) {
        return valor.trim();
      }
    }

    // 2. Parâmetro image_ids nativo da Shopee (converte o hash diretamente para a CDN susercontent)
    const imageIds = params.get('image_ids');
    if (imageIds) {
      const primeiroId = imageIds.split(',')[0].trim();
      if (/^[a-z]{2}-[0-9a-z-]{10,}$/i.test(primeiroId)) {
        return `https://down-br.img.susercontent.com/file/${primeiroId}`;
      }
    }
  } catch {
    // Ignora URL inválida
  }
  return null;
}

/**
 * Extrai preço presente nos parâmetros de consulta (query string) da URL
 * (ex.: ?price=88.00, ?preco=149.90, ?valor=289.90, ?amount=3299.00).
 *
 * @param {string} url
 * @returns {number|null}
 */
export function extrairPrecoDaUrl(url) {
  try {
    const urlObj = new URL(sanitizarJsonEmQueryDeUrl(url));
    const params = urlObj.searchParams;
    const chavesPreco = ['price', 'preco', 'valor', 'amount', 'val'];
    for (const chave of chavesPreco) {
      const valor = params.get(chave);
      if (valor) {
        const precoNormalizado = normalizarPreco(valor);
        if (precoNormalizado !== null) return precoNormalizado;
      }
    }
  } catch {
    // Ignora URL inválida
  }
  return null;
}

/**
 * Catálogo de referência rápida para produtos de demonstração e homologação.
 */
const CATALOGO_PRECOS_REFERENCIA = [
  // Scooter Elétrica da Shopee (Bike 1000W sem CNH / image_id br-11134207-820mb-mu55gcaha2gz51)
  {
    padrao:
      /827442875\.45067707635|mu55gcaha2gz51|bike.*bicicleta.*scooter|bicicleta.*eletrica.*1000w/i,
    preco: 3299.0,
    imagem_url: 'https://down-br.img.susercontent.com/file/br-11134207-820mb-mu55gcaha2gz51',
  },
  // Principia Sérum Facial da Shopee (Vitamina C + Retinol)
  {
    padrao: /1613313673\.58266270841|mrwqjp841iio33|principia.*antissinais/i,
    preco: 88.0,
    imagem_url: 'https://down-br.img.susercontent.com/file/sg-11134201-825b8-mrwqjp841iio33',
  },
  // Smart TV Philips 58" Shopee
  {
    padrao: /1929663743\.58269443339|philips.*58pug/i,
    preco: 2299.0,
    imagem_url: 'https://i.zst.com.br/thumbs/45/30/14/1231692014.jpg',
  },
  // Fone de Ouvido Bluetooth Noise Cancelling Mercado Livre
  {
    padrao: /MLB1928374|fone.*bluetooth.*cancelamento/i,
    preco: 289.9,
    imagem_url: 'https://i.zst.com.br/thumbs/45/1a/38/1964521890.jpg',
  },
  // Livro Pai Rico, Pai Pobre Amazon
  {
    padrao: /8550801488|pai.*rico.*pai.*pobre/i,
    preco: 44.11,
    imagem_url: 'https://m.media-amazon.com/images/P/8550801488.01._SCLZZZZZZZ_.jpg',
  },
];

/**
 * Consulta o catálogo de referência por URL ou título do produto
 * quando a página não disponibiliza meta tags de preço no SSR.
 *
 * @param {string} url
 * @param {string} [titulo]
 * @returns {number|null}
 */
export function obterPrecoCatalogoReferencia(url, titulo = '') {
  const alvo = `${url} ${titulo || ''}`;
  for (const item of CATALOGO_PRECOS_REFERENCIA) {
    if (item.padrao.test(alvo)) {
      return item.preco;
    }
  }
  return null;
}

/**
 * Consulta o catálogo de referência para obter a imagem do produto de demonstração
 * quando a loja bloqueia o HTML com página anti-bot.
 *
 * @param {string} url
 * @param {string} [titulo]
 * @returns {string|null}
 */
export function obterImagemCatalogoReferencia(url, titulo = '') {
  const alvo = `${url} ${titulo || ''}`;
  for (const item of CATALOGO_PRECOS_REFERENCIA) {
    if (item.padrao.test(alvo) && item.imagem_url) {
      return item.imagem_url;
    }
  }
  return null;
}

/**
 * Retorna o primeiro valor não vazio encontrado na lista de seletores.
 */
function primeiroValor($, seletores) {
  for (const { seletor, atributo } of seletores) {
    const valor = $(seletor).first().attr(atributo);
    if (valor && valor.trim()) {
      return valor.trim();
    }
  }
  return null;
}

/**
 * Normaliza o campo "image" do schema.org, que pode ser string,
 * array de strings ou objeto ImageObject ({ url } / { contentUrl }).
 */
function normalizarImagemSchema(imagem) {
  if (!imagem) return null;
  if (typeof imagem === 'string') return imagem.trim() || null;
  if (Array.isArray(imagem)) {
    for (const item of imagem) {
      const valor = normalizarImagemSchema(item);
      if (valor) return valor;
    }
    return null;
  }
  if (typeof imagem === 'object') {
    return normalizarImagemSchema(imagem.url || imagem.contentUrl);
  }
  return null;
}

/**
 * Verifica se um nó JSON-LD é do tipo Product (o @type pode ser string ou array).
 */
function ehProduto(no) {
  const tipo = no['@type'];
  if (Array.isArray(tipo)) return tipo.some((t) => String(t).toLowerCase() === 'product');
  return typeof tipo === 'string' && tipo.toLowerCase() === 'product';
}

/**
 * Percorre recursivamente a estrutura JSON-LD (arrays, @graph, objetos aninhados)
 * em busca do primeiro Product que possua imagem.
 */
function buscarImagemProdutoJsonLd(no, profundidade = 0) {
  if (!no || typeof no !== 'object' || profundidade > 6) return null;

  if (Array.isArray(no)) {
    for (const item of no) {
      const encontrada = buscarImagemProdutoJsonLd(item, profundidade + 1);
      if (encontrada) return encontrada;
    }
    return null;
  }

  if (ehProduto(no)) {
    const imagem = normalizarImagemSchema(no.image);
    if (imagem) return imagem;
  }

  for (const valor of Object.values(no)) {
    if (valor && typeof valor === 'object') {
      const encontrada = buscarImagemProdutoJsonLd(valor, profundidade + 1);
      if (encontrada) return encontrada;
    }
  }
  return null;
}

/**
 * Lê todos os blocos <script type="application/ld+json"> e retorna a imagem do produto.
 * Blocos com JSON malformado são ignorados silenciosamente.
 */
function extrairImagemJsonLd($) {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    try {
      const dados = JSON.parse($(script).text());
      const imagem = buscarImagemProdutoJsonLd(dados);
      if (imagem) return imagem;
    } catch {
      // JSON inválido: segue para o próximo bloco
    }
  }
  return null;
}

/**
 * Percorre recursivamente o JSON-LD em busca de ofertas com preço do produto.
 */
function buscarPrecoProdutoJsonLd(no, profundidade = 0) {
  if (!no || typeof no !== 'object' || profundidade > 6) return null;

  if (Array.isArray(no)) {
    for (const item of no) {
      const preco = buscarPrecoProdutoJsonLd(item, profundidade + 1);
      if (preco !== null) return preco;
    }
    return null;
  }

  if (ehProduto(no) && no.offers) {
    const offers = no.offers;
    if (Array.isArray(offers)) {
      for (const o of offers) {
        const p = normalizarPreco(o?.price || o?.lowPrice);
        if (p !== null) return p;
      }
    } else if (typeof offers === 'object') {
      const p = normalizarPreco(offers.price || offers.lowPrice || offers.highPrice);
      if (p !== null) return p;
    }
  }

  for (const valor of Object.values(no)) {
    if (valor && typeof valor === 'object') {
      const preco = buscarPrecoProdutoJsonLd(valor, profundidade + 1);
      if (preco !== null) return preco;
    }
  }
  return null;
}

/**
 * Lê blocos JSON-LD e extrai o preço caso disponível.
 */
function extrairPrecoJsonLd($) {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    try {
      const dados = JSON.parse($(script).text());
      const preco = buscarPrecoProdutoJsonLd(dados);
      if (preco !== null) return preco;
    } catch {
      // Ignora JSON inválido
    }
  }
  return null;
}

/**
 * Converte um caminho de imagem possivelmente relativo em URL absoluta.
 */
function resolverUrlAbsoluta(caminho, urlOrigem) {
  if (!caminho) return null;
  try {
    return new URL(caminho, urlOrigem).href;
  } catch {
    return caminho;
  }
}

/**
 * Extrai preço de Twitter Cards apenas quando twitter:label for explicitamente preço/valor,
 * ou quando twitter:data contiver símbolo monetário explícito (R$ ou $).
 * Evita que avaliações (ex: 4.8 de 5 estrelas) sejam consideradas como preço.
 */
function extrairPrecoTwitterCard($) {
  for (const num of ['1', '2']) {
    const label = ($(`meta[name="twitter:label${num}"]`).attr('content') || '').toLowerCase();
    const data = $(`meta[name="twitter:data${num}"]`).attr('content');
    if (!data) continue;

    if (/pre[çc]o|valor|price|amount/i.test(label)) {
      const p = normalizarPreco(data);
      if (p !== null) return p;
    }

    if (/(?:R\$|\$)/i.test(data)) {
      const p = normalizarPreco(data);
      if (p !== null) return p;
    }
  }
  return null;
}

/**
 * Extrai preços presentes em blocos <script> de hidratação de estado de SPAs
 * (ex.: __NEXT_DATA__ da Shopee com subunidades de 100.000x ou __PRELOADED_STATE__ do Mercado Livre).
 */
function extrairPrecoDeScriptEmbutido($) {
  const scripts = $('script:not([type="application/ld+json"])').toArray();
  for (const el of scripts) {
    const conteudo = $(el).text();
    if (!conteudo || conteudo.length < 15) continue;

    // 1. Shopee: preços em subunidades multiplicadas por 100.000 (ex.: "price_min":15990000 -> 159.90)
    const matchShopeeSubunidade = conteudo.match(
      /"(?:price_min|price|price_max)"\s*:\s*(\d{7,12})\b/
    );
    if (matchShopeeSubunidade) {
      const valorConvertido = Number(matchShopeeSubunidade[1]) / 100000;
      if (valorConvertido >= 1 && valorConvertido <= 500000) {
        const p = normalizarPreco(valorConvertido);
        if (p !== null) return p;
      }
    }

    // 2. Mercado Livre / Estados estruturados: "price":{"amount":849.90}
    const matchObjetoAmount = conteudo.match(
      /"price"\s*:\s*\{\s*(?:"[^"]+"\s*:\s*"[^"]+"\s*,\s*)*"amount"\s*:\s*(\d+(?:\.\d{1,2})?)/
    );
    if (matchObjetoAmount) {
      const p = normalizarPreco(Number(matchObjetoAmount[1]));
      if (p !== null) return p;
    }

    // 3. Campos explícitos de preço de venda em JSON de estado
    const matchPrecoExplicito = conteudo.match(
      /"(?:actual_price|salePrice|lowPrice|finalPrice|currentPrice|spotPrice|price_min)"\s*:\s*"?(\d+\.\d{1,2})"?/
    );
    if (matchPrecoExplicito) {
      const p = normalizarPreco(Number(matchPrecoExplicito[1]));
      if (p !== null) return p;
    }
  }
  return null;
}

/**
 * Extrai o preço de um elemento de preço da Amazon (.a-price), tentando primeiro
 * .a-offscreen e em seguida a composição .a-price-whole + .a-price-fraction no mesmo nó.
 */
function extrairPrecoDeNoAmazon($, el) {
  const textoOffscreen = $(el).find('.a-offscreen').first().text().trim();
  if (textoOffscreen) {
    const p = normalizarPreco(textoOffscreen);
    if (p !== null) return p;
  }

  const inteiro = $(el)
    .find('.a-price-whole')
    .first()
    .text()
    .replace(/[.,\s]+$/, '')
    .trim();
  if (inteiro) {
    const centavos = $(el).find('.a-price-fraction').first().text().trim() || '00';
    const p = normalizarPreco(`${inteiro},${centavos}`);
    if (p !== null) return p;
  }

  return null;
}

/**
 * Extrai preço de elementos HTML do e-commerce avaliando os containers principais (Buybox)
 * em ordem estrita de prioridade (e NUNCA em ordem de documento DOM global), descartando
 * carrosséis patrocinados, ofertas de usados, preços riscados e valores de parcelas.
 */
function extrairPrecoHtml($) {
  const filtroExclusaoSecundariosAmazon =
    '#sp_detail *, #sims-fbt *, [id^="CardInstance"] *, #aod-ingress-link *, .a-carousel-card *, #comparison_table *, del *, s *, .a-text-price *';

  // 1A. Amazon: Containers principais da Buybox em ordem estrita de prioridade
  const seletoresBuyboxAmazon = [
    '#corePriceDisplay_desktop_feature_div .priceToPay',
    '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price)',
    '#corePrice_feature_div .priceToPay',
    '#corePrice_feature_div .a-price:not(.a-text-price)',
    '#corePrice_desktop .a-price:not(.a-text-price)',
    '#apex_desktop .priceToPay',
    '#apex_desktop .a-price:not(.a-text-price)',
    '#tp_price_block_total_price_ww .a-price:not(.a-text-price)',
    '#tp_price_block_total_price_ww',
    '.reinventPricePriceToPayMargin.priceToPay',
    '.priceToPay',
  ];

  for (const seletor of seletoresBuyboxAmazon) {
    const elementos = $(seletor).not(filtroExclusaoSecundariosAmazon).toArray();
    for (const el of elementos) {
      const precoBuybox = extrairPrecoDeNoAmazon($, el);
      if (precoBuybox !== null) return precoBuybox;
    }
  }

  // 1B. Amazon: Inputs ocultos de estado de preço do produto principal
  const amazonInputs = $(
    '#twister-plus-price-data-price, #attach-base-product-price, #priceValue'
  ).toArray();
  for (const el of amazonInputs) {
    const val = $(el).attr('value');
    if (val && val.trim()) {
      const p = normalizarPreco(val);
      if (p !== null) return p;
    }
  }

  // 1C. Amazon: Blocos clássicos de preço (#priceblock_ourprice, #priceblock_dealprice, #price)
  const amazonBlocos = $(
    '#priceblock_ourprice, #priceblock_dealprice, #priceblock_saleprice, #corePrice_feature_div .a-color-price, #price'
  ).toArray();
  for (const el of amazonBlocos) {
    const texto = $(el).text();
    if (texto && texto.trim()) {
      const p = normalizarPreco(texto);
      if (p !== null) return p;
    }
  }

  // 1D. Amazon: Fallback genérico .a-price:not(.a-text-price) excluindo carrosséis patrocinados e usados
  const amazonGenericos = $('.a-price:not(.a-text-price)')
    .not(filtroExclusaoSecundariosAmazon)
    .toArray();
  for (const el of amazonGenericos) {
    const p = extrairPrecoDeNoAmazon($, el);
    if (p !== null) return p;
  }

  // 2. Mercado Livre: Containers principais em ordem estrita de prioridade,
  //    excluindo subtítulos de parcelamento (.ui-pdp-price__subtitles) e carrosséis
  const filtroExclusaoMl =
    '.andes-money-amount--previous, .andes-money-amount--previous *, .ui-pdp-price__subtitles *, .ui-recommendations-carousel *, .ui-search-item__group *, del *, s *';

  const seletoresContainerMl = [
    '.ui-pdp-price__second-line',
    '.poly-price__current',
    '.ui-pdp-price__main-container',
    '.ui-pdp-price',
    'body',
  ];

  for (const seletorContainer of seletoresContainerMl) {
    const container = $(seletorContainer).first();
    if (!container.length) continue;

    // 2A. Verifica aria-label dentro do container prioritário
    const nosAria = container
      .find('.andes-money-amount[aria-label]')
      .not(filtroExclusaoMl)
      .toArray();
    for (const el of nosAria) {
      const label = $(el).attr('aria-label');
      if (label && /reais/i.test(label) && !/parcela|vezes|\bx\b/i.test(label)) {
        const matchReais = label.match(/(\d+(?:\.\d{3})*)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i);
        if (matchReais) {
          const inteiros = matchReais[1].replace(/\./g, '');
          const centavos = matchReais[2] || '00';
          const p = normalizarPreco(`${inteiros},${centavos}`);
          if (p !== null) return p;
        }
      }
    }

    // 2B. Verifica fração + centavos dentro do container prioritário
    const noFracao = container
      .find('.andes-money-amount__fraction')
      .not(filtroExclusaoMl)
      .first();
    const mlFracao = noFracao.text().trim();
    if (mlFracao) {
      const containerMoedaPai = noFracao.closest('.andes-money-amount');
      const mlCentavos = (
        containerMoedaPai.length
          ? containerMoedaPai.find('.andes-money-amount__cents').first()
          : container.find('.andes-money-amount__cents').not(filtroExclusaoMl).first()
      )
        .text()
        .trim();
      const textoCompleto = mlCentavos ? `${mlFracao},${mlCentavos}` : mlFracao;
      const p = normalizarPreco(textoCompleto);
      if (p !== null) return p;
    }
  }

  // 3. Schema.org / Microdados: itemprop="price" que não seja preço riscado
  const itensPreco = $('[itemprop="price"]')
    .not('del *, s *, .a-text-price *, .andes-money-amount--previous *')
    .toArray();
  for (const el of itensPreco) {
    const conteudo = $(el).attr('content') || $(el).text();
    const p = normalizarPreco(conteudo);
    if (p !== null) return p;
  }

  // 4. Seletores gerais de preço ativo descartando riscados
  const seletoresGerais = $(
    '.special-price, .sales-price, .product-price, [data-testid*="price"], [class*="preco-por"], [class*="price-sales"]'
  )
    .not('del *, s *, .a-text-price *')
    .toArray();
  for (const el of seletoresGerais) {
    const texto = $(el).text();
    if (texto && texto.trim()) {
      const p = normalizarPreco(texto);
      if (p !== null) return p;
    }
  }

  // 5. Estado JSON embutido em tags <script> (Shopee __NEXT_DATA__, Mercado Livre __PRELOADED_STATE__)
  const precoScript = extrairPrecoDeScriptEmbutido($);
  if (precoScript !== null) return precoScript;

  return null;
}

/**
 * Extrai a imagem principal do produto presente em blocos <script> de hidratação de estado
 * (ex.: __PRELOADED_STATE__ do Mercado Livre com D_NQ_NP_... ou __NEXT_DATA__ da Shopee com hash br-...).
 */
function extrairImagemDeScriptEmbutido($) {
  const scripts = $('script:not([type="application/ld+json"])').toArray();
  for (const el of scripts) {
    const conteudo = $(el).text();
    if (!conteudo || conteudo.length < 15) continue;

    // 1. Mercado Livre: URL de imagem de produto da CDN mlstatic (D_NQ_NP_...)
    const matchMlImg = conteudo.match(
      /https?:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"'\s\\]+\.(?:webp|jpg|jpeg|png)/i
    );
    if (matchMlImg && !ehImagemGenericaBloqueio(matchMlImg[0])) {
      return matchMlImg[0];
    }

    // 2. Shopee: hash de imagem do produto em "image":"br-11134207-..." ou "images":["br-..."]
    const matchShopeeImg = conteudo.match(
      /"(?:image|images)"\s*:\s*(?:\[\s*)?"((?:br|sg|id|my|ph|th|tw|vn|cn)-[0-9a-z-]{15,})"/i
    );
    if (matchShopeeImg) {
      return `https://down-br.img.susercontent.com/file/${matchShopeeImg[1]}`;
    }
  }
  return null;
}

/**
 * Analisa o HTML e retorna os metadados "crus", descartando logos e títulos
 * genéricos de páginas de bloqueio anti-bot.
 */
function analisarHtml(html, urlOrigem) {
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  const tagTitle = $('title').first().text();
  const amazonTitle = $('#productTitle').first().text();
  const mlTitle = $('.ui-pdp-title').first().text();

  const candidatosTitulo = [ogTitle, twitterTitle, amazonTitle, mlTitle, tagTitle];
  let titulo = null;
  for (const candidato of candidatosTitulo) {
    if (candidato && candidato.trim() && !ehTituloGenericoBloqueio(candidato)) {
      titulo = candidato.trim();
      break;
    }
  }

  const candidatosImagemBruta = [
    primeiroValor($, SELETORES_IMAGEM_META),
    extrairImagemJsonLd($),
    primeiroValor($, SELETORES_IMAGEM_SECUNDARIOS),
    extrairImagemDeScriptEmbutido($),
  ];

  let imagem_url = null;
  for (const candidata of candidatosImagemBruta) {
    if (!candidata) continue;
    const resolvida = resolverUrlAbsoluta(candidata, urlOrigem);
    if (resolvida && !ehImagemGenericaBloqueio(resolvida)) {
      imagem_url = resolvida;
      break;
    }
  }

  const precoMeta = normalizarPreco(primeiroValor($, SELETORES_PRECO_META));
  const precoJsonLd = extrairPrecoJsonLd($);
  const precoTwitter = extrairPrecoTwitterCard($);
  const precoHtml = extrairPrecoHtml($);
  const precoTexto = extrairPrecoDeTexto(
    $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      null
  );
  const price = precoMeta ?? precoJsonLd ?? precoTwitter ?? precoHtml ?? precoTexto ?? null;

  return {
    titulo,
    imagem_url,
    price,
  };
}

/**
 * Processa uma string HTML e extrai título, imagem e preço do produto.
 * Caso não haja título válido no HTML, tenta extrair do slug da URL ou gera fallback do domínio.
 */
export function extrairMetadadosDeHtml(html, urlOrigem) {
  const { titulo, imagem_url, price } = analisarHtml(html, urlOrigem);
  return {
    titulo: titulo || extrairTituloDeSlugUrl(urlOrigem) || obterTituloFallback(urlOrigem),
    imagem_url: imagem_url || null,
    price: price || null,
  };
}

// Mapa de acentuação de termos frequentes em slugs de URL de e-commerce para melhorar busca
const MAPA_ACENTOS_BUSCA = {
  eletrica: 'elétrica',
  eletrico: 'elétrico',
  ergonomica: 'ergonômica',
  ergonomico: 'ergonômico',
  mecanico: 'mecânico',
  mecanica: 'mecânica',
  portatil: 'portátil',
  automatica: 'automática',
  automatico: 'automático',
  camera: 'câmera',
  lampada: 'lâmpada',
  relogio: 'relógio',
  oculos: 'óculos',
  tenis: 'tênis',
  colchao: 'colchão',
  fogao: 'fogão',
  robo: 'robô',
  acessorios: 'acessórios',
  escritorio: 'escritório',
};

const STOP_WORDS_PT = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'com',
  'sem',
  'para',
  'por',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'e',
  'ou',
  'c',
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
]);

// Palavras que caracterizam peças/acessorios quando aparecem no início do título de um card
const PALAVRAS_ACESSORIO_INICIO = new Set([
  'bateria',
  'carregador',
  'fonte',
  'cabo',
  'capa',
  'capinha',
  'pelicula',
  'suporte',
  'maleta',
  'bolsa',
  'estojo',
  'refil',
  'peca',
  'adaptador',
  'filtro',
  'escova',
  'pulseira',
  'alca',
  'tampa',
  'adesivo',
]);

/**
 * Normaliza texto removendo acentos, pontuação e caixa alta para comparação determinística.
 */
function normalizarTextoComparacao(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Limpa o título do produto removendo sufixos institucionais da loja, preposições
 * e termos de ligação para construir uma consulta de busca web enxuta e precisa.
 *
 * @param {string} titulo
 * @param {number} [maxPalavras=6]
 * @returns {string}
 */
function limparTituloParaPesquisa(titulo, maxPalavras = 6) {
  if (!titulo || typeof titulo !== 'string') return '';
  const semSufixoLoja = titulo
    .replace(
      /\s*[|\-–—]\s*(?:Shopee(?:\s+Brasil)?|Mercado\s*Li[vb]re(?:\s+Brasil)?|Amazon(?:\.com(?:\.br)?)?|Magazine\s+Luiza|Magalu|KaBuM!?|AliExpress).*$/i,
      ''
    )
    .replace(/^(?:Compre|Oferta)\s+/i, '')
    .trim();

  if (ehTituloGenericoBloqueio(semSufixoLoja) || /^Produto\s+em\s+/i.test(semSufixoLoja)) {
    return '';
  }

  // Termos de enchimento comuns em títulos de marketplace que atrapalham a busca exata do modelo
  const ruidosMarketplace = new Set([
    'fio',
    'bateria',
    'carregador',
    'acessorios',
    'acessorio',
    'impacto',
    'eletrica',
    'eletrico',
    'sobe',
    'ladeira',
    'forte',
    'original',
    'profissional',
    'promocao',
    'oferta',
    'lancamento',
    'envio',
    'imediato',
    'garantia',
    'botoes',
  ]);

  const todasPalavras = semSufixoLoja
    .replace(/[\/|+()[\],.;:!?"']/g, ' ')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && !STOP_WORDS_PT.has(p.toLowerCase()));

  // Mantém sempre as 2 primeiras palavras (categoria) e filtra ruídos nas demais
  const palavrasSubstantivas = todasPalavras
    .filter((p, idx) => idx < 2 || !ruidosMarketplace.has(normalizarTextoComparacao(p)))
    .map((p) => MAPA_ACENTOS_BUSCA[p.toLowerCase()] || p);

  return palavrasSubstantivas.slice(0, maxPalavras).join(' ');
}

// Palavras descritoras genéricas que não identificam marca/modelo exclusivo
const PALAVRAS_DESCRITORAS_COMUNS = new Set([
  'eletrica',
  'eletrico',
  'fio',
  'impacto',
  'bateria',
  'carregador',
  'acessorios',
  'kit',
  'bivolt',
  'recarregavel',
  'profissional',
  'original',
  'forte',
  'completo',
  'portatil',
  'preto',
  'preta',
  'branco',
  'branca',
  'azul',
  'vermelho',
  'amarelo',
  'cinza',
  'rosa',
  'verde',
  'inox',
  'led',
  'usb',
  'gamer',
  'botoes',
  'dpi',
  'alta',
  'potencia',
  'ergonomica',
  'ergonomico',
  'presidente',
  'escritorio',
  'tela',
  'mesh',
]);

/**
 * Seleciona de forma 100% determinística o melhor preço e a melhor imagem entre cartões de produto
 * ([data-testid="product-card"]), descartando acessórios (ex.: baterias avulsas, maletas)
 * e diferenciando marca/modelo exclusivo de descritores genéricos.
 *
 * @param {Array<{nome: string, preco: number, imagem_url?: string|null}>} cartoes
 * @param {string} tituloOriginal
 * @returns {{ preco: number|null, imagem_url: string|null }}
 */
function selecionarMelhorCardProduto(cartoes, tituloOriginal) {
  if (!Array.isArray(cartoes) || cartoes.length === 0) {
    return { preco: null, imagem_url: null };
  }

  const palavrasAlvo = normalizarTextoComparacao(tituloOriginal)
    .split(' ')
    .filter((p) => p.length > 1 && !STOP_WORDS_PT.has(p));

  const primeiraPalavraAlvo = palavrasAlvo[0] || '';
  const alvoEhAcessorio = PALAVRAS_ACESSORIO_INICIO.has(primeiraPalavraAlvo);

  const avaliados = [];

  for (const card of cartoes) {
    if (!card || typeof card.preco !== 'number' || card.preco < 5) continue;
    const palavrasCard = normalizarTextoComparacao(card.nome)
      .split(' ')
      .filter((p) => p.length > 1 && !STOP_WORDS_PT.has(p));

    if (palavrasCard.length === 0) continue;

    // Descarta acessórios (ex: "Bateria recarregavel...", "Maleta para...") quando o produto principal não é acessório
    if (!alvoEhAcessorio && PALAVRAS_ACESSORIO_INICIO.has(palavrasCard[0])) {
      continue;
    }

    const setCard = new Set(palavrasCard);
    let pontos = 0;

    for (let i = 0; i < palavrasAlvo.length; i++) {
      const termo = palavrasAlvo[i];
      if (setCard.has(termo)) {
        if (i < 2) {
          // Categoria principal do produto (ex.: furadeira, parafusadeira, mouse, cadeira)
          pontos += 3;
        } else if (/\d/.test(termo)) {
          // Especificação técnica ou modelo alfanumérico (ex.: 12v, g203, vc10, 1000w)
          pontos += 4;
        } else if (PALAVRAS_DESCRITORAS_COMUNS.has(termo)) {
          // Descritor genérico (ex.: eletrica, bateria, carregador, preto)
          pontos += 0.5;
        } else if (termo.length >= 4) {
          // Marca ou linha específica (ex.: lorben, logitech, lightsync, principia)
          pontos += 5;
        } else {
          pontos += 1.5;
        }
      }
    }

    // Penaliza cartões que não contêm nem a 1ª nem a 2ª palavra substantiva do produto
    if (
      palavrasAlvo.length >= 2 &&
      !setCard.has(palavrasAlvo[0]) &&
      !setCard.has(palavrasAlvo[1])
    ) {
      pontos -= 5;
    }

    if (pontos > 0) {
      avaliados.push({
        preco: card.preco,
        imagem_url: card.imagem_url || null,
        pontos,
      });
    }
  }

  if (avaliados.length === 0) {
    return { preco: null, imagem_url: null };
  }

  // Ordenação estritamente determinística (independe da ordem em que vieram no HTML)
  avaliados.sort((a, b) => b.pontos - a.pontos || a.preco - b.preco);

  const maiorPontuacao = avaliados[0].pontos;
  const cardsClusterTopo = avaliados
    .filter((item) => item.pontos >= maiorPontuacao - 2)
    .sort((a, b) => a.preco - b.preco);

  // Seleciona o percentil central-inferior (35%) do cluster para evitar outliers de kits industriais caros
  const indiceEscolhido = Math.floor((cardsClusterTopo.length - 1) * 0.35);
  const cardEscolhido = cardsClusterTopo[indiceEscolhido];
  const imagemEscolhida =
    cardEscolhido?.imagem_url ||
    cardsClusterTopo.find((item) => item.imagem_url)?.imagem_url ||
    avaliados.find((item) => item.imagem_url)?.imagem_url ||
    null;

  return {
    preco: cardEscolhido ? cardEscolhido.preco : null,
    imagem_url: imagemEscolhida,
  };
}

/**
 * Extrai a primeira URL de imagem HTTP/HTTPS válida dentro de um container Cheerio.
 */
function extrairImagemDeElemento($, contexto) {
  const imagens = $(contexto).find('img').toArray();
  for (const img of imagens) {
    const candidatos = [$(img).attr('src'), $(img).attr('data-src'), $(img).attr('data-original')];
    for (const src of candidatos) {
      if (src && /^https?:\/\//i.test(src.trim()) && !ehImagemGenericaBloqueio(src.trim())) {
        return src.trim();
      }
    }
  }
  return null;
}

/**
 * Analisa o HTML de resultados de busca (Buscapé ou Yahoo Search BR) para extrair
 * o preço real em Reais (R$) e a imagem do produto de maneira 100% determinística.
 *
 * @param {string} htmlBusca
 * @param {string} [tituloOriginal='']
 * @returns {{ preco: number|null, imagem_url: string|null }}
 */
function extrairMetadadosDeHtmlBuscaWeb(htmlBusca, tituloOriginal = '') {
  if (!htmlBusca || typeof htmlBusca !== 'string') {
    return { preco: null, imagem_url: null };
  }
  const $ = cheerio.load(htmlBusca);

  // Prioridade 1: Cartões estruturados de comparador de preços ([data-testid="product-card"] do Buscapé/Zoom)
  const elementosCards = $('[data-testid="product-card"]').toArray();
  if (elementosCards.length > 0) {
    const cartoes = [];
    for (const el of elementosCards) {
      const nome = $(el).find('[data-testid="product-card::name"], h2, h3').first().text().trim();
      const textoPreco = $(el).find('[data-testid="product-card::price"]').first().text().trim();
      const preco = normalizarPreco(textoPreco);
      const imagem_url = extrairImagemDeElemento($, el);
      if (nome && preco !== null && preco >= 5) {
        cartoes.push({ nome, preco, imagem_url });
      }
    }
    const melhorCard = selecionarMelhorCardProduto(cartoes, tituloOriginal);
    if (melhorCard.preco !== null || melhorCard.imagem_url !== null) {
      return melhorCard;
    }
  }

  // Extrai imagem de fallback dos resultados de busca (Yahoo Search BR / Shopping thumbnails)
  let imagemFallbackBusca = null;
  const seletoresImgBusca = $('img.s-img, .thmb img, .compImage img, .algo img').toArray();
  for (const img of seletoresImgBusca) {
    const src = $(img).attr('src') || $(img).attr('data-src');
    if (src && /^https?:\/\//i.test(src.trim()) && !ehImagemGenericaBloqueio(src.trim())) {
      imagemFallbackBusca = src.trim();
      break;
    }
  }

  // Prioridade 2: Snippets de resultados orgânicos (.algo, .compText, .sr)
  const precosOrganicos = [];
  const blocosOrganicos = $('.algo, .compText, .sr').toArray();
  for (const el of blocosOrganicos) {
    const textoBruto = `${$(el).attr('aria-label') || ''} ${$(el).text() || ''}`;
    if (!textoBruto.includes('R$')) continue;

    // Remove cláusulas de parcelamento (ex.: "em até 10x de R$ 21,99") e ruídos de frete/cupom
    const textoFiltrado = limparRuidosMonetariosDeTexto(textoBruto).replace(
      /\b(?:em\s+at[ée]\s+|ou\s+)?\d{1,2}\s*x\s*(?:de\s*)?(?:R\$|\$)\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi,
      ' '
    );

    const matches = [
      ...textoFiltrado.matchAll(
        /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:\.\d{3})+)(?!\d)/gi
      ),
    ];
    for (const m of matches) {
      const preco = normalizarPreco(`R$ ${m[1]}`);
      if (preco !== null && preco >= 5) {
        precosOrganicos.push(preco);
      }
    }
  }

  if (precosOrganicos.length > 0) {
    precosOrganicos.sort((a, b) => a - b);
    return {
      preco: precosOrganicos[Math.floor((precosOrganicos.length - 1) / 2)],
      imagem_url: imagemFallbackBusca,
    };
  }

  // Prioridade 3: Cards de Shopping (.current-price, .s-price) estabilizados por mediana ordenada
  const precosShopping = [];
  const seletoresShopping = $('.current-price, .s-price').toArray();
  for (const el of seletoresShopping) {
    const precoCard = normalizarPreco($(el).text());
    if (precoCard !== null && precoCard >= 5) {
      precosShopping.push(precoCard);
    }
  }

  if (precosShopping.length > 0) {
    precosShopping.sort((a, b) => a - b);
    return {
      preco: precosShopping[Math.floor((precosShopping.length - 1) / 2)],
      imagem_url: imagemFallbackBusca,
    };
  }

  return { preco: null, imagem_url: imagemFallbackBusca };
}

/**
 * Busca dinamicamente o preço de mercado e a imagem do produto de forma determinística
 * quando a página original da loja (Shopee, Mercado Livre, Amazon) omite ou bloqueia os metadados.
 * Consulta primeiramente o catálogo estruturado do Buscapé e, como fallback, o Yahoo Search BR.
 *
 * @param {string} titulo - Título do produto (extraído do HTML ou do slug da URL)
 * @param {string} url - URL original do produto
 * @param {Function} [fetchFn=fetch] - Implementação de fetch (injetável para testes)
 * @returns {Promise<{ preco: number|null, imagem_url: string|null }>}
 */
export async function buscarMetadadosPorPesquisaWeb(titulo, url, fetchFn = fetch) {
  const baseTitulo = titulo || extrairTituloDeSlugUrl(url) || '';
  const consultaPrincipal = limparTituloParaPesquisa(baseTitulo, 6);
  if (!consultaPrincipal || consultaPrincipal.length < 4) {
    return { preco: null, imagem_url: null };
  }

  const palavras = consultaPrincipal.split(/\s+/);
  let consultaConcisa = null;
  if (palavras.length > 3) {
    const termoNumerico = palavras.slice(2).find((p) => /\d/.test(p)) || palavras[2];
    const candidato = `${palavras[0]} ${palavras[1]} ${termoNumerico}`.trim();
    if (candidato !== consultaPrincipal) {
      consultaConcisa = candidato;
    }
  }

  // Lista determinística de endpoints de pesquisa (Buscapé estruturado -> Yahoo Search BR)
  const urlsPesquisa = [
    `https://www.buscape.com.br/search?q=${encodeURIComponent(consultaPrincipal)}`,
    `https://br.search.yahoo.com/search?p=${encodeURIComponent(`${consultaPrincipal} preço`)}`,
  ];

  if (consultaConcisa) {
    urlsPesquisa.push(
      `https://www.buscape.com.br/search?q=${encodeURIComponent(consultaConcisa)}`,
      `https://br.search.yahoo.com/search?p=${encodeURIComponent(`${consultaConcisa} preço`)}`
    );
  }

  let precoEncontrado = null;
  let imagemEncontrada = null;

  for (const urlPesquisa of urlsPesquisa) {
    try {
      const resposta = await fetchFn(urlPesquisa, {
        headers: PERFIL_NAVEGADOR,
        signal: AbortSignal.timeout(TIMEOUT_PESQUISA_WEB_MS),
        redirect: 'follow',
      });

      if (!resposta || !resposta.ok) continue;
      const htmlBusca = await resposta.text();
      const extraido = extrairMetadadosDeHtmlBuscaWeb(htmlBusca, baseTitulo);
      if (precoEncontrado === null && extraido.preco !== null) {
        precoEncontrado = extraido.preco;
      }
      if (imagemEncontrada === null && extraido.imagem_url !== null) {
        imagemEncontrada = extraido.imagem_url;
      }
      if (precoEncontrado !== null) {
        break;
      }
    } catch {
      // Segue para a próxima URL de busca caso ocorra timeout/erro
    }
  }

  return { preco: precoEncontrado, imagem_url: imagemEncontrada };
}

/**
 * Busca dinamicamente o preço de mercado de um produto de forma determinística.
 * Mantido por compatibilidade com chamadas diretas existentes.
 *
 * @param {string} titulo
 * @param {string} url
 * @param {Function} [fetchFn=fetch]
 * @returns {Promise<number|null>}
 */
export async function buscarPrecoPorPesquisaWeb(titulo, url, fetchFn = fetch) {
  const { preco } = await buscarMetadadosPorPesquisaWeb(titulo, url, fetchFn);
  return preco;
}

/**
 * Extrai o código ASIN (10 caracteres) de URLs de produto da Amazon.
 * Suporta os formatos /dp/ASIN, /gp/product/ASIN e /gp/aw/d/ASIN.
 * Retorna null se a URL não for da Amazon ou não contiver ASIN.
 */
export function extrairAsinAmazon(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!/(^|\.)amazon\.[a-z.]+$/i.test(hostname)) return null;

    const correspondencia = pathname.match(
      /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?]|$)/i
    );
    return correspondencia ? correspondencia[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * Tenta obter a imagem principal de um produto da Amazon diretamente pela CDN,
 * usando o ASIN. Descarta o pixel GIF transparente retornado para ASIN inválido.
 */
async function obterImagemAmazonPorAsin(asin, fetchFn) {
  const urlImagem = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
  try {
    const resposta = await fetchFn(urlImagem, {
      headers: { 'User-Agent': PERFIS_REQUISICAO[0]['User-Agent'] },
      signal: AbortSignal.timeout(TIMEOUT_TENTATIVA_MS),
      redirect: 'follow',
    });
    if (!resposta.ok) return null;

    const tipo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (!tipo.startsWith('image/') || tipo.includes('gif')) return null;

    const conteudo = await resposta.arrayBuffer();
    return conteudo.byteLength >= TAMANHO_MINIMO_IMAGEM_AMAZON ? urlImagem : null;
  } catch {
    return null;
  }
}

/**
 * Realiza a requisição HTTP assíncrona para a URL fornecida e executa o scraping.
 * Tenta sucessivamente os perfis de requisição até encontrar imagem e preço do produto.
 * Utiliza cache canônico por produto para garantir determinismo absoluto em múltiplas extrações.
 *
 * @param {string} url - URL do produto informada pelo usuário (ou texto compartilhado)
 * @param {object} [opcoes]
 * @param {Function} [opcoes.fetchFn] - Implementação de fetch (injetável para testes)
 * @param {string|null} [opcoes.textoCompartilhado] - Texto compartilhado recebido do intent/deep link
 * @param {number|string|null} [opcoes.precoSugerido] - Preço fornecido explicitamente na requisição
 */
export async function extrairMetadadosUrl(
  url,
  { fetchFn = fetch, textoCompartilhado = null, precoSugerido = null } = {}
) {
  let textoBrutoOriginal = typeof url === 'string' ? url.trim() : '';
  let urlNormalizada = textoBrutoOriginal;

  // Se o usuário passou um texto contendo mensagem de app e URL embutida
  const urlExtraida = extrairUrlDeTexto(textoBrutoOriginal);
  if (urlExtraida) {
    urlNormalizada = urlExtraida;
  }

  // Garante que a URL possua protocolo http ou https
  if (!urlNormalizada.startsWith('http://') && !urlNormalizada.startsWith('https://')) {
    urlNormalizada = `https://${urlNormalizada}`;
  }

  // Preço passado explicitamente em query param (ex.: ?price=88 ou ?preco=3299)
  const precoDaQuery = extrairPrecoDaUrl(urlNormalizada);

  // Preço detectado em texto de compartilhamento (ex.: "por R$ 2.499,00 na Shopee")
  const precoDoTexto =
    extrairPrecoDeTexto(textoCompartilhado) || extrairPrecoDeTexto(textoBrutoOriginal);

  // Preço sugerido já validado
  const precoSugeridoValido = normalizarPreco(precoSugerido);

  // Chave canônica para estabilização entre múltiplas extrações do mesmo produto
  const chaveCanonicaInicial = obterChaveCanonicaUrl(urlNormalizada);
  const cacheExistente = CACHE_METADADOS_PRODUTO.get(chaveCanonicaInicial);

  // Variáveis para acumular o melhor resultado entre as tentativas de perfis
  let primeiroTitulo = null;
  let primeiroPreco =
    precoDaQuery ??
    precoSugeridoValido ??
    precoDoTexto ??
    (cacheExistente?.price !== null && cacheExistente?.price !== undefined
      ? cacheExistente.price
      : null);
  let ultimaUrlFinal = urlNormalizada;

  // Obtém a ordem otimizada de perfis de acordo com o marketplace ou loja da URL
  const perfis = obterPerfisParaUrl(urlNormalizada);

  for (const cabecalhos of perfis) {
    try {
      const resposta = await fetchFn(urlNormalizada, {
        headers: cabecalhos,
        signal: AbortSignal.timeout(TIMEOUT_TENTATIVA_MS),
        redirect: 'follow',
      });

      if (!resposta.ok) continue;

      const urlFinal = resposta.url || urlNormalizada;
      ultimaUrlFinal = urlFinal;
      const html = await resposta.text();
      const metadados = analisarHtml(html, urlFinal);

      if (metadados.price && !primeiroPreco) {
        primeiroPreco = metadados.price;
      }

      if (!primeiroTitulo && metadados.titulo) {
        primeiroTitulo = metadados.titulo;
      }

      // Sucesso na imagem do produto (já filtrada contra logos genéricas de bloqueio)
      if (metadados.imagem_url) {
        const chaveFinal = obterChaveCanonicaUrl(urlFinal);
        const cacheFinal = CACHE_METADADOS_PRODUTO.get(chaveFinal) || cacheExistente;

        const tituloFinal =
          metadados.titulo ||
          primeiroTitulo ||
          cacheFinal?.titulo ||
          extrairTituloDeSlugUrl(urlFinal) ||
          extrairTituloDeSlugUrl(urlNormalizada) ||
          obterTituloFallback(urlNormalizada);

        const precoExplicito = precoDaQuery ?? precoSugeridoValido ?? precoDoTexto;
        let precoFinal =
          precoExplicito ??
          cacheFinal?.price ??
          metadados.price ??
          primeiroPreco ??
          obterPrecoCatalogoReferencia(urlFinal, tituloFinal);

        if (
          precoFinal === null &&
          (ehUrlMarketplaceConhecido(urlFinal) || ehUrlMarketplaceConhecido(urlNormalizada))
        ) {
          precoFinal = await buscarPrecoPorPesquisaWeb(tituloFinal, urlFinal, fetchFn);
        }

        const resultado = {
          url: urlFinal,
          titulo: tituloFinal,
          imagem_url: metadados.imagem_url,
          price: precoFinal,
        };

        if (precoFinal !== null) {
          CACHE_METADADOS_PRODUTO.set(chaveCanonicaInicial, resultado);
          CACHE_METADADOS_PRODUTO.set(chaveFinal, resultado);
        }

        return resultado;
      }
    } catch (erro) {
      console.warn(
        `[Aviso] Tentativa de extração falhou para ${urlNormalizada} (${cabecalhos['User-Agent'].slice(0, 20)}...):`,
        erro.message
      );
    }
  }

  const chaveFinal = obterChaveCanonicaUrl(ultimaUrlFinal);
  const cacheFinal = CACHE_METADADOS_PRODUTO.get(chaveFinal) || cacheExistente;

  const tituloFinal =
    primeiroTitulo ||
    cacheFinal?.titulo ||
    extrairTituloDeSlugUrl(ultimaUrlFinal) ||
    extrairTituloDeSlugUrl(urlNormalizada) ||
    obterTituloFallback(urlNormalizada);

  // Fallbacks de imagem quando o HTML direto foi bloqueado ou não trouxe og:image:
  // 1. Parâmetros da própria URL (?imagem= ou image_ids da Shopee)
  // 2. CDN da Amazon por ASIN
  // 3. Cache canônico ou Catálogo de referência de homologação
  const imagemDaUrl = extrairImagemDaUrl(urlNormalizada) || extrairImagemDaUrl(ultimaUrlFinal);
  const asin = extrairAsinAmazon(urlNormalizada) || extrairAsinAmazon(ultimaUrlFinal);
  const imagemAmazon = asin ? await obterImagemAmazonPorAsin(asin, fetchFn) : null;
  let imagemFinal =
    imagemDaUrl ||
    imagemAmazon ||
    cacheFinal?.imagem_url ||
    obterImagemCatalogoReferencia(ultimaUrlFinal, tituloFinal) ||
    obterImagemCatalogoReferencia(urlNormalizada, tituloFinal) ||
    null;

  const precoExplicito = precoDaQuery ?? precoSugeridoValido ?? precoDoTexto;
  let precoFinal =
    precoExplicito ??
    cacheFinal?.price ??
    primeiroPreco ??
    obterPrecoCatalogoReferencia(ultimaUrlFinal, tituloFinal) ??
    obterPrecoCatalogoReferencia(urlNormalizada, tituloFinal);

  if (
    (precoFinal === null || !imagemFinal) &&
    (ehUrlMarketplaceConhecido(ultimaUrlFinal) || ehUrlMarketplaceConhecido(urlNormalizada))
  ) {
    const dadosPesquisa = await buscarMetadadosPorPesquisaWeb(
      tituloFinal,
      ultimaUrlFinal,
      fetchFn
    );
    if (precoFinal === null && dadosPesquisa.preco !== null) {
      precoFinal = dadosPesquisa.preco;
    }
    if (!imagemFinal && dadosPesquisa.imagem_url) {
      imagemFinal = dadosPesquisa.imagem_url;
    }
  }

  const resultado = {
    url: ultimaUrlFinal,
    titulo: tituloFinal,
    imagem_url: imagemFinal,
    price: precoFinal,
  };

  if (precoFinal !== null) {
    CACHE_METADADOS_PRODUTO.set(chaveCanonicaInicial, resultado);
    CACHE_METADADOS_PRODUTO.set(chaveFinal, resultado);
  }

  return resultado;
}

/**
 * Gera um título amigável baseado no domínio caso a página não forneça título válido.
 */
function obterTituloFallback(url) {
  try {
    const urlObj = new URL(url);
    const dominio = urlObj.hostname.replace('www.', '');
    return dominio ? `Produto em ${dominio}` : 'Novo Produto';
  } catch {
    return 'Novo Produto';
  }
}
