from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    email: str


class UserResponse(BaseModel):
    id: UUID
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}
