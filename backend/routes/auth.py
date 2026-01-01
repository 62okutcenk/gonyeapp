from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from database import db
from models.auth import UserRegister, UserLogin, UserResponse, TokenResponse
from services.auth_service import hash_password, verify_password, create_token
from utils.constants import DEFAULT_PERMISSIONS

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    tenant_id = None
    is_admin = False
    admin_role = None
    
    if data.tenant_name:
        tenant = {
            "id": str(uuid.uuid4()),
            "name": data.tenant_name,
            "city": None,
            "district": None,
            "address": None,
            "contact_email": None,
            "phone": None,
            "tax_office": None,
            "tax_number": None,
            "light_logo_url": None,
            "dark_logo_url": None,
            "setup_completed": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.tenants.insert_one(tenant)
        tenant_id = tenant["id"]
        is_admin = True
        
        # Create default permissions
        for perm in DEFAULT_PERMISSIONS:
            await db.permissions.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                **perm
            })
        
        # Create admin role
        admin_role = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Yönetici",
            "description": "Tüm yetkilere sahip yönetici rolü",
            "permissions": [p["key"] for p in DEFAULT_PERMISSIONS],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(admin_role)
        
        # Create default groups
        default_groups = [
            {"name": "Planlama", "description": "Planlama aşaması", "order": 1},
            {"name": "Üretim", "description": "Üretim aşaması", "order": 2},
            {"name": "Montaj", "description": "Montaj aşaması", "order": 3},
            {"name": "Kontrol", "description": "Kalite kontrol aşaması", "order": 4},
        ]
        for g in default_groups:
            group = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                **g,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.groups.insert_one(group)
            
            default_subtasks = []
            if g["name"] == "Planlama":
                default_subtasks = ["Ölçü Alma", "Tasarım", "Malzeme Seçimi"]
            elif g["name"] == "Üretim":
                default_subtasks = ["Kesim", "İşleme", "Montaj Öncesi Hazırlık"]
            elif g["name"] == "Montaj":
                default_subtasks = ["Taşıma", "Yerleştirme", "Sabitleme"]
            elif g["name"] == "Kontrol":
                default_subtasks = ["Görsel Kontrol", "İşlevsellik Testi", "Müşteri Onayı"]
            
            for idx, st_name in enumerate(default_subtasks):
                subtask = {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "group_id": group["id"],
                    "name": st_name,
                    "description": None,
                    "order": idx + 1,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.subtasks.insert_one(subtask)
        
        # Create general chat conversation for tenant
        general_chat = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "type": "general",
            "name": "Genel Sohbet",
            "description": "Tüm ekip üyeleri için genel sohbet",
            "participant_ids": [],
            "created_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(general_chat)
    else:
        raise HTTPException(status_code=400, detail="Firma adı gereklidir")
    
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "tenant_id": tenant_id,
        "role_id": admin_role["id"] if is_admin else None,
        "color": "#4a4036",
        "avatar_url": None,
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Add user to general chat
    await db.conversations.update_one(
        {"tenant_id": tenant_id, "type": "general"},
        {"$push": {"participant_ids": user["id"]}}
    )
    
    token = create_token(user["id"], tenant_id)
    
    tenant_doc = await db.tenants.find_one({"id": tenant_id}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            tenant_id=user["tenant_id"],
            role_id=user.get("role_id"),
            color=user["color"],
            avatar_url=user.get("avatar_url"), 
            is_admin=user["is_admin"],
            setup_completed=setup_completed,
            created_at=user["created_at"]
        )
    )

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    
    token = create_token(user["id"], user["tenant_id"])
    
    tenant_doc = await db.tenants.find_one({"id": user["tenant_id"]}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    user_permissions = []
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
        if role and "permissions" in role:
            user_permissions = role["permissions"]
    
    # Add user to general chat if not already
    await db.conversations.update_one(
        {"tenant_id": user["tenant_id"], "type": "general", "participant_ids": {"$ne": user["id"]}},
        {"$push": {"participant_ids": user["id"]}}
    )
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            tenant_id=user["tenant_id"],
            role_id=user.get("role_id"),
            color=user.get("color", "#4a4036"),
            avatar_url=user.get("avatar_url"),
            is_admin=user.get("is_admin", False),
            setup_completed=setup_completed,
            permissions_list=user_permissions,
            created_at=user["created_at"]
        )
    )

@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    tenant_doc = await db.tenants.find_one({"id": user["tenant_id"]}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        tenant_id=user["tenant_id"],
        role_id=user.get("role_id"),
        color=user.get("color", "#4a4036"),
        avatar_url=user.get("avatar_url"),
        is_admin=user.get("is_admin", False),
        setup_completed=setup_completed,
        permissions_list=user.get("permissions_list", []),
        created_at=user["created_at"]
    )

# Import at end to avoid circular imports
from middleware.auth import get_current_user
