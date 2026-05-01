from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_user_id: str
    filename: str
    file_path: str
    file_hash: str
    status: str
    chunk_count: int
    metadata_json: dict
    created_at: datetime
    updated_at: datetime
