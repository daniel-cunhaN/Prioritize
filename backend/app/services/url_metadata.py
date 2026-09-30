from __future__ import annotations

import asyncio
import re
from html.parser import HTMLParser
from urllib.parse import unquote, urljoin, urlparse

import httpx

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

IMAGE_META_KEYS = {
    "og:image",
    "og:image:url",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
    "image",
}

TITLE_META_KEYS = {
    "og:title",
    "twitter:title",
    "title",
}

# Prefer CDN hosts that match the storefront
DOMAIN_IMAGE_HINTS: list[tuple[str, list[str]]] = [
    ("shopee.", ["susercontent.com", "shopee"]),
    ("mercadolivre.", ["mlstatic.com"]),
    ("mercadolibre.", ["mlstatic.com"]),
    ("amazon.", ["media-amazon.com", "ssl-images-amazon.com", "images-amazon.com"]),
    ("magazineluiza.", ["magazineluiza", "luizalabs", "imagem.magalu"]),
    ("magazinevoce.", ["magazineluiza", "luizalabs"]),
    ("americanas.", ["americanas", "b2w"]),
    ("kabum.", ["kabum"]),
    ("aliexpress.", ["alicdn.com"]),
]

SKIP_IMAGE_FRAGMENTS = (
    "favicon",
    "logo",
    "sprite",
    "placeholder",
    "blank",
    "pixel",
    "1x1",
    "icon_",
    "avatar",
    "vlibras",
    "data:image",
)


class _MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.metas: list[dict[str, str]] = []
        self.title: str | None = None
        self._in_title = False
        self._title_chunks: list[str] = []
        self.json_ld_chunks: list[str] = []
        self._in_json_ld = False
        self._json_ld_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        lower_tag = tag.lower()

        if lower_tag == "meta":
            self.metas.append(attr_map)
        elif lower_tag == "title":
            self._in_title = True
            self._title_chunks = []
        elif lower_tag == "script" and "ld+json" in attr_map.get("type", "").lower():
            self._in_json_ld = True
            self._json_ld_buf = []
        elif lower_tag == "link":
            rel = attr_map.get("rel", "").lower()
            href = attr_map.get("href", "")
            if href and (
                "image_src" in rel
                or (rel == "preload" and "image" in attr_map.get("as", "").lower())
            ):
                self.metas.append({"property": "og:image", "content": href})

    def handle_endtag(self, tag: str) -> None:
        lower_tag = tag.lower()
        if lower_tag == "title" and self._in_title:
            self._in_title = False
            text = " ".join(self._title_chunks).strip()
            if text and not self.title:
                self.title = text
        elif lower_tag == "script" and self._in_json_ld:
            self._in_json_ld = False
            chunk = "".join(self._json_ld_buf).strip()
            if chunk:
                self.json_ld_chunks.append(chunk)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_chunks.append(data)
        elif self._in_json_ld:
            self._json_ld_buf.append(data)


def normalize_url(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        raise ValueError("URL vazia")
    if not re.match(r"^https?://", value, re.IGNORECASE):
        value = f"https://{value}"
    parsed = urlparse(value)
    if not parsed.netloc:
        raise ValueError("URL inválida")
    return value


def _meta_content(metas: list[dict[str, str]], keys: set[str]) -> str | None:
    for meta in metas:
        key = (
            meta.get("property")
            or meta.get("name")
            or meta.get("itemprop")
            or ""
        ).strip().lower()
        if key in keys:
            content = (meta.get("content") or meta.get("value") or "").strip()
            if content:
                return content
    return None


def _extract_json_ld_image(chunks: list[str]) -> str | None:
    patterns = [
        r'"image"\s*:\s*"([^"]+)"',
        r'"image"\s*:\s*\[\s*"([^"]+)"',
        r'"thumbnailUrl"\s*:\s*"([^"]+)"',
    ]
    for chunk in chunks:
        for pattern in patterns:
            match = re.search(pattern, chunk, re.IGNORECASE)
            if match:
                return match.group(1).strip()
    return None


def _absolute_url(base: str, maybe_relative: str | None) -> str | None:
    if not maybe_relative:
        return None
    value = maybe_relative.strip().strip("`\"'")
    if not value or value.startswith("data:"):
        return None
    absolute = urljoin(base, value)
    parsed = urlparse(absolute)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    return absolute


def _is_usable_image(url: str | None) -> bool:
    if not url:
        return False
    lower = url.lower()
    if any(skip in lower for skip in SKIP_IMAGE_FRAGMENTS):
        return False
    if lower.endswith(".svg"):
        return False
    return True


def guess_title_from_url(url: str) -> str | None:
    """Extrai um nome de produto legível do path (ex.: slug da Shopee)."""
    parsed = urlparse(url)
    path = unquote(parsed.path or "")

    # Shopee: /Nome-Do-Produto-i.SHOPID.ITEMID
    path = re.sub(r"-i\.\d+\.\d+/?$", "", path, flags=re.IGNORECASE)
    # /product/shopid/itemid → sem título útil
    if re.search(r"/product/\d+/\d+", path, re.IGNORECASE):
        return None

    slug = path.strip("/").split("/")[-1] if path.strip("/") else ""
    if not slug or slug.isdigit() or re.fullmatch(r"\d+\.\d+", slug):
        return None

    slug = re.sub(r"\.(html?|php|aspx)$", "", slug, flags=re.IGNORECASE)
    title = re.sub(r"[-_]+", " ", slug)
    title = re.sub(r"\s+", " ", title).strip()
    # Descarta títulos genéricos demais
    if len(title) < 4:
        return None
    return title[:160]


def preferred_image_hosts(page_url: str) -> list[str]:
    host = urlparse(page_url).netloc.lower()
    for domain_fragment, hints in DOMAIN_IMAGE_HINTS:
        if domain_fragment in host:
            return hints
    # fallback: prefer same registrable-ish host fragment
    parts = host.split(".")
    if len(parts) >= 2:
        return [parts[-2], host]
    return [host]


def parse_html_metadata(html: str, page_url: str) -> dict[str, str | None]:
    parser = _MetaParser()
    try:
        parser.feed(html)
    except Exception:
        pass

    image = _meta_content(parser.metas, IMAGE_META_KEYS)
    if not image:
        image = _extract_json_ld_image(parser.json_ld_chunks)

    title = _meta_content(parser.metas, TITLE_META_KEYS) or parser.title
    if title:
        title = re.sub(r"\s+", " ", title).strip()
        # Títulos genéricos de home/login não ajudam
        generic = ("ofertas incríveis", "melhores preços", "login", "shopee brasil |")
        lower = title.lower()
        if any(g in lower for g in generic) and len(title) < 80:
            title = None
        elif len(title) > 255:
            title = title[:255].rstrip()

    image_url = _absolute_url(page_url, image)
    if not _is_usable_image(image_url):
        image_url = None

    return {
        "title": title or None,
        "image_url": image_url,
    }


def _score_image_candidate(image_url: str, page_url: str, hints: list[str]) -> int:
    lower = image_url.lower()
    score = 0
    for hint in hints:
        if hint.lower() in lower:
            score += 10
    host = urlparse(page_url).netloc.lower()
    if "shopee" in host and "susercontent.com" in lower:
        score += 20
    if any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp")):
        score += 2
    if any(bad in lower for bad in SKIP_IMAGE_FRAGMENTS):
        score -= 50
    return score


def _search_images_sync(query: str) -> list[dict]:
    try:
        from ddgs import DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS  # type: ignore
        except ImportError:
            return []

    try:
        with DDGS() as ddgs:
            return list(ddgs.images(query, max_results=10))
    except Exception:
        return []


async def search_product_image(
    query: str,
    page_url: str,
) -> str | None:
    """Fallback quando o HTML não expõe og:image (ex.: Shopee)."""
    cleaned = re.sub(r"\s+", " ", (query or "").strip())
    if len(cleaned) < 3:
        return None

    host = urlparse(page_url).netloc.lower().replace("www.", "")
    store = host.split(".")[0] if host else ""
    # Inclui marca do CDN para enviesar resultados (ex.: susercontent na Shopee)
    extra = ""
    hints = preferred_image_hosts(page_url)
    if hints:
        extra = hints[0].split(".")[0]
    search_q = " ".join(part for part in (cleaned, store, extra) if part).strip()

    results = await asyncio.to_thread(_search_images_sync, search_q)
    if not results and store:
        results = await asyncio.to_thread(_search_images_sync, cleaned)

    ranked: list[tuple[int, str]] = []
    for item in results:
        candidate = (item.get("image") or item.get("url") or item.get("thumbnail") or "").strip()
        if not _is_usable_image(candidate):
            continue
        ranked.append((_score_image_candidate(candidate, page_url, hints), candidate))

    if not ranked:
        return None

    ranked.sort(key=lambda pair: pair[0], reverse=True)

    # Se existir candidato do CDN da loja, ignora imagens de outros marketplaces
    preferred = [pair for pair in ranked if pair[0] >= 10]
    pool = preferred or ranked
    best_score, best_url = pool[0]
    if best_score < 0:
        return None
    return best_url


async def fetch_url_metadata(
    url: str,
    title_hint: str | None = None,
) -> dict[str, str | None]:
    """
    Obtém título e imagem do produto.
    1) Open Graph / Twitter / JSON-LD
    2) Fallback: busca de imagem pelo nome do produto (necessário p/ Shopee etc.)
    """
    try:
        normalized = normalize_url(url)
    except ValueError:
        return {"title": None, "image_url": None, "url": None}

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }

    title: str | None = None
    image_url: str | None = None
    final_url = normalized

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(12.0, connect=5.0),
            headers=headers,
        ) as client:
            # Também tenta o formato canónico da Shopee /product/shop/item
            urls_to_try = [normalized]
            shopee_ids = re.search(
                r"(?:shopee\.[^/]+).*?[?&](?:shopid|shop_id)=(\d+).*?[?&](?:itemid|item_id)=(\d+)",
                normalized,
                re.I,
            )
            slug_ids = re.search(r"-i\.(\d+)\.(\d+)", normalized)
            path_ids = re.search(r"/product/(\d+)/(\d+)", normalized)
            ids = None
            if slug_ids:
                ids = slug_ids.group(1), slug_ids.group(2)
            elif path_ids:
                ids = path_ids.group(1), path_ids.group(2)
            elif shopee_ids:
                ids = shopee_ids.group(1), shopee_ids.group(2)
            if ids and "shopee." in urlparse(normalized).netloc.lower():
                shop_id, item_id = ids
                host = urlparse(normalized).netloc
                canonical = f"https://{host}/product/{shop_id}/{item_id}"
                if canonical not in urls_to_try:
                    urls_to_try.append(canonical)

            for candidate in urls_to_try:
                try:
                    response = await client.get(candidate)
                    response.raise_for_status()
                except Exception:
                    continue

                content_type = response.headers.get("content-type", "").lower()
                if content_type and not any(
                    t in content_type for t in ("text/", "html", "xml", "json")
                ):
                    continue

                html = response.text[:1_000_000]
                meta = parse_html_metadata(html, str(response.url))
                final_url = str(response.url)
                if meta.get("title") and not title:
                    title = meta["title"]
                if meta.get("image_url") and not image_url:
                    image_url = meta["image_url"]
                if image_url:
                    break
    except Exception:
        pass

    if not title:
        title = (title_hint or "").strip() or guess_title_from_url(normalized)

    if not image_url:
        query = (title_hint or "").strip() or title or guess_title_from_url(normalized)
        if query:
            image_url = await search_product_image(query, normalized)

    return {
        "title": title,
        "image_url": image_url,
        "url": final_url,
    }
