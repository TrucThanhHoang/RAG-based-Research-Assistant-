import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.llm import LLMClient, LLMResult
from app.models.chat import ChatMessage, ChatSession
from app.models.document import Document
from app.models.user import User
from app.schemas.chat import TokenSavings
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


def _compute_savings(tokens_used: int, user_id: str, db: Session) -> TokenSavings:
    """Sum pdf_token_count across all indexed docs owned by this user."""
    docs = (
        db.query(Document)
        .filter(Document.owner_user_id == user_id, Document.status == "indexed")
        .all()
    )
    pdf_tokens_full = sum(
        int(d.metadata_json.get("pdf_token_count", 0))
        for d in docs
        if d.metadata_json
    )
    tokens_saved = max(0, pdf_tokens_full - tokens_used)
    savings_pct = round((tokens_saved / pdf_tokens_full * 100), 1) if pdf_tokens_full > 0 else 0.0
    return TokenSavings(
        tokens_used=tokens_used,
        pdf_tokens_full=pdf_tokens_full,
        tokens_saved=tokens_saved,
        savings_pct=savings_pct,
    )


class ChatService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.retrieval_service = RetrievalService(db)

    def ensure_session(self, user: User, session_id: str | None) -> ChatSession:
        if session_id:
            session = self.db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
            if session is not None:
                return session

        session = ChatSession(user_id=user.id, title="New Chat")
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def chat(
        self,
        user: User,
        session_id: str | None,
        message: str,
        model: str | None = None,
    ) -> tuple[ChatSession, str, list[dict], TokenSavings | None]:
        session = self.ensure_session(user, session_id)
        is_first_message = session.title == "New Chat"

        citations = self.retrieval_service.retrieve(user.id, message)

        user_message = ChatMessage(session_id=session.id, role="user", content=message, citations_json=[])
        self.db.add(user_message)

        llm = LLMClient(model)
        savings: TokenSavings | None = None

        if citations:
            try:
                result: LLMResult = llm.generate_answer(message, citations)
                answer = result.answer
                if result.total_tokens > 0:
                    savings = _compute_savings(result.total_tokens, user.id, self.db)
            except Exception as exc:
                logger.exception("LLM call failed for user %s, model %s", user.id, model)
                error_class = type(exc).__name__
                if "AuthenticationError" in error_class or "401" in str(exc):
                    detail = f"{model}: invalid API key. Check your provider configuration."
                elif "RateLimitError" in error_class or "Quota" in str(exc) or "429" in str(exc):
                    detail = f"{model}: API quota exceeded. Try a different model or wait."
                elif "NotFound" in error_class or "404" in str(exc):
                    detail = f"{model}: model not available. Try a different model name."
                else:
                    detail = f"{model}: LLM call failed. Try a different model."
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc
        else:
            answer = "I could not find indexed documents for your account yet. Please upload and index a PDF first."

        if is_first_message:
            session.title = llm.generate_title(message)

        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            citations_json=citations,
        )
        self.db.add(assistant_message)
        self.db.commit()
        self.db.refresh(session)
        return session, answer, citations, savings
