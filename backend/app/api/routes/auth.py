from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.get("/check-email")
async def check_email(
    email: EmailStr = Query(..., description="E-mail a verificar"),
    db: AsyncSession = Depends(get_db),
):
    """Indica se um e-mail já está registado (para feedback no formulário)."""
    normalized = str(email).strip().lower()
    result = await db.execute(select(User).where(User.email == normalized))
    exists = result.scalars().first() is not None
    return {
        "email": normalized,
        "available": not exists,
        "message": (
            "Este e-mail já tem conta. Experimente entrar."
            if exists
            else "E-mail disponível."
        ),
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email.strip().lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=400,
            detail={"code": "EMAIL_ALREADY_EXISTS", "message": "Este e-mail já está em uso. Experimente entrar."}
        )
    
    # Create new user
    new_user = User(
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Email ou senha incorretos."}
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}
