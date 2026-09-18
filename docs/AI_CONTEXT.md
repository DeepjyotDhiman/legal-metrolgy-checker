# TriNetra AI Context

## What is TriNetra?
TriNetra (त्रिनेत्र) is an AI-assisted compliance inspection software system designed for the Smart India Hackathon 2026 problem:
> *"Software System to check compliance of Packaged Commodities under Legal Metrology (Packaged Commodities) Rules by scanning products, images and labels."*

TriNetra functions as an **officer-assistance platform**, not an autonomous legal decision-maker. It automates the extraction of packaged commodity declarations from label photographs, evaluates those declarations against deterministic, versioned Legal Metrology statutory rules, flags violations with evidence references, and presents preliminary findings to a qualified human Legal Metrology Officer who conducts verification and enters the binding legal determination.

---

## Current MVP
The current repository hosts the **Backend Foundation MVP**:
- **Backend Service:** Python 3.12+ (tested with Python 3.13), FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, SQLite database (designed with PostgreSQL-compatible schema types).
- **Security:** Argon2id password hashing, signed JWT tokens stored in HttpOnly SameSite cookies (with Bearer token fallback for API consumers), Role-Based Access Control (ADMIN and OFFICER), and file upload sanitization with path traversal protection.
- **Computer Vision & OCR Abstraction:** `BaseOCRService` abstract protocol with a deterministic `MockOCRService` simulating multi-field label extractions with bounding boxes and confidence metrics (ready for PaddleOCR integration).
- **Rule Engine:** Deterministic, modular `RuleRegistry` executing 6 core statutory rules under Rule 6(1) of the Legal Metrology (Packaged Commodities) Rules, 2011. Zero reliance on LLMs for compliance verdicts.
- **Frontend Status:** **Planned / Future** (React, TypeScript, Vite, Tailwind/shadcn, Recharts). The backend exposes an OpenAPI contract at `/docs` specifically structured for this upcoming frontend client.

---

## Repository Structure
```text
legal-metrolgy-checker/
├── .env.example                # Root environment template with secure placeholders
├── .gitignore                  # Git ignore rules for venv, cache, uploads, db
├── docker-compose.yml          # Container configuration for backend + volume
├── README.md                   # Project overview and quick links
├── CONTRIBUTING.md             # Git branching, commit rules, and AI policy
├── docs/                       # Complete architecture and developer documentation
│   ├── AI_CONTEXT.md           # Instructions and constraints for AI coding agents
│   ├── ARCHITECTURE.md         # System architecture, data flow, component boundaries
│   ├── API_CONTRACT.md         # Full endpoint documentation and request/response shapes
│   ├── DATA_MODEL.md           # Database entities, relationships, constraints, migrations
│   ├── OCR_GUIDE.md            # Vision pipeline, quality scoring, PaddleOCR integration
│   ├── RULE_ENGINE.md          # Deterministic rule architecture and statutory definitions
│   ├── SECURITY.md             # Threat model, hashing, cookie auth, file upload guards
│   ├── DEVELOPMENT.md          # Setup instructions, virtualenv, running tests
│   ├── TESTING.md              # Test architecture, fixtures, test cases, PR requirements
│   ├── DEPLOYMENT.md           # MVP deployment, containerization, production hardening
│   └── TROUBLESHOOTING.md      # Common failure modes and resolution steps
└── backend/
    ├── app/
    │   ├── main.py             # FastAPI entrypoint, lifespan seeding, middleware
    │   ├── api/
    │   │   ├── deps.py         # Session auth dependencies and RBAC role guards
    │   │   └── v1/
    │   │       ├── api.py      # Router aggregator
    │   │       └── endpoints/  # Route handlers (auth, inspections, images, ocr, etc.)
    │   ├── core/
    │   │   ├── config.py       # Pydantic Settings (.env configuration)
    │   │   ├── database.py     # SQLAlchemy 2.0 engine, SessionLocal, SQLite FK pragma
    │   │   └── security.py     # Argon2id hashing and JWT token signing
    │   ├── models/             # 10 SQLAlchemy Declarative Models
    │   ├── schemas/            # Pydantic validation and serialization schemas
    │   ├── rules/              # Modular Legal Metrology Rule Engine
    │   │   ├── base.py         # BaseRule, RuleContext, RuleEvaluationResult
    │   │   ├── registry.py     # RuleRegistry singleton
    │   │   └── definitions/    # Statutory rule implementations (MRP, Net Qty, etc.)
    │   └── services/           # Service layer
    │       ├── base_ocr.py     # OCR Service abstract protocol
    │       ├── mock_ocr.py     # Deterministic mock OCR with bounding boxes
    │       ├── image_service.py# Image validation, security, quality scoring
    │       ├── compliance_service.py # Orchestrator for rule execution and DB sync
    │       ├── inspection_service.py # Inspection lifecycle state machine
    │       └── audit_service.py      # Immutable audit logging service
    ├── tests/                  # 24 Pytest unit and integration tests
    ├── alembic/                # Alembic database migration scripts
    ├── requirements.txt        # Python dependency manifest
    ├── Dockerfile              # Containerfile for backend service
    └── pytest.ini              # Pytest configuration (pythonpath = .)
```

---

## Architecture

```text
User / Officer
     │
     ▼
[React Frontend] (Planned / Future)
     │
     ▼  HTTP (HttpOnly Cookie / Bearer Token)
FastAPI Application Layer (app/main.py, app/api/)
     │
     ├── RBAC Dependency Guard (OFFICER, ADMIN)
     │
     ▼
Service Layer (app/services/)
     ├── ImageService ──> Validates MIME, size, magic bytes; prevents path traversal
     ├── InspectionService ──> Manages lifecycle state transitions & orchestrates analysis
     ├── BaseOCRService ──> (MockOCRService -> Future PaddleOCR) generates text & bboxes
     ├── ComplianceService ──> Prepares RuleContext & evaluates rules via RuleRegistry
     └── AuditService ──> Commits immutable event logs
     │
     ├── Rule Engine (app/rules/) ──> Deterministic, versioned, evidence-backed rules
     │
     ▼
Database Layer (app/models/ & app/core/database.py)
     └── SQLAlchemy 2.0 Models (SQLite for MVP, Postgres compatible)
```

---

## Backend
- **Framework:** FastAPI with Python 3.12+ async lifespan and CORS middleware.
- **Configuration:** Managed in `app/core/config.py` using `pydantic-settings.BaseSettings`. Loads variables from `.env` with case-sensitive overrides.
- **Data Persistence:** Synchronous SQLAlchemy 2.0 sessions (`get_db` dependency) with SQLite foreign keys explicitly enabled via `PRAGMA foreign_keys=ON`.
- **API Versioning:** All endpoints are grouped under `/api` (`/api/auth`, `/api/inspections`, `/api/rules`, `/api/dashboard`, `/api/health`).

---

## Frontend
- **Status:** **Planned / Future**
- **Planned Stack:** React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui components, Recharts.
- **Contract Expectation:** Consumes JSON from `/api/*`. Uses `credentials: "include"` on fetch/axios calls to automatically exchange the HttpOnly `trinetra_session` cookie.

---

## Database
10 entities defined in `backend/app/models/`:
1. `User`: User identity, Argon2id hash, role (`ADMIN`, `OFFICER`), active state.
2. `Inspection`: Inspection master, product category, status state machine, preliminary result, final result.
3. `Image`: Packaging photos, file path (outside source tree), image type (`LABEL`, `FRONT`, etc.), quality score.
4. `OCRResult`: Raw OCR text, detected language, confidence score.
5. `ExtractedField`: Isolated declaration (`mrp`, `net_quantity`, `manufacturer_name`, etc.), value, confidence, image bounding box coordinates (`{x, y, w, h}`).
6. `Rule`: Statutory rule metadata, rule code, legal reference, version, effective date window, active toggle.
7. `ComplianceCheck`: Rule-by-rule evaluation outcome (`PASS`, `FAIL`, `REVIEW`, `NOT_APPLICABLE`), severity, explanation, evidence payload, confidence.
8. `Review`: Human officer review, decision (`COMPLIANT`, `NON_COMPLIANT`, `ACTION_REQUIRED`), commentary, timestamp.
9. `AuditLog`: Immutable action trail (`user_id`, `inspection_id`, `action`, `old_value`, `new_value`, timestamp).
10. `Report`: Inspection report metadata and export path.

---

## Authentication & RBAC
- Passwords are encrypted with **Argon2id** (`argon2-cffi`) using RFC 9106 recommended parameters (memory cost 64MB, time cost 3, parallelism 4).
- Successful login (`POST /api/auth/login`) issues a signed HS256 JWT stored in an **HttpOnly, SameSite=Lax** session cookie named `trinetra_session`.
- `app/api/deps.py` provides `get_current_user` which inspects the cookie first, then falls back to `Authorization: Bearer <token>` to facilitate API testing.
- Role checks are enforced via `require_officer` (`OFFICER` or `ADMIN`) and `require_admin` (`ADMIN` only).

---

## OCR Pipeline
- **Abstraction:** Defined in `app/services/base_ocr.py` via `BaseOCRService`.
- **Outputs:** `OCRPipelineResult` containing `OCRRawOutput` (full text, overall confidence, language) and a list of `ExtractedDeclarationOutput` (field name, field value, confidence, bounding box coordinates, source image ID).
- **Active Providers:**
  - `PaddleOCRService` (`app/services/paddle_ocr.py`): Real multilingual OCR implementation using PaddleOCR with lazy model loading, modular image preprocessing, quality score gating, normalized bounding box rectangles (`{"x", "y", "w", "h"}`), and statutory declaration extraction.
  - `MockOCRService` (`app/services/mock_ocr.py`): Deterministic mock OCR service for offline testing, development, and fallback mode.
- **Rule of Separation:** OCR is an extraction mechanism, NOT a legal determination. Low OCR confidence flags the field for human verification; it does not silently trigger a false legal conviction.

---

## Rule Engine
- Located in `backend/app/rules/`.
- Architecture:
  - `BaseRule` (`app/rules/base.py`): Abstract class specifying `rule_code`, `legal_reference`, `version`, `effective_from`, `effective_to`, `default_severity`, and `evaluate(context: RuleContext) -> RuleEvaluationResult`.
  - `RuleContext`: Carries package category, extracted fields dictionary, field confidences, bounding boxes, raw OCR text, and metadata.
  - `RuleEvaluationResult`: Carries `status` (`PASS`, `FAIL`, `REVIEW`, `NOT_APPLICABLE`), `severity` (`HIGH`, `MEDIUM`, `LOW`), `confidence`, `explanation`, and `evidence` JSON.
  - `RuleRegistry` (`app/rules/registry.py`): Thread-safe registry that loads active rules and executes them against a context.
- Implemented Rules (Legal Metrology (Packaged Commodities) Rules, 2011):
  1. `LMPC-R06-MRP`: Rule 6(1)(e) - Maximum Retail Price with currency and mandatory "inclusive of all taxes" clause.
  2. `LMPC-R06-NETQTY`: Rule 6(1)(d) - Net quantity in standard metric units (g, kg, ml, l, etc.). Non-metric imperial units alone trigger FAIL.
  3. `LMPC-R06-MFG`: Rule 6(1)(a) - Complete name and address of manufacturer, packer, or importer.
  4. `LMPC-R06-DATE`: Rule 6(1)(c) - Month and year of manufacture or packing.
  5. `LMPC-R06-CARE`: Rule 6(1)(f) - Consumer care contact details (helpline telephone or email).
  6. `LMPC-R06-ORIGIN`: Rule 6(1)(g) - Country of origin declaration for packaged commodities.

---

## Inspection Lifecycle
1. `DRAFT`: Created via `POST /api/inspections`.
2. `UPLOADED`: One or more label images uploaded via `POST /api/inspections/{id}/images`.
3. `ANALYZING`: Triggered via `POST /api/inspections/{id}/analyze`. OCR runs, declarations are isolated, and rule engine evaluates statutory checks.
4. `REVIEW_REQUIRED`: System records `preliminary_result` (`COMPLIANT`, `NON_COMPLIANT`, or `REVIEW_REQUIRED`). Human inspection is required by law before a final penalty or clearance.
5. `COMPLETED`: Officer submits final verdict and commentary via `POST /api/inspections/{id}/review`. Final result is recorded, completed timestamp is stamped, and immutable audit logs are written.
6. `ERROR`: Set if an unrecoverable failure occurs during processing.

---

## API Boundaries
Routes must remain thin HTTP adapters:
- **No SQL queries inside endpoints:** Query logic belongs in model queries or dedicated services.
- **No compliance rule logic inside endpoints:** Rules belong strictly in `app/rules/definitions/`.
- **No file manipulation inside endpoints:** File validation and persistence belong strictly in `app/services/image_service.py`.
- **Schemas for validation:** All payloads and responses must be validated by Pydantic schemas in `app/schemas/`.

---

## Team Ownership

| Team Member | Subsystem Ownership | Key Responsibilities |
|---|---|---|
| **Deepjyot** | Core Architecture & Integration | Backend foundation, DB models, Alembic, Auth, RBAC, API contracts, Integration |
| **OM** | Computer Vision & OCR | `BaseOCRService`, PaddleOCR integration, image quality checks, bounding box extraction |
| **Mohit** | Rule Engine & Compliance | Legal Metrology rule definitions, statutory references, rule registry, legal verification |
| **Dev** | Frontend & UI/UX | React application, Vite build, Tailwind UI, dashboard metrics, API consumption |

*These boundaries designate primary ownership and code review responsibility; they are not barriers to collaboration.*

---

## Development Rules
1. Always run existing tests (`pytest -v`) before pushing changes.
2. Keep the SQLite database schema compatible with future PostgreSQL migration (use standard types: string UUIDs, timezone-aware UTC datetimes, JSON columns).
3. Store uploaded files strictly in `settings.UPLOAD_DIR` (`./data/uploads`), never inside `app/` or any executable source folder.
4. Always generate unique random UUID filenames upon upload to eliminate path traversal vulnerabilities.

---

## Security Rules
1. **Never commit secrets:** `SECRET_KEY`, database credentials, and seed passwords must never be committed to Git.
2. **Environment Variable Configuration:** Read all secrets through `Settings` from `.env`.
3. **Password Security:** Use Argon2id via `hash_password()` and `verify_password()`. Never use plain MD5, SHA1, or plain SHA256.
4. **Cookie Flags:** Cookies must be `HttpOnly`, with `SameSite=Lax` (or `Strict`), and `Secure=True` in production.
5. **Path Traversal Guards:** File uploads must discard client-provided filenames for storage and validate file extensions and MIME headers against strict whitelists.
6. **Immutable Audit Logs:** Every security-sensitive or compliance-critical action (login, image upload, analysis, officer review override) must call `AuditService.log_event()`.

### Security Rules for AI Agents
AI agents MUST:
1. Never hardcode passwords.
2. Never hardcode API keys.
3. Never hardcode JWT secrets.
4. Never commit `.env`.
5. Never expose credentials in README/docs/tests.
6. Use environment variables for secrets.
7. Never print secrets in logs.
8. Never weaken authentication to make tests pass.
9. Never bypass RBAC.
10. Never disable security validation without explicit approval.

---

## Legal & Compliance Rules
- **Assistive Principle:** TriNetra outputs are preliminary findings to assist a human officer. Under Legal Metrology regulations, an AI system cannot autonomously issue legal notices or penalties.
- **Deterministic Rule Requirement:** Compliance logic must be deterministic and inspectable. Do not use an LLM for the core PASS/FAIL decision.
- **Statutory Reference:** Every rule must specify its exact legal clause under the Legal Metrology (Packaged Commodities) Rules, 2011 (e.g., `Rule 6(1)(e)`).
- **Legal Disclaimer:** The rule implementations in this MVP are models for demonstration and hackathon evaluation. Prior to real-world enforcement deployment, all rule mappings must be certified against the latest gazette notifications and official statutory amendments.

---

## Testing Requirements
- Maintain >= 90% test coverage on core rules, auth, and state transitions.
- All 24 tests in `backend/tests/` must pass cleanly before any PR is submitted.
- Test both positive (compliant) and negative (non-compliant) paths for each Legal Metrology rule.
- Verify that unauthenticated requests receive `401 Unauthorized` and unauthorized roles receive `403 Forbidden`.

---

## AI AGENT RULES

Before modifying code, an AI agent MUST:

1. Read this file ([docs/AI_CONTEXT.md](file:///d:/legal-metrolgy-checker/docs/AI_CONTEXT.md)).
2. Read [docs/ARCHITECTURE.md](file:///d:/legal-metrolgy-checker/docs/ARCHITECTURE.md).
3. Inspect the relevant existing implementation.
4. Preserve existing API contracts unless the task explicitly requires a change.
5. Preserve database compatibility.
6. Reuse existing service interfaces.
7. Reuse existing authentication/RBAC.
8. Add tests for behavior being changed.
9. Never introduce a new framework/service without approval.
10. Never silently change legal-rule semantics.
11. Never hardcode secrets.
12. Never commit credentials.
13. Never make an automatic legal conclusion that bypasses officer review.
14. Never replace deterministic compliance logic with an LLM.
15. Do not restructure unrelated modules.

### Specific Agent Constraints
- "Before making architectural, database, authentication, API-contract, or shared-interface changes, inspect the existing implementation and documentation first. Preserve existing contracts unless the task explicitly requires a breaking change. Prefer the smallest change that solves the requested problem."
- "Do not introduce microservices, Redis, Kafka, Kubernetes, vector databases, LLM agents, or other infrastructure unless explicitly requested and justified."
- "LLMs may assist explanation/summarization, but deterministic rule modules remain responsible for compliance logic."

---

## How to Safely Modify the Project

1. **Adding a Rule:**
   - Create `backend/app/rules/definitions/new_rule.py` implementing `BaseRule`.
   - Register it in `ALL_RULES` in `backend/app/rules/definitions/__init__.py`.
   - Add unit tests in `backend/tests/test_rules.py`.
2. **Integrating Real PaddleOCR:**
   - Create `backend/app/services/paddle_ocr.py` inheriting from `BaseOCRService`.
   - Implement `process_images()`.
   - Swap the default in `InspectionService.run_analysis(..., ocr_service=PaddleOCRService())` or via dependency injection.
3. **Adding a Model / Migration:**
   - Define model in `backend/app/models/` and export in `backend/app/models/__init__.py`.
   - Run `alembic revision --autogenerate -m "description"` and verify the migration script.
   - Run `alembic upgrade head`.

---

## What AI Agents Must NOT Do
- Do NOT rewrite or delete Git history.
- Do NOT commit `.env` files or API keys.
- Do NOT replace deterministic regex/python rule logic with generative AI calls.
- Do NOT bypass the `Review` step to automatically mark inspections as `COMPLETED`.
- Do NOT mix route handling with database transaction queries or rule evaluation algorithms.
