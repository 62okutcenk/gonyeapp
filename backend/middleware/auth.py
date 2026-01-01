from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import JWT_SECRET, JWT_ALGORITHM
from database import db

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
        
        # Get user permissions from role
        user_permissions = []
        if user.get("role_id"):
            role = await db.roles.find_one(
                {"id": user["role_id"], "tenant_id": user["tenant_id"]}, 
                {"permissions": 1, "_id": 0}
            )
            if role and "permissions" in role:
                user_permissions = role["permissions"]
        
        user["permissions_list"] = user_permissions
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

def check_permission(user: dict, permission_key: str):
    if user.get("is_admin", False) is True:
        return True
    
    user_perms = user.get("permissions_list", [])
    
    if permission_key not in user_perms:
        raise HTTPException(
            status_code=403, 
            detail=f"Bu işlem için yetkiniz bulunmamaktadır. Gereken yetki: {permission_key}"
        )
    
    return True
