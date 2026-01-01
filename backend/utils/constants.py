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
    {"key": "customers.view", "name": "Müşterileri Görüntüle", "description": "Müşteri listesi görüntüleme yetkisi"},
    {"key": "customers.manage", "name": "Müşterileri Yönet", "description": "Müşteri ekleme/düzenleme/silme yetkisi"},
    {"key": "setup.groups", "name": "Grupları Yönet", "description": "Grup oluşturma ve düzenleme yetkisi"},
    {"key": "setup.subtasks", "name": "Alt Görevleri Yönet", "description": "Alt görev yönetimi yetkisi"},
    {"key": "setup.workitems", "name": "İş Kalemlerini Yönet", "description": "İş kalemi yönetimi yetkisi"},
    {"key": "setup.roles", "name": "Rolleri Yönet", "description": "Rol ve yetki yönetimi yetkisi"},
    {"key": "users.view", "name": "Kullanıcıları Görüntüle", "description": "Kullanıcı listesi görüntüleme"},
    {"key": "users.manage", "name": "Kullanıcıları Yönet", "description": "Kullanıcı ekleme/düzenleme yetkisi"},
    {"key": "settings.manage", "name": "Ayarları Yönet", "description": "Firma ayarları düzenleme yetkisi"},
    {"key": "files.upload", "name": "Dosya Yükle", "description": "Dosya yükleme yetkisi"},
    {"key": "files.delete", "name": "Dosya Sil", "description": "Dosya silme yetkisi"},
    {"key": "chat.access", "name": "Sohbet Erişimi", "description": "Sohbet özelliğine erişim yetkisi"},
    {"key": "chat.create_group", "name": "Grup Oluştur", "description": "Sohbet grubu oluşturma yetkisi"},
]

# Project Status Labels
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

# Chat constants
AVAILABLE_REACTIONS = ["👍", "❤️", "😊", "🎉", "😮", "😢", "😂", "🔥"]

# Message edit/delete time limit (5 minutes in seconds)
MESSAGE_EDIT_TIME_LIMIT = 300
