from pathlib import Path
import hashlib
import logging
import shutil

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.vector_store import vector_store
from app.models.document import Document
from app.models.user import User

settings = get_settings()
logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF-"


class DocumentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.storage_dir = Path(settings.storage_directory)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def list_documents(self, user: User | None = None) -> list[Document]:
        query = self.db.query(Document).order_by(Document.created_at.desc())
        if user is not None and not user.is_admin:
            query = query.filter(Document.owner_user_id == user.id)
        return list(query.all())

    def save_upload(self, owner: User, upload: UploadFile) -> Document:
        if upload.content_type not in {"application/pdf", "application/octet-stream"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF uploads are supported")

        owner_dir = self.storage_dir / owner.id
        owner_dir.mkdir(parents=True, exist_ok=True)
        temp_path = owner_dir / f"temp_{upload.filename}"

        hasher = hashlib.sha256()
        file_size = 0
        magic_checked = False

        try:
            with temp_path.open("wb") as f:
                while chunk := upload.file.read(8192):
                    if not magic_checked:
                        if not chunk.startswith(PDF_MAGIC):
                            f.close()
                            temp_path.unlink(missing_ok=True)
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="File is not a valid PDF",
                            )
                        magic_checked = True
                    file_size += len(chunk)
                    hasher.update(chunk)
                    f.write(chunk)

            if file_size == 0:
                temp_path.unlink(missing_ok=True)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

            size_mb = file_size / (1024 * 1024)
            if size_mb > settings.max_upload_size_mb:
                temp_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds upload limit ({settings.max_upload_size_mb}MB)",
                )

            file_hash = hasher.hexdigest()

            duplicate = self.db.query(Document).filter(Document.file_hash == file_hash).first()
            if duplicate is not None:
                temp_path.unlink(missing_ok=True)
                if duplicate.status == "indexed":
                    return duplicate
                elif duplicate.status == "failed":
                    self.delete_document(duplicate)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Document is being processed (status: {duplicate.status}). Please wait.",
                    )

            destination = owner_dir / upload.filename
            temp_path.rename(destination)

            document = Document(
                owner_user_id=owner.id,
                filename=upload.filename,
                file_path=str(destination),
                file_hash=file_hash,
                status="uploaded",
                metadata_json={"content_type": upload.content_type, "size_bytes": file_size},
            )
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
            return document

        except HTTPException:
            raise
        except Exception:
            logger.exception("Upload failed for user %s", owner.id)
            if temp_path.exists():
                temp_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Upload failed",
            )

    def delete_document(self, document: Document) -> None:
        vector_store.delete_by_document(document.id)
        path = Path(document.file_path)
        if path.exists() and path.is_file():
            path.unlink()
        parent = path.parent
        if parent.exists() and not any(parent.iterdir()):
            shutil.rmtree(parent)
        self.db.delete(document)
        self.db.commit()
