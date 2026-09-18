import React from 'react';
import type { EvidenceImage, RawOCRLine } from './types';

interface OCREvidenceViewerProps {
  image: EvidenceImage;
  selectedLineId: string | null;
  onSelectLine: (lineId: string | null) => void;
}

export const OCREvidenceViewer: React.FC<OCREvidenceViewerProps> = ({
  image,
  selectedLineId,
  onSelectLine,
}) => {
  // Assume standard coordinate space 900x750 or viewBox based on native resolution
  const viewBoxWidth = 900;
  const viewBoxHeight = 750;

  return (
    <div className="ocr-evidence-grid">
      {/* LEFT / CENTER PANE: Product Image with Scaled SVG Bounding Box Canvas */}
      <div className="evidence-canvas-pane">
        <div className="viewer-toolbar">
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
            Spatial Evidence Canvas — {image.facetName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Click text line or bounding box to inspect
          </span>
        </div>

        <div className="canvas-overlay-container">
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px', display: 'inline-block' }}>
            {/* Base Product Evidence Image */}
            <img
              src={image.previewUrl}
              alt={image.filename}
              style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }}
            />

            {/* Interactive SVG Bounding Box Layer */}
            <svg
              className="canvas-svg-layer"
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              preserveAspectRatio="none"
            >
              {image.rawLines.map((line) => {
                const isSelected = selectedLineId === line.id;
                return (
                  <g key={line.id}>
                    <rect
                      x={line.bbox.x}
                      y={line.bbox.y}
                      width={line.bbox.w}
                      height={line.bbox.h}
                      className={`bbox-rect ${isSelected ? 'bbox-active' : ''}`}
                      onClick={() => onSelectLine(isSelected ? null : line.id)}
                    >
                      <title>{`${line.text} (OCR Conf: ${Math.round(line.confidence * 100)}%)`}</title>
                    </rect>

                    {isSelected && (
                      <circle
                        cx={line.bbox.x + 6}
                        cy={line.bbox.y + 6}
                        r={4}
                        fill="#0e9f6e"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="viewer-metadata-footer">
          <div>
            <strong>Active Resolution:</strong> {image.dimensions} • <strong>Raw Detected Lines:</strong> {image.rawLines.length}
          </div>
          <div>
            <span className="badge-gov badge-gov-neutral">Engine: PaddleOCR PP-OCRv5</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Detected Raw Text Stream with Two-Way Synchronization */}
      <div className="evidence-text-pane">
        <div className="evidence-text-header">
          <h4>Detected Text Stream ({image.rawLines.length})</h4>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sorted by Position</span>
        </div>

        <div className="evidence-text-stream">
          {image.rawLines.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
              No text detected on this facet.
            </div>
          ) : (
            image.rawLines.map((line: RawOCRLine) => {
              const isSelected = selectedLineId === line.id;
              const confPercent = Math.round(line.confidence * 100);

              let confClass = 'confidence-high';
              if (confPercent < 70) confClass = 'confidence-low';
              else if (confPercent < 90) confClass = 'confidence-mid';

              return (
                <div
                  key={line.id}
                  className={`ocr-line-card ${isSelected ? 'line-active' : ''}`}
                  onClick={() => onSelectLine(isSelected ? null : line.id)}
                >
                  <div className="ocr-line-text">{line.text}</div>
                  <div className="ocr-line-footer">
                    <span>
                      Loc: [{line.bbox.x}, {line.bbox.y}, {line.bbox.w}, {line.bbox.h}]
                    </span>
                    <span className={`confidence-chip ${confClass}`}>
                      {confPercent}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
