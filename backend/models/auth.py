from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    tenant_id: str
    role_id: Optional[str] = None
    color: str = "#4a4036"
    avatar_url: Optional[str] = None
    is_admin: bool = False
    setup_completed: bool = False
    permissions_list: list = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_id: Optional[str] = None
    color: str = "#4a4036"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[str] = None
    color: Optional[str] = None
    avatar_url: Optional[str] = None
