from database import db
from datetime import datetime, timezone
import uuid
from utils.constants import PROJECT_LOCKED_STATUSES
from fastapi import HTTPException

async def can_access_project(user: dict, project_id: str, area_id: str = None) -> bool:
    """Check if user has access to project/area based on permissions and assignments"""
    if user.get("is_admin"):
        return True
    
    # Check if user has view_all permission
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
        if role and "projects.view_all" in role.get("permissions", []):
            return True
    
    # Check if user is assigned to project or specific area
    assignment_query = {"project_id": project_id, "user_id": user["id"]}
    assignment = await db.project_assignments.find_one(assignment_query, {"_id": 0})
    
    if assignment:
        if assignment["assignment_type"] == "project":
            return True
        if assignment["assignment_type"] == "area" and area_id and assignment.get("area_id") == area_id:
            return True
    
    # Check if user is the creator
    project = await db.projects.find_one({"id": project_id}, {"created_by": 1, "_id": 0})
    if project and project.get("created_by") == user["id"]:
        return True
    
    return False

async def log_project_activity(
    project_id: str, 
    tenant_id: str,
    user_id: str,
    user_name: str,
    action: str, 
    description: str,
    area_id: str = None,
    area_name: str = None,
    metadata: dict = None
):
    activity = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "tenant_id": tenant_id,
        "area_id": area_id,
        "area_name": area_name,
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "description": description,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    activity_to_insert = {k: v for k, v in activity.items() if k != "_id"}
    await db.project_activities.insert_one(activity_to_insert)
    return activity

async def check_project_locked(project_id: str, user: dict) -> dict:
    """
    Check if project is locked (completed/stopped) and if user can modify.
    Returns: {"locked": bool, "reason": str or None, "can_modify": bool}
    """
    project = await db.projects.find_one(
        {"id": project_id, "tenant_id": user["tenant_id"]},
        {"status": 1, "name": 1, "_id": 0}
    )
    
    if not project:
        return {"locked": False, "reason": None, "can_modify": True}
    
    status = project.get("status")
    
    if status in PROJECT_LOCKED_STATUSES:
        if user.get("is_admin"):
            return {"locked": True, "reason": None, "can_modify": True}
        
        if status == "durduruldu":
            return {
                "locked": True, 
                "reason": "Bu proje durdurulmuştur. Sadece yönetici işlem yapabilir.",
                "can_modify": False
            }
        elif status == "tamamlandi":
            return {
                "locked": True,
                "reason": "Bu proje tamamlanmıştır. Sadece yönetici işlem yapabilir.",
                "can_modify": False
            }
    
    return {"locked": False, "reason": None, "can_modify": True}

async def enforce_project_lock(project_id: str, user: dict):
    """Raise exception if project is locked and user cannot modify"""
    lock_info = await check_project_locked(project_id, user)
    if lock_info["locked"] and not lock_info["can_modify"]:
        raise HTTPException(status_code=403, detail=lock_info["reason"])
