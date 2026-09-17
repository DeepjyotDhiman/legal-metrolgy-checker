# TriNetra Testing & Quality Assurance Guide

This document details the test framework, test fixtures, coverage requirements, and integration test flows implemented in the TriNetra backend.

---

## 1. Test Architecture & Fixtures

Testing is implemented with **Pytest** and **Starlette TestClient**.

Located in `backend/tests/conftest.py`:
- **In-Memory SQLite Database:** Tests run against `sqlite:///:memory:` using `StaticPool` to ensure thread-safe test isolation.
- **`db` Fixture:** Creates a nested transaction with an automatic rollback after each test, preventing test cross-contamination.
- **`client` Fixture:** Configures a `TestClient(app)` with database dependency overrides.
- **`officer_user` & `admin_user` Fixtures:** Pre-generate valid test accounts with Argon2id hashes.
- **`officer_client` & `admin_client` Fixtures:** Inject valid session cookies into the client for authenticated requests.
- **`sample_image_bytes` Fixture:** Generates dynamic 400x300 RGB test image bytes in PNG format via Pillow.

---

## 2. Test Suite Overview

| Test Module | Test Cases | Scope Covered |
|---|---|---|
| `test_health.py` | 1 | Verifies `/api/health` reports status "online" and database "healthy". |
| `test_auth.py` | 6 | Argon2id verification, session cookie issuance, invalid password rejection, `/api/auth/me` profile retrieval, unauthenticated 401 guard, cookie clearing on logout, Bearer header fallback. |
| `test_inspections.py` | 4 | Creation of `DRAFT` inspection, role guard rejection for unauthenticated users, pagination and listing, detail fetching. |
| `test_images.py` | 3 | Valid image upload and quality scoring, rejection of executable file extension (`.exe`), rejection of corrupted byte payload. |
| `test_rules.py` | 9 | Unit tests for deterministic legal rules (MRP pass, MRP missing taxes fail, Net Qty metric pass, Net Qty imperial fail, Manufacturer pass, Date pass, Consumer Care pass, Origin pass). |
| `test_compliance_stub.py` | 1 | Complete end-to-end inspection lifecycle integration test. |

---

## 3. End-to-End Lifecycle Integration Test

Implemented in `tests/test_compliance_stub.py`:

```text
[1. Officer Authenticated]
       │
       ▼
[2. POST /api/inspections] ──> Returns Inspection ID, Status: DRAFT
       │
       ▼
[3. POST /api/inspections/{id}/images] ──> Uploads test PNG, Status: UPLOADED
       │
       ▼
[4. POST /api/inspections/{id}/analyze]
       ├── OCR executes & populates ocr_results table
       ├── ExtractedField records created with bounding boxes
       ├── RuleRegistry evaluates 6 legal rules
       ├── ComplianceCheck records created in DB
       └── Status transitions to REVIEW_REQUIRED
       │
       ▼
[5. GET /api/inspections/{id}/ocr & /fields & /compliance] ──> Verifies outputs
       │
       ▼
[6. POST /api/inspections/{id}/review]
       ├── Officer enters final verdict & comment
       └── Status transitions to COMPLETED
       │
       ▼
[7. GET /api/inspections/{id}/report] ──> Verifies structured compliance report
       │
       ▼
[8. Audit Log Verification] ──> Asserts immutable audit trail for all 4 state changes
```

---

## 4. Running the Tests

### Execute All Tests
```bash
cd backend
.venv\Scripts\pytest -v
```

### Execute with Coverage
```bash
pytest --cov=app tests/ -v
```

### Run a Specific Test Module
```bash
pytest tests/test_rules.py -v
pytest tests/test_compliance_stub.py -v
```

---

## 5. What Must Be Tested Before Submitting a PR

Before opening a pull request, developers must verify:
1. **Zero Test Regressions:** All 24 existing tests must pass.
2. **New Feature Coverage:** Any new rule, endpoint, or service method must have corresponding unit and integration tests.
3. **Negative Case Testing:** Always test invalid payloads, corrupted files, and unauthorized access attempts.
4. **No Side Effects on Disk:** Tests must clean up any temporary files or utilize in-memory storage.
