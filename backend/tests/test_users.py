from app.models.enums import UserRole
from app.models.user import User


def test_public_registration_creates_inactive_officer(client, db):
    payload = {
        "name": "New Registered Officer",
        "email": "pending.officer@trinetra.gov.in",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "pending.officer@trinetra.gov.in"
    assert data["role"] == UserRole.OFFICER.value
    assert data["is_active"] is False

    # Verify user cannot immediately log in while inactive
    login_res = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["password"]},
    )
    assert login_res.status_code == 403
    assert "deactivated" in login_res.json()["detail"].lower()


def test_duplicate_registration_rejected(client, db):
    payload = {
        "name": "First User",
        "email": "duplicate@trinetra.gov.in",
        "password": "SecurePassword123!",
    }
    client.post("/api/auth/register", json=payload)
    dup_res = client.post("/api/auth/register", json=payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]


def test_admin_list_and_approve_user(admin_client, client, db):
    # 1. Register a user
    reg_res = client.post(
        "/api/auth/register",
        json={
            "name": "Approve Me Officer",
            "email": "approve.me@trinetra.gov.in",
            "password": "SecurePassword123!",
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    # 2. Admin retrieves pending users
    pending_res = admin_client.get("/api/users/pending")
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    assert any(u["id"] == user_id for u in pending_list)

    # 3. Admin approves user
    approve_res = admin_client.post(f"/api/users/{user_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["is_active"] is True

    # 4. User can now successfully login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "approve.me@trinetra.gov.in", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["email"] == "approve.me@trinetra.gov.in"


def test_officer_cannot_access_user_management(officer_client):
    response = officer_client.get("/api/users")
    assert response.status_code == 403
