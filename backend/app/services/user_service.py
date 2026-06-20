from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.crud import user as crud_user
from app.models.user import User


def get_user(db: Session, user_id: UUID | str) -> User | None:
    return crud_user.get_user(db, user_id)


def get_user_by_username(db: Session, username: str) -> User | None:
    return crud_user.get_user_by_username(db, username)


def get_user_by_keycloak_sub(db: Session, keycloak_sub: str) -> User | None:
    return crud_user.get_user_by_keycloak_sub(db, keycloak_sub)


def create_user(db: Session, username: str, keycloak_sub: str, email: str) -> User:
    return crud_user.create_user(db, username, keycloak_sub=keycloak_sub, email=email)
