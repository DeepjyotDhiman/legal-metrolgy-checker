// ── Inspection types ──────────────────────────────────────────────────────────
// Mirrors backend schemas: inspection.py, enums.py

export type InspectionStatus =
  | 'DRAFT'
  | 'UPLOADED'
  | 'ANALYZING'
  | 'REVIEW_REQUIRED'
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'COMPLETED'
  | 'ERROR';

/** POST /api/v1/inspections body */
export interface InspectionCreate {
  product_category?: string;
}

/** PATCH /api/v1/inspections/:id body */
export interface InspectionUpdate {
  product_category?: string;
  status?: InspectionStatus;
}

/** List-level inspection summary */
export interface InspectionResponse {
  id: string;
  created_by: string;
  product_category: string;
  status: InspectionStatus;
  preliminary_result: string | null;
  final_result: string | null;
  created_at: string;      // ISO-8601
  completed_at: string | null;
}

/** Full inspection with all related data */
export interface InspectionDetailResponse extends InspectionResponse {
  images: ImageResponse[];
  ocr_results: OCRResultResponse[];
  extracted_fields: ExtractedFieldResponse[];
  compliance_checks: ComplianceCheckResponse[];
  reviews: ReviewResponse[];
}

// ── Image ─────────────────────────────────────────────────────────────────────

export interface ImageResponse {
  id: string;
  inspection_id: string;
  image_type: string;
  file_path: string;
  quality_score: number | null;
  created_at: string;
}

export interface ImageUploadResponse {
  message: string;
  uploaded_images: ImageResponse[];
}

// ── OCR ───────────────────────────────────────────────────────────────────────

export interface OCRResultResponse {
  id: string;
  inspection_id: string;
  raw_text: string;
  language: string;
  confidence: number;
  created_at: string;
}

/** A single line of raw OCR text with position info (used internally) */
export interface RawTextLine {
  text: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [x, y, w, h]
}

// ── Extracted Fields ──────────────────────────────────────────────────────────

export interface ExtractedFieldResponse {
  id: string;
  inspection_id: string;
  field_name: string;
  field_value: string;
  confidence: number;
  source_image_id: string | null;
  bounding_box: Record<string, unknown> | null;
}

// ── Compliance ────────────────────────────────────────────────────────────────

export type ComplianceStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';
export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RuleResponse {
  id: string;
  rule_code: string;
  name: string;
  description: string;
  category: string;
  legal_reference: string;
  version: string;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
}

export interface ComplianceCheckResponse {
  id: string;
  inspection_id: string;
  rule_id: string;
  status: ComplianceStatus;
  severity: SeverityLevel;
  explanation: string;
  evidence: unknown | null;
  confidence: number;
  rule: RuleResponse | null;
}

/** Alias used as "ComplianceFinding" in UI code */
export type ComplianceFinding = ComplianceCheckResponse;

// ── Review ────────────────────────────────────────────────────────────────────

export type ReviewDecision = 'COMPLIANT' | 'NON_COMPLIANT' | 'ACTION_REQUIRED';

export interface ReviewCreate {
  decision: ReviewDecision;
  comment: string;
}

export interface ReviewResponse {
  id: string;
  inspection_id: string;
  officer_id: string;
  decision: string;
  comment: string;
  reviewed_at: string;
}
