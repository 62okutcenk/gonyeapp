from database import db
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# WebSocket Manager import
from services.websocket_manager import manager

async def create_notification(
    user_id: str, 
    tenant_id: str, 
    title: str, 
    message: str, 
    notification_type: str = "info", 
    link: str = None
):
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

async def get_project_assigned_users(project_id: str, include_creator: bool = True):
    """Get all user IDs assigned to a project"""
    user_ids = set()
    
    if include_creator:
        project = await db.projects.find_one({"id": project_id}, {"created_by": 1, "_id": 0})
        if project and project.get("created_by"):
            user_ids.add(project["created_by"])
    
    assignments = await db.project_assignments.find(
        {"project_id": project_id},
        {"user_id": 1, "_id": 0}
    ).to_list(100)
    
    for a in assignments:
        if a.get("user_id"):
            user_ids.add(a["user_id"])
    
    return list(user_ids)

async def notify_project_team(
    project_id: str, 
    tenant_id: str, 
    title: str, 
    message: str, 
    notification_type: str = "info", 
    link: str = None,
    exclude_user_id: str = None
):
    """Send notification to all users assigned to a project"""
    user_ids = await get_project_assigned_users(project_id)
    
    for user_id in user_ids:
        if exclude_user_id and user_id == exclude_user_id:
            continue
        await create_notification(user_id, tenant_id, title, message, notification_type, link)
