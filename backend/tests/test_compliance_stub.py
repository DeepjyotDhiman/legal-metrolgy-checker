import io
from app.models.enums import InspectionStatus, ReviewDecision, ComplianceStatus
from app.models.audit_log import AuditLog


def test_complete_inspection_lifecycle(officer_client, sample_image_bytes, db):
    # 1. Create inspection
    create_res = officer_client.post(
        "/api/inspections",
        json={"product_category": "Packaged Staples"},
    )
    assert create_res.status_code == 201
    insp_id = create_res.json()["id"]
    assert create_res.json()["status"] == InspectionStatus.DRAFT.value

    # 2. Upload image
    files = [("files", ("front_label.png", io.BytesIO(sample_image_bytes), "image/png"))]
    upload_res = officer_client.post(
        f"/api/inspections/{insp_id}/images",
        files=files,
        data={"image_type": "LABEL"},
    )
    assert upload_res.status_code == 201
    image_id = upload_res.json()["uploaded_images"][0]["id"]

    # 3. Trigger analyze
    analyze_res = officer_client.post(f"/api/inspections/{insp_id}/analyze")
    assert analyze_res.status_code == 200
    analyzed_data = analyze_res.json()
    assert analyzed_data["status"] == InspectionStatus.REVIEW_REQUIRED.value
    assert analyzed_data["preliminary_result"] == "COMPLIANT"

    # 4. Check OCR results
    ocr_res = officer_client.get(f"/api/inspections/{insp_id}/ocr")
    assert ocr_res.status_code == 200
    ocr_list = ocr_res.json()
    assert len(ocr_list) >= 1
    assert "Basmati Rice" in ocr_list[0]["raw_text"] or "MRP" in ocr_list[0]["raw_text"]

    # 5. Check Extracted Fields
    fields_res = officer_client.get(f"/api/inspections/{insp_id}/fields")
    assert fields_res.status_code == 200
    fields = fields_res.json()
    field_names = [f["field_name"] for f in fields]
    assert "mrp" in field_names
    assert "net_quantity" in field_names
    # Verify bounding box present
    mrp_field = next(f for f in fields if f["field_name"] == "mrp")
    assert mrp_field["bounding_box"] is not None
    assert "x" in mrp_field["bounding_box"]

    # 6. Check Compliance findings
    compliance_res = officer_client.get(f"/api/inspections/{insp_id}/compliance")
    assert compliance_res.status_code == 200
    checks = compliance_res.json()
    assert len(checks) >= 6
    statuses = [c["status"] for c in checks]
    assert ComplianceStatus.PASS.value in statuses

    # 7. Check Rules catalog
    rules_res = officer_client.get("/api/rules")
    assert rules_res.status_code == 200
    assert len(rules_res.json()) >= 6

    single_rule_res = officer_client.get("/api/rules/LMPC-R06-MRP")
    assert single_rule_res.status_code == 200
    assert single_rule_res.json()["rule_code"] == "LMPC-R06-MRP"
    assert "Rule 6(1)(e)" in single_rule_res.json()["legal_reference"]

    # 8. Submit Officer Review (human-in-the-loop override)
    review_payload = {
        "decision": ReviewDecision.COMPLIANT.value,
        "comment": "Label declarations verified by inspecting officer against physical sample. Approved.",
    }
    review_res = officer_client.post(
        f"/api/inspections/{insp_id}/review",
        json=review_payload,
    )
    assert review_res.status_code == 201
    review_data = review_res.json()
    assert review_data["decision"] == ReviewDecision.COMPLIANT.value

    # 9. Verify inspection is now COMPLETED
    updated_insp = officer_client.get(f"/api/inspections/{insp_id}").json()
    assert updated_insp["status"] == InspectionStatus.COMPLETED.value
    assert updated_insp["final_result"] == ReviewDecision.COMPLIANT.value
    assert updated_insp["completed_at"] is not None

    # 10. Fetch Inspection Report
    report_res = officer_client.get(f"/api/inspections/{insp_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["inspection_id"] == insp_id
    assert report_data["data"]["summary"]["is_finalized"] is True

    # 11. Check Dashboard Summary
    dash_res = officer_client.get("/api/dashboard/summary")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_inspections"] >= 1
    assert dash_data["completed_count"] >= 1

    # 12. Verify Audit Logs exist for this inspection
    logs = db.query(AuditLog).filter(AuditLog.inspection_id == insp_id).all()
    actions = [l.action for l in logs]
    assert "INSPECTION_CREATED" in actions
    assert "IMAGES_UPLOADED" in actions
    assert "ANALYSIS_COMPLETED" in actions
    assert "OFFICER_REVIEW_SUBMITTED" in actions
