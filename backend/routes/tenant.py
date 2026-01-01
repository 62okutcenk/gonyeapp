from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta

from database import db
from models.tenant import TenantResponse, TenantUpdate, SubscriptionResponse, SubscriptionActivate
from middleware.auth import get_current_user, check_permission

router = APIRouter(prefix="/api", tags=["Tenant"])

@router.get("/tenant", response_model=TenantResponse)
async def get_tenant(user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    return TenantResponse(**tenant)

@router.put("/tenant", response_model=TenantResponse)
async def update_tenant(data: TenantUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "settings.manage")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.tenants.update_one(
            {"id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    return TenantResponse(**tenant)

# Subscription Routes
@router.get("/subscription/plan")
async def get_subscription_plan():
    return {
        "id": "gonye_plan",
        "name": "Gönye Planı",
        "price": 2500.0,
        "currency": "TRY",
        "period": "monthly",
        "period_label": "Aylık",
        "features": [
            "Sınırsız proje oluşturma",
            "Sınırsız kullanıcı ekleme",
            "Gelişmiş raporlama",
            "Dosya yönetimi",
            "Öncelikli destek",
            "Tüm özellikler dahil"
        ]
    }

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    
    days_remaining = 0
    if tenant.get("subscription_end"):
        end_date = datetime.fromisoformat(tenant["subscription_end"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if end_date > now:
            days_remaining = (end_date - now).days
    
    return SubscriptionResponse(
        is_active=tenant.get("subscription_active", False),
        plan_name=tenant.get("subscription_plan"),
        start_date=tenant.get("subscription_start"),
        end_date=tenant.get("subscription_end"),
        days_remaining=days_remaining
    )

@router.post("/subscription/activate", response_model=SubscriptionResponse)
async def activate_subscription(data: SubscriptionActivate, user: dict = Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Yalnızca yöneticiler abonelik işlemi yapabilir")
    
    now = datetime.now(timezone.utc)
    end_date = now + timedelta(days=30)
    
    update_data = {
        "subscription_active": True,
        "subscription_start": now.isoformat(),
        "subscription_end": end_date.isoformat(),
        "subscription_plan": "Gönye Planı"
    }
    
    await db.tenants.update_one(
        {"id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    await db.subscription_logs.insert_one({
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "user_id": user["id"],
        "action": "activated",
        "plan": "Gönye Planı",
        "amount": 2500.0,
        "card_last_four": data.card_number[-4:] if len(data.card_number) >= 4 else "****",
        "created_at": now.isoformat()
    })
    
    return SubscriptionResponse(
        is_active=True,
        plan_name="Gönye Planı",
        start_date=now.isoformat(),
        end_date=end_date.isoformat(),
        days_remaining=30
    )

import uuid
