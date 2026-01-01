from pydantic import BaseModel
from typing import Optional

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: str
