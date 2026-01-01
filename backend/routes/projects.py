from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from models.project import (
    ProjectCreate, ProjectUpdate, ProjectAreaCreate, ProjectAreaUpdate,
    ProjectAssignmentCreate, ProjectPaymentCreate, ProjectTaskUpdate
)
from middleware.auth import get_current_user, check_permission
from services.project_service import can_access_project, log_project_activity, enforce_project_lock
from services.notification_service import create_notification, notify_project_team
from utils.constants import PROJECT_STATUS_LABELS, PROJECT_LOCKED_STATUSES

router = APIRouter(prefix="/api/projects", tags=["Projects"])

# ==================== HELPER FUNCTIONS ====================

async def create_project_area_internal(
    project_id: str, tenant_id: str, user_id: str, user_name: str, area_data: ProjectAreaCreate
):
    area_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    area_work_items = []
    for wi in area_data.work_items:
        workitem = await db.workitems.find_one({"id": wi.work_item_id, "tenant_id": tenant_id}, {"_id": 0})
        if workitem:
            area_work_items.append({
                "work_item_id": workitem["id"],
                "work_item_name": workitem["name"],
                "quantity": wi.quantity,
                "notes": wi.notes
            })
            
            subtasks = await db.subtasks.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(500)
            groups = await db.groups.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
            group_map = {g["id"]: g for g in groups}
            
            for subtask in subtasks:
                group = group_map.get(subtask["group_id"], {})
                task = {
                    "id": str(uuid.uuid4()),
                    "project_id": project_id,
                    "area_id": area_id,
                    "tenant_id": tenant_id,
                    "work_item_id": workitem["id"],
                    "work_item_name": workitem["name"],
                    "group_id": subtask["group_id"],
                    "group_name": group.get("name", ""),
                    "subtask_id": subtask["id"],
                    "subtask_name": subtask["name"],
                    "status": "bekliyor",
                    "notes": None,
                    "assigned_to": None,
                    "created_at": now,
                    "updated_at": now
                }
                await db.project_tasks.insert_one(task)
    
    area = {
        "id": area_id,
        "project_id": project_id,
        "tenant_id": tenant_id,
        "name": area_data.name,
        "address": area_data.address,
        "city": area_data.city,
        "district": area_data.district,
        "work_items": area_work_items,
        "agreed_price": area_data.agreed_price,
        "status": area_data.status,
        "created_at": now,
        "updated_at": now
    }
    
    await db.project_areas.insert_one(area)
    
    await log_project_activity(
        project_id, tenant_id, user_id, user_name,
        "area_created", f"'{area_data.name}' alanı eklendi.",
        area_id, area_data.name,
        {"agreed_price": area_data.agreed_price}
    )
    
    return {
        **area,
        "collected_amount": 0,
        "remaining_amount": area_data.agreed_price,
        "progress": 0.0
    }

async def create_project_assignment_internal(
    project_id: str, tenant_id: str, assigner_id: str, assigner_name: str, assignment_data: ProjectAssignmentCreate
):
    assigned_user = await db.users.find_one({"id": assignment_data.user_id, "tenant_id": tenant_id}, {"_id": 0})
    if not assigned_user:
        return None
    
    area_name = None
    if assignment_data.assignment_type == "area" and assignment_data.area_id:
        area = await db.project_areas.find_one({"id": assignment_data.area_id}, {"name": 1, "_id": 0})
        area_name = area.get("name") if area else None
    
    assignment = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "tenant_id": tenant_id,
        "user_id": assignment_data.user_id,
        "assignment_type": assignment_data.assignment_type,
        "area_id": assignment_data.area_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.project_assignments.insert_one(assignment)
    
    project = await db.projects.find_one({"id": project_id}, {"name": 1, "_id": 0})
    project_name = project.get("name") if project else "Proje"
    
    if assignment_data.user_id != assigner_id:
        if assignment_data.assignment_type == "area":
            msg = f"'{project_name}' projesinin '{area_name}' alanına atandınız."
        else:
            msg = f"'{project_name}' projesine atandınız."
        
        await create_notification(
            assignment_data.user_id,
            tenant_id,
            "Projeye Atandınız",
            msg,
            "info",
            f"/projects/{project_id}"
        )
    
    await log_project_activity(
        project_id, tenant_id, assigner_id, assigner_name,
        "staff_assigned",
        f"{assigned_user['full_name']} {'projeye' if assignment_data.assignment_type == 'project' else area_name + ' alanına'} atandı.",
        assignment_data.area_id, area_name,
        {"assigned_user_id": assignment_data.user_id, "assigned_user_name": assigned_user["full_name"]}
    )
    
    return {
        **assignment,
        "user_name": assigned_user["full_name"],
        "area_name": area_name
    }

# ==================== PROJECT LIST ====================

@router.get("")
async def get_projects(status: str = None, user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    has_view_all = user.get("is_admin", False)
    if not has_view_all and user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
        if role and "projects.view_all" in role.get("permissions", []):
            has_view_all = True
    
    if has_view_all:
        query = {"tenant_id": tenant_id}
    else:
        assignments = await db.project_assignments.find(
            {"user_id": user["id"]},
            {"project_id": 1, "_id": 0}
        ).to_list(1000)
        assigned_project_ids = list(set([a["project_id"] for a in assignments]))
        
        query = {
            "tenant_id": tenant_id,
            "$or": [
                {"id": {"$in": assigned_project_ids}},
                {"created_by": user["id"]}
            ]
        }
    
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for project in projects:
        areas = await db.project_areas.find({"project_id": project["id"]}, {"_id": 0}).to_list(100)
        
        total_agreed = sum(a.get("agreed_price", 0) for a in areas)
        payments = await db.project_payments.find({"project_id": project["id"]}, {"amount": 1, "_id": 0}).to_list(1000)
        total_collected = sum(p.get("amount", 0) for p in payments)
        
        tasks = await db.project_tasks.find({"project_id": project["id"]}, {"status": 1, "_id": 0}).to_list(1000)
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "tamamlandi"])
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        creator = await db.users.find_one({"id": project.get("created_by")}, {"full_name": 1, "_id": 0})
        creator_name = creator.get("full_name") if creator else None
        
        project_data = {
            **project,
            "created_by_name": creator_name,
            "areas": [],
            "assignments": [],
            "finance": {
                "total_agreed": total_agreed,
                "total_collected": total_collected,
                "total_remaining": total_agreed - total_collected,
                "areas_summary": []
            },
            "progress": progress
        }
        result.append(project_data)
    
    return result

# ==================== CREATE PROJECT ====================

@router.post("")
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.create")
    
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project = {
        "id": project_id,
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
        "customer_id": data.customer_id,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "customer_email": data.customer_email,
        "status": "planlandi",
        "due_date": data.due_date,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.projects.insert_one(project)
    
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "project_created", f"'{data.name}' projesi oluşturuldu."
    )
    
    # Create project chat conversation
    project_chat = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "type": "project",
        "name": f"{data.name} Sohbeti",
        "project_id": project_id,
        "participant_ids": [user["id"]],
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.conversations.insert_one(project_chat)
    
    created_areas = []
    for area_data in data.areas:
        area = await create_project_area_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], area_data
        )
        created_areas.append(area)
    
    created_assignments = []
    for assignment_data in data.assigned_users:
        assignment = await create_project_assignment_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], assignment_data
        )
        if assignment:
            created_assignments.append(assignment)
            # Add to project chat
            await db.conversations.update_one(
                {"project_id": project_id, "type": "project"},
                {"$addToSet": {"participant_ids": assignment_data.user_id}}
            )
    
    creator_name = user["full_name"]
    
    return {
        **project,
        "created_by_name": creator_name,
        "areas": created_areas,
        "assignments": created_assignments,
        "finance": {
            "total_agreed": sum(a.get("agreed_price", 0) for a in created_areas),
            "total_collected": 0,
            "total_remaining": sum(a.get("agreed_price", 0) for a in created_areas),
            "areas_summary": []
        },
        "progress": 0.0
    }

# ==================== GET SINGLE PROJECT ====================

@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    creator = await db.users.find_one({"id": project.get("created_by")}, {"full_name": 1, "_id": 0})
    creator_name = creator.get("full_name") if creator else None
    
    areas = await db.project_areas.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    
    area_responses = []
    for area in areas:
        payments = await db.project_payments.find({"area_id": area["id"]}, {"amount": 1, "_id": 0}).to_list(1000)
        collected = sum(p.get("amount", 0) for p in payments)
        
        area_tasks = await db.project_tasks.find({"area_id": area["id"]}, {"status": 1, "_id": 0}).to_list(1000)
        total = len(area_tasks)
        completed = len([t for t in area_tasks if t.get("status") == "tamamlandi"])
        progress = (completed / total * 100) if total > 0 else 0
        
        area_responses.append({
            **area,
            "collected_amount": collected,
            "remaining_amount": area.get("agreed_price", 0) - collected,
            "progress": progress
        })
    
    assignments = await db.project_assignments.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    assignment_responses = []
    for a in assignments:
        assigned_user = await db.users.find_one({"id": a["user_id"]}, {"full_name": 1, "_id": 0})
        area_name = None
        if a.get("area_id"):
            area = await db.project_areas.find_one({"id": a["area_id"]}, {"name": 1, "_id": 0})
            area_name = area.get("name") if area else None
        assignment_responses.append({
            **a,
            "user_name": assigned_user.get("full_name") if assigned_user else "Bilinmiyor",
            "area_name": area_name
        })
    
    total_agreed = sum(a.get("agreed_price", 0) for a in area_responses)
    total_collected = sum(a.get("collected_amount", 0) for a in area_responses)
    
    all_tasks = await db.project_tasks.find({"project_id": project_id}, {"status": 1, "_id": 0}).to_list(1000)
    total_tasks = len(all_tasks)
    completed_tasks = len([t for t in all_tasks if t.get("status") == "tamamlandi"])
    progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    return {
        **project,
        "created_by_name": creator_name,
        "areas": area_responses,
        "assignments": assignment_responses,
        "finance": {
            "total_agreed": total_agreed,
            "total_collected": total_collected,
            "total_remaining": total_agreed - total_collected,
            "areas_summary": [
                {
                    "area_id": a["id"],
                    "area_name": a["name"],
                    "agreed": a.get("agreed_price", 0),
                    "collected": a.get("collected_amount", 0),
                    "remaining": a.get("remaining_amount", 0)
                } for a in area_responses
            ]
        },
        "progress": progress
    }

# ==================== UPDATE PROJECT ====================

@router.put("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    old_status = project.get("status")
    new_status = update_data.get("status")
    status_changed = new_status and old_status != new_status
    
    only_status_change = len([k for k in update_data.keys() if k not in ["status", "updated_at"]]) == 0
    
    if not only_status_change:
        await enforce_project_lock(project_id, user)
    elif status_changed and old_status in PROJECT_LOCKED_STATUSES:
        if not user.get("is_admin"):
            raise HTTPException(
                status_code=403, 
                detail="Durdurulmuş veya tamamlanmış projenin durumunu yalnızca yönetici değiştirebilir."
            )
    
    changes = []
    for key, value in update_data.items():
        if key != "updated_at" and project.get(key) != value:
            changes.append(f"{key}: {project.get(key)} → {value}")
    
    if changes:
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "project_updated", "Proje güncellendi: " + ", ".join(changes)
        )
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    if status_changed:
        old_label = PROJECT_STATUS_LABELS.get(old_status, old_status)
        new_label = PROJECT_STATUS_LABELS.get(new_status, new_status)
        project_name = project.get("name", "Proje")
        
        if new_status == "tamamlandi":
            await notify_project_team(
                project_id, user["tenant_id"],
                "🎉 Proje Tamamlandı!",
                f"'{project_name}' projesi başarıyla tamamlandı. Tebrikler!",
                "success",
                f"/projects/{project_id}",
                exclude_user_id=user["id"]
            )
        elif new_status == "durduruldu":
            await notify_project_team(
                project_id, user["tenant_id"],
                "⏸️ Proje Durduruldu",
                f"'{project_name}' projesi durduruldu.",
                "warning",
                f"/projects/{project_id}",
                exclude_user_id=user["id"]
            )
        elif old_status == "durduruldu":
            await notify_project_team(
                project_id, user["tenant_id"],
                "▶️ Proje Devam Ediyor",
                f"'{project_name}' projesi yeniden aktif edildi.",
                "info",
                f"/projects/{project_id}",
                exclude_user_id=user["id"]
            )
        else:
            await notify_project_team(
                project_id, user["tenant_id"],
                "📋 Proje Durumu Güncellendi",
                f"'{project_name}' projesi: {old_label} → {new_label}",
                "info",
                f"/projects/{project_id}",
                exclude_user_id=user["id"]
            )
    
    return await get_project(project_id, user)

# ==================== DELETE PROJECT ====================

@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.delete")
    
    await db.project_tasks.delete_many({"project_id": project_id})
    await db.project_areas.delete_many({"project_id": project_id})
    await db.project_assignments.delete_many({"project_id": project_id})
    await db.project_payments.delete_many({"project_id": project_id})
    await db.project_activities.delete_many({"project_id": project_id})
    await db.files.delete_many({"project_id": project_id})
    await db.conversations.delete_many({"project_id": project_id, "type": "project"})
    
    result = await db.projects.delete_one({"id": project_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    return {"message": "Proje silindi"}

# ==================== PROJECT LOCK STATUS ====================

@router.get("/{project_id}/lock-status")
async def get_project_lock_status(project_id: str, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    from services.project_service import check_project_locked
    lock_info = await check_project_locked(project_id, user)
    return lock_info

# ==================== PROJECT AREAS ====================

@router.post("/{project_id}/areas")
async def create_project_area(project_id: str, data: ProjectAreaCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await enforce_project_lock(project_id, user)
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    area = await create_project_area_internal(
        project_id, user["tenant_id"], user["id"], user["full_name"], data
    )
    
    return area

@router.put("/{project_id}/areas/{area_id}")
async def update_project_area(project_id: str, area_id: str, data: ProjectAreaUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await enforce_project_lock(project_id, user)
    
    area = await db.project_areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    changes = []
    for key, value in update_data.items():
        if key != "updated_at" and area.get(key) != value:
            changes.append(f"{key}: {area.get(key)} → {value}")
    
    if changes:
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "area_updated", f"'{area['name']}' alanı güncellendi: " + ", ".join(changes),
            area_id, area["name"]
        )
    
    await db.project_areas.update_one({"id": area_id}, {"$set": update_data})
    
    updated_area = await db.project_areas.find_one({"id": area_id}, {"_id": 0})
    
    payments = await db.project_payments.find({"area_id": area_id}, {"amount": 1, "_id": 0}).to_list(1000)
    collected = sum(p.get("amount", 0) for p in payments)
    
    return {
        **updated_area,
        "collected_amount": collected,
        "remaining_amount": updated_area.get("agreed_price", 0) - collected
    }

@router.delete("/{project_id}/areas/{area_id}")
async def delete_project_area(project_id: str, area_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await enforce_project_lock(project_id, user)
    
    area = await db.project_areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    await db.project_tasks.delete_many({"area_id": area_id})
    await db.project_payments.delete_many({"area_id": area_id})
    await db.project_assignments.delete_many({"area_id": area_id})
    await db.project_areas.delete_one({"id": area_id})
    
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "area_deleted", f"'{area['name']}' alanı silindi."
    )
    
    return {"message": "Alan silindi"}

# ==================== PROJECT ASSIGNMENTS ====================

@router.post("/{project_id}/assignments")
async def create_project_assignment(project_id: str, data: ProjectAssignmentCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.assign_staff")
    await enforce_project_lock(project_id, user)
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    existing = await db.project_assignments.find_one({
        "project_id": project_id,
        "user_id": data.user_id,
        "assignment_type": data.assignment_type,
        "area_id": data.area_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Bu personel zaten atanmış")
    
    assignment = await create_project_assignment_internal(
        project_id, user["tenant_id"], user["id"], user["full_name"], data
    )
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Add user to project chat
    await db.conversations.update_one(
        {"project_id": project_id, "type": "project"},
        {"$addToSet": {"participant_ids": data.user_id}}
    )
    
    await create_notification(
        data.user_id, user["tenant_id"],
        "👤 Yeni Proje Ataması",
        f"'{project.get('name', 'Proje')}' projesine atandınız.",
        "info",
        f"/projects/{project_id}"
    )
    
    return assignment

@router.delete("/{project_id}/assignments/{assignment_id}")
async def delete_project_assignment(project_id: str, assignment_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.assign_staff")
    await enforce_project_lock(project_id, user)
    
    assignment = await db.project_assignments.find_one({"id": assignment_id, "project_id": project_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Atama bulunamadı")
    
    assigned_user = await db.users.find_one({"id": assignment["user_id"]}, {"full_name": 1, "_id": 0})
    
    await db.project_assignments.delete_one({"id": assignment_id})
    
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "staff_unassigned", f"{assigned_user.get('full_name', 'Kullanıcı')} projeden çıkarıldı."
    )
    
    return {"message": "Atama kaldırıldı"}

# ==================== PROJECT PAYMENTS ====================

@router.post("/{project_id}/payments")
async def create_project_payment(project_id: str, data: ProjectPaymentCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.manage_finance")
    await enforce_project_lock(project_id, user)
    
    area = await db.project_areas.find_one({"id": data.area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    payment = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "area_id": data.area_id,
        "tenant_id": user["tenant_id"],
        "amount": data.amount,
        "payment_date": data.payment_date,
        "payment_method": data.payment_method,
        "notes": data.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.project_payments.insert_one(payment)
    
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "payment_added",
        f"'{area['name']}' alanı için {data.amount:,.2f} ₺ tahsilat kaydedildi.",
        data.area_id, area["name"],
        {"amount": data.amount, "method": data.payment_method}
    )
    
    project = await db.projects.find_one({"id": project_id}, {"name": 1, "_id": 0})
    project_name = project.get("name", "Proje") if project else "Proje"
    
    await notify_project_team(
        project_id, user["tenant_id"],
        "💰 Yeni Tahsilat",
        f"'{project_name}' projesi için {data.amount:,.0f} ₺ tahsilat kaydedildi.",
        "success",
        f"/projects/{project_id}",
        exclude_user_id=user["id"]
    )
    
    return {
        **payment,
        "area_name": area["name"],
        "created_by_name": user["full_name"]
    }

@router.get("/{project_id}/payments")
async def get_project_payments(project_id: str, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    payments = await db.project_payments.find({"project_id": project_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    
    result = []
    for p in payments:
        area = await db.project_areas.find_one({"id": p["area_id"]}, {"name": 1, "_id": 0})
        creator = await db.users.find_one({"id": p["created_by"]}, {"full_name": 1, "_id": 0})
        result.append({
            **p,
            "area_name": area.get("name") if area else "Silinmiş Alan",
            "created_by_name": creator.get("full_name") if creator else "Bilinmiyor"
        })
    
    return result

@router.delete("/{project_id}/payments/{payment_id}")
async def delete_project_payment(project_id: str, payment_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.manage_finance")
    await enforce_project_lock(project_id, user)
    
    payment = await db.project_payments.find_one({"id": payment_id, "project_id": project_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Tahsilat bulunamadı")
    
    area = await db.project_areas.find_one({"id": payment["area_id"]}, {"name": 1, "_id": 0})
    
    await db.project_payments.delete_one({"id": payment_id})
    
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "payment_deleted",
        f"{payment['amount']:,.2f} ₺ tahsilat silindi.",
        payment["area_id"], area.get("name") if area else None
    )
    
    return {"message": "Tahsilat silindi"}

# ==================== PROJECT ACTIVITIES ====================

@router.get("/{project_id}/activities")
async def get_project_activities(project_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    activities = await db.project_activities.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return activities

# ==================== PROJECT TASKS ====================

@router.get("/{project_id}/tasks")
async def get_project_tasks(project_id: str, area_id: str = None, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id, area_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    query = {"project_id": project_id}
    if area_id:
        query["area_id"] = area_id
    
    tasks = await db.project_tasks.find(query, {"_id": 0}).to_list(1000)
    
    result = []
    for task in tasks:
        assigned_to_name = None
        if task.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": task["assigned_to"]}, {"full_name": 1, "_id": 0})
            if assigned_user:
                assigned_to_name = assigned_user["full_name"]
        result.append({**task, "assigned_to_name": assigned_to_name})
    
    return result

@router.put("/{project_id}/tasks/{task_id}")
async def update_project_task(project_id: str, task_id: str, data: ProjectTaskUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "tasks.edit")
    await enforce_project_lock(project_id, user)
    
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    old_status = task.get("status")
    old_assigned_to = task.get("assigned_to")
    old_notes = task.get("notes")

    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to

        if data.assigned_to != user["id"]:
            project = await db.projects.find_one({"id": project_id}, {"name": 1, "_id": 0})
            await create_notification(
                data.assigned_to,
                user["tenant_id"],
                "Görev Atandı",
                f"'{project.get('name', '')}' projesinde size '{task['subtask_name']}' görevi atandı.",
                "info",
                f"/projects/{project_id}"
            )

    await db.project_tasks.update_one({"id": task_id}, {"$set": update_data})

    area = None
    area_name = None
    if task.get("area_id"):
        area = await db.project_areas.find_one({"id": task.get("area_id")}, {"name": 1, "_id": 0})
        area_name = area.get("name") if area else None

    if old_status != data.status:
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "task_status_changed",
            f"'{task['work_item_name']} - {task['subtask_name']}' görevi: {old_status} → {data.status}",
            task.get("area_id"), area_name
        )

    if data.assigned_to is not None and old_assigned_to != data.assigned_to:
        old_user_name = None
        new_user_name = None
        if old_assigned_to:
            old_user = await db.users.find_one({"id": old_assigned_to}, {"full_name": 1, "_id": 0})
            old_user_name = old_user.get("full_name") if old_user else None
        if data.assigned_to:
            new_user = await db.users.find_one({"id": data.assigned_to}, {"full_name": 1, "_id": 0})
            new_user_name = new_user.get("full_name") if new_user else None

        desc = ""
        if not old_assigned_to and data.assigned_to:
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevi {new_user_name or data.assigned_to} kişisine atandı."
        elif old_assigned_to and not data.assigned_to:
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevinin ataması kaldırıldı."
        else:
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevi: {old_user_name or old_assigned_to} → {new_user_name or data.assigned_to}"

        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "task_assigned", desc,
            task.get("area_id"), area_name
        )

    if data.notes is not None and old_notes != data.notes:
        action = "task_note_updated"
        if (old_notes is None or str(old_notes).strip() == "") and (str(data.notes).strip() != ""):
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevine not eklendi."
        elif str(data.notes).strip() == "":
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevinin notu temizlendi."
        else:
            desc = f"'{task['work_item_name']} - {task['subtask_name']}' görevinin notu güncellendi."

        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            action, desc, task.get("area_id"), area_name
        )

    if task.get("area_id"):
        area_tasks = await db.project_tasks.find({"area_id": task["area_id"]}, {"status": 1, "_id": 0}).to_list(1000)
        statuses = [t["status"] for t in area_tasks]
        new_area_status = "planlandi"
        if all(s == "tamamlandi" for s in statuses): new_area_status = "tamamlandi"
        elif any(s == "montaj" for s in statuses): new_area_status = "montaj"
        elif any(s == "uretimde" for s in statuses): new_area_status = "uretimde"

        await db.project_areas.update_one(
            {"id": task["area_id"]},
            {"$set": {"status": new_area_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    all_tasks = await db.project_tasks.find({"project_id": project_id}, {"status": 1, "_id": 0}).to_list(5000)
    if all_tasks:
        statuses = [t.get("status") for t in all_tasks]
        new_project_status = "planlandi"
        if all(s == "tamamlandi" for s in statuses): new_project_status = "tamamlandi"
        elif any(s == "montaj" for s in statuses): new_project_status = "montaj"
        elif any(s == "uretimde" for s in statuses): new_project_status = "uretimde"

        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"status": new_project_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return {"message": "Görev güncellendi"}
