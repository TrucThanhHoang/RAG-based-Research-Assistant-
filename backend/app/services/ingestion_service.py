import logging
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session
import fitz
import tiktoken

from app.core.vector_store import vector_store
from app.models.document import Document

logger = logging.getLogger(__name__)

CHUNK_SIZE = 600
CHUNK_OVERLAP = 100
SUPPORTED_EXTENSIONS = {".pdf"}

# cl100k_base works for GPT-4 / Claude / Gemini as a close-enough estimator
_TOKENIZER = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_TOKENIZER.encode(text))


class IngestionService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Extract text from PDF. Raises ValueError if PDF cannot be opened."""
        try:
            document = fitz.open(pdf_path)
        except Exception as e:
            raise ValueError(f"Cannot open PDF file: {str(e)}")

        try:
            pages = []
            for page_num, page in enumerate(document):
                try:
                    text = page.get_text("text").strip()
                    if text:
                        pages.append(text)
                except Exception as e:
                    logger.warning("Failed to extract text from page %d: %s", page_num, e)
                    continue
            return "\n\n".join(pages)
        finally:
            document.close()

    def chunk_pdf_text(self, pdf_path: Path) -> list[str]:
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        return splitter.split_text(text)

    def index_document(self, document: Document) -> Document:
        pdf_path = Path(document.file_path)
        if pdf_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            document.status = "failed"
            document.metadata_json = {**document.metadata_json, "error": "Unsupported file type"}
            self.db.commit()
            return document

        try:
            full_text = self.extract_text_from_pdf(pdf_path)

            if not full_text or len(full_text.strip()) < 50:
                document.status = "failed"
                document.metadata_json = {
                    **document.metadata_json,
                    "error": "No text found in PDF. This may be a scanned document that requires OCR."
                }
                self.db.commit()
                return document

            pdf_token_count = count_tokens(full_text)

            if pdf_token_count > 100000:
                logger.warning("Document %s has %d tokens (very large)", document.id, pdf_token_count)

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=CHUNK_SIZE,
                chunk_overlap=CHUNK_OVERLAP,
            )
            chunks = splitter.split_text(full_text)

            if not chunks:
                document.status = "failed"
                document.metadata_json = {
                    **document.metadata_json,
                    "error": "Failed to split document into chunks"
                }
                self.db.commit()
                return document

            vector_store.upsert(
                document.owner_user_id,
                [
                    {
                        "document_id": document.id,
                        "filename": document.filename,
                        "chunk_index": index,
                        "page": None,
                        "snippet": chunk,
                    }
                    for index, chunk in enumerate(chunks)
                ],
            )
            document.chunk_count = len(chunks)
            document.status = "indexed"
            document.metadata_json = {
                **document.metadata_json,
                "indexed": True,
                "pdf_token_count": pdf_token_count,
            }

        except ValueError as e:
            document.status = "failed"
            document.metadata_json = {**document.metadata_json, "error": str(e)}
        except Exception as exc:
            document.status = "failed"
            document.metadata_json = {**document.metadata_json, "error": f"Indexing failed: {str(exc)}"}

        self.db.commit()
        self.db.refresh(document)
        return document
