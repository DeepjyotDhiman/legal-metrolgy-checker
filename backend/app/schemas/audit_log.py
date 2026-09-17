from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    inspection_id: Optional[str] = None
    action: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
