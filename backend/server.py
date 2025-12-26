from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'craftforge-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CraftForge - Marangoz Proje Yönetimi")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ==================== MODELS ====================

# Auth Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: Optional[str] = None  # For new tenant creation

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    tenant_id: str
    role_id: Optional[str] = None
    color: str = "#4a4036"
    is_admin: bool = False
    setup_completed: bool = False
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Tenant Models
class TenantCreate(BaseModel):
    name: str
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: bool = False

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: Optional[bool] = None

class TenantResponse(BaseModel):
    id: str
    name: str
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    phone: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    light_logo_url: Optional[str] = None
    dark_logo_url: Optional[str] = None
    setup_completed: bool = False
    created_at: str

# Role & Permission Models
class PermissionCreate(BaseModel):
    key: str
    name: str
    description: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

class RoleResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    created_at: str

# Group Models (Planlama, Üretim vb.)
class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class GroupResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    order: int
    created_at: str

# SubTask Models (Alt Görevler)
class SubTaskCreate(BaseModel):
    group_id: str
    name: str
    description: Optional[str] = None
    order: int = 0

class SubTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class SubTaskResponse(BaseModel):
    id: str
    tenant_id: str
    group_id: str
    name: str
    description: Optional[str] = None
    order: int
    created_at: str

# WorkItem Models (İş Kalemleri: kapı, dolap vb.)
class WorkItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_subtask_ids: List[str] = []

class WorkItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_subtask_ids: Optional[List[str]] = None

class WorkItemResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    default_subtask_ids: List[str] = []
    created_at: str

# Project Models
class ProjectWorkItemCreate(BaseModel):
    work_item_id: str
    quantity: int = 1
    notes: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    work_items: List[ProjectWorkItemCreate] = []
    due_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    status: str  # bekliyor, planlandi, uretimde, kontrol, tamamlandi
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class ProjectTaskResponse(BaseModel):
    id: str
    project_id: str
    work_item_id: str
    work_item_name: str
    group_id: str
    group_name: str
    subtask_id: str
    subtask_name: str
    status: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: str
    updated_at: str

class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    status: str
    due_date: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str
    work_items: List[Dict[str, Any]] = []
    tasks: List[ProjectTaskResponse] = []
    progress: float = 0.0

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    title: str
    message: str
    type: str  # info, success, warning, error
    link: Optional[str] = None
    is_read: bool = False
    created_at: str

# User Management Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_id: Optional[str] = None
    color: str = "#4a4036"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role_id: Optional[str] = None
    color: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, tenant_id: str) -> str:
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

def check_permission(user: dict, permission: str):
    """Check if user has the required permission"""
    if user.get("is_admin"):
        return True
    # TODO: Check role permissions
    return True

# ==================== WEBSOCKET MANAGER ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        users = await db.users.find({"tenant_id": tenant_id}, {"id": 1, "_id": 0}).to_list(1000)
        for user in users:
            await self.send_to_user(user["id"], message)

manager = ConnectionManager()

async def create_notification(user_id: str, tenant_id: str, title: str, message: str, 
                            notification_type: str = "info", link: str = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "tenant_id": tenant_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send real-time notification
    await manager.send_to_user(user_id, {
        "type": "notification",
        "data": {k: v for k, v in notification.items() if k != "_id"}
    })
    
    return notification

# ==================== DEFAULT PERMISSIONS ====================

DEFAULT_PERMISSIONS = [
    {"key": "projects.view", "name": "Projeleri Görüntüle", "description": "Projeleri görüntüleme yetkisi"},
    {"key": "projects.create", "name": "Proje Oluştur", "description": "Yeni proje oluşturma yetkisi"},
    {"key": "projects.edit", "name": "Proje Düzenle", "description": "Proje düzenleme yetkisi"},
    {"key": "projects.delete", "name": "Proje Sil", "description": "Proje silme yetkisi"},
    {"key": "tasks.view", "name": "Görevleri Görüntüle", "description": "Görevleri görüntüleme yetkisi"},
    {"key": "tasks.edit", "name": "Görev Düzenle", "description": "Görev durumu güncelleme yetkisi"},
    {"key": "setup.groups", "name": "Grupları Yönet", "description": "Grup oluşturma ve düzenleme yetkisi"},
    {"key": "setup.subtasks", "name": "Alt Görevleri Yönet", "description": "Alt görev yönetimi yetkisi"},
    {"key": "setup.workitems", "name": "İş Kalemlerini Yönet", "description": "İş kalemi yönetimi yetkisi"},
    {"key": "setup.roles", "name": "Rolleri Yönet", "description": "Rol ve yetki yönetimi yetkisi"},
    {"key": "users.view", "name": "Kullanıcıları Görüntüle", "description": "Kullanıcı listesi görüntüleme"},
    {"key": "users.manage", "name": "Kullanıcıları Yönet", "description": "Kullanıcı ekleme/düzenleme yetkisi"},
    {"key": "settings.manage", "name": "Ayarları Yönet", "description": "Firma ayarları düzenleme yetkisi"},
    {"key": "files.upload", "name": "Dosya Yükle", "description": "Dosya yükleme yetkisi"},
    {"key": "files.delete", "name": "Dosya Sil", "description": "Dosya silme yetkisi"},
]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    # Create tenant if tenant_name provided
    tenant_id = None
    is_admin = False
    
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
        
        # Create default permissions for tenant
        for perm in DEFAULT_PERMISSIONS:
            await db.permissions.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                **perm
            })
        
        # Create default admin role
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
            
            # Create default subtasks for each group
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
    else:
        raise HTTPException(status_code=400, detail="Firma adı gereklidir")
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "tenant_id": tenant_id,
        "role_id": admin_role["id"] if is_admin else None,
        "color": "#4a4036",
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user["id"], tenant_id)
    
    # Get tenant setup status
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
            is_admin=user["is_admin"],
            setup_completed=setup_completed,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    
    token = create_token(user["id"], user["tenant_id"])
    
    # Get tenant setup status
    tenant_doc = await db.tenants.find_one({"id": user["tenant_id"]}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            tenant_id=user["tenant_id"],
            role_id=user.get("role_id"),
            color=user.get("color", "#4a4036"),
            is_admin=user.get("is_admin", False),
            setup_completed=setup_completed,
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    # Get tenant setup status
    tenant_doc = await db.tenants.find_one({"id": user["tenant_id"]}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        tenant_id=user["tenant_id"],
        role_id=user.get("role_id"),
        color=user.get("color", "#4a4036"),
        is_admin=user.get("is_admin", False),
        created_at=user["created_at"]
    )

# ==================== TENANT ROUTES ====================

@api_router.get("/tenant", response_model=TenantResponse)
async def get_tenant(user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    return TenantResponse(**tenant)

@api_router.put("/tenant", response_model=TenantResponse)
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

# ==================== ROLE ROUTES ====================

@api_router.get("/roles", response_model=List[RoleResponse])
async def get_roles(user: dict = Depends(get_current_user)):
    roles = await db.roles.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
    return [RoleResponse(**r) for r in roles]

@api_router.post("/roles", response_model=RoleResponse)
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

@api_router.put("/roles/{role_id}", response_model=RoleResponse)
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

@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.roles")
    
    result = await db.roles.delete_one({"id": role_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    return {"message": "Rol silindi"}

@api_router.get("/permissions")
async def get_permissions(user: dict = Depends(get_current_user)):
    permissions = await db.permissions.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
    return permissions

# ==================== GROUP ROUTES ====================

@api_router.get("/groups", response_model=List[GroupResponse])
async def get_groups(user: dict = Depends(get_current_user)):
    groups = await db.groups.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    return [GroupResponse(**g) for g in groups]

@api_router.post("/groups", response_model=GroupResponse)
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

@api_router.put("/groups/{group_id}", response_model=GroupResponse)
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

@api_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.groups")
    
    # Delete related subtasks
    await db.subtasks.delete_many({"group_id": group_id, "tenant_id": user["tenant_id"]})
    
    result = await db.groups.delete_one({"id": group_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Grup bulunamadı")
    return {"message": "Grup silindi"}

# ==================== SUBTASK ROUTES ====================

@api_router.get("/subtasks", response_model=List[SubTaskResponse])
async def get_subtasks(group_id: str = None, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["tenant_id"]}
    if group_id:
        query["group_id"] = group_id
    
    subtasks = await db.subtasks.find(query, {"_id": 0}).sort("order", 1).to_list(500)
    return [SubTaskResponse(**s) for s in subtasks]

@api_router.post("/subtasks", response_model=SubTaskResponse)
async def create_subtask(data: SubTaskCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.subtasks")
    
    # Verify group exists
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

@api_router.put("/subtasks/{subtask_id}", response_model=SubTaskResponse)
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

@api_router.delete("/subtasks/{subtask_id}")
async def delete_subtask(subtask_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.subtasks")
    
    result = await db.subtasks.delete_one({"id": subtask_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alt görev bulunamadı")
    return {"message": "Alt görev silindi"}

# ==================== WORK ITEM ROUTES ====================

@api_router.get("/workitems", response_model=List[WorkItemResponse])
async def get_workitems(user: dict = Depends(get_current_user)):
    workitems = await db.workitems.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(500)
    return [WorkItemResponse(**w) for w in workitems]

@api_router.post("/workitems", response_model=WorkItemResponse)
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

@api_router.put("/workitems/{workitem_id}", response_model=WorkItemResponse)
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

@api_router.delete("/workitems/{workitem_id}")
async def delete_workitem(workitem_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "setup.workitems")
    
    result = await db.workitems.delete_one({"id": workitem_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="İş kalemi bulunamadı")
    return {"message": "İş kalemi silindi"}

# ==================== PROJECT ROUTES ====================

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(status: str = None, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["tenant_id"]}
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for project in projects:
        # Get tasks for progress calculation
        tasks = await db.project_tasks.find({"project_id": project["id"]}, {"_id": 0}).to_list(1000)
        total = len(tasks)
        completed = len([t for t in tasks if t["status"] == "tamamlandi"])
        progress = (completed / total * 100) if total > 0 else 0
        
        result.append(ProjectResponse(
            **project,
            tasks=[],
            progress=progress
        ))
    
    return result

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.create")
    
    project = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "customer_address": data.customer_address,
        "status": "bekliyor",
        "due_date": data.due_date,
        "created_by": user["id"],
        "work_items": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Process work items and create tasks
    project_work_items = []
    for wi_data in data.work_items:
        workitem = await db.workitems.find_one({"id": wi_data.work_item_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
        if workitem:
            project_work_items.append({
                "work_item_id": workitem["id"],
                "work_item_name": workitem["name"],
                "quantity": wi_data.quantity,
                "notes": wi_data.notes
            })
            
            # Get all subtasks and create tasks for each work item
            subtasks = await db.subtasks.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(500)
            groups = await db.groups.find({"tenant_id": user["tenant_id"]}, {"_id": 0}).to_list(100)
            group_map = {g["id"]: g for g in groups}
            
            for subtask in subtasks:
                group = group_map.get(subtask["group_id"], {})
                task = {
                    "id": str(uuid.uuid4()),
                    "project_id": project["id"],
                    "tenant_id": user["tenant_id"],
                    "work_item_id": workitem["id"],
                    "work_item_name": workitem["name"],
                    "group_id": subtask["group_id"],
                    "group_name": group.get("name", ""),
                    "subtask_id": subtask["id"],
                    "subtask_name": subtask["name"],
                    "status": "bekliyor",
                    "notes": None,
                    "assigned_to": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.project_tasks.insert_one(task)
    
    project["work_items"] = project_work_items
    await db.projects.insert_one(project)
    
    # Send notification
    await create_notification(
        user["id"],
        user["tenant_id"],
        "Yeni Proje Oluşturuldu",
        f"'{data.name}' projesi başarıyla oluşturuldu.",
        "success",
        f"/projects/{project['id']}"
    )
    
    return ProjectResponse(**project, tasks=[], progress=0.0)

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    tasks = await db.project_tasks.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    # Get assigned user names
    task_responses = []
    for task in tasks:
        assigned_to_name = None
        if task.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": task["assigned_to"]}, {"full_name": 1, "_id": 0})
            if assigned_user:
                assigned_to_name = assigned_user["full_name"]
        
        task_responses.append(ProjectTaskResponse(
            **task,
            assigned_to_name=assigned_to_name
        ))
    
    total = len(tasks)
    completed = len([t for t in tasks if t["status"] == "tamamlandi"])
    progress = (completed / total * 100) if total > 0 else 0
    
    return ProjectResponse(**project, tasks=task_responses, progress=progress)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one(
        {"id": project_id, "tenant_id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    return await get_project(project_id, user)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.delete")
    
    # Delete project tasks
    await db.project_tasks.delete_many({"project_id": project_id, "tenant_id": user["tenant_id"]})
    
    # Delete project files
    await db.files.delete_many({"project_id": project_id, "tenant_id": user["tenant_id"]})
    
    result = await db.projects.delete_one({"id": project_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    return {"message": "Proje silindi"}

@api_router.put("/projects/{project_id}/tasks/{task_id}")
async def update_project_task(project_id: str, task_id: str, data: ProjectTaskUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "tasks.edit")
    
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    old_status = task["status"]
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to
        
        # Notify assigned user
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
    
    await db.project_tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    # Update project status based on tasks
    tasks = await db.project_tasks.find({"project_id": project_id}, {"status": 1, "_id": 0}).to_list(1000)
    statuses = [t["status"] for t in tasks]
    
    new_project_status = "bekliyor"
    if all(s == "tamamlandi" for s in statuses):
        new_project_status = "tamamlandi"
    elif any(s == "uretimde" for s in statuses):
        new_project_status = "uretimde"
    elif any(s == "planlandi" for s in statuses):
        new_project_status = "planlandi"
    
    await db.projects.update_one(
        {"id": project_id},
        {"$set": {"status": new_project_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Görev güncellendi"}

# ==================== USER MANAGEMENT ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    check_permission(user, "users.view")
    
    users = await db.users.find({"tenant_id": user["tenant_id"]}, {"_id": 0, "password": 0}).to_list(500)
    return [UserResponse(**u) for u in users]

@api_router.post("/users", response_model=UserResponse)
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

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(get_current_user)):
    # Users can update their own profile or admins can update others
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

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "users.manage")
    
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    result = await db.users.delete_one({"id": user_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    return {"message": "Kullanıcı silindi"}

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**n) for n in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Bildirim okundu olarak işaretlendi"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Tüm bildirimler okundu olarak işaretlendi"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    return {"count": count}

# ==================== FILE UPLOAD ROUTES ====================

@api_router.post("/files/upload")
async def upload_file(
    project_id: str = None,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    check_permission(user, "files.upload")
    
    # Create uploads directory
    upload_dir = ROOT_DIR / "uploads" / user["tenant_id"]
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Save file metadata
    file_doc = {
        "id": file_id,
        "tenant_id": user["tenant_id"],
        "project_id": project_id,
        "original_name": file.filename,
        "filename": filename,
        "content_type": file.content_type,
        "size": len(content),
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    
    return {
        "id": file_id,
        "original_name": file.filename,
        "url": f"/api/files/{file_id}"
    }

@api_router.get("/files/{file_id}")
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

@api_router.get("/files")
async def list_files(project_id: str = None, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        query["project_id"] = project_id
    
    files = await db.files.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return files

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "files.delete")
    
    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    # Delete physical file
    file_path = ROOT_DIR / "uploads" / user["tenant_id"] / file_doc["filename"]
    if file_path.exists():
        file_path.unlink()
    
    await db.files.delete_one({"id": file_id})
    return {"message": "Dosya silindi"}

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    # Project counts by status
    total_projects = await db.projects.count_documents({"tenant_id": tenant_id})
    active_projects = await db.projects.count_documents({"tenant_id": tenant_id, "status": {"$in": ["planlandi", "uretimde", "kontrol"]}})
    completed_projects = await db.projects.count_documents({"tenant_id": tenant_id, "status": "tamamlandi"})
    
    # Task counts
    total_tasks = await db.project_tasks.count_documents({"tenant_id": tenant_id})
    completed_tasks = await db.project_tasks.count_documents({"tenant_id": tenant_id, "status": "tamamlandi"})
    
    # Recent projects
    recent_projects = await db.projects.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # User count
    user_count = await db.users.count_documents({"tenant_id": tenant_id})
    
    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "task_completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
        "user_count": user_count,
        "recent_projects": recent_projects
    }

# ==================== WEBSOCKET ====================

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload["user_id"]
    except:
        await websocket.close(code=4001)
        return
    
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
