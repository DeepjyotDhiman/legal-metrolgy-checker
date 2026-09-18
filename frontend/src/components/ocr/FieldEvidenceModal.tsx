import React, { useState } from 'react';
import type { StatutoryField, EvidenceImage } from './types';

interface FieldEvidenceModalProps {
  field: StatutoryField;
  sourceImage?: EvidenceImage;
  onClose: () => void;
  onViewOnImage: (bbox: StatutoryField['bbox']) => void;
}

export const FieldEvidenceModal: React.FC<FieldEvidenceModalProps> = ({
  field,
  sourceImage,
  onClose,
  onViewOnImage,
}) => {
  const [markedForReview, setMarkedForReview] = useState(false);
  const confPercent = Math.round(field.confidence * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Evidence Traceability — {field.label}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ fontSize: '16px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Evidentiary High-Res Crop View */}
          <div className="evidence-crop-window">
            {sourceImage ? (
              <img
                src={sourceImage.previewUrl}
                alt={field.label}
                className="evidence-crop-img"
              />
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 'var(--font-size-xs)' }}>
                Cropped bounding preview unavailable
              </div>
            )}
          </div>

          {/* Value Card */}
          <div style={{ padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Extracted Raw Value
            </div>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-text)' }}>
              {field.value}
            </div>
          </div>

          {/* Technical Metadata Grid */}
          <div className="modal-meta-grid">
            <div>
              <div style={{ color: 'var(--color-text-muted)' }}>OCR Recognition Confidence</div>
              <div style={{ fontWeight: 700, color: '#057a55', marginTop: '2px' }}>
                {confPercent}% (PaddleOCR PP-OCRv5)
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--color-text-muted)' }}>Source Image Panel</div>
              <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                {sourceImage ? sourceImage.facetName : field.sourceImageId}
              </div>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ color: 'var(--color-text-muted)' }}>Spatial Geometry (Normalized Bounding Box)</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', marginTop: '2px' }}>
                {field.bbox
                  ? `X: ${field.bbox.x}px • Y: ${field.bbox.y}px • Width: ${field.bbox.w}px • Height: ${field.bbox.h}px`
                  : 'No spatial bounding coordinates recorded'}
              </div>
            </div>
          </div>

          {markedForReview && (
            <div className="badge-gov badge-gov-warning" style={{ alignSelf: 'flex-start', padding: '6px 12px' }}>
              ⚠️ Flagged for Officer Inspection Review
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setMarkedForReview(!markedForReview)}
          >
            {markedForReview ? 'Unmark Review' : 'Mark for Review'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              onViewOnImage(field.bbox);
              onClose();
            }}
          >
            View on Full Label ↗
          </button>
        </div>
      </div>
    </div>
  );
};
