"""
Módulo de Schemas Pydantic para Desejos (Wishlist)
Define os modelos de dados para validação de entrada e serialização de resposta.
Todos os campos e comentários seguem as diretrizes do projeto em português brasileiro.
"""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ─── Schema para Requisição de Pré-visualização de Link ───────────────────────
class DesejoPreviewRequisicao(BaseModel):
    """
    Recebe a URL fornecida pelo usuário para extração automática
    de título e imagem do produto através do serviço de scraper.
    """
    url: str = Field(..., description="URL do produto a ser analisada")


# ─── Schema de Resposta da Pré-visualização ───────────────────────────────────
class DesejoPreviewResposta(BaseModel):
    """
    Retorna os dados extraídos da URL para preenchimento prévio
    no modal de adicionar desejo.
    """
    url: str = Field(..., description="URL original ou normalizada")
    titulo: Optional[str] = Field(None, description="Título extraído da página ou OpenGraph")
    imagem_url: Optional[str] = Field(None, description="URL da imagem principal encontrada na página")


# ─── Schema para Criação de um Novo Desejo ─────────────────────────────────────
class DesejoCriar(BaseModel):
    """
    Dados recebidos pelo backend quando o usuário confirma a criação
    de um novo desejo dentro do modal.
    Escala de prioridade:
      1: Baixa
      2: Média
      3: Alta
    """
    url: str = Field(..., description="Link original do produto")
    titulo: str = Field(..., min_length=1, max_length=255, description="Título ou nome do produto")
    imagem_url: Optional[str] = Field(None, description="Link da imagem representativa do produto")
    prioridade: int = Field(..., ge=1, le=3, description="Nível de importância: 1 (Baixa), 2 (Média), 3 (Alta)")


# ─── Schema de Resposta Completa do Desejo ─────────────────────────────────────
class DesejoResposta(BaseModel):
    """
    Representação do item de desejo persistido no banco de dados.
    """
    id: UUID
    user_id: UUID
    url: str
    titulo: Optional[str] = Field(None, alias="title")
    imagem_url: Optional[str] = Field(None, alias="image_url")
    prioridade: int = Field(..., alias="priority")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
