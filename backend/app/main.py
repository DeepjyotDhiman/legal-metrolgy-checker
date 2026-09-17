from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.api.v1.api import api_router
from app.models.user import User
from app.models.enums import UserRole
from app.services.compliance_service import ComplianceService


def init_db_seeds():
    """Seed initial default admin, officer, and rule definitions if not already present."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Sync legal metrology rules
        ComplianceService.sync_rules_to_db(db)

        # Seed default Admin if configured via environment variable
        if settings.DEFAULT_ADMIN_PASSWORD:
            admin_email = settings.DEFAULT_ADMIN_EMAIL
            admin_user = db.query(User).filter(User.email == admin_email).first()
            if not admin_user:
                admin_user = User(
                    name="System Administrator",
                    email=admin_email,
                    password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
                    role=UserRole.ADMIN,
                    is_active=True,
                )
                db.add(admin_user)

        # Seed default Officer if configured via environment variable
        if settings.DEFAULT_OFFICER_PASSWORD:
            officer_email = settings.DEFAULT_OFFICER_EMAIL
            officer_user = db.query(User).filter(User.email == officer_email).first()
            if not officer_user:
                officer_user = User(
                    name="Legal Metrology Officer",
                    email=officer_email,
                    password_hash=hash_password(settings.DEFAULT_OFFICER_PASSWORD),
                    role=UserRole.OFFICER,
                    is_active=True,
                )
                db.add(officer_user)

        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    init_db_seeds()
    yield
    # Shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router under /api
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root path to interactive Swagger documentation."""
    return RedirectResponse(url="/docs")
