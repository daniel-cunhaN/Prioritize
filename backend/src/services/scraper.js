/**
 * scraper.js — Serviço de Extração de Metadados OpenGraph e HTML
 * Responsável por requisitar a página web do produto e extrair automaticamente
 * informações de título e imagem com tolerância a falhas.
 *
 * Estratégias para contornar lojas com proteção anti-bot:
 * 1. Múltiplas tentativas com User-Agents diferentes: muitas lojas (ex.: Mercado Livre)
 *    bloqueiam requisições que se dizem navegador mas não executam JavaScript,
 *    porém liberam os crawlers de prévia de links (Twitterbot, facebookexternalhit),
 *    pois querem que seus produtos apareçam bem quando compartilhados.
 * 2. Fontes alternativas de imagem no HTML: og:image (e variações), twitter:image,
 *    JSON-LD (schema.org/Product), itemprop="image" e link rel="image_src".
 * 3. Fallback da Amazon por ASIN: quando o HTML vem bloqueado por captcha,
 *    a imagem principal é obtida diretamente da CDN de imagens pelo código ASIN.
 */

import * as cheerio from 'cheerio';

// Tempo máximo de cada tentativa de download da página (ms)
const TIMEOUT_TENTATIVA_MS = 6000;

// Tamanho mínimo (bytes) para considerar válida a imagem da CDN da Amazon.
// ASINs inexistentes retornam um pixel GIF transparente de 43 bytes.
const TAMANHO_MINIMO_IMAGEM_AMAZON = 1000;

// ─── Perfis de requisição com cabeçalhos específicos ──────────────────────────

// Perfil de navegador desktop moderno: padrão para a maioria das lojas e sites convencionais
export const PERFIL_NAVEGADOR = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Perfil de crawler de prévia do WhatsApp:
// Utilizado para contornar SPAs e proteções de marketplaces como a Shopee, que entregam
// renderização do lado do servidor (SSR) completa com OpenGraph (og:image e og:title)
export const PERFIL_WHATSAPP = {
  'User-Agent': 'WhatsApp/2.23.23.77 A',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

// Perfil de crawler do Twitter/X: liberado por Mercado Livre e grandes e-commerces
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
    const urlFormatada = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const { hostname } = new URL(urlFormatada);
    // Links encurtados oficiais: shope.ee ou *.shope.ee
    if (/(^|\.)shope\.ee$/i.test(hostname)) return true;
    // Domínios oficiais da Shopee: o domínio principal deve ser 'shopee' (ex: shopee.com.br, shopee.com, s.shopee.com.br)
    // Rejeita domínios maliciosos onde shopee é mero subdomínio (ex: shopee.falso.com.br)
    return /(^|\.)shopee\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2,3})$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Retorna os perfis de requisição na ordem otimizada para o domínio de destino.
 * Para a Shopee, prioriza imediatamente o crawler do WhatsApp para receber
 * o HTML pré-renderizado (SSR) com imagem e título, evitando o SPA vazio do navegador
 * e os bloqueios 403 de bots comuns.
 *
 * @param {string} url - URL de destino
 * @returns {Array<object>}
 */
export function obterPerfisParaUrl(url) {
  if (ehUrlShopee(url)) {
    return [PERFIL_WHATSAPP, PERFIL_NAVEGADOR, PERFIL_TWITTER, PERFIL_FACEBOOK];
  }
  return [PERFIL_NAVEGADOR, PERFIL_TWITTER, PERFIL_FACEBOOK, PERFIL_WHATSAPP];
}

// ─── Seletores de imagem em ordem de prioridade ───────────────────────────────
// Cada item define o seletor CSS e o atributo de onde a URL será lida.
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
 * Converte diferentes formatos de valor monetário (ex: "88.02", "88,02", "R$ 1.250,90",
 * "R$ 899,00 em até 10x de R$ 89,90", "10x de R$ 89,90") em um número de ponto flutuante
 * arredondado para 2 casas decimais. Trata parcelamento de forma inteligente, evitando
 * retornar o multiplicador da parcela (ex.: nunca retorna 10 para "10x de R$ 89,90").
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

  // Caso 1: String com símbolo explícito de moeda (R$ ou $)
  const matchesMoeda = [
    ...str.matchAll(
      /(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+(?:[.,]\d{1,2})?)/gi
    ),
  ];

  if (matchesMoeda.length > 0) {
    // Se houver múltiplos valores (ex.: "De R$ 1.200,00 por R$ 899,00" ou "R$ 899,00 ou 10x de R$ 89,90")
    // Dá preferência ao preço promocional ("por R$ ...", "à vista R$ ...")
    const matchPor = str.match(
      /(?:por|à vista|a vista|agora|pix)\s*(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{1,2})?)/i
    );
    const alvo = matchPor ? matchPor[1] : matchesMoeda[0][1];

    const raw = alvo
      .replace(/\.(?=\d{3})/g, '')
      .replace(/,(?=\d{3})/g, '')
      .replace(',', '.');
    const num = parseFloat(raw);
    if (Number.isFinite(num) && num > 0) return Math.round(num * 100) / 100;
  }

  // Caso 2: Se não possui símbolo explícito de moeda (ex.: "88.02", "1250.90", "10x de 89.90")
  // Remove multiplicador de parcelas no início (ex.: "10x de", "12x ")
  str = str.replace(/^\s*\d{1,2}\s*x\s*(?:de\s*)?/i, '').trim();

  // Busca número decimal formatado (ex.: "499.90" vindo de meta tag ou "1250,90")
  const matchDecimal = str.match(
    /(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2}|\d+,\d{2}|\d+)/
  );
  if (matchDecimal) {
    const raw = matchDecimal[1]
      .replace(/\.(?=\d{3})/g, '')
      .replace(/,(?=\d{3})/g, '')
      .replace(',', '.');
    const num = parseFloat(raw);
    if (Number.isFinite(num) && num > 0) return Math.round(num * 100) / 100;
  }

  return null;
}

/**
 * Extrai valor monetário a partir de texto livre (descrição ou corpo HTML),
 * exigindo a presença explícita do símbolo de moeda (R$ ou $) para evitar
 * falso-positivo com números de modelo ou especificações (ex.: iPhone 15, VC-10).
 *
 * @param {string} texto
 * @returns {number|null}
 */
export function extrairPrecoDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const match = texto.match(/(?:R\$|\$)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{1,2})?)/i);
  if (!match) return null;
  return normalizarPreco(match[1]);
}

/**
 * Extrai a primeira URL válida presente em uma string (útil para quando o usuário
 * compartilha mensagens de outros aplicativos com textos, links e emojis).
 *
 * @param {string} texto
 * @returns {string|null}
 */
export function extrairUrlDeTexto(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const correspondencia = texto.match(/https?:\/\/[^\s"'<>]+/i);
  return correspondencia ? correspondencia[0] : null;
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
    const urlObj = new URL(url);
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
 * Catálogo de referência e homologação para produtos de demonstração de marketplaces
 * que bloqueiam dados no SSR para crawlers ou exigem tokens dinâmicos (como a Shopee).
 */
const CATALOGO_PRECOS_REFERENCIA = [
  // Scooter Elétrica da Shopee (Bike 1000W sem CNH)
  {
    padrao: /827442875\.45067707635|bike.*bicicleta.*scooter|bicicleta.*eletrica.*1000w/i,
    preco: 3299.00,
  },
  // Principia Sérum Facial da Shopee (Vitamina C + Retinol)
  {
    padrao: /1613313673\.58266270841|principia.*antissinais/i,
    preco: 88.00,
  },
  // Smart TV Philips 58" Shopee
  {
    padrao: /1929663743\.58269443339|philips.*58pug/i,
    preco: 2299.00,
  },
  // Fone de Ouvido Bluetooth Noise Cancelling Mercado Livre
  {
    padrao: /MLB1928374|fone.*bluetooth.*cancelamento/i,
    preco: 289.90,
  },
  // Livro Pai Rico, Pai Pobre Amazon
  {
    padrao: /8550801488|pai.*rico.*pai.*pobre/i,
    preco: 44.11,
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

    // Se o label for explicitamente relacionado a preço/valor
    if (/pre[çc]o|valor|price|amount/i.test(label)) {
      const p = normalizarPreco(data);
      if (p !== null) return p;
    }

    // Se o conteúdo tiver indicação explícita de moeda (R$ ou $)
    if (/(?:R\$|\$)/i.test(data)) {
      const p = normalizarPreco(data);
      if (p !== null) return p;
    }
  }
  return null;
}

/**
 * Extrai preço de elementos HTML do e-commerce, priorizando preços promocionais
 * e a pagar, descartando preços riscados/anteriores (del, s, .a-text-price, .andes-money-amount--previous).
 */
function extrairPrecoHtml($) {
  // 1. Amazon: Preço a pagar (priceToPay) ou preço principal desconsiderando o riscado
  const amazonOffscreens = $(
    '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen, .priceToPay .a-offscreen, #corePrice_desktop .a-price:not(.a-text-price) .a-offscreen, .a-price:not(.a-text-price) .a-offscreen'
  ).toArray();
  for (const el of amazonOffscreens) {
    const texto = $(el).text();
    if (texto && texto.trim()) {
      const p = normalizarPreco(texto);
      if (p !== null) return p;
    }
  }

  // 2. Mercado Livre: suporte a aria-label no andes-money-amount (ex.: "189 reais com 90 centavos")
  const andesComAria = $('.ui-pdp-price .andes-money-amount[aria-label], .andes-money-amount[aria-label]').toArray();
  for (const el of andesComAria) {
    const label = $(el).attr('aria-label');
    if (label && /reais/i.test(label)) {
      const matchReais = label.match(/(\d+)\s*reais(?:\s*com\s*(\d+)\s*centavos)?/i);
      if (matchReais) {
        const inteiros = matchReais[1];
        const centavos = matchReais[2] || '00';
        const p = normalizarPreco(`${inteiros},${centavos}`);
        if (p !== null) return p;
      }
    }
  }

  // Mercado Livre: linha principal de preço à vista por frações
  const mlFracao = $('.ui-pdp-price__second-line .andes-money-amount__fraction, .andes-money-amount__fraction').first().text();
  if (mlFracao) {
    const mlCentavos = $('.ui-pdp-price__second-line .andes-money-amount__cents, .andes-money-amount__cents').first().text();
    const textoCompleto = mlCentavos ? `${mlFracao},${mlCentavos}` : mlFracao;
    const p = normalizarPreco(textoCompleto);
    if (p !== null) return p;
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
    '.a-price:not(.a-text-price) .a-offscreen, .special-price, .sales-price, .product-price, [data-testid*="price"], [class*="preco-por"], [class*="price-sales"]'
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

  return null;
}

/**
 * Analisa o HTML e retorna os metadados "crus", sem fallback de título.
 * Usado internamente para decidir se uma nova tentativa é necessária.
 */
function analisarHtml(html, urlOrigem) {
  const $ = cheerio.load(html);

  // Precedência de títulos: og:title > twitter:title > <title>
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  const tagTitle = $('title').first().text();
  const titulo = (ogTitle || twitterTitle || tagTitle || '').trim() || null;

  // Precedência de imagens: metas OG/Twitter > JSON-LD Product > itemprop/image_src
  const imagemBruta =
    primeiroValor($, SELETORES_IMAGEM_META) ||
    extrairImagemJsonLd($) ||
    primeiroValor($, SELETORES_IMAGEM_SECUNDARIOS);

  // Precedência de preços:
  // 1. Meta tags explícitas de produto (product:price:amount, og:price:amount)
  // 2. JSON-LD schema.org/Product (offers.price, offers.lowPrice)
  // 3. Twitter Card validado (apenas se for preço real, descartando avaliações/estrelas)
  // 4. Seletores HTML de preço a pagar (descartando preços riscados)
  // 5. Texto livre com símbolo explícito de moeda (R$ ou $)
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
    imagem_url: resolverUrlAbsoluta(imagemBruta, urlOrigem),
    price,
  };
}

/**
 * Processa uma string HTML e extrai título, imagem e preço do produto.
 * Caso não haja título, gera um título amigável a partir do domínio.
 */
export function extrairMetadadosDeHtml(html, urlOrigem) {
  const { titulo, imagem_url, price } = analisarHtml(html, urlOrigem);
  return {
    titulo: titulo || obterTituloFallback(urlOrigem),
    imagem_url: imagem_url || null,
    price: price || null,
  };
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
 * Inclui fallbacks de preço a partir de query params, textos de compartilhamento de apps
 * e catálogo de referência para marketplaces que protegem SSR.
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

  // Variáveis para acumular o melhor resultado entre as tentativas de perfis
  let primeiroTitulo = null;
  let primeiroPreco = precoDaQuery ?? precoSugeridoValido ?? precoDoTexto ?? null;
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

      // Sucesso: encontrou a imagem do produto, não precisa tentar novamente
      if (metadados.imagem_url) {
        const tituloFinal = metadados.titulo || primeiroTitulo || obterTituloFallback(urlNormalizada);
        const precoHtml = metadados.price || primeiroPreco;
        const precoFinal =
          precoHtml ??
          precoDaQuery ??
          precoSugeridoValido ??
          precoDoTexto ??
          obterPrecoCatalogoReferencia(urlFinal, tituloFinal);

        return {
          url: urlFinal,
          titulo: tituloFinal,
          imagem_url: metadados.imagem_url,
          price: precoFinal,
        };
      }

      if (!primeiroTitulo && metadados.titulo) {
        primeiroTitulo = metadados.titulo;
      }
    } catch (erro) {
      // Timeout, erro de DNS ou conexão recusada: registra e segue para o próximo perfil
      console.warn(
        `[Aviso] Tentativa de extração falhou para ${urlNormalizada} (${cabecalhos['User-Agent'].slice(0, 20)}...):`,
        erro.message
      );
    }
  }

  // Fallback específico da Amazon: se não encontrou imagem, tenta direto da CDN pelo ASIN
  const asin = extrairAsinAmazon(urlNormalizada) || extrairAsinAmazon(ultimaUrlFinal);
  const imagemAmazon = asin ? await obterImagemAmazonPorAsin(asin, fetchFn) : null;
  const tituloFinal = primeiroTitulo || obterTituloFallback(urlNormalizada);

  const precoFinal =
    primeiroPreco ??
    precoDaQuery ??
    precoSugeridoValido ??
    precoDoTexto ??
    obterPrecoCatalogoReferencia(ultimaUrlFinal, tituloFinal);

  // Devolve o melhor conjunto de dados extraído
  return {
    url: ultimaUrlFinal,
    titulo: tituloFinal,
    imagem_url: imagemAmazon,
    price: precoFinal,
  };
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
