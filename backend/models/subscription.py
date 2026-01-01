from pydantic import BaseModel
from typing import Optional

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price: float
    currency: str = "TRY"
    period: str = "monthly"
    features: list = []

class SubscriptionActivate(BaseModel):
    plan_id: str
    card_holder: str
    card_number: str
    expiry_date: str
    cvv: str

class SubscriptionResponse(BaseModel):
    id: str
    tenant_id: str
    plan_id: str
    plan_name: str
    price: float
    currency: str
    is_active: bool
    start_date: str
    end_date: str
    days_remaining: int
    created_at: str
