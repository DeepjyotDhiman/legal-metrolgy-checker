import React from 'react';
import type { EvidenceImage } from './types';

interface MultiImageRailProps {
  images: EvidenceImage[];
  selectedImageId: string;
  onSelectImage: (id: string) => void;
  onAddAnotherImage?: () => void;
}

export const MultiImageRail: React.FC<MultiImageRailProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onAddAnotherImage,
}) => {
  return (
    <div className="declarations-card" style={{ padding: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
          Packaging Panel Evidence ({images.length} Facets)
        </span>
        {onAddAnotherImage && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onAddAnotherImage}
            style={{ fontSize: 'var(--font-size-xs)' }}
          >
            + Add Package Panel
          </button>
        )}
      </div>

      <div className="multi-image-rail">
        {images.map((img) => {
          const isSelected = img.id === selectedImageId;
          const qualPercent = Math.round(img.qualityScore * 100);

          return (
            <div
              key={img.id}
              className={`rail-image-tab ${isSelected ? 'tab-active' : ''}`}
              onClick={() => onSelectImage(img.id)}
            >
              <img src={img.previewUrl} alt={img.facetName} className="rail-thumb" />
              <div className="rail-tab-info">
                <span className="rail-tab-label">{img.facetName}</span>
                <span className="rail-tab-meta">
                  Quality: {qualPercent}% • Fields: {img.detectedFieldsCount}
                </span>
                <div style={{ marginTop: '2px' }}>
                  <span
                    className={`badge-gov ${
                      img.ocrStatus === 'COMPLETED'
                        ? 'badge-gov-success'
                        : img.ocrStatus === 'ERROR'
                        ? 'badge-gov-danger'
                        : 'badge-gov-neutral'
                    }`}
                    style={{ fontSize: '9px', padding: '1px 4px' }}
                  >
                    {img.ocrStatus}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
