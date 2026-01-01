from fastapi import WebSocket
from typing import Dict, List
from datetime import datetime, timezone
import uuid
import json
import asyncio
from config import db

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
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_tenant(self, message: dict, tenant_id: str):
        users = await db.users.find({"tenant_id": tenant_id}, {"id": 1, "_id": 0}).to_list(1000)
        for user in users:
            await self.send_personal_message(message, user["id"])

manager = ConnectionManager()

async def create_notification(user_id: str, tenant_id: str, title: str, message: str, 
                             notification_type: str = "info", link: str = None):
    """Create a notification and send it via WebSocket"""
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
    
    # Send via WebSocket
    ws_message = {
        "type": "notification",
        "data": {k: v for k, v in notification.items() if k != "_id"}
    }
    await manager.send_personal_message(ws_message, user_id)
    
    return notification

async def get_project_assigned_users(project_id: str, include_creator: bool = True):
    """Get all users assigned to a project"""
    assignments = await db.project_assignments.find(
        {"project_id": project_id},
        {"_id": 0, "user_id": 1}
    ).to_list(100)
    
    user_ids = [a["user_id"] for a in assignments]
    
    if include_creator:
        project = await db.projects.find_one(
            {"id": project_id},
            {"_id": 0, "created_by": 1}
        )
        if project and project.get("created_by") and project["created_by"] not in user_ids:
            user_ids.append(project["created_by"])
    
    return user_ids

async def notify_project_team(project_id: str, tenant_id: str, title: str, message: str,
                             notification_type: str = "info", link: str = None, exclude_user: str = None):
    """Send notification to all users assigned to a project"""
    user_ids = await get_project_assigned_users(project_id)
    
    for user_id in user_ids:
        if exclude_user and user_id == exclude_user:
            continue
        await create_notification(user_id, tenant_id, title, message, notification_type, link)
