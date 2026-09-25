import uuid
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
from jwt.exceptions import PyJWTError

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, WishlistItem
from app.schemas.wishlist import WishlistItemCreate, WishlistItemUpdate, WishlistItemResponse

router = APIRouter(prefix="/api/v1/wishlist", tags=["Wishlist"])

async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Token de autenticação não fornecido."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN", "message": "Token inválido."},
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = uuid.UUID(user_id_str)
    except (PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token expirado ou inválido."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "Utilizador não encontrado."},
        )
    return user

@router.get("", response_model=List[WishlistItemResponse])
async def list_wishlist_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(WishlistItem)
        .where(WishlistItem.user_id == current_user.id)
        .order_by(WishlistItem.priority.asc(), WishlistItem.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def create_wishlist_item(
    item_in: WishlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_item = WishlistItem(
        user_id=current_user.id,
        url=str(item_in.url).strip(),
        title=item_in.title.strip() if item_in.title else None,
        image_url=str(item_in.image_url).strip() if item_in.image_url else None,
        priority=item_in.priority
    )
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=WishlistItemResponse)
async def update_wishlist_item(
    item_id: UUID,
    item_in: WishlistItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == current_user.id
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ITEM_NOT_FOUND", "message": "Desejo não encontrado."}
        )
    
    if item_in.title is not None:
        item.title = item_in.title.strip()
    if item_in.url is not None:
        item.url = str(item_in.url).strip()
    if item_in.image_url is not None:
        item.image_url = str(item_in.image_url).strip() if item_in.image_url else None
    if item_in.priority is not None:
        item.priority = item_in.priority

    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wishlist_item(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == current_user.id
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ITEM_NOT_FOUND", "message": "Desejo não encontrado."}
        )
    
    await db.delete(item)
    await db.commit()
    return None
