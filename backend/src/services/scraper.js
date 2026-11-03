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
  { seletor: 'meta[name="twitter:data1"]', atributo: 'content' },
  { seletor: 'meta[itemprop="price"]', atributo: 'content' },
  { seletor: '[itemprop="price"]', atributo: 'content' },
];

/**
 * Converte diferentes formatos de valor monetário (ex: "88.02", "88,02", "R$ 1.250,90")
 * em um número de ponto flutuante arredondado para 2 casas decimais.
 */
export function normalizarPreco(valor) {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
  }
  const str = String(valor).trim();
  if (!str) return null;

  // Extrai padrão de moeda R$ XX,XX ou valores com decimais
  const padraoMoeda = str.match(/(?:R\$|\$)?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:[.,]\d{1,2})?)/);
  if (padraoMoeda) {
    const raw = padraoMoeda[1]
      .replace(/\.(?=\d{3})/g, '') // remove separador de milhar
      .replace(',', '.');          // converte vírgula decimal
    const num = parseFloat(raw);
    if (Number.isFinite(num) && num > 0) return Math.round(num * 100) / 100;
  }

  const limpo = str
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');

  const num = parseFloat(limpo);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
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

  // Precedência de preços: metas OG/Twitter/Product > JSON-LD Product > seletores HTML > Texto com moeda explícita (R$)
  const precoMeta = normalizarPreco(primeiroValor($, SELETORES_PRECO_META));
  const precoJsonLd = extrairPrecoJsonLd($);
  const precoHtml = normalizarPreco(
    $('[itemprop="price"]').first().text() ||
    $('.a-price .a-offscreen').first().text() ||
    null
  );
  const precoTexto = extrairPrecoDeTexto(
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    null
  );
  const price = precoMeta ?? precoJsonLd ?? precoHtml ?? precoTexto ?? null;

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
 * Tenta sucessivamente os perfis de requisição até encontrar uma imagem do produto.
 *
 * @param {string} url - URL do produto informada pelo usuário
 * @param {object} [opcoes]
 * @param {Function} [opcoes.fetchFn] - Implementação de fetch (injetável para testes)
 */
export async function extrairMetadadosUrl(url, { fetchFn = fetch } = {}) {
  // Garante que a URL possua protocolo http ou https
  let urlNormalizada = url.trim();
  if (!urlNormalizada.startsWith('http://') && !urlNormalizada.startsWith('https://')) {
    urlNormalizada = `https://${urlNormalizada}`;
  }

  // Primeiro título e primeiro preço encontrados
  let primeiroTitulo = null;
  let primeiroPreco = null;
  // URL final após redirecionamentos (útil para links encurtados, ex.: amzn.to)
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
        return {
          url: urlFinal,
          titulo: metadados.titulo || primeiroTitulo || obterTituloFallback(urlNormalizada),
          imagem_url: metadados.imagem_url,
          price: metadados.price || primeiroPreco || null,
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

  // Fallback específico da Amazon: imagem direto da CDN pelo ASIN
  const asin = extrairAsinAmazon(urlNormalizada) || extrairAsinAmazon(ultimaUrlFinal);
  const imagemAmazon = asin ? await obterImagemAmazonPorAsin(asin, fetchFn) : null;

  // Nenhuma tentativa trouxe imagem: devolve o melhor título e preço disponíveis.
  return {
    url: urlNormalizada,
    titulo: primeiroTitulo || obterTituloFallback(urlNormalizada),
    imagem_url: imagemAmazon,
    price: primeiroPreco || null,
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
