from pydantic import BaseModel
from typing import Optional

class TenantCreate(BaseModel):
    name: str
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    logo_url: Optional[str] = None
    setup_completed: Optional[bool] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    logo_url: Optional[str] = None
    setup_completed: bool = False
    created_at: str
