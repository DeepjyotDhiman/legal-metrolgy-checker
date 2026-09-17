from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    inspections,
    images,
    ocr,
    fields,
    compliance,
    reviews,
    reports,
    rules,
    dashboard,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(inspections.router)
api_router.include_router(images.router)
api_router.include_router(ocr.router)
api_router.include_router(fields.router)
api_router.include_router(compliance.router)
api_router.include_router(reviews.router)
api_router.include_router(reports.router)
api_router.include_router(rules.router)
api_router.include_router(dashboard.router)
