# TriNetra Developer Setup & Workflow Guide

This guide provides step-by-step instructions for onboarding a developer to the TriNetra codebase.

---

## 1. System Requirements

- **Operating System:** Windows 10/11, macOS, or Ubuntu 22.04+
- **Python:** Python 3.12+ (tested and verified with Python 3.13.7)
- **Git:** Version 2.30+
- **Docker & Docker Compose:** (Optional, for containerized local execution)

---

## 2. Local Backend Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/DeepjyotDhiman/legal-metrolgy-checker.git
cd legal-metrolgy-checker
```

### Step 2: Create Python Virtual Environment
Navigate into the `backend/` directory:
```bash
cd backend

# On Windows (using Python launcher):
py -3.13 -m venv .venv
# Activate:
.venv\Scripts\Activate.ps1

# On macOS / Linux:
python3 -m venv .venv
# Activate:
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy the template configuration file:
```bash
# Inside backend/ directory:
copy .env.example .env      # On Windows
cp .env.example .env        # On macOS/Linux
```

Open `.env` and set your configuration.
For local development, you may set optional seed credentials:
```ini
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=dev-secret-key-at-least-32-characters-long-example
DATABASE_URL=sqlite:///./data/trinetra.db
UPLOAD_DIR=./data/uploads

# Optional local dev seed accounts:
DEFAULT_ADMIN_EMAIL=admin@trinetra.gov.in
DEFAULT_ADMIN_PASSWORD=<configured-development-password>
DEFAULT_OFFICER_EMAIL=officer@trinetra.gov.in
DEFAULT_OFFICER_PASSWORD=<configured-development-password>
```

### Step 5: Run Database Migrations
Execute Alembic to create all tables and indexes:
```bash
alembic upgrade head
```

### Step 6: Start the Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`
- **ReDoc Documentation:** `http://localhost:8000/redoc`

---

## 3. Running the Test Suite

Pytest is configured via `pytest.ini` with `pythonpath = .`:

```bash
# Run all tests with verbose output:
pytest -v

# Run specific test file:
pytest tests/test_rules.py -v
pytest tests/test_compliance_stub.py -v
```

All tests execute against an in-memory SQLite database (`sqlite:///:memory:`) with zero side effects on local disk files.

---

## 4. Frontend Setup

> **Status: Planned / Future**

Once the frontend repository structure is created:
```bash
cd frontend
npm install
npm run dev
```
The frontend will communicate with the backend at `http://localhost:8000/api`.

---

## 5. Dockerized Execution

If you prefer running via Docker Compose:
```bash
# From repository root:
docker compose up --build
```
This starts the backend on `http://localhost:8000` and mounts `./data` as a persistent volume.

---

## 6. Development Workflow Rules

1. **Keep commits atomic:** Group related file changes with descriptive commit messages.
2. **Never commit secrets or passwords:** Ensure `.env` is never staged.
3. **Always run tests before pushing:** `pytest -v` must report 100% pass rate.
4. **Follow Subsystem Ownership:**
   - Deepjyot: Architecture, models, auth, API contracts
   - OM: Vision, OCR, bounding box extraction
   - Mohit: Rule definitions, statutory references
   - Dev: Frontend and UI integration
