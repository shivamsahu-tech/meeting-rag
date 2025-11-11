import os
import time
import logging
from fastapi import HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr
from auth.db import prisma
from redis_client import redis_client
import json
from jose import JWTError

from auth.jwt import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    COOKIE_NAME,
    JWT_EXPIRE_MINUTES,
)

logger = logging.getLogger("auth_controller")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()

formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s", "%Y-%m-%d %H:%M:%S"
)
handler.setFormatter(formatter)
logger.addHandler(handler)



class LoginModel(BaseModel):
    email: EmailStr
    password: str


class SignUpModel(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserOutModel(BaseModel):
    id: str
    name: str
    email: str
    index_name_pdf: str | None = None
    index_name_ocr: str | None = None


async def sign_up_user(payload: SignUpModel, response: Response) -> UserOutModel:
    logger.info(f"Sign-up attempt for email: {payload.email}")

    existing_user = await prisma.user.find_unique(where={"email": payload.email})
    if existing_user:
        logger.warning(f"Sign-up failed: Email {payload.email} already registered")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = hash_password(payload.password)
    user = await prisma.user.create(
        data={ "name" : payload.name, "email": payload.email, "hashed_password": hashed_password}
    )

    access_token = create_access_token(subject=str(user.id))

    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=JWT_EXPIRE_MINUTES * 60,
        secure=False,  # set True in production (HTTPS)
        samesite="lax",
        path="/",
    )

    logger.info(f"New user created: {user.email} (id={user.id})")
    return UserOutModel(id=user.id, email=user.email, name=user.name, index_name_pdf=user.index_name_pdf or "", index_name_ocr=user.index_name_ocr or "")


async def login_user(payload: LoginModel, response: Response) -> UserOutModel:
    logger.info(f"Login attempt for email: {payload.email}")

    user = await prisma.user.find_unique(where={"email": payload.email})

    if not user:
        logger.warning(f"Login failed: No user found for email {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Login failed: Incorrect password for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(subject=str(user.id))
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=JWT_EXPIRE_MINUTES * 60,
        secure=False,
        samesite="lax",
        path="/",
    )

    logger.info(f"User logged in: {user.email}")
    return UserOutModel(id=user.id, email=user.email, name=user.name, index_name_pdf=user.index_name_pdf or "", index_name_ocr=user.index_name_ocr or "")



async def logout_user(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    logger.info("User logged out successfully")
    return {"message": "Logged out successfully"}


async def get_current_user(request: Request) -> UserOutModel:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        cached_user = await redis_client.get(f"user:{user_id}")
        if cached_user:
            print("🔹 Returning user from Redis cache")
            user_data = json.loads(cached_user)
            return UserOutModel(**user_data)

        print("⚙️ Fetching user from database...")
        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        user_data = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "index_name_pdf": user.index_name_pdf or "",
            "index_name_ocr": user.index_name_ocr or "",
        }

        await redis_client.setex(f"user:{user_id}", 300, json.dumps(user_data))

        return UserOutModel(**user_data)

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )