"""
Módulo de Dependências da API
Fornece funções reutilizáveis de injeção de dependência para autenticação e segurança.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
import uuid

from app.db.database import get_db
from app.db.models import User
from app.core.config import settings

# Esquema de autenticação Bearer padrão para extrair o token do cabeçalho Authorization
seguranca_bearer = HTTPBearer(auto_error=True)


# ─── Injeção de Dependência: Usuário Autenticado Atual ─────────────────────────
async def obter_usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(seguranca_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Valida o token JWT recebido no cabeçalho Authorization: Bearer <token>.
    Recupera o ID do usuário (sub) e busca a entidade correspondente no banco de dados.
    Lança HTTPException 401 caso o token seja inválido, expirado ou o usuário não exista.
    """
    token = credenciais.credentials
    excecao_nao_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"codigo": "CREDENCIAIS_INVALIDAS", "mensagem": "Token inválido ou expirado."},
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decodifica e valida o payload do JWT
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise excecao_nao_autenticado
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise excecao_nao_autenticado

    # Busca o usuário ativo no banco de dados SQLite
    resultado = await db.execute(select(User).where(User.id == user_id))
    usuario = resultado.scalars().first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"codigo": "USUARIO_NAO_ENCONTRADO", "mensagem": "Usuário associado ao token não encontrado."}
        )

    return usuario
