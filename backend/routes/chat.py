from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import re
from pathlib import Path

from database import db
from config import ROOT_DIR
from models.chat import (
    ConversationType, MessageType,
    ConversationCreate, ConversationUpdate, ConversationResponse,
    MessageCreate, MessageUpdate, MessageResponse,
    ReactionCreate, ReactionResponse, MentionResponse, LinkPreview
)
from middleware.auth import get_current_user, check_permission
from services.notification_service import create_notification
from services.websocket_manager import manager
from utils.constants import MESSAGE_EDIT_TIME_LIMIT, AVAILABLE_REACTIONS

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# ==================== HELPER FUNCTIONS ====================

async def get_conversation_response(conversation: dict, user_id: str) -> dict:
    """Enrich conversation with participants and last message"""
    participants = []
    for pid in conversation.get("participant_ids", []):
        p = await db.users.find_one({"id": pid}, {"_id": 0, "id": 1, "full_name": 1, "avatar_url": 1})
        if p:
            participants.append({
                "id": p["id"],
                "name": p["full_name"],
                "avatar_url": p.get("avatar_url"),
                "is_online": manager.is_user_online(p["id"])
            })
    
    # Get last message
    last_message = await db.messages.find_one(
        {"conversation_id": conversation["id"], "is_deleted": {"$ne": True}},
        {"_id": 0}
    , sort=[("created_at", -1)])
    
    # Get unread count
    last_read = await db.conversation_reads.find_one(
        {"conversation_id": conversation["id"], "user_id": user_id},
        {"_id": 0, "last_read_at": 1}
    )
    last_read_at = last_read.get("last_read_at") if last_read else None
    
    unread_count = 0
    if last_read_at:
        unread_count = await db.messages.count_documents({
            "conversation_id": conversation["id"],
            "created_at": {"$gt": last_read_at},
            "sender_id": {"$ne": user_id},
            "is_deleted": {"$ne": True}
        })
    else:
        unread_count = await db.messages.count_documents({
            "conversation_id": conversation["id"],
            "sender_id": {"$ne": user_id},
            "is_deleted": {"$ne": True}
        })
    
    # Get project name if project type
    project_name = None
    if conversation.get("type") == "project" and conversation.get("project_id"):
        project = await db.projects.find_one({"id": conversation["project_id"]}, {"name": 1, "_id": 0})
        project_name = project.get("name") if project else None
    
    # Get creator name
    creator_name = None
    if conversation.get("created_by"):
        creator = await db.users.find_one({"id": conversation["created_by"]}, {"full_name": 1, "_id": 0})
        creator_name = creator.get("full_name") if creator else None
    
    return {
        **{k: v for k, v in conversation.items() if k != "_id"},
        "participants": participants,
        "project_name": project_name,
        "created_by_name": creator_name,
        "last_message": {k: v for k, v in last_message.items() if k != "_id"} if last_message else None,
        "unread_count": unread_count
    }

async def get_message_response(message: dict) -> dict:
    """Enrich message with sender info, reactions, mentions, link previews"""
    sender = await db.users.find_one({"id": message["sender_id"]}, {"_id": 0, "full_name": 1, "avatar_url": 1})
    
    # Get reply_to message if exists
    reply_to = None
    if message.get("reply_to_id"):
        reply_msg = await db.messages.find_one({"id": message["reply_to_id"]}, {"_id": 0})
        if reply_msg:
            reply_sender = await db.users.find_one({"id": reply_msg["sender_id"]}, {"full_name": 1, "_id": 0})
            reply_to = {
                "id": reply_msg["id"],
                "content": reply_msg.get("content", "")[:100],
                "sender_name": reply_sender.get("full_name") if reply_sender else "Bilinmiyor",
                "is_deleted": reply_msg.get("is_deleted", False)
            }
    
    # Get mentions
    mentions = []
    for mention_id in message.get("mentions", []):
        mention_user = await db.users.find_one({"id": mention_id}, {"_id": 0, "id": 1, "full_name": 1, "avatar_url": 1})
        if mention_user:
            mentions.append(MentionResponse(
                id=mention_user["id"],
                user_id=mention_user["id"],
                user_name=mention_user["full_name"],
                user_avatar=mention_user.get("avatar_url")
            ))
    
    # Get link previews
    link_previews = []
    for link in message.get("links", []):
        preview = await get_link_preview(link.get("type"), link.get("id"))
        if preview:
            link_previews.append(preview)
    
    # Get reactions
    reactions = message.get("reactions", [])
    
    # Get file info if file message
    file_info = None
    if message.get("file_id"):
        file_doc = await db.files.find_one({"id": message["file_id"]}, {"_id": 0})
        if file_doc:
            file_info = {
                "id": file_doc["id"],
                "name": file_doc.get("original_name"),
                "size": file_doc.get("size"),
                "type": file_doc.get("content_type"),
                "url": f"/api/files/{file_doc['id']}"
            }
    
    return {
        **{k: v for k, v in message.items() if k != "_id"},
        "sender_name": sender.get("full_name") if sender else "Bilinmiyor",
        "sender_avatar": sender.get("avatar_url") if sender else None,
        "reply_to": reply_to,
        "mentions": [m.model_dump() for m in mentions],
        "link_previews": link_previews,
        "reactions": reactions,
        "file": file_info
    }

async def get_link_preview(link_type: str, link_id: str) -> Optional[dict]:
    """Get preview for shared links (projects, customers, tasks, users, files)"""
    if not link_type or not link_id:
        return None
    
    if link_type == "project":
        project = await db.projects.find_one({"id": link_id}, {"_id": 0, "id": 1, "name": 1, "customer_name": 1, "status": 1})
        if project:
            return LinkPreview(
                type="project",
                id=project["id"],
                title=project["name"],
                subtitle=f"Müşteri: {project.get('customer_name', '-')}",
                url=f"/projects/{project['id']}"
            ).model_dump()
    
    elif link_type == "customer":
        customer = await db.customers.find_one({"id": link_id}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "type": 1})
        if customer:
            return LinkPreview(
                type="customer",
                id=customer["id"],
                title=customer["name"],
                subtitle=customer.get("phone", "-"),
                url=f"/customers/{customer['id']}"
            ).model_dump()
    
    elif link_type == "task":
        task = await db.project_tasks.find_one({"id": link_id}, {"_id": 0})
        if task:
            return LinkPreview(
                type="task",
                id=task["id"],
                title=f"{task.get('work_item_name', '')} - {task.get('subtask_name', '')}",
                subtitle=f"Durum: {task.get('status', '-')}",
                url=f"/projects/{task['project_id']}"
            ).model_dump()
    
    elif link_type == "user":
        user = await db.users.find_one({"id": link_id}, {"_id": 0, "id": 1, "full_name": 1, "email": 1})
        if user:
            return LinkPreview(
                type="user",
                id=user["id"],
                title=user["full_name"],
                subtitle=user.get("email", "-"),
                url=f"/users"
            ).model_dump()
    
    elif link_type == "file":
        file_doc = await db.files.find_one({"id": link_id}, {"_id": 0})
        if file_doc:
            return LinkPreview(
                type="file",
                id=file_doc["id"],
                title=file_doc.get("original_name", "Dosya"),
                subtitle=f"Boyut: {file_doc.get('size', 0) // 1024} KB",
                url=f"/api/files/{file_doc['id']}"
            ).model_dump()
    
    return None

def parse_mentions(content: str) -> List[str]:
    """Parse @mentions from message content"""
    # Pattern: @[user_id]
    pattern = r'@\[([a-f0-9-]+)\]'
    return re.findall(pattern, content)

def parse_links(content: str) -> List[dict]:
    """Parse [[type:id]] links from message content"""
    # Pattern: [[type:id]]
    pattern = r'\[\[([a-z]+):([a-f0-9-]+)\]\]'
    matches = re.findall(pattern, content)
    return [{"type": m[0], "id": m[1]} for m in matches]

# ==================== CONVERSATIONS ====================

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    # Find conversations where user is participant
    conversations = await db.conversations.find({
        "tenant_id": user["tenant_id"],
        "$or": [
            {"participant_ids": user["id"]},
            {"type": "general"}  # General chat is visible to all
        ]
    }, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        enriched = await get_conversation_response(conv, user["id"])
        result.append(enriched)
    
    return result

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(data: ConversationCreate, user: dict = Depends(get_current_user)):
    """Create a new conversation (direct, group, or project)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # For direct chat, check if conversation already exists
    if data.type == ConversationType.DIRECT:
        if len(data.participant_ids) != 1:
            raise HTTPException(status_code=400, detail="Direkt sohbet için sadece 1 katılımcı belirtilmelidir")
        
        other_user_id = data.participant_ids[0]
        
        # Check if DM already exists
        existing = await db.conversations.find_one({
            "tenant_id": user["tenant_id"],
            "type": "direct",
            "participant_ids": {"$all": [user["id"], other_user_id], "$size": 2}
        })
        
        if existing:
            return await get_conversation_response(existing, user["id"])
        
        participant_ids = [user["id"], other_user_id]
        
    elif data.type == ConversationType.GROUP:
        check_permission(user, "chat.create_group")
        participant_ids = list(set([user["id"]] + data.participant_ids))
        
    elif data.type == ConversationType.PROJECT:
        # Project conversations are auto-created when project is created
        raise HTTPException(status_code=400, detail="Proje sohbetleri otomatik oluşturulur")
    
    elif data.type == ConversationType.GENERAL:
        raise HTTPException(status_code=400, detail="Genel sohbet zaten mevcut")
    
    conversation = {
        "id": str(uuid.uuid4()),
        "tenant_id": user["tenant_id"],
        "type": data.type.value,
        "name": data.name,
        "description": data.description,
        "avatar_url": data.avatar_url,
        "project_id": data.project_id,
        "participant_ids": participant_ids,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.conversations.insert_one(conversation)
    
    # Notify other participants
    for pid in participant_ids:
        if pid != user["id"]:
            await create_notification(
                pid, user["tenant_id"],
                "💬 Yeni Sohbet",
                f"{user['full_name']} sizi bir sohbete ekledi.",
                "info",
                f"/chat/{conversation['id']}"
            )
    
    return await get_conversation_response(conversation, user["id"])

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    """Get single conversation details"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "$or": [
            {"participant_ids": user["id"]},
            {"type": "general"}
        ]
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
    
    return await get_conversation_response(conversation, user["id"])

@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(conversation_id: str, data: ConversationUpdate, user: dict = Depends(get_current_user)):
    """Update conversation (name, description, avatar)"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "type": {"$in": ["group", "project"]}  # Only group/project can be updated
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
    
    # Only creator or admin can update
    if conversation.get("created_by") != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Bu sohbeti düzenleme yetkiniz yok")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": update_data}
    )
    
    updated = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    return await get_conversation_response(updated, user["id"])

@router.post("/conversations/{conversation_id}/participants")
async def add_participant(conversation_id: str, user_id: str, user: dict = Depends(get_current_user)):
    """Add participant to group conversation"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "type": "group"
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Grup sohbeti bulunamadı")
    
    # Check if user exists
    target_user = await db.users.find_one({"id": user_id, "tenant_id": user["tenant_id"]}, {"full_name": 1, "_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if user_id in conversation.get("participant_ids", []):
        raise HTTPException(status_code=400, detail="Kullanıcı zaten sohbette")
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$push": {"participant_ids": user_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Add system message
    system_msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "tenant_id": user["tenant_id"],
        "sender_id": user["id"],
        "content": f"{target_user['full_name']} sohbete eklendi.",
        "type": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(system_msg)
    
    # Notify added user
    await create_notification(
        user_id, user["tenant_id"],
        "💬 Gruba Eklendiniz",
        f"{user['full_name']} sizi '{conversation.get('name', 'Grup')}' sohbetine ekledi.",
        "info",
        f"/chat/{conversation_id}"
    )
    
    # Broadcast to conversation
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "participant_added",
        "conversation_id": conversation_id,
        "user_id": user_id,
        "user_name": target_user["full_name"]
    })
    
    return {"message": "Katılımcı eklendi"}

@router.delete("/conversations/{conversation_id}/participants/{target_user_id}")
async def remove_participant(conversation_id: str, target_user_id: str, user: dict = Depends(get_current_user)):
    """Remove participant from group conversation"""
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "type": "group"
    }, {"_id": 0})
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Grup sohbeti bulunamadı")
    
    # Only creator, admin, or self can remove
    if conversation.get("created_by") != user["id"] and not user.get("is_admin") and target_user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Katılımcı çıkarma yetkiniz yok")
    
    target_user = await db.users.find_one({"id": target_user_id}, {"full_name": 1, "_id": 0})
    
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$pull": {"participant_ids": target_user_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Add system message
    action = "ayrıldı" if target_user_id == user["id"] else "çıkarıldı"
    system_msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "tenant_id": user["tenant_id"],
        "sender_id": user["id"],
        "content": f"{target_user['full_name'] if target_user else 'Kullanıcı'} sohbetten {action}.",
        "type": "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(system_msg)
    
    return {"message": "Katılımcı çıkarıldı"}

# ==================== MESSAGES ====================

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str, 
    limit: int = 50, 
    before: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get messages for a conversation with pagination"""
    # Verify access
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "$or": [
            {"participant_ids": user["id"]},
            {"type": "general"}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
    
    query = {"conversation_id": conversation_id}
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    result = []
    for msg in messages:
        enriched = await get_message_response(msg)
        result.append(enriched)
    
    # Update last read
    await db.conversation_reads.update_one(
        {"conversation_id": conversation_id, "user_id": user["id"]},
        {"$set": {"last_read_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return result

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def send_message(conversation_id: str, data: MessageCreate, user: dict = Depends(get_current_user)):
    """Send a new message"""
    # Verify access
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "$or": [
            {"participant_ids": user["id"]},
            {"type": "general"}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Parse mentions and links from content
    parsed_mentions = parse_mentions(data.content)
    parsed_links = parse_links(data.content)
    
    # Combine with explicitly provided
    all_mentions = list(set(data.mentions + parsed_mentions))
    all_links = data.links + parsed_links
    
    message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "tenant_id": user["tenant_id"],
        "sender_id": user["id"],
        "content": data.content,
        "type": data.type.value,
        "reply_to_id": data.reply_to_id,
        "mentions": all_mentions,
        "links": all_links,
        "file_id": data.file_id,
        "reactions": [],
        "is_edited": False,
        "edited_at": None,
        "is_deleted": False,
        "deleted_at": None,
        "created_at": now
    }
    
    await db.messages.insert_one(message)
    
    # Update conversation
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"updated_at": now}}
    )
    
    # Get enriched response
    enriched = await get_message_response(message)
    
    # Broadcast to conversation participants
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "new_message",
        "conversation_id": conversation_id,
        "message": enriched
    }, exclude_user=user["id"])
    
    # Send notifications to mentioned users and offline participants
    participant_ids = conversation.get("participant_ids", [])
    if conversation.get("type") == "general":
        # For general chat, get all tenant users
        all_users = await db.users.find({"tenant_id": user["tenant_id"]}, {"id": 1, "_id": 0}).to_list(1000)
        participant_ids = [u["id"] for u in all_users]
    
    # Notify mentioned users
    for mention_id in all_mentions:
        if mention_id != user["id"]:
            await create_notification(
                mention_id, user["tenant_id"],
                "📢 Sohbette Bahsedildiniz",
                f"{user['full_name']} sizi bir sohbette etiketledi.",
                "info",
                f"/chat/{conversation_id}"
            )
    
    # Notify offline participants (not mentioned)
    for pid in participant_ids:
        if pid != user["id"] and pid not in all_mentions and not manager.is_user_online(pid):
            await create_notification(
                pid, user["tenant_id"],
                "💬 Yeni Mesaj",
                f"{user['full_name']}: {data.content[:50]}...",
                "info",
                f"/chat/{conversation_id}"
            )
    
    return enriched

@router.put("/messages/{message_id}", response_model=MessageResponse)
async def edit_message(message_id: str, data: MessageUpdate, user: dict = Depends(get_current_user)):
    """Edit a message (within 5 minutes)"""
    message = await db.messages.find_one({
        "id": message_id,
        "sender_id": user["id"],
        "tenant_id": user["tenant_id"]
    }, {"_id": 0})
    
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    if message.get("is_deleted"):
        raise HTTPException(status_code=400, detail="Silinmiş mesaj düzenlenemez")
    
    # Check time limit
    created_at = datetime.fromisoformat(message["created_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if (now - created_at).total_seconds() > MESSAGE_EDIT_TIME_LIMIT:
        raise HTTPException(status_code=400, detail="Mesaj düzenleme süresi doldu (5 dakika)")
    
    # Parse new mentions and links
    parsed_mentions = parse_mentions(data.content)
    parsed_links = parse_links(data.content)
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {
            "content": data.content,
            "mentions": parsed_mentions,
            "links": parsed_links,
            "is_edited": True,
            "edited_at": now.isoformat()
        }}
    )
    
    updated = await db.messages.find_one({"id": message_id}, {"_id": 0})
    enriched = await get_message_response(updated)
    
    # Broadcast update
    await manager.broadcast_to_conversation(message["conversation_id"], {
        "type": "message_edited",
        "conversation_id": message["conversation_id"],
        "message": enriched
    })
    
    return enriched

@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user: dict = Depends(get_current_user)):
    """Delete a message (within 5 minutes, shows 'Bu mesaj silindi')"""
    message = await db.messages.find_one({
        "id": message_id,
        "sender_id": user["id"],
        "tenant_id": user["tenant_id"]
    }, {"_id": 0})
    
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    if message.get("is_deleted"):
        raise HTTPException(status_code=400, detail="Mesaj zaten silinmiş")
    
    # Check time limit
    created_at = datetime.fromisoformat(message["created_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if (now - created_at).total_seconds() > MESSAGE_EDIT_TIME_LIMIT:
        raise HTTPException(status_code=400, detail="Mesaj silme süresi doldu (5 dakika)")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": now.isoformat(),
            "content": "Bu mesaj silindi."
        }}
    )
    
    # Broadcast deletion
    await manager.broadcast_to_conversation(message["conversation_id"], {
        "type": "message_deleted",
        "conversation_id": message["conversation_id"],
        "message_id": message_id
    })
    
    return {"message": "Mesaj silindi"}

# ==================== REACTIONS ====================

@router.post("/messages/{message_id}/reactions")
async def add_reaction(message_id: str, data: ReactionCreate, user: dict = Depends(get_current_user)):
    """Add reaction to a message"""
    if data.emoji not in AVAILABLE_REACTIONS:
        raise HTTPException(status_code=400, detail=f"Geçersiz emoji. Kullanılabilir: {AVAILABLE_REACTIONS}")
    
    message = await db.messages.find_one({"id": message_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    # Check if user already reacted with this emoji
    reactions = message.get("reactions", [])
    existing = next((r for r in reactions if r["user_id"] == user["id"] and r["emoji"] == data.emoji), None)
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu tepkiyi zaten eklediniz")
    
    new_reaction = {
        "emoji": data.emoji,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.update_one(
        {"id": message_id},
        {"$push": {"reactions": new_reaction}}
    )
    
    # Broadcast reaction
    await manager.broadcast_to_conversation(message["conversation_id"], {
        "type": "reaction_added",
        "conversation_id": message["conversation_id"],
        "message_id": message_id,
        "reaction": new_reaction
    })
    
    return new_reaction

@router.delete("/messages/{message_id}/reactions/{emoji}")
async def remove_reaction(message_id: str, emoji: str, user: dict = Depends(get_current_user)):
    """Remove reaction from a message"""
    message = await db.messages.find_one({"id": message_id, "tenant_id": user["tenant_id"]}, {"_id": 0})
    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    
    await db.messages.update_one(
        {"id": message_id},
        {"$pull": {"reactions": {"user_id": user["id"], "emoji": emoji}}}
    )
    
    # Broadcast removal
    await manager.broadcast_to_conversation(message["conversation_id"], {
        "type": "reaction_removed",
        "conversation_id": message["conversation_id"],
        "message_id": message_id,
        "emoji": emoji,
        "user_id": user["id"]
    })
    
    return {"message": "Tepki kaldırıldı"}

# ==================== TYPING INDICATOR ====================

@router.post("/conversations/{conversation_id}/typing")
async def send_typing_indicator(conversation_id: str, is_typing: bool = True, user: dict = Depends(get_current_user)):
    """Send typing indicator to conversation"""
    await manager.broadcast_to_conversation(conversation_id, {
        "type": "typing",
        "conversation_id": conversation_id,
        "user_id": user["id"],
        "user_name": user["full_name"],
        "is_typing": is_typing
    }, exclude_user=user["id"])
    
    return {"message": "OK"}

# ==================== FILE UPLOAD FOR CHAT ====================

@router.post("/conversations/{conversation_id}/files")
async def upload_chat_file(
    conversation_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload file for chat message"""
    # Verify access
    conversation = await db.conversations.find_one({
        "id": conversation_id,
        "tenant_id": user["tenant_id"],
        "$or": [
            {"participant_ids": user["id"]},
            {"type": "general"}
        ]
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Sohbet bulunamadı")
    
    upload_dir = ROOT_DIR / "uploads" / user["tenant_id"] / "chat"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = Path(file.filename).suffix
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Determine if image
    is_image = file.content_type and file.content_type.startswith("image/")
    
    file_doc = {
        "id": file_id,
        "tenant_id": user["tenant_id"],
        "conversation_id": conversation_id,
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
        "type": "image" if is_image else "file",
        "url": f"/api/files/{file_id}"
    }

# ==================== SEARCH ====================

@router.get("/search/users")
async def search_users_for_mention(q: str, user: dict = Depends(get_current_user)):
    """Search users for @mention"""
    if not q or len(q) < 1:
        return []
    
    users = await db.users.find({
        "tenant_id": user["tenant_id"],
        "full_name": {"$regex": q, "$options": "i"}
    }, {"_id": 0, "id": 1, "full_name": 1, "avatar_url": 1}).limit(10).to_list(10)
    
    return users

@router.get("/search/resources")
async def search_resources_for_link(q: str, type: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Search resources for [[link]] (projects, customers, tasks)"""
    if not q or len(q) < 2:
        return {"projects": [], "customers": [], "tasks": []}
    
    results = {"projects": [], "customers": [], "tasks": []}
    
    if not type or type == "project":
        projects = await db.projects.find({
            "tenant_id": user["tenant_id"],
            "name": {"$regex": q, "$options": "i"}
        }, {"_id": 0, "id": 1, "name": 1, "status": 1}).limit(5).to_list(5)
        results["projects"] = projects
    
    if not type or type == "customer":
        customers = await db.customers.find({
            "tenant_id": user["tenant_id"],
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0, "id": 1, "name": 1, "phone": 1}).limit(5).to_list(5)
        results["customers"] = customers
    
    if not type or type == "task":
        tasks = await db.project_tasks.find({
            "tenant_id": user["tenant_id"],
            "$or": [
                {"work_item_name": {"$regex": q, "$options": "i"}},
                {"subtask_name": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0, "id": 1, "work_item_name": 1, "subtask_name": 1, "project_id": 1}).limit(5).to_list(5)
        results["tasks"] = tasks
    
    return results
