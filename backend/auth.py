from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from beanie import PydanticObjectId
import os

from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")))
    )
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode,
        os.getenv("SECRET_KEY"),
        algorithm=os.getenv("ALGORITHM", "HS256"),
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM", "HS256")],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await User.get(PydanticObjectId(user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_agent(user: User = Depends(get_current_user)) -> User:
    if user.role != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    return user


async def require_company(user: User = Depends(get_current_user)) -> User:
    if user.company_id is None:
        raise HTTPException(
            status_code=403, detail="You must be assigned to a company first"
        )
    return user
