from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_admin_user, get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse
from app.services.document_service import DocumentService
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


def _index_document_task(document_id: str):
    """Background task to index document."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            IngestionService(db).index_document(document)
    finally:
        db.close()


@router.get("", response_model=list[DocumentResponse])
def list_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[DocumentResponse]:
    documents = DocumentService(db).list_documents(current_user)
    return [DocumentResponse.model_validate(document) for document in documents]


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    document_service = DocumentService(db)
    document = document_service.save_upload(current_user, file)
    background_tasks.add_task(_index_document_task, document.id)
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> None:
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    DocumentService(db).delete_document(document)


@router.post("/{document_id}/reindex", response_model=DocumentResponse)
def reindex_document(
    document_id: str,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    IngestionService(db).index_document(document)
    db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.get("/{document_id}/file")
def serve_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.owner_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    storage_root = Path(settings.storage_directory).resolve()
    try:
        file_path = Path(document.file_path).resolve(strict=True)
    except (OSError, RuntimeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")

    if not file_path.is_relative_to(storage_root):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return FileResponse(path=str(file_path), media_type="application/pdf", filename=document.filename)
