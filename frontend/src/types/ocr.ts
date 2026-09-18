// ── OCR-specific types ────────────────────────────────────────────────────────
// Re-exported from inspection.ts for convenience; extra OCR utility types here.

export type { OCRResultResponse, RawTextLine, ExtractedFieldResponse } from './inspection';

/** OCR provider setting (matches backend OCR_PROVIDER config) */
export type OCRProvider = 'mock' | 'paddleocr' | 'auto';

/** Trigger OCR on an inspection (POST /api/v1/inspections/:id/analyze) */
export interface TriggerOCRRequest {
  inspection_id: string;
  provider?: OCRProvider;
  language?: string;
}

/** Response from analyze endpoint */
export interface TriggerOCRResponse {
  message: string;
  inspection_id: string;
  status: string;
}
