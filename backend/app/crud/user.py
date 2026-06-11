from sqlalchemy.orm import Session
from app.models.user import User


def get_user(db: Session, user_id) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.query(User).filter(User.username == username).first()

def get_user_by_keycloak_sub(db: Session, keycloak_sub: str) -> User | None:
    return db.query(User).filter(User.keycloak_sub == keycloak_sub).first()

def create_user(db: Session, username: str, keycloak_sub: str, email: str) -> User:
    user = User(username=username, keycloak_sub=keycloak_sub, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
