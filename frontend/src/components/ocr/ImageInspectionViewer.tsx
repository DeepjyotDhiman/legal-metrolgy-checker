import React, { useState } from 'react';
import type { EvidenceImage } from './types';

interface ImageInspectionViewerProps {
  image: EvidenceImage;
  onRunOCR?: () => void;
  onBackToUpload?: () => void;
}

export const ImageInspectionViewer: React.FC<ImageInspectionViewerProps> = ({
  image,
  onRunOCR,
  onBackToUpload,
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleFit = () => {
    setScale(1.0);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const qualityPercent = Math.round(image.qualityScore * 100);

  return (
    <div className="ocr-workstation-container">
      {/* Workstation Header */}
      <div className="workstation-header">
        <div className="workstation-title-group">
          <h2>Image Quality Review & Ingestion Gate</h2>
          <p>Verify optical clarity, illumination, and resolution before triggering optical recognition</p>
        </div>
        <div className="workstation-actions">
          {onBackToUpload && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onBackToUpload}>
              ← Back to Upload
            </button>
          )}
          {onRunOCR && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onRunOCR}>
              Trigger OCR Pipeline →
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Card */}
      <div className="viewer-viewport-card">
        {/* Inspection Controls Toolbar */}
        <div className="viewer-toolbar">
          <div className="viewer-controls-group">
            <button type="button" className="viewer-btn" onClick={handleZoomIn} title="Zoom In (+25%)">
              🔍+ Zoom In
            </button>
            <button type="button" className="viewer-btn" onClick={handleZoomOut} title="Zoom Out (-25%)">
              🔍- Zoom Out
            </button>
            <button type="button" className="viewer-btn" onClick={handleFit} title="Fit to screen bounds">
              ⛶ Fit to Screen
            </button>
            <button type="button" className="viewer-btn" onClick={handleRotate} title="Rotate 90 degrees CW">
              ↻ Rotate
            </button>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
              Scale: {Math.round(scale * 100)}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Optical Quality Assessment:
            </span>
            {image.isQualityAcceptable ? (
              <span className="badge-gov badge-gov-success">
                Quality: {qualityPercent}% — Acceptable
              </span>
            ) : (
              <span className="badge-gov badge-gov-warning">
                Quality: {qualityPercent}% — Review Image Quality
              </span>
            )}
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="viewer-canvas-area">
          <div
            className="viewer-image-wrapper"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={image.previewUrl}
              alt={image.filename}
              className="viewer-main-img"
            />
          </div>
        </div>

        {/* Technical Evidentiary Metadata Footer */}
        <div className="viewer-metadata-footer">
          <div>
            <strong>Evidence ID:</strong> {image.id} • <strong>Facet:</strong> {image.facetName}
          </div>
          <div>
            <strong>Native Resolution:</strong> {image.dimensions} • <strong>Format:</strong> {image.format}
          </div>
        </div>
      </div>
    </div>
  );
};
