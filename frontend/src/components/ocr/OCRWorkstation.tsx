import React, { useState } from 'react';
import '../../styles/ocr-workstation.css';
import type { EvidenceImage, StatutoryField, WorkstationViewMode } from './types';
import {
  REALISTIC_PACKAGE_IMAGES,
  LOW_QUALITY_MOCK_IMAGE,
  MOCK_PIPELINE_STAGES,
} from './mockData';

import { ProductImageUpload } from './ProductImageUpload';
import { ImageInspectionViewer } from './ImageInspectionViewer';
import { OCRAnalysisState } from './OCRAnalysisState';
import { OCREvidenceViewer } from './OCREvidenceViewer';
import { ExtractedDeclarationsTable } from './ExtractedDeclarationsTable';
import { FieldEvidenceModal } from './FieldEvidenceModal';
import { LowQualityWarning } from './LowQualityWarning';
import { OCRErrorState } from './OCRErrorState';
import { MultiImageRail } from './MultiImageRail';

interface OCRWorkstationProps {
  inspectionId?: string;
  initialMode?: WorkstationViewMode;
}

export const OCRWorkstation: React.FC<OCRWorkstationProps> = ({
  inspectionId = 'INSP-2025-0918-042',
  initialMode = 'WORKSTATION',
}) => {
  const [images, setImages] = useState<EvidenceImage[]>(REALISTIC_PACKAGE_IMAGES);
  const [selectedImageId, setSelectedImageId] = useState<string>(REALISTIC_PACKAGE_IMAGES[0].id);
  const [viewMode, setViewMode] = useState<WorkstationViewMode>(initialMode);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedFieldForModal, setSelectedFieldForModal] = useState<StatutoryField | null>(null);
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);

  // Active image lookup
  const activeImage =
    viewMode === 'LOW_QUALITY'
      ? LOW_QUALITY_MOCK_IMAGE
      : images.find((img) => img.id === selectedImageId) || images[0];

  // Consolidate extracted fields from all panels for the commodity declarations table
  const allExtractedFields: StatutoryField[] = [
    // 1. MRP
    images[0]?.extractedFields.find((f) => f.key === 'mrp') || {
      key: 'mrp',
      label: 'Maximum Retail Price (MRP)',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[0]?.id || '',
    },
    // 2. Net Quantity
    images[0]?.extractedFields.find((f) => f.key === 'net_qty') || {
      key: 'net_qty',
      label: 'Net Quantity',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[0]?.id || '',
    },
    // 3. Manufacturer Name
    images[0]?.extractedFields.find((f) => f.key === 'mfg_name') || {
      key: 'mfg_name',
      label: 'Manufacturer Name',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[0]?.id || '',
    },
    // 4. Manufacturer Address (from Back Panel)
    images[1]?.extractedFields.find((f) => f.key === 'mfg_address') || {
      key: 'mfg_address',
      label: 'Manufacturer Address',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[1]?.id || '',
    },
    // 5. Date of Manufacture
    images[0]?.extractedFields.find((f) => f.key === 'mfg_date') || {
      key: 'mfg_date',
      label: 'Date of Manufacture',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[0]?.id || '',
    },
    // 6. Consumer Care Details (from Back Panel)
    images[1]?.extractedFields.find((f) => f.key === 'consumer_care') || {
      key: 'consumer_care',
      label: 'Consumer Care Details',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[1]?.id || '',
    },
    // 7. Country of Origin
    images[0]?.extractedFields.find((f) => f.key === 'country_origin') || {
      key: 'country_origin',
      label: 'Country of Origin',
      value: '',
      confidence: 0,
      bbox: null,
      status: 'NOT_DETECTED',
      sourceImageId: images[0]?.id || '',
    },
  ];

  const handleUploadImage = (file: File) => {
    const newImg: EvidenceImage = {
      id: `IMG-${Date.now()}`,
      facetName: `Image ${images.length + 1} — Additional Panel`,
      filename: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      dimensions: '1920 × 1080 px',
      format: file.type || 'image/jpeg',
      previewUrl: URL.createObjectURL(file),
      qualityScore: 0.94,
      isQualityAcceptable: true,
      ocrStatus: 'PENDING',
      detectedFieldsCount: 0,
      rawLines: [],
      extractedFields: [],
    };
    setImages((prev) => [...prev, newImg]);
    setSelectedImageId(newImg.id);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (selectedImageId === id && images.length > 1) {
      setSelectedImageId(images[0].id);
    }
  };

  return (
    <div className={`ocr-workstation-container ${isMobileMode ? 'mobile-workstation-mode' : ''}`}>
      {/* Officer Workstation Mode Selector Toolbar */}
      <div className="workstation-header" style={{ backgroundColor: '#1e2433', color: '#ffffff', borderColor: '#334155' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: '#ffffff' }}>
              Legal Metrology OCR & Product Evidence Workstation
            </span>
            <span className="badge-gov badge-gov-primary" style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', borderColor: '#3b82f6' }}>
              Docket #{inspectionId}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '11px', margin: '3px 0 0 0' }}>
            Operational inspection console for image ingestion, optical verification, and statutory declaration extraction
          </p>
        </div>

        {/* View Mode Switching Controls for Inspection Testing */}
        <div className="workstation-actions">
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#0f172a', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'WORKSTATION' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'WORKSTATION' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('WORKSTATION')}
            >
              Full Workstation
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'UPLOAD' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'UPLOAD' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('UPLOAD')}
            >
              1: Upload
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'REVIEW' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'REVIEW' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('REVIEW')}
            >
              2: Review
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'ANALYZING' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'ANALYZING' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('ANALYZING')}
            >
              3: Progress
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'LOW_QUALITY' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'LOW_QUALITY' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('LOW_QUALITY')}
            >
              7: Low Quality
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'ERROR' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ color: viewMode === 'ERROR' ? '#fff' : '#94a3b8', fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setViewMode('ERROR')}
            >
              8: OCR Error
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px', backgroundColor: '#334155', color: '#f8fafc', borderColor: '#475569' }}
            onClick={() => setIsMobileMode(!isMobileMode)}
            title="Toggle responsive mobile field inspector simulation"
          >
            {isMobileMode ? '🖥️ Desktop View' : '📱 Mobile Inspector View'}
          </button>
        </div>
      </div>

      {/* SCREEN 1: UPLOAD VIEW */}
      {viewMode === 'UPLOAD' && (
        <ProductImageUpload
          images={images}
          onUploadImage={handleUploadImage}
          onRemoveImage={handleRemoveImage}
          onProceedToReview={() => setViewMode('REVIEW')}
        />
      )}

      {/* SCREEN 2: IMAGE REVIEW */}
      {viewMode === 'REVIEW' && (
        <ImageInspectionViewer
          image={activeImage}
          onRunOCR={() => setViewMode('ANALYZING')}
          onBackToUpload={() => setViewMode('UPLOAD')}
        />
      )}

      {/* SCREEN 3: OCR ANALYSIS PIPELINE */}
      {viewMode === 'ANALYZING' && (
        <OCRAnalysisState
          stages={MOCK_PIPELINE_STAGES}
          isComplete={true}
          detectedCount={activeImage.rawLines.length || 12}
          averageConfidence={0.98}
          qualityScore={activeImage.qualityScore}
          onViewWorkstation={() => setViewMode('WORKSTATION')}
        />
      )}

      {/* SCREEN 7: LOW QUALITY IMAGE WARNING */}
      {viewMode === 'LOW_QUALITY' && (
        <>
          <LowQualityWarning
            qualityScore={LOW_QUALITY_MOCK_IMAGE.qualityScore}
            issues={LOW_QUALITY_MOCK_IMAGE.qualityIssues || []}
            onUploadBetter={() => setViewMode('UPLOAD')}
            onContinueAnyway={() => setViewMode('WORKSTATION')}
          />
          <ImageInspectionViewer
            image={LOW_QUALITY_MOCK_IMAGE}
            onRunOCR={() => setViewMode('ANALYZING')}
          />
        </>
      )}

      {/* SCREEN 8: OCR TECHNICAL ERROR */}
      {viewMode === 'ERROR' && (
        <OCRErrorState
          onRetry={() => setViewMode('ANALYZING')}
          onUploadAnother={() => setViewMode('UPLOAD')}
        />
      )}

      {/* SCREEN 4, 5, 9: FULL OPERATIONAL EVIDENCE WORKSTATION */}
      {viewMode === 'WORKSTATION' && (
        <>
          {/* SCREEN 9: Multi-Image Thumbnail Rail */}
          <MultiImageRail
            images={images}
            selectedImageId={selectedImageId}
            onSelectImage={(id) => {
              setSelectedImageId(id);
              setSelectedLineId(null);
            }}
            onAddAnotherImage={() => setViewMode('UPLOAD')}
          />

          {/* SCREEN 4: OCR Evidence Viewer (3-Area Canvas + Text Stream) */}
          <OCREvidenceViewer
            image={activeImage}
            selectedLineId={selectedLineId}
            onSelectLine={(id) => setSelectedLineId(id)}
          />

          {/* SCREEN 5: Extracted Declarations Review Table (7 Mandatory Rules) */}
          <ExtractedDeclarationsTable
            fields={allExtractedFields}
            onViewEvidence={(field) => setSelectedFieldForModal(field)}
          />
        </>
      )}

      {/* SCREEN 6: Field Evidence Detail Modal */}
      {selectedFieldForModal && (
        <FieldEvidenceModal
          field={selectedFieldForModal}
          sourceImage={images.find((img) => img.id === selectedFieldForModal.sourceImageId)}
          onClose={() => setSelectedFieldForModal(null)}
          onViewOnImage={(bbox) => {
            if (bbox) {
              const matchedLine = activeImage.rawLines.find(
                (l) => l.bbox.x === bbox.x && l.bbox.y === bbox.y
              );
              if (matchedLine) setSelectedLineId(matchedLine.id);
            }
          }}
        />
      )}
    </div>
  );
};
export default OCRWorkstation;
