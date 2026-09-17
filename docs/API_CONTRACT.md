# TriNetra API Contract

This document provides the exhaustive specification of all REST API endpoints currently implemented in the TriNetra backend.

Base Path: `/api`  
Interactive Documentation: `http://localhost:8000/docs` (Swagger UI) / `http://localhost:8000/redoc` (ReDoc)

---

## Authentication Convention

The TriNetra API supports two concurrent authentication mechanisms:

1. **HttpOnly Session Cookie (Default for Web Clients):**
   - The cookie is named `trinetra_session`.
   - Set automatically by `POST /api/auth/login`.
   - Configured with `HttpOnly=True`, `SameSite=Lax`, and `Path=/`.
   - Browser clients must set `credentials: "include"` on all HTTP requests.
2. **Bearer Token Header (Fallback for CLI / Automated Testing):**
   - Clients may transmit the token via standard HTTP header:
     `Authorization: Bearer <session_token>`

If both are provided, the session cookie takes precedence.

---

## 1. Authentication Endpoints

### 1.1 User Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Authentication Required:** No (Public)
- **Role Required:** None
- **Request Body (JSON):**
  ```json
  {
    "email": "officer@trinetra.gov.in",
    "password": "StrongPassword123!"
  }
  ```
- **Response (`200 OK`):**
  *Sets `Set-Cookie: trinetra_session=...; HttpOnly; Path=/`*
  ```json
  {
    "message": "Login successful",
    "user_id": "c7a8b9f1-3d2e-4b5a-9f1c-2e3d4b5a6f7e",
    "email": "officer@trinetra.gov.in",
    "name": "Legal Metrology Officer",
    "role": "OFFICER"
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account is deactivated.
  - `422 Unprocessable Entity`: Missing fields or invalid email format.

### 1.2 User Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Authentication Required:** Yes
- **Role Required:** Authenticated User
- **Response (`200 OK`):**
  *Clears `trinetra_session` cookie*
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Missing or invalid session credentials.

### 1.3 Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Authentication Required:** Yes
- **Role Required:** Authenticated User
- **Response (`200 OK`):**
  ```json
  {
    "id": "c7a8b9f1-3d2e-4b5a-9f1c-2e3d4b5a6f7e",
    "name": "Legal Metrology Officer",
    "email": "officer@trinetra.gov.in",
    "role": "OFFICER",
    "is_active": true,
    "created_at": "2026-09-17T18:00:00Z"
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Not authenticated.

---

## 2. Inspections Endpoints

### 2.1 Create Inspection
- **Method:** `POST`
- **Path:** `/api/inspections`
- **Authentication Required:** Yes
- **Role Required:** `OFFICER` or `ADMIN`
- **Request Body (JSON):**
  ```json
  {
    "product_category": "Packaged Staples"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
    "created_by": "c7a8b9f1-3d2e-4b5a-9f1c-2e3d4b5a6f7e",
    "product_category": "Packaged Staples",
    "status": "DRAFT",
    "preliminary_result": null,
    "final_result": null,
    "created_at": "2026-09-17T18:05:00Z",
    "completed_at": null
  }
  ```
- **Errors:**
  - `401 Unauthorized`: Missing credentials.
  - `403 Forbidden`: User role is not permitted.

### 2.2 List Inspections
- **Method:** `GET`
- **Path:** `/api/inspections`
- **Authentication Required:** Yes
- **Role Required:** Authenticated User
- **Query Parameters:**
  - `status` (optional, string): Filter by `DRAFT`, `UPLOADED`, `ANALYZING`, `REVIEW_REQUIRED`, `COMPLIANT`, `NON_COMPLIANT`, `COMPLETED`, `ERROR`.
  - `skip` (optional, int, default `0`): Pagination offset.
  - `limit` (optional, int, default `50`, max `100`): Records per page.
- **Response (`200 OK`):**
  ```json
  [
    {
      "id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
      "created_by": "c7a8b9f1-3d2e-4b5a-9f1c-2e3d4b5a6f7e",
      "product_category": "Packaged Staples",
      "status": "REVIEW_REQUIRED",
      "preliminary_result": "COMPLIANT",
      "final_result": null,
      "created_at": "2026-09-17T18:05:00Z",
      "completed_at": null
    }
  ]
  ```

### 2.3 Get Inspection Details
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}`
- **Authentication Required:** Yes
- **Role Required:** Authenticated User
- **Path Parameters:**
  - `inspection_id` (string, UUID): Inspection identifier.
- **Response (`200 OK`):**
  Returns complete inspection object including nested `images`, `ocr_results`, `extracted_fields`, `compliance_checks`, and `reviews`.
- **Errors:**
  - `404 Not Found`: Inspection does not exist.

### 2.4 Trigger Inspection Analysis
- **Method:** `POST`
- **Path:** `/api/inspections/{inspection_id}/analyze`
- **Authentication Required:** Yes
- **Role Required:** `OFFICER` or `ADMIN`
- **Path Parameters:**
  - `inspection_id` (string, UUID): Inspection identifier.
- **Response (`200 OK`):**
  Returns updated `InspectionDetailResponse` with status `REVIEW_REQUIRED`, `preliminary_result`, extracted declarations, and rule check outcomes.
- **Errors:**
  - `400 Bad Request`: Cannot analyze inspection with 0 uploaded images.
  - `404 Not Found`: Inspection not found.

---

## 3. Images Endpoints

### 3.1 Upload Inspection Images
- **Method:** `POST`
- **Path:** `/api/inspections/{inspection_id}/images`
- **Authentication Required:** Yes
- **Role Required:** `OFFICER` or `ADMIN`
- **Path Parameters:**
  - `inspection_id` (string, UUID)
- **Request (Multipart Form-Data):**
  - `files`: One or more binary image files (allowed: `.jpg`, `.jpeg`, `.png`, `.webp`, max 15MB each).
  - `image_type` (form field, default `"LABEL"`): e.g. `"LABEL"`, `"FRONT"`, `"BACK"`.
- **Response (`201 Created`):**
  ```json
  {
    "message": "Successfully uploaded and validated 1 image(s).",
    "uploaded_images": [
      {
        "id": "d1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
        "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
        "file_path": "data/uploads/36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b/a1b2c3d4.png",
        "image_type": "LABEL",
        "quality_score": 0.88,
        "created_at": "2026-09-17T18:07:00Z"
      }
    ]
  }
  ```
- **Errors:**
  - `400 Bad Request`: Unsupported extension, unsupported MIME type, file exceeds size limit, or corrupted image data.
  - `404 Not Found`: Inspection does not exist.

### 3.2 List Inspection Images
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}/images`
- **Authentication Required:** Yes
- **Response (`200 OK`):** Array of `ImageResponse` objects.

---

## 4. OCR & Field Extraction Endpoints

### 4.1 Get Raw OCR Results
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}/ocr`
- **Authentication Required:** Yes
- **Response (`200 OK`):**
  ```json
  [
    {
      "id": "e2f3a4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b",
      "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
      "raw_text": "SHREE KRISHNA BASMATI RICE\nNet Quantity: 5 kg\nMRP Rs. 650.00 (Incl. of all taxes)...",
      "language": "en",
      "confidence": 0.93,
      "created_at": "2026-09-17T18:10:00Z"
    }
  ]
  ```

### 4.2 Get Extracted Declarations
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}/fields`
- **Authentication Required:** Yes
- **Response (`200 OK`):**
  ```json
  [
    {
      "id": "f3a4b5c6-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
      "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
      "field_name": "mrp",
      "field_value": "MRP Rs. 650.00 (Incl. of all taxes)",
      "confidence": 0.96,
      "source_image_id": "d1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
      "bounding_box": { "x": 60, "y": 140, "w": 320, "h": 40 }
    }
  ]
  ```

---

## 5. Compliance Findings Endpoints

### 5.1 Get Compliance Findings
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}/compliance`
- **Authentication Required:** Yes
- **Response (`200 OK`):**
  ```json
  [
    {
      "id": "a4b5c6d7-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
      "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
      "rule_id": "b5c6d7e8-9f0a-1b2c-3d4e-5f6a7b8c9d0e",
      "status": "PASS",
      "severity": "HIGH",
      "explanation": "Valid MRP declared with currency amount and 'inclusive of all taxes' statement.",
      "evidence": {
        "declared_field": "MRP Rs. 650.00 (Incl. of all taxes)",
        "has_mrp_label": true,
        "has_tax_inclusive": true,
        "has_currency_amount": true,
        "field_confidence": 0.96
      },
      "confidence": 0.96,
      "rule": {
        "id": "b5c6d7e8-9f0a-1b2c-3d4e-5f6a7b8c9d0e",
        "rule_code": "LMPC-R06-MRP",
        "name": "Maximum Retail Price Declaration",
        "legal_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
        "version": "2011.1"
      }
    }
  ]
  ```

---

## 6. Officer Review & Report Endpoints

### 6.1 Submit Officer Review
- **Method:** `POST`
- **Path:** `/api/inspections/{inspection_id}/review`
- **Authentication Required:** Yes
- **Role Required:** `OFFICER` or `ADMIN`
- **Request Body (JSON):**
  ```json
  {
    "decision": "COMPLIANT",
    "comment": "All mandatory package declarations verified against statutory standards. Approved."
  }
  ```
  *(Allowed decisions: `COMPLIANT`, `NON_COMPLIANT`, `ACTION_REQUIRED`)*
- **Response (`201 Created`):**
  ```json
  {
    "id": "c6d7e8f9-0a1b-2c3d-4e5f-6a7b8c9d0e1f",
    "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
    "officer_id": "c7a8b9f1-3d2e-4b5a-9f1c-2e3d4b5a6f7e",
    "decision": "COMPLIANT",
    "comment": "All mandatory package declarations verified against statutory standards. Approved.",
    "reviewed_at": "2026-09-17T18:15:00Z"
  }
  ```

### 6.2 Get Inspection Report
- **Method:** `GET`
- **Path:** `/api/inspections/{inspection_id}/report`
- **Authentication Required:** Yes
- **Response (`200 OK`):**
  ```json
  {
    "id": "d7e8f9a0-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
    "file_path": "/reports/inspection_36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b.json",
    "generated_at": "2026-09-17T18:15:05Z",
    "data": {
      "inspection_id": "36bfb4fd-e8f3-4ef5-bcfc-c30d5101bd3b",
      "product_category": "Packaged Staples",
      "status": "COMPLETED",
      "preliminary_result": "COMPLIANT",
      "final_result": "COMPLIANT",
      "created_at": "2026-09-17T18:05:00Z",
      "completed_at": "2026-09-17T18:15:00Z",
      "images_count": 1,
      "extracted_fields": [...],
      "compliance_checks": [...],
      "reviews": [...],
      "summary": {
        "total_rules_evaluated": 6,
        "passed_rules": 6,
        "failed_rules": 0,
        "rules_requiring_review": 0,
        "is_finalized": true
      }
    }
  }
  ```

---

## 7. Rules Catalog Endpoints

### 7.1 List Rules
- **Method:** `GET`
- **Path:** `/api/rules`
- **Authentication Required:** Yes
- **Response (`200 OK`):** Array of all active `RuleResponse` records.

### 7.2 Get Rule By Code
- **Method:** `GET`
- **Path:** `/api/rules/{rule_code}`
- **Authentication Required:** Yes
- **Path Parameters:**
  - `rule_code` (string, e.g. `LMPC-R06-MRP`)
- **Response (`200 OK`):** Details and statutory references for the rule.
- **Errors:**
  - `404 Not Found`: Rule code does not exist.

---

## 8. Dashboard & Health Endpoints

### 8.1 Dashboard Metrics Summary
- **Method:** `GET`
- **Path:** `/api/dashboard/summary`
- **Authentication Required:** Yes
- **Response (`200 OK`):**
  ```json
  {
    "total_inspections": 12,
    "draft_count": 1,
    "pending_review_count": 3,
    "compliant_count": 5,
    "non_compliant_count": 3,
    "completed_count": 8,
    "status_distribution": {
      "COMPLETED": 8,
      "REVIEW_REQUIRED": 3,
      "DRAFT": 1
    },
    "compliance_distribution": {
      "COMPLIANT": 5,
      "NON_COMPLIANT": 3,
      "UNPROCESSED": 1
    }
  }
  ```

### 8.2 System Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Authentication Required:** No (Public)
- **Response (`200 OK`):**
  ```json
  {
    "status": "online",
    "service": "TriNetra - Legal Metrology Compliance Inspection",
    "version": "0.1.0",
    "environment": "development",
    "database": "healthy"
  }
  ```
