# TriNetra Data Model

This document outlines the relational data models, constraints, lifecycle states, and database migration architecture implemented in the TriNetra backend.

---

## 1. Entity-Relationship Overview

```text
User
 ├── Inspection (created_by)
 │     ├── Image (inspection_id)
 │     ├── OCRResult (inspection_id)
 │     ├── ExtractedField (inspection_id)
 │     │     └── Image (source_image_id, nullable)
 │     ├── ComplianceCheck (inspection_id)
 │     │     └── Rule (rule_id)
 │     ├── Review (inspection_id, officer_id -> User)
 │     └── Report (inspection_id)
 └── AuditLog (user_id, inspection_id)
```

---

## 2. Detailed Model Specifications

### 2.1 User (`users`)
- **Purpose:** Stores authenticated administrative and officer accounts.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `name` (String 100, NOT NULL): Full officer/admin name.
  - `email` (String 255, NOT NULL, UNIQUE, INDEXED): Login username.
  - `password_hash` (String 255, NOT NULL): Argon2id password hash.
  - `role` (Enum `ADMIN` / `OFFICER`, NOT NULL): RBAC authorization role.
  - `is_active` (Boolean, default `True`, NOT NULL): Account activation toggle.
  - `created_at` (DateTime with timezone, UTC, NOT NULL).
- **Relationships:**
  - `inspections`: One-to-Many with `Inspection` (cascade delete orphan).
  - `reviews`: One-to-Many with `Review`.
  - `audit_logs`: One-to-Many with `AuditLog`.

### 2.2 Inspection (`inspections`)
- **Purpose:** Master tracking record for a packaged commodity audit.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `created_by` (String 36, FK `users.id`, ondelete `RESTRICT`, NOT NULL).
  - `product_category` (String 100, NOT NULL): e.g. "Food", "Cosmetics".
  - `status` (Enum `InspectionStatus`, NOT NULL, INDEXED): Current state (`DRAFT`, `UPLOADED`, `ANALYZING`, `REVIEW_REQUIRED`, `COMPLIANT`, `NON_COMPLIANT`, `COMPLETED`, `ERROR`).
  - `preliminary_result` (String 50, NULLABLE): Output of automated rule engine (`COMPLIANT`, `NON_COMPLIANT`, `REVIEW_REQUIRED`).
  - `final_result` (String 50, NULLABLE): Legally binding human officer determination (`COMPLIANT`, `NON_COMPLIANT`, `ACTION_REQUIRED`).
  - `created_at` (DateTime with timezone, UTC, NOT NULL).
  - `completed_at` (DateTime with timezone, UTC, NULLABLE): Timestamp of officer review.
- **Relationships:**
  - `creator`: Many-to-One with `User`.
  - `images`, `ocr_results`, `extracted_fields`, `compliance_checks`, `reviews`, `reports`, `audit_logs`: One-to-Many (cascade delete).

### 2.3 Image (`images`)
- **Purpose:** Tracks photos of product packages and label panels.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `file_path` (String 500, NOT NULL): Path on disk under `./data/uploads/{inspection_id}/`.
  - `image_type` (String 50, default `"LABEL"`, NOT NULL): e.g. `LABEL`, `FRONT`, `BACK`.
  - `quality_score` (Float, NULLABLE): Image sharpness and resolution score (0.0 to 1.0).
  - `created_at` (DateTime with timezone, UTC, NOT NULL).

### 2.4 OCRResult (`ocr_results`)
- **Purpose:** Stores raw transcribed text from the OCR pipeline.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `raw_text` (Text, NOT NULL): Unstructured transcription text.
  - `language` (String 50, default `"multilingual"`, NOT NULL): Detected primary language.
  - `confidence` (Float, NOT NULL): Mean OCR confidence score (0.0 to 1.0).
  - `created_at` (DateTime with timezone, UTC, NOT NULL).

### 2.5 ExtractedField (`extracted_fields`)
- **Purpose:** Normalized packaging declarations isolated from OCR text.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `field_name` (String 100, NOT NULL, INDEXED): e.g. `mrp`, `net_quantity`, `mfg_date`.
  - `field_value` (Text, NOT NULL): Value extracted from label.
  - `confidence` (Float, NOT NULL): Field isolation confidence (0.0 to 1.0).
  - `source_image_id` (String 36, FK `images.id`, ondelete `SET NULL`, NULLABLE).
  - `bounding_box` (JSON, NULLABLE): Pixel bounding box `{"x": int, "y": int, "w": int, "h": int}`.

### 2.6 Rule (`rules`)
- **Purpose:** Canonical registry of Legal Metrology statutory regulations.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `rule_code` (String 50, NOT NULL, UNIQUE, INDEXED): e.g. `LMPC-R06-MRP`.
  - `name` (String 200, NOT NULL): Human-readable rule title.
  - `description` (Text, NOT NULL): Statutory purpose and requirement description.
  - `category` (String 100, default `"PACKAGED_COMMODITIES"`, NOT NULL).
  - `legal_reference` (String 255, NOT NULL): Legal Act / Rule clause citation.
  - `version` (String 50, default `"2011.1"`, NOT NULL): Rule edition / statutory amendment tag.
  - `effective_from` (DateTime with timezone, UTC, NOT NULL).
  - `effective_to` (DateTime with timezone, UTC, NULLABLE).
  - `active` (Boolean, default `True`, NOT NULL).

### 2.7 ComplianceCheck (`compliance_checks`)
- **Purpose:** Deterministic outcome of evaluating a single rule against an inspection.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `rule_id` (String 36, FK `rules.id`, ondelete `RESTRICT`, NOT NULL, INDEXED).
  - `status` (Enum `ComplianceStatus`, NOT NULL): `PASS`, `FAIL`, `REVIEW`, `NOT_APPLICABLE`.
  - `severity` (Enum `SeverityLevel`, NOT NULL): `HIGH`, `MEDIUM`, `LOW`, `INFO`.
  - `explanation` (Text, NOT NULL): Human-readable justification for the verdict.
  - `evidence` (JSON, NULLABLE): Specific matched phrases, substrings, or values found on the label.
  - `confidence` (Float, default `1.0`, NOT NULL): Evaluation confidence score.

### 2.8 Review (`reviews`)
- **Purpose:** Legally required human officer review, notes, and final verdict.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `officer_id` (String 36, FK `users.id`, ondelete `RESTRICT`, NOT NULL, INDEXED).
  - `decision` (String 50, NOT NULL): `COMPLIANT`, `NON_COMPLIANT`, or `ACTION_REQUIRED`.
  - `comment` (Text, NOT NULL): Statutory remarks, physical verification notes, or penalty justification.
  - `reviewed_at` (DateTime with timezone, UTC, NOT NULL).

### 2.9 AuditLog (`audit_logs`)
- **Purpose:** Tamper-evident audit trail of compliance actions.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `user_id` (String 36, FK `users.id`, ondelete `SET NULL`, NULLABLE, INDEXED).
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NULLABLE, INDEXED).
  - `action` (String 100, NOT NULL, INDEXED): e.g. `USER_LOGIN`, `ANALYSIS_COMPLETED`.
  - `old_value` (JSON, NULLABLE): State snapshot prior to mutation.
  - `new_value` (JSON, NULLABLE): State snapshot following mutation.
  - `timestamp` (DateTime with timezone, UTC, NOT NULL).

### 2.10 Report (`reports`)
- **Purpose:** Tracks generated inspection summary documents and exports.
- **Primary Key:** `id` (String 36, UUIDv4)
- **Fields:**
  - `inspection_id` (String 36, FK `inspections.id`, ondelete `CASCADE`, NOT NULL, INDEXED).
  - `file_path` (String 500, NOT NULL): Export file path.
  - `generated_at` (DateTime with timezone, UTC, NOT NULL).

---

## 3. Database Portability: SQLite to PostgreSQL

The schema was designed with zero SQLite-specific hacks to ensure seamless migration to PostgreSQL:
- **UUIDs:** Modeled as `String(36)` representing standard hex UUIDv4 strings. On PostgreSQL, these can be mapped to native `UUID` or kept as `VARCHAR(36)`.
- **Timestamps:** Modeled as `DateTime(timezone=True)` using Python's `datetime.now(timezone.utc)` for consistent UTC storage across SQLite and Postgres `TIMESTAMP WITH TIME ZONE`.
- **JSON Fields:** Stored using SQLAlchemy's dialect-agnostic `JSON` type. In SQLite, this stores serialized JSON text; in PostgreSQL, it transparently binds to `JSONB` for indexed querying.
- **Foreign Keys:** SQLite does not enforce foreign keys by default. TriNetra explicitly enables them on connection:
  ```python
  @event.listens_for(Engine, "connect")
  def set_sqlite_pragma(dbapi_connection, connection_record):
      if settings.DATABASE_URL.startswith("sqlite"):
          cursor = dbapi_connection.cursor()
          cursor.execute("PRAGMA foreign_keys=ON")
          cursor.close()
  ```
- **Alembic Migrations:** Configured with `render_as_batch=True` in `alembic/env.py` to enable table alters and drops in SQLite while generating standards-compliant DDL for PostgreSQL.
