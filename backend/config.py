from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

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

# Default Permissions
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
    {"key": "customers.view", "name": "Müşterileri Görüntüle", "description": "Müşteri listesi görüntüleme"},
    {"key": "customers.manage", "name": "Müşterileri Yönet", "description": "Müşteri ekleme/düzenleme yetkisi"},
]
