from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class ConversationType(str, Enum):
    DIRECT = "direct"           # Bireysel sohbet
    PROJECT = "project"         # Proje bazlı grup
    GROUP = "group"             # Özel oluşturulan grup
    GENERAL = "general"         # Genel firma sohbeti

class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    IMAGE = "image"
    SYSTEM = "system"           # Sistem mesajları (kullanıcı eklendi vs.)

# Link Preview for shared resources
class LinkPreview(BaseModel):
    type: str  # project, customer, task, user, file
    id: str
    title: str
    subtitle: Optional[str] = None
    url: str

# Mention Response
class MentionResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None

# Reaction Models
class ReactionCreate(BaseModel):
    emoji: str  # 👍 ❤️ 😊 🎉 😮 😢

class ReactionResponse(BaseModel):
    emoji: str
    user_id: str
    user_name: str
    created_at: str

# Conversation Models
class ConversationCreate(BaseModel):
    type: ConversationType
    name: Optional[str] = None              # Grup adı (GROUP/GENERAL için)
    participant_ids: List[str] = []         # DIRECT için 1, GROUP için birden fazla
    project_id: Optional[str] = None        # PROJECT tipi için
    description: Optional[str] = None
    avatar_url: Optional[str] = None

class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    tenant_id: str
    type: ConversationType
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    participant_ids: List[str] = []
    participants: List[Dict[str, Any]] = []  # {id, name, avatar_url, is_online}
    created_by: str
    created_by_name: Optional[str] = None
    last_message: Optional[Dict[str, Any]] = None
    unread_count: int = 0
    created_at: str
    updated_at: str

# Message Models
class MessageCreate(BaseModel):
    content: str
    type: MessageType = MessageType.TEXT
    reply_to_id: Optional[str] = None       # Alıntı yapılan mesaj ID'si
    mentions: List[str] = []                # @mention edilen kullanıcı ID'leri
    links: List[Dict[str, str]] = []        # [{type, id}] - Paylaşılan linkler
    file_id: Optional[str] = None           # Dosya mesajı için

class MessageUpdate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    content: str
    type: MessageType
    reply_to: Optional[Dict[str, Any]] = None  # Alıntı yapılan mesaj bilgisi
    mentions: List[MentionResponse] = []
    link_previews: List[LinkPreview] = []
    reactions: List[ReactionResponse] = []
    file: Optional[Dict[str, Any]] = None
    is_edited: bool = False
    edited_at: Optional[str] = None
    is_deleted: bool = False
    deleted_at: Optional[str] = None
    created_at: str

# Typing indicator
class TypingIndicator(BaseModel):
    conversation_id: str
    user_id: str
    user_name: str
    is_typing: bool
