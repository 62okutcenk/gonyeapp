from pydantic import BaseModel
from typing import List, Optional

class PermissionCreate(BaseModel):
    key: str
    name: str
    description: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class RoleResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    created_at: str
