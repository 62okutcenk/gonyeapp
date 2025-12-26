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
from fastapi.responses import FileResponse

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
    tenant_name: Optional[str] = None

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
    permissions: List[str] = [] 
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

# Group Models
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

# SubTask Models
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

# WorkItem Models
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

class AreaWorkItemCreate(BaseModel):
    work_item_id: str
    work_item_name: Optional[str] = None
    quantity: int = 1
    notes: Optional[str] = None

class ProjectAreaCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    work_items: List[AreaWorkItemCreate] = []
    agreed_price: float = 0
    status: str = "planlandi"

class ProjectAreaUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    agreed_price: Optional[float] = None
    status: Optional[str] = None

class ProjectAreaResponse(BaseModel):
    id: str
    project_id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    work_items: List[Dict[str, Any]] = []
    agreed_price: float = 0
    collected_amount: float = 0
    remaining_amount: float = 0
    status: str
    progress: float = 0.0
    created_at: str
    updated_at: str

class ProjectAssignmentCreate(BaseModel):
    user_id: str
    assignment_type: str  # "project" or "area"
    area_id: Optional[str] = None

class ProjectAssignmentResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str
    assignment_type: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    created_at: str

class ProjectPaymentCreate(BaseModel):
    area_id: str
    amount: float
    payment_date: str
    payment_method: str = "nakit"
    notes: Optional[str] = None

class ProjectPaymentResponse(BaseModel):
    id: str
    project_id: str
    area_id: str
    area_name: str
    amount: float
    payment_date: str
    payment_method: str
    notes: Optional[str] = None
    created_by: str
    created_by_name: str
    created_at: str

class ProjectActivityResponse(BaseModel):
    id: str
    project_id: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    user_id: str
    user_name: str
    action: str
    description: str
    metadata: Dict[str, Any] = {}
    created_at: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    areas: List[ProjectAreaCreate] = []
    assigned_users: List[ProjectAssignmentCreate] = []
    due_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None 

class ProjectTaskUpdate(BaseModel):
    status: str  
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class ProjectTaskResponse(BaseModel):
    id: str
    project_id: str
    area_id: str
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

class ProjectFinanceSummary(BaseModel):
    total_agreed: float = 0
    total_collected: float = 0
    total_remaining: float = 0
    areas_summary: List[Dict[str, Any]] = []

class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    status: str
    due_date: Optional[str] = None
    created_by: str
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str
    areas: List[ProjectAreaResponse] = []
    assignments: List[ProjectAssignmentResponse] = []
    finance: ProjectFinanceSummary = ProjectFinanceSummary()
    progress: float = 0.0
    area_count: int = 0

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: str

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
        
        permissions = []
        if user.get("is_admin"):
            permissions = ["*"]
        elif user.get("role_id"):
            role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
            if role:
                permissions = role.get("permissions", [])
        
        user["permissions"] = permissions
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

def check_permission(user: dict, permission: str):
    if user.get("is_admin"):
        return True
    
    user_perms = user.get("permissions", [])
    if "*" in user_perms:
        return True
        
    if permission in user_perms:
        return True
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Bu işlem için yetkiniz yok: {permission}"
    )

async def check_project_lock(project_id: str, user: dict):
    project = await db.projects.find_one({"id": project_id}, {"status": 1, "_id": 0})
    if not project:
        return
        
    status = project.get("status")
    
    if status == "tamamlandi":
        raise HTTPException(
            status_code=400, 
            detail="Bu proje tamamlanmıştır. Üzerinde değişiklik yapılamaz."
        )
    
    if status == "durduruldu":
        if not user.get("is_admin"):
            raise HTTPException(
                status_code=403,
                detail="Bu proje durdurulmuştur. Sadece yönetici işlem yapabilir."
            )

# ==================== WEBSOCKET & NOTIFICATIONS ====================

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
    
    await manager.send_to_user(user_id, {
        "type": "notification",
        "data": {k: v for k, v in notification.items() if k != "_id"}
    })
    
    return notification

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
    await db.project_activities.insert_one({k: v for k, v in activity.items() if k != "_id"})
    return activity

# ==================== DEFAULT PERMISSIONS ====================

DEFAULT_PERMISSIONS = [
    {"key": "projects.view", "name": "Projeleri Görüntüle", "description": "Atandığı projeleri görüntüleme yetkisi"},
    {"key": "projects.view_all", "name": "Tüm Projeleri Görüntüle", "description": "Tüm projeleri görüntüleme yetkisi"},
    {"key": "projects.create", "name": "Proje Oluştur", "description": "Yeni proje oluşturma yetkisi"},
    {"key": "projects.edit", "name": "Proje Düzenle", "description": "Proje düzenleme yetkisi"},
    {"key": "projects.delete", "name": "Proje Sil", "description": "Proje silme yetkisi"},
    {"key": "projects.assign_staff", "name": "Personel Ata", "description": "Projeye personel atama yetkisi"},
    {"key": "projects.manage_finance", "name": "Finans Yönet", "description": "Proje finansı ve tahsilat yönetimi yetkisi"},
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
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
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
        
        for perm in DEFAULT_PERMISSIONS:
            await db.permissions.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                **perm
            })
        
        admin_role = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "name": "Yönetici",
            "description": "Tüm yetkilere sahip yönetici rolü",
            "permissions": [p["key"] for p in DEFAULT_PERMISSIONS],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.roles.insert_one(admin_role)
        
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
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user["id"], tenant_id)
    
    tenant_doc = await db.tenants.find_one({"id": tenant_id}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    permissions = ["*"] if is_admin else []
    
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
            permissions=permissions,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Geçersiz e-posta veya şifre")
    
    token = create_token(user["id"], user["tenant_id"])
    
    tenant_doc = await db.tenants.find_one({"id": user["tenant_id"]}, {"setup_completed": 1, "_id": 0})
    setup_completed = tenant_doc.get("setup_completed", False) if tenant_doc else False
    
    permissions = []
    if user.get("is_admin"):
        permissions = ["*"]
    elif user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
        if role:
            permissions = role.get("permissions", [])

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
            permissions=permissions,
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
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
        is_admin=user.get("is_admin", False),
        setup_completed=setup_completed,
        permissions=user.get("permissions", []),
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

@api_router.get("/projects")
async def get_projects(status: str = None, user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    has_view_all = False
    if user.get("is_admin"):
        has_view_all = True
    else:
        user_perms = user.get("permissions", [])
        if "projects.view_all" in user_perms or "*" in user_perms:
            has_view_all = True
    
    query = {"tenant_id": tenant_id}

    if status:
        if status == "active":
            query["status"] = {"$in": ["planlandi", "uretimde", "montaj", "kontrol"]}
        elif status == "completed":
            query["status"] = "tamamlandi"
        elif status == "stopped":
            query["status"] = "durduruldu"
        else:
            query["status"] = status
    
    if not has_view_all:
        assignments = await db.project_assignments.find(
            {"user_id": user["id"]},
            {"project_id": 1, "_id": 0}
        ).to_list(1000)
        assigned_project_ids = list(set([a["project_id"] for a in assignments]))
        
        query["$or"] = [
            {"id": {"$in": assigned_project_ids}},
            {"created_by": user["id"]}
        ]
    
    projects = await db.projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    result = []
    for project in projects:
        tasks = await db.project_tasks.find({"project_id": project["id"]}, {"status": 1, "_id": 0}).to_list(1000)
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "tamamlandi"])
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        area_count = await db.project_areas.count_documents({"project_id": project["id"]})

        project_data = {
            **project,
            "progress": progress,
            "area_count": area_count,
            "areas": [], 
            "assignments": [],
            "finance": ProjectFinanceSummary()
        }
        result.append(project_data)
    
    return result

async def create_project_area_internal(
    project_id: str, tenant_id: str, user_id: str, user_name: str, area_data: ProjectAreaCreate
):
    area_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    area_work_items_meta = []
    
    subtasks_def = await db.subtasks.find({"tenant_id": tenant_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    groups_def = await db.groups.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    group_map = {g["id"]: g for g in groups_def}
    
    tasks_to_insert = []
    
    for wi in area_data.work_items:
        workitem_def = await db.workitems.find_one({"id": wi.work_item_id, "tenant_id": tenant_id}, {"_id": 0})
        workitem_name = workitem_def["name"] if workitem_def else "Bilinmeyen İş Kalemi"
        
        area_work_items_meta.append({
            "work_item_id": wi.work_item_id,
            "work_item_name": workitem_name,
            "quantity": wi.quantity,
            "notes": wi.notes
        })
        
        for st_def in subtasks_def:
            group_info = group_map.get(st_def["group_id"], {})
            
            task = {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "area_id": area_id,
                "tenant_id": tenant_id,
                "work_item_id": wi.work_item_id,
                "work_item_name": workitem_name, 
                "group_id": st_def["group_id"],
                "group_name": group_info.get("name", ""),
                "subtask_id": st_def["id"],
                "subtask_name": st_def["name"],
                "status": "bekliyor",
                "notes": None,
                "assigned_to": None,
                "created_at": now,
                "updated_at": now
            }
            tasks_to_insert.append(task)
            
    if tasks_to_insert:
        await db.project_tasks.insert_many(tasks_to_insert)
        
    area = {
        "id": area_id,
        "project_id": project_id,
        "tenant_id": tenant_id,
        "name": area_data.name,
        "address": area_data.address,
        "city": area_data.city,
        "district": area_data.district,
        "work_items": area_work_items_meta,
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
    
    return area

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
    
    return assignment

@api_router.post("/projects")
async def create_project(data: ProjectCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.create")
    
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    project = {
        "id": project_id,
        "tenant_id": user["tenant_id"],
        "name": data.name,
        "description": data.description,
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
    
    for area_data in data.areas:
        if hasattr(area_data, 'model_dump'):
             area_obj = area_data
        else:
             area_obj = ProjectAreaCreate(**area_data)

        await create_project_area_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], area_obj
        )
    
    for assignment_data in data.assigned_users:
        if isinstance(assignment_data, dict):
            assignment_obj = ProjectAssignmentCreate(**assignment_data)
        else:
            assignment_obj = assignment_data
            
        await create_project_assignment_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], assignment_obj
        )
    
    return project

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    if user.get("is_admin") is False:
         is_assigned = await db.project_assignments.find_one({"project_id": project_id, "user_id": user["id"]})
         is_creator = await db.projects.find_one({"id": project_id, "created_by": user["id"]})
         has_perm = False
         try:
             check_permission(user, "projects.view")
             has_perm = True
         except:
             pass
         
         if not (is_assigned or is_creator or has_perm):
              try:
                  check_permission(user, "projects.view_all")
              except:
                  raise HTTPException(status_code=403, detail="Erişim yetkiniz yok")

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
            "areas_summary": []
        },
        "progress": progress
    }

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    if data.status and data.status != project["status"]:
        if project["status"] in ["tamamlandi", "durduruldu"] and not user.get("is_admin"):
             raise HTTPException(status_code=403, detail="Kapalı projeyi sadece yönetici açabilir.")
    else:
        await check_project_lock(project_id, user)

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
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
    
    return await get_project(project_id, user)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.delete")
    await check_project_lock(project_id, user)
    
    await db.project_tasks.delete_many({"project_id": project_id})
    await db.project_areas.delete_many({"project_id": project_id})
    await db.project_assignments.delete_many({"project_id": project_id})
    await db.project_payments.delete_many({"project_id": project_id})
    await db.project_activities.delete_many({"project_id": project_id})
    await db.files.delete_many({"project_id": project_id})
    
    result = await db.projects.delete_one({"id": project_id, "tenant_id": user["tenant_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    return {"message": "Proje silindi"}

# ==================== PROJECT AREA ROUTES ====================

@api_router.post("/projects/{project_id}/areas")
async def create_project_area(project_id: str, data: ProjectAreaCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await check_project_lock(project_id, user) 
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    area = await create_project_area_internal(
        project_id, user["tenant_id"], user["id"], user["full_name"], data
    )
    
    return area

@api_router.put("/projects/{project_id}/areas/{area_id}")
async def update_project_area(project_id: str, area_id: str, data: ProjectAreaUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await check_project_lock(project_id, user) 
    
    area = await db.project_areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.project_areas.update_one({"id": area_id}, {"$set": update_data})
    
    updated_area = await db.project_areas.find_one({"id": area_id}, {"_id": 0})
    payments = await db.project_payments.find({"area_id": area_id}, {"amount": 1, "_id": 0}).to_list(1000)
    collected = sum(p.get("amount", 0) for p in payments)
    
    return {
        **updated_area,
        "collected_amount": collected,
        "remaining_amount": updated_area.get("agreed_price", 0) - collected
    }

@api_router.delete("/projects/{project_id}/areas/{area_id}")
async def delete_project_area(project_id: str, area_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    await check_project_lock(project_id, user) 
    
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

# ==================== PROJECT ASSIGNMENT ROUTES ====================

@api_router.post("/projects/{project_id}/assignments")
async def create_project_assignment(project_id: str, data: ProjectAssignmentCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.assign_staff")
    await check_project_lock(project_id, user) 
    
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
    
    return assignment

@api_router.delete("/projects/{project_id}/assignments/{assignment_id}")
async def delete_project_assignment(project_id: str, assignment_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.assign_staff")
    await check_project_lock(project_id, user) 
    
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

# ==================== PROJECT PAYMENT ROUTES ====================

@api_router.post("/projects/{project_id}/payments")
async def create_project_payment(project_id: str, data: ProjectPaymentCreate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.manage_finance")
    await check_project_lock(project_id, user) 
    
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
    
    return {
        **payment,
        "area_name": area["name"],
        "created_by_name": user["full_name"]
    }

@api_router.get("/projects/{project_id}/payments")
async def get_project_payments(project_id: str, user: dict = Depends(get_current_user)):
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

@api_router.delete("/projects/{project_id}/payments/{payment_id}")
async def delete_project_payment(project_id: str, payment_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.manage_finance")
    await check_project_lock(project_id, user) 
    
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

# ==================== PROJECT ACTIVITY ROUTES ====================

@api_router.get("/projects/{project_id}/activities")
async def get_project_activities(project_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    activities = await db.project_activities.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return activities

# ==================== PROJECT TASK ROUTES ====================

@api_router.get("/projects/{project_id}/tasks")
async def get_project_tasks(project_id: str, area_id: str = None, user: dict = Depends(get_current_user)):
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

@api_router.put("/projects/{project_id}/tasks/{task_id}")
async def update_project_task(project_id: str, task_id: str, data: dict, user: dict = Depends(get_current_user)):
    check_permission(user, "tasks.edit")
    await check_project_lock(project_id, user)
    
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Status Update
    if "status" in data and data["status"] != task["status"]:
        update_fields["status"] = data["status"]
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "task_status_changed",
            f"'{task['subtask_name']}' durumu: {task['status']} -> {data['status']}",
            area_id=task.get("area_id")
        )
        
    # Note Update
    if "notes" in data:
        update_fields["notes"] = data["notes"]
        # Explicit user request: Log note updates
        note_snippet = (data["notes"][:30] + '...') if len(data["notes"]) > 30 else data["notes"]
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "note_updated",
            f"'{task['subtask_name']}' görevine not eklendi: {note_snippet}",
            area_id=task.get("area_id")
        )

    # Assignment Update
    if "assigned_to" in data and data["assigned_to"] != task.get("assigned_to"):
        update_fields["assigned_to"] = data["assigned_to"]
        
        if data["assigned_to"]:
            project = await db.projects.find_one({"id": project_id})
            await create_notification(
                data["assigned_to"],
                user["tenant_id"],
                "Görev Atandı",
                f"'{project.get('name', '')}' projesinde size '{task['subtask_name']}' görevi atandı.",
                "info",
                f"/projects/{project_id}"
            )
            
            assigned_user = await db.users.find_one({"id": data["assigned_to"]})
            u_name = assigned_user["full_name"] if assigned_user else "Personel"
            
            await log_project_activity(
                project_id, user["tenant_id"], user["id"], user["full_name"],
                "staff_assigned",
                f"'{task['subtask_name']}' görevi {u_name} kişisine atandı.",
                area_id=task.get("area_id")
            )
    
    await db.project_tasks.update_one({"id": task_id}, {"$set": update_fields})
    
    # Area Status Logic
    if task.get("area_id"):
        area_tasks = await db.project_tasks.find({"area_id": task["area_id"]}, {"status": 1, "_id": 0}).to_list(1000)
        statuses = [t.get("status", "bekliyor") for t in area_tasks]
        statuses = [statuses] if isinstance(statuses, str) else statuses # Safety check
        
        if "status" in data: # Only recalculate on status change
            new_area_status = "planlandi"
            if statuses and all(s == "tamamlandi" for s in statuses):
                new_area_status = "tamamlandi"
            elif any(s == "montaj" for s in statuses):
                new_area_status = "montaj"
            elif any(s == "uretimde" for s in statuses):
                new_area_status = "uretimde"
            
            await db.project_areas.update_one(
                {"id": task["area_id"]},
                {"$set": {"status": new_area_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Görev güncellendi"}

# ==================== USER MANAGEMENT ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(get_current_user)):
    
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
        setup_completed=False,
        permissions=[], 
        created_at=new_user["created_at"]
    )

@api_router.put("/users/{user_id}", response_model=UserResponse)
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
    
    return UserResponse(
        **updated_user, 
        permissions=[]
    )

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
    task_id: str = None,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    check_permission(user, "files.upload")
    if project_id:
        await check_project_lock(project_id, user)
    
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
        "task_id": task_id,
        "original_name": file.filename,
        "filename": filename,
        "content_type": file.content_type,
        "size": len(content),
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    
    if task_id and project_id:
        task = await db.project_tasks.find_one({"id": task_id})
        task_name = task["subtask_name"] if task else "Görev"
        await log_project_activity(
            project_id, user["tenant_id"], user["id"], user["full_name"],
            "file_uploaded",
            f"'{task_name}' görevine dosya yüklendi: {file.filename}"
        )
    
    return {
        "id": file_id,
        "original_name": file.filename,
        "url": f"/api/files/{file_id}"
    }

@api_router.get("/files/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
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
async def list_files(project_id: str = None, task_id: str = None, user: dict = Depends(get_current_user)):
    query = {"tenant_id": user["tenant_id"]}
    if project_id:
        query["project_id"] = project_id
    if task_id:
        query["task_id"] = task_id
    
    files = await db.files.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return files

@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "files.delete")
    
    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    
    if file_doc.get("project_id"):
        await check_project_lock(file_doc["project_id"], user)
    
    file_path = ROOT_DIR / "uploads" / user["tenant_id"] / file_doc["filename"]
    if file_path.exists():
        file_path.unlink()
    
    await db.files.delete_one({"id": file_id})
    return {"message": "Dosya silindi"}

@api_router.get("/public/files/{file_id}")
async def get_public_file(file_id: str):
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

# ==================== DASHBOARD STATS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    total_projects = await db.projects.count_documents({"tenant_id": tenant_id})
    active_projects = await db.projects.count_documents({"tenant_id": tenant_id, "status": {"$in": ["planlandi", "uretimde", "montaj", "kontrol"]}})
    completed_projects = await db.projects.count_documents({"tenant_id": tenant_id, "status": "tamamlandi"})
    
    total_tasks = await db.project_tasks.count_documents({"tenant_id": tenant_id})
    completed_tasks = await db.project_tasks.count_documents({"tenant_id": tenant_id, "status": "tamamlandi"})
    
    recent_projects = await db.projects.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
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
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()