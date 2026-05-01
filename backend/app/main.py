from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import admin, auth, chat, documents
from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.user import User

settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.debug)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if settings.environment == "production":
    _cors_origins = [settings.frontend_url]
else:
    _cors_origins = [
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    Path(settings.storage_directory).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_directory).mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == settings.initial_admin_email).first()
        if admin_user is None:
            db.add(
                User(
                    email=settings.initial_admin_email,
                    full_name=settings.initial_admin_name,
                    hashed_password=hash_password(settings.initial_admin_password),
                    is_admin=True,
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}
