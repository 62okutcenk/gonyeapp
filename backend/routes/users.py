from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import datetime, timezone
import uuid
from pathlib import Path

from database import db
from config import ROOT_DIR
from models.auth import UserResponse, UserCreate, UserUpdate
from models.notification import NotificationResponse
from middleware.auth import get_current_user, check_permission
from services.auth_service import hash_password

router = APIRouter(prefix="/api", tags=["Users"])

# ==================== USER MANAGEMENT ROUTES ====================

@router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    check_permission(user, "users.view")
    
    users = await db.users.find({"tenant_id": user["tenant_id"]}, {"_id": 0, "password": 0}).to_list(500)
    return [UserResponse(**u) for u in users]

@router.post("/users", response_model=UserResponse)
async def create_user(data: UserCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "users.manage")
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    new_user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "tenant_id": user["tenant_id"],
        "role_id": data.role_id,
        "color": data.color,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    
    # Add user to general chat
    await db.conversations.update_one(
        {"tenant_id": user["tenant_id"], "type": "general"},
        {"$push": {"participant_ids": new_user["id"]}}
    )
    
    return UserResponse(
        id=new_user["id"],
        email=new_user["email"],
        full_name=new_user["full_name"],
        tenant_id=new_user["tenant_id"],
        role_id=new_user.get("role_id"),
        color=new_user["color"],
        is_admin=new_user["is_admin"],
        created_at=new_user["created_at"]
    )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        check_permission(current_user, "users.manage")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    await db.users.update_one(
        {"id": user_id, "tenant_id": current_user["tenant_id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not updated_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return UserResponse(**updated_user)

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "users.manage")
    
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    result = await db.users.delete_one({"id": user_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return {"message": "Kullanıcı silindi"}

# ==================== NOTIFICATION ROUTES ====================

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**n) for n in notifications]

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Bildirim okundu olarak işaretlendi"}

@router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Tüm bildirimler okundu olarak işaretlendi"}

@router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

# ==================== AVATAR ROUTES ====================

@router.post("/users/me/avatar", response_model=UserResponse)
async def upload_user_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları (JPEG, PNG, WEBP) yüklenebilir.")

    upload_dir = ROOT_DIR / "uploads" / user["tenant_id"] / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename).suffix
    if not file_ext:
        file_ext = ".jpg"
        
    filename = f"{user['id']}_avatar{file_ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    avatar_url = f"/api/users/avatars/{user['tenant_id']}/{filename}"
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)

@router.get("/users/avatars/{tenant_id}/{filename}")
async def get_user_avatar(tenant_id: str, filename: str):
    from fastapi.responses import FileResponse
    
    file_path = ROOT_DIR / "uploads" / tenant_id / "avatars" / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar bulunamadı")
        
    return FileResponse(file_path)

@router.delete("/users/me/avatar", response_model=UserResponse)
async def delete_user_avatar(user: dict = Depends(get_current_user)):
    current_user = await db.users.find_one({"id": user["id"]})
    if current_user and current_user.get("avatar_url"):
        try:
            parts = current_user["avatar_url"].split("/")
            filename = parts[-1]
            file_path = ROOT_DIR / "uploads" / user["tenant_id"] / "avatars" / filename
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Avatar silme hatası: {e}")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatar_url": None}}
    )

    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)
