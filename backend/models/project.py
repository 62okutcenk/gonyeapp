from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Area Work Item
class AreaWorkItemCreate(BaseModel):
    work_item_id: str
    work_item_name: Optional[str] = None
    quantity: int = 1
    notes: Optional[str] = None

# Project Area Models
class ProjectAreaCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    work_items: List[AreaWorkItemCreate] = []
    agreed_price: float = 0
    status: str = "planlandi"

class ProjectAreaUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    agreed_price: Optional[float] = None
    status: Optional[str] = None

class ProjectAreaResponse(BaseModel):
    id: str
    project_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    work_items: List[Dict[str, Any]] = []
    agreed_price: float = 0
    collected_amount: float = 0
    remaining_amount: float = 0
    status: str
    progress: float = 0.0
    created_at: str
    updated_at: str

# Project Assignment Models
class ProjectAssignmentCreate(BaseModel):
    user_id: str
    assignment_type: str  # "project" or "area"
    area_id: Optional[str] = None

class ProjectAssignmentResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str
    assignment_type: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    created_at: str

# Project Payment Models
class ProjectPaymentCreate(BaseModel):
    area_id: str
    amount: float
    payment_date: str
    payment_method: str = "nakit"
    notes: Optional[str] = None

class ProjectPaymentResponse(BaseModel):
    id: str
    project_id: str
    area_id: str
    area_name: str
    amount: float
    payment_date: str
    payment_method: str
    notes: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str

# Project Activity Log Models
class ProjectActivityResponse(BaseModel):
    id: str
    project_id: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    user_id: str
    user_name: str
    action: str
    description: str
    metadata: Dict[str, Any] = {}
    created_at: str

# Main Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    areas: List[ProjectAreaCreate] = []
    assigned_users: List[ProjectAssignmentCreate] = []
    due_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class ProjectTaskResponse(BaseModel):
    id: str
    project_id: str
    area_id: str
    work_item_id: str
    work_item_name: str
    group_id: str
    group_name: str
    subtask_id: str
    subtask_name: str
    status: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: str
    updated_at: str

class ProjectFinanceSummary(BaseModel):
    total_agreed: float = 0
    total_collected: float = 0
    total_remaining: float = 0
    areas_summary: List[Dict[str, Any]] = []

class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    status: str
    due_date: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str
    areas: List[ProjectAreaResponse] = []
    assignments: List[ProjectAssignmentResponse] = []
    finance: ProjectFinanceSummary = ProjectFinanceSummary()
    progress: float = 0.0
