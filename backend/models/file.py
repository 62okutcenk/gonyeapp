from pydantic import BaseModel
from typing import Optional

class TaskCommentCreate(BaseModel):
    message: str

class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    message: str
    created_at: str
