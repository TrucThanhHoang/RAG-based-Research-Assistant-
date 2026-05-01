from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

from app.config import get_settings

settings = get_settings()


class VectorStore:
    def __init__(self) -> None:
        self.persist_directory = Path(settings.chroma_persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="document_chunks",
            metadata={"hnsw:space": "cosine"},
        )
        self.embedding_model = SentenceTransformer(settings.embedding_model_name)

    def upsert(self, user_id: str, chunks: list[dict[str, Any]]) -> None:
        if not chunks:
            return

        self.delete_by_document(chunks[0]["document_id"])
        batch_size = 64
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            texts = [chunk["snippet"] for chunk in batch]
            embeddings = self.embedding_model.encode(texts, show_progress_bar=False).tolist()
            ids = [f"{user_id}:{chunk['document_id']}:{chunk['chunk_index']}" for chunk in batch]
            metadatas = [
                {
                    "user_id": user_id,
                    "document_id": chunk["document_id"],
                    "filename": chunk["filename"],
                    "chunk_index": chunk["chunk_index"],
                    "page": chunk.get("page") or -1,
                }
                for chunk in batch
            ]
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )

    def query(self, user_id: str, query_text: str, top_k: int) -> list[dict[str, Any]]:
        query_embedding = self.embedding_model.encode([query_text], show_progress_bar=False).tolist()[0]
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where={"user_id": user_id},
        )

        ids = results.get("ids", [[]])
        if not ids or not ids[0]:
            return []

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        citations: list[dict[str, Any]] = []
        for index, metadata in enumerate(metadatas):
            distance = float(distances[index]) if index < len(distances) else None
            score = None if distance is None else max(0.0, 1.0 - distance)
            page = metadata.get("page", -1)
            citations.append(
                {
                    "document_id": metadata["document_id"],
                    "filename": metadata["filename"],
                    "chunk_index": int(metadata["chunk_index"]),
                    "page": None if page == -1 else int(page),
                    "score": score,
                    "snippet": documents[index][:280],
                }
            )
        return citations

    def delete_by_document(self, document_id: str) -> None:
        self.collection.delete(where={"document_id": document_id})


vector_store = VectorStore()
