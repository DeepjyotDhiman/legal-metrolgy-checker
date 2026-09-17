from app.models.enums import InspectionStatus


def test_create_inspection_officer(officer_client):
    response = officer_client.post(
        "/api/inspections",
        json={"product_category": "Packaged Edible Oil"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["product_category"] == "Packaged Edible Oil"
    assert data["status"] == InspectionStatus.DRAFT.value
    assert "id" in data


def test_create_inspection_unauthenticated(client):
    response = client.post(
        "/api/inspections",
        json={"product_category": "Packaged Edible Oil"},
    )
    assert response.status_code == 401


def test_list_inspections(officer_client):
    # Create two inspections
    officer_client.post("/api/inspections", json={"product_category": "Spices"})
    officer_client.post("/api/inspections", json={"product_category": "Beverages"})

    response = officer_client.get("/api/inspections")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_get_inspection_detail(officer_client):
    create_res = officer_client.post(
        "/api/inspections",
        json={"product_category": "Confectionery"},
    )
    insp_id = create_res.json()["id"]

    response = officer_client.get(f"/api/inspections/{insp_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == insp_id
    assert "images" in data
    assert "compliance_checks" in data
