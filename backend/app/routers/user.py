from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud import user as crud_user
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=UserResponse,
    status_code=201,
    responses={400: {"description": "Username already taken"}},
)

def create_user(body: UserCreate, db: Annotated[Session, Depends(get_db)]):
    existing = crud_user.get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    return crud_user.create_user(db, body.username, keycloak_sub=body.username, email=body.email)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    responses={404: {"description": "User not found"}},
)

def get_user(user_id: str, db: Annotated[Session, Depends(get_db)]):
    user = crud_user.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
