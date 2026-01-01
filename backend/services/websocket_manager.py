from typing import Dict, List
from fastapi import WebSocket
import logging
from database import db

logger = logging.getLogger(__name__)

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

    async def broadcast_to_conversation(self, conversation_id: str, message: dict, exclude_user: str = None):
        """Send message to all participants of a conversation"""
        conversation = await db.conversations.find_one(
            {"id": conversation_id}, 
            {"participant_ids": 1, "_id": 0}
        )
        if conversation:
            for user_id in conversation.get("participant_ids", []):
                if exclude_user and user_id == exclude_user:
                    continue
                await self.send_to_user(user_id, message)

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

# Singleton instance
manager = ConnectionManager()
