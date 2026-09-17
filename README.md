# TriNetra (त्रिनेत्र) - Legal Metrology Compliance Inspection System

> **Smart India Hackathon 2026**
> **Problem Statement:** "Software System to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules by scanning products, images and labels."

---

## 1. System Overview & Core Principles

TriNetra is an AI-assisted inspection platform built to empower **Legal Metrology Officers** in detecting packaging declaration violations across consumer commodities.

### Core Architectural Principles
- **Officer-Assistance, Not Autonomous Decision-Maker:** AI extracts declarations; human officers retain final legal verdict.
- **Deterministic & Modular Rule Engine:** Compliance rules are written in deterministic Python code with statutory legal references (LMPC Rules, 2011). No LLMs are used for compliance verdicts.
- **Evidence-Linked Findings:** Every PASS/FAIL/REVIEW finding links directly to detected text and image bounding box coordinates.
- **Zero Hardcoded Rules in API Handlers:** Rules are organized in a modular registry pattern for easy extensibility.
- **Security by Design:** Argon2id password hashing, HttpOnly SameSite session cookies, strict file validation (MIME, magic bytes, path-traversal prevention), and immutable audit logs.

---

## 2. Technology Stack

- **Runtime:** Python 3.12+ (tested with Python 3.13)
- **Web Framework:** FastAPI + Pydantic v2
- **ORM & Database:** SQLAlchemy 2.0 + Alembic (SQLite for local MVP, PostgreSQL-compatible types)
- **Security:** Argon2id (`argon2-cffi`), JWT session cookies (`pyjwt`)
- **Computer Vision / OCR:** Pillow, OpenCV (modular `BaseOCRService` interface with deterministic mock pipeline ready for PaddleOCR integration)
- **Testing:** Pytest + TestClient
- **Containerization:** Docker & Docker Compose

---

## 3. Directory Layout

```text
backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint & lifespan seeds
│   ├── api/
│   │   ├── deps.py                 # Session authentication & RBAC guards
│   │   └── v1/
│   │       ├── api.py              # Router aggregator
│   │       └── endpoints/
│   │           ├── health.py       # GET /api/health
│   │           ├── auth.py         # POST /api/auth/login, logout, GET /api/auth/me
│   │           ├── inspections.py  # Inspection CRUD & trigger /analyze
│   │           ├── images.py       # Multi-image upload & secure storage
│   │           ├── ocr.py          # GET raw OCR texts
│   │           ├── fields.py       # GET extracted packaging declarations & bboxes
│   │           ├── compliance.py   # GET preliminary rule findings & evidence
│   │           ├── reviews.py      # POST officer review & verdict override
│   │           ├── reports.py      # GET structured inspection report
│   │           ├── rules.py        # GET statutory rules catalog
│   │           └── dashboard.py    # GET inspection analytics summary
│   ├── core/
│   │   ├── config.py               # Pydantic Settings & environment variables
│   │   ├── database.py             # SQLAlchemy 2.0 Engine & SQLite PRAGMA FK
│   │   └── security.py             # Argon2id password hashing & token signing
│   ├── models/                     # SQLAlchemy 2.0 Declarative Models
│   │   ├── user.py                 # Users (ADMIN, OFFICER)
│   │   ├── inspection.py           # Inspection master record & state transitions
│   │   ├── image.py                # Uploaded packaging images & quality scores
│   │   ├── ocr.py                  # Raw OCR results & confidence
│   │   ├── extracted_field.py      # Declarations (MRP, Net Qty, etc.) with bounding boxes
│   │   ├── rule.py                 # Statutory legal rules catalog
│   │   ├── compliance_check.py     # Rule-by-rule findings
│   │   ├── review.py               # Human officer review decision
│   │   ├── audit_log.py            # Immutable audit trail
│   │   └── report.py               # Inspection summary reports
│   ├── schemas/                    # Pydantic validation & response schemas
│   ├── rules/                      # Deterministic Legal Metrology Rule Engine
│   │   ├── base.py                 # BaseRule, RuleContext, RuleEvaluationResult
│   │   ├── registry.py             # RuleRegistry singleton
│   │   └── definitions/            # Statutory Rule 6(1) Implementations
│   │       ├── mrp_rule.py         # Rule 6(1)(e): MRP with inclusive of all taxes
│   │       ├── net_quantity_rule.py# Rule 6(1)(d): Standard metric units (g, kg, ml)
│   │       ├── manufacturer_rule.py# Rule 6(1)(a): Complete name & address of mfg
│   │       ├── date_of_mfg_rule.py # Rule 6(1)(c): Month & year of manufacture
│   │       ├── consumer_care_rule.py# Rule 6(1)(f): Grievance helpline & email
│   │       └── country_of_origin_rule.py# Rule 6(1)(g): Country of origin
│   └── services/                   # Service layer
│       ├── base_ocr.py             # OCR Service Protocol
│       ├── mock_ocr.py             # Deterministic Mock OCR with bounding boxes
│       ├── image_service.py        # Secure image upload, path traversal guard, Pillow quality check
│       ├── compliance_service.py   # Rule evaluation orchestrator & DB syncer
│       ├── inspection_service.py   # Inspection lifecycle state machine
│       └── audit_service.py        # Structured immutable audit logging
├── tests/                          # 24 Pytest unit & integration tests
├── alembic/                        # Alembic migration scripts
├── requirements.txt
├── Dockerfile
└── pytest.ini
docker-compose.yml
.env.example
README.md
```

---

## 4. Quick Start (Docker Compose)

The fastest way to launch the complete backend with persistent storage:

```bash
docker compose up --build
```

Access:
- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 5. Local Setup (Without Docker)

### Prerequisites
- Python 3.12+ (or Python 3.13)

### Step 1: Create Virtual Environment
```bash
cd backend
py -3.13 -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux / macOS:
source .venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run Database Migrations
```bash
alembic upgrade head
```

### Step 4: Launch Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 6. Pre-Seeded Default Accounts

The database automatically seeds the following credentials on first startup:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Officer** | `officer@trinetra.gov.in` | `Officer@TriNetra2026` | Create inspections, upload labels, trigger analysis, review findings |
| **Admin** | `admin@trinetra.gov.in` | `Admin@TriNetra2026` | Full platform administrative oversight & configuration |

---

## 7. API Contract Summary

All endpoints return standard JSON responses:

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | System & DB health check | Public |
| `POST` | `/api/auth/login` | Login with Argon2id; sets HttpOnly cookie | Public |
| `POST` | `/api/auth/logout` | Clears session cookie | Authenticated |
| `GET` | `/api/auth/me` | Current authenticated user profile | Authenticated |
| `POST` | `/api/inspections` | Create inspection (`DRAFT`) | Officer / Admin |
| `GET` | `/api/inspections` | List inspections (with status filter) | Officer / Admin |
| `GET` | `/api/inspections/{id}` | Detailed inspection view | Officer / Admin |
| `POST` | `/api/inspections/{id}/images` | Upload label images (safe storage) | Officer / Admin |
| `POST` | `/api/inspections/{id}/analyze` | Trigger OCR & deterministic rule engine | Officer / Admin |
| `GET` | `/api/inspections/{id}/ocr` | Get raw OCR texts & language | Officer / Admin |
| `GET` | `/api/inspections/{id}/fields` | Get extracted declarations & bounding boxes | Officer / Admin |
| `GET` | `/api/inspections/{id}/compliance` | Get rule-by-rule findings with evidence | Officer / Admin |
| `POST` | `/api/inspections/{id}/review` | Human officer review / override decision | Officer / Admin |
| `GET` | `/api/inspections/{id}/report` | Full structured inspection report | Officer / Admin |
| `GET` | `/api/rules` | Catalog of Legal Metrology rules | Officer / Admin |
| `GET` | `/api/rules/{rule_code}` | Specific rule metadata & legal reference | Officer / Admin |
| `GET` | `/api/dashboard/summary` | Aggregate inspection metrics & chart data | Officer / Admin |

---

## 8. Inspection Lifecycle Flow

```text
1. POST /api/inspections
   └── Status: DRAFT

2. POST /api/inspections/{id}/images
   ├── Validates MIME, dimensions, file size (<15MB)
   ├── Saves outside src directory (data/uploads/<id>/<uuid>.<ext>)
   └── Status: UPLOADED

3. POST /api/inspections/{id}/analyze
   ├── Calls OCR Service -> extracts declarations & bounding boxes
   ├── Builds RuleContext
   ├── Executes RuleRegistry (deterministic legal rules)
   ├── Stores ComplianceCheck entries (PASS / FAIL / REVIEW)
   └── Status: REVIEW_REQUIRED (preliminary_result: COMPLIANT | NON_COMPLIANT)

4. POST /api/inspections/{id}/review
   ├── Human Officer inspects evidence, enters remarks & verdict
   ├── Stores Review record
   ├── Records immutable AuditLog
   └── Status: COMPLETED (final_result: COMPLIANT | NON_COMPLIANT)

5. GET /api/inspections/{id}/report
   └── Returns structured compliance report ready for export
```

---

## 9. Running Tests

Run the comprehensive test suite:

```bash
cd backend
.venv\Scripts\pytest -v
```

All 24 automated tests cover:
- Argon2id password verification & HttpOnly cookie sessions
- Bearer token fallback & RBAC authorization
- Image upload validation, size caps, and file-type spoofing rejection
- Deterministic Legal Metrology rule engine evaluations (MRP, Net Qty, Manufacturer, Date, Care, Origin)
- Complete end-to-end inspection lifecycle and immutable audit logs.

---

## 10. Developer Guide for Team Members

### How to Add a New Legal Metrology Rule
1. Create a new rule file in `backend/app/rules/definitions/my_rule.py`.
2. Inherit from `BaseRule` (from `app.rules.base`).
3. Define `rule_code`, `name`, `description`, `legal_reference`, and implement `evaluate(self, context: RuleContext) -> RuleEvaluationResult`.
4. Add the rule to `ALL_RULES` in `backend/app/rules/definitions/__init__.py`.
5. The rule will automatically register in the engine, sync into the database, and run during `/analyze`!

### How to Integrate Real PaddleOCR
1. Create `backend/app/services/paddle_ocr.py`.
2. Inherit from `BaseOCRService` (from `app.services.base_ocr`).
3. Implement `process_images(image_paths, source_image_ids) -> OCRPipelineResult`.
4. Inject your new OCR service in `InspectionService.run_analysis(..., ocr_service=PaddleOCRService())`.
