from pydantic import BaseModel


class LoginResponse(BaseModel):
    username: str | None = None
    email: str | None = None
    expires_at: int | None = None
