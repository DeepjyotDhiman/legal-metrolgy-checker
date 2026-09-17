# TriNetra Deployment & Operations Guide

This document outlines deployment configurations for the TriNetra MVP and details future production hardening requirements.

> [!NOTE]
> The current version of TriNetra is an **MVP (Minimum Viable Product)** designed for evaluation, local development, and demonstration at the Smart India Hackathon 2026. It is not currently certified for production regulatory deployment.

---

## 1. MVP Deployment via Docker Compose

The standard MVP deployment packages the FastAPI application into a single container mounting a persistent host directory.

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/DeepjyotDhiman/legal-metrolgy-checker.git
cd legal-metrolgy-checker
cp .env.example .env
```

Set environment variables in `.env`:
```ini
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=<generate-a-strong-random-key-at-least-32-characters>
DATABASE_URL=sqlite:////app/data/trinetra.db
UPLOAD_DIR=/app/data/uploads
COOKIE_SECURE=False
```

### Step 2: Build and Run Container
```bash
docker compose up --build -d
```

### Step 3: Verify Deployment
Check the health endpoint:
```bash
curl http://localhost:8000/api/health
```
Expected response:
```json
{"status": "online", "service": "TriNetra - Legal Metrology Compliance Inspection", "version": "0.1.0", "environment": "development", "database": "healthy"}
```

---

## 2. Production Deployment Architecture (Future)

In a future production deployment, the single container architecture should be hardened as follows:

```text
[Internet / Officers]
         │
         ▼ HTTPS (Port 443)
[Nginx / Caddy Reverse Proxy]
         │
         ├── SSL/TLS Termination
         ├── Rate Limiting
         ├── Security Headers (HSTS, CSP, X-Frame-Options)
         │
         ▼ Reverse Proxy (HTTP Port 8000)
[FastAPI Gunicorn / Uvicorn Workers]
         │
         ├── Persistent Storage Volume ──> /app/data/uploads/
         └── PostgreSQL Database ──> PostgreSQL 15+ Cluster
```

---

## 3. Production Environment Hardening

| Setting | MVP Value | Production Requirement | Rationale |
|---|---|---|---|
| `ENVIRONMENT` | `development` | `production` | Disables verbose debug logging and error details. |
| `DEBUG` | `True` | `False` | Prevents sensitive stack traces from leaking in HTTP responses. |
| `SECRET_KEY` | Dev fallback | Strong 64-character secret | Cryptographic signature of session tokens. |
| `COOKIE_SECURE` | `False` | `True` | Restricts session cookie transmission exclusively over HTTPS. |
| `DATABASE_URL` | `sqlite:///./data/trinetra.db` | `postgresql://user:pass@host:5432/db` | High-concurrency ACID transactions, connection pooling, and automated backups. |
| `CORS_ORIGINS` | `["http://localhost:5173", ...]` | Strict frontend domains only | Mitigates unauthorized cross-origin API abuse. |

---

## 4. Backups & Disaster Recovery

An operational TriNetra instance relies on two persistent assets:

1. **Relational Database (`trinetra.db` or PostgreSQL):**
   - Contains users, inspections, OCR transcriptions, compliance findings, review decisions, and immutable audit logs.
   - For SQLite: Copy `data/trinetra.db` using standard SQLite backup API (`sqlite3 data/trinetra.db ".backup data/backup.db"`).
   - For PostgreSQL: Configure daily `pg_dump` snapshots.
2. **Uploaded Images Directory (`./data/uploads/`):**
   - Contains evidentiary photos of product packaging.
   - Must be preserved to substantiate regulatory penalties.
   - Recommended: Nightly rsync or automated object store backup.

---

## 5. Monitoring & Liveness

The application provides a built-in health endpoint:
- **URL:** `GET /api/health`
- **Behavior:** Executes a real `SELECT 1` database query to verify DB connectivity.
- **Docker Healthcheck:** Configured in `docker-compose.yml` with a 30-second interval:
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  ```
