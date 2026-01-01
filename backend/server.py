from fastapi import FastAPI, WebSocket
from starlette.middleware.cors import CORSMiddleware
import logging

from config import CORS_ORIGINS
from database import close_db_connection

# Import all routers
from routes.auth import router as auth_router
from routes.tenant import router as tenant_router
from routes.customers import router as customers_router
from routes.setup import router as setup_router
from routes.users import router as users_router
from routes.projects import router as projects_router
from routes.files import router as files_router
from routes.dashboard import router as dashboard_router
from routes.chat import router as chat_router
from routes.websocket import websocket_endpoint

# Create the main app
app = FastAPI(
    title="CraftForge - Marangoz Proje Yönetimi",
    description="Multi-tenant SaaS for woodworkers and design product manufacturers",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router)
app.include_router(tenant_router)
app.include_router(customers_router)
app.include_router(setup_router)
app.include_router(users_router)
app.include_router(projects_router)
app.include_router(files_router)
app.include_router(dashboard_router)
app.include_router(chat_router)

# WebSocket endpoint
@app.websocket("/api/ws/{token}")
async def ws_endpoint(websocket: WebSocket, token: str):
    await websocket_endpoint(websocket, token)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    await close_db_connection()

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
