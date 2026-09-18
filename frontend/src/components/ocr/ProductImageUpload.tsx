import React, { useRef, useState } from 'react';
import type { EvidenceImage } from './types';

interface ProductImageUploadProps {
  images: EvidenceImage[];
  onUploadImage: (file: File) => void;
  onRemoveImage: (id: string) => void;
  onProceedToReview?: () => void;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  images,
  onUploadImage,
  onRemoveImage,
  onProceedToReview,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.type)) {
      setValidationError(`Invalid format (${file.type}). Supported formats: JPG, PNG, WEBP.`);
      return;
    }

    // Validate size (15 MB max)
    if (file.size > 15 * 1024 * 1024) {
      setValidationError('File size exceeds maximum allowable limit of 15 MB.');
      return;
    }

    onUploadImage(file);
  };

  return (
    <div className="ocr-workstation-container">
      {/* Evidence Upload Header */}
      <div className="workstation-header">
        <div className="workstation-title-group">
          <h2>Product Label Upload</h2>
          <p>Ingest packaging evidence for Legal Metrology optical character verification</p>
        </div>
        <div className="workstation-actions">
          <span className="badge-gov badge-gov-neutral">Station: Evidence Ingestion</span>
        </div>
      </div>

      {/* Validation Error Banner (Screen 1 requirement) */}
      {validationError && (
        <div className="low-quality-banner" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2', color: '#991b1b' }}>
          <div className="low-quality-icon">⚠️</div>
          <div className="low-quality-content">
            <h4 style={{ color: '#991b1b' }}>Image Ingestion Error</h4>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      {/* Large Professional Upload Area */}
      <div
        className="upload-dropzone-card"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        <div className="upload-icon-wrapper">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <h3 className="upload-title">Upload Product Label</h3>
        <p className="upload-subtitle">
          Upload a clear image of the packaged commodity label for inspection.
          Ensure statutory declarations (MRP, Net Qty, Mfg Date) are in focus without glare.
        </p>

        <div className="upload-actions-row" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span style={{ marginRight: '6px' }}>📷</span>
            Use Camera
          </button>
        </div>

        <div className="upload-formats-hint">
          Supported Formats: <strong>JPG, PNG, WEBP</strong> • Minimum Resolution: <strong>100 × 100 px</strong>
        </div>
      </div>

      {/* Uploaded Evidence Queue */}
      {images.length > 0 && (
        <div className="uploaded-images-list">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Staged Packaging Evidence ({images.length})
            </h4>
            {onProceedToReview && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onProceedToReview}
              >
                Proceed to Image Review →
              </button>
            )}
          </div>

          {images.map((img) => (
            <div key={img.id} className="uploaded-image-item">
              <img src={img.previewUrl} alt={img.filename} className="uploaded-image-thumb" />
              <div className="uploaded-image-meta">
                <span className="uploaded-image-name">{img.facetName} — {img.filename}</span>
                <span className="uploaded-image-specs">
                  {img.dimensions} • {img.fileSize} • {img.format}
                </span>
                <div>
                  <span className="badge-gov badge-gov-success" style={{ marginTop: '4px' }}>
                    Ready for Inspection
                  </span>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => onRemoveImage(img.id)}
                  title="Remove image from inspection"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
