// ── Compliance-specific types ─────────────────────────────────────────────────
// Re-exported from inspection.ts for convenience; extra compliance types here.

export type {
  ComplianceCheckResponse,
  ComplianceFinding,
  ComplianceStatus,
  SeverityLevel,
  RuleResponse,
} from './inspection';

/** Dashboard summary (GET /api/v1/dashboard/summary) */
export interface DashboardSummary {
  total_inspections: number;
  draft_count: number;
  pending_review_count: number;
  compliant_count: number;
  non_compliant_count: number;
  completed_count: number;
  status_distribution: Record<string, number>;
  compliance_distribution: Record<string, number>;
}

/** Inspection report data */
export interface InspectionReportData {
  inspection_id: string;
  product_category: string;
  status: string;
  preliminary_result: string | null;
  final_result: string | null;
  created_at: string;
  completed_at: string | null;
  images_count: number;
  extracted_fields: import('./inspection').ExtractedFieldResponse[];
  compliance_checks: import('./inspection').ComplianceCheckResponse[];
  reviews: import('./inspection').ReviewResponse[];
  summary: Record<string, unknown>;
}

export interface ReportResponse {
  id: string;
  inspection_id: string;
  file_path: string;
  generated_at: string;
  data: InspectionReportData | null;
}
