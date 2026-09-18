from app.models.enums import UserRole
from app.models.user import User


def test_public_registration_creates_inactive_officer(client, db):
    """Scenario 1, 2, 3: Register new user -> 201, role OFFICER, is_active FALSE, login rejected with 403."""
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
    assert "Your account is pending administrator approval." in login_res.json()["detail"]


def test_registration_cannot_select_admin_role(client, db):
    """Scenario 11: Registration cannot select ADMIN role."""
    payload = {
        "name": "Malicious Applicant",
        "email": "hacker@trinetra.gov.in",
        "password": "SecurePassword123!",
        "role": "ADMIN",  # Attempt to inject ADMIN role
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == UserRole.OFFICER.value
    assert data["is_active"] is False

    user = db.query(User).filter(User.email == "hacker@trinetra.gov.in").first()
    assert user is not None
    assert user.role == UserRole.OFFICER
    assert user.is_active is False


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
    """Scenario 4 & 5: Admin approves user -> is_active TRUE, role OFFICER, approved user can login."""
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
    assert approve_res.json()["role"] == UserRole.OFFICER.value

    # 4. User can now successfully login
    login_res = client.post(
        "/api/auth/login",
        json={"email": "approve.me@trinetra.gov.in", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["email"] == "approve.me@trinetra.gov.in"


def test_non_admin_attempting_approval_returns_403(officer_client, client):
    """Scenario 10: Non-admin attempting approval -> 403."""
    reg_res = client.post(
        "/api/auth/register",
        json={
            "name": "Officer Under Test",
            "email": "unapproved@trinetra.gov.in",
            "password": "SecurePassword123!",
        },
    )
    assert reg_res.status_code == 201
    user_id = reg_res.json()["id"]

    # Officer attempts to approve
    approve_res = officer_client.post(f"/api/users/{user_id}/approve")
    assert approve_res.status_code == 403


def test_officer_cannot_access_user_management(officer_client):
    response = officer_client.get("/api/users")
    assert response.status_code == 403


def test_admin_deactivate_user(admin_client, officer_user):
    """Admin can deactivate an active officer account."""
    res = admin_client.post(f"/api/users/{officer_user.id}/deactivate")
    assert res.status_code == 200
    assert res.json()["is_active"] is False


def test_admin_cannot_deactivate_self(admin_client, admin_user):
    """Admin cannot deactivate their own account."""
    res = admin_client.post(f"/api/users/{admin_user.id}/deactivate")
    assert res.status_code == 400
    assert "cannot deactivate their own account" in res.json()["detail"]
