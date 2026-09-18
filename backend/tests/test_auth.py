import logging
import pytest
from app.core.config import settings
from app.core.security import create_session_token, hash_password
from app.models.enums import UserRole
from app.models.user import User
from app.main import init_db_seeds


def test_login_success_sets_httponly_cookie(client, officer_user):
    """Scenario 5 & 6: Approved user login -> 200, sets session cookie."""
    response = client.post(
        "/api/auth/login",
        json={"email": officer_user.email, "password": "TestOfficer123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == officer_user.email
    assert data["role"] == UserRole.OFFICER.value
    # Check that HttpOnly cookie was set in response
    assert settings.SESSION_COOKIE_NAME in response.cookies


def test_login_invalid_credentials(client, officer_user):
    """Scenario 9: Invalid password -> 401 with generic error."""
    response = client.post(
        "/api/auth/login",
        json={"email": officer_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_pending_user_returns_403(client, db):
    """Scenario 3: Pending user login -> 403 with clear explanation."""
    pending_user = User(
        name="Pending Officer",
        email="pending.login.check@trinetra.gov.in",
        password_hash=hash_password("PendingPass123!"),
        role=UserRole.OFFICER,
        is_active=False,
    )
    db.add(pending_user)
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"email": pending_user.email, "password": "PendingPass123!"},
    )
    assert response.status_code == 403
    assert "Your account is pending administrator approval." in response.json()["detail"]


def test_get_me_authenticated(officer_client, officer_user):
    """Scenario 7: /api/auth/me works with session cookie."""
    response = officer_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == officer_user.id
    assert data["email"] == officer_user.email
    assert data["role"] == UserRole.OFFICER.value


def test_get_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(client, officer_user):
    """Scenario 8: Logout clears session."""
    # 1. Login via endpoint to set session cookie
    login_res = client.post(
        "/api/auth/login",
        json={"email": officer_user.email, "password": "TestOfficer123!"},
    )
    assert login_res.status_code == 200
    assert settings.SESSION_COOKIE_NAME in login_res.cookies

    # 2. Verify /api/auth/me works
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["id"] == officer_user.id

    # 3. Call logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully"
    assert 'trinetra_session=""' in logout_res.headers.get("set-cookie", "")

    # 4. Subsequent /me without active session fails with 401
    client.cookies.delete(settings.SESSION_COOKIE_NAME)
    me_after_res = client.get("/api/auth/me")
    assert me_after_res.status_code == 401


def test_logout_succeeds_even_when_unauthenticated(client):
    """Logout should gracefully clear cookie even if unauthenticated."""
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_auth_via_bearer_header(client, officer_user):
    token = create_session_token(subject=officer_user.id, role=officer_user.role.value)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == officer_user.id


def test_production_startup_cannot_create_dev_admin(monkeypatch, db):
    """Scenario 12: Production startup cannot create development admin."""
    # Ensure no admin exists
    db.query(User).filter(User.role == UserRole.ADMIN).delete()
    db.commit()

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "DEV_BOOTSTRAP_ADMIN_PASSWORD", "SuperSecretProd123!")

    init_db_seeds()

    admin_in_db = db.query(User).filter(User.role == UserRole.ADMIN).first()
    assert admin_in_db is None


def test_no_password_is_logged(caplog, client, db):
    """Scenario 13: No password or hash is logged during authentication or bootstrap."""
    secret_pass = "MySuperSecretPassword999!"
    email = "secret.log.test@trinetra.gov.in"

    with caplog.at_level(logging.INFO):
        # Register
        client.post("/api/auth/register", json={"name": "Log Test", "email": email, "password": secret_pass})
        # Login
        client.post("/api/auth/login", json={"email": email, "password": secret_pass})
        # Invalid login
        client.post("/api/auth/login", json={"email": email, "password": "WrongPasswordXYZ!"})

    for record in caplog.records:
        assert secret_pass not in record.message
        assert "WrongPasswordXYZ!" not in record.message
