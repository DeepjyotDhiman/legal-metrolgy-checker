import io
import pytest
from PIL import Image as PILImage
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password, create_session_token
from app.main import app
from app.models.user import User
from app.models.enums import UserRole
from app.services.compliance_service import ComplianceService

# Use in-memory SQLite with StaticPool for thread-safe test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables and initial rules in test database."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        ComplianceService.sync_rules_to_db(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    """Yields an isolated database session per test with automatic rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Override FastAPI dependency
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    yield session

    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client(db):
    """FastAPI TestClient with overridden database dependency."""
    return TestClient(app)


@pytest.fixture
def officer_user(db) -> User:
    """Create a test officer user."""
    user = User(
        name="Officer Test",
        email="officer.test@trinetra.gov.in",
        password_hash=hash_password("TestOfficer123!"),
        role=UserRole.OFFICER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db) -> User:
    """Create a test admin user."""
    user = User(
        name="Admin Test",
        email="admin.test@trinetra.gov.in",
        password_hash=hash_password("TestAdmin123!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def officer_client(client, officer_user) -> TestClient:
    """TestClient with an authenticated Officer session cookie."""
    token = create_session_token(subject=officer_user.id, role=officer_user.role.value)
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)
    return client


@pytest.fixture
def admin_client(client, admin_user) -> TestClient:
    """TestClient with an authenticated Admin session cookie."""
    token = create_session_token(subject=admin_user.id, role=admin_user.role.value)
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)
    return client


@pytest.fixture
def sample_image_bytes() -> bytes:
    """Generate a valid 800x600 RGB test image with real packaging label declarations as PNG bytes."""
    from PIL import ImageDraw
    img = PILImage.new("RGB", (800, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), "SHREE KRISHNA PREMIUM BASMATI RICE", fill=(0, 0, 0))
    draw.text((50, 100), "Net Quantity: 5 kg", fill=(0, 0, 0))
    draw.text((50, 150), "MRP Rs. 650.00 (Incl. of all taxes)", fill=(0, 0, 0))
    draw.text((50, 200), "Mfg Date: 03/2026", fill=(0, 0, 0))
    draw.text((50, 250), "Manufactured & Packed by: Agro Foods India Ltd, Industrial Area, Karnal, Haryana 132001", fill=(0, 0, 0))
    draw.text((50, 300), "For Consumer Complaints contact: 1800-111-2222 or care@agrofoods.in", fill=(0, 0, 0))
    draw.text((50, 350), "Country of Origin: India", fill=(0, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()
