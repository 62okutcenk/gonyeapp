from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from database import db
from middleware.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Dashboard"])

@router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    user_id = user["id"]
    is_admin = user.get("is_admin", False)
    permissions = user.get("permissions_list", [])
    
    def has_permission(perm):
        return is_admin or perm in permissions
    
    result = {
        "total_projects": 0,
        "active_projects": 0,
        "completed_projects": 0,
        "stopped_projects": 0,
        "pending_tasks_count": 0,
        "my_urgent_tasks": [],
        "recent_projects": [],
        "project_status_distribution": [],
        "finance": None,
        "workload": None,
    }
    
    if has_permission("projects.view_all"):
        result["total_projects"] = await db.projects.count_documents({"tenant_id": tenant_id})
        result["active_projects"] = await db.projects.count_documents({
            "tenant_id": tenant_id, 
            "status": {"$in": ["planlandi", "uretimde", "montaj", "kontrol"]}
        })
        result["completed_projects"] = await db.projects.count_documents({
            "tenant_id": tenant_id, 
            "status": "tamamlandi"
        })
        result["stopped_projects"] = await db.projects.count_documents({
            "tenant_id": tenant_id, 
            "status": "durduruldu"
        })
        
        status_counts = {}
        async for doc in db.projects.aggregate([
            {"$match": {"tenant_id": tenant_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]):
            status_counts[doc["_id"]] = doc["count"]
        
        result["project_status_distribution"] = [
            {"status": "planlandi", "label": "Planlandı", "count": status_counts.get("planlandi", 0), "color": "#3b82f6"},
            {"status": "uretimde", "label": "Üretimde", "count": status_counts.get("uretimde", 0), "color": "#f59e0b"},
            {"status": "montaj", "label": "Montaj", "count": status_counts.get("montaj", 0), "color": "#8b5cf6"},
            {"status": "kontrol", "label": "Kontrol", "count": status_counts.get("kontrol", 0), "color": "#f97316"},
            {"status": "tamamlandi", "label": "Tamamlandı", "count": status_counts.get("tamamlandi", 0), "color": "#10b981"},
            {"status": "durduruldu", "label": "Durduruldu", "count": status_counts.get("durduruldu", 0), "color": "#ef4444"},
        ]
        
        recent_projects = await db.projects.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "id": 1, "name": 1, "status": 1, "customer_name": 1, "created_at": 1}
        ).sort("created_at", -1).limit(5).to_list(5)
        result["recent_projects"] = recent_projects
        
    else:
        assigned_project_ids = await db.project_assignments.distinct(
            "project_id",
            {"user_id": user_id, "tenant_id": tenant_id}
        )
        
        if assigned_project_ids:
            result["total_projects"] = await db.projects.count_documents({
                "tenant_id": tenant_id,
                "id": {"$in": assigned_project_ids}
            })
            result["active_projects"] = await db.projects.count_documents({
                "tenant_id": tenant_id,
                "id": {"$in": assigned_project_ids},
                "status": {"$in": ["planlandi", "uretimde", "montaj", "kontrol"]}
            })
            result["completed_projects"] = await db.projects.count_documents({
                "tenant_id": tenant_id,
                "id": {"$in": assigned_project_ids},
                "status": "tamamlandi"
            })
            
            status_counts = {}
            async for doc in db.projects.aggregate([
                {"$match": {"tenant_id": tenant_id, "id": {"$in": assigned_project_ids}}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]):
                status_counts[doc["_id"]] = doc["count"]
            
            result["project_status_distribution"] = [
                {"status": "planlandi", "label": "Planlandı", "count": status_counts.get("planlandi", 0), "color": "#3b82f6"},
                {"status": "uretimde", "label": "Üretimde", "count": status_counts.get("uretimde", 0), "color": "#f59e0b"},
                {"status": "montaj", "label": "Montaj", "count": status_counts.get("montaj", 0), "color": "#8b5cf6"},
                {"status": "kontrol", "label": "Kontrol", "count": status_counts.get("kontrol", 0), "color": "#f97316"},
                {"status": "tamamlandi", "label": "Tamamlandı", "count": status_counts.get("tamamlandi", 0), "color": "#10b981"},
            ]
            
            recent_projects = await db.projects.find(
                {"tenant_id": tenant_id, "id": {"$in": assigned_project_ids}},
                {"_id": 0, "id": 1, "name": 1, "status": 1, "customer_name": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5).to_list(5)
            result["recent_projects"] = recent_projects
    
    result["pending_tasks_count"] = await db.project_tasks.count_documents({
        "assigned_to": user_id,
        "tenant_id": tenant_id,
        "status": {"$ne": "tamamlandi"}
    })
    
    urgent_tasks = await db.project_tasks.find(
        {"assigned_to": user_id, "tenant_id": tenant_id, "status": {"$ne": "tamamlandi"}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for task in urgent_tasks:
        project = await db.projects.find_one({"id": task["project_id"]}, {"name": 1, "_id": 0})
        area = await db.project_areas.find_one({"id": task.get("area_id")}, {"name": 1, "_id": 0}) if task.get("area_id") else None
        task["project_name"] = project.get("name") if project else "-"
        task["area_name"] = area.get("name") if area else "-"
    
    result["my_urgent_tasks"] = urgent_tasks
    
    if has_permission("projects.manage_finance"):
        pipeline = [
            {"$match": {"tenant_id": tenant_id}},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$agreed_price"},
                "total_collected": {"$sum": {"$ifNull": ["$collected_amount", 0]}}
            }}
        ]
        
        finance_result = await db.project_areas.aggregate(pipeline).to_list(1)
        
        if finance_result:
            total_revenue = finance_result[0].get("total_revenue", 0)
            total_collected = finance_result[0].get("total_collected", 0)
        else:
            total_revenue = 0
            total_collected = 0
        
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        
        monthly_payments = []
        async for doc in db.project_payments.aggregate([
            {"$match": {"tenant_id": tenant_id, "created_at": {"$gte": six_months_ago.isoformat()}}},
            {"$group": {
                "_id": {"$substr": ["$payment_date", 0, 7]},
                "amount": {"$sum": "$amount"}
            }},
            {"$sort": {"_id": 1}}
        ]):
            monthly_payments.append({"month": doc["_id"], "amount": doc["amount"]})
        
        result["finance"] = {
            "total_revenue": total_revenue,
            "total_collected": total_collected,
            "total_remaining": total_revenue - total_collected,
            "collection_rate": (total_collected / total_revenue * 100) if total_revenue > 0 else 0,
            "monthly_payments": monthly_payments
        }
    
    if has_permission("users.view"):
        workload_data = []
        
        users_list = await db.users.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "id": 1, "full_name": 1}
        ).to_list(50)
        
        for u in users_list:
            task_count = await db.project_tasks.count_documents({
                "assigned_to": u["id"],
                "tenant_id": tenant_id,
                "status": {"$ne": "tamamlandi"}
            })
            workload_data.append({
                "user_id": u["id"],
                "user_name": u["full_name"],
                "active_tasks": task_count
            })
        
        workload_data.sort(key=lambda x: x["active_tasks"], reverse=True)
        
        result["workload"] = workload_data[:10]
    
    return result

@router.get("/search/global")
async def global_search(q: str, user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return {"projects": [], "customers": []}
    
    tenant_id = user["tenant_id"]
    user_id = user["id"]
    is_admin = user.get("is_admin", False)
    permissions = user.get("permissions_list", [])
    
    has_view_all = is_admin or "projects.view_all" in permissions
    
    results = {"projects": [], "customers": []}
    
    project_query = {
        "tenant_id": tenant_id,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"customer_name": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if not has_view_all:
        assigned_project_ids = await db.project_assignments.distinct(
            "project_id",
            {"user_id": user_id, "tenant_id": tenant_id}
        )
        project_query["id"] = {"$in": assigned_project_ids}
    
    projects = await db.projects.find(
        project_query,
        {"_id": 0, "id": 1, "name": 1, "customer_name": 1, "status": 1}
    ).limit(5).to_list(5)
    
    results["projects"] = projects
    
    customers = await db.customers.find(
        {
            "tenant_id": tenant_id,
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "type": 1}
    ).limit(5).to_list(5)
    
    results["customers"] = customers
    
    return results
