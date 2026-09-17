# TriNetra Troubleshooting Guide

This guide compiles common issues encountered during development, local testing, or containerized execution of TriNetra, along with their resolutions.

---

## 1. Backend Startup Issues

### Error: `ModuleNotFoundError: No module named 'app'`
- **Cause:** Python cannot resolve the `app` package when running commands from the wrong working directory.
- **Resolution:**
  Ensure your terminal is in the `backend/` directory where `app/` resides, and verify that your virtual environment is active:
  ```bash
  cd backend
  .venv\Scripts\Activate.ps1   # On Windows
  uvicorn app.main:app --reload
  ```

### Error: `ImportError: email-validator is not installed`
- **Cause:** Pydantic `EmailStr` field validation requires the optional `email-validator` library.
- **Resolution:**
  ```bash
  pip install email-validator
  ```

---

## 2. Database & Migration Errors

### Error: `sqlite3.OperationalError: no such table: users`
- **Cause:** Database migrations have not been applied to the local SQLite database.
- **Resolution:**
  Run Alembic upgrade to apply all pending revisions:
  ```bash
  alembic upgrade head
  ```

### Error: `PRAGMA foreign_keys` constraint failed
- **Cause:** An operation attempted to insert a child record with a non-existent parent foreign key (e.g. inserting an `Image` with an invalid `inspection_id`).
- **Resolution:** Ensure parent records (`Inspection`, `User`, `Rule`) exist before referencing their IDs. In SQLite, TriNetra strictly enforces foreign keys.

---

## 3. Authentication & Cookie Issues

### Issue: Login succeeds but subsequent requests return `401 Unauthorized`
- **Cause 1:** The frontend client is not sending cookies across origins.
  - **Resolution:** On your frontend HTTP client (fetch or Axios), ensure credentials are enabled:
    ```javascript
    fetch("http://localhost:8000/api/inspections", {
      credentials: "include"
    });
    ```
- **Cause 2:** Cookie `SameSite` or `Secure` policy blocking.
  - **Resolution:** In local development on `http://localhost`, ensure `COOKIE_SECURE=False` in `.env`. Only enable `COOKIE_SECURE=True` when serving over HTTPS.
- **Alternative:** Use the Bearer token fallback for testing tools:
  ```bash
  curl -H "Authorization: Bearer <session_token>" http://localhost:8000/api/auth/me
  ```

---

## 4. File Upload Failures

### Error: `400 Bad Request: Unsupported file extension`
- **Cause:** The uploaded file extension is not in the whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`).
- **Resolution:** Rename or convert the file to a supported format before uploading.

### Error: `400 Bad Request: File size exceeds maximum permitted limit`
- **Cause:** File size exceeds `MAX_UPLOAD_SIZE_MB` (default 15MB).
- **Resolution:** Compress the packaging photograph or increase `MAX_UPLOAD_SIZE_MB` in `.env` if necessary.

### Error: `400 Bad Request: Uploaded file is not a valid or readable image`
- **Cause:** Pillow's byte verification detected an unreadable or spoofed image payload.
- **Resolution:** Verify that the image file is not corrupted and can be opened in a standard image viewer.

---

## 5. OCR & Rule Evaluation Issues

### Issue: Analysis produces mock data instead of reading actual image text
- **Explanation:** In the current MVP foundation, `MockOCRService` is the active OCR provider. Real PaddleOCR integration is designed into the `BaseOCRService` interface and scheduled for implementation by **OM**.
- **Resolution:** Refer to [docs/OCR_GUIDE.md](file:///d:/legal-metrolgy-checker/docs/OCR_GUIDE.md) for instructions on plugging in `PaddleOCRService`.

### Issue: Rule check produces `REVIEW` status unexpectedly
- **Explanation:** TriNetra enforces a safety threshold: if OCR confidence on a mandatory field is below `0.65`, the rule engine flags the item as `REVIEW` to mandate human officer verification, rather than issuing an automated false violation.
- **Resolution:** This is the intended behavior. The inspecting officer should review the physical packaging photo in the UI.

---

## 6. CORS (Cross-Origin Resource Sharing) Errors

### Error: `Access to fetch at ... has been blocked by CORS policy`
- **Cause:** The frontend origin (e.g. `http://localhost:5173`) is not listed in `settings.CORS_ORIGINS`.
- **Resolution:**
  Add your frontend origin to `CORS_ORIGINS` in `.env`:
  ```ini
  CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:5173"]
  ```

---

## 7. Pytest Test Failures

### Error: Tests fail with `ModuleNotFoundError: No module named 'app'`
- **Cause:** `pytest` was invoked without `PYTHONPATH` containing the backend directory.
- **Resolution:** Ensure `backend/pytest.ini` exists with `pythonpath = .`, and run `pytest` directly inside the `backend/` directory:
  ```bash
  cd backend
  .venv\Scripts\pytest -v
  ```
