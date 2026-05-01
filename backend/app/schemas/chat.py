from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CitationResponse(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    page: int | None = None
    score: float | None = None
    snippet: str


class ChatRequest(BaseModel):
    session_id: str | None = None
    message: str = Field(min_length=1)
    model: str | None = None


class TokenSavings(BaseModel):
    tokens_used: int
    pdf_tokens_full: int
    tokens_saved: int
    savings_pct: float


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: list[CitationResponse] = []
    created_at: datetime


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: list[CitationResponse]
    savings: TokenSavings | None = None


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
