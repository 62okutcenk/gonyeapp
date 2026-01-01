from pydantic import BaseModel
from typing import List, Optional

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    created_at: str

class SubTaskCreate(BaseModel):
    group_id: str
    name: str
    description: Optional[str] = None

class SubTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SubTaskResponse(BaseModel):
    id: str
    tenant_id: str
    group_id: str
    name: str
    description: Optional[str] = None
    created_at: str

class WorkItemCreate(BaseModel):
    name: str
    unit: str
    unit_price: float = 0

class WorkItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None

class WorkItemResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    unit: str
    unit_price: float = 0
    created_at: str

class AreaWorkItemCreate(BaseModel):
    work_item_id: str
    quantity: float = 1
    unit_price: float = 0
    notes: Optional[str] = None

class ProjectAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    agreed_price: float = 0
    work_items: List[AreaWorkItemCreate] = []

class ProjectAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    agreed_price: Optional[float] = None
    work_items: Optional[List[AreaWorkItemCreate]] = None

class ProjectAreaResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    agreed_price: float = 0
    work_items: List[dict] = []
    tasks: List[dict] = []
    created_at: str

class ProjectAssignmentCreate(BaseModel):
    user_id: str
    role: str = "member"

class ProjectAssignmentResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str
    user_email: str
    user_color: str
    role: str
    assigned_at: str

class ProjectPaymentCreate(BaseModel):
    amount: float
    payment_date: str
    payment_method: str = "nakit"
    description: Optional[str] = None
    receipt_no: Optional[str] = None

class ProjectPaymentResponse(BaseModel):
    id: str
    project_id: str
    amount: float
    payment_date: str
    payment_method: str
    description: Optional[str] = None
    receipt_no: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str

class ProjectActivityResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str
    action: str
    details: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    created_at: str

class ProjectCreate(BaseModel):
    name: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class ProjectTaskResponse(BaseModel):
    id: str
    area_id: str
    subtask_id: str
    subtask_name: str
    group_id: str
    group_name: str
    status: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    notes: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str

class ProjectFinanceSummary(BaseModel):
    total_agreed: float = 0
    total_collected: float = 0
    remaining: float = 0

class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    description: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    deadline: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    finance_summary: Optional[ProjectFinanceSummary] = None
    progress: float = 0
    created_at: str
