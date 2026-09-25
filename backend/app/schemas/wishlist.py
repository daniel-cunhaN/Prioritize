from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, HttpUrl, Field

class WishlistItemCreate(BaseModel):
    url: str = Field(..., min_length=1, description="URL do item")
    title: str = Field(..., min_length=1, max_length=255, description="Título do desejo")
    image_url: str | None = Field(default=None, description="URL da imagem do produto")
    priority: int = Field(default=1, ge=1, le=5, description="Nível de prioridade de 1 a 5")

class WishlistItemUpdate(BaseModel):
    url: str | None = None
    title: str | None = None
    image_url: str | None = None
    priority: int | None = Field(default=None, ge=1, le=5)

class WishlistItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    url: str
    title: str | None
    image_url: str | None
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
