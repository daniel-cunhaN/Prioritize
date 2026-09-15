"""
Serviço de Extração de Metadados de Páginas Web (Scraper)
Responsável por requisitar a URL de um produto e extrair automaticamente
as informações de OpenGraph e tags HTML para o título e imagem do produto.
Desenvolvido com boas práticas assíncronas e biblioteca padrão do Python.
"""

import httpx
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from typing import Optional, Tuple


# ─── Parser HTML Personalizado para Tags OpenGraph e Metadados ────────────────
class MetadadosHTMLParser(HTMLParser):
    """
    Parser baseado na biblioteca padrão do Python (html.parser)
    para capturar og:title, og:image, twitter:title, twitter:image e a tag <title>.
    """
    def __init__(self):
        super().__init__()
        self.og_titulo: Optional[str] = None
        self.twitter_titulo: Optional[str] = None
        self.tag_titulo: Optional[str] = None

        self.og_imagem: Optional[str] = None
        self.twitter_imagem: Optional[str] = None

        self._dentro_da_tag_title = False
        self._texto_tag_title: list[str] = []

    @property
    def titulo(self) -> Optional[str]:
        # Prioridade: 1) og:title, 2) twitter:title, 3) <title> padrão
        return self.og_titulo or self.twitter_titulo or self.tag_titulo

    @property
    def imagem_url(self) -> Optional[str]:
        # Prioridade: 1) og:image, 2) twitter:image
        return self.og_imagem or self.twitter_imagem

    def handle_starttag(self, tag: str, attrs: list[Tuple[str, Optional[str]]]):
        # Converte lista de atributos para dicionário normalizado
        atributos = {k.lower(): (v or "").strip() for k, v in attrs}

        # Identifica a abertura da tag <title> padrão do HTML
        if tag.lower() == "title":
            self._dentro_da_tag_title = True

        # Captura metadados OpenGraph ou Twitter Cards na tag <meta>
        if tag.lower() == "meta":
            propriedade = atributos.get("property", "").lower()
            nome = atributos.get("name", "").lower()
            conteudo = atributos.get("content", "").strip()

            if propriedade == "og:title" and conteudo and not self.og_titulo:
                self.og_titulo = conteudo
            elif nome == "twitter:title" and conteudo and not self.twitter_titulo:
                self.twitter_titulo = conteudo

            if propriedade == "og:image" and conteudo and not self.og_imagem:
                self.og_imagem = conteudo
            elif nome == "twitter:image" and conteudo and not self.twitter_imagem:
                self.twitter_imagem = conteudo

    def handle_endtag(self, tag: str):
        # Ao fechar a tag <title>, consolida o texto da tag title
        if tag.lower() == "title":
            self._dentro_da_tag_title = False
            if self._texto_tag_title and not self.tag_titulo:
                self.tag_titulo = "".join(self._texto_tag_title).strip()

    def handle_data(self, data: str):
        # Coleta texto dentro de <title>
        if self._dentro_da_tag_title:
            self._texto_tag_title.append(data)


# ─── Função Assíncrona Principal de Extração de Metadados ─────────────────────
async def extrair_metadados_url(url: str) -> dict:
    """
    Realiza a requisição assíncrona HTTP para a página fornecida,
    processa o HTML e retorna um dicionário com `url`, `titulo` e `imagem_url`.
    Caso ocorra erro na requisição (ex: timeout ou bloqueio),
    retorna um fallback gracioso para não quebrar a experiência do usuário.
    """
    # Garante esquema http/https caso o usuário informe apenas o domínio
    url_normalizada = url.strip()
    if not url_normalizada.startswith("http://") and not url_normalizada.startswith("https://"):
        url_normalizada = f"https://{url_normalizada}"

    # Cabeçalhos simulando um navegador moderno para evitar bloqueios anti-bot
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try:
        # Requisição com timeout de 8 segundos e seguimento automático de redirecionamentos
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as cliente:
            resposta = await cliente.get(url_normalizada, headers=headers)
            
            # Se status for sucesso, processa o HTML com o parser
            if resposta.status_code == 200:
                parser = MetadadosHTMLParser()
                # Limita o parsing aos primeiros 200KB para performance
                html_parcial = resposta.text[:200000]
                parser.feed(html_parcial)

                titulo_encontrado = parser.titulo
                imagem_encontrada = parser.imagem_url

                # Se a URL da imagem for relativa (/images/produto.jpg), resolve para URL absoluta
                if imagem_encontrada:
                    imagem_encontrada = urljoin(str(resposta.url), imagem_encontrada)

                return {
                    "url": str(resposta.url),
                    "titulo": titulo_encontrado or _obter_titulo_fallback(url_normalizada),
                    "imagem_url": imagem_encontrada,
                }

    except Exception as erro:
        # Loga silenciosamente o erro para rastreabilidade sem interromper o fluxo
        print(f"[Aviso] Falha ao extrair metadados da URL {url_normalizada}: {erro}")

    # Fallback quando a página não puder ser baixada ou não retornar metadados
    return {
        "url": url_normalizada,
        "titulo": _obter_titulo_fallback(url_normalizada),
        "imagem_url": None,
    }


def _obter_titulo_fallback(url: str) -> str:
    """
    Gera um título de fallback limpo baseado no domínio da URL informada.
    Exemplo: https://www.mercadolivre.com.br/item -> "Produto em mercadolivre.com.br"
    """
    try:
        dominio = urlparse(url).netloc.replace("www.", "")
        return f"Produto em {dominio}" if dominio else "Novo Produto"
    except Exception:
        return "Novo Produto"
