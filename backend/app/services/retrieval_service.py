from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.vector_store import vector_store

settings = get_settings()


class RetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def retrieve(self, user_id: str, message: str) -> list[dict]:
        return vector_store.query(
            user_id=user_id,
            query_text=message,
            top_k=settings.retrieval_top_k,
        )
