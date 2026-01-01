from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from pathlib import Path

from database import db
from config import ROOT_DIR
from models.file import TaskCommentCreate, TaskCommentResponse
from middleware.auth import get_current_user, check_permission
from services.project_service import can_access_project, log_project_activity
from services.notification_service import create_notification, notify_project_team

router = APIRouter(prefix="/api", tags=["Files"])

# ==================== TASK COMMENTS ====================

@router.get("/tasks/{task_id}/comments", response_model=List[TaskCommentResponse])
async def get_task_comments(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.project_tasks.find_one({"id": task_id, "tenant_id": user["tenant_id"]}, {"project_id": 1})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    if not await can_access_project(user, task["project_id"]):
         raise HTTPException(status_code=403, detail="Erişim yetkiniz yok")

    comments = await db.task_comments.find({"task_id": task_id}).sort("created_at", 1).to_list(1000)
    
    result = []
    for c in comments:
        comment_user = await db.users.find_one({"id": c["user_id"]}, {"avatar_url": 1, "full_name": 1})
        result.append({
            **c,
            "user_name": comment_user.get("full_name", c["user_name"]) if comment_user else c.get("user_name"),
            "user_avatar": comment_user.get("avatar_url") if comment_user else None
        })
        
    return result

@router.post("/tasks/{task_id}/comments", response_model=TaskCommentResponse)
async def create_task_comment(task_id: str, data: TaskCommentCreate, user: dict = Depends(get_current_user)):
    task = await db.project_tasks.find_one({"id": task_id, "tenant_id": user["tenant_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
        
    if not await can_access_project(user, task["project_id"]):
         raise HTTPException(status_code=403, detail="Erişim yetkiniz yok")

    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comment = {
        "id": comment_id,
        "task_id": task_id,
        "tenant_id": user["tenant_id"],
        "user_id": user["id"],
        "user_name": user["full_name"],
        "message": data.message,
        "created_at": now
    }
    
    await db.task_comments.insert_one(comment)
    
    await db.project_tasks.update_one(
        {"id": task_id},
        {"$set": {"updated_at": now}}
    )
    
    if task.get("assigned_to") and task.get("assigned_to") != user["id"]:
        project = await db.projects.find_one({"id": task["project_id"]}, {"name": 1})
        await create_notification(
            task["assigned_to"],
            user["tenant_id"],
            "Yeni Yorum",
            f"'{project.get('name')}' projesindeki '{task['subtask_name']}' görevine yeni bir yorum yapıldı.",
            "info",
            f"/projects/{task['project_id']}"
        )

    area_name = None
    if task.get("area_id"):
        area = await db.project_areas.find_one({"id": task["area_id"]}, {"name": 1, "_id": 0})
        area_name = area.get("name") if area else None

    short_msg = data.message[:50] + "..." if len(data.message) > 50 else data.message

    await log_project_activity(
        project_id=task["project_id"],
        tenant_id=user["tenant_id"],
        user_id=user["id"],
        user_name=user["full_name"],
        action="comment_added",
        description=f"'{task.get('work_item_name')} - {task.get('subtask_name')}' görevine yorum yaptı: \"{short_msg}\"",
        area_id=task.get("area_id"),
        area_name=area_name,
        metadata={"task_id": task_id, "comment_id": comment_id}
    )

    return {
        **comment,
        "user_avatar": user.get("avatar_url")
    }

# ==================== FILE UPLOAD ====================

@router.post("/files/upload")
async def upload_file(
    project_id: str = Form(None),
    area_id: str = Form(None),
    task_id: str = Form(None),
    work_item_id: str = Form(None),
    category: str = Form(None),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    check_permission(user, "files.upload")

    if project_id:
        if not await can_access_project(user, project_id, area_id):
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")

    upload_dir = ROOT_DIR / "uploads" / user["tenant_id"]
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename).suffix
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    file_doc = {
        "id": file_id,
        "tenant_id": user["tenant_id"],
        "project_id": project_id,
        "area_id": area_id,
        "task_id": task_id,
        "work_item_id": work_item_id,
        "category": category,
        "original_name": file.filename,
        "filename": filename,
        "content_type": file.content_type,
        "size": len(content),
        "uploaded_by": user["id"],
        "uploaded_by_name": user.get("full_name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)

    if project_id:
        area_name = None
        if area_id:
            area = await db.project_areas.find_one({"id": area_id}, {"name": 1, "_id": 0})
            area_name = area.get("name") if area else None

        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "file_uploaded",
            f"'{file.filename}' dosyası yüklendi.",
            area_id, area_name,
            {"file_id": file_id, "category": category, "task_id": task_id, "work_item_id": work_item_id}
        )
        
        project = await db.projects.find_one({"id": project_id}, {"name": 1, "_id": 0})
        project_name = project.get("name", "Proje") if project else "Proje"
        
        await notify_project_team(
            project_id, user["tenant_id"],
            "📁 Yeni Dosya Yüklendi",
            f"'{project_name}' projesine '{file.filename}' dosyası eklendi.",
            "info",
            f"/projects/{project_id}",
            exclude_user_id=user["id"]
        )

    return {
        "id": file_id,
        "original_name": file.filename,
        "url": f"/api/files/{file_id}"
    }

@router.get("/files/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
    from fastapi.responses import FileResponse
    
    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    file_path = ROOT_DIR / "uploads" / user["tenant_id"] / file_doc["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    return FileResponse(
        file_path,
        filename=file_doc["original_name"],
        media_type=file_doc.get("content_type", "application/octet-stream")
    )

@router.get("/files")
async def list_files(
    project_id: str = None,
    area_id: str = None,
    task_id: str = None,
    work_item_id: str = None,
    category: str = None,
    user: dict = Depends(get_current_user)
):
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        if not await can_access_project(user, project_id, area_id):
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
        query["project_id"] = project_id
    if area_id:
        query["area_id"] = area_id
    if task_id:
        query["task_id"] = task_id
    if work_item_id:
        query["work_item_id"] = work_item_id
    if category:
        query["category"] = category

    files = await db.files.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return files

@router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "files.delete")

    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    project_id = file_doc.get("project_id")
    area_id = file_doc.get("area_id")
    if project_id:
        if not await can_access_project(user, project_id, area_id):
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")

    if project_id:
        area_name = None
        if area_id:
            area = await db.project_areas.find_one({"id": area_id}, {"name": 1, "_id": 0})
            area_name = area.get("name") if area else None

        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "file_deleted",
            f"'{file_doc.get('original_name', 'dosya')}' dosyası silindi.",
            area_id, area_name,
            {"file_id": file_id, "category": file_doc.get("category"), "task_id": file_doc.get("task_id"), "work_item_id": file_doc.get("work_item_id")}
        )

    file_path = ROOT_DIR / "uploads" / user["tenant_id"] / file_doc["filename"]
    if file_path.exists():
        file_path.unlink()

    await db.files.delete_one({"id": file_id})
    return {"message": "Dosya silindi"}

@router.get("/public/files/{file_id}")
async def get_public_file(file_id: str):
    from fastapi.responses import FileResponse
    
    file_doc = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    file_path = ROOT_DIR / "uploads" / file_doc["tenant_id"] / file_doc["filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    return FileResponse(
        file_path,
        filename=file_doc["original_name"],
        media_type=file_doc.get("content_type", "application/octet-stream")
    )

# ==================== MY TASKS ====================

@router.get("/tasks/me")
async def get_my_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.project_tasks.find(
        {"assigned_to": user["id"], "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for task in tasks:
        project = await db.projects.find_one({"id": task["project_id"]}, {"name": 1, "_id": 0})
        
        area = None
        if task.get("area_id"):
            area = await db.project_areas.find_one({"id": task["area_id"]}, {"name": 1, "_id": 0})
            
        result.append({
            **task,
            "project_name": project.get("name") if project else "Silinmiş Proje",
            "area_name": area.get("name") if area else "-"
        })
        
    return result
