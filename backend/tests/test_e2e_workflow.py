from app.models.enums import UserRole, ReviewDecision
from app.models.audit_log import AuditLog


def test_complete_e2e_lifecycle(client, admin_client, db, sample_image_bytes):
    # A. Registration
    reg_payload = {
        "name": "Inspector Ramesh Varma",
        "email": "ramesh.varma@trinetra.gov.in",
        "password": "OfficerSecurePass2026!",
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    officer_data = reg_res.json()
    assert officer_data["role"] == UserRole.OFFICER.value
    assert officer_data["is_active"] is False
    officer_id = officer_data["id"]

    # Inactive officer cannot log in yet
    login_attempt = client.post(
        "/api/auth/login",
        json={"email": reg_payload["email"], "password": reg_payload["password"]},
    )
    assert login_attempt.status_code == 403

    # B. Admin Approval
    pending_res = admin_client.get("/api/users/pending")
    assert pending_res.status_code == 200
    pending_ids = [u["id"] for u in pending_res.json()]
    assert officer_id in pending_ids

    approve_res = admin_client.post(f"/api/users/{officer_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["is_active"] is True

    # C. Officer Login
    officer_session = client
    login_res = officer_session.post(
        "/api/auth/login",
        json={"email": reg_payload["email"], "password": reg_payload["password"]},
    )
    assert login_res.status_code == 200

    # D. Create Inspection
    create_res = officer_session.post(
        "/api/inspections",
        json={"product_category": "Food Product"},
    )
    assert create_res.status_code == 201
    inspection = create_res.json()
    inspection_id = inspection["id"]
    assert inspection["status"] == "DRAFT"

    # E. Upload Evidence Image
    upload_res = officer_session.post(
        f"/api/inspections/{inspection_id}/images",
        files=[("files", ("label.png", sample_image_bytes, "image/png"))],
    )
    assert upload_res.status_code == 201
    assert len(upload_res.json()["uploaded_images"]) == 1

    # F. Run Analysis (OCR & Rules)
    analyze_res = officer_session.post(f"/api/inspections/{inspection_id}/analyze")
    assert analyze_res.status_code == 200
    analyzed_data = analyze_res.json()
    assert analyzed_data["status"] == "REVIEW_REQUIRED"
    assert len(analyzed_data["compliance_checks"]) > 0

    # G. Officer Review
    review_res = officer_session.post(
        f"/api/inspections/{inspection_id}/review",
        json={
            "decision": ReviewDecision.COMPLIANT.value,
            "comment": "Physical package matches mandatory metric markings and tax inclusive price declarations.",
        },
    )
    assert review_res.status_code == 201
    assert review_res.json()["decision"] == "COMPLIANT"

    # H. Reports
    report_res = officer_session.get(f"/api/inspections/{inspection_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["inspection_id"] == inspection_id
    assert report_data["data"]["final_result"] == "COMPLIANT"

    list_reports_res = officer_session.get("/api/reports")
    assert list_reports_res.status_code == 200
    report_ids = [r["inspection_id"] for r in list_reports_res.json()]
    assert inspection_id in report_ids

    # I. Audit Trail
    audit_entries = db.query(AuditLog).filter(AuditLog.inspection_id == inspection_id).all()
    actions = [entry.action for entry in audit_entries]
    assert "INSPECTION_CREATED" in actions
    assert "IMAGES_UPLOADED" in actions
    assert "ANALYSIS_COMPLETED" in actions
    assert "OFFICER_REVIEW_SUBMITTED" in actions
