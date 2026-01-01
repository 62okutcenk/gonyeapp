from fastapi import HTTPException
from config import db

def check_permission(user: dict, permission_key: str):
    """Check if user has the required permission"""
    # Admin users have all permissions
    if user.get("is_admin", False) is True:
        return True
    
    # Check user's permission list
    user_perms = user.get("permissions_list", [])
    
    # Check if user has the specific permission
    if permission_key not in user_perms:
        raise HTTPException(
            status_code=403,
            detail=f"Bu işlem için yetkiniz bulunmamaktadır. Gereken yetki: {permission_key}"
        )
    
    return True

def has_permission(user: dict, permission_key: str) -> bool:
    """Check if user has permission without raising exception"""
    if user.get("is_admin", False) is True:
        return True
    return permission_key in user.get("permissions_list", [])

async def check_project_access(user: dict, project_id: str) -> bool:
    """Check if user has access to a specific project"""
    if user.get("is_admin"):
        return True
    
    # Check if user has view_all permission
    if has_permission(user, "projects.view_all"):
        return True
    
    # Check if user is assigned to the project
    assignment = await db.project_assignments.find_one({
        "project_id": project_id,
        "user_id": user["id"]
    })
    
    return assignment is not None

async def check_project_locked(project_id: str, user: dict) -> dict:
    """Check if project is locked (paused or completed)"""
    project = await db.projects.find_one(
        {"id": project_id},
        {"_id": 0, "status": 1, "name": 1}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    is_locked = project["status"] in ["durduruldu", "tamamlandi"]
    
    # Admin can still edit locked projects
    if is_locked and not user.get("is_admin"):
        return {
            "locked": True,
            "reason": "paused" if project["status"] == "durduruldu" else "completed",
            "message": f"Bu proje {'durdurulmuş' if project['status'] == 'durduruldu' else 'tamamlanmış'}. Değişiklik yapmak için yönetici yetkisi gereklidir."
        }
    
    return {"locked": False, "reason": None, "message": None}

async def enforce_project_lock(project_id: str, user: dict):
    """Raise exception if project is locked and user is not admin"""
    lock_status = await check_project_locked(project_id, user)
    if lock_status["locked"]:
        raise HTTPException(status_code=403, detail=lock_status["message"])
