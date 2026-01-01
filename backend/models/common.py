from pydantic import BaseModel
from typing import List, Optional

# Permission Models
class PermissionCreate(BaseModel):
    key: str
    name: str
    description: Optional[str] = None

# Role Models
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

# Group Models
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class GroupResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    order: int
    created_at: str

# SubTask Models
class SubTaskCreate(BaseModel):
    group_id: str
    name: str
    description: Optional[str] = None
    order: int = 0

class SubTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class SubTaskResponse(BaseModel):
    id: str
    tenant_id: str
    group_id: str
    name: str
    description: Optional[str] = None
    order: int
    created_at: str

# WorkItem Models
class WorkItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_subtask_ids: List[str] = []

class WorkItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_subtask_ids: Optional[List[str]] = None

class WorkItemResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    default_subtask_ids: List[str] = []
    created_at: str
