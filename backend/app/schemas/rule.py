from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RuleBase(BaseModel):
    rule_code: str
    name: str
    description: str
    category: str = "PACKAGED_COMMODITIES"
    legal_reference: str
    version: str = "2011.1"
    effective_from: datetime
    effective_to: Optional[datetime] = None
    active: bool = True


class RuleCreate(RuleBase):
    pass


class RuleResponse(RuleBase):
    id: str

    model_config = ConfigDict(from_attributes=True)
