from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from models.common import (
    RoleCreate, RoleUpdate, RoleResponse,
    GroupCreate, GroupUpdate, GroupResponse,
    SubTaskCreate, SubTaskUpdate, SubTaskResponse,
    WorkItemCreate, WorkItemUpdate, WorkItemResponse
)
from middleware.auth import get_current_user, check_permission

router = APIRouter(prefix="/api", tags=["Setup"])

# ==================== ROLE ROUTES ====================

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(user: dict = Depends(get_current_user)):
    roles = await db.roles.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
    return [RoleResponse(**r) for r in roles]

@router.post("/roles", response_model=RoleResponse)
async def create_role(data: RoleCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.roles")
    
    role = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
        "permissions": data.permissions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.roles.insert_one(role)
    return RoleResponse(**role)

@router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, data: RoleUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.roles")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.roles.update_one(
            {"id": role_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    role = await db.roles.find_one({"id": role_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    return RoleResponse(**role)

@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.roles")
    
    result = await db.roles.delete_one({"id": role_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    return {"message": "Rol silindi"}

@router.get("/permissions")
async def get_permissions(user: dict = Depends(get_current_user)):
    permissions = await db.permissions.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
    return permissions

# ==================== GROUP ROUTES ====================

@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(user: dict = Depends(get_current_user)):
    groups = await db.groups.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    return [GroupResponse(**g) for g in groups]

@router.post("/groups", response_model=GroupResponse)
async def create_group(data: GroupCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.groups")
    
    group = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
        "order": data.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.groups.insert_one(group)
    return GroupResponse(**group)

@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(group_id: str, data: GroupUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.groups")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.groups.update_one(
            {"id": group_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    group = await db.groups.find_one({"id": group_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    return GroupResponse(**group)

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.groups")
    
    await db.subtasks.delete_many({"group_id": group_id, "tenant_id": user["tenant_id"]})
    
    result = await db.groups.delete_one({"id": group_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    return {"message": "Grup silindi"}

# ==================== SUBTASK ROUTES ====================

@router.get("/subtasks", response_model=List[SubTaskResponse])
async def get_subtasks(group_id: str = None, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["tenant_id"]}
    if group_id:
        query["group_id"] = group_id
    
    subtasks = await db.subtasks.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return [SubTaskResponse(**s) for s in subtasks]

@router.post("/subtasks", response_model=SubTaskResponse)
async def create_subtask(data: SubTaskCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.subtasks")
    
    group = await db.groups.find_one({"id": data.group_id, "tenant_id": user["tenant_id"]})
    if not group:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    
    subtask = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "group_id": data.group_id,
        "name": data.name,
        "description": data.description,
        "order": data.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subtasks.insert_one(subtask)
    return SubTaskResponse(**subtask)

@router.put("/subtasks/{subtask_id}", response_model=SubTaskResponse)
async def update_subtask(subtask_id: str, data: SubTaskUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.subtasks")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.subtasks.update_one(
            {"id": subtask_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    subtask = await db.subtasks.find_one({"id": subtask_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not subtask:
        raise HTTPException(status_code=404, detail="Alt görev bulunamadı")
    return SubTaskResponse(**subtask)

@router.delete("/subtasks/{subtask_id}")
async def delete_subtask(subtask_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.subtasks")
    
    result = await db.subtasks.delete_one({"id": subtask_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alt görev bulunamadı")
    return {"message": "Alt görev silindi"}

# ==================== WORK ITEM ROUTES ====================

@router.get("/workitems", response_model=List[WorkItemResponse])
async def get_workitems(user: dict = Depends(get_current_user)):
    workitems = await db.workitems.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(500)
    return [WorkItemResponse(**w) for w in workitems]

@router.post("/workitems", response_model=WorkItemResponse)
async def create_workitem(data: WorkItemCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.workitems")
    
    workitem = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
        "default_subtask_ids": data.default_subtask_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workitems.insert_one(workitem)
    return WorkItemResponse(**workitem)

@router.put("/workitems/{workitem_id}", response_model=WorkItemResponse)
async def update_workitem(workitem_id: str, data: WorkItemUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.workitems")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.workitems.update_one(
            {"id": workitem_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    workitem = await db.workitems.find_one({"id": workitem_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not workitem:
        raise HTTPException(status_code=404, detail="İş kalemi bulunamadı")
    return WorkItemResponse(**workitem)

@router.delete("/workitems/{workitem_id}")
async def delete_workitem(workitem_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.workitems")
    
    result = await db.workitems.delete_one({"id": workitem_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İş kalemi bulunamadı")
    return {"message": "İş kalemi silindi"}
