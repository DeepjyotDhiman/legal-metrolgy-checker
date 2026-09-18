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


import logging

logger = logging.getLogger("uvicorn.error")


def init_db_seeds():
    """Seed initial rule definitions and optional development-only admin if configured."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Sync legal metrology rules
        ComplianceService.sync_rules_to_db(db)

        # Development bootstrap is strictly disabled in production
        if settings.ENVIRONMENT.lower() in ("production", "prod"):
            logger.info("Production environment detected: automated admin bootstrap disabled.")
            return

        # Check if an administrator already exists in the system
        existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if existing_admin:
            logger.info("Admin account already exists (%s). Skipping development bootstrap.", existing_admin.email)
            return

        # Bootstrap development Admin if configured via environment variable
        admin_password = settings.DEV_BOOTSTRAP_ADMIN_PASSWORD or settings.DEFAULT_ADMIN_PASSWORD
        if admin_password:
            admin_email = (
                settings.DEV_BOOTSTRAP_ADMIN_EMAIL
                or settings.DEFAULT_ADMIN_EMAIL
                or "admin@trinetra.gov.in"
            ).lower().strip()

            admin_user = User(
                name="System Administrator (Dev)",
                email=admin_email,
                password_hash=hash_password(admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info("Created development bootstrap admin account: %s", admin_email)
        else:
            logger.warning(
                "No admin account exists in database and DEV_BOOTSTRAP_ADMIN_PASSWORD is not set. "
                "Set DEV_BOOTSTRAP_ADMIN_PASSWORD in .env to bootstrap the initial admin."
            )
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
