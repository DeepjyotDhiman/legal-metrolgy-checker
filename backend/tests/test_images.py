import io
from app.models.enums import InspectionStatus


def test_upload_image_success(officer_client, sample_image_bytes):
    # Create an inspection
    create_res = officer_client.post(
        "/api/inspections",
        json={"product_category": "Snack Food"},
    )
    insp_id = create_res.json()["id"]

    # Upload valid image
    files = [
        ("files", ("front_label.png", io.BytesIO(sample_image_bytes), "image/png"))
    ]
    response = officer_client.post(
        f"/api/inspections/{insp_id}/images",
        files=files,
        data={"image_type": "LABEL"},
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["uploaded_images"]) == 1
    assert data["uploaded_images"][0]["inspection_id"] == insp_id
    assert data["uploaded_images"][0]["quality_score"] is not None

    # Check inspection status transitioned to UPLOADED
    insp_detail = officer_client.get(f"/api/inspections/{insp_id}").json()
    assert insp_detail["status"] == InspectionStatus.UPLOADED.value


def test_upload_image_invalid_extension(officer_client):
    create_res = officer_client.post(
        "/api/inspections",
        json={"product_category": "Snack Food"},
    )
    insp_id = create_res.json()["id"]

    files = [
        ("files", ("malicious.exe", io.BytesIO(b"fake executable payload"), "application/x-msdownload"))
    ]
    response = officer_client.post(
        f"/api/inspections/{insp_id}/images",
        files=files,
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_upload_corrupted_image_rejected(officer_client):
    create_res = officer_client.post(
        "/api/inspections",
        json={"product_category": "Snack Food"},
    )
    insp_id = create_res.json()["id"]

    files = [
        ("files", ("corrupted.png", io.BytesIO(b"not an image at all"), "image/png"))
    ]
    response = officer_client.post(
        f"/api/inspections/{insp_id}/images",
        files=files,
    )
    assert response.status_code == 400
    assert "not a valid or readable image" in response.json()["detail"]
