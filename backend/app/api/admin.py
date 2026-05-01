from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.document import Document
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def stats(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)) -> dict:
    return {
        "admin_user_id": admin_user.id,
        "total_users": db.query(User).count(),
        "total_documents": db.query(Document).count(),
    }
