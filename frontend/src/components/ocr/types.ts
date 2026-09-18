// ── OCR & Product Evidence Workstation Types ────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RawOCRLine {
  id: string;
  text: string;
  confidence: number; // 0.0 to 1.0 (or 0 to 100)
  bbox: BoundingBox;
  fieldKey?: string; // Optional linkage to statutory field
}

export type StatutoryFieldStatus = 'DETECTED' | 'LOW_CONFIDENCE' | 'NOT_DETECTED';

export interface StatutoryField {
  key: string;
  label: string;
  value: string;
  confidence: number; // 0.0 to 1.0 (OCR recognition accuracy)
  bbox: BoundingBox | null;
  status: StatutoryFieldStatus;
  sourceImageId: string;
}

export interface EvidenceImage {
  id: string;
  facetName: string; // 'Front Label' | 'Back Label' | 'Side Panel'
  filename: string;
  fileSize: string;
  dimensions: string;
  format: string;
  previewUrl: string;
  qualityScore: number; // 0.0 to 1.0
  isQualityAcceptable: boolean;
  qualityIssues?: string[];
  ocrStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';
  detectedFieldsCount: number;
  rawLines: RawOCRLine[];
  extractedFields: StatutoryField[];
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
}

export type WorkstationViewMode = 
  | 'WORKSTATION' // Screens 4, 5, 9 combined into operational workstation
  | 'UPLOAD'      // Screen 1: File dropzone & camera
  | 'REVIEW'      // Screen 2: High-res zoom & metadata
  | 'ANALYZING'   // Screen 3: 6-stage pipeline progress
  | 'LOW_QUALITY' // Screen 7: Realistic warning state
  | 'ERROR';      // Screen 8: Technical failure state
