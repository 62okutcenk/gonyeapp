from pydantic import BaseModel
from typing import Optional

class TaskCommentCreate(BaseModel):
    content: str

class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    user_name: str
    user_color: str
    content: str
    created_at: str
