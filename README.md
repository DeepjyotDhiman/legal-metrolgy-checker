# TriNetra (त्रिनेत्र)

AI-assisted inspection system to check compliance of packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011 by scanning product images and labels.

Developed for **Smart India Hackathon 2026**.

---

## Problem

Enforcing compliance under the Legal Metrology (Packaged Commodities) Rules across thousands of consumer commodities is labor-intensive, error-prone, and slow. Enforcement officers must manually verify small packaging declarations (MRP, net quantity, manufacturer address, manufacturing dates, consumer grievance details, and country of origin), leading to regulatory backlogs and inconsistent enforcement.

## Solution

TriNetra provides an **officer-assistance platform** that automates packaging declaration inspection. Officers upload package label photographs; the system assesses image quality, transcribes label text via OCR, extracts mandatory declarations with bounding boxes, deterministically evaluates compliance against statutory Legal Metrology rules, flags violations with linked evidence, and presents the case to the inspecting officer for final review, verification, and legal determination.

---

## MVP Features

- **Image & Label Scanning:** Secure upload of packaging photographs with file validation, MIME checks, size limits, and quality scoring.
- **Multilingual OCR Abstraction:** Modular `BaseOCRService` interface with deterministic mock pipeline extracting label text and bounding boxes (ready for PaddleOCR integration).
- **Mandatory Declaration Extraction:** Normalizes statutory declarations (MRP, Net Quantity, Manufacturer details, Date of Mfg, Consumer Care, Country of Origin).
- **Deterministic Compliance Checks:** Rule engine executing statutory rules under Rule 6(1) of Legal Metrology (Packaged Commodities) Rules, 2011 without generative AI hallucinations.
- **Officer Review & Override:** Human-in-the-loop verification allowing officers to inspect evidence, append comments, and record binding legal verdicts.
- **Evidence-Linked Reports:** Generates structured compliance audit reports detailing rule-by-rule findings, citations, and coordinates.
- **Immutable Audit Trail:** Automatic audit logging for authentication, uploads, analysis runs, and review overrides.
- **Officer Analytics Dashboard:** Aggregate metrics on total inspections, status breakdown, and compliance distributions.

---

## Architecture

```text
User / Officer
     │
     ▼
[React Frontend] (Planned / Future)
     │
     ▼  REST API (HttpOnly Cookie / Bearer Token)
FastAPI Backend
     │
     ├── RBAC Guard (OFFICER, ADMIN)
     ├── ImageService (Validation, Quality Scoring, Path Traversal Guard)
     ├── BaseOCRService (Mock Pipeline -> Future PaddleOCR)
     ├── RuleRegistry (Deterministic Legal Metrology Rules)
     ├── AuditService (Immutable Logging)
     └── InspectionService (Lifecycle State Machine)
     │
     ▼
SQLAlchemy 2.0 ORM & Database (SQLite MVP, PostgreSQL Compatible)
```

---

## Tech Stack

- **Backend:** Python 3.12+ (tested on Python 3.13), FastAPI, Pydantic v2, Uvicorn
- **Database & ORM:** SQLAlchemy 2.0, Alembic, SQLite (designed for PostgreSQL portability)
- **Security:** Argon2id (`argon2-cffi`), JWT session cookies (`pyjwt`), RBAC
- **Computer Vision:** Pillow, OpenCV Headless
- **Testing:** Pytest, TestClient
- **Containerization:** Docker, Docker Compose
- **Frontend (Planned / Future):** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts

---

## Repository Structure

```text
legal-metrolgy-checker/
├── docs/                       # Comprehensive documentation suite
├── backend/
│   ├── app/
│   │   ├── api/                # FastAPI routes & RBAC dependencies
│   │   ├── core/               # Configuration, database connection, security
│   │   ├── models/             # 10 SQLAlchemy 2.0 database entities
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── rules/              # Deterministic Legal Metrology rule engine
│   │   └── services/           # OCR, compliance, image, and audit services
│   ├── tests/                  # 24 Pytest unit and integration tests
│   ├── alembic/                # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── CONTRIBUTING.md
└── README.md
```

---

## Quick Start

For detailed developer setup, virtual environment creation, and configuration, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

### Run with Docker Compose
```bash
docker compose up --build
```

### Run Locally (Python 3.12+)
```bash
cd backend
python -m venv .venv
# Activate virtual environment, then:
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## API Documentation

When the backend is running, explore the interactive OpenAPI specifications:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

Full endpoint details are documented in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

---

## Documentation

- **[AI Context](docs/AI_CONTEXT.md):** Mandatory context, rules, and boundaries for AI coding agents.
- **[Architecture](docs/ARCHITECTURE.md):** Detailed system architecture, component boundaries, and data flow.
- **[API Contract](docs/API_CONTRACT.md):** Exhaustive specification of all 16 REST endpoints.
- **[Data Model](docs/DATA_MODEL.md):** Relational schema, entity relationships, and constraints.
- **[OCR Guide](docs/OCR_GUIDE.md):** Vision pipeline, quality scoring, and PaddleOCR integration guide.
- **[Rule Engine](docs/RULE_ENGINE.md):** Deterministic compliance logic, statutory citations, and rule creation.
- **[Security](docs/SECURITY.md):** Argon2id hashing, cookie auth, file upload guards, and hardening.
- **[Development](docs/DEVELOPMENT.md):** Step-by-step developer onboarding and environment setup.
- **[Testing](docs/TESTING.md):** Pytest test architecture, fixtures, and CI requirements.
- **[Deployment](docs/DEPLOYMENT.md):** Docker execution, MVP deployment, and production guidelines.
- **[Troubleshooting](docs/TROUBLESHOOTING.md):** Common errors and resolution steps.
- **[Contributing](CONTRIBUTING.md):** Git branch strategy, team ownership, and pull request rules.

---

## Security & Authentication Model

- **Authorized Registration Workflow:** Public registration (`POST /api/auth/register`) strictly registers accounts with `role = OFFICER` and `is_active = FALSE`. New accounts cannot log in until verified and approved by an authorized administrator via the User Management dashboard (`POST /api/users/{id}/approve`).
- **Development First-Admin Bootstrap:** To solve the initial zero-administrator bootstrap problem during development:
  - Configure `DEV_BOOTSTRAP_ADMIN_PASSWORD=<your-password>` and optional `DEV_BOOTSTRAP_ADMIN_EMAIL` in `backend/.env`.
  - On startup with `ENVIRONMENT=development`, the backend automatically seeds the initial administrator account **only if zero administrators exist** in the database.
  - In production (`ENVIRONMENT=production`), automatic bootstrap is strictly disabled.
  - Passwords are never hardcoded, never displayed in the frontend, never committed to git, and never written to application logs.
- **No Usable Default Credentials:** The repository does not ship with usable default passwords or production signing keys.
- **Never Commit `.env`:** Keep your local `.env` untracked and never commit secrets to version control.

---

## Legal Notice

TriNetra provides **assistive compliance analysis** and preliminary technical findings to aid enforcement officers. Outputs generated by this software do not constitute an autonomous legal judgment, penalty, or statutory notice. Final regulatory determinations strictly require qualified human review and official verification against the applicable gazetted provisions of the Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules, 2011.
