from typing import Dict
from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_inspections: int
    draft_count: int
    pending_review_count: int
    compliant_count: int
    non_compliant_count: int
    completed_count: int
    status_distribution: Dict[str, int]
    compliance_distribution: Dict[str, int]
