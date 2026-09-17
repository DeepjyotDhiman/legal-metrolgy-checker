from app.core.config import settings
from app.models.enums import UserRole


def test_login_success_sets_httponly_cookie(client, officer_user):
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
    response = client.post(
        "/api/auth/login",
        json={"email": officer_user.email, "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_get_me_authenticated(officer_client, officer_user):
    response = officer_client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == officer_user.id
    assert data["email"] == officer_user.email
    assert data["role"] == UserRole.OFFICER.value


def test_get_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(officer_client):
    response = officer_client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_auth_via_bearer_header(client, officer_user):
    from app.core.security import create_session_token
    token = create_session_token(subject=officer_user.id, role=officer_user.role.value)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["id"] == officer_user.id

