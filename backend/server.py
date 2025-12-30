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
from fastapi import Form
from fastapi.staticfiles import StaticFiles

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
    avatar_url: Optional[str] = None
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
    subscription_active: Optional[bool] = None
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_plan: Optional[str] = None

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
    # Subscription fields
    subscription_active: bool = False
    subscription_start: Optional[str] = None
    subscription_end: Optional[str] = None
    subscription_plan: Optional[str] = None

# Subscription Models
class SubscriptionPlan(BaseModel):
    id: str = "gonye_plan"
    name: str = "Gönye Planı"
    price: float = 2500.0
    currency: str = "TRY"
    period: str = "monthly"  # monthly, yearly
    features: List[str] = []

class SubscriptionActivate(BaseModel):
    card_holder_name: str
    card_number: str  # Will be masked, not stored
    expiry_month: str
    expiry_year: str
    cvv: str  # Will not be stored

class SubscriptionResponse(BaseModel):
    is_active: bool
    plan_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_remaining: int = 0

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

# Project Models - NEW STRUCTURE WITH AREAS

# Project Area Work Item
class AreaWorkItemCreate(BaseModel):
    work_item_id: str
    work_item_name: Optional[str] = None
    quantity: int = 1
    notes: Optional[str] = None

# Project Area (Alan) Models
class ProjectAreaCreate(BaseModel):
    name: str  # Alan adı (ör: Mutfak, Gardrop)
    address: Optional[str] = None  # Alanın adresi (farklı adresler olabilir)
    city: Optional[str] = None
    district: Optional[str] = None
    work_items: List[AreaWorkItemCreate] = []
    agreed_price: float = 0  # Anlaşma bedeli
    status: str = "planlandi"  # planlandi, uretimde, montaj, tamamlandi

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
    collected_amount: float = 0  # Tahsil edilen
    remaining_amount: float = 0  # Kalan borç
    status: str
    progress: float = 0.0
    created_at: str
    updated_at: str

# Project Assignment Models
class ProjectAssignmentCreate(BaseModel):
    user_id: str
    assignment_type: str  # "project" or "area"
    area_id: Optional[str] = None  # if assignment_type is "area"

class ProjectAssignmentResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    user_name: str
    assignment_type: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    created_at: str

# Project Payment Models
class ProjectPaymentCreate(BaseModel):
    area_id: str
    amount: float
    payment_date: str
    payment_method: str = "nakit"  # nakit, havale, kredi_karti
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

# Project Activity Log Models
class ProjectActivityResponse(BaseModel):
    id: str
    project_id: str
    area_id: Optional[str] = None
    area_name: Optional[str] = None
    user_id: str
    user_name: str
    action: str  # created, updated, status_changed, payment_added, staff_assigned, etc.
    description: str
    metadata: Dict[str, Any] = {}
    created_at: str

# Main Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    customer_id: Optional[str] = None  # CRM müşteri ID'si
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    areas: List[ProjectAreaCreate] = []
    assigned_users: List[ProjectAssignmentCreate] = []
    due_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

class ProjectTaskUpdate(BaseModel):
    status: str  # bekliyor, planlandi, uretimde, kontrol, tamamlandi
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
    total_agreed: float = 0  # Toplam anlaşma bedeli
    total_collected: float = 0  # Toplam tahsilat
    total_remaining: float = 0  # Toplam kalan borç
    areas_summary: List[Dict[str, Any]] = []

class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
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

# Customer Models (CRM)
class CustomerCreate(BaseModel):
    type: str = "bireysel"  # bireysel, mimar, muteahhit, kurumsal
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    tenant_id: str
    type: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None
    referral_source: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class CustomerStats(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    total_revenue: float = 0  # Toplam ciro (anlaşma bedeli)
    total_collected: float = 0  # Toplam tahsilat
    total_remaining: float = 0  # Kalan bakiye

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

# Comment Models (YENİ)
class TaskCommentCreate(BaseModel):
    message: str

class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    message: str
    created_at: str

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
        logger.info(f"WebSocket connected: User {user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: User {user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_connections.append(connection)
            
            for dead in dead_connections:
                self.disconnect(dead, user_id)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        users = await db.users.find({"tenant_id": tenant_id}, {"id": 1, "_id": 0}).to_list(1000)
        for user in users:
            await self.send_to_user(user["id"], message)

manager = ConnectionManager()

# Status labels for notifications
PROJECT_STATUS_LABELS = {
    "planlandi": "Planlandı",
    "uretimde": "Üretimde",
    "montaj": "Montaj",
    "kontrol": "Kontrol",
    "tamamlandi": "Tamamlandı",
    "durduruldu": "Durduruldu",
    "iptal": "İptal"
}

# Locked statuses (only admin can modify)
PROJECT_LOCKED_STATUSES = ["tamamlandi", "durduruldu"]

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

# Helper function to get project assigned user IDs
async def get_project_assigned_users(project_id: str, include_creator: bool = True):
    """Get all user IDs assigned to a project"""
    user_ids = set()
    
    # Get project creator
    if include_creator:
        project = await db.projects.find_one({"id": project_id}, {"created_by": 1, "_id": 0})
        if project and project.get("created_by"):
            user_ids.add(project["created_by"])
    
    # Get assigned users
    assignments = await db.project_assignments.find(
        {"project_id": project_id},
        {"user_id": 1, "_id": 0}
    ).to_list(100)
    
    for a in assignments:
        if a.get("user_id"):
            user_ids.add(a["user_id"])
    
    return list(user_ids)

# Helper function to notify project team
async def notify_project_team(project_id: str, tenant_id: str, title: str, message: str, 
                              notification_type: str = "info", link: str = None,
                              exclude_user_id: str = None):
    """Send notification to all users assigned to a project"""
    user_ids = await get_project_assigned_users(project_id)
    
    for user_id in user_ids:
        if exclude_user_id and user_id == exclude_user_id:
            continue
        await create_notification(user_id, tenant_id, title, message, notification_type, link)

# Helper function to check if project is locked for modifications
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
        # Admin can always modify
        if user.get("is_admin"):
            return {"locked": True, "reason": None, "can_modify": True}
        
        # Non-admin cannot modify locked projects
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

# Helper to enforce project lock
async def enforce_project_lock(project_id: str, user: dict):
    """Raise exception if project is locked and user cannot modify"""
    lock_info = await check_project_locked(project_id, user)
    if lock_info["locked"] and not lock_info["can_modify"]:
        raise HTTPException(status_code=403, detail=lock_info["reason"])

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
        "avatar_url": None,
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
            avatar_url=user.get("avatar_url"), 
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
            avatar_url=user.get("avatar_url"),
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
        avatar_url=user.get("avatar_url"),
        is_admin=user.get("is_admin", False),
        setup_completed=setup_completed,
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

# ==================== SUBSCRIPTION ROUTES ====================

@api_router.get("/subscription/plan")
async def get_subscription_plan():
    """Get available subscription plan details"""
    return {
        "id": "gonye_plan",
        "name": "Gönye Planı",
        "price": 2500.0,
        "currency": "TRY",
        "period": "monthly",
        "period_label": "Aylık",
        "features": [
            "Sınırsız proje oluşturma",
            "Sınırsız kullanıcı ekleme",
            "Gelişmiş raporlama",
            "Dosya yönetimi",
            "Öncelikli destek",
            "Tüm özellikler dahil"
        ]
    }

@api_router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(user: dict = Depends(get_current_user)):
    """Get current subscription status"""
    tenant = await db.tenants.find_one({"id": user["tenant_id"]}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Firma bulunamadı")
    
    # Calculate days remaining
    days_remaining = 0
    if tenant.get("subscription_end"):
        end_date = datetime.fromisoformat(tenant["subscription_end"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        if end_date > now:
            days_remaining = (end_date - now).days
    
    return SubscriptionResponse(
        is_active=tenant.get("subscription_active", False),
        plan_name=tenant.get("subscription_plan"),
        start_date=tenant.get("subscription_start"),
        end_date=tenant.get("subscription_end"),
        days_remaining=days_remaining
    )

@api_router.post("/subscription/activate", response_model=SubscriptionResponse)
async def activate_subscription(data: SubscriptionActivate, user: dict = Depends(get_current_user)):
    """Activate subscription (mock payment processing for development)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Yalnızca yöneticiler abonelik işlemi yapabilir")
    
    # In production, this would integrate with a payment gateway (iyzico, param, etc.)
    # For development, we just simulate a successful payment
    
    now = datetime.now(timezone.utc)
    end_date = now + timedelta(days=30)  # Monthly subscription
    
    update_data = {
        "subscription_active": True,
        "subscription_start": now.isoformat(),
        "subscription_end": end_date.isoformat(),
        "subscription_plan": "Gönye Planı"
    }
    
    await db.tenants.update_one(
        {"id": user["tenant_id"]},
        {"$set": update_data}
    )
    
    # Log the subscription activation
    await db.subscription_logs.insert_one({
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "user_id": user["id"],
        "action": "activated",
        "plan": "Gönye Planı",
        "amount": 2500.0,
        "card_last_four": data.card_number[-4:] if len(data.card_number) >= 4 else "****",
        "created_at": now.isoformat()
    })
    
    return SubscriptionResponse(
        is_active=True,
        plan_name="Gönye Planı",
        start_date=now.isoformat(),
        end_date=end_date.isoformat(),
        days_remaining=30
    )

# ==================== CUSTOMER ROUTES (CRM) ====================

@api_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(
    search: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all customers for the tenant with optional search and type filter"""
    query = {"tenant_id": user["tenant_id"]}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    if type:
        query["type"] = type
    
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, user: dict = Depends(get_current_user)):
    """Create a new customer"""
    # Validate type
    valid_types = ["bireysel", "mimar", "muteahhit", "kurumsal"]
    if data.type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Geçersiz müşteri tipi. Geçerli tipler: {valid_types}")
    
    customer = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "type": data.type,
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "address": data.address,
        "tax_office": data.tax_office,
        "tax_number": data.tax_number,
        "referral_source": data.referral_source,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer)
    return CustomerResponse(**customer)

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Get a single customer by ID"""
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return CustomerResponse(**customer)

@api_router.get("/customers/{customer_id}/stats", response_model=CustomerStats)
async def get_customer_stats(customer_id: str, user: dict = Depends(get_current_user)):
    """Get financial statistics for a customer"""
    # Verify customer exists
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Get all projects for this customer
    projects = await db.projects.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0, "id": 1, "status": 1}
    ).to_list(1000)
    
    total_projects = len(projects)
    active_projects = len([p for p in projects if p["status"] not in ["tamamlandi", "iptal"]])
    completed_projects = len([p for p in projects if p["status"] == "tamamlandi"])
    
    # Calculate financials from project areas
    project_ids = [p["id"] for p in projects]
    
    total_revenue = 0
    total_collected = 0
    
    if project_ids:
        # Get all areas for these projects
        areas = await db.project_areas.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0, "agreed_price": 1, "id": 1}
        ).to_list(1000)
        
        total_revenue = sum(a.get("agreed_price", 0) for a in areas)
        
        # Get all payments for these projects
        payments = await db.project_payments.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0, "amount": 1}
        ).to_list(10000)
        
        total_collected = sum(p.get("amount", 0) for p in payments)
    
    return CustomerStats(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        total_revenue=total_revenue,
        total_collected=total_collected,
        total_remaining=total_revenue - total_collected
    )

@api_router.get("/customers/{customer_id}/projects")
async def get_customer_projects(customer_id: str, user: dict = Depends(get_current_user)):
    """Get all projects for a customer"""
    # Verify customer exists
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    projects = await db.projects.find(
        {"customer_id": customer_id, "tenant_id": user["tenant_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for project in projects:
        # Get areas for finance summary
        areas = await db.project_areas.find(
            {"project_id": project["id"]},
            {"_id": 0}
        ).to_list(100)
        
        total_agreed = sum(a.get("agreed_price", 0) for a in areas)
        
        # Get payments
        payments = await db.project_payments.find(
            {"project_id": project["id"]},
            {"_id": 0, "amount": 1}
        ).to_list(1000)
        total_collected = sum(p.get("amount", 0) for p in payments)
        
        result.append({
            **project,
            "total_agreed": total_agreed,
            "total_collected": total_collected,
            "total_remaining": total_agreed - total_collected
        })
    
    return result

@api_router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str, 
    data: CustomerUpdate, 
    user: dict = Depends(get_current_user)
):
    """Update a customer"""
    # Verify customer exists
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Validate type if provided
    if data.type:
        valid_types = ["bireysel", "mimar", "muteahhit", "kurumsal"]
        if data.type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Geçersiz müşteri tipi. Geçerli tipler: {valid_types}")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.customers.update_one(
            {"id": customer_id, "tenant_id": user["tenant_id"]},
            {"$set": update_data}
        )
    
    updated_customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    return CustomerResponse(**updated_customer)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Delete a customer (only if no projects exist)"""
    # Verify customer exists
    customer = await db.customers.find_one(
        {"id": customer_id, "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Check if customer has projects
    project_count = await db.projects.count_documents({
        "customer_id": customer_id, 
        "tenant_id": user["tenant_id"]
    })
    
    if project_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Bu müşterinin {project_count} projesi bulunmaktadır. Önce projeleri silmeniz veya başka müşteriye atamanız gerekmektedir."
        )
    
    await db.customers.delete_one({"id": customer_id, "tenant_id": user["tenant_id"]})
    return {"message": "Müşteri başarıyla silindi"}

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

# ==================== PROJECT ROUTES (NEW STRUCTURE WITH AREAS) ====================

# Helper function to check if user can access project
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

# Helper function to log project activity
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
    # Create a copy without _id for insertion
    activity_to_insert = {k: v for k, v in activity.items() if k != "_id"}
    await db.project_activities.insert_one(activity_to_insert)
    return activity

# Get project list (filtered by access)
@api_router.get("/projects")
async def get_projects(status: str = None, user: dict = Depends(get_current_user)):
    tenant_id = user["tenant_id"]
    
    # Check if user has view_all permission
    has_view_all = user.get("is_admin", False)
    if not has_view_all and user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"permissions": 1, "_id": 0})
        if role and "projects.view_all" in role.get("permissions", []):
            has_view_all = True
    
    if has_view_all:
        query = {"tenant_id": tenant_id}
    else:
        # Get projects user is assigned to or created
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
        # Get areas
        areas = await db.project_areas.find({"project_id": project["id"]}, {"_id": 0}).to_list(100)
        
        # Calculate finance
        total_agreed = sum(a.get("agreed_price", 0) for a in areas)
        payments = await db.project_payments.find({"project_id": project["id"]}, {"amount": 1, "_id": 0}).to_list(1000)
        total_collected = sum(p.get("amount", 0) for p in payments)
        
        # Calculate progress from tasks
        tasks = await db.project_tasks.find({"project_id": project["id"]}, {"status": 1, "_id": 0}).to_list(1000)
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.get("status") == "tamamlandi"])
        progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Get creator name
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

# Create new project
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
    
    # Create a copy without _id for insertion
    project_to_insert = {k: v for k, v in project.items() if k != "_id"}
    await db.projects.insert_one(project_to_insert)
    
    # Log activity
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "project_created", f"'{data.name}' projesi oluşturuldu."
    )
    
    # Create areas
    created_areas = []
    for area_data in data.areas:
        area = await create_project_area_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], area_data
        )
        created_areas.append(area)
    
    # Create assignments
    created_assignments = []
    for assignment_data in data.assigned_users:
        assignment = await create_project_assignment_internal(
            project_id, user["tenant_id"], user["id"], user["full_name"], assignment_data
        )
        if assignment:
            created_assignments.append(assignment)
    
    # Get creator name
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

# Internal helper for creating area
async def create_project_area_internal(
    project_id: str, tenant_id: str, user_id: str, user_name: str, area_data: ProjectAreaCreate
):
    area_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Process work items
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
            
            # Create tasks for this work item in this area
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
                # Create a copy without _id for insertion
                task_to_insert = {k: v for k, v in task.items() if k != "_id"}
                await db.project_tasks.insert_one(task_to_insert)
    
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
    
    # Create a copy without _id for insertion
    area_to_insert = {k: v for k, v in area.items() if k != "_id"}
    await db.project_areas.insert_one(area_to_insert)
    
    # Log activity
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

# Internal helper for creating assignment
async def create_project_assignment_internal(
    project_id: str, tenant_id: str, assigner_id: str, assigner_name: str, assignment_data: ProjectAssignmentCreate
):
    # Get assigned user info
    assigned_user = await db.users.find_one({"id": assignment_data.user_id, "tenant_id": tenant_id}, {"_id": 0})
    if not assigned_user:
        return None
    
    # Get area name if area assignment
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
    
    # Create a copy without _id for insertion
    assignment_to_insert = {k: v for k, v in assignment.items() if k != "_id"}
    await db.project_assignments.insert_one(assignment_to_insert)
    
    # Get project name for notification
    project = await db.projects.find_one({"id": project_id}, {"name": 1, "_id": 0})
    project_name = project.get("name") if project else "Proje"
    
    # Send notification to assigned user
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
    
    # Log activity
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

# Get single project with full details
@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    # Get creator name
    creator = await db.users.find_one({"id": project.get("created_by")}, {"full_name": 1, "_id": 0})
    creator_name = creator.get("full_name") if creator else None
    
    # Get areas
    areas = await db.project_areas.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    
    # Get payments for each area
    area_responses = []
    for area in areas:
        payments = await db.project_payments.find({"area_id": area["id"]}, {"amount": 1, "_id": 0}).to_list(1000)
        collected = sum(p.get("amount", 0) for p in payments)
        
        # Get tasks for area progress
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
    
    # Get assignments
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
    
    # Calculate total finance
    total_agreed = sum(a.get("agreed_price", 0) for a in area_responses)
    total_collected = sum(a.get("collected_amount", 0) for a in area_responses)
    
    # Overall progress
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

# Check project lock status
@api_router.get("/projects/{project_id}/lock-status")
async def get_project_lock_status(project_id: str, user: dict = Depends(get_current_user)):
    """Get project lock status (completed/stopped)"""
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    lock_info = await check_project_locked(project_id, user)
    return lock_info

# Update project
@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.edit")
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Check if status changed
    old_status = project.get("status")
    new_status = update_data.get("status")
    status_changed = new_status and old_status != new_status
    
    # If only status is being changed to unlock (resume), admin can do it
    # Otherwise, check if project is locked
    only_status_change = len([k for k in update_data.keys() if k not in ["status", "updated_at"]]) == 0
    
    if not only_status_change:
        # Non-status changes require lock check
        await enforce_project_lock(project_id, user)
    elif status_changed and old_status in PROJECT_LOCKED_STATUSES:
        # Changing from locked status requires admin
        if not user.get("is_admin"):
            raise HTTPException(
                status_code=403, 
                detail="Durdurulmuş veya tamamlanmış projenin durumunu yalnızca yönetici değiştirebilir."
            )
    
    # Log changes
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
    
    # Send notifications for status change
    if status_changed:
        old_label = PROJECT_STATUS_LABELS.get(old_status, old_status)
        new_label = PROJECT_STATUS_LABELS.get(new_status, new_status)
        project_name = project.get("name", "Proje")
        
        # Special notification for project completion
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

# Delete project
@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "projects.delete")
    
    # Delete all related data
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
    await enforce_project_lock(project_id, user)
    
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
    await enforce_project_lock(project_id, user)
    
    area = await db.project_areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Log changes
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
    
    # Get collected amount
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
    await enforce_project_lock(project_id, user)
    
    area = await db.project_areas.find_one({"id": area_id, "project_id": project_id}, {"_id": 0})
    if not area:
        raise HTTPException(status_code=404, detail="Alan bulunamadı")
    
    # Delete related tasks, payments, assignments
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
    await enforce_project_lock(project_id, user)
    
    project = await db.projects.find_one({"id": project_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı")
    
    # Check if already assigned
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
    
    # Send notification to the assigned user
    await create_notification(
        data.user_id, user["tenant_id"],
        "👤 Yeni Proje Ataması",
        f"'{project.get('name', 'Proje')}' projesine atandınız.",
        "info",
        f"/projects/{project_id}"
    )
    
    return assignment

@api_router.delete("/projects/{project_id}/assignments/{assignment_id}")
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

# ==================== PROJECT PAYMENT ROUTES ====================

@api_router.post("/projects/{project_id}/payments")
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
    
    # Create a copy without _id for insertion
    payment_to_insert = {k: v for k, v in payment.items() if k != "_id"}
    await db.project_payments.insert_one(payment_to_insert)
    
    # Log activity
    await log_project_activity(
        project_id, user["tenant_id"], user["id"], user["full_name"],
        "payment_added",
        f"'{area['name']}' alanı için {data.amount:,.2f} ₺ tahsilat kaydedildi.",
        data.area_id, area["name"],
        {"amount": data.amount, "method": data.payment_method}
    )
    
    # Send notification to project team about payment
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

@api_router.get("/projects/{project_id}/payments")
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

@api_router.delete("/projects/{project_id}/payments/{payment_id}")
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

# ==================== PROJECT ACTIVITY ROUTES ====================

@api_router.get("/projects/{project_id}/activities")
async def get_project_activities(project_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    if not await can_access_project(user, project_id):
        raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")
    
    activities = await db.project_activities.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return activities

# ==================== PROJECT TASK ROUTES ====================

@api_router.get("/projects/{project_id}/tasks")
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

@api_router.put("/projects/{project_id}/tasks/{task_id}")
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

    # Log changes
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

    # Update area status logic
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

    # Update project status logic
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

# ==================== TASK COMMENTS ROUTES (YENİ & LOGLU) ====================

@api_router.get("/tasks/{task_id}/comments", response_model=List[TaskCommentResponse])
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
            "user_name": comment_user.get("full_name", c["user_name"]),
            "user_avatar": comment_user.get("avatar_url")
        })
        
    return result

@api_router.post("/tasks/{task_id}/comments", response_model=TaskCommentResponse)
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
    
    # Update task updated_at
    await db.project_tasks.update_one(
        {"id": task_id},
        {"$set": {"updated_at": now}}
    )
    
    # Notify assignee
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

    # --- LOG ACTIVITY ---
    area_name = None
    if task.get("area_id"):
        area = await db.project_areas.find_one({"id": task["area_id"]}, {"name": 1, "_id": 0})
        area_name = area.get("name") if area else None

    # Kısa mesaj önizlemesi (max 50 karakter)
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

# ==================== AVATAR ROUTES (YENİ) ====================

@api_router.post("/users/me/avatar", response_model=UserResponse)
async def upload_user_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # İzin verilen dosya tipleri
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları (JPEG, PNG, WEBP) yüklenebilir.")

    # Klasör yapısı: uploads/{tenant_id}/avatars/
    upload_dir = ROOT_DIR / "uploads" / user["tenant_id"] / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Dosya isimlendirme (user_id.uzantı) - Her kullanıcının tek avatarı olur, eskisi üzerine yazılır
    file_ext = Path(file.filename).suffix
    if not file_ext:
        file_ext = ".jpg" # Varsayılan
        
    filename = f"{user['id']}_avatar{file_ext}"
    file_path = upload_dir / filename

    # Dosyayı kaydet
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # URL oluştur (API üzerinden sunulacak)
    avatar_url = f"/api/users/avatars/{user['tenant_id']}/{filename}"
    
    # DB Güncelle
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    # Güncel kullanıcıyı döndür
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)

@api_router.get("/users/avatars/{tenant_id}/{filename}")
async def get_user_avatar(tenant_id: str, filename: str):
    from fastapi.responses import FileResponse
    
    file_path = ROOT_DIR / "uploads" / tenant_id / "avatars" / filename
    
    if not file_path.exists():
        # Varsayılan bir resim veya 404 dönebiliriz. Şimdilik 404.
        raise HTTPException(status_code=404, detail="Avatar bulunamadı")
        
    return FileResponse(file_path)

@api_router.delete("/users/me/avatar", response_model=UserResponse)
async def delete_user_avatar(user: dict = Depends(get_current_user)):
    # Mevcut avatar bilgisini al
    current_user = await db.users.find_one({"id": user["id"]})
    if current_user and current_user.get("avatar_url"):
        # Dosya yolunu bul ve sil
        try:
            # URL: /api/users/avatars/{tenant_id}/{filename}
            parts = current_user["avatar_url"].split("/")
            filename = parts[-1]
            file_path = ROOT_DIR / "uploads" / user["tenant_id"] / "avatars" / filename
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Avatar silme hatası: {e}")

    # DB'den kaldır
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatar_url": None}}
    )

    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(**updated_user)
    
# ==================== FILE UPLOAD ROUTES ====================

@api_router.post("/files/upload")
async def upload_file(
    project_id: str = Form(None),
    area_id: str = Form(None),
    task_id: str = Form(None),
    work_item_id: str = Form(None),
    category: str = Form(None),  # ör: "cizim", "pdf", "foto", "diger"
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    check_permission(user, "files.upload")

    # Proje erişimi (multi-tenant + assignment)
    if project_id:
        if not await can_access_project(user, project_id, area_id):
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")

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

    # Aktivite log (yeni)
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
        
        # Send notification to project team about file upload
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
        # erişim
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


@api_router.delete("/files/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    check_permission(user, "files.delete")

    file_doc = await db.files.find_one({"id": file_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not file_doc:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    # Proje erişimi (multi-tenant güvenliği)
    project_id = file_doc.get("project_id")
    area_id = file_doc.get("area_id")
    if project_id:
        if not await can_access_project(user, project_id, area_id):
            raise HTTPException(status_code=403, detail="Bu projeye erişim yetkiniz yok")

    # Aktivite log (yeni) - fiziksel silmeden önce
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

    # Delete physical file
    file_path = ROOT_DIR / "uploads" / user["tenant_id"] / file_doc["filename"]
    if file_path.exists():
        file_path.unlink()

    await db.files.delete_one({"id": file_id})
    return {"message": "Dosya silindi"}


# Public endpoint for logo files (no auth required)
@api_router.get("/public/files/{file_id}")
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

# ==================== MY TASKS ROUTE (YENİ) ====================

@api_router.get("/tasks/me")
async def get_my_tasks(user: dict = Depends(get_current_user)):
    """Kullanıcının üzerine atanmış tüm görevleri getirir (Proje bağımsız)"""
    
    # Sadece tamamlanmamış veya son 1 haftada tamamlanmış görevleri getir
    # Performans için son 100 görevi çekiyoruz
    tasks = await db.project_tasks.find(
        {"assigned_to": user["id"], "tenant_id": user["tenant_id"]}, 
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    result = []
    for task in tasks:
        # Proje ismini çek
        project = await db.projects.find_one({"id": task["project_id"]}, {"name": 1, "_id": 0})
        
        # Alan (Area) ismini çek
        area = None
        if task.get("area_id"):
            area = await db.project_areas.find_one({"id": task["area_id"]}, {"name": 1, "_id": 0})
            
        result.append({
            **task,
            "project_name": project.get("name") if project else "Silinmiş Proje",
            "area_name": area.get("name") if area else "-"
        })
        
    return result
# ==================== WEBSOCKET ====================

@app.websocket("/api/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        # Token doğrulama
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            print("WS Token Expired")
            await websocket.close(code=4001, reason="Token expired")
            return
        except jwt.InvalidTokenError:
            print("WS Token Invalid")
            await websocket.close(code=4001, reason="Invalid token")
            return
        except Exception as e:
            print(f"WS Token Error: {e}")
            await websocket.close(code=4000, reason="Auth error")
            return
        
        # Bağlantıyı kabul et
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Heartbeat: Client'tan mesaj bekle
                data = await websocket.receive_text()
                
                # Eğer client "ping" atarsa "pong" ile cevap ver
                if data == "ping":
                    await websocket.send_text("pong")
                    continue
                
        except WebSocketDisconnect:
            manager.disconnect(websocket, user_id)
        except Exception as e:
            logger.error(f"WebSocket error in loop: {e}")
            manager.disconnect(websocket, user_id)
            
    except Exception as e:
        logger.error(f"Critical WebSocket endpoint error: {e}")

# Include the router in the main app
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