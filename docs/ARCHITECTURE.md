# TriNetra Architecture

This document describes the current architecture, component responsibilities, data flow, and extensibility points of the TriNetra Legal Metrology compliance inspection platform.

---

## 1. Architecture Overview

```text
               +----------------------------------+
               |     Legal Metrology Officer      |
               +----------------------------------+
                                |
                                | Browser / HTTPS
                                v
               +----------------------------------+
               |      React Frontend (UI/UX)      |
               |       [Planned / Future]         |
               +----------------------------------+
                                |
                                | REST API / HttpOnly Session Cookie
                                v
+-----------------------------------------------------------------+
|                       FastAPI Backend                           |
|                                                                 |
|   +-------------------+                +--------------------+   |
|   |  CORS Middleware  |                |  OpenAPI / Swagger |   |
|   +-------------------+                +--------------------+   |
|             |                                                   |
|             v                                                   |
|   +---------------------------------------------------------+   |
|   |             Authentication & RBAC Layer                 |   |
|   |     (Argon2id, JWT Cookie Token, OFFICER/ADMIN Guard)   |   |
|   +---------------------------------------------------------+   |
|             |                                                   |
|             v                                                   |
|   +---------------------------------------------------------+   |
|   |                     API Routes Layer                    |   |
|   |   /auth, /inspections, /images, /ocr, /fields,          |   |
|   |   /compliance, /review, /reports, /rules, /dashboard    |   |
|   +---------------------------------------------------------+   |
|             |                                                   |
|             v                                                   |
|   +---------------------------------------------------------+   |
|   |                      Service Layer                      |   |
|   |   +--------------------+     +----------------------+   |   |
|   |   | ImageService       |     | InspectionService    |   |   |
|   |   | (Validation/MIME/  |     | (State machine &     |   |   |
|   |   |  Quality Scoring)  |     |  analysis pipeline)  |   |   |
|   |   +--------------------+     +----------------------+   |   |
|   |             |                           |               |   |
|   |             v                           v               |   |
|   |   +--------------------+     +----------------------+   |   |
|   |   | BaseOCRService     |     | ComplianceService    |   |   |
|   |   | (Mock / PaddleOCR) |     | (DB sync & eval)     |   |   |
|   |   +--------------------+     +----------------------+   |   |
|   |             |                           |               |   |
|   |             |                           v               |   |
|   |             |                +----------------------+   |   |
|   |             |                | RuleRegistry         |   |   |
|   |             |                | (Deterministic Rules)|   |   |
|   |             |                +----------------------+   |   |
|   |             v                           |               |   |
|   |   +-------------------------------------------------+   |   |
|   |   | AuditService (Immutable action logs)            |   |   |
|   |   +-------------------------------------------------+   |   |
|   +---------------------------------------------------------+   |
|                               |                                 |
|                               v                                 |
|   +---------------------------------------------------------+   |
|   |           SQLAlchemy 2.0 ORM & Database Layer           |   |
|   |       SQLite (MVP) / PostgreSQL (Migration Ready)       |   |
|   +---------------------------------------------------------+   |
+-----------------------------------------------------------------+
```

---

## 2. Backend Directory Structure

```text
backend/
├── app/
│   ├── main.py                  # Application initialization, middleware, lifecycle events
│   ├── api/                     # HTTP interface layer
│   │   ├── deps.py              # Authentication dependencies, database session, RBAC guards
│   │   └── v1/
│   │       ├── api.py           # Top-level API router mounting all endpoint groups
│   │       └── endpoints/       # Route handlers grouped by functional domain
│   ├── core/                    # Cross-cutting foundational modules
│   │   ├── config.py            # Pydantic Settings reading environment configuration
│   │   ├── database.py          # SQLAlchemy 2.0 engine, SessionLocal, SQLite FK enforcement
│   │   └── security.py          # Argon2id hashing, token encoding/decoding
│   ├── models/                  # Declarative SQLAlchemy models (10 tables)
│   ├── schemas/                 # Pydantic v2 schemas for request validation & API responses
│   ├── rules/                   # Deterministic Legal Metrology compliance rule engine
│   │   ├── base.py              # BaseRule class, RuleContext, RuleEvaluationResult
│   │   ├── registry.py          # Central RuleRegistry singleton
│   │   └── definitions/         # Statutory rule implementations (MRP, Net Qty, etc.)
│   └── services/                # Business logic and domain coordination
│       ├── base_ocr.py          # OCR abstraction protocol
│       ├── mock_ocr.py          # Deterministic mock OCR with bounding boxes
│       ├── image_service.py     # Image validation, security checks, and quality scoring
│       ├── compliance_service.py# Rule execution orchestrator & rule database syncer
│       ├── inspection_service.py# Inspection lifecycle state machine
│       └── audit_service.py     # Structured audit logging
├── tests/                       # Comprehensive Pytest test suite (24 automated tests)
├── alembic/                     # Alembic database migrations
├── requirements.txt             # Locked Python packages
├── Dockerfile                   # Container definition (Python 3.12-slim)
└── pytest.ini                   # Pytest path and runner settings
```

---

## 3. Frontend Structure

> **Status: Planned / Future**

The frontend client is planned as a separate Single Page Application (SPA) with the following intended architecture:
```text
frontend/ (Planned)
├── src/
│   ├── assets/                  # Logos, icons, static graphics
│   ├── components/              # Reusable UI elements (buttons, modals, bounding-box overlays)
│   │   ├── ui/                  # Base shadcn/ui components
│   │   ├── inspection/          # Image scanner, bounding-box viewer, compliance checklist
│   │   └── layout/              # Header, navigation, sidebar
│   ├── pages/                   # Route views (Dashboard, New Inspection, Review, Rules)
│   ├── services/                # API client (Axios/Fetch with credentials: "include")
│   ├── types/                   # TypeScript interfaces mirroring backend schemas
│   └── App.tsx                  # Router and layout shell
├── package.json
└── vite.config.ts
```

---

## 4. Service Boundaries

To ensure clean architecture and separation of concerns:

- **API Endpoints (`app/api/`):**
  Responsible ONLY for HTTP protocol concerns: extracting headers/cookies, parsing request bodies through Pydantic schemas, calling appropriate services, and returning status codes. **Never write raw SQL queries or compliance logic inside route handlers.**
- **Schemas (`app/schemas/`):**
  Responsible for data validation, serialization, and OpenAPI documentation generation. They define what external clients can send and receive.
- **Models (`app/models/`):**
  Represent the persistent relational data structure. Define columns, foreign keys, constraints, and relationships.
- **Services (`app/services/`):**
  Encapsulate business logic. For example, `ImageService` validates file bytes and computes quality; `InspectionService` coordinates OCR, rule evaluation, and review overrides; `AuditService` ensures sensitive events are recorded.
- **Rules Engine (`app/rules/`):**
  Completely independent of database and web concerns. Takes a plain `RuleContext` dataclass, evaluates statutory requirements using deterministic Python/Regex, and returns a `RuleEvaluationResult`. Can be tested in total isolation from the web server or database.
- **Core (`app/core/`):**
  Low-level configuration, database connection pooling, and cryptographic operations (Argon2id and JWT).

---

## 5. End-to-End Data Flow

```text
Step 1: Inspection Initialization
        Client (Officer) ──> POST /api/inspections ──> Status: DRAFT
                                                              │
Step 2: Image Upload                                          v
        Client ──> POST /api/inspections/{id}/images
                   └── ImageService checks MIME & Size (<15MB)
                   └── Pillow verifies integrity & computes quality score
                   └── Stored as UUID filename in ./data/uploads/{id}/
                   └── Status transitions: DRAFT ──> UPLOADED
                                                              │
Step 3: Automated Analysis                                    v
        Client ──> POST /api/inspections/{id}/analyze
                   └── Status transitions: UPLOADED ──> ANALYZING
                   └── BaseOCRService (Mock / PaddleOCR) extracts:
                       - Raw OCR text & confidence
                       - Isolated declarations (MRP, Net Qty, Mfg Date, etc.)
                       - Bounding boxes ({x, y, w, h})
                   └── Extracted fields saved to database
                   └── RuleContext constructed with extracted data
                   └── RuleRegistry executes all active rules
                   └── ComplianceCheck records created in DB
                   └── Preliminary verdict computed:
                       - Any FAIL ──> NON_COMPLIANT
                       - Any REVIEW ──> REVIEW_REQUIRED
                       - All PASS ──> COMPLIANT
                   └── Status transitions: ANALYZING ──> REVIEW_REQUIRED
                   └── AuditLog entry recorded
                                                              │
Step 4: Human Officer Review & Override                       v
        Client ──> POST /api/inspections/{id}/review
                   └── Officer examines image, bounding boxes & findings
                   └── Enters final decision (COMPLIANT / NON_COMPLIANT) & comment
                   └── Final verdict saved, completed timestamp recorded
                   └── Status transitions: REVIEW_REQUIRED ──> COMPLETED
                   └── Immutable AuditLog recorded
                                                              │
Step 5: Report Generation                                     v
        Client ──> GET /api/inspections/{id}/report
                   └── Assembles complete structured audit report
```

---

## 6. Error Handling

- **Validation Errors:** Handled by FastAPI / Pydantic returning `422 Unprocessable Entity` with details of invalid fields.
- **Authentication Failures:** Return `401 Unauthorized` with `WWW-Authenticate: Bearer` header.
- **Authorization Failures:** Return `403 Forbidden` when user lacks required role (e.g., non-officer attempting inspection creation).
- **Not Found Errors:** Return `404 Not Found` with specific entity identifier.
- **File Upload Errors:** Custom `ImageValidationError` returns `400 Bad Request` for invalid extensions, unsupported MIME types, oversized files, or corrupted image bytes. Corrupted files are removed from disk immediately.

---

## 7. Audit Logging

Sensitive operations write immutable records to the `audit_logs` table via `AuditService.log_event()`:
- `USER_LOGIN`
- `USER_LOGOUT`
- `INSPECTION_CREATED`
- `IMAGES_UPLOADED`
- `ANALYSIS_COMPLETED`
- `OFFICER_REVIEW_SUBMITTED`

Each audit log entry captures:
- `user_id`: Acting user (or NULL for system events).
- `inspection_id`: Associated inspection record.
- `action`: Specific event tag.
- `old_value`: JSON snapshot of state prior to action.
- `new_value`: JSON snapshot of state post-action.
- `timestamp`: UTC timestamp of event.

---

## 8. Extensibility Points

### Adding a New OCR Provider
1. Inherit from `BaseOCRService` in `backend/app/services/base_ocr.py`.
2. Implement `process_images(image_paths: List[Path], source_image_ids: Optional[List[str]]) -> OCRPipelineResult`.
3. Provide the new class to `InspectionService.run_analysis(..., ocr_service=NewOCRService())`.

### Adding a New Legal Metrology Rule
1. Create a rule module in `backend/app/rules/definitions/`.
2. Inherit from `BaseRule` and implement `evaluate(context: RuleContext) -> RuleEvaluationResult`.
3. Add the rule instance to `ALL_RULES` in `backend/app/rules/definitions/__init__.py`.
4. The rule engine automatically registers it and syncs metadata to the database during startup.

### Generating PDF/External Reports
1. Expand `app/api/v1/endpoints/reports.py` or create an `ExportService`.
2. The structured JSON returned by `GET /api/inspections/{id}/report` already contains all evidence, field coordinates, rule results, and officer comments needed for rendering to PDF or printing.
