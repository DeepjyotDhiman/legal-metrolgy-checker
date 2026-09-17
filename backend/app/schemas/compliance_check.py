from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from app.models.enums import ComplianceStatus, SeverityLevel
from app.schemas.rule import RuleResponse


class ComplianceCheckResponse(BaseModel):
    id: str
    inspection_id: str
    rule_id: str
    status: ComplianceStatus
    severity: SeverityLevel
    explanation: str
    evidence: Optional[Any] = None
    confidence: float
    rule: Optional[RuleResponse] = None

    model_config = ConfigDict(from_attributes=True)
