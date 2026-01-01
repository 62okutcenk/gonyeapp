from pydantic import BaseModel
from typing import Optional

class CustomerCreate(BaseModel):
    type: str = "bireysel"  # bireysel, mimar, muteahhit, kurumsal
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    tenant_id: str
    type: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class CustomerStats(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    total_revenue: float = 0
    total_collected: float = 0
    total_remaining: float = 0
