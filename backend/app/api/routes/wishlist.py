"""
Módulo de Rotas para Lista de Desejos (Wishlist)
Define os endpoints para extração de metadados de links,
criação de itens com prioridade (Baixa, Média, Alta) e listagem dos desejos do usuário.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.db.models import WishlistItem, User
from app.api.deps import obter_usuario_atual
from app.schemas.wishlist import (
    DesejoPreviewRequisicao,
    DesejoPreviewResposta,
    DesejoCriar,
    DesejoResposta,
)
from app.services.scraper import extrair_metadados_url

router = APIRouter(prefix="/api/v1/wishlist", tags=["Wishlist"])


# ─── Endpoint para Pré-visualização de Link (Scraping de Metadados) ───────────
@router.post(
    "/preview",
    response_model=DesejoPreviewResposta,
    status_code=status.HTTP_200_OK,
    summary="Extrai título e imagem do produto a partir de uma URL"
)
async def previsualizar_link(
    dados: DesejoPreviewRequisicao,
    usuario: User = Depends(obter_usuario_atual)
):
    """
    Recebe uma URL enviada pelo usuário (ou compartilhada de outro app),
    faz a extração automática das informações (OpenGraph / HTML)
    e retorna o título e imagem sugeridos para o modal de adicionar desejo.
    """
    if not dados.url or not dados.url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"codigo": "URL_INVALIDA", "mensagem": "A URL fornecida não pode estar vazia."}
        )

    metadados = await extrair_metadados_url(dados.url)
    return DesejoPreviewResposta(
        url=metadados["url"],
        titulo=metadados["titulo"],
        imagem_url=metadados["imagem_url"]
    )


# ─── Endpoint para Criação de um Novo Desejo ───────────────────────────────────
@router.post(
    "/",
    response_model=DesejoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra um novo produto na lista de desejos"
)
async def criar_desejo(
    dados: DesejoCriar,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(obter_usuario_atual)
):
    """
    Persiste um novo produto desejado vinculado ao usuário logado.
    Salva URL, título, imagem e a classificação de importância (1: Baixa, 2: Média, 3: Alta).
    """
    novo_desejo = WishlistItem(
        user_id=usuario.id,
        url=dados.url.strip(),
        title=dados.titulo.strip(),
        image_url=dados.imagem_url.strip() if dados.imagem_url else None,
        priority=dados.prioridade,
    )

    db.add(novo_desejo)
    await db.commit()
    await db.refresh(novo_desejo)

    return novo_desejo


# ─── Endpoint para Listagem de Desejos do Usuário ──────────────────────────────
@router.get(
    "/",
    response_model=List[DesejoResposta],
    status_code=status.HTTP_200_OK,
    summary="Lista todos os desejos cadastrados pelo usuário autenticado"
)
async def listar_desejos(
    prioridade: Optional[int] = Query(
        None,
        ge=1,
        le=3,
        description="Filtrar por prioridade: 1 (Baixa), 2 (Média), 3 (Alta)"
    ),
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(obter_usuario_atual)
):
    """
    Retorna os produtos salvos na lista de desejos do usuário,
    ordenados pela data de criação decrescente.
    Permite filtrar opcionalmente por prioridade específica.
    """
    consulta = select(WishlistItem).where(WishlistItem.user_id == usuario.id)

    if prioridade is not None:
        consulta = consulta.where(WishlistItem.priority == prioridade)

    consulta = consulta.order_by(WishlistItem.created_at.desc())

    resultado = await db.execute(consulta)
    desejos = resultado.scalars().all()
    return desejos


# ─── Endpoint para Exclusão de um Desejo ───────────────────────────────────────
@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um produto da lista de desejos"
)
async def excluir_desejo(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: User = Depends(obter_usuario_atual)
):
    """
    Remove o item especificado caso pertença ao usuário logado.
    """
    consulta = select(WishlistItem).where(
        WishlistItem.id == item_id,
        WishlistItem.user_id == usuario.id
    )
    resultado = await db.execute(consulta)
    item = resultado.scalars().first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"codigo": "DESEJO_NAO_ENCONTRADO", "mensagem": "Item de desejo não encontrado."}
        )

    await db.delete(item)
    await db.commit()
    return None
