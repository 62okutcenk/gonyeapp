from pydantic import BaseModel
from typing import List, Optional

class TenantCreate(BaseModel):
    name: str
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: bool = False

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: Optional[bool] = None
    subscription_active: Optional[bool] = None
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_plan: Optional[str] = None

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
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: bool = False
    created_at: str
    subscription_active: bool = False
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_plan: Optional[str] = None

class SubscriptionPlan(BaseModel):
    id: str = "gonye_plan"
    name: str = "Gönye Planı"
    price: float = 2500.0
    currency: str = "TRY"
    period: str = "monthly"
    features: List[str] = []

class SubscriptionActivate(BaseModel):
    card_holder_name: str
    card_number: str
    expiry_month: str
    expiry_year: str
    cvv: str

class SubscriptionResponse(BaseModel):
    is_active: bool
    plan_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_remaining: int = 0
