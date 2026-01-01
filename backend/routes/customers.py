from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from database import db
from models.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerStats
from middleware.auth import get_current_user, check_permission

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    if not user.get("is_admin") and "customers.view" not in user.get("permissions_list", []) and "customers.manage" not in user.get("permissions_list", []):
        raise HTTPException(status_code=403, detail="Müşterileri görüntüleme yetkiniz bulunmamaktadır")
    
    query = {"tenant_id": user["tenant_id"]}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if type:
        query["type"] = type
    
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@router.post("", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "customers.manage")
    
    valid_types = ["bireysel", "mimar", "muteahhit", "kurumsal"]
    if data.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Geçersiz müşteri tipi. Geçerli tipler: {valid_types}")
    
    customer = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "type": data.type,
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "address": data.address,
        "tax_office": data.tax_office,
        "tax_number": data.tax_number,
        "referral_source": data.referral_source,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer)
    return CustomerResponse(**customer)

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return CustomerResponse(**customer)

@router.get("/{customer_id}/stats", response_model=CustomerStats)
async def get_customer_stats(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    projects = await db.projects.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "status": 1}
    ).to_list(1000)
    
    total_projects = len(projects)
    active_projects = len([p for p in projects if p["status"] not in ["tamamlandi", "iptal"]])
    completed_projects = len([p for p in projects if p["status"] == "tamamlandi"])
    
    project_ids = [p["id"] for p in projects]
    
    total_revenue = 0
    total_collected = 0
    
    if project_ids:
        areas = await db.project_areas.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0, "agreed_price": 1, "id": 1}
        ).to_list(1000)
        
        total_revenue = sum(a.get("agreed_price", 0) for a in areas)
        
        payments = await db.project_payments.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0, "amount": 1}
        ).to_list(10000)
        
        total_collected = sum(p.get("amount", 0) for p in payments)
    
    return CustomerStats(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        total_revenue=total_revenue,
        total_collected=total_collected,
        total_remaining=total_revenue - total_collected
    )

@router.get("/{customer_id}/projects")
async def get_customer_projects(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    projects = await db.projects.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for project in projects:
        areas = await db.project_areas.find(
            {"project_id": project["id"]},
            {"_id": 0}
        ).to_list(100)
        
        total_agreed = sum(a.get("agreed_price", 0) for a in areas)
        
        payments = await db.project_payments.find(
            {"project_id": project["id"]},
            {"_id": 0, "amount": 1}
        ).to_list(1000)
        total_collected = sum(p.get("amount", 0) for p in payments)
        
        result.append({
            **project,
            "total_agreed": total_agreed,
            "total_collected": total_collected,
            "total_remaining": total_agreed - total_collected
        })
    
    return result

@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str, 
    data: CustomerUpdate, 
    user: dict = Depends(get_current_user)
):
    check_permission(user, "customers.manage")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    if data.type:
        valid_types = ["bireysel", "mimar", "muteahhit", "kurumsal"]
        if data.type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Geçersiz müşteri tipi. Geçerli tipler: {valid_types}")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.customers.update_one(
            {"id": customer_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    updated_customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    return CustomerResponse(**updated_customer)

@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "customers.manage")
    
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    project_count = await db.projects.count_documents({
        "customer_id": customer_id, 
        "tenant_id": user["tenant_id"]
    })
    
    if project_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Bu müşterinin {project_count} projesi bulunmaktadır. Önce projeleri silmeniz veya başka müşteriye atamanız gerekmektedir."
        )
    
    await db.customers.delete_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    return {"message": "Müşteri başarıyla silindi"}
