from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.models.enums import ComplianceStatus, SeverityLevel


@dataclass
class RuleContext:
    """Contextual data passed to rules for deterministic evaluation."""
    product_category: str
    extracted_fields: Dict[str, str] = field(default_factory=dict)
    field_confidences: Dict[str, float] = field(default_factory=dict)
    field_bounding_boxes: Dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def get_field(self, name: str, default: str = "") -> str:
        return self.extracted_fields.get(name, default).strip()

    def get_confidence(self, name: str, default: float = 0.0) -> float:
        return self.field_confidences.get(name, default)


@dataclass
class RuleEvaluationResult:
    """Standardized deterministic outcome of a rule execution."""
    rule_code: str
    status: ComplianceStatus
    severity: SeverityLevel
    confidence: float
    explanation: str
    evidence: Dict[str, Any] = field(default_factory=dict)


class BaseRule(ABC):
    """Abstract base class for all Legal Metrology compliance rules."""

    rule_code: str
    name: str
    description: str
    legal_reference: str
    version: str = "2011.1"
    effective_from: datetime = datetime(2011, 4, 1, tzinfo=timezone.utc)
    effective_to: Optional[datetime] = None
    active: bool = True
    default_severity: SeverityLevel = SeverityLevel.HIGH

    @abstractmethod
    def evaluate(self, context: RuleContext) -> RuleEvaluationResult:
        """Deterministically evaluate package declarations against the rule.

        Returns:
            RuleEvaluationResult with PASS, FAIL, REVIEW, or NOT_APPLICABLE.
        """
        raise NotImplementedError
