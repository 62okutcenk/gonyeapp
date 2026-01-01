from fastapi import WebSocket, WebSocketDisconnect
import jwt
import logging

from config import JWT_SECRET, JWT_ALGORITHM
from services.websocket_manager import manager

logger = logging.getLogger(__name__)

async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time notifications and chat"""
    try:
        # Token validation
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload["user_id"]
        except jwt.ExpiredSignatureError:
            logger.warning("WS Token Expired")
            await websocket.close(code=4001, reason="Token expired")
            return
        except jwt.InvalidTokenError:
            logger.warning("WS Token Invalid")
            await websocket.close(code=4001, reason="Invalid token")
            return
        except Exception as e:
            logger.error(f"WS Token Error: {e}")
            await websocket.close(code=4000, reason="Auth error")
            return
        
        # Accept connection
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Heartbeat: Wait for messages from client
                data = await websocket.receive_text()
                
                # If client sends "ping", respond with "pong"
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
