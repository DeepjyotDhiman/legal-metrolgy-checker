# TriNetra Security Architecture & Hardening Guide

This document outlines the security controls, authentication mechanisms, file-handling defenses, and hardening guidelines implemented in TriNetra.

---

## 1. Public Repository Notice & Secret Rotation

> [!CAUTION]
> **PUBLIC REPOSITORY SECURITY ADVISORY**
>
> Because this repository is public, any development credentials, default passwords, or sample secret keys previously committed to version control must be treated as **COMPROMISED**.
>
> Simply editing or removing a secret in the latest commit does **NOT** remove it from Git commit history.
>
> Before deploying this application in staging, production, or any shared network:
> 1. **Rotate all secret keys:** Generate a new, cryptographically strong `SECRET_KEY` (minimum 32 characters).
> 2. **Rotate all database credentials.**
> 3. **Never reuse passwords** that appeared in test fixtures or development configuration.

---

## 2. Authentication Architecture

### 2.1 Argon2id Password Hashing
- TriNetra uses **Argon2id** (via `argon2-cffi`), the winner of the Password Hashing Competition (PHC) and recommended by RFC 9106.
- Hashing configuration (`app/core/security.py`):
  - Memory cost: 65,536 KiB (64 MB)
  - Time cost: 3 iterations
  - Parallelism: 4 lanes
  - Hash length: 32 bytes
  - Salt length: 16 bytes
- Plaintext passwords are never logged, never returned in API responses, and never stored in persistent memory.

### 2.2 Session Tokens & Cookie Security
- Authentication tokens are signed using HMAC-SHA256 (`HS256`) via `pyjwt`.
- Session tokens are transmitted using a secure browser cookie:
  - **Cookie Name:** `trinetra_session`
  - **`HttpOnly=True`:** Prevents client-side scripts from reading the session token, mitigating Cross-Site Scripting (XSS) token theft.
  - **`SameSite=Lax`:** Prevents Cross-Site Request Forgery (CSRF) in cross-origin state-mutating requests.
  - **`Secure=True` (Production):** Restricts cookie transmission exclusively over encrypted HTTPS connections (configurable via `COOKIE_SECURE`).
- **Bearer Token Fallback:** For non-browser clients and automated testing, the API accepts `Authorization: Bearer <token>` headers as a fallback.

---

## 3. Role-Based Access Control (RBAC)

Two distinct roles are defined in `app/models/enums.py`:
- `UserRole.ADMIN`: System administrator with access to configuration, rule management, and system-wide dashboards.
- `UserRole.OFFICER`: Legal Metrology Officer authorized to create inspections, upload packaging images, trigger analyses, review findings, and finalize legal determinations.

### Enforcement
RBAC dependencies in `app/api/deps.py`:
```python
require_admin = RoleChecker([UserRole.ADMIN])
require_officer = RoleChecker([UserRole.OFFICER, UserRole.ADMIN])
```
Any attempt to access an unauthorized endpoint immediately raises `403 Forbidden`.

---

## 4. File Upload & Storage Security

Packaging image uploads present significant potential attack vectors (path traversal, remote code execution, denial of service). TriNetra implements defense-in-depth in `app/services/image_service.py`:

| Threat Vector | Mitigation Implemented |
|---|---|
| **Path Traversal (`../../etc/passwd`)** | The client-provided filename is completely discarded. The server generates a random UUID hex (`uuid.uuid4().hex`) for on-disk persistence. |
| **Executable Upload (.php, .exe, .sh)** | Strict extension whitelist: `.jpg`, `.jpeg`, `.png`, `.webp`. Any other extension is rejected with `400 Bad Request`. |
| **MIME Spoofing** | Content-Type header must match `image/jpeg`, `image/png`, or `image/webp`. |
| **File Masquerading (Malicious payload with `.png` extension)** | Pillow opens and verifies the byte stream using `PILImage.verify()`. Corrupted or unreadable image payloads are rejected and removed from disk immediately. |
| **Denial of Service (Oversized files)** | File payload size is strictly capped at `15MB` (configurable via `MAX_UPLOAD_SIZE_MB`). |
| **Source Tree Pollution** | Uploaded files are strictly stored in `UPLOAD_DIR` (`./data/uploads/{inspection_id}/`), completely isolated from the Python application code. |

---

## 5. SQL Injection Defense

- TriNetra utilizes **SQLAlchemy 2.0 ORM** for all relational interactions.
- All database queries use parameterized statements. Raw concatenated SQL strings are strictly prohibited.

---

## 6. Audit Logging

Every security-sensitive event writes an immutable row to the `audit_logs` table via `AuditService.log_event()`:
- `USER_LOGIN`
- `USER_LOGOUT`
- `INSPECTION_CREATED`
- `IMAGES_UPLOADED`
- `ANALYSIS_COMPLETED`
- `OFFICER_REVIEW_SUBMITTED`

The audit table preserves the user ID, inspection ID, action tag, old values, new values, and a UTC timestamp.

---

## 7. Production Hardening Checklist

When preparing TriNetra for production deployment:

1. [ ] Set `ENVIRONMENT=production` in `.env`.
2. [ ] Set `DEBUG=False` in `.env`.
3. [ ] Generate a secure `SECRET_KEY` using:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
4. [ ] Set `COOKIE_SECURE=True` to require HTTPS.
5. [ ] Configure `CORS_ORIGINS` to specify the exact production frontend domains only (do not use `*`).
6. [ ] Migrate database to PostgreSQL with dedicated credentials.
7. [ ] Mount `UPLOAD_DIR` on a secure, backed-up storage volume with `noexec` flags.
8. [ ] Terminate TLS/HTTPS via a reverse proxy (e.g. Nginx, Caddy, or Cloudflare).
