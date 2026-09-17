from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.inspection import Inspection
from app.models.enums import InspectionStatus
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve aggregate inspection metrics and compliance distribution for officer dashboard."""
    inspections = db.query(Inspection).all()

    total = len(inspections)
    status_counts = Counter(i.status.value for i in inspections)

    compliance_counts = Counter()
    for i in inspections:
        result = i.final_result or i.preliminary_result or "UNPROCESSED"
        compliance_counts[result] += 1

    return DashboardSummaryResponse(
        total_inspections=total,
        draft_count=status_counts.get(InspectionStatus.DRAFT.value, 0),
        pending_review_count=status_counts.get(InspectionStatus.REVIEW_REQUIRED.value, 0),
        compliant_count=compliance_counts.get("COMPLIANT", 0),
        non_compliant_count=compliance_counts.get("NON_COMPLIANT", 0),
        completed_count=status_counts.get(InspectionStatus.COMPLETED.value, 0),
        status_distribution=dict(status_counts),
        compliance_distribution=dict(compliance_counts),
    )
